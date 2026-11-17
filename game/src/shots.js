// shots.js - deterministic screenshot staging. The URL may carry
// ?shot=start|play|end&seed=1. Each stage builds a fixed, attractive scene in
// the real world (not a mock), so the same seed always renders the same frame.
// main.js reads this and drives the game accordingly; shot-mode also paints a
// HUD and minimap so the screenshots show the actual game systems.

import { Rng } from './random.js';
import { World } from './world.js';
import { MissionLog, MISSION_LIST } from './missions.js';
import { TILE, WORLD_W } from './config.js';

// Parse ?shot= and ?seed= from the URL.
export function shotQuery() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const seed = q.get('seed') ? Number(q.get('seed')) : 1;
  return { shot, seed };
}

// Build a world staged for the requested shot.
export function stageWorld(shot, seed) {
  const rng = new Rng(seed);
  const world = new World(rng, seed);
  const missions = new MissionLog([]);

  if (shot === 'play') {
    // Mid-action: player on foot near downtown, some wanted heat, traffic.
    world.player.x = TILE * 40;
    world.player.y = TILE * 24;
    world.player.heading = -Math.PI / 2;
    world.player.cash = 3400;
    world.player.hp = 76;
    world.player.armor = 45;
    world.player.ammo = 11;
    // A couple of cops near and a wanted level of 2.
    world.addCrime(40);
    world.refreshStars();
    world.spawnCop();
    world.spawnCop();
    world.cops[0].x = world.player.x + 60;
    world.cops[0].y = world.player.y;
    world.cops[1].x = world.player.x;
    world.cops[1].y = world.player.y - 60;
    world.timeOfDay = 20 * 60 + 15; // 20:15, night
  } else if (shot === 'end') {
    // Mission-complete scene: heist done, cash paid, no active wanted.
    for (const m of MISSION_LIST) missions.completed.add(m.id);
    world.player.cash = 12000;
    world.player.hp = 60;
    world.player.armor = 30;
    // Park the player on the beachfront at golden hour so the sea and sky glow.
    world.player.x = (WORLD_W - 14) * TILE;
    world.player.y = 10 * TILE;
    world.player.heading = -Math.PI / 2;
    world.timeOfDay = 18 * 60 + 40; // golden-hour sunset
    missions.show('All heists complete. LEONIDA NIGHTS', '#ffd75e');
  } else {
    // start: title screen is drawn by main.js over a sun-soaked midday city.
    world.timeOfDay = 11 * 60;
  }

  return { world, missions };
}