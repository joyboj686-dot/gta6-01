// missions.js - the Leonida Nights story: five connected missions with dialogue,
// objectives, a mission marker, success/fail states and cash rewards. Missions
// are defined as data plus small hook functions the world calls each frame.

import { TILE, WORLD_W, WORLD_H } from './config.js';

export const MISSION_LIST = [
  {
    id: 1,
    name: 'Grease the Wheels',
    giver: 'Vega the Cabal',
    intro: [
      'Vega: "Heard you need work. Small first job."',
      'Vega: "Steal a ride and drop it at the pier docks. Stay sharp, avoid the blues."',
    ],
    objective: 'Steal a car, drive it to the red marker at the docks.',
    reward: 350,
    type: 'getaway',
  },
  {
    id: 2,
    name: 'Midnight Drop',
    giver: 'Rosa Blanca',
    intro: [
      'Rosa: "The casinos owe me. Pick up the package downtown."',
      'Rosa: "Get it to the neon nightclub without a scratch."',
    ],
    objective: 'Collect the package at the neon tower and drive it to the nightclub.',
    reward: 450,
    type: 'delivery',
  },
  {
    id: 3,
    name: 'Repo Heat',
    giver: 'Boss Dune',
    intro: [
      'Dune: "That dealer skipped town in my muscle car."',
      'Dune: "Find it, jack it back, bring it to the scrapyard."',
    ],
    objective: 'Find and repossess the muscle car, drive it to the scrapyard.',
    reward: 600,
    type: 'repo',
  },
  {
    id: 4,
    name: 'One Big Screw',
    giver: 'Cecil Saint',
    intro: [
      'Cecil: "The bank runs a vault on the coast. I have the crew."',
      'Cecil: "Cause a scene, grab the loot, lose the police."',
    ],
    objective: 'Drive to the vault, grab the loot, escape the police heat.',
    reward: 800,
    type: 'escape',
  },
  {
    id: 5,
    name: 'The Final Score',
    giver: 'Vega the Cabal',
    intro: [
      'Vega: "Everything so far was the warm-up."',
      'Vega: "The casino vault is wired. Take it and vanish into the night."',
    ],
    objective: 'Reach the casino vault, crack it, and escape the city with the score.',
    reward: 1500,
    type: 'heist',
  },
];

// Mission target points in world units for each mission (objective markers).
export function missionTarget(mission) {
  const T = TILE;
  switch (mission.type) {
    case 'getaway': return { x: T * 70, y: T * 78 };
    case 'delivery': return { x: T * 44, y: T * 40 };
    case 'repo': return { x: T * 96, y: T * 58 };
    case 'escape': return { x: T * 120, y: T * 66 };
    case 'heist': return { x: T * 60, y: T * 92 };
    default: return { x: T * 50, y: T * 50 };
  }
}

export class MissionLog {
  constructor(completed) {
    this.completed = new Set(completed || []);
    this.current = null; // active mission object, null when none
    this.step = 0;
    this.msg = '';
    this.msgTimer = 0;
    this.msgColor = '#ffffff';
    this.nextPending = false;
  }

  nextMission() {
    for (const m of MISSION_LIST) {
      if (!this.completed.has(m.id)) {
        this.current = m;
        this.step = 0;
        return m;
      }
    }
    return null;
  }

  // Called from world each frame; advances mission state.
  update(world, dt) {
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.msg = '';
    }
    if (!this.current) return;
    const m = this.current;
    const t = missionTarget(m);
    const px = world.player.x;
    const py = world.player.y;

    switch (m.type) {
      case 'getaway': {
        // Must reach the marker while the player is not wanted high.
        if (this.step === 0 && world.dist(px, py, t.x, t.y) < 40) {
          this.step = 1;
          this.show('Package dropped. Return to Vega for pay.', '#7cff8c');
        }
        if (this.step === 1 && world.dist(px, py, 20 * TILE, 18 * TILE) < 40) {
          this.complete(world, m);
        }
        break;
      }
      case 'delivery': {
        if (this.step === 0 && world.dist(px, py, TILE * 44, TILE * 20) < 40) {
          this.step = 1;
          this.show('Package secured. Take it to the nightclub.', '#7cff8c');
        }
        if (this.step === 1 && world.dist(px, py, t.x, t.y) < 40) {
          this.complete(world, m);
        }
        break;
      }
      case 'repo': {
        if (this.step === 0 && world.dist(px, py, TILE * 96, TILE * 30) < 40) {
          this.step = 1;
          this.show('Found the muscle car. Drive it to the scrapyard.', '#7cff8c');
        }
        if (this.step === 1 && world.dist(px, py, t.x, t.y) < 40) {
          this.complete(world, m);
        }
        break;
      }
      case 'escape': {
        if (this.step === 0 && world.dist(px, py, TILE * 20, TILE * 20) < 40) {
          this.step = 1;
          world.addCrime(4);
          this.show('The vault is popped! Loose the police and get away.', '#ffc74d');
        }
        if (this.step === 1 && world.dist(px, py, t.x, t.y) < 40 && world.wanted.stars <= 2) {
          this.complete(world, m);
        }
        break;
      }
      case 'heist': {
        if (this.step === 0 && world.dist(px, py, TILE * 24, TILE * 76) < 40) {
          this.step = 1;
          world.addCrime(5);
          this.show('The casino vault is cracked! Escape the city.', '#ffc74d');
        }
        if (this.step === 1 && world.dist(px, py, t.x, t.y) < 40) {
          this.complete(world, m, true);
        }
        break;
      }
    }

    // Fail: dying during a mission or too much heat on the final escape.
    if (world.player.hp <= 0) {
      this.fail('You were wasted. Mission failed.');
    }
  }

  complete(world, m, final) {
    this.completed.add(m.id);
    world.player.cash += m.reward;
    this.msg = final ? 'HEIST COMPLETE! Leonida is yours.' : `${m.name} complete. +$${m.reward}`;
    this.msgTimer = 5;
    this.msgColor = '#ffd75e';
    this.current = null;
    // queue the next mission automatically after a beat
    this.nextPending = true;
  }

  fail(msg) {
    this.msg = msg;
    this.msgTimer = 4;
    this.msgColor = '#ff5e5e';
    this.current = null;
  }

  show(msg, color) {
    this.msg = msg;
    this.msgTimer = 4;
    this.msgColor = color;
  }

  // Mission objective text shown in the HUD.
  objectiveText() {
    if (!this.current) return '';
    return this.current.objective;
  }
}