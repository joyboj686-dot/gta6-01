// world.js - the Leonida Nights simulation. Owns the player, all cars and
// pedestrians, the police/wanted system, combat and the day/night clock.
// It is a pure state machine over the city from city.js; rendering is separate.

import { City } from './city.js';
import { Vehicle } from './vehicle.js';
import {
  TILE, WORLD_W, WORLD_H, PLAYER_SPEED, PLAYER_SPRINT, COP_MAX_SPEED, CAR_MAX_SPEED,
  DAY_CYCLE, WANTED_MAX, WANTED_FADE, CRIME_STEAL, CRIME_SHOOT, CRIME_PED_HIT, CRIME_COP_KILL,
} from './config.js';

export const CAR_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400'];

export class World {
  constructor(rng, seed) {
    this.rng = rng;
    this.seed = seed;
    this.city = new City(rng);
    this.player = {
      x: 0, y: 0, heading: -Math.PI / 2, hp: 100, armor: 0, cash: 1200,
      ammo: 24, inCar: false, car: null, punchCd: 0, shootCd: 0, aim: 0, moving: false,
    };
    this.vehicles = [];
    this.peds = [];
    this.cops = [];
    this.particles = [];
    this.wanted = { stars: 0, heat: 0, seen: 0 };
    this.timeOfDay = 600;
    this.day = 0;
    this.spawnInitial(rng);
  }

  spawnInitial(rng) {
    this.player.x = TILE * 40;
    this.player.y = TILE * 20;
    this.player.heading = 0;
    for (let i = 0; i < 26; i++) this.spawnCar(rng, false);
    for (let i = 0; i < 20; i++) this.spawnPed(rng);
  }

  dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  randomRoadPoint(rng) {
    const road = this.city.roads[Math.floor(rng.next() * this.city.roads.length)];
    const base = road.t * TILE + TILE / 2;
    const offset = (rng.chance(0.5) ? 1 : -1) * 8;
    if (road.axis === 'h') {
      return { x: rng.range(0, WORLD_W * TILE), y: base + offset, heading: offset > 0 ? 0 : Math.PI };
    }
    return { x: base + offset, y: rng.range(0, WORLD_H * TILE), heading: offset > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  spawnCar(rng, isCop) {
    const p = this.randomRoadPoint(rng);
    const c = new Vehicle({
      x: p.x, y: p.y, heading: p.heading, speed: rng.range(1, 5),
      maxSpeed: isCop ? COP_MAX_SPEED : rng.range(8, CAR_MAX_SPEED),
      color: isCop ? '#0b2a66' : rng.pick(CAR_COLORS), isCop,
    });
    this.vehicles.push(c);
  }

  spawnPed(rng) {
    const x = rng.range(0, WORLD_W * TILE);
    const y = rng.range(0, WORLD_H * TILE);
    this.peds.push({
      x, y, heading: rng.range(0, Math.PI * 2), speed: rng.range(0.4, 1.4),
      hp: 100, walk: 0, timer: rng.range(1, 6),
    });
  }

  update(dt, input) {
    this.updateClock(dt);
    this.updatePlayer(dt, input);
    this.updatePeds(dt);
    this.updateTraffic(dt);
    this.updateCops(dt);
    this.updateWanted(dt);
    this.ensureCopCars();
    this.updateParticles(dt);
    this.cleanup();
  }

  updateClock(dt) {
    this.timeOfDay += dt * 6;
    if (this.timeOfDay >= DAY_CYCLE * 60) {
      this.timeOfDay -= DAY_CYCLE * 60;
      this.day++;
    }
  }

  updatePlayer(dt, input) {
    if (this.player.inCar) this.updateDriving(dt, input);
    else this.updateOnFoot(dt, input);
  }

  updateDriving(dt, input) {
    const car = this.player.car;
    let throttle = 0;
    let steer = 0;
    if (input.down('w', 'arrowup')) throttle += 1;
    if (input.down('s', 'arrowdown')) throttle -= 1;
    if (input.down('a', 'arrowleft')) steer += 1;
    if (input.down('d', 'arrowright')) steer -= 1;
    if (input.down('shift')) throttle *= 0.5;
    car.drive(throttle, steer, dt);
    this.collideCarWorld(car);
    this.player.x = car.x;
    this.player.y = car.y;
  }

  updateOnFoot(dt, input) {
    const p = this.player;
    let mx = 0;
    let my = 0;
    if (input.down('w', 'arrowup')) my -= 1;
    if (input.down('s', 'arrowdown')) my += 1;
    if (input.down('a', 'arrowleft')) mx -= 1;
    if (input.down('d', 'arrowright')) mx += 1;
    const len = Math.hypot(mx, my);
    let speed = PLAYER_SPEED;
    if (input.down('shift')) speed = PLAYER_SPRINT;
    if (len > 0) {
      p.heading = Math.atan2(my, mx);
      p.x += (mx / len) * speed * dt;
      p.y += (my / len) * speed * dt;
      p.moving = true;
      if (this.rng.chance(0.4)) this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, max: 0.6, type: 'dust' });
    } else {
      p.moving = false;
    }
    this.clampPlayer(p);
  }

  clampPlayer(p) {
    const m = 16;
    p.x = Math.max(m, Math.min(WORLD_W * TILE - m, p.x));
    p.y = Math.max(m, Math.min(WORLD_H * TILE - m, p.y));
  }

  updatePeds(dt) {
    for (const pd of this.peds) {
      pd.timer -= dt;
      if (pd.timer <= 0) {
        pd.heading = this.rng.range(0, Math.PI * 2);
        pd.timer = this.rng.range(2, 6);
      }
      pd.x += Math.cos(pd.heading) * pd.speed * dt;
      pd.y += Math.sin(pd.heading) * pd.speed * dt;
      pd.walk += dt;
      if (pd.x < 8) pd.x = 8;
      if (pd.x > WORLD_W * TILE - 8) pd.x = WORLD_W * TILE - 8;
      if (pd.y < 8) pd.y = 8;
      if (pd.y > WORLD_H * TILE - 8) pd.y = WORLD_H * TILE - 8;
    }
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  // --- Traffic: AI cars follow their heading, braking before a building/wall.
  updateTraffic(dt) {
    for (const c of this.vehicles) {
      if (c.isCop) continue; // cops handled in updateCops
      if (c.driven) continue;
      // Keep in lane: mostly keep heading, occasionally slow at intersections.
      if (this.buildingAhead(c, 46)) {
        c.brakeForce(dt);
      } else {
        c.drive(1, this.rng.chance(0.003) ? this.rng.range(-1, 1) : 0, dt);
      }
      this.collideCarWorld(c);
    }
  }

  // True if a car would hit a building shortly ahead of it.
  buildingAhead(car, dist) {
    const fx = car.x + Math.cos(car.heading) * dist;
    const fy = car.y + Math.sin(car.heading) * dist;
    return this.hitBuilding(fx, fy) || this.atEdge(fx, fy);
  }

  atEdge(x, y) {
    return x < 20 || x > WORLD_W * TILE - 20 || y < 20 || y > WORLD_H * TILE - 20;
  }

  hitBuilding(x, y) {
    for (const b of this.city.buildings) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
    }
    return false;
  }

  // Push a car out of any building rect it overlaps (simple axis-aligned).
  collideCarWorld(car) {
    for (const b of this.city.buildings) {
      const cx = car.x;
      const cy = car.y;
      if (cx > b.x - 8 && cx < b.x + b.w + 8 && cy > b.y - 8 && cy < b.y + b.h + 8) {
        // Move to nearest face of the building rect.
        const left = Math.abs(cx - (b.x - 8));
        const right = Math.abs(cx - (b.x + b.w + 8));
        const top = Math.abs(cy - (b.y - 8));
        const bottom = Math.abs(cy - (b.y + b.h + 8));
        const m = Math.min(left, right, top, bottom);
        if (m === left) car.x = b.x - 8;
        else if (m === right) car.x = b.x + b.w + 8;
        else if (m === top) car.y = b.y - 8;
        else car.y = b.y + b.h + 8;
        car.speed *= 0.4;
      }
    }
  }

  // --- Wanted & police ---
  addCrime(amount) {
    this.wanted.heat = Math.min(99, this.wanted.heat + amount);
    this.refreshStars();
  }

  refreshStars() {
    this.wanted.stars = Math.min(WANTED_MAX, Math.floor(this.wanted.heat / 20) + 1);
  }

  updateWanted(dt) {
    // Cops near the player keep them "seen"; else heat slowly fades.
    const anyCopNear = this.cops.some((c) => this.dist(c.x, c.y, this.player.x, this.player.y) < 120);
    if (this.wanted.stars > 0) {
      if (anyCopNear) {
        this.wanted.seen += dt;
      } else {
        this.wanted.heat = Math.max(0, this.wanted.heat - WANTED_FADE * dt);
        this.refreshStars();
      }
    }
  }

  updateCops(dt) {
    // Spawn a cop when wanted rises.
    if (this.wanted.stars > 0 && this.cops.length < this.wanted.stars + 1 && this.rng.chance(0.01)) {
      this.spawnCop();
    }
    for (const c of this.cops) {
      const a = Math.atan2(this.player.y - c.y, this.player.x - c.x);
      const wantPunch = this.dist(c.x, c.y, this.player.x, this.player.y) < 14;
      c.x += Math.cos(a) * (c.speed || 0) * dt;
      c.y += Math.sin(a) * (c.speed || 0) * dt;
      c.heading = a;
      if (wantPunch) this.hitPlayerOnFoot(2);
    }
    this.cops = this.cops.filter((c) => c.alive !== false);
    this.driveCopCars(dt);
  }

  // Police cars steer toward and try to ram the player.
  driveCopCars(dt) {
    for (const c of this.vehicles) {
      if (!c.isCop || c.driven) continue;
      const a = Math.atan2(this.player.y - c.y, this.player.x - c.x);
      let diff = a - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.5));
      const throttle = this.buildingAhead(c, 40) ? 0 : 1;
      c.drive(throttle, steer, dt);
      this.collideCarWorld(c);
      // Ram: if very close to the player, bump them on foot.
      if (this.dist(c.x, c.y, this.player.x, this.player.y) < 22) {
        if (!this.player.inCar) this.hitPlayerOnFoot(6);
      }
    }
  }

  spawnCop() {
    const ang = this.rng.range(0, Math.PI * 2);
    const x = this.player.x + Math.cos(ang) * 60;
    const y = this.player.y + Math.sin(ang) * 60;
    this.cops.push({ x, y, heading: ang, speed: 3, hp: 100, alive: true });
  }

  // Cop melee damages the player (armor absorbs first).
  hitPlayerOnFoot(dmg) {
    if (this.player.armor > 0) {
      const take = Math.min(this.player.armor, dmg);
      this.player.armor -= take;
      dmg -= take;
    }
    this.player.hp -= dmg;
    if (this.player.hp <= 0) this.player.hp = 0;
  }

  // Damage any cop near a point; returns true if something was hit.
  damageCopsAt(x, y, dmg) {
    let hit = false;
    for (const c of this.cops) {
      if (this.dist(c.x, c.y, x, y) < 26) {
        c.hp -= dmg;
        c.alive = c.hp > 0;
        hit = true;
      }
    }
    return hit;
  }

  // --- Combat: on-foot punch and pistol ---
  punch() {
    const p = this.player;
    if (p.punchCd > 0) return;
    p.punchCd = 0.45;
    const tx = p.x + Math.cos(p.heading) * 20;
    const ty = p.y + Math.sin(p.heading) * 20;
    let hitPed = false;
    for (const pd of this.peds) {
      if (this.dist(pd.x, pd.y, tx, ty) < 22) {
        pd.hp -= 12;
        hitPed = true;
      }
    }
    const hitCop = this.damageCopsAt(tx, ty, 10);
    if (hitCop) this.addCrime(CRIME_COP_KILL);
    if (hitPed) this.addCrime(CRIME_PED_HIT);
    return { hitPed, hitCop };
  }

  shoot() {
    const p = this.player;
    if (p.shootCd > 0 || p.ammo <= 0) return null;
    p.shootCd = 0.35;
    p.ammo -= 1;
    const tx = p.x + Math.cos(p.heading) * 1000;
    const ty = p.y + Math.sin(p.heading) * 1000;
    let hitCop = this.damageCopsAt(tx, ty, 34);
    let hitPed = false;
    for (const pd of this.peds) {
      // check if the shot line is near the ped
      if (this.distToSegment(p.x, p.y, tx, ty, pd.x, pd.y) < 16) {
        pd.hp -= 40;
        hitPed = true;
      }
    }
    this.addCrime(hitCop ? CRIME_COP_KILL : CRIME_SHOOT);
    if (hitPed) this.addCrime(CRIME_PED_HIT);
    this.cops = this.cops.filter((c) => c.alive !== false);
    this.peds = this.peds.filter((pd) => pd.hp > 0);
    return { hitPed, hitCop };
  }

  // Distance from point (px,py) to segment (ax,ay)-(bx,by).
  distToSegment(ax, ay, bx, by, px, py) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const len2 = abx * abx + aby * aby || 1;
    let t = (apx * abx + apy * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return this.dist(px, py, cx, cy);
  }

  // --- Car stealing ---
  // Enter the nearest parked/stopped car if the player is close and on foot.
  tryEnterCar() {
    const p = this.player;
    if (p.inCar) return false;
    let best = null;
    let bestD = 30;
    for (const c of this.vehicles) {
      const d = this.dist(c.x, c.y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best || best.driven) return false;
    best.driven = true;
    p.inCar = true;
    p.car = best;
    p.hp = Math.max(1, p.hp); // safe
    this.addCrime(CRIME_STEAL);
    return true;
  }

  exitCar() {
    const p = this.player;
    if (!p.inCar || !p.car) return;
    p.car.driven = false;
    // Place the player just beside the car.
    p.x = p.car.x + Math.cos(p.car.heading + Math.PI / 2) * 18;
    p.y = p.car.y + Math.sin(p.car.heading + Math.PI / 2) * 18;
    p.car = null;
    p.inCar = false;
    this.clampPlayer(p);
  }

  // A passing cop car could spawn once wanted is high.
  ensureCopCars() {
    const copCars = this.vehicles.filter((c) => c.isCop && !c.driven).length;
    if (this.wanted.stars >= 3 && copCars < this.wanted.stars - 1) {
      this.spawnCar(this.rng, true);
    }
  }

  cleanup() {
    this.vehicles = this.vehicles.filter((c) => c.x > -200 && c.x < WORLD_W * TILE + 200 && c.y > -200 && c.y < WORLD_H * TILE + 200);
  }
}