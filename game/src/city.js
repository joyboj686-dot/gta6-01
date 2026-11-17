// city.js - builds the Leonida city layout: road grid, city blocks, buildings,
// a downtown core, a waterfront park and the east beach with the sea beyond it.
// Everything is represented in world units so the renderer just draws shapes.

import { TILE, WORLD_W, WORLD_H, BLOCK, BEACH_W } from './config.js';

const ROAD = 2;      // tiles of road between blocks
const SPACING = BLOCK + ROAD; // tiles between road centres

export class City {
  constructor(rng) {
    this.rng = rng;
    this.roads = [];      // {axis:'h'|'v', t: tile index}
    this.buildings = [];  // {x,y,w,h,color} world-space footprints
    this.park = null;     // world-space rect
    this.downtown = { x: 11, y: 4, w: 4, h: 4 }; // block grid cell range
    this.beach = null; // world-space rect
    this.seaLeft = (WORLD_W - BEACH_W) * TILE;
    this.buildGrid(rng);
  }

  buildGrid(rng) {
    // Road centre lines every SPACING tiles across the whole map.
    for (let t = 0; t < WORLD_W; t += SPACING) this.roads.push({ axis: 'v', t });
    for (let t = 0; t < WORLD_H; t += SPACING) this.roads.push({ axis: 'h', t });

    // Block footprints: the cell between two roads, minus the road width.
    const cells = [];
    for (let x = 0; x < WORLD_W; x += SPACING) {
      for (let y = 0; y < WORLD_H; y += SPACING) {
        const bx = x + ROAD;
        const by = y + ROAD;
        const bw = Math.min(SPACING - ROAD, WORLD_W - bx);
        const bh = Math.min(SPACING - ROAD, WORLD_H - by);
        if (bw > 0 && bh > 0) cells.push({ x: bx, y: by, w: bw, h: bh });
      }
    }

    let parkChosen = false;
    for (const c of cells) {
      const dx = c.x / SPACING;
      const dy = c.y / SPACING;
      const inCore =
        dx >= this.downtown.x && dx < this.downtown.x + this.downtown.w &&
        dy >= this.downtown.y && dy < this.downtown.y + this.downtown.h;
      if (inCore) {
        this.buildBlock(c, 'downtown');
      } else if (!parkChosen && c.x >= WORLD_W - 2 * SPACING && c.y >= WORLD_H / 4 && c.y <= WORLD_H * 2 / 3) {
        this.park = { x: c.x * TILE, y: c.y * TILE, w: c.w * TILE, h: c.h * TILE };
        parkChosen = true;
      } else {
        this.buildBlock(c, 'suburb');
      }
    }

    this.beach = { x: (WORLD_W - BEACH_W) * TILE, y: 0, w: BEACH_W * TILE, h: WORLD_H * TILE };
    this.seaLeft = this.beach.x + 14;
  }

  buildBlock(c, kind) {
    const rng = this.rng;
    const w = c.w * TILE;
    const h = c.h * TILE;
    const ox = c.x * TILE;
    const oy = c.y * TILE;
    const m = 6; // sidewalk margin
    let x = ox + m;
    while (x < ox + w - m) {
      let y = oy + m;
      let bw = 0;
      let bh = 0;
      while (y < oy + h - m) {
        bw = Math.min(w - (x - ox) - m, rng.range(20, 48));
        bh = Math.min(h - (y - oy) - m, rng.range(20, 48));
        if (bw > 8 && bh > 8) {
          this.buildings.push({ x, y, w: bw, h: bh, color: this.pickColor(kind, rng) });
        }
        y += bh + rng.range(4, 12);
      }
      x += bw + rng.range(4, 12);
    }
  }

  pickColor(kind, rng) {
    const downtown = ['#2a3a66', '#24406e', '#31507f', '#1f3357', '#3a4f86', '#263a61'];
    const suburb = ['#8fa3bf', '#a5b7c8', '#93a6ba', '#b0bfcd', '#9fb0c2', '#c2cfdb'];
    const pal = kind === 'downtown' ? downtown : suburb;
    return pal[Math.floor(rng.next() * pal.length)];
  }

  // True when a world point sits on a road lane (for traffic placement).
  isRoad(x, y) {
    const t = Math.floor(x / TILE);
    const s = Math.floor(y / TILE);
    for (const r of this.roads) {
      if (r.axis === 'v' && Math.abs(Math.floor(r.t) - t) < ROAD) return true;
      if (r.axis === 'h' && Math.abs(Math.floor(r.t) - s) < ROAD) return true;
    }
    return false;
  }
}