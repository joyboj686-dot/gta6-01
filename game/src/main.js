// main.js - boot and the one game loop for Leonida Nights. Reads input each
// frame, advances the world in fixed time steps, paints it, and moves between
// the screens: title, play, paused and game over. Also stages the ?shot= scenes
// for screenshots and wires the save (localStorage) to Continue.

import { Input } from './input.js';
import { Renderer } from './render.js';
import { HUD } from './minimap.js';
import { Audio } from './audio.js';
import { World } from './world.js';
import { MissionLog } from './missions.js';
import { Rng } from './random.js';
import { shotQuery, stageWorld } from './shots.js';
import { loadSave, saveGame, clearSave, hasSave } from './save.js';
import { TILE, WORLD_W, WORLD_H } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const renderer = new Renderer(canvas, ctx);
const hud = new HUD(renderer);
const audio = new Audio();

const shot = shotQuery();
let mode = shot.shot || 'title'; // title | play | paused | gameover | shot
let world = null;
let missions = null;
let last = performance.now();
let shakeTimer = 0;
let overTimer = 0;
let frames = 0;
let startKeysHandled = false;

const INTRO = 'Leonida Nights. The city is yours to take. Meet Vega to start the jobs.';

function newGame() {
  const seed = (Date.now() & 0x7fffffff);
  const rng = new Rng(seed);
  world = new World(rng, seed);
  missions = new MissionLog([]);
  missions.nextMission();
  missions.show(INTRO, '#9fd6ff');
  audio.ensure();
  audio.startMusic();
}

function continueGame() {
  const s = loadSave();
  const seed = (s && s.seed) || (Date.now() & 0x7fffffff);
  const rng = new Rng(seed);
  world = new World(rng, seed);
  if (s) {
    world.player.cash = s.cash;
    world.player.hp = s.hp;
    world.player.armor = s.armor;
    world.player.ammo = s.ammo;
    if (s.time != null) world.timeOfDay = s.time;
  }
  missions = new MissionLog(s ? s.missionsDone : []);
  missions.nextMission();
  audio.ensure();
  audio.startMusic();
}

function buildShotWorld() {
  const staged = stageWorld(shot.shot, shot.seed);
  world = staged.world;
  missions = staged.missions;
}

if (shot.shot === 'play' || shot.shot === 'end') {
  buildShotWorld();
  mode = shot.shot;
} else if (shot.shot === 'start') {
  buildShotWorld();
  mode = 'shot';
} else {
  newGame();
  mode = 'title';
}

// Called once to start a fresh run from the title/gameover screens.
function startRun() {
  newGame();
  mode = 'play';
}

function reset() {
  clearSave();
  startRun();
}

function togglePause() {
  if (mode === 'play') {
    mode = 'paused';
  } else if (mode === 'paused') {
    mode = 'play';
  }
}

function attemptEnterExit() {
  const p = world.player;
  if (p.inCar) {
    world.exitCar();
    audio.blip(400, 0.12, 'square', 0.2, 200);
  } else {
    if (world.tryEnterCar()) {
      audio.blip(300, 0.15, 'square', 0.25, 250);
    }
  }
}

function doAttack() {
  const p = world.player;
  if (p.inCar) return;
  if (input.down('shift')) {
    // punch
    const r = world.punch();
    audio.blip(120, 0.1, 'square', 0.3, -60);
    if (r && r.hitPed) {
      shakeTimer = 0.25;
      renderer.addShake(3);
    }
  } else {
    const r = world.shoot();
    if (r) {
      audio.noise(0.15, 0.3, 900);
      audio.blip(220, 0.08, 'sawtooth', 0.2, -120);
      shakeTimer = 0.2;
      renderer.addShake(4);
    }
  }
}

function updateMouseAim() {
  const p = world.player;
  if (p.inCar) return;
  // Aim at the mouse cursor in world coords.
  const wx = renderer.camX + input.mouse.x;
  const wy = renderer.camY + input.mouse.y;
  p.aim = Math.atan2(wy - p.y, wx - p.x);
  p.heading = p.aim;
}

function frame(dt) {
  if (mode === 'play') {
    world.update(dt, input);
    missions.update(world, dt);
    updateMouseAim();
    handleFrameInput();
  }
  renderer.follow(world.player.x, world.player.y);
  renderer.draw(world, dt);
  if (mode === 'play') {
    hud.draw(world, missions);
  } else if (mode === 'paused') {
    hud.draw(world, missions);
    drawPause();
  } else if (mode === 'gameover') {
    drawGameOver();
  } else if (mode === 'shot') {
    hud.draw(world, missions);
  }
  if (world.player.hp <= 0 && mode === 'play') {
    mode = 'gameover';
    overTimer = 0;
    audio.stopMusic();
  }
  if (mode === 'play') {
    // auto-save every ~3 seconds
    frames++;
    if (frames % 180 === 0) saveGame(world);
  }
}

function handleFrameInput() {
  const p = world.player;
  // pause
  if (input.once('escape') || input.once('p')) {
    togglePause();
    input.consumePressed();
    return;
  }
  // enter / exit car
  if (input.once('e')) {
    attemptEnterExit();
    input.consumePressed();
    return;
  }
  // attack / shoot (mouse click or space)
  if (input.once(' ') || input.mouse.clicked) {
    doAttack();
    input.consumePressed();
    input.mouse.clicked = false;
    return;
  }
  // toggle minimap with M
  if (input.once('m')) {
    hud.showMinimap = !hud.showMinimap;
    input.consumePressed();
    return;
  }
  input.consumePressed();
}

function drawPause() {
  ctx.fillStyle = 'rgba(6,8,16,0.78)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = '34px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', canvas.clientWidth / 2, canvas.clientHeight / 2 - 30);
  ctx.font = '15px system-ui';
  ctx.fillStyle = '#cfd8ff';
  ctx.fillText(
    'P/Esc to resume   |   WASD drive/move   |   E enter/exit car   |   Shift sprint/punch   |   Click shoot   |   M minimap   |   R restart',
    canvas.clientWidth / 2, canvas.clientHeight / 2 + 16);
}

function drawGameOver() {
  overTimer += 1 / 60;
  ctx.fillStyle = 'rgba(30,0,0,0.8)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#ff5e5e';
  ctx.font = '44px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WASTED', canvas.clientWidth / 2, canvas.clientHeight / 2 - 50);
  ctx.fillStyle = '#cfd8ff';
  ctx.font = '16px system-ui';
  ctx.fillText('Press R to start again, P to pause', canvas.clientWidth / 2, canvas.clientHeight / 2 + 6);
  if (overTimer > 0.6 && input.once('r')) {
    reset();
  }
}

function drawTitle() {
  // a quiet city scene behind the title
  renderer.follow(world.player.x, world.player.y);
  renderer.draw(world, 0);
  ctx.fillStyle = 'rgba(6,8,16,0.72)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 52px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA', canvas.clientWidth / 2, canvas.clientHeight / 2 - 110);
  ctx.fillStyle = '#7ec8ff';
  ctx.fillText('NIGHTS', canvas.clientWidth / 2, canvas.clientHeight / 2 - 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px system-ui';
  ctx.fillText('An open-world crime game', canvas.clientWidth / 2, canvas.clientHeight / 2 + 10);

  const hasS = hasSave();
  ctx.font = '20px system-ui';
  ctx.fillStyle = '#9fd6ff';
  ctx.fillText('NEW GAME - press Enter', canvas.clientWidth / 2, canvas.clientHeight / 2 + 60);
  if (hasS) ctx.fillText('CONTINUE - press C', canvas.clientWidth / 2, canvas.clientHeight / 2 + 92);

  ctx.font = '13px system-ui';
  ctx.fillStyle = '#9aa4c4';
  const lines = [
    'WASD / Arrows: move   |   Mouse: aim   |   Space / Click: attack',
    'Shift: sprint / punch   |   E: enter / exit car   |   M: minimap   |   P / Esc: pause',
    'Steal cars, outrun the police, complete missions, build your reputation.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, canvas.clientWidth / 2, canvas.clientHeight - 110 + i * 20));

  if (startKeysHandled) return;
  if (input.once('enter')) {
    startKeysHandled = true;
    startRun();
  } else if (hasS && input.once('c')) {
    startKeysHandled = true;
    continueGame();
    mode = 'play';
  }
}

// The fixed-step game loop.
function loop(t) {
  let dt = (t - last) / 1000;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  last = t;

  if (mode === 'shot' || mode === 'start' || mode === 'end') {
    // Screenshot scenes: run a few frames for a lively frozen state, then hold.
    if (frames < 30) {
      world.update(dt, input);
      missions.update(world, dt);
    }
    frames++;
    renderer.follow(world.player.x, world.player.y);
    renderer.draw(world, dt);
    if (mode === 'start') {
      drawTitleOverlay(shot);
    } else {
      hud.draw(world, missions);
      if (mode === 'end') drawEndOverlay();
    }
  } else {
    // normal gameplay screens
    if (mode === 'title') {
      drawTitle();
    } else {
      frame(dt);
    }
  }

  requestAnimationFrame(loop);
}

function drawTitleOverlay() {
  ctx.fillStyle = 'rgba(6,8,16,0.72)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 52px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA', canvas.clientWidth / 2, canvas.clientHeight / 2 - 110);
  ctx.fillStyle = '#7ec8ff';
  ctx.fillText('NIGHTS', canvas.clientWidth / 2, canvas.clientHeight / 2 - 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px system-ui';
  ctx.fillText('An open-world crime game', canvas.clientWidth / 2, canvas.clientHeight / 2 + 10);
  ctx.font = '13px system-ui';
  ctx.fillStyle = '#9aa4c4';
  ctx.fillText('WASD move   Mouse aim   Space/Click attack   Shift sprint   E enter/exit car   M minimap   P pause',
    canvas.clientWidth / 2, canvas.clientHeight - 80);
}

function drawEndOverlay() {
  ctx.fillStyle = 'rgba(8,10,18,0.62)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 40px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALL HEISTS COMPLETE', canvas.clientWidth / 2, canvas.clientHeight / 2 - 30);
  ctx.fillStyle = '#7ec8ff';
  ctx.font = '20px system-ui';
  ctx.fillText('You own the night. - LEONIDA NIGHTS', canvas.clientWidth / 2, canvas.clientHeight / 2 + 20);
}

window.addEventListener('resize', () => renderer.resize());
renderer.resize();

// Kick off the loop.
requestAnimationFrame((t) => {
  last = t;
  requestAnimationFrame(loop);
});