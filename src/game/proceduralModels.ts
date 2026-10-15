import * as THREE from 'three';
import { CarConfig } from '../types/game';
import { TextureFactory } from './proceduralTextures';

/**
 * 3D Procedural Composite Vehicle & Environment Models
 * Meets strict Three.js skill requirements:
 * - 3–12 distinct parts per vehicle with varying roughness/metalness
 * - Bottom-center pivot flush with ground
 * - Soft radial contact shadows underneath
 * - Zero external assets (all procedural geometries and textures)
 */

export interface CarMeshes {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  wheels: THREE.Group[];
  frontSteerGroup: THREE.Group;
  brakeLightMaterials: THREE.MeshStandardMaterial[];
  headlightLights: THREE.SpotLight[];
  exhaustFlameMeshes: THREE.Mesh[];
  underglowLight: THREE.PointLight | null;
  underglowMesh: THREE.Mesh | null;
}

export class ModelFactory {
  private static sharedMaterials: { [key: string]: THREE.Material } = {};

  private static getSharedTireMaterial(): THREE.MeshStandardMaterial {
    if (!this.sharedMaterials.tire) {
      this.sharedMaterials.tire = new THREE.MeshStandardMaterial({
        color: 0x1a1a1c,
        roughness: 0.85,
        metalness: 0.05,
        bumpMap: TextureFactory.createTireTreadTexture(),
        bumpScale: 0.04,
      });
    }
    return this.sharedMaterials.tire as THREE.MeshStandardMaterial;
  }

  private static getSharedBrakeDiscMaterial(): THREE.MeshStandardMaterial {
    if (!this.sharedMaterials.brakeDisc) {
      this.sharedMaterials.brakeDisc = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.25,
        metalness: 0.85,
      });
    }
    return this.sharedMaterials.brakeDisc as THREE.MeshStandardMaterial;
  }

  private static getSharedGlassMaterial(): THREE.MeshPhysicalMaterial {
    if (!this.sharedMaterials.glass) {
      this.sharedMaterials.glass = new THREE.MeshPhysicalMaterial({
        color: 0x0a1018,
        metalness: 0.2,
        roughness: 0.1,
        transmission: 0.65,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        depthWrite: false,
      });
    }
    return this.sharedMaterials.glass as THREE.MeshPhysicalMaterial;
  }

  /**
   * Builds an authentic multi-part procedural wheel assembly:
   * 1. Rubber tire with shoulder curvature
   * 2. Deep-dish rim with center hub
   * 3. 5-spoke star geometry
   * 4. Metallic slotted brake disc
   * 5. High-performance brake caliper
   */
  public static createWheel(rimColor: string = '#d0d4dc', radius: number = 0.35, width: number = 0.28): THREE.Group {
    const wheel = new THREE.Group();

    // 1. Rubber Tire
    const tireMat = this.getSharedTireMaterial();
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24, 1, false);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheel.add(tireMesh);

    // 2. Rim Barrel
    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor),
      roughness: 0.2,
      metalness: 0.8,
    });
    const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 0.95, 18, 1, false);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheel.add(rimMesh);

    // 3. Rim Spokes (5 double spokes)
    const spokeGeo = new THREE.BoxGeometry(width * 0.96, radius * 0.65, 0.035);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.rotation.x = (i * Math.PI) / 2.5;
      wheel.add(spoke);
    }

    // 4. Center Hub Nut
    const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width * 1.02, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(
      hubGeo,
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
        metalness: 0.6,
      })
    );
    wheel.add(hubMesh);

    // 5. Brake Disc (internal)
    const discGeo = new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.02, 20);
    discGeo.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeo, this.getSharedBrakeDiscMaterial());
    discMesh.position.x = -width * 0.05;
    wheel.add(discMesh);

    // 6. Brake Caliper (Brembo Racing Red)
    const caliperGeo = new THREE.BoxGeometry(0.045, radius * 0.35, 0.1);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.3,
      metalness: 0.4,
    });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(-width * 0.05, radius * 0.3, 0);
    wheel.add(caliper);

    return wheel;
  }

  /**
   * Assemble a high-fidelity Composite 3–12 Part Procedural Racing Car
   * Adheres to Three.js design constitution:
   * - Distinct primary silhouette, secondary read, and accent details
   * - Varied roughness and metalness across parts
   * - Bottom-center pivot
   * - Soft radial contact shadow
   */
  public static createCar(config: CarConfig): CarMeshes {
    const carRoot = new THREE.Group();
    carRoot.name = `car_${config.id}`;

    // Body paint material
    const roughness = config.finish === 'matte' ? 0.75 : config.finish === 'metallic' ? 0.18 : 0.28;
    const metalness = config.finish === 'metallic' ? 0.85 : 0.35;
    const clearcoat = config.finish === 'matte' ? 0.0 : 0.9;

    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.color),
      roughness,
      metalness,
      clearcoat,
      clearcoatRoughness: 0.1,
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.5,
      map: TextureFactory.createCarbonFiberTexture(),
    });

    // 1. Lower Chassis & Aerodynamic Floor Tray
    const chassisGeo = new THREE.BoxGeometry(1.85, 0.22, 4.2);
    const chassisMesh = new THREE.Mesh(chassisGeo, carbonMaterial);
    chassisMesh.position.set(0, 0.26, 0);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    carRoot.add(chassisMesh);

    // 2. Sculpted Upper Main Body / Fenders
    const bodyGroup = new THREE.Group();

    // Main nose & hood
    const hoodGeo = new THREE.BoxGeometry(1.78, 0.32, 1.9);
    const hoodMesh = new THREE.Mesh(hoodGeo, paintMaterial);
    hoodMesh.position.set(0, 0.46, 0.95);
    hoodMesh.castShadow = true;
    bodyGroup.add(hoodMesh);

    // Model specific alterations
    if (config.id === 'titan') {
      // V8 Supercharger Blower Scoop
      const scoopGeo = new THREE.BoxGeometry(0.55, 0.2, 0.65);
      const scoopMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
      const scoopMesh = new THREE.Mesh(scoopGeo, scoopMat);
      scoopMesh.position.set(0, 0.66, 0.8);
      bodyGroup.add(scoopMesh);
    } else if (config.id === 'phantom') {
      // Hypercar Aerodynamic Shark Fin
      const finGeo = new THREE.BoxGeometry(0.06, 0.45, 1.4);
      const finMesh = new THREE.Mesh(finGeo, carbonMaterial);
      finMesh.position.set(0, 0.75, -0.6);
      bodyGroup.add(finMesh);
    }

    // Rear engine deck
    const deckGeo = new THREE.BoxGeometry(1.82, 0.38, 1.4);
    const deckMesh = new THREE.Mesh(deckGeo, paintMaterial);
    deckMesh.position.set(0, 0.49, -1.25);
    deckMesh.castShadow = true;
    bodyGroup.add(deckMesh);

    // Aerodynamic side pods / air scoops
    const podLGeo = new THREE.BoxGeometry(0.24, 0.34, 1.4);
    const podL = new THREE.Mesh(podLGeo, paintMaterial);
    podL.position.set(-0.94, 0.44, -0.2);
    bodyGroup.add(podL);

    const podRGeo = new THREE.BoxGeometry(0.24, 0.34, 1.4);
    const podR = new THREE.Mesh(podRGeo, paintMaterial);
    podR.position.set(0.94, 0.44, -0.2);
    bodyGroup.add(podR);

    // 3. Cabin / Cockpit Glass Canopy
    const glassMaterial = this.getSharedGlassMaterial();
    const cabinGeo = new THREE.BoxGeometry(1.36, 0.48, 1.6);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
    cabinMesh.position.set(0, 0.74, -0.2);
    cabinMesh.castShadow = true;
    bodyGroup.add(cabinMesh);

    // Interior steering wheel & dash hint
    const dashGeo = new THREE.BoxGeometry(1.1, 0.18, 0.4);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const dashMesh = new THREE.Mesh(dashGeo, dashMat);
    dashMesh.position.set(0, 0.64, 0.25);
    bodyGroup.add(dashMesh);

    // Roof scoop
    const roofScoopGeo = new THREE.BoxGeometry(0.35, 0.12, 0.5);
    const roofScoop = new THREE.Mesh(roofScoopGeo, carbonMaterial);
    roofScoop.position.set(0, 1.02, -0.15);
    bodyGroup.add(roofScoop);

    // 4. Front Aero Splitter & Canards
    const splitterGeo = new THREE.BoxGeometry(1.92, 0.08, 0.5);
    const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitterMesh.position.set(0, 0.18, 2.1);
    splitterMesh.castShadow = true;
    bodyGroup.add(splitterMesh);

    // 5. Rear Diffuser & Exhaust Tips
    const diffuserGeo = new THREE.BoxGeometry(1.86, 0.18, 0.4);
    const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuserMesh.position.set(0, 0.24, -2.12);
    diffuserMesh.castShadow = true;
    bodyGroup.add(diffuserMesh);

    // Exhaust Pipes
    const exhaustFlameMeshes: THREE.Mesh[] = [];
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.15 });
    [-0.35, 0.35].forEach((xPos) => {
      const tipGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.25, 12);
      tipGeo.rotateX(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, exhaustMat);
      tip.position.set(xPos, 0.28, -2.25);
      bodyGroup.add(tip);

      // Backfire / Nitro flame cone mesh (hidden by default)
      const flameGeo = new THREE.ConeGeometry(0.08, 0.45, 8);
      flameGeo.rotateX(-Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x00d2ff,
        transparent: true,
        opacity: 0.0,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(xPos, 0.28, -2.48);
      bodyGroup.add(flame);
      exhaustFlameMeshes.push(flame);
    });

    // 6. Rear GT Wing / Spoiler
    if (config.spoilerStyle !== 'none') {
      const wingGroup = new THREE.Group();
      const wingWidth = config.spoilerStyle === 'super' ? 2.05 : 1.8;
      const wingGeo = new THREE.BoxGeometry(wingWidth, 0.06, 0.38);
      const wingMesh = new THREE.Mesh(wingGeo, carbonMaterial);
      wingMesh.position.set(0, 1.05, -2.0);
      wingMesh.rotation.x = -0.08;
      wingMesh.castShadow = true;
      wingGroup.add(wingMesh);

      // Twin upright wing stanchions
      [-0.55, 0.55].forEach((sx) => {
        const mountGeo = new THREE.BoxGeometry(0.05, 0.45, 0.22);
        const mount = new THREE.Mesh(mountGeo, carbonMaterial);
        mount.position.set(sx, 0.85, -1.95);
        mount.castShadow = true;
        wingGroup.add(mount);
      });

      // Endplates
      [-wingWidth / 2, wingWidth / 2].forEach((ex) => {
        const epGeo = new THREE.BoxGeometry(0.04, 0.28, 0.48);
        const ep = new THREE.Mesh(epGeo, carbonMaterial);
        ep.position.set(ex, 1.05, -2.0);
        wingGroup.add(ep);
      });

      bodyGroup.add(wingGroup);
    }

    // 7. Twin LED Headlights + Real Forward Spotlights
    const headlightLights: THREE.SpotLight[] = [];
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.7, 0.7].forEach((hx) => {
      const hlGeo = new THREE.BoxGeometry(0.3, 0.09, 0.12);
      const hl = new THREE.Mesh(hlGeo, headlightMat);
      hl.position.set(hx, 0.44, 1.95);
      hl.rotation.y = hx > 0 ? -0.2 : 0.2;
      bodyGroup.add(hl);

      const spot = new THREE.SpotLight(0xfff7e6, 2.5, 45, Math.PI / 6, 0.5, 1.5);
      spot.position.set(hx, 0.45, 2.0);
      const target = new THREE.Object3D();
      target.position.set(hx * 1.5, 0, 18);
      carRoot.add(target);
      spot.target = target;
      carRoot.add(spot);
      headlightLights.push(spot);
    });

    // 8. Rear LED Brake Light Strips
    const brakeLightMaterials: THREE.MeshStandardMaterial[] = [];
    [-0.65, 0.65].forEach((bx) => {
      const blGeo = new THREE.BoxGeometry(0.42, 0.08, 0.08);
      const blMat = new THREE.MeshStandardMaterial({
        color: 0x990000,
        emissive: 0xaa0000,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      brakeLightMaterials.push(blMat);
      const bl = new THREE.Mesh(blGeo, blMat);
      bl.position.set(bx, 0.52, -2.05);
      bodyGroup.add(bl);
    });

    carRoot.add(bodyGroup);

    // 9. Wheels & Steering Pivot
    // Four wheels: Front Left, Front Right, Rear Left, Rear Right
    const wheels: THREE.Group[] = [];
    const frontSteerGroup = new THREE.Group();
    frontSteerGroup.position.set(0, 0.35, 1.3);
    carRoot.add(frontSteerGroup);

    // Front Left & Right (attached to frontSteerGroup for realistic steering angle)
    const wheelFL = this.createWheel(config.rimColor);
    wheelFL.position.set(-0.95, 0, 0);
    frontSteerGroup.add(wheelFL);
    wheels.push(wheelFL);

    const wheelFR = this.createWheel(config.rimColor);
    wheelFR.position.set(0.95, 0, 0);
    wheelFR.rotation.y = Math.PI; // Invert for right side
    frontSteerGroup.add(wheelFR);
    wheels.push(wheelFR);

    // Rear Left & Right (fixed to chassis)
    const wheelRL = this.createWheel(config.rimColor);
    wheelRL.position.set(-0.95, 0.35, -1.35);
    carRoot.add(wheelRL);
    wheels.push(wheelRL);

    const wheelRR = this.createWheel(config.rimColor);
    wheelRR.position.set(0.95, 0.35, -1.35);
    wheelRR.rotation.y = Math.PI;
    carRoot.add(wheelRR);
    wheels.push(wheelRR);

    // 10. Soft Radial Contact Shadow Grounding Plane
    // Crucial for grounding so hero car never floats
    const shadowGeo = new THREE.PlaneGeometry(2.6, 5.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: TextureFactory.createContactShadowTexture(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.set(0, 0.02, 0); // Offset Y>=0.02 to avoid coplanar Z-fight
    carRoot.add(contactShadow);

    // 11. Neon Underglow (Customizable)
    let underglowLight: THREE.PointLight | null = null;
    let underglowMesh: THREE.Mesh | null = null;
    if (config.underglowColor && config.underglowColor !== 'off') {
      const uColor = new THREE.Color(config.underglowColor);
      underglowLight = new THREE.PointLight(uColor, 2.5, 3.5, 1.5);
      underglowLight.position.set(0, 0.15, 0);
      carRoot.add(underglowLight);

      const ugGeo = new THREE.PlaneGeometry(1.8, 3.6);
      ugGeo.rotateX(-Math.PI / 2);
      const ugMat = new THREE.MeshBasicMaterial({
        color: uColor,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      underglowMesh = new THREE.Mesh(ugGeo, ugMat);
      underglowMesh.position.set(0, 0.03, 0);
      carRoot.add(underglowMesh);
    }

    return {
      root: carRoot,
      bodyMesh: hoodMesh,
      wheels,
      frontSteerGroup,
      brakeLightMaterials,
      headlightLights,
      exhaustFlameMeshes,
      underglowLight,
      underglowMesh,
    };
  }

  /**
   * Start / Finish Line Gantry Truss with LED Race Lights
   */
  public static createStartGantry(trackWidth: number = 18): THREE.Group {
    const gantry = new THREE.Group();
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.4,
      metalness: 0.8,
    });

    const height = 7.5;
    const postGeo = new THREE.BoxGeometry(0.8, height, 0.8);

    // Left & Right upright posts
    [-trackWidth / 2 - 1.5, trackWidth / 2 + 1.5].forEach((px) => {
      const post = new THREE.Mesh(postGeo, trussMat);
      post.position.set(px, height / 2, 0);
      post.castShadow = true;
      gantry.add(post);

      // Concrete foundation base
      const baseGeo = new THREE.BoxGeometry(1.6, 0.8, 1.6);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x60646c, roughness: 0.9 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(px, 0.4, 0);
      gantry.add(base);
    });

    // Horizontal bridge truss
    const bridgeGeo = new THREE.BoxGeometry(trackWidth + 4, 1.2, 1.4);
    const bridge = new THREE.Mesh(bridgeGeo, trussMat);
    bridge.position.set(0, height - 0.6, 0);
    bridge.castShadow = true;
    gantry.add(bridge);

    // Digital Banner / Sponsor Logo Board
    const bannerGeo = new THREE.BoxGeometry(trackWidth * 0.7, 0.9, 0.1);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.createBarrierBannerTexture('APEX OVERDRIVE GP', '#e63946'),
      roughness: 0.3,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, height - 0.6, 0.72);
    gantry.add(banner);

    // 5 Red LED Countdown Lights
    const lightFrameGeo = new THREE.BoxGeometry(3.6, 0.65, 0.3);
    const lightFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const frame = new THREE.Mesh(lightFrameGeo, lightFrameMat);
    frame.position.set(0, height - 1.6, 0);
    gantry.add(frame);

    for (let i = 0; i < 5; i++) {
      const ledGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16);
      ledGeo.rotateX(Math.PI / 2);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x330000,
        emissive: 0xff0020,
        emissiveIntensity: 0.2,
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(-1.4 + i * 0.7, height - 1.6, 0.16);
      gantry.add(led);
    }

    return gantry;
  }

  /**
   * Grandstand arena structure with stylized spectators
   */
  public static createGrandstand(width: number = 24, tiers: number = 6): THREE.Group {
    const stand = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x484d56, roughness: 0.6, metalness: 0.4 });
    const seatColors = [0x0077b6, 0xd90429, 0xf77f00, 0x2b9348];

    for (let t = 0; t < tiers; t++) {
      const y = (t + 1) * 0.8;
      const z = -t * 1.1;

      // Tier bench step
      const stepGeo = new THREE.BoxGeometry(width, 0.35, 1.2);
      const stepMesh = new THREE.Mesh(stepGeo, frameMat);
      stepMesh.position.set(0, y, z);
      stepMesh.castShadow = true;
      stand.add(stepMesh);

      // Spectator crowd dots
      const numPeople = Math.floor(width * 1.8);
      for (let p = 0; p < numPeople; p++) {
        const px = -width / 2 + 0.5 + Math.random() * (width - 1.0);
        const personGeo = new THREE.BoxGeometry(0.32, 0.55, 0.3);
        const randomColor = seatColors[Math.floor(Math.random() * seatColors.length)];
        const personMat = new THREE.MeshStandardMaterial({ color: randomColor, roughness: 0.8 });
        const person = new THREE.Mesh(personGeo, personMat);
        person.position.set(px, y + 0.35, z);
        stand.add(person);
      }
    }

    // Grandstand angled canopy roof
    const roofGeo = new THREE.BoxGeometry(width, 0.2, tiers * 1.5);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, (tiers + 2) * 0.8, (-tiers * 1.1) / 2);
    roof.rotation.x = 0.15;
    roof.castShadow = true;
    stand.add(roof);

    return stand;
  }

  /**
   * Procedural Streetlight with authentic spotlight cone for night tracks
   */
  public static createStreetlight(height: number = 9, color: string = '#ffd166'): THREE.Group {
    const pole = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.3, metalness: 0.85 });

    // Vertical mast
    const mastGeo = new THREE.CylinderGeometry(0.12, 0.18, height, 8);
    const mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.set(0, height / 2, 0);
    mast.castShadow = true;
    pole.add(mast);

    // Overhanging arm
    const armGeo = new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8);
    armGeo.rotateZ(Math.PI / 3);
    const arm = new THREE.Mesh(armGeo, metalMat);
    arm.position.set(1.4, height - 0.4, 0);
    pole.add(arm);

    // Lamp head
    const lampGeo = new THREE.BoxGeometry(0.8, 0.15, 0.4);
    const lamp = new THREE.Mesh(lampGeo, metalMat);
    lamp.position.set(2.8, height + 0.4, 0);
    pole.add(lamp);

    // Emissive lens
    const lensGeo = new THREE.BoxGeometry(0.7, 0.05, 0.32);
    const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(2.8, height + 0.32, 0);
    pole.add(lens);

    return pole;
  }

  /**
   * Procedural Stylized Foliage / Trees (composite trunk + foliage levels)
   */
  public static createTree(type: 'pine' | 'palm' | 'oak' = 'pine'): THREE.Group {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });

    if (type === 'pine') {
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 2.5, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(0, 1.25, 0);
      trunk.castShadow = true;
      tree.add(trunk);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const coneGeo = new THREE.ConeGeometry(1.8 - i * 0.4, 2.0 - i * 0.2, 7);
        const cone = new THREE.Mesh(coneGeo, leafMat);
        cone.position.set(0, 2.8 + i * 1.3, 0);
        cone.castShadow = true;
        tree.add(cone);
      }
    } else if (type === 'palm') {
      // Slender curved trunk
      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 5.5, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(0.3, 2.75, 0);
      trunk.rotation.z = -0.08;
      trunk.castShadow = true;
      tree.add(trunk);

      // Palm fronds
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7 });
      for (let i = 0; i < 6; i++) {
        const frondGeo = new THREE.BoxGeometry(2.4, 0.05, 0.5);
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.position.set(0.6, 5.5, 0);
        frond.rotation.y = (i * Math.PI) / 3;
        frond.rotation.z = -0.35;
        frond.castShadow = true;
        tree.add(frond);
      }
    } else {
      // Oak / Deciduous
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.2, 7);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(0, 1.1, 0);
      trunk.castShadow = true;
      tree.add(trunk);

      const canopyGeo = new THREE.DodecahedronGeometry(1.8, 1);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x386641, roughness: 0.85 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 3.2, 0);
      canopy.castShadow = true;
      tree.add(canopy);
    }

    return tree;
  }
}
