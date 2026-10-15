import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraView, CarConfig, CarInputs, TrackId } from '../types/game';
import { BuiltTrack, TrackBuilder } from './tracks';
import { CarMeshes, ModelFactory } from './proceduralModels';
import { CarPhysics } from './carPhysics';
import { ParticleSystem } from './particleSystem';
import { AIController } from './aiController';
import { TextureFactory } from './proceduralTextures';

/**
 * Apex Racing Scene Director
 * Encapsulates Three.js lifecycle, studio PBR lighting, procedural environment,
 * damped camera kinematics, and high-performance render loop.
 */

export class RacingScene {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public track: BuiltTrack;
  public playerPhysics: CarPhysics;
  public aiController: AIController;
  public particles: ParticleSystem;

  private playerCarMeshes: CarMeshes;
  private currentCarConfig: CarConfig;
  private currentTrackId: TrackId;

  private cameraView: CameraView = 'chase';
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private isDestroyed: boolean = false;

  // Reusable scratch objects for ZERO GC in tick loop
  private static readonly _camPos = new THREE.Vector3();
  private static readonly _camTarget = new THREE.Vector3();
  private static readonly _carFwd = new THREE.Vector3();
  private static readonly _carUp = new THREE.Vector3(0, 1, 0);

  // Orbit camera drag state
  private isPointerDown: boolean = false;
  private prevPointerX: number = 0;
  private prevPointerY: number = 0;
  private orbitTheta: number = 0;
  private orbitPhi: number = 0.35;
  private orbitDistance: number = 6.8;

  constructor(
    container: HTMLElement,
    initialCarConfig: CarConfig,
    initialTrackId: TrackId,
    private onTelemetryUpdate: (physics: CarPhysics, ai: AIController) => void
  ) {
    this.currentCarConfig = initialCarConfig;
    this.currentTrackId = initialTrackId;
    this.clock = new THREE.Clock();

    // 1. Scene & Renderer Setup
    this.scene = new THREE.Scene();

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: !isHeadless,
      stencil: false,
      depth: true,
    });

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Set max anisotropy
    TextureFactory.setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.2, 1800);
    this.camera.position.set(0, 5, -10);

    // 3. Studio PBR Environment Map via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;
    pmrem.dispose();

    // 4. Lighting Rig (Key Warm Sun + Fill Hemisphere)
    this.sunLight = new THREE.DirectionalLight(0xfff3db, 2.8);
    this.sunLight.castShadow = !isHeadless;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0xb4d4f8, 0x3d3025, 1.2);
    this.scene.add(this.hemiLight);

    // 5. Build Track
    this.track = TrackBuilder.buildTrack(this.currentTrackId);
    this.scene.add(this.track.roadMesh);
    this.scene.add(this.track.finishMesh);
    this.scene.add(this.track.scenePropsGroup);
    this.applyAtmosphere(this.track.config);

    // 6. Particle Systems
    const particleGroup = new THREE.Group();
    this.scene.add(particleGroup);
    this.particles = new ParticleSystem(particleGroup);

    // 7. Player Car
    this.playerCarMeshes = ModelFactory.createCar(this.currentCarConfig);
    this.scene.add(this.playerCarMeshes.root);

    // 8. Player Physics
    this.playerPhysics = new CarPhysics(this.track, this.currentCarConfig, this.particles);

    // 9. AI Rivals
    const aiGroup = new THREE.Group();
    this.scene.add(aiGroup);
    this.aiController = new AIController(this.track, aiGroup);

    // Pre-warm WebGL Shaders to avoid hitching on first frame
    this.renderer.compile(this.scene, this.camera);

    // Setup input listeners
    this.setupWindowListeners(container);
  }

  private applyAtmosphere(config: typeof this.track.config) {
    const skyCol = new THREE.Color(config.skyColor);
    const fogCol = new THREE.Color(config.fogColor);

    this.scene.background = skyCol;
    this.scene.fog = new THREE.FogExp2(fogCol, config.environment === 'night' ? 0.0035 : 0.0022);

    if (config.environment === 'night') {
      this.sunLight.intensity = 0.6;
      this.sunLight.color.setHex(0x3d4b68);
      this.hemiLight.intensity = 0.45;
      this.hemiLight.color.setHex(0x0e111d);
      this.hemiLight.groundColor.setHex(0x050608);
      this.renderer.toneMappingExposure = 1.35;
    } else if (config.environment === 'sunset') {
      this.sunLight.intensity = 3.0;
      this.sunLight.color.setHex(0xff7b00);
      this.hemiLight.intensity = 1.1;
      this.hemiLight.color.setHex(0xf4a261);
      this.hemiLight.groundColor.setHex(0x264653);
      this.renderer.toneMappingExposure = 1.15;
    } else {
      // Daylight
      this.sunLight.intensity = 2.8;
      this.sunLight.color.setHex(0xfff5e6);
      this.hemiLight.intensity = 1.2;
      this.hemiLight.color.setHex(0xb4d4f8);
      this.hemiLight.groundColor.setHex(0x354f28);
      this.renderer.toneMappingExposure = 1.1;
    }
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public getCameraView(): CameraView {
    return this.cameraView;
  }

  public updateCarConfig(newConfig: CarConfig) {
    this.currentCarConfig = newConfig;
    this.scene.remove(this.playerCarMeshes.root);
    this.playerCarMeshes = ModelFactory.createCar(newConfig);
    this.scene.add(this.playerCarMeshes.root);
    this.playerPhysics.setCarConfig(newConfig);
  }

  public changeTrack(trackId: TrackId) {
    this.currentTrackId = trackId;

    // Clean up current track
    this.scene.remove(this.track.roadMesh);
    this.scene.remove(this.track.finishMesh);
    this.scene.remove(this.track.scenePropsGroup);

    // Build and mount new track
    this.track = TrackBuilder.buildTrack(trackId);
    this.scene.add(this.track.roadMesh);
    this.scene.add(this.track.finishMesh);
    this.scene.add(this.track.scenePropsGroup);
    this.applyAtmosphere(this.track.config);

    // Reset physics and AI to new track
    this.playerPhysics.setTrack(this.track);
    this.aiController.setTrack(this.track);
  }

  public resetRace() {
    this.playerPhysics.resetToSpawn();
    this.aiController.resetRivals();
  }

  /**
   * Main per-frame tick
   */
  public update(inputs: CarInputs, isRaceActive: boolean) {
    if (this.isDestroyed) return;

    const dt = this.clock.getDelta();

    // 1. Step Player Physics
    this.playerPhysics.update(dt, inputs, isRaceActive);

    // 2. Step AI Rivals
    this.aiController.update(dt, isRaceActive);

    // 3. Update Particles
    this.particles.update(dt);

    // 4. Update Player Car 3D Transform
    const px = this.playerPhysics.position.x;
    const py = this.playerPhysics.position.y;
    const pz = this.playerPhysics.position.z;

    this.playerCarMeshes.root.position.set(px, py, pz);
    this.playerCarMeshes.root.rotation.set(
      this.playerPhysics.pitch,
      this.playerPhysics.heading,
      this.playerPhysics.roll
    );

    // Steering front wheels
    this.playerCarMeshes.frontSteerGroup.rotation.y = this.playerPhysics.steerAngle;

    // Rolling all 4 wheels
    this.playerCarMeshes.wheels.forEach((w, i) => {
      w.rotation.x = this.playerPhysics.wheelRotations[i];
    });

    // Dynamic brake lights glow
    const isBraking = inputs.brake > 0.1;
    this.playerCarMeshes.brakeLightMaterials.forEach((mat) => {
      mat.emissiveIntensity = isBraking ? 2.8 : 0.6;
    });

    // Dynamic Nitro / Backfire exhaust flames
    this.playerCarMeshes.exhaustFlameMeshes.forEach((flame) => {
      const active = this.playerPhysics.isNitroActive;
      (flame.material as THREE.MeshBasicMaterial).opacity = active ? 0.9 : 0.0;
      if (active) {
        const flicker = 0.8 + Math.random() * 0.4;
        flame.scale.set(flicker, flicker, flicker * 1.5);
      }
    });

    // 5. Update Sun Light Shadow Target to Follow Car
    this.sunLight.position.set(px + 40, py + 65, pz + 30);
    this.sunLight.target.position.set(px, py, pz);
    this.sunLight.target.updateMatrixWorld();

    // 6. Camera Damped Motion
    this.updateCameraKinematics(dt);

    // 7. Invoke HUD Telemetry Callback
    this.onTelemetryUpdate(this.playerPhysics, this.aiController);

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Smooth exponential camera damping with physical weight
   */
  private updateCameraKinematics(dt: number) {
    const carPos = this.playerPhysics.position;
    const heading = this.playerPhysics.heading;
    const speed = this.playerPhysics.speedKmh;

    const fwdX = Math.sin(heading);
    const fwdZ = Math.cos(heading);

    const fovKick = THREE.MathUtils.clamp(62 + (speed / 300) * 16 + (this.playerPhysics.isNitroActive ? 8 : 0), 60, 86);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fovKick, 6, dt);
    this.camera.updateProjectionMatrix();

    if (this.cameraView === 'chase') {
      // Dynamic Chase Cam: floats behind and above with drift swing
      const distance = 6.4 + (speed / 300) * 1.5;
      const height = 2.4;

      const targetCamX = carPos.x - fwdX * distance;
      const targetCamY = carPos.y + height;
      const targetCamZ = carPos.z - fwdZ * distance;

      // Exponential damping
      RacingScene._camPos.set(targetCamX, targetCamY, targetCamZ);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 10, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 8, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 10, dt);

      // Look slightly ahead of car
      RacingScene._camTarget.set(carPos.x + fwdX * 4, carPos.y + 1.2, carPos.z + fwdZ * 4);
      this.camera.lookAt(RacingScene._camTarget);
    } else if (this.cameraView === 'hood') {
      // Hood / Cockpit Cam
      const hoodPos = carPos.clone().add(new THREE.Vector3(fwdX * 0.4, 0.85, fwdZ * 0.4));
      this.camera.position.copy(hoodPos);
      RacingScene._camTarget.set(carPos.x + fwdX * 25, carPos.y + 0.8, carPos.z + fwdZ * 25);
      this.camera.lookAt(RacingScene._camTarget);
    } else if (this.cameraView === 'bumper') {
      // Bumper Cam (super low to ground)
      const bumpPos = carPos.clone().add(new THREE.Vector3(fwdX * 1.8, 0.4, fwdZ * 1.8));
      this.camera.position.copy(bumpPos);
      RacingScene._camTarget.set(carPos.x + fwdX * 30, carPos.y + 0.3, carPos.z + fwdZ * 30);
      this.camera.lookAt(RacingScene._camTarget);
    } else if (this.cameraView === 'drone') {
      // Tactical Drone Cam
      const dronePos = carPos.clone().add(new THREE.Vector3(-fwdX * 12, 14, -fwdZ * 12));
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, dronePos.x, 6, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, dronePos.y, 6, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, dronePos.z, 6, dt);
      this.camera.lookAt(carPos.x, carPos.y + 0.5, carPos.z);
    } else {
      // Orbit / Free Inspection Cam
      const ox = carPos.x + this.orbitDistance * Math.cos(this.orbitPhi) * Math.sin(this.orbitTheta);
      const oy = carPos.y + this.orbitDistance * Math.sin(this.orbitPhi);
      const oz = carPos.z + this.orbitDistance * Math.cos(this.orbitPhi) * Math.cos(this.orbitTheta);

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, ox, 12, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, oy, 12, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, oz, 12, dt);
      this.camera.lookAt(carPos.x, carPos.y + 0.6, carPos.z);
    }
  }

  private setupWindowListeners(container: HTMLElement) {
    const handleResize = () => {
      if (!this.renderer || !this.camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Orbit mouse controls when orbit camera is active
    const onMouseDown = (e: MouseEvent) => {
      if (this.cameraView !== 'orbit') return;
      this.isPointerDown = true;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isPointerDown || this.cameraView !== 'orbit') return;
      const dx = e.clientX - this.prevPointerX;
      const dy = e.clientY - this.prevPointerY;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      this.orbitTheta -= dx * 0.008;
      this.orbitPhi = THREE.MathUtils.clamp(this.orbitPhi + dy * 0.008, 0.05, Math.PI / 2.2);
    };

    const onMouseUp = () => {
      this.isPointerDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (this.cameraView !== 'orbit') return;
      this.orbitDistance = THREE.MathUtils.clamp(this.orbitDistance + e.deltaY * 0.005, 3.5, 18.0);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: true });
  }

  public dispose() {
    this.isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.aiController.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
