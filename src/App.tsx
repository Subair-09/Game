import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraView, CarConfig, CarInputs, GameMode, LapTelemetry, RaceStanding, TrackId, VehiclePhysicsState } from './types/game';
import { RacingScene } from './game/racingScene';
import { soundEngine } from './audio/soundEngine';
import { HUD } from './components/HUD';
import { ControlDock } from './components/ControlDock';
import { GarageModal } from './components/GarageModal';
import { TrackSelectModal } from './components/TrackSelectModal';
import { FinishModal } from './components/FinishModal';
import { OnScreenControls } from './components/OnScreenControls';

const DEFAULT_CAR: CarConfig = {
  id: 'phantom',
  name: 'Apex Phantom',
  category: 'Hypercar',
  description: 'Cutting-edge aerodynamic prototype tuned for blistering top-end speed on long straights.',
  color: '#d90429', // Crimson Red
  finish: 'metallic',
  underglowColor: '#00f5d4', // Neon Cyan
  rimColor: '#e5e7eb',
  spoilerStyle: 'super',
  topSpeedKmh: 320,
  acceleration: 95,
  handling: 85,
  driftBias: 50,
  mass: 1250,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<RacingScene | null>(null);

  // Game state
  const [carConfig, setCarConfig] = useState<CarConfig>(DEFAULT_CAR);
  const [trackId, setTrackId] = useState<TrackId>('grand_prix');
  const [gameMode, setGameMode] = useState<GameMode>('race');
  const [cameraView, setCameraView] = useState<CameraView>('chase');
  const [speedUnit, setSpeedUnit] = useState<'kmh' | 'mph'>('kmh');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals
  const [isGarageOpen, setIsGarageOpen] = useState<boolean>(false);
  const [isTrackSelectOpen, setIsTrackSelectOpen] = useState<boolean>(false);
  const [isRaceFinished, setIsRaceFinished] = useState<boolean>(false);

  // Race Countdown: 3, 2, 1, 0 (GO), null (racing)
  const [countdown, setCountdown] = useState<number | null>(3);
  const isRaceActiveRef = useRef<boolean>(true);
  const [showOnScreenControls, setShowOnScreenControls] = useState<boolean>(true);

  // Live Telemetry state for React HUD
  const [physicsState, setPhysicsState] = useState<VehiclePhysicsState>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    speedKmh: 0,
    engineRpm: 900,
    gear: 1,
    maxGears: 6,
    nitroPercent: 100,
    lateralSlip: 0,
    steeringAngle: 0,
    isOffroad: false,
    hasCollided: false,
    wheelRots: [0, 0, 0, 0],
    frontSteerAngle: 0,
  });

  const [lapTelemetry, setLapTelemetry] = useState<LapTelemetry>({
    currentLap: 1,
    totalLaps: 3,
    currentLapTime: 0,
    bestLapTime: null,
    lastLapTime: null,
    lapTimes: [],
    progressPercent: 0,
    sector: 0,
  });

  const [standings, setStandings] = useState<RaceStanding[]>([]);

  // Car inputs buffer
  const inputsRef = useRef<CarInputs>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    reset: false,
  });

  // Track key presses
  const keysDown = useRef<{ [key: string]: boolean }>({});

  // Countdown timer sequence
  const startCountdown = useCallback(() => {
    setCountdown(3);
    isRaceActiveRef.current = false;
    setIsRaceFinished(false);

    soundEngine.playCountdown(false);

    const step1 = setTimeout(() => {
      setCountdown(2);
      soundEngine.playCountdown(false);
    }, 1000);

    const step2 = setTimeout(() => {
      setCountdown(1);
      soundEngine.playCountdown(false);
    }, 2000);

    const step3 = setTimeout(() => {
      setCountdown(0);
      soundEngine.playCountdown(true);
      isRaceActiveRef.current = true;
    }, 3000);

    const step4 = setTimeout(() => {
      setCountdown(null);
      isRaceActiveRef.current = true;
    }, 4200);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearTimeout(step4);
    };
  }, []);

  // Initialize Three.js WebGL Scene inside stable useRef container
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    soundEngine.init();

    let lastHudUpdate = 0;

    const racingScene = new RacingScene(
      container,
      carConfig,
      trackId,
      (physics, ai) => {
        // Throttle HUD react state updates to ~30Hz to prevent React overhead
        const now = performance.now();
        if (now - lastHudUpdate > 32) {
          lastHudUpdate = now;
          setPhysicsState(physics.getPhysicsState());
          setLapTelemetry({ ...physics.lapTelemetry });

          const curStandings = ai.computeStandings(
            physics.lapTelemetry.progressPercent,
            physics.lapTelemetry.currentLap
          );
          setStandings(curStandings);

          // Check if player has finished all laps in race mode
          if (
            gameMode === 'race' &&
            physics.lapTelemetry.currentLap > physics.lapTelemetry.totalLaps &&
            !isRaceFinished
          ) {
            setIsRaceFinished(true);
            isRaceActiveRef.current = false;
          }
        }
      }
    );

    sceneRef.current = racingScene;

    // Start initial countdown
    startCountdown();

    // Game loop via requestAnimationFrame
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Map current keys to inputs
      const k = keysDown.current;
      const inputs = inputsRef.current;

      const keyThrottle = k['w'] || k['arrowup'] ? 1 : 0;
      const keyBrake = k['s'] || k['arrowdown'] ? 1 : 0;
      let keySteer = 0;
      if (k['a'] || k['arrowleft']) keySteer -= 1;
      if (k['d'] || k['arrowright']) keySteer += 1;

      // Merge keyboard with on-screen / touch input if active
      const finalThrottle = Math.max(keyThrottle, inputs.throttle);
      const finalBrake = Math.max(keyBrake, inputs.brake);
      const finalSteer = keySteer !== 0 ? keySteer : inputs.steer;
      const finalHandbrake = k[' '] || inputs.handbrake;
      const finalNitro = k['shift'] || k['n'] || inputs.nitro;
      const finalReset = k['r'] || inputs.reset;

      // If user steps on the throttle, immediately launch the car so they are never stuck!
      if (finalThrottle > 0 && !isRaceActiveRef.current && !isRaceFinished) {
        isRaceActiveRef.current = true;
        setCountdown(null);
      }

      racingScene.update(
        {
          throttle: finalThrottle,
          brake: finalBrake,
          steer: finalSteer,
          handbrake: finalHandbrake,
          nitro: finalNitro,
          reset: finalReset,
        },
        // Race is active in free roam or when launched
        gameMode === 'free_roam' || isRaceActiveRef.current
      );

      // Auto-clear reset signal
      if (inputs.reset) inputs.reset = false;
    };

    reqId = requestAnimationFrame(animate);

    // Keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();
      const key = e.key.toLowerCase();
      keysDown.current[key] = true;

      if (key === 'c') {
        // Cycle camera
        const views: CameraView[] = ['chase', 'hood', 'bumper', 'drone', 'orbit'];
        setCameraView((prev) => {
          const nextIdx = (views.indexOf(prev) + 1) % views.length;
          const nextView = views[nextIdx];
          racingScene.setCameraView(nextView);
          return nextView;
        });
      }

      if (key === 'm') {
        const muted = soundEngine.toggleMute();
        setIsMuted(muted);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      racingScene.dispose();
    };
  }, [carConfig.id, trackId, gameMode, startCountdown]);

  // Handle camera selection
  const handleSelectCamera = (view: CameraView) => {
    setCameraView(view);
    if (sceneRef.current) {
      sceneRef.current.setCameraView(view);
    }
  };

  const handleCycleCamera = () => {
    const views: CameraView[] = ['chase', 'hood', 'bumper', 'drone', 'orbit'];
    const nextIdx = (views.indexOf(cameraView) + 1) % views.length;
    handleSelectCamera(views[nextIdx]);
  };

  // Handle Car config update from Garage
  const handleSaveCarConfig = (newConfig: CarConfig) => {
    setCarConfig(newConfig);
    if (sceneRef.current) {
      sceneRef.current.updateCarConfig(newConfig);
    }
  };

  // Handle Track change
  const handleSelectTrack = (newTrackId: TrackId) => {
    setTrackId(newTrackId);
    if (sceneRef.current) {
      sceneRef.current.changeTrack(newTrackId);
    }
    startCountdown();
  };

  // Handle Restart
  const handleRestartRace = () => {
    setIsRaceFinished(false);
    if (sceneRef.current) {
      sceneRef.current.resetRace();
    }
    startCountdown();
  };

  // Handle Reset Car
  const handleResetCar = () => {
    if (sceneRef.current) {
      sceneRef.current.playerPhysics.resetToNearestTrackPoint();
    }
  };

  // Audio mute
  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Three.js Canvas Container (per skill: stable useRef container outside React HUD) */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Main In-Game Racing Telemetry HUD */}
      {sceneRef.current && (
        <HUD
          physicsState={physicsState}
          lapTelemetry={lapTelemetry}
          standings={standings}
          driftState={sceneRef.current.playerPhysics.driftState}
          track={sceneRef.current.track}
          countdown={countdown}
          speedUnit={speedUnit}
          onToggleSpeedUnit={() => setSpeedUnit((u) => (u === 'kmh' ? 'mph' : 'kmh'))}
          cameraView={cameraView}
          onChangeCamera={handleCycleCamera}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onResetCar={handleResetCar}
          showOnScreenControls={showOnScreenControls}
          onToggleOnScreenControls={() => setShowOnScreenControls((prev) => !prev)}
        />
      )}

      {/* On-Screen Driving Controls (Pedals & Steering) visible and clickable on all screens */}
      {showOnScreenControls && (
        <OnScreenControls
          onUpdateInput={(updater) => {
            inputsRef.current = updater(inputsRef.current);
          }}
          onInstantLaunch={() => {
            isRaceActiveRef.current = true;
            setCountdown(null);
          }}
        />
      )}

      {/* Collapsible Unified Bottom Control Dock (Strictly meets Three.js skill layout rules) */}
      <ControlDock
        cameraView={cameraView}
        onSelectCamera={handleSelectCamera}
        gameMode={gameMode}
        onSelectGameMode={(m) => {
          setGameMode(m);
          handleRestartRace();
        }}
        onOpenGarage={() => setIsGarageOpen(true)}
        onOpenTrackSelect={() => setIsTrackSelectOpen(true)}
        onRestartRace={handleRestartRace}
        onResetCar={handleResetCar}
      />

      {/* Garage Customization Modal */}
      <GarageModal
        currentConfig={carConfig}
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onSaveConfig={handleSaveCarConfig}
      />

      {/* Track Selection Modal */}
      <TrackSelectModal
        currentTrackId={trackId}
        isOpen={isTrackSelectOpen}
        onClose={() => setIsTrackSelectOpen(false)}
        onSelectTrack={handleSelectTrack}
      />

      {/* Finish Race Podium Celebration Modal */}
      <FinishModal
        isOpen={isRaceFinished}
        standings={standings}
        lapTelemetry={lapTelemetry}
        driftScore={sceneRef.current?.playerPhysics.driftState.score || 0}
        onRestartRace={handleRestartRace}
        onOpenTrackSelect={() => {
          setIsRaceFinished(false);
          setIsTrackSelectOpen(true);
        }}
        onOpenGarage={() => {
          setIsRaceFinished(false);
          setIsGarageOpen(true);
        }}
      />
    </div>
  );
}
