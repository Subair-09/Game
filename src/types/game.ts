export type GameMode = 'race' | 'time_trial' | 'free_roam';

export type CarModelId = 'phantom' | 'vortex' | 'ronin' | 'titan';

export type TrackId = 'grand_prix' | 'neo_tokyo' | 'red_rock';

export type CameraView = 'chase' | 'hood' | 'bumper' | 'drone' | 'orbit';

export interface CarConfig {
  id: CarModelId;
  name: string;
  category: string;
  description: string;
  color: string;
  finish: 'gloss' | 'metallic' | 'matte';
  underglowColor: string;
  rimColor: string;
  spoilerStyle: 'track' | 'super' | 'lip' | 'none';
  topSpeedKmh: number;
  acceleration: number; // 0-100 acceleration rating
  handling: number; // turn grip
  driftBias: number; // how easily it breaks into slide
  mass: number;
}

export interface TrackConfig {
  id: TrackId;
  name: string;
  subtitle: string;
  environment: 'day' | 'night' | 'sunset';
  lengthMeters: number;
  lapsCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Pro';
  skyColor: string;
  fogColor: string;
  groundColor: string;
  barrierColor: string;
}

export interface LapTelemetry {
  currentLap: number;
  totalLaps: number;
  currentLapTime: number;
  bestLapTime: number | null;
  lastLapTime: number | null;
  lapTimes: number[];
  progressPercent: number; // 0 to 1 along track
  sector: number;
}

export interface RaceStanding {
  id: string;
  name: string;
  isPlayer: boolean;
  position: number;
  lap: number;
  lapProgress: number;
  totalProgress: number;
  gapSeconds: number;
  color: string;
  carName: string;
}

export interface DriftState {
  isDrifting: boolean;
  score: number;
  currentCombo: number;
  multiplier: number;
  angle: number;
  recentPointsAdded: number;
  showComboPopup: boolean;
}

export interface CarInputs {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  nitro: boolean;
  reset: boolean;
}

export interface VehiclePhysicsState {
  position: [number, number, number];
  rotation: [number, number, number];
  speedKmh: number;
  engineRpm: number;
  gear: number;
  maxGears: number;
  nitroPercent: number;
  lateralSlip: number;
  steeringAngle: number;
  isOffroad: boolean;
  hasCollided: boolean;
  wheelRots: [number, number, number, number]; // 4 wheels rotation
  frontSteerAngle: number;
}
