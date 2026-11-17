// config.js - global constants and tuning for Leonida Nights.
// The world is laid out on a grid: city blocks in tiles, roads between them.

export const TILE = 22;          // world units per tile (also road width)
export const WORLD_W = 156;      // tiles wide
export const WORLD_H = 132;      // tiles tall
export const BLOCK = 34;         // number of tiles across a city block
export const BEACH_W = 6;        // beach columns at the east edge

export const WORLD_PX_W = WORLD_W * TILE;
export const WORLD_PX_H = WORLD_H * TILE;

// Player
export const PLAYER_SPEED = 5.0;   // walk units/sec
export const PLAYER_SPRINT = 8.2;  // sprint units/sec
export const PLAYER_RADIUS = 10;
export const START_CASH = 1200;
export const START_HP = 100;
export const START_ARMOR = 0;

// Vehicles
export const CAR_MAX_SPEED = 13.5;  // forward units/sec
export const CAR_REVERSE = 5.5;
export const CAR_ACCEL = 16;
export const CAR_BRAKE = 26;
export const CAR_TURN = 3.1;        // rad/sec steering authority
export const CAR_LENGTH = 34;
export const CAR_WIDTH = 16;
export const COP_MAX_SPEED = 14.5;
export const PED_CAR_MAX = 7.5;

// Wanted system
export const WANTED_MAX = 5;
export const CRIME_STEAL = 2;
export const CRIME_PED_HIT = 1;
export const CRIME_SHOOT = 2;
export const CRIME_COP_KILL = 3;
export const CRIME_SPEEDING = 1; // speeding near peds raises heat
export const WANTED_FADE = 0.06;   // star strength lost per sec while unseen

export const DAY_CYCLE = 120;      // seconds for a full day/night cycle