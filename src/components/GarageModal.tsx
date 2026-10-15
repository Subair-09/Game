import React, { useState } from 'react';
import { CarConfig, CarModelId } from '../types/game';
import { X, Check, Gauge, Zap, Crosshair, Sparkles } from 'lucide-react';

interface GarageModalProps {
  currentConfig: CarConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: CarConfig) => void;
}

const CAR_MODELS: Record<CarModelId, {
  name: string;
  category: string;
  desc: string;
  topSpeed: number;
  accel: number;
  handling: number;
  drift: number;
}> = {
  phantom: {
    name: 'Apex Phantom',
    category: 'Hypercar',
    desc: 'Cutting-edge aerodynamic prototype tuned for blistering top-end speed on long straights.',
    topSpeed: 320,
    accel: 95,
    handling: 85,
    drift: 50,
  },
  vortex: {
    name: 'Vortex GT',
    category: 'Track Spec',
    desc: 'High-downforce GT racer with surgical cornering precision and maximum apex grip.',
    topSpeed: 295,
    accel: 90,
    handling: 96,
    drift: 40,
  },
  ronin: {
    name: 'Ronin Drift-R',
    category: 'JDM Drift Spec',
    desc: 'Lightweight twin-turbo coupe built for high-angle slides and massive drift score multipliers.',
    topSpeed: 280,
    accel: 88,
    handling: 78,
    drift: 95,
  },
  titan: {
    name: 'Titan V8 Muscle',
    category: 'Supercharged V8',
    desc: 'Raw American brute force with thunderous low-end torque and straight-line punch.',
    topSpeed: 305,
    accel: 98,
    handling: 70,
    drift: 80,
  },
};

const COLOR_PALETTE = [
  { name: 'Crimson Fury', hex: '#d90429' },
  { name: 'Cyber Neon Cyan', hex: '#00f5d4' },
  { name: 'Formula Gold', hex: '#ffb703' },
  { name: 'Acid Lime', hex: '#70e000' },
  { name: 'Electric Purple', hex: '#7209b7' },
  { name: 'Hyper Orange', hex: '#fb5607' },
  { name: 'Ghost White', hex: '#f8f9fa' },
  { name: 'Stealth Black', hex: '#16181d' },
];

const UNDERGLOW_OPTIONS = [
  { label: 'Off', val: 'off' },
  { label: 'Cyan', val: '#00f5d4' },
  { label: 'Purple', val: '#b5179e' },
  { label: 'Red', val: '#e63946' },
  { label: 'Amber', val: '#f77f00' },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  currentConfig,
  isOpen,
  onClose,
  onSaveConfig,
}) => {
  const [activeCarId, setActiveCarId] = useState<CarModelId>(currentConfig.id);
  const [selectedColor, setSelectedColor] = useState<string>(currentConfig.color);
  const [selectedFinish, setSelectedFinish] = useState<'gloss' | 'metallic' | 'matte'>(
    currentConfig.finish
  );
  const [selectedUnderglow, setSelectedUnderglow] = useState<string>(
    currentConfig.underglowColor
  );
  const [selectedRim, setSelectedRim] = useState<string>(currentConfig.rimColor);
  const [selectedSpoiler, setSelectedSpoiler] = useState<'track' | 'super' | 'lip' | 'none'>(
    currentConfig.spoilerStyle
  );

  if (!isOpen) return null;

  const currentCarData = CAR_MODELS[activeCarId];

  const handleApply = () => {
    const updated: CarConfig = {
      ...currentConfig,
      id: activeCarId,
      name: currentCarData.name,
      category: currentCarData.category,
      description: currentCarData.desc,
      color: selectedColor,
      finish: selectedFinish,
      underglowColor: selectedUnderglow,
      rimColor: selectedRim,
      spoilerStyle: selectedSpoiler,
      topSpeedKmh: currentCarData.topSpeed,
      acceleration: currentCarData.accel,
      handling: currentCarData.handling,
      driftBias: currentCarData.drift,
    };
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-brightness-50 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <div className="text-xs font-chakra tracking-widest text-cyan-400 uppercase font-bold">
              PERFORMANCE GARAGE & CUSTOMIZER
            </div>
            <h2 className="font-orbitron text-2xl md:text-3xl font-black text-white">
              SELECT & TUNE MACHINE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Vehicle Archetype Selector */}
        <div>
          <label className="text-xs font-chakra uppercase font-bold text-neutral-400 mb-2 block">
            SELECT VEHICLE CHASSIS
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(CAR_MODELS) as CarModelId[]).map((id) => {
              const car = CAR_MODELS[id];
              const isSelected = activeCarId === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveCarId(id)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-800 border-cyan-400 shadow-lg shadow-cyan-950/30'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-chakra uppercase text-cyan-400 font-bold block">
                      {car.category}
                    </span>
                    <span className="font-orbitron font-bold text-sm text-white block mt-0.5">
                      {car.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-chakra text-neutral-400 mt-2 line-clamp-2">
                    {car.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Specs Breakdown */}
        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-chakra text-neutral-400 mb-1">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span>TOP SPEED</span>
            </div>
            <div className="font-orbitron text-xl font-bold text-white">
              {currentCarData.topSpeed} <span className="text-xs text-neutral-400">KM/H</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${(currentCarData.topSpeed / 340) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-chakra text-neutral-400 mb-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>ACCELERATION</span>
            </div>
            <div className="font-orbitron text-xl font-bold text-white">
              {currentCarData.accel} <span className="text-xs text-neutral-400">/ 100</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${currentCarData.accel}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-chakra text-neutral-400 mb-1">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span>GRIP & CORNERING</span>
            </div>
            <div className="font-orbitron text-xl font-bold text-white">
              {currentCarData.handling} <span className="text-xs text-neutral-400">/ 100</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${currentCarData.handling}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-chakra text-neutral-400 mb-1">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              <span>DRIFT BIAS</span>
            </div>
            <div className="font-orbitron text-xl font-bold text-white">
              {currentCarData.drift} <span className="text-xs text-neutral-400">/ 100</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-fuchsia-400 rounded-full"
                style={{ width: `${currentCarData.drift}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Paint Color & Finish Swatches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colors */}
          <div>
            <label className="text-xs font-chakra uppercase font-bold text-neutral-400 mb-2 block">
              LIVERY BODY PAINT
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PALETTE.map((c) => {
                const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedColor(c.hex)}
                    title={c.name}
                    className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-transform cursor-pointer ${
                      isSelected
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-neutral-900 invert" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Finish Type */}
          <div>
            <label className="text-xs font-chakra uppercase font-bold text-neutral-400 mb-2 block">
              PAINT FINISH
            </label>
            <div className="flex gap-2">
              {(['metallic', 'gloss', 'matte'] as const).map((finish) => (
                <button
                  key={finish}
                  onClick={() => setSelectedFinish(finish)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-chakra font-bold uppercase transition-colors cursor-pointer ${
                    selectedFinish === finish
                      ? 'bg-neutral-800 border-cyan-400 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {finish}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Underglow & Spoiler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-chakra uppercase font-bold text-neutral-400 mb-2 block">
              NEON UNDERGLOW
            </label>
            <div className="flex gap-2">
              {UNDERGLOW_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedUnderglow(opt.val)}
                  className={`flex-1 py-2 px-2 rounded-xl border text-xs font-chakra font-bold transition-colors cursor-pointer ${
                    selectedUnderglow === opt.val
                      ? 'bg-neutral-800 border-cyan-400 text-cyan-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-chakra uppercase font-bold text-neutral-400 mb-2 block">
              AERODYNAMIC SPOILER
            </label>
            <div className="flex gap-2">
              {(['track', 'super', 'none'] as const).map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSelectedSpoiler(sp)}
                  className={`flex-1 py-2 px-2 rounded-xl border text-xs font-chakra font-bold uppercase transition-colors cursor-pointer ${
                    selectedSpoiler === sp
                      ? 'bg-neutral-800 border-cyan-400 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-chakra font-bold text-sm cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleApply}
            className="px-7 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-orbitron font-bold text-sm tracking-wider shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            APPLY TO RACER
          </button>
        </div>
      </div>
    </div>
  );
};
