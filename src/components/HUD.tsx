import React, { useEffect, useRef } from 'react';
import { CameraView, DriftState, LapTelemetry, RaceStanding, VehiclePhysicsState } from '../types/game';
import { BuiltTrack } from '../game/tracks';
import { Camera, RotateCcw, Volume2, VolumeX, Gamepad2 } from 'lucide-react';

interface HUDProps {
  physicsState: VehiclePhysicsState;
  lapTelemetry: LapTelemetry;
  standings: RaceStanding[];
  driftState: DriftState;
  track: BuiltTrack;
  countdown: number | null; // 3, 2, 1, 0 (0 = GO), null = race running
  speedUnit: 'kmh' | 'mph';
  onToggleSpeedUnit: () => void;
  cameraView: CameraView;
  onChangeCamera: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetCar: () => void;
  showOnScreenControls: boolean;
  onToggleOnScreenControls: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  physicsState,
  lapTelemetry,
  standings,
  driftState,
  track,
  countdown,
  speedUnit,
  onToggleSpeedUnit,
  cameraView,
  onChangeCamera,
  isMuted,
  onToggleMute,
  onResetCar,
  showOnScreenControls,
  onToggleOnScreenControls,
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Format seconds to mm:ss.ms
  const formatTime = (secs: number | null): string => {
    if (secs === null || secs === undefined || secs === 0) return '--:--.--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const playerStanding = standings.find((s) => s.isPlayer) || {
    position: 1,
    lap: 1,
    gapSeconds: 0,
  };

  const displaySpeed =
    speedUnit === 'kmh'
      ? Math.round(physicsState.speedKmh)
      : Math.round(physicsState.speedKmh * 0.621371);

  // Render high-performance 2D radar minimap
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Find bounds of track waypoints
    const curve = track.curve;
    const points = curve.getPoints(80);

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const padding = 18;
    const scale = Math.min((w - padding * 2) / rangeX, (h - padding * 2) / rangeZ);

    const toCanvasX = (wx: number) => padding + (wx - minX) * scale;
    const toCanvasY = (wz: number) => padding + (wz - minZ) * scale;

    // Draw track circuit outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, idx) => {
      const cx = toCanvasX(p.x);
      const cy = toCanvasY(p.z);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();

    // Start/Finish Line marker
    const startPt = curve.getPointAt(0);
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(toCanvasX(startPt.x), toCanvasY(startPt.z), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // AI Rivals dots
    standings
      .filter((s) => !s.isPlayer)
      .forEach((rival) => {
        const rivalPt = curve.getPointAt(rival.lapProgress);
        ctx.fillStyle = rival.color;
        ctx.beginPath();
        ctx.arc(toCanvasX(rivalPt.x), toCanvasY(rivalPt.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

    // Player arrow / glowing cyan dot
    const [px, , pz] = physicsState.position;
    const playerCanvasX = toCanvasX(px);
    const playerCanvasY = toCanvasY(pz);

    ctx.fillStyle = '#00f5d4';
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(playerCanvasX, playerCanvasY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [physicsState.position, standings, track]);

  // RPM Tachometer Arc calculations
  const rpmNormalized = Math.max(0, Math.min(1, (physicsState.engineRpm - 800) / 7700));
  const isRedline = physicsState.engineRpm > 7600;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Offroad Vignette Warning */}
      {physicsState.isOffroad && (
        <div className="absolute inset-0 bg-red-950/20 pointer-events-none transition-opacity duration-200 border-4 border-red-500/30" />
      )}

      {/* TOP BAR: Left Title & Standing, Center Laptimes, Right Minimap & Quick Actions */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Position & Lap Badge */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Race Title Spec Badge (per skill: minimal title badge top-left) */}
          <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 px-3 py-1.5 rounded-lg text-xs tracking-wider text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-orbitron font-semibold text-white">APEX OVERDRIVE</span>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-400">{track.config.name.split(' ')[0]}</span>
          </div>

          {/* Position & Lap Box */}
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900/90 border border-neutral-700/80 px-4 py-2 rounded-xl flex items-baseline gap-1.5 shadow-lg">
              <span className="text-xs uppercase font-chakra tracking-widest text-neutral-400 font-bold">POS</span>
              <span className="font-orbitron text-3xl font-black text-amber-400">
                {playerStanding.position}
              </span>
              <span className="text-sm font-orbitron text-neutral-400">/{standings.length}</span>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-700/80 px-3.5 py-2 rounded-xl flex flex-col shadow-lg">
              <span className="text-[10px] uppercase font-chakra tracking-wider text-neutral-400">LAP</span>
              <span className="font-orbitron text-lg font-bold text-white">
                {Math.min(lapTelemetry.currentLap, lapTelemetry.totalLaps)} / {lapTelemetry.totalLaps}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Lap Telemetry Time */}
        <div className="hidden sm:flex flex-col items-center pointer-events-auto">
          <div className="bg-neutral-900/90 border border-neutral-700/80 px-5 py-2.5 rounded-2xl flex flex-col items-center shadow-lg">
            <div className="text-[10px] font-chakra uppercase tracking-widest text-neutral-400">CURRENT LAP</div>
            <div className="font-orbitron text-2xl font-black tracking-wider text-emerald-400">
              {formatTime(lapTelemetry.currentLapTime)}
            </div>
            <div className="flex items-center gap-4 text-xs font-chakra text-neutral-300 mt-0.5">
              <span>BEST: <strong className="text-white">{formatTime(lapTelemetry.bestLapTime)}</strong></span>
              {lapTelemetry.lastLapTime && (
                <span>LAST: <strong className="text-neutral-400">{formatTime(lapTelemetry.lastLapTime)}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Radar Minimap & Quick View Toggles */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Quick HUD Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleOnScreenControls}
              title={showOnScreenControls ? 'Hide Drive Pedals' : 'Show Drive Pedals'}
              className={`border p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-chakra ${
                showOnScreenControls
                  ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700/80 text-neutral-400'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline uppercase text-[11px] font-bold">
                {showOnScreenControls ? 'PEDALS' : 'NO PEDALS'}
              </span>
            </button>
            <button
              onClick={onChangeCamera}
              title={`Camera: ${cameraView.toUpperCase()}`}
              className="bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-chakra"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden md:inline uppercase text-[11px] font-bold">{cameraView}</span>
            </button>
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white p-2 rounded-lg transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onResetCar}
              title="Reset Car on Track (R)"
              className="bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white p-2 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Radar Canvas */}
          <div className="bg-neutral-900/90 border border-neutral-700/80 p-2 rounded-2xl shadow-xl flex flex-col items-center">
            <canvas
              ref={minimapCanvasRef}
              width={130}
              height={130}
              className="w-[110px] h-[110px] md:w-[130px] md:h-[130px]"
            />
          </div>
        </div>
      </div>

      {/* CENTER POPUPS: Countdown & Drift Score (zero viewport occlusion during normal driving) */}
      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
        {/* Race Countdown 3, 2, 1, GO! */}
        {countdown !== null && (
          <div className="flex flex-col items-center animate-in zoom-in-75 duration-300">
            <div className="font-orbitron font-black text-7xl md:text-9xl text-amber-400 tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              {countdown === 0 ? (
                <span className="text-emerald-400">GO!</span>
              ) : (
                countdown
              )}
            </div>
            <div className="font-chakra tracking-widest text-sm text-neutral-300 mt-2 uppercase">
              {countdown === 0 ? 'RACE STARTED' : 'GET READY'}
            </div>
          </div>
        )}

        {/* Drift Score Combo Banner */}
        {driftState.isDrifting && (
          <div className="flex flex-col items-center bg-neutral-900/90 border border-cyan-500/40 px-6 py-2.5 rounded-2xl shadow-2xl mt-8">
            <div className="flex items-center gap-2">
              <span className="font-chakra text-xs tracking-widest uppercase font-bold text-cyan-400">DRIFTING</span>
              <span className="font-orbitron text-xs font-bold text-amber-400">
                x{driftState.multiplier.toFixed(1)}
              </span>
            </div>
            <div className="font-orbitron text-3xl font-black text-cyan-300 tracking-wider">
              +{driftState.currentCombo.toLocaleString()} PTS
            </div>
          </div>
        )}

        {/* Finished Drift Score Popup */}
        {!driftState.isDrifting && driftState.showComboPopup && (
          <div className="bg-neutral-900/90 border border-emerald-500/50 px-5 py-2 rounded-xl text-center shadow-lg transition-opacity duration-500">
            <span className="text-xs font-chakra uppercase text-neutral-400 tracking-wider">DRIFT BONUS</span>
            <div className="font-orbitron text-xl font-bold text-emerald-400">
              +{driftState.score.toLocaleString()} TOTAL
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM AREA: Speedometer placed cleanly above pedals, avoiding any overlap */}
      <div className="flex justify-between items-end w-full mb-32 md:mb-36 pointer-events-none">
        {/* Standings Leaderboard preview on left */}
        <div className="hidden lg:flex flex-col gap-1 bg-neutral-900/85 border border-neutral-700/80 p-2.5 rounded-xl text-xs font-chakra pointer-events-auto shadow-lg">
          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5">STANDINGS</div>
          {standings.slice(0, 4).map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-4 px-2 py-0.5 rounded ${
                s.isPlayer ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 text-neutral-400 text-[10px]">{s.position}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="truncate max-w-[90px]">{s.name}</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                {s.position === 1 ? 'LEAD' : `+${s.gapSeconds.toFixed(1)}s`}
              </span>
            </div>
          ))}
        </div>

        {/* Center: Drive instruction pill when stationary */}
        {physicsState.speedKmh < 2 && (
          <div className="mx-auto bg-neutral-950/90 border border-emerald-500/60 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs md:text-sm font-chakra font-bold text-white">
              Press <kbd className="bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-mono">[W]</kbd> / <kbd className="bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-mono">[↑]</kbd> or click the green <strong className="text-emerald-400">[DRIVE]</strong> pedal below to accelerate!
            </span>
          </div>
        )}

        {/* Speedometer & Tachometer Gauge (Lifted above pedals so pedals are 100% visible) */}
        <div className="flex items-end gap-2.5 ml-auto pointer-events-auto">
          {/* Nitro gauge vertical tube */}
          <div className="flex flex-col items-center bg-neutral-900/90 border border-neutral-700/80 px-2 py-2 rounded-2xl shadow-xl">
            <div className="text-[9px] font-chakra uppercase font-bold text-cyan-400 mb-1">NOS</div>
            <div className="w-3 h-20 bg-neutral-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
              <div
                className={`w-full rounded-full transition-all duration-75 ${
                  physicsState.nitroPercent > 20
                    ? 'bg-gradient-to-t from-cyan-500 to-blue-400'
                    : 'bg-red-500'
                }`}
                style={{ height: `${physicsState.nitroPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-orbitron font-bold text-neutral-400 mt-1">
              {Math.round(physicsState.nitroPercent)}%
            </span>
          </div>

          {/* Main Speed & Gear Dial */}
          <div className="bg-neutral-900/90 border border-neutral-700/80 p-3 rounded-2xl shadow-2xl flex flex-col items-center min-w-[150px] relative overflow-hidden">
            {/* Redline Top Glow Bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                isRedline ? 'bg-red-500' : 'bg-transparent'
              }`}
            />

            {/* Gear & RPM info */}
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[9px] font-chakra uppercase text-neutral-400">GEAR</span>
                <span className="font-orbitron text-lg font-black text-amber-400">
                  {physicsState.speedKmh < 1 && physicsState.gear === 1 ? 'N' : physicsState.gear}
                </span>
              </div>
              <span className={`text-[9px] font-orbitron font-bold ${isRedline ? 'text-red-400' : 'text-neutral-400'}`}>
                {Math.round(physicsState.engineRpm)} RPM
              </span>
            </div>

            {/* Tachometer RPM Bar */}
            <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 mb-1.5">
              <div
                className={`h-full transition-all duration-75 ${
                  isRedline
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500'
                }`}
                style={{ width: `${rpmNormalized * 100}%` }}
              />
            </div>

            {/* Big Digital Speed readout */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-orbitron text-4xl md:text-5xl font-black text-white tracking-tighter">
                {displaySpeed}
              </span>
              <button
                onClick={onToggleSpeedUnit}
                className="text-[11px] font-chakra font-bold text-neutral-400 hover:text-white uppercase transition-colors"
                title="Click to toggle KMH / MPH"
              >
                {speedUnit}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
