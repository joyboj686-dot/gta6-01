// audio.js - all sound is synthesised with the WebAudio API: engine hum,
// footsteps, punches, gunshots, sirens and a toggleable radio-style music loop.
// No audio files are loaded, so the game stays fully offline.

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = true;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicTimer = null;
    this.step = 0;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Simple oscillator blip helper.
  blip(freq, dur, type = 'square', vol = 0.2, slide = 0) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur);
  }

  noise(dur, vol = 0.25, filterFreq = 1200) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  siren(pitch = 700) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.linearRampToValueAtTime(pitch * 1.6, t + 0.4);
    o.frequency.linearRampToValueAtTime(pitch, t + 0.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.linearRampToValueAtTime(0, t + 0.9);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.9);
  }

  // Radio-style music: a simple chord arpeggio loop, toggled with M.
  startMusic() {
    this.ensure();
    if (!this.ctx) return;
    this.stopMusic();
    if (!this.musicOn) return;
    const seq = [0, 3, 7, 10, 7, 3, 5, 9]; // semitone steps over a minor-ish scale
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.musicOn) return;
      const root = 220;
      const semi = seq[this.step % seq.length];
      const f = root * Math.pow(2, semi / 12);
      this.tone(f, 0.35, 0.06, 0.35);
      if (this.step % 2 === 0) this.tone(f * 2, 0.35, 0.02, 0.1);
      this.step++;
    }, 190);
  }

  tone(freq, dur, vol, dur2 = 0) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + dur2);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}