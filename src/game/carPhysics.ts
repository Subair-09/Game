import * as THREE from 'three';
import { CarConfig, CarInputs, DriftState, LapTelemetry, VehiclePhysicsState } from '../types/game';
import { BuiltTrack } from './tracks';
import { soundEngine } from '../audio/soundEngine';
import { ParticleSystem } from './particleSystem';

/**
 * Arcade-Sim Car Kinematics & Physics Engine
 * Delivers responsive, high-speed thrills, satisfying drift slide mechanics,
 * authentic RPM/gear shifts, and track border collision handling.
 */

export class CarPhysics {
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading: number = 0; // Yaw angle (radians)
  public pitch: number = 0;
  public roll: number = 0;

  // Speeds & mechanics
  public speedKmh: number = 0;
  public forwardSpeed: number = 0;
  public lateralSpeed: number = 0;
  public steerAngle: number = 0;
  public engineRpm: number = 900;
  public gear: number = 1;
  public nitroPercent: number = 100;
  public isNitroActive: boolean = false;
  public wheelRotations: [number, number, number, number] = [0, 0, 0, 0];

  // Drift mechanic state
  public driftState: DriftState = {
    isDrifting: false,
    score: 0,
    currentCombo: 0,
    multiplier: 1.0,
    angle: 0,
    recentPointsAdded: 0,
    showComboPopup: false,
  };

  // Lap and progress
  public lapTelemetry: LapTelemetry = {
    currentLap: 1,
    totalLaps: 3,
    currentLapTime: 0,
    bestLapTime: null,
    lastLapTime: null,
    lapTimes: [],
    progressPercent: 0,
    sector: 0,
  };

  // Collision state
  public isOffroad: boolean = false;
  public hasCollided: boolean = false;
  public collisionCooldown: number = 0;

  // Track reference
  private track: BuiltTrack;
  private carConfig: CarConfig;
  private particles: ParticleSystem;

  // Scratch vectors for zero GC
  private static _forward = new THREE.Vector3();
  private static _right = new THREE.Vector3();
  private static _carPos2D = new THREE.Vector2();
  private static _trackPt = new THREE.Vector3();

  // Gear ratios & top speeds (km/h)
  private readonly gearTopSpeeds = [0, 55, 110, 165, 215, 260, 315];

  constructor(track: BuiltTrack, config: CarConfig, particles: ParticleSystem) {
    this.track = track;
    this.carConfig = config;
    this.particles = particles;
    this.resetToSpawn();
  }

  public setCarConfig(config: CarConfig) {
    this.carConfig = config;
  }

  public setTrack(track: BuiltTrack) {
    this.track = track;
    this.resetToSpawn();
  }

  public resetToSpawn() {
    this.position.copy(this.track.spawnPoint);
    this.heading = this.track.spawnHeading;
    this.velocity.set(0, 0, 0);
    this.speedKmh = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.steerAngle = 0;
    this.engineRpm = 900;
    this.gear = 1;
    this.nitroPercent = 100;
    this.isNitroActive = false;
    this.pitch = 0;
    this.roll = 0;
    this.lapTelemetry = {
      currentLap: 1,
      totalLaps: this.track.config.lapsCount,
      currentLapTime: 0,
      bestLapTime: null,
      lastLapTime: null,
      lapTimes: [],
      progressPercent: 0,
      sector: 0,
    };
    this.driftState = {
      isDrifting: false,
      score: 0,
      currentCombo: 0,
      multiplier: 1.0,
      angle: 0,
      recentPointsAdded: 0,
      showComboPopup: false,
    };
  }

  /**
   * Main physics step
   */
  public update(dt: number, inputs: CarInputs, isRaceActive: boolean) {
    if (dt <= 0) return;
    const clampedDt = Math.min(0.05, dt);

    if (inputs.reset) {
      this.resetToNearestTrackPoint();
      return;
    }

    if (!isRaceActive) {
      // Idle revving during countdown
      const targetRpm = inputs.throttle > 0 ? 3000 + inputs.throttle * 4000 : 900;
      this.engineRpm += (targetRpm - this.engineRpm) * clampedDt * 8;
      soundEngine.update(this.engineRpm, inputs.throttle, false, 0);
      return;
    }

    // 1. Steering Dynamics
    const maxSteer = 0.58; // radians (~33 deg)
    // Speed sensitivity: reduce steer angle at 200+ kmh to avoid instantaneous spinouts
    const speedRatio = Math.min(1.0, this.speedKmh / 220);
    const speedFactor = 1.0 - speedRatio * 0.45;
    const targetSteer = inputs.steer * maxSteer * speedFactor;

    // Smooth steering interpolation
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, clampedDt * 14);

    // 2. Throttle, Nitro & Gear Calculation
    this.isNitroActive = inputs.nitro && this.nitroPercent > 5 && inputs.throttle > 0;
    if (this.isNitroActive) {
      this.nitroPercent = Math.max(0, this.nitroPercent - clampedDt * 22);
    } else {
      // Regenerate nitro slowly over time
      this.nitroPercent = Math.min(100, this.nitroPercent + clampedDt * 6);
    }

    // Top speed & acceleration modifiers
    let maxSpeed = this.carConfig.topSpeedKmh;
    let accelPower = 14.5 * (this.carConfig.acceleration / 75);

    if (this.isNitroActive) {
      maxSpeed += 45;
      accelPower *= 1.8;
    }

    if (this.isOffroad) {
      maxSpeed *= 0.65; // Off-road gravel resistance
      accelPower *= 0.5;
    }

    // Forward unit vector based on heading
    const fwdX = Math.sin(this.heading);
    const fwdZ = Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);

    // Current forward & lateral velocities
    this.forwardSpeed = this.velocity.x * fwdX + this.velocity.z * fwdZ;
    this.lateralSpeed = this.velocity.x * rightX + this.velocity.z * rightZ;

    // Acceleration force
    if (inputs.throttle > 0) {
      const topSpeedMs = maxSpeed / 3.6;
      if (this.forwardSpeed < topSpeedMs) {
        // Torque curve tapers as speed approaches max
        const torque = Math.max(0.12, 1.0 - this.forwardSpeed / topSpeedMs);
        this.forwardSpeed += inputs.throttle * accelPower * torque * clampedDt;
      }
    }

    // Braking & Reverse
    if (inputs.brake > 0) {
      if (this.forwardSpeed > 1.0) {
        this.forwardSpeed -= inputs.brake * 26.0 * clampedDt;
        if (this.forwardSpeed < 0) this.forwardSpeed = 0;
      } else {
        // Reverse gear
        this.forwardSpeed -= inputs.brake * 7.5 * clampedDt;
        if (this.forwardSpeed < -12.0) this.forwardSpeed = -12.0;
      }
    }

    // Natural drag and rolling resistance
    this.forwardSpeed *= Math.pow(0.985, clampedDt * 60);

    // 3. Drift Physics & Lateral Grip
    let grip = this.carConfig.handling / 80;
    if (inputs.handbrake) {
      grip *= 0.28; // Loss of rear traction
    }

    // Lateral sliding damping
    this.lateralSpeed *= Math.pow(0.78 * grip, clampedDt * 60);

    // Yaw turning rate: proportional to forward speed and steer angle
    const turnSensitivity = 2.4;
    const turnRate = (this.forwardSpeed / 12) * this.steerAngle * turnSensitivity;
    this.heading += turnRate * clampedDt;

    // Reconstruct world velocity
    this.velocity.x = fwdX * this.forwardSpeed + rightX * this.lateralSpeed;
    this.velocity.z = fwdZ * this.forwardSpeed + rightZ * this.lateralSpeed;

    // Update position
    this.position.x += this.velocity.x * clampedDt;
    this.position.z += this.velocity.z * clampedDt;

    // 4. Track Surface Elevation & Heading
    this.updateTrackElevation(clampedDt);

    // Speed in km/h
    this.speedKmh = Math.max(0, this.forwardSpeed * 3.6);

    // 5. Gear Shifting & Engine RPM Simulation
    this.updateEngineRpm(inputs.throttle, clampedDt);

    // 6. Drift Scoring & Visual FX
    this.updateDrift(clampedDt, inputs.handbrake);

    // 7. Wheel Rotations for Visual Realism
    const wheelRollDelta = (this.forwardSpeed * clampedDt) / 0.35;
    for (let w = 0; w < 4; w++) {
      this.wheelRotations[w] += wheelRollDelta;
    }

    // 8. Track Boundary Collisions & Lap Progress
    this.handleTrackCollisions(clampedDt);
    this.updateLapTelemetry(clampedDt);

    // Sound Engine Update
    const slipAmount = Math.abs(this.lateralSpeed) / 8.0;
    soundEngine.update(this.engineRpm, inputs.throttle, this.isNitroActive, slipAmount);

    // Visual Particles: Drift Smoke & Nitro Flames
    if (this.driftState.isDrifting && this.speedKmh > 25) {
      const rearLeft = this.position.clone().add(new THREE.Vector3(-rightX * 0.9 - fwdX * 1.3, 0, -rightZ * 0.9 - fwdZ * 1.3));
      const rearRight = this.position.clone().add(new THREE.Vector3(rightX * 0.9 - fwdX * 1.3, 0, rightZ * 0.9 - fwdZ * 1.3));
      this.particles.emitTireSmoke(rearLeft, this.velocity);
      this.particles.emitTireSmoke(rearRight, this.velocity);
    }

    if (this.isNitroActive) {
      const exhaustPos = this.position.clone().add(new THREE.Vector3(-fwdX * 2.0, 0.3, -fwdZ * 2.0));
      CarPhysics._forward.set(fwdX, 0, fwdZ);
      this.particles.emitNitroSpark(exhaustPos, CarPhysics._forward);
    }
  }

  /**
   * Snaps car height flush with track road elevation and simulates body suspension pitch/roll
   */
  private updateTrackElevation(dt: number) {
    const t = this.getClosestCurveT();
    const trackPoint = this.track.curve.getPointAt(t);

    // Smoothly adhere to track road height
    const targetY = trackPoint.y + 0.35;
    this.position.y += (targetY - this.position.y) * Math.min(1.0, dt * 18);

    // Subtle pitch under heavy acceleration/braking
    const accelG = (this.forwardSpeed - (this.speedKmh / 3.6)) / (dt || 0.016);
    this.pitch = THREE.MathUtils.clamp(-accelG * 0.003, -0.06, 0.06);

    // Subtle body roll into turns
    const rollTarget = -this.steerAngle * (this.speedKmh / 300) * 0.08;
    this.roll += (rollTarget - this.roll) * Math.min(1.0, dt * 10);
  }

  /**
   * Gear ratios & RPM sound behavior
   */
  private updateEngineRpm(throttle: number, dt: number) {
    const curSpeed = Math.abs(this.speedKmh);

    // Auto gear determination
    let newGear = 1;
    for (let g = 1; g <= 6; g++) {
      if (curSpeed > this.gearTopSpeeds[g - 1]) {
        newGear = g;
      }
    }

    if (newGear !== this.gear) {
      soundEngine.playGearShift();
      this.gear = newGear;
    }

    // RPM based on current gear speed range
    const lowerSpeed = this.gearTopSpeeds[this.gear - 1];
    const upperSpeed = this.gearTopSpeeds[this.gear];
    const ratio = Math.max(0, Math.min(1, (curSpeed - lowerSpeed) / (upperSpeed - lowerSpeed)));

    let targetRpm = 1000 + ratio * 7200;
    if (throttle > 0.1) {
      targetRpm += 300;
    }
    if (this.isNitroActive) {
      targetRpm = Math.min(8500, targetRpm + 1000);
    }

    this.engineRpm += (targetRpm - this.engineRpm) * Math.min(1.0, dt * 10);
  }

  /**
   * Drift scoring system with multiplier
   */
  private updateDrift(dt: number, handbrake: boolean) {
    const slip = Math.abs(this.lateralSpeed);
    const minDriftSpeed = 22; // km/h

    if ((slip > 2.2 || (handbrake && slip > 1.2)) && this.speedKmh > minDriftSpeed) {
      if (!this.driftState.isDrifting) {
        this.driftState.isDrifting = true;
        this.driftState.showComboPopup = false;
      }
      this.driftState.angle = Math.abs(Math.atan2(this.lateralSpeed, this.forwardSpeed));

      // Drift points increment
      const pts = Math.round(slip * 40 * this.driftState.multiplier * dt);
      this.driftState.currentCombo += pts;
      this.driftState.recentPointsAdded = pts;

      // Multiplier increases with sustained drift length
      this.driftState.multiplier = Math.min(4.0, this.driftState.multiplier + dt * 0.45);
    } else {
      if (this.driftState.isDrifting) {
        // Finished a drift combo
        if (this.driftState.currentCombo > 80) {
          this.driftState.score += this.driftState.currentCombo;
          this.driftState.showComboPopup = true;
        }
        this.driftState.isDrifting = false;
        this.driftState.currentCombo = 0;
        this.driftState.multiplier = 1.0;
      }
    }
  }

  /**
   * Checks track boundary and Armco barrier collisions
   */
  private handleTrackCollisions(dt: number) {
    if (this.collisionCooldown > 0) {
      this.collisionCooldown -= dt;
    }

    const t = this.getClosestCurveT();
    const trackCenter = this.track.curve.getPointAt(t);
    const halfWidth = 8.0; // 16m wide road / 2

    const distToCenter = Math.hypot(this.position.x - trackCenter.x, this.position.z - trackCenter.z);

    // Off-road check
    this.isOffroad = distToCenter > halfWidth - 0.5;

    // Barrier collision check (outer guardrail at halfWidth + 1.2m)
    const barrierDist = halfWidth + 1.4;
    if (distToCenter > barrierDist) {
      // Elastic barrier bounce
      const dirX = (this.position.x - trackCenter.x) / distToCenter;
      const dirZ = (this.position.z - trackCenter.z) / distToCenter;

      // Push car back inside
      this.position.x = trackCenter.x + dirX * barrierDist;
      this.position.z = trackCenter.z + dirZ * barrierDist;

      // Reflect velocity component
      this.velocity.x *= -0.4;
      this.velocity.z *= -0.4;
      this.forwardSpeed *= 0.5;

      if (this.collisionCooldown <= 0) {
        soundEngine.playCrash(this.speedKmh / 140);
        this.particles.emitCrashSparks(this.position, 12);
        this.collisionCooldown = 0.4;
      }
    }
  }

  /**
   * Lap progression and sector timing
   */
  private updateLapTelemetry(dt: number) {
    this.lapTelemetry.currentLapTime += dt;

    const t = this.getClosestCurveT();
    this.lapTelemetry.progressPercent = t;

    // Checkpoint / Finish line crossing
    const numCheckpoints = this.track.checkpoints.length;
    const currentSector = Math.floor(t * numCheckpoints);

    if (currentSector !== this.lapTelemetry.sector) {
      // Check for lap completion (passing from last sector to sector 0)
      if (this.lapTelemetry.sector === numCheckpoints - 1 && currentSector === 0) {
        // Completed Lap!
        const lapTime = this.lapTelemetry.currentLapTime;
        this.lapTelemetry.lastLapTime = lapTime;
        this.lapTelemetry.lapTimes.push(lapTime);

        if (!this.lapTelemetry.bestLapTime || lapTime < this.lapTelemetry.bestLapTime) {
          this.lapTelemetry.bestLapTime = lapTime;
        }

        soundEngine.playCheckpoint();
        this.lapTelemetry.currentLapTime = 0;
        this.lapTelemetry.currentLap++;
      }
      this.lapTelemetry.sector = currentSector;
    }
  }

  /**
   * Finds closest parameter T (0 to 1) along track spline
   */
  public getClosestCurveT(): number {
    const numSamples = 100;
    let closestT = 0;
    let minDistSq = Infinity;

    CarPhysics._carPos2D.set(this.position.x, this.position.z);

    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      this.track.curve.getPointAt(t, CarPhysics._trackPt);
      const dSq =
        (CarPhysics._trackPt.x - CarPhysics._carPos2D.x) ** 2 +
        (CarPhysics._trackPt.z - CarPhysics._carPos2D.y) ** 2;

      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestT = t;
      }
    }

    return closestT;
  }

  /**
   * Resets car safely onto track centerline if stuck or requested
   */
  public resetToNearestTrackPoint() {
    const t = this.getClosestCurveT();
    const pt = this.track.curve.getPointAt(t);
    const tangent = this.track.curve.getTangentAt(t).normalize();

    this.position.set(pt.x, pt.y + 0.35, pt.z);
    this.heading = Math.atan2(tangent.x, tangent.z);
    this.velocity.set(0, 0, 0);
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.speedKmh = 0;
    this.steerAngle = 0;
    this.engineRpm = 900;
  }

  public getPhysicsState(): VehiclePhysicsState {
    return {
      position: [this.position.x, this.position.y, this.position.z],
      rotation: [this.pitch, this.heading, this.roll],
      speedKmh: this.speedKmh,
      engineRpm: this.engineRpm,
      gear: this.gear,
      maxGears: 6,
      nitroPercent: this.nitroPercent,
      lateralSlip: Math.abs(this.lateralSpeed) / 8.0,
      steeringAngle: this.steerAngle,
      isOffroad: this.isOffroad,
      hasCollided: this.hasCollided,
      wheelRots: [...this.wheelRotations],
      frontSteerAngle: this.steerAngle,
    };
  }
}
