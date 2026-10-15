import React, { useState, useEffect } from 'react';
import { CameraView, GameMode } from '../types/game';
import {
  ChevronDown,
  ChevronUp,
  Camera,
  Car,
  MapPin,
  Trophy,
  HelpCircle,
  RotateCcw,
  Flag,
  Flame,
} from 'lucide-react';

interface ControlDockProps {
  cameraView: CameraView;
  onSelectCamera: (view: CameraView) => void;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  onOpenGarage: () => void;
  onOpenTrackSelect: () => void;
  onRestartRace: () => void;
  onResetCar: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  cameraView,
  onSelectCamera,
  gameMode,
  onSelectGameMode,
  onOpenGarage,
  onOpenTrackSelect,
  onRestartRace,
  onResetCar,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Toggle collapsed with 'H' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cameraOptions: { id: CameraView; label: string }[] = [
    { id: 'chase', label: 'Chase' },
    { id: 'hood', label: 'Hood' },
    { id: 'bumper', label: 'Bumper' },
    { id: 'drone', label: 'Drone' },
    { id: 'orbit', label: 'Orbit' },
  ];

  return (
    <div
      className={`fixed z-20 transition-all duration-300 ease-out select-none flex flex-col items-center`}
      style={{
        bottom: '20px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isCollapsed ? 'calc(100% - 32px)' : '0px'})`,
        maxWidth: 'min(940px, 94vw)',
        width: 'max-content',
      }}
    >
      {/* Drawer Toggle Handle (per skill specification) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white px-3.5 py-1 rounded-t-xl text-xs font-chakra flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
        title="Toggle HUD Dock (Shortcut: H)"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Show Controls (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide Controls (H)</span>
          </>
        )}
      </button>

      {/* Dock Card: Solid rgba background (no backdrop-filter over WebGL) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-2 md:p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2 md:gap-4">
        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => onSelectGameMode('race')}
            className={`px-3 py-1.5 rounded-lg text-xs font-chakra font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              gameMode === 'race'
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>RACE GP</span>
          </button>
          <button
            onClick={() => onSelectGameMode('time_trial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-chakra font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              gameMode === 'time_trial'
                ? 'bg-amber-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>HOT LAP</span>
          </button>
          <button
            onClick={() => onSelectGameMode('free_roam')}
            className={`px-3 py-1.5 rounded-lg text-xs font-chakra font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              gameMode === 'free_roam'
                ? 'bg-cyan-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>DRIFT ARENA</span>
          </button>
        </div>

        {/* Camera Views Selector */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <div className="px-2 text-neutral-500 flex items-center">
            <Camera className="w-3.5 h-3.5" />
          </div>
          {cameraOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelectCamera(opt.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-chakra font-semibold transition-colors cursor-pointer ${
                cameraView === opt.id
                  ? 'bg-neutral-700 text-white font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Quick Modal Openers */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenGarage}
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-3 py-2 rounded-xl text-xs font-chakra font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>GARAGE</span>
          </button>

          <button
            onClick={onOpenTrackSelect}
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-3 py-2 rounded-xl text-xs font-chakra font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>TRACKS</span>
          </button>

          <button
            onClick={onRestartRace}
            title="Restart Race"
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            title="Controls & Shortcuts"
            className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls Help Overlay Modal */}
      {showHelp && (
        <div className="absolute bottom-20 bg-neutral-900 border border-neutral-700 p-4 rounded-2xl shadow-2xl text-xs font-chakra text-neutral-300 max-w-sm w-80 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
            <span className="font-orbitron font-bold text-white uppercase">DRIVING CONTROLS</span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-neutral-500 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400">Accelerate / Throttle:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">W / ↑</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Steer Left / Right:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">A / D or ← / →</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Brake / Reverse:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">S / ↓</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Handbrake Drift:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">SPACE</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Nitro Boost:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">SHIFT / N</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Cycle Camera:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">C</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Reset on Track:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">R</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Toggle HUD Dock:</span>
              <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-mono">H</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
