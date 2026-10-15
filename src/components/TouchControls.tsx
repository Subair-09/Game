import React from 'react';
import { CarInputs } from '../types/game';
import { ArrowLeft, ArrowRight, Flame, ShieldAlert } from 'lucide-react';

interface TouchControlsProps {
  onUpdateInput: (updater: (prev: CarInputs) => CarInputs) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onUpdateInput }) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-15 flex justify-between items-end p-4 pb-18 md:hidden">
      {/* LEFT: Steering controls */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onUpdateInput((p) => ({ ...p, steer: -1 }));
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onUpdateInput((p) => ({ ...p, steer: 0 }));
          }}
          onMouseDown={() => onUpdateInput((p) => ({ ...p, steer: -1 }))}
          onMouseUp={() => onUpdateInput((p) => ({ ...p, steer: 0 }))}
          className="w-16 h-16 rounded-2xl bg-neutral-900/80 active:bg-neutral-700 border-2 border-neutral-700/80 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onUpdateInput((p) => ({ ...p, steer: 1 }));
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onUpdateInput((p) => ({ ...p, steer: 0 }));
          }}
          onMouseDown={() => onUpdateInput((p) => ({ ...p, steer: 1 }))}
          onMouseUp={() => onUpdateInput((p) => ({ ...p, steer: 0 }))}
          className="w-16 h-16 rounded-2xl bg-neutral-900/80 active:bg-neutral-700 border-2 border-neutral-700/80 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>

      {/* RIGHT: Pedals (Throttle, Brake, Handbrake, Nitro) */}
      <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Handbrake Drift & Nitro */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, nitro: true }));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, nitro: false }));
            }}
            onMouseDown={() => onUpdateInput((p) => ({ ...p, nitro: true }))}
            onMouseUp={() => onUpdateInput((p) => ({ ...p, nitro: false }))}
            className="w-13 h-13 rounded-xl bg-cyan-950/80 active:bg-cyan-600 border border-cyan-500/80 flex flex-col items-center justify-center text-cyan-300 active:scale-95 transition-transform"
          >
            <Flame className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] font-orbitron font-bold">NOS</span>
          </button>

          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, handbrake: true }));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, handbrake: false }));
            }}
            onMouseDown={() => onUpdateInput((p) => ({ ...p, handbrake: true }))}
            onMouseUp={() => onUpdateInput((p) => ({ ...p, handbrake: false }))}
            className="w-13 h-13 rounded-xl bg-amber-950/80 active:bg-amber-600 border border-amber-500/80 flex flex-col items-center justify-center text-amber-300 active:scale-95 transition-transform"
          >
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-orbitron font-bold">DRIFT</span>
          </button>
        </div>

        {/* Gas & Brake pedals */}
        <div className="flex items-center gap-3">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, brake: 1 }));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, brake: 0 }));
            }}
            onMouseDown={() => onUpdateInput((p) => ({ ...p, brake: 1 }))}
            onMouseUp={() => onUpdateInput((p) => ({ ...p, brake: 0 }))}
            className="w-16 h-20 rounded-2xl bg-red-950/80 active:bg-red-700 border-2 border-red-700/80 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          >
            <span className="text-xs font-orbitron font-bold">BRAKE</span>
            <span className="text-[10px] text-red-300">REV</span>
          </button>

          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, throttle: 1 }));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onUpdateInput((p) => ({ ...p, throttle: 0 }));
            }}
            onMouseDown={() => onUpdateInput((p) => ({ ...p, throttle: 1 }))}
            onMouseUp={() => onUpdateInput((p) => ({ ...p, throttle: 0 }))}
            className="w-18 h-24 rounded-2xl bg-emerald-950/80 active:bg-emerald-600 border-2 border-emerald-500/80 flex flex-col items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-emerald-950/40"
          >
            <span className="text-sm font-orbitron font-black text-emerald-300">GAS</span>
            <span className="text-[10px] text-emerald-400 font-bold">DRIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
