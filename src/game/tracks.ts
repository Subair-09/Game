import * as THREE from 'three';
import { TrackConfig, TrackId } from '../types/game';
import { TextureFactory } from './proceduralTextures';
import { ModelFactory } from './proceduralModels';

export interface BuiltTrack {
  config: TrackConfig;
  curve: THREE.CatmullRomCurve3;
  trackLength: number;
  roadMesh: THREE.Mesh;
  kerbMeshes: THREE.Mesh[];
  finishMesh: THREE.Mesh;
  checkpoints: THREE.Vector3[];
  barrierPolylines: { left: THREE.Vector3[]; right: THREE.Vector3[] };
  scenePropsGroup: THREE.Group;
  spawnPoint: THREE.Vector3;
  spawnHeading: number;
}

export const TRACK_CONFIGS: Record<TrackId, TrackConfig> = {
  grand_prix: {
    id: 'grand_prix',
    name: 'Apex Grand Prix International',
    subtitle: 'Classic European raceway with technical chicanes & fast straights',
    environment: 'day',
    lengthMeters: 1420,
    lapsCount: 3,
    difficulty: 'Beginner',
    skyColor: '#68b2f8',
    fogColor: '#a0cbeb',
    groundColor: '#30522b',
    barrierColor: '#c83232',
  },
  neo_tokyo: {
    id: 'neo_tokyo',
    name: 'Neo Tokyo Expressway',
    subtitle: 'High-speed elevated night raceway through glowing cyber metropolis',
    environment: 'night',
    lengthMeters: 1680,
    lapsCount: 3,
    difficulty: 'Intermediate',
    skyColor: '#0a0b14',
    fogColor: '#121124',
    groundColor: '#0d0e14',
    barrierColor: '#00d2ff',
  },
  red_rock: {
    id: 'red_rock',
    name: 'Red Rock Canyon Pass',
    subtitle: 'Winding mountain elevation climbs & sweeping canyon cliff turns',
    environment: 'sunset',
    lengthMeters: 1540,
    lapsCount: 3,
    difficulty: 'Pro',
    skyColor: '#e07a5f',
    fogColor: '#bd5338',
    groundColor: '#6f3d2e',
    barrierColor: '#f4a261',
  },
};

export class TrackBuilder {
  /**
   * Returns control waypoints for the selected track
   */
  public static getTrackWaypoints(trackId: TrackId): THREE.Vector3[] {
    if (trackId === 'neo_tokyo') {
      return [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 180),
        new THREE.Vector3(60, 2, 320),
        new THREE.Vector3(180, 5, 380),
        new THREE.Vector3(320, 6, 320),
        new THREE.Vector3(340, 4, 160),
        new THREE.Vector3(250, 2, 40),
        new THREE.Vector3(260, 0, -140),
        new THREE.Vector3(190, 3, -260),
        new THREE.Vector3(60, 5, -340),
        new THREE.Vector3(-100, 3, -310),
        new THREE.Vector3(-220, 0, -180),
        new THREE.Vector3(-240, 2, -20),
        new THREE.Vector3(-160, 4, 120),
        new THREE.Vector3(-80, 2, 80),
        new THREE.Vector3(-30, 0, 20),
      ];
    } else if (trackId === 'red_rock') {
      return [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 2, 160),
        new THREE.Vector3(-80, 8, 280),
        new THREE.Vector3(-200, 14, 340),
        new THREE.Vector3(-310, 16, 260),
        new THREE.Vector3(-280, 10, 100),
        new THREE.Vector3(-180, 6, 20),
        new THREE.Vector3(-140, 8, -120),
        new THREE.Vector3(-60, 12, -240),
        new THREE.Vector3(80, 15, -310),
        new THREE.Vector3(220, 10, -260),
        new THREE.Vector3(280, 6, -120),
        new THREE.Vector3(250, 3, 20),
        new THREE.Vector3(140, 1, 120),
        new THREE.Vector3(60, 0, 60),
      ];
    } else {
      // Grand Prix International (Balanced, exciting circuit)
      return [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 200), // Long home straight
        new THREE.Vector3(50, 1, 320), // Turn 1 fast right
        new THREE.Vector3(160, 3, 380),
        new THREE.Vector3(270, 2, 320), // Turn 2 sweeping curve
        new THREE.Vector3(300, 0, 180),
        new THREE.Vector3(210, 0, 80), // Chicane entry
        new THREE.Vector3(230, 2, -60), // Chicane flick
        new THREE.Vector3(180, 4, -180),
        new THREE.Vector3(60, 5, -280), // Back straight hill
        new THREE.Vector3(-80, 3, -310), // Hairpin apex
        new THREE.Vector3(-190, 1, -240),
        new THREE.Vector3(-240, 0, -110),
        new THREE.Vector3(-200, 2, 30), // S-curve
        new THREE.Vector3(-110, 1, 110),
        new THREE.Vector3(-35, 0, 30),
      ];
    }
  }

  /**
   * Builds the entire 3D track mesh, rumble kerbs, barriers, checkpoints, and scenery
   */
  public static buildTrack(trackId: TrackId): BuiltTrack {
    const config = TRACK_CONFIGS[trackId] || TRACK_CONFIGS.grand_prix;
    const waypoints = this.getTrackWaypoints(trackId);
    const curve = new THREE.CatmullRomCurve3(waypoints, true, 'catmullrom', 0.25);

    const trackWidth = 16.0;
    const numSteps = 500;
    const trackLength = curve.getLength();

    // Sample track points along curve
    const pathPoints = curve.getPoints(numSteps);
    const checkpoints: THREE.Vector3[] = [];
    const checkpointInterval = Math.floor(numSteps / 24); // 24 sector checkpoints

    for (let i = 0; i < numSteps; i += checkpointInterval) {
      checkpoints.push(pathPoints[i].clone());
    }

    // 1. Build Extruded Road Surface Mesh
    const roadVertices: number[] = [];
    const roadNormals: number[] = [];
    const roadUvs: number[] = [];
    const roadIndices: number[] = [];

    const leftBarrierPts: THREE.Vector3[] = [];
    const rightBarrierPts: THREE.Vector3[] = [];

    const _tangent = new THREE.Vector3();
    const _up = new THREE.Vector3(0, 1, 0);
    const _normal = new THREE.Vector3();

    for (let i = 0; i <= numSteps; i++) {
      const t = (i % numSteps) / numSteps;
      const pt = curve.getPointAt(t);
      curve.getTangentAt(t, _tangent).normalize();

      _normal.crossVectors(_tangent, _up).normalize();

      // Road left and right edge
      const halfW = trackWidth / 2;
      const leftPt = pt.clone().addScaledVector(_normal, -halfW);
      const rightPt = pt.clone().addScaledVector(_normal, halfW);

      // Slightly lift road surface above terrain
      leftPt.y += 0.08;
      rightPt.y += 0.08;

      roadVertices.push(leftPt.x, leftPt.y, leftPt.z);
      roadVertices.push(rightPt.x, rightPt.y, rightPt.z);

      roadNormals.push(0, 1, 0, 0, 1, 0);

      const vCoord = (i / numSteps) * 45; // Repeat texture along track length
      roadUvs.push(0, vCoord);
      roadUvs.push(1, vCoord);

      // Barrier track points
      leftBarrierPts.push(leftPt.clone());
      rightBarrierPts.push(rightPt.clone());

      if (i < numSteps) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        // Two triangles per ribbon quad
        roadIndices.push(row1, row2, row1 + 1);
        roadIndices.push(row1 + 1, row2, row2 + 1);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);

    const roadTexture = TextureFactory.createRoadTexture(config.environment === 'night');
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.65,
      metalness: 0.15,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;

    // 2. Start / Finish Line Checkered Strip
    const finishGeo = new THREE.PlaneGeometry(trackWidth, 4.0);
    finishGeo.rotateX(-Math.PI / 2);
    const finishMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.createCheckeredTexture(),
      roughness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const finishMesh = new THREE.Mesh(finishGeo, finishMat);
    const startPoint = curve.getPointAt(0);
    const startTangent = curve.getTangentAt(0).normalize();
    finishMesh.position.copy(startPoint);
    finishMesh.position.y += 0.1; // Grounding offset
    const headingAngle = Math.atan2(startTangent.x, startTangent.z);
    finishMesh.rotation.y = headingAngle;

    // 3. Build Armco Guardrail Barriers (Extruded along left & right track edges)
    const scenePropsGroup = new THREE.Group();
    const barrierMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.barrierColor),
      metalness: 0.8,
      roughness: 0.35,
    });

    [leftBarrierPts, rightBarrierPts].forEach((pts) => {
      const barrierGeo = new THREE.BufferGeometry();
      const bVerts: number[] = [];
      const bIndices: number[] = [];
      const bNormals: number[] = [];

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        bVerts.push(p.x, p.y + 0.1, p.z);
        bVerts.push(p.x, p.y + 1.2, p.z);
        bNormals.push(0, 1, 0, 0, 1, 0);

        if (i < pts.length - 1) {
          const r1 = i * 2;
          const r2 = (i + 1) * 2;
          bIndices.push(r1, r2, r1 + 1);
          bIndices.push(r1 + 1, r2, r2 + 1);
        }
      }
      barrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(bVerts, 3));
      barrierGeo.setAttribute('normal', new THREE.Float32BufferAttribute(bNormals, 3));
      barrierGeo.setIndex(bIndices);
      barrierGeo.computeVertexNormals();

      const bMesh = new THREE.Mesh(barrierGeo, barrierMat);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scenePropsGroup.add(bMesh);
    });

    // 4. Start Gantry
    const gantry = ModelFactory.createStartGantry(trackWidth);
    gantry.position.copy(startPoint);
    gantry.rotation.y = headingAngle;
    scenePropsGroup.add(gantry);

    // 5. Grandstands, Trees, Streetlights, and Surrounding Props
    const kerbMeshes: THREE.Mesh[] = [];
    const kerbMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.createKerbTexture(),
      roughness: 0.5,
      metalness: 0.1,
    });

    // Populate scenery along the track
    const treeCount = config.environment === 'night' ? 20 : 65;
    for (let k = 0; k < treeCount; k++) {
      const frac = (k / treeCount + Math.random() * 0.02) % 1.0;
      const pt = curve.getPointAt(frac);
      curve.getTangentAt(frac, _tangent).normalize();
      _normal.crossVectors(_tangent, _up).normalize();

      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (trackWidth / 2 + 5 + Math.random() * 25) * side;
      const treePos = pt.clone().addScaledVector(_normal, dist);

      const treeType = config.environment === 'sunset' ? 'palm' : 'pine';
      const tree = ModelFactory.createTree(treeType);
      tree.position.copy(treePos);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.85 + Math.random() * 0.3;
      tree.scale.set(scale, scale, scale);
      scenePropsGroup.add(tree);
    }

    // Grandstands along the main straight
    [-25, -55].forEach((distOffset) => {
      const gsPoint = curve.getPointAt(0.04);
      curve.getTangentAt(0.04, _tangent).normalize();
      _normal.crossVectors(_tangent, _up).normalize();
      const gsPos = gsPoint.clone().addScaledVector(_normal, distOffset);

      const grandstand = ModelFactory.createGrandstand(32, 6);
      grandstand.position.copy(gsPos);
      grandstand.rotation.y = headingAngle + (distOffset > 0 ? Math.PI : 0);
      scenePropsGroup.add(grandstand);
    });

    // Streetlights for night or sunset track
    if (config.environment === 'night' || config.environment === 'sunset') {
      const lightInterval = 16;
      for (let s = 0; s < numSteps; s += lightInterval) {
        const frac = s / numSteps;
        const pt = curve.getPointAt(frac);
        curve.getTangentAt(frac, _tangent).normalize();
        _normal.crossVectors(_tangent, _up).normalize();

        const lightPos = pt.clone().addScaledVector(_normal, trackWidth / 2 + 1.8);
        const streetLight = ModelFactory.createStreetlight(8, config.environment === 'night' ? '#00e5ff' : '#ffb703');
        streetLight.position.copy(lightPos);
        streetLight.rotation.y = Math.atan2(_normal.x, _normal.z) + Math.PI;
        scenePropsGroup.add(streetLight);

        // Add soft street spotlight directly illuminating track
        if (s % (lightInterval * 2) === 0) {
          const spot = new THREE.SpotLight(config.environment === 'night' ? 0x00d2ff : 0xffb703, 3.5, 30, Math.PI / 4, 0.6);
          spot.position.copy(lightPos);
          spot.position.y += 8;
          const targetObj = new THREE.Object3D();
          targetObj.position.copy(pt);
          scenePropsGroup.add(targetObj);
          spot.target = targetObj;
          scenePropsGroup.add(spot);
        }
      }
    }

    // Natural landscape ground perimeter (as mandated by skill: outdoor arenas must extend beyond playable zone)
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.groundColor),
      roughness: 0.95,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.15;
    groundMesh.receiveShadow = true;
    scenePropsGroup.add(groundMesh);

    // Initial spawn point on the track at start line
    const spawnHeading = headingAngle;
    const spawnPoint = startPoint.clone().add(new THREE.Vector3(0, 0.35, 0));

    return {
      config,
      curve,
      trackLength,
      roadMesh,
      kerbMeshes,
      finishMesh,
      checkpoints,
      barrierPolylines: { left: leftBarrierPts, right: rightBarrierPts },
      scenePropsGroup,
      spawnPoint,
      spawnHeading,
    };
  }
}
