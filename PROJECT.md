# Gridiator

## Overview
A grid-locked hack-and-slash for the browser, viewed from a cardinal-aligned angled
top-down camera (grid reads as a rectangle, not a rotated diamond — north/W is up on
screen, south/S is down, west/A is left, east/D is right). The character can only occupy
grid cells and always carries a spear. Every `WASD` press is one grid-step *and* a spear
thrust in that direction; `/` triggers a boost that dashes 3 grid cells and kills every
enemy in that line. Enemies spawn endlessly from the grid's edges and path toward the
player, but they can only land a hit from the player's back or sides — if they end up
directly in front of the spear instead, they die on it. Landing a hit does not kill the
attacking enemy; the only thing that ever removes an enemy from the board is the player's
spear (walking thrust, boost, or self-impale on the front cell) — enemies never kill each
other. Score increases per kill; the run ends when the player's 3 lives run out.

## Stack
- Vanilla JS ES modules, Three.js loaded via CDN import map (`unpkg`) — **no build step,
  no Node/npm dependency**, since this dev machine doesn't have Node installed.
- Serve locally with `python -m http.server` (see `README.md`) since browsers block ES
  module imports over `file://`.

## Architecture
- `index.html` / `style.css` — canvas + DOM HUD (score, lives, boost cooldown bar, start
  and game-over overlays).
- `src/main.js` — wires DOM HUD refs to `Game`.
- `src/game/Grid.js` — grid size/cell math, the 4 facing directions (N/S/E/W → yaw +
  step vector), WASD → direction mapping.
- `src/game/Player.js` — player mesh (low-poly box body/head + spear, flat-shaded for
  sharp edges), thrust animation, facing rotation, hit-invulnerability blink.
- `src/game/Enemy.js` — enemy mesh (same sharp-edged box style), movement tweening,
  death (shrink) animation.
- `src/game/Game.js` — the whole game loop: Three.js scene/camera/renderer setup, input
  handling, player move/boost resolution, enemy spawning, enemy AI (greedy step toward
  player that avoids the player's front cell when possible), combat resolution, scoring,
  lives, difficulty ramp over time, HUD updates, game state machine
  (`start` → `playing` → `gameover`).

## Status
- 2026-07-03: Repo initialized (empty).
- 2026-07-03: First playable version built and verified. Verified end-to-end with a
  Playwright-driven headless Edge session (no chromium-cli/Node in this environment, so
  installed `pip install playwright` + used the system Edge via `channel="msedge"`):
  scene renders, WASD moves/thrusts, enemies spawn and path in, side/back hits reduce
  lives, front-cell kills score points, boost cooldown bar animates, game-over triggers
  at 0 lives. No console errors besides a harmless missing-favicon 404 (now fixed).
  Pushed to `https://github.com/z19ma/Gridiator` (private).
- 2026-07-03: Follow-up fixes from playtesting feedback: (1) camera moved from a true
  isometric diagonal (diamond-looking grid) to sitting on the Z/Y axes only, so the grid
  reads as an axis-aligned rectangle matching WASD directions; (2) removed the
  attacking-enemy self-destruct so a landed hit no longer removes the enemy — only the
  player's spear can ever remove an enemy, guaranteeing enemies never eliminate each
  other; (3) swapped capsule/sphere/cylinder meshes for box/pyramid geometry with
  flat shading for a sharp-edged, low-poly look. Re-verified with the same Playwright/
  Edge harness — no console errors, grid/camera/mesh changes confirmed visually via
  screenshot.
- 2026-07-03: Fixed a restart bug — after dying, the character couldn't move again.
  `_startGame()` reset `elapsed` back to 0 but never reset `lastMoveTime`, and move
  input is gated by `elapsed - lastMoveTime < MOVE_COOLDOWN`; since `lastMoveTime` still
  held the old run's (larger) timestamp, that comparison stayed negative until the new
  run's `elapsed` climbed back past it — effectively freezing movement for as long as
  the previous run had lasted. Now `_startGame()` also resets `lastMoveTime = -999`.
  Verified via a Playwright script that force-triggers game over after simulating a
  90s run, restarts, and confirms the very next keypress moves the player.

## Notes
- Grid is 13x13, player starts centered.
- Tunable balance constants (kill scores, boost cooldown/range, spawn/AI tick intervals,
  difficulty ramp, lives) all live at the top of `src/game/Game.js`.
- No asset pipeline — all meshes are primitive Three.js geometries, no textures/models.
