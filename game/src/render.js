// render.js - draws the Leonida world to the canvas each frame: the road grid,
// buildings, park and beach, the sea, cars, pedestrians, cops, the player and
// particles, all under a camera that follows the player. Also applies the
// day/night tint and headlight glow at night.

import { TILE, WORLD_W, WORLD_H, BEACH_W, CAR_LENGTH, CAR_WIDTH } from './config.js';

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Follow the player (or target), centre the world.
  follow(tx, ty) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camX = tx - w / 2;
    this.camY = ty - h / 2;
  }

  addShake(amount) {
    this.shakeX = (Math.random() * 2 - 1) * amount;
    this.shakeY = (Math.random() * 2 - 1) * amount;
  }

  // Convert world coords to screen coords.
  sx(x) {
    return x - this.camX + this.shakeX;
  }
  sy(y) {
    return y - this.camY + this.shakeY;
  }

  // Daylight factor 0 (night)..1 (noon).
  daylight(timeOfDay, dayCycle) {
    const t = timeOfDay / dayCycle;
    return Math.max(0.28, Math.min(1, Math.abs(Math.sin(t * Math.PI))));
  }

  draw(world, dt) {
    const ctx = this.ctx;
    const day = this.daylight(world.timeOfDay, world.day);
    // Sky / backdrop
    ctx.fillStyle = day > 0.6 ? '#bcd8e8' : '#0a0f22';
    ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

    this.drawCity(world, day);
    this.drawParticles(world);
    this.drawPeds(world, day);
    this.drawCars(world, day);
    this.drawCops(world, day);
    this.drawPlayer(world, day);
    this.drawShake(day);
  }

  drawCity(world, day) {
    const ctx = this.ctx;
    const city = world.city;
    // Sea (east)
    ctx.fillStyle = day > 0.6 ? '#1f6ea8' : '#0d2f4f';
    const seaL = this.sx(city.seaLeft);
    const seaT = this.sy(0);
    const seaW = this.sx(WORLD_W * TILE) - seaL;
    const seaH = this.sy(WORLD_H * TILE) - seaT;
    ctx.fillRect(seaL, seaT, seaW, seaH);
    // Beach
    ctx.fillStyle = '#e6d9a8';
    ctx.fillRect(this.sx((WORLD_W - BEACH_W) * TILE), seaT, this.sx(WORLD_W * TILE - 0) - this.sx((WORLD_W - BEACH_W) * TILE), seaH);
    // Park
    if (city.park) {
      ctx.fillStyle = day > 0.6 ? '#3f9c52' : '#1f5530';
      ctx.fillRect(this.sx(city.park.x), this.sy(city.park.y), city.park.w, city.park.h);
    }
    // Roads (draw as a darker layer with lane lines)
    ctx.fillStyle = '#2b2f3a';
    for (const r of city.roads) {
      if (r.axis === 'v') ctx.fillRect(this.sx(r.t * TILE), this.sy(0), this.sx((r.t + 2) * TILE) - this.sx(r.t * TILE), this.sy(WORLD_H * TILE) - this.sy(0));
      else ctx.fillRect(this.sx(0), this.sy(r.t * TILE), this.sx(WORLD_W * TILE) - this.sx(0), this.sy((r.t + 2) * TILE) - this.sy(r.t * TILE));
    }
    // Buildings
    for (const b of city.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(this.sx(b.x), this.sy(b.y), b.w, b.h);
      // a simple window grid
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(this.sx(b.x), this.sy(b.y), b.w, b.h);
    }
  }

  drawParticles(world) {
    const ctx = this.ctx;
    for (const pt of world.particles) {
      const a = Math.max(0, pt.life / pt.max) * 0.6;
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.type === 'dust' ? '#c8b89a' : '#ffd75e';
      ctx.beginPath();
      ctx.arc(this.sx(pt.x), this.sy(pt.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPeds(world, day) {
    const ctx = this.ctx;
    for (const pd of world.peds) {
      ctx.save();
      ctx.translate(this.sx(pd.x), this.sy(pd.y));
      ctx.rotate(pd.heading);
      ctx.fillStyle = day > 0.6 ? '#d98a4a' : '#5a6a8a';
      ctx.fillRect(-4, -3, 8, 6);
      ctx.fillStyle = '#f0e2cc';
      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawCars(world, day) {
    const ctx = this.ctx;
    for (const c of world.vehicles) {
      if (c.driven) continue; // drawn as the player
      this.drawCar(ctx, c, day, c.isCop);
    }
  }

  drawCar(ctx, c, day, isCop) {
    ctx.save();
    ctx.translate(this.sx(c.x), this.sy(c.y));
    ctx.rotate(c.heading);
    // body
    ctx.fillStyle = isCop ? '#0b2a66' : c.color;
    ctx.fillRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH);
    // windshield
    ctx.fillStyle = 'rgba(150,200,255,0.5)';
    ctx.fillRect(CAR_LENGTH / 2 - 10, -CAR_WIDTH / 2 + 3, 5, CAR_WIDTH - 6);
    // headlights at night
    if (day < 0.5) {
      ctx.fillStyle = 'rgba(255,240,180,0.7)';
      ctx.fillRect(CAR_LENGTH / 2, -CAR_WIDTH / 2 + 2, 3, 2);
      ctx.fillRect(CAR_LENGTH / 2, CAR_WIDTH / 2 - 4, 3, 2);
    }
    // cop light bar
    if (isCop) {
      ctx.fillStyle = '#ff2020';
      ctx.fillRect(-3, -CAR_WIDTH / 2 - 3, 2, 2);
      ctx.fillStyle = '#2030ff';
      ctx.fillRect(-3, CAR_WIDTH / 2 + 1, 2, 2);
    }
    ctx.restore();
  }

  drawCops(world, day) {
    const ctx = this.ctx;
    for (const c of world.cops) {
      ctx.save();
      ctx.translate(this.sx(c.x), this.sy(c.y));
      ctx.rotate(c.heading);
      ctx.fillStyle = '#16306b';
      ctx.fillRect(-4, -3, 8, 6);
      ctx.fillStyle = '#dfe6ff';
      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawPlayer(world, day) {
    const ctx = this.ctx;
    const p = world.player;
    if (p.inCar && p.car) {
      this.drawCar(ctx, p.car, day, false);
      // Player visible in car through tinted window
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(this.sx(p.car.x) - 4, this.sy(p.car.y) - 2, 8, 4);
      return;
    }
    ctx.save();
    ctx.translate(this.sx(p.x), this.sy(p.y));
    ctx.rotate(p.heading);
    // body
    ctx.fillStyle = '#2c8cf0';
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = '#f0e2cc';
    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // aim line when not in car
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(26, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawShake(day) {
    // keep shake alive briefly
    this.shakeX *= 0.8;
    this.shakeY *= 0.8;
  }
}