import React, { useEffect } from 'react';
import { LapTelemetry, RaceStanding } from '../types/game';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, MapPin, Car, Award } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface FinishModalProps {
  isOpen: boolean;
  standings: RaceStanding[];
  lapTelemetry: LapTelemetry;
  driftScore: number;
  onRestartRace: () => void;
  onOpenTrackSelect: () => void;
  onOpenGarage: () => void;
}

export const FinishModal: React.FC<FinishModalProps> = ({
  isOpen,
  standings,
  lapTelemetry,
  driftScore,
  onRestartRace,
  onOpenTrackSelect,
  onOpenGarage,
}) => {
  const playerStanding = standings.find((s) => s.isPlayer) || { position: 1 };
  const isWinner = playerStanding.position === 1;

  useEffect(() => {
    if (!isOpen) return;

    soundEngine.playVictory();

    if (isWinner) {
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f5d4', '#ffb703', '#d90429', '#ffffff'],
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  const formatTime = (secs: number | null): string => {
    if (!secs) return '--:--.--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-brightness-50 animate-in zoom-in-95 duration-300">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-center">
        {/* Podium Standing Header */}
        <div className="flex flex-col items-center">
          <div
            className={`w-18 h-18 rounded-3xl flex items-center justify-center mb-3 shadow-xl ${
              isWinner
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : playerStanding.position === 2
                ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
                : 'bg-amber-800/20 text-amber-600 border border-amber-800/40'
            }`}
          >
            <Trophy className="w-10 h-10" />
          </div>

          <span className="text-xs font-chakra uppercase font-bold tracking-widest text-cyan-400">
            GRAND PRIX RESULTS
          </span>
          <h2 className="font-orbitron text-4xl font-black text-white mt-1">
            {isWinner ? 'VICTORY! 1ST PLACE' : `FINISHED P${playerStanding.position}`}
          </h2>
          <p className="text-sm font-chakra text-neutral-400 mt-1">
            {isWinner
              ? 'Flawless driving line! You dominated the championship grid.'
              : 'Great race! Push harder in the corners to take the checkered flag next time.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-chakra uppercase text-neutral-400 font-bold block">
              BEST LAP TIME
            </span>
            <span className="font-orbitron text-xl font-black text-emerald-400 block mt-1">
              {formatTime(lapTelemetry.bestLapTime)}
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-chakra uppercase text-neutral-400 font-bold block">
              TOTAL DRIFT SCORE
            </span>
            <span className="font-orbitron text-xl font-black text-cyan-400 block mt-1">
              {driftScore.toLocaleString()} PTS
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl col-span-2 md:col-span-1">
            <span className="text-[10px] font-chakra uppercase text-neutral-400 font-bold block">
              FINAL STANDING
            </span>
            <span className="font-orbitron text-xl font-black text-amber-400 block mt-1">
              {playerStanding.position} of {standings.length}
            </span>
          </div>
        </div>

        {/* Standings Podium Breakdown */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-left font-chakra text-xs">
          <div className="flex items-center justify-between text-neutral-400 font-bold uppercase pb-2 border-b border-neutral-800 mb-2">
            <span>RACER</span>
            <span>RESULT</span>
          </div>
          <div className="space-y-1.5">
            {standings.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-2 rounded-xl ${
                  s.isPlayer
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-neutral-300 bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-neutral-400 font-orbitron">{s.position}</span>
                  <Award className="w-4 h-4 text-neutral-400" />
                  <span>{s.name}</span>
                </div>
                <span className="text-neutral-400">
                  {s.position === 1 ? 'WINNER' : `+${s.gapSeconds.toFixed(1)}s`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onRestartRace}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-orbitron font-bold text-sm tracking-wider cursor-pointer shadow-lg shadow-cyan-500/25 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RACE AGAIN</span>
          </button>

          <button
            onClick={onOpenTrackSelect}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-chakra font-bold text-sm cursor-pointer transition-colors"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>SELECT TRACK</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-chakra font-bold text-sm cursor-pointer transition-colors"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>CUSTOMIZE CAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
