// minimap.js - the on-screen HUD and minimap for Leonida Nights: cash, health,
// armor, wanted stars, clock, a live minimap with player/mission/police blips,
// the mission objective banner and a speedometer when driving. Drawn in screen
// space after the world.

import { WORLD_W, WORLD_H, TILE } from './config.js';
import { missionTarget } from './missions.js';

export class HUD {
  constructor(renderer) {
    this.renderer = renderer;
    this.showMinimap = true;
    this.mapSize = 168;
  }

  draw(world, missions) {
    const ctx = this.renderer.ctx;
    const w = this.renderer.canvas.clientWidth;
    const h = this.renderer.canvas.clientHeight;
    const p = world.player;

    // Top-left stats panel
    ctx.fillStyle = 'rgba(8,10,18,0.72)';
    ctx.fillRect(10, 10, 190, 92);
    ctx.fillStyle = '#e6e6ff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Cash
    ctx.fillStyle = '#7ce577';
    ctx.fillText('$ ' + Math.round(p.cash), 18, 16);
    // Health
    ctx.fillStyle = '#ff5c5c';
    ctx.fillText('HP ' + Math.round(Math.max(0, p.hp)), 110, 16);
    // Armor
    ctx.fillStyle = '#7ec8ff';
    ctx.fillText('ARM ' + Math.round(Math.max(0, p.armor)), 110, 34);
    // Ammo (when not in car and has a gun)
    if (!p.inCar) {
      ctx.fillStyle = '#ffd75e';
      ctx.fillText('AMMO ' + Math.round(Math.max(0, p.ammo)), 18, 34);
    }
    // Clock
    const mins = Math.floor(world.timeOfDay / 60) % 24;
    const secs = Math.floor(world.timeOfDay % 60);
    const hh = String(mins).padStart(2, '0');
    const mm = String(secs).padStart(2, '0');
    ctx.fillStyle = '#cfd8ff';
    ctx.fillText('Day ' + world.day + '  ' + hh + ':' + mm, 18, 52);

    // Wanted stars (top-centre)
    ctx.fillStyle = 'rgba(8,10,18,0.6)';
    ctx.fillRect(w / 2 - 60, 10, 120, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px system-ui';
    for (let i = 0; i < world.wanted.stars; i++) {
      ctx.fillStyle = '#ff3b3b';
      ctx.fillText('★', w / 2 - 52 + i * 22, 10);
    }
    if (world.wanted.stars === 0) {
      ctx.fillStyle = '#556';
      ctx.fillText('CLEAN', w / 2 - 30, 12);
    }

    // Mission objective banner (top-centre below stars)
    const obj = missions.objectiveText();
    if (missions.current) {
      ctx.fillStyle = 'rgba(8,10,18,0.7)';
      ctx.fillRect(w / 2 - 160, 40, 320, 22);
      ctx.fillStyle = '#ffe79a';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION: ' + missions.current.name, w / 2, 44);
      ctx.fillStyle = '#cfd8ff';
      ctx.font = '12px system-ui';
      ctx.fillText(obj, w / 2, 58);
    }
    // Transient message (mission success / failure / dialogue)
    if (missions.msg) {
      ctx.fillStyle = 'rgba(8,10,18,0.8)';
      ctx.fillRect(w / 2 - 220, h - 96, 440, 40);
      ctx.fillStyle = missions.msgColor;
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(missions.msg, w / 2, h - 84);
    }

    // Speedometer when driving
    if (p.inCar && p.car) {
      const sp = Math.abs(p.car.speed);
      ctx.fillStyle = 'rgba(8,10,18,0.72)';
      ctx.fillRect(10, h - 54, 120, 44);
      ctx.fillStyle = '#9ff0a0';
      ctx.font = '22px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(sp * 14) + ' mph', 18, h - 44);
      ctx.fillStyle = '#cfd8ff';
      ctx.font = '11px system-ui';
      ctx.fillText('E to exit', 18, h - 20);
    }

    // Minimap (bottom-right)
    if (this.showMinimap) this.drawMinimap(world, missions);
  }

  drawMinimap(world, missions) {
    const ctx = this.renderer.ctx;
    const w = this.renderer.canvas.clientWidth;
    const h = this.renderer.canvas.clientHeight;
    const size = this.mapSize;
    const x = w - size - 10;
    const y = h - size - 10;
    ctx.fillStyle = 'rgba(8,12,20,0.82)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    // Map scale: world -> minimap
    const px = (wx) => x + (wx / (WORLD_W * TILE)) * size;
    const py = (wy) => y + (wy / (WORLD_H * TILE)) * size;

    // Roads faintly
    ctx.fillStyle = 'rgba(120,130,150,0.18)';
    for (const r of world.city.roads) {
      if (r.axis === 'v') ctx.fillRect(px(r.t * TILE), y, px((r.t + 2) * TILE) - px(r.t * TILE), size);
      else ctx.fillRect(x, py(r.t * TILE), size, py((r.t + 2) * TILE) - py(r.t * TILE));
    }
    // Park
    if (world.city.park) {
      ctx.fillStyle = 'rgba(80,180,100,0.5)';
      ctx.fillRect(px(world.city.park.x), py(world.city.park.y), world.city.park.w / (WORLD_W * TILE) * size, world.city.park.h / (WORLD_H * TILE) * size);
    }
    // Police blips
    for (const c of world.cops) {
      ctx.fillStyle = '#ff4040';
      ctx.beginPath();
      ctx.arc(px(c.x), py(c.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cop cars
    for (const c of world.vehicles) {
      if (c.isCop) {
        ctx.fillStyle = '#d02020';
        ctx.beginPath();
        ctx.arc(px(c.x), py(c.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Mission marker
    if (missions.current) {
      const t = missionTarget(missions.current);
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath();
      ctx.arc(px(t.x), py(t.y), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px(world.player.x), py(world.player.y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7ec8ff';
    ctx.stroke();
  }
}