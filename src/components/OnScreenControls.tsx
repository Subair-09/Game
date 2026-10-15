import React, { useState } from 'react';
import { CarInputs } from '../types/game';
import { ArrowLeft, ArrowRight, Flame, ShieldAlert, Zap } from 'lucide-react';

interface OnScreenControlsProps {
  onUpdateInput: (updater: (prev: CarInputs) => CarInputs) => void;
  onInstantLaunch?: () => void;
}

export const OnScreenControls: React.FC<OnScreenControlsProps> = ({
  onUpdateInput,
  onInstantLaunch,
}) => {
  const [activeBtn, setActiveBtn] = useState<{ [key: string]: boolean }>({});

  const setBtn = (key: string, active: boolean) => {
    setActiveBtn((prev) => ({ ...prev, [key]: active }));
  };

  const handleGasStart = () => {
    setBtn('gas', true);
    if (onInstantLaunch) onInstantLaunch();
    onUpdateInput((p) => ({ ...p, throttle: 1, brake: 0 }));
  };

  const handleGasEnd = () => {
    setBtn('gas', false);
    onUpdateInput((p) => ({ ...p, throttle: 0 }));
  };

  const handleBrakeStart = () => {
    setBtn('brake', true);
    onUpdateInput((p) => ({ ...p, brake: 1, throttle: 0 }));
  };

  const handleBrakeEnd = () => {
    setBtn('brake', false);
    onUpdateInput((p) => ({ ...p, brake: 0 }));
  };

  const handleSteerLeftStart = () => {
    setBtn('left', true);
    onUpdateInput((p) => ({ ...p, steer: -1 }));
  };

  const handleSteerLeftEnd = () => {
    setBtn('left', false);
    onUpdateInput((p) => ({ ...p, steer: 0 }));
  };

  const handleSteerRightStart = () => {
    setBtn('right', true);
    onUpdateInput((p) => ({ ...p, steer: 1 }));
  };

  const handleSteerRightEnd = () => {
    setBtn('right', false);
    onUpdateInput((p) => ({ ...p, steer: 0 }));
  };

  const handleNitroStart = () => {
    setBtn('nitro', true);
    onUpdateInput((p) => ({ ...p, nitro: true }));
  };

  const handleNitroEnd = () => {
    setBtn('nitro', false);
    onUpdateInput((p) => ({ ...p, nitro: false }));
  };

  const handleDriftStart = () => {
    setBtn('drift', true);
    onUpdateInput((p) => ({ ...p, handbrake: true }));
  };

  const handleDriftEnd = () => {
    setBtn('drift', false);
    onUpdateInput((p) => ({ ...p, handbrake: false }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-15 flex justify-between items-end p-3 md:p-6 pb-20 md:pb-24">
      {/* LEFT CLUSTER: Steering controls with key labels */}
      <div className="flex items-end gap-2.5 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleSteerLeftStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleSteerLeftEnd();
          }}
          onMouseDown={handleSteerLeftStart}
          onMouseUp={handleSteerLeftEnd}
          onMouseLeave={handleSteerLeftEnd}
          className={`w-15 h-15 md:w-18 md:h-18 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
            activeBtn['left']
              ? 'bg-cyan-500 border-white text-neutral-950 scale-95 shadow-cyan-500/50'
              : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700 text-white'
          }`}
          title="Steer Left (A or Left Arrow)"
        >
          <ArrowLeft className="w-6 h-6 md:w-7 md:h-7" />
          <span className="text-[10px] font-chakra font-bold tracking-wider mt-0.5">
            LEFT <kbd className="text-[9px] opacity-75">[A]</kbd>
          </span>
        </button>

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleSteerRightStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleSteerRightEnd();
          }}
          onMouseDown={handleSteerRightStart}
          onMouseUp={handleSteerRightEnd}
          onMouseLeave={handleSteerRightEnd}
          className={`w-15 h-15 md:w-18 md:h-18 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
            activeBtn['right']
              ? 'bg-cyan-500 border-white text-neutral-950 scale-95 shadow-cyan-500/50'
              : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700 text-white'
          }`}
          title="Steer Right (D or Right Arrow)"
        >
          <ArrowRight className="w-6 h-6 md:w-7 md:h-7" />
          <span className="text-[10px] font-chakra font-bold tracking-wider mt-0.5">
            RIGHT <kbd className="text-[9px] opacity-75">[D]</kbd>
          </span>
        </button>
      </div>

      {/* RIGHT CLUSTER: Nitro, Drift, Brake, and BIG DRIVE / GAS PEDAL */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto">
        {/* Nitro & Drift auxiliary buttons */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              handleNitroStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleNitroEnd();
            }}
            onMouseDown={handleNitroStart}
            onMouseUp={handleNitroEnd}
            onMouseLeave={handleNitroEnd}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${
              activeBtn['nitro']
                ? 'bg-cyan-400 border-white text-neutral-950 scale-95'
                : 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-500/80 text-cyan-300'
            }`}
            title="Nitro Boost (Shift or N)"
          >
            <Flame className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-orbitron font-bold">NOS</span>
            <kbd className="text-[9px] bg-black/40 px-1 py-0.5 rounded font-mono">SHIFT</kbd>
          </button>

          <button
            onTouchStart={(e) => {
              e.preventDefault();
              handleDriftStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleDriftEnd();
            }}
            onMouseDown={handleDriftStart}
            onMouseUp={handleDriftEnd}
            onMouseLeave={handleDriftEnd}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${
              activeBtn['drift']
                ? 'bg-amber-400 border-white text-neutral-950 scale-95'
                : 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/80 text-amber-300'
            }`}
            title="Handbrake Drift (Spacebar)"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-orbitron font-bold">DRIFT</span>
            <kbd className="text-[9px] bg-black/40 px-1 py-0.5 rounded font-mono">SPACE</kbd>
          </button>
        </div>

        {/* Primary Foot Pedals: BRAKE/REV and BIG GAS/DRIVE */}
        <div className="flex items-center gap-2.5">
          {/* BRAKE / REVERSE */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              handleBrakeStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleBrakeEnd();
            }}
            onMouseDown={handleBrakeStart}
            onMouseUp={handleBrakeEnd}
            onMouseLeave={handleBrakeEnd}
            className={`w-16 h-22 md:w-20 md:h-26 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
              activeBtn['brake']
                ? 'bg-red-600 border-white text-white scale-95 shadow-red-600/50'
                : 'bg-red-950/90 hover:bg-red-900 border-red-700/90 text-red-100'
            }`}
            title="Brake / Reverse (S or Down Arrow)"
          >
            <span className="text-xs md:text-sm font-orbitron font-bold tracking-wider">BRAKE</span>
            <span className="text-[10px] text-red-300 font-chakra">REVERSE</span>
            <kbd className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded font-mono mt-1 text-red-200">
              [S] / [↓]
            </kbd>
          </button>

          {/* MAIN GAS / DRIVE PEDAL (High visibility, prominent green glow) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              handleGasStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleGasEnd();
            }}
            onMouseDown={handleGasStart}
            onMouseUp={handleGasEnd}
            onMouseLeave={handleGasEnd}
            className={`w-22 h-26 md:w-28 md:h-30 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl relative overflow-hidden ${
              activeBtn['gas']
                ? 'bg-emerald-500 border-white text-neutral-950 scale-95 shadow-emerald-500/70 ring-4 ring-emerald-400/50'
                : 'bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 border-emerald-400 text-white shadow-emerald-900/60 ring-2 ring-emerald-500/30'
            }`}
            title="Drive / Accelerate (W or Up Arrow)"
          >
            <Zap className="w-5 h-5 text-amber-300 animate-bounce mb-0.5" />
            <span className="text-base md:text-lg font-orbitron font-black tracking-wider drop-shadow">
              DRIVE
            </span>
            <span className="text-[11px] font-chakra font-bold text-emerald-100 uppercase tracking-widest">
              GAS
            </span>
            <kbd className="text-[10px] bg-black/40 px-2 py-0.5 rounded-md font-mono mt-1 font-bold text-emerald-200">
              [W] / [↑]
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
