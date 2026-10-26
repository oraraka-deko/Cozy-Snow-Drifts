/**
 * Procedural Web Audio Synth for Frostplow: Cozy Snow Drifts
 * 100% procedural audio with zero external audio assets or 404 dependencies.
 */

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Snow crunch noise nodes
  private snowNoiseNode: AudioBufferSourceNode | null = null;
  private snowFilter: BiquadFilterNode | null = null;
  private snowGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Ambient chord generator
  private isAmbienceRunning: boolean = false;
  private ambientTimer: number | null = null;
  private chordIndex: number = 0;

  // Pentatonic scale frequencies for combo chimes (Hz)
  private readonly comboScale = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50, // C6
    1174.66, // D6
    1318.51, // E6
  ];

  constructor() {
    // Lazy initialization on first user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.createNoiseBuffer();
      this.setupContinuousSounds();
      this.startAmbientMusic();
    } catch {
      // Audio not supported or blocked
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Soft pinkish noise
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    this.noiseBuffer = buffer;
  }

  private setupContinuousSounds() {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    // 1. Engine Oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);
    this.engineOsc.start();

    // 2. Snow Crunch Looping Noise
    this.snowNoiseNode = this.ctx.createBufferSource();
    this.snowNoiseNode.buffer = this.noiseBuffer;
    this.snowNoiseNode.loop = true;

    this.snowFilter = this.ctx.createBiquadFilter();
    this.snowFilter.type = 'bandpass';
    this.snowFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.snowFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.snowGain = this.ctx.createGain();
    this.snowGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.snowNoiseNode.connect(this.snowFilter);
    this.snowFilter.connect(this.snowGain);
    this.snowGain.connect(this.sfxGain);
    this.snowNoiseNode.start();
  }

  /**
   * Generates cozy ambient winter synth chords (soft Rhodes / celestial pad)
   */
  private startAmbientMusic() {
    if (this.isAmbienceRunning || !this.ctx || !this.musicGain) return;
    this.isAmbienceRunning = true;

    // Cozy Winter Chords (Cmaj9, Am9, Fmaj7#11, Gsus4/add9)
    const chords = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9 (C, E, G, B, D)
      [220.00, 261.63, 329.63, 392.00, 493.88], // Am9 (A, C, E, G, B)
      [174.61, 261.63, 329.63, 369.99, 440.00], // Fmaj7#11 (F, C, E, F#, A)
      [196.00, 261.63, 293.66, 392.00, 440.00], // Gsus4/add9 (G, C, D, G, A)
    ];

    const playNextChord = () => {
      if (!this.ctx || !this.musicGain || !this.isAmbienceRunning) return;
      if (this.ctx.state === 'suspended') return;

      const chord = chords[this.chordIndex % chords.length];
      this.chordIndex++;

      const now = this.ctx.currentTime;
      const chordDuration = 5.5;

      chord.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + 2.0);
        filter.frequency.exponentialRampToValueAtTime(500, now + chordDuration);

        // Gentle swell envelope
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 1.2 + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now + i * 0.08);
        osc.stop(now + chordDuration + 0.1);
      });

      this.ambientTimer = window.setTimeout(playNextChord, (chordDuration - 0.8) * 1000);
    };

    playNextChord();
  }

  /**
   * Call whenever user interacts to unlock Web Audio context
   */
  public resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Update engine sound based on throttle / vehicle speed (0 to 1)
   */
  public updateEngineSound(speedRatio: number, isAccelerating: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain || this.isMuted) return;

    const targetFreq = 42 + speedRatio * 90 + (isAccelerating ? 25 : 0);
    const targetFilter = 120 + speedRatio * 380 + (isAccelerating ? 150 : 0);
    const targetGain = 0.04 + speedRatio * 0.18 + (isAccelerating ? 0.08 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  /**
   * Update snow plowing crunch sound
   */
  public updateSnowCrunch(isPlowing: boolean, speedRatio: number) {
    if (!this.ctx || !this.snowGain || !this.snowFilter || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (isPlowing && speedRatio > 0.05) {
      const targetGain = Math.min(0.24, 0.06 + speedRatio * 0.18);
      const targetFreq = 900 + speedRatio * 800;
      this.snowGain.gain.setTargetAtTime(targetGain, now, 0.06);
      this.snowFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
    } else {
      this.snowGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }
  }

  /**
   * Play crystal chime for snow combo milestones
   */
  public playComboChime(comboLevel: number) {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const index = Math.min(comboLevel, this.comboScale.length - 1);
    const freq = this.comboScale[index];

    // Dual chime tones (fundamental + sweet overtone)
    [freq, freq * 2.01].forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(i === 0 ? 0.22 : 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (i === 0 ? 0.8 : 0.4));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  /**
   * Play boost surge sound
   */
  public playBoostSurge() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.5);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.4);
    filter.Q.setValueAtTime(3.5, now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  /**
   * Friendly cozy truck horn ("BEEP BEEP!")
   */
  public playHorn() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const tones = [440, 554.37]; // A4 + C#5 cozy harmony
    tones.forEach((f) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);

      // Beep 1
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.12, now + 0.12);
      gain.gain.setValueAtTime(0.001, now + 0.15);
      // Beep 2
      gain.gain.setValueAtTime(0.14, now + 0.22);
      gain.gain.setValueAtTime(0.14, now + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  /**
   * Coin / Snow gem pickup sound
   */
  public playCoin() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Vehicle bump / obstacle hit
   */
  public playThud() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * Upgrade purchased celebration chime
   */
  public playUpgradeSuccess() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.45);
    });
  }
}

export const synthAudio = new SynthAudioEngine();
