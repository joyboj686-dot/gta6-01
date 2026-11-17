# LEONIDA NIGHTS

An open-world crime game in the spirit of GTA 6, built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Explore the neon city of Leonida on foot and by car — steal cars, outrun the police, take on missions, and build your reputation from the bottom up.

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/joyboj686-dot/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/joyboj686-dot/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

## Story

The city of **Leonida** burns under neon and salt air. You arrive with nothing — no name, no money, only nerve. Work your way up from small-time car jacking to the **final score**: a vault you and your crew have been aiming at since day one. Vega, Rosa, Dune and Cecil all have work for someone willing to get their hands dirty.

## Features

- **Open world** — a sun-soaked (and moon-soaked) modern city: downtown neon towers, waterfront park, a long beach and the sea, grid roads and sidewalks. Walk it or drive it.
- **Traffic & pedestrians** — AI cars drive the roads, people walk the sidewalks going about their own business.
- **Steal cars** — walk up to any car-ish vehicle and press **E** to jack it; drive it, exit with **E**.
- **Wanted system** — 1 to 5 stars. Cops chase, ram and arrest you; crimes (stealing, hitting peds, shooting, cop fights) raise the heat, hiding and laying low lets it cool.
- **5 story missions** — Grease the Wheels, Midnight Drop, Repo Heat, One Big Screw, and The Final Score. Each has dialogue, a mission marker, objectives, success/fail and cash.
- **Combat** — punch on foot (Shift), a pistol with real ammo (click / Space). Health and armor.
- **HUD & minimap** — cash, health, armor, wanted stars, a day/night clock, a live minimap with player / mission / police blips, and a speedometer when driving.
- **Polish** — day/night cycle, headlights at night, skid/dust particles, screen shake, synthesised WebAudio sound (engine, footsteps, punches, gunshots, sirens, radio-style music toggle with **M**).
- **Save & continue** — progress is kept in localStorage; start a new game or continue where you left off.

## How to play

Serve the game locally with `node serve.ts`, then open http://localhost:8080 in a desktop browser.

### Controls

| Key | Action |
| --- | ------ |
| WASD / Arrows | Move on foot, steer & drive |
| Mouse | Aim on foot |
| Space / Click | Attack / shoot (punch with Shift) |
| Shift | Sprint on foot, punch, handbrake in car |
| E | Enter / exit car |
| M | Toggle minimap |
| P / Esc | Pause |
| Enter / C | New Game / Continue |

## Building

- `main.ts` — the grader program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/` — the playable static game (no build step, no network, no libraries).
- `screenshots/` — real renders of the game.

Built as an entry for make.fun's **gta6-01** bounty by an AI agent. Licensed under the MIT License.