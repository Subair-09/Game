import * as THREE from 'three';
import { CarConfig, RaceStanding } from '../types/game';
import { BuiltTrack } from './tracks';
import { CarMeshes, ModelFactory } from './proceduralModels';

export interface AIRival {
  id: string;
  name: string;
  color: string;
  carName: string;
  config: CarConfig;
  meshGroup: CarMeshes;
  progressT: number; // 0 to 1
  lap: number;
  speedKmh: number;
  lateralOffset: number; // Offset from centerline (-4m to +4m)
  position: THREE.Vector3;
  heading: number;
  wheelRot: number;
}

export class AIController {
  public rivals: AIRival[] = [];
  private track: BuiltTrack;
  private scene: THREE.Group;

  private static readonly RIVAL_DEFINITIONS = [
    {
      id: 'ai_1',
      name: 'Kenji Takahashi',
      color: '#e63946', // Crimson Red
      carName: 'Ronin Drift-R',
      modelId: 'ronin' as const,
      lateralOffset: -2.8,
      baseSpeed: 235,
    },
    {
      id: 'ai_2',
      name: 'Elena Rostova',
      color: '#00b4d8', // Electric Blue
      carName: 'Apex Phantom',
      modelId: 'phantom' as const,
      lateralOffset: 2.5,
      baseSpeed: 245,
    },
    {
      id: 'ai_3',
      name: 'Marcus Vance',
      color: '#ffb703', // Cyber Gold
      carName: 'Titan V8 Muscle',
      modelId: 'titan' as const,
      lateralOffset: -1.2,
      baseSpeed: 230,
    },
    {
      id: 'ai_4',
      name: 'Axel Blaze',
      color: '#2a9d8f', // Emerald Cyan
      carName: 'Vortex GT',
      modelId: 'vortex' as const,
      lateralOffset: 1.8,
      baseSpeed: 240,
    },
  ];

  constructor(track: BuiltTrack, scene: THREE.Group) {
    this.track = track;
    this.scene = scene;
    this.initRivals();
  }

  public setTrack(track: BuiltTrack) {
    this.track = track;
    this.resetRivals();
  }

  private initRivals() {
    // Clear any existing
    this.rivals.forEach((r) => this.scene.remove(r.meshGroup.root));
    this.rivals = [];

    AIController.RIVAL_DEFINITIONS.forEach((def, index) => {
      const config: CarConfig = {
        id: def.modelId,
        name: def.carName,
        category: 'GT Racing',
        description: 'Championship rival racer',
        color: def.color,
        finish: 'metallic',
        underglowColor: 'off',
        rimColor: '#e0e0e0',
        spoilerStyle: 'track',
        topSpeedKmh: def.baseSpeed,
        acceleration: 85,
        handling: 85,
        driftBias: 50,
        mass: 1300,
      };

      const meshGroup = ModelFactory.createCar(config);
      this.scene.add(meshGroup.root);

      // Stagger initial starting grid positions behind player
      const startT = (1.0 - (index + 1) * 0.015) % 1.0;

      const rival: AIRival = {
        id: def.id,
        name: def.name,
        color: def.color,
        carName: def.carName,
        config,
        meshGroup,
        progressT: startT,
        lap: 1,
        speedKmh: 0,
        lateralOffset: def.lateralOffset,
        position: new THREE.Vector3(),
        heading: 0,
        wheelRot: 0,
      };

      this.updateRivalTransform(rival, 0);
      this.rivals.push(rival);
    });
  }

  public resetRivals() {
    this.rivals.forEach((rival, index) => {
      rival.progressT = (1.0 - (index + 1) * 0.015) % 1.0;
      rival.lap = 1;
      rival.speedKmh = 0;
      this.updateRivalTransform(rival, 0);
    });
  }

  /**
   * Update AI driving behaviors and positions
   */
  public update(dt: number, isRaceActive: boolean) {
    if (!isRaceActive || dt <= 0) return;
    const clampedDt = Math.min(0.05, dt);

    const trackLength = this.track.trackLength;

    for (let i = 0; i < this.rivals.length; i++) {
      const rival = this.rivals[i];

      // Target speed with smart corner braking
      const lookaheadT = (rival.progressT + 0.03) % 1.0;
      const curTangent = this.track.curve.getTangentAt(rival.progressT);
      const aheadTangent = this.track.curve.getTangentAt(lookaheadT);
      const turnSharpness = 1.0 - Math.max(0, curTangent.dot(aheadTangent));

      // Calculate safe cornering speed
      const targetSpeed = rival.config.topSpeedKmh * (1.0 - turnSharpness * 0.45);

      // Accelerate / brake smoothly
      const accelRate = targetSpeed > rival.speedKmh ? 24 : 38;
      rival.speedKmh += (targetSpeed - rival.speedKmh) * Math.min(1.0, clampedDt * (accelRate / 10));

      // Advance along track curve
      const speedMs = rival.speedKmh / 3.6;
      const distTraveled = speedMs * clampedDt;
      const deltaT = distTraveled / trackLength;

      const prevT = rival.progressT;
      rival.progressT = (rival.progressT + deltaT) % 1.0;

      // Lap crossing
      if (prevT > 0.9 && rival.progressT < 0.1) {
        rival.lap++;
      }

      this.updateRivalTransform(rival, clampedDt);
    }
  }

  private updateRivalTransform(rival: AIRival, dt: number) {
    const pt = this.track.curve.getPointAt(rival.progressT);
    const tangent = this.track.curve.getTangentAt(rival.progressT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Position along road ribbon with lateral offset
    rival.position.copy(pt).addScaledVector(normal, rival.lateralOffset);
    rival.position.y += 0.35; // Flush with road

    rival.heading = Math.atan2(tangent.x, tangent.z);

    rival.meshGroup.root.position.copy(rival.position);
    rival.meshGroup.root.rotation.set(0, rival.heading, 0);

    // Rotate wheels
    rival.wheelRot += (rival.speedKmh / 3.6 / 0.35) * dt;
    rival.meshGroup.wheels.forEach((w) => {
      w.rotation.x = rival.wheelRot;
    });
  }

  /**
   * Computes full leaderboard standings including Player and AI rivals
   */
  public computeStandings(playerProgressT: number, playerLap: number): RaceStanding[] {
    const list: Array<{
      id: string;
      name: string;
      isPlayer: boolean;
      lap: number;
      lapProgress: number;
      totalScore: number;
      color: string;
      carName: string;
    }> = [
      {
        id: 'player',
        name: 'YOU',
        isPlayer: true,
        lap: playerLap,
        lapProgress: playerProgressT,
        totalScore: (playerLap - 1) + playerProgressT,
        color: '#00f5d4',
        carName: 'Player Car',
      },
    ];

    this.rivals.forEach((r) => {
      list.push({
        id: r.id,
        name: r.name,
        isPlayer: false,
        lap: r.lap,
        lapProgress: r.progressT,
        totalScore: (r.lap - 1) + r.progressT,
        color: r.color,
        carName: r.carName,
      });
    });

    // Sort descending by total track progression
    list.sort((a, b) => b.totalScore - a.totalScore);

    const leaderScore = list[0].totalScore;

    return list.map((item, idx) => ({
      id: item.id,
      name: item.name,
      isPlayer: item.isPlayer,
      position: idx + 1,
      lap: item.lap,
      lapProgress: item.lapProgress,
      totalProgress: item.totalScore,
      gapSeconds: Math.max(0, (leaderScore - item.totalScore) * 35),
      color: item.color,
      carName: item.carName,
    }));
  }

  public dispose() {
    this.rivals.forEach((r) => {
      this.scene.remove(r.meshGroup.root);
    });
    this.rivals = [];
  }
}
