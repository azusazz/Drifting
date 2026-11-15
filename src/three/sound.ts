class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanSource: AudioBufferSourceNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;
  private oceanGain: GainNode | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    const ctx = this.ensureContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.45, ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  public startOceanAmbience(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.oceanSource) return;

    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      const swell = 0.65 + 0.35 * Math.sin((i / length) * Math.PI * 4);
      data[i] = lastOut * 2.2 * swell;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    const gain = ctx.createGain();
    gain.gain.value = 0.14;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.oceanSource = source;
    this.oceanFilter = filter;
    this.oceanGain = gain;
  }

  public updateAmbience(stormFactor: number): void {
    if (!this.ctx || !this.oceanFilter || !this.oceanGain) return;
    const targetFreq = 320 + stormFactor * 420;
    const targetGain = 0.12 + stormFactor * 0.12;
    this.oceanFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.4);
    this.oceanGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.4);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.25,
    delay = 0,
  ): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playHookThrow(): void {
    this.playTone(460, 210, 0.16, 'triangle', 0.2);
  }

  public playCollect(): void {
    this.playTone(520, 780, 0.11, 'sine', 0.22, 0);
    this.playTone(780, 1040, 0.13, 'sine', 0.18, 0.07);
  }

  public playBuild(): void {
    this.playTone(190, 110, 0.12, 'square', 0.16, 0);
    this.playTone(320, 480, 0.14, 'triangle', 0.2, 0.06);
  }

  public playRepair(): void {
    this.playTone(260, 390, 0.09, 'triangle', 0.18, 0);
    this.playTone(360, 540, 0.11, 'triangle', 0.18, 0.09);
  }

  public playConsume(): void {
    this.playTone(400, 640, 0.14, 'sine', 0.2);
  }

  public playSharkWarn(): void {
    this.playTone(180, 130, 0.24, 'sawtooth', 0.18, 0);
    this.playTone(170, 120, 0.26, 'sawtooth', 0.16, 0.26);
  }

  public playSharkBite(): void {
    this.playTone(150, 62, 0.22, 'sawtooth', 0.28);
  }

  public playSharkHit(): void {
    this.playTone(280, 120, 0.14, 'triangle', 0.24);
  }

  public playVictory(): void {
    this.playTone(440, 554, 0.16, 'triangle', 0.2, 0);
    this.playTone(554, 659, 0.16, 'triangle', 0.2, 0.12);
    this.playTone(659, 880, 0.28, 'sine', 0.22, 0.24);
  }

  public playGameOver(): void {
    this.playTone(320, 220, 0.25, 'sawtooth', 0.2, 0);
    this.playTone(220, 110, 0.45, 'sawtooth', 0.22, 0.24);
  }

  public dispose(): void {
    if (this.oceanSource) {
      try {
        this.oceanSource.stop();
      } catch {
        // ignore already stopped
      }
      this.oceanSource.disconnect();
      this.oceanSource = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.oceanFilter = null;
    this.oceanGain = null;
  }
}

export const soundEngine = new SoundEngine();
