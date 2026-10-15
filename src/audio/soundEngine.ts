/**
 * Procedural Web Audio API Sound Synthesizer for 3D Racing.
 * Zero external audio files (0% chance of 404).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Engine audio nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private enginePanner: StereoPannerNode | null = null;

  // Screech audio nodes
  private screechSource: AudioBufferSourceNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechGain: GainNode | null = null;

  // Nitro audio nodes
  private nitroNoiseSource: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;

  // Noise buffers cache
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private initialized: boolean = false;

  public init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.createNoiseBuffer();
      this.setupEngineSound();
      this.setupScreechSound();
      this.setupNitroSound();

      this.initialized = true;
    } catch {
      // AudioContext may be restricted until user gesture
    }
  }

  private ensureRunning() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds looping noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
  }

  private setupEngineSound() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    try {
      this.enginePanner = this.ctx.createStereoPanner();
      this.engineGain.connect(this.enginePanner);
      this.enginePanner.connect(this.masterGain);
    } catch {
      this.engineGain.connect(this.masterGain);
    }

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(32.5, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private setupScreechSound() {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = this.whiteNoiseBuffer;
    this.screechSource.loop = true;

    this.screechSource.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    this.screechSource.start();
  }

  private setupNitroSound() {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuffer) return;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    this.nitroNoiseSource = this.ctx.createBufferSource();
    this.nitroNoiseSource.buffer = this.whiteNoiseBuffer;
    this.nitroNoiseSource.loop = true;

    this.nitroNoiseSource.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    this.nitroNoiseSource.start();
  }

  /**
   * Update engine sound parameters dynamically
   * @param rpm 800 - 8500
   * @param throttle 0 - 1
   * @param isNitro active nitro boost
   * @param lateralSlip 0 - 1 tire slip amount
   */
  public update(rpm: number, throttle: number, isNitro: boolean, lateralSlip: number) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // RPM mapping to base fundamental frequency (45Hz idle to ~320Hz redline)
    const normalizedRpm = Math.max(0.1, Math.min(1.0, rpm / 8500));
    const baseFreq = 40 + normalizedRpm * 260;

    if (this.engineOsc1 && this.engineOsc2) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    }

    if (this.engineFilter) {
      const cutoff = 250 + normalizedRpm * 2200 + (throttle > 0.1 ? 600 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    }

    if (this.engineGain) {
      const vol = 0.08 + normalizedRpm * 0.18 + throttle * 0.12;
      this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
    }

    // Tire Screech
    if (this.screechGain && this.screechFilter) {
      const slipAmount = Math.max(0, Math.min(1, lateralSlip));
      if (slipAmount > 0.18) {
        const screechVol = Math.min(0.35, (slipAmount - 0.15) * 0.5);
        this.screechGain.gain.setTargetAtTime(screechVol, now, 0.04);
        this.screechFilter.frequency.setTargetAtTime(1100 + slipAmount * 800, now, 0.05);
      } else {
        this.screechGain.gain.setTargetAtTime(0.0001, now, 0.06);
      }
    }

    // Nitro sound
    if (this.nitroGain) {
      const nitroTarget = isNitro ? 0.3 : 0.0001;
      this.nitroGain.gain.setTargetAtTime(nitroTarget, now, 0.05);
    }
  }

  /**
   * Sound effect: gear shift blow-off valve pop
   */
  public playGearShift() {
    this.ensureRunning();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Quick burst of high-passed noise (blow-off valve hiss)
    const noise = this.ctx.createBufferSource();
    if (this.whiteNoiseBuffer) {
      noise.buffer = this.whiteNoiseBuffer;
    }
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.16);

    // Deep exhaust backfire pop
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.3, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(popGain);
    popGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Sound effect: Collision impact thud
   */
  public playCrash(intensity: number = 0.5) {
    this.ensureRunning();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.2, Math.min(1.0, intensity));

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(clamped * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);

    // Crunch noise
    if (this.whiteNoiseBuffer) {
      const crunch = this.ctx.createBufferSource();
      crunch.buffer = this.whiteNoiseBuffer;
      const crunchFilter = this.ctx.createBiquadFilter();
      crunchFilter.type = 'lowpass';
      crunchFilter.frequency.setValueAtTime(1200, now);

      const crunchGain = this.ctx.createGain();
      crunchGain.gain.setValueAtTime(clamped * 0.35, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      crunch.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(this.masterGain);

      crunch.start(now);
      crunch.stop(now + 0.22);
    }
  }

  /**
   * Race countdown beeps: 3, 2, 1, GO!
   */
  public playCountdown(isGo: boolean = false) {
    this.ensureRunning();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now); // A5 for GO, A4 for countdown

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.2));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + (isGo ? 0.5 : 0.25));
  }

  /**
   * Checkpoint pass chime
   */
  public playCheckpoint() {
    this.ensureRunning();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [587.33, 880].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  /**
   * Victory fanfare on finishing race
   */
  public playVictory() {
    this.ensureRunning();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major chord

    chords.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.85);
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEngine = new SoundEngine();
