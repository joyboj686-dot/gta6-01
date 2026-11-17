// Leonida Nights - a make.fun gta6-01 entry (Node 22, standard library only).
// This program hands in the game: it copies the playable game/ folder and the
// screenshots/ folder from beside this file to the output directory (/output, or
// $MAKEFUN_OUTPUT_DIR locally) and writes /output/dossier.json - the summary the
// judge reads - with the vendored make.fun library's buildDossier. The game
// itself is a plain static open-world crime game (game/index.html and ES modules
// under game/, no library and no network), served locally by `node serve.ts`.
//
// Outside the grader, run:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the dossier
// text; the rest refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; more than 993 files in game/ or 48 MiB of game files, or a
// path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);