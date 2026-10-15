import React from 'react';
import { TrackId } from '../types/game';
import { TRACK_CONFIGS } from '../game/tracks';
import { X, Sun, Moon, Sunset, Compass, Flag } from 'lucide-react';

interface TrackSelectModalProps {
  currentTrackId: TrackId;
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (trackId: TrackId) => void;
}

export const TrackSelectModal: React.FC<TrackSelectModalProps> = ({
  currentTrackId,
  isOpen,
  onClose,
  onSelectTrack,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-brightness-50 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <div className="text-xs font-chakra tracking-widest text-cyan-400 uppercase font-bold">
              CIRCUIT SELECTOR
            </div>
            <h2 className="font-orbitron text-2xl md:text-3xl font-black text-white">
              CHOOSE RACETRACK
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tracks List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(TRACK_CONFIGS) as TrackId[]).map((trackKey) => {
            const config = TRACK_CONFIGS[trackKey];
            const isSelected = currentTrackId === trackKey;

            return (
              <button
                key={trackKey}
                onClick={() => {
                  onSelectTrack(trackKey);
                  onClose();
                }}
                className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-neutral-800 border-cyan-400 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Top Badge: Environment */}
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-[10px] font-chakra uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 flex items-center gap-1">
                    {config.environment === 'day' && <Sun className="w-3 h-3 text-amber-400" />}
                    {config.environment === 'night' && <Moon className="w-3 h-3 text-cyan-400" />}
                    {config.environment === 'sunset' && <Sunset className="w-3 h-3 text-orange-400" />}
                    <span className="capitalize">{config.environment}</span>
                  </span>

                  <span
                    className={`text-[10px] font-chakra font-bold px-2 py-0.5 rounded-full ${
                      config.difficulty === 'Beginner'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : config.difficulty === 'Intermediate'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {config.difficulty}
                  </span>
                </div>

                {/* Track Title */}
                <div>
                  <h3 className="font-orbitron font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">
                    {config.name}
                  </h3>
                  <p className="text-xs font-chakra text-neutral-400 mt-1 line-clamp-2">
                    {config.subtitle}
                  </p>
                </div>

                {/* Specs */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-chakra text-neutral-300">
                  <div className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{config.lengthMeters}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{config.lapsCount} Laps</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 py-1 bg-cyan-500/20 rounded-lg text-center font-chakra text-xs text-cyan-300 font-bold">
                    CURRENT TRACK
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-chakra font-bold text-sm cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
