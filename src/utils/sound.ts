class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq: number, duration = 0.08, type: OscillatorType = 'sine', volume = 0.12, slideTo?: number) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Ignore audio errors
    }
  }

  tap() {
    this.playTone(520, 0.045, 'triangle', 0.08, 380);
  }

  flip() {
    this.playTone(340, 0.06, 'sine', 0.07, 520);
  }

  bounce() {
    this.playTone(440, 0.07, 'square', 0.06, 560);
  }

  score() {
    this.playTone(660, 0.08, 'triangle', 0.1, 880);
  }

  shoot() {
    this.playTone(720, 0.09, 'sawtooth', 0.05, 220);
  }

  hit() {
    this.playTone(160, 0.12, 'sawtooth', 0.11, 60);
  }

  error() {
    this.playTone(210, 0.14, 'sawtooth', 0.09, 130);
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.14, 'triangle', 0.11), i * 85);
    });
  }

  lose() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.16, 'sawtooth', 0.07), i * 100);
    });
  }
}

export const sound = new SoundEngine();
