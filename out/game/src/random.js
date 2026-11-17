// random.js - a small seeded pseudo-random generator (mulberry32), so the city,
// traffic and any shot-mode scene render identically for the same seed.

export class Rng {
  constructor(seed) {
    this.s = (seed >>> 0) || 1;
  }
  // Deterministic next float in [0, 1).
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + this.next() * (b - a);
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p) {
    return this.next() < p;
  }
}

// A fixed Rng shared for non-shot gameplay, seeded from wall clock so each play
// differs, but stable within a single page load.
export function makeWorldSeed() {
  return (Date.now() & 0x7fffffff) ^ 0x5f3759df;
}