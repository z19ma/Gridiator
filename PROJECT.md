# Gridiator

## Overview
A grid-locked hack-and-slash for the browser, viewed from a cardinal-aligned angled
top-down camera (grid reads as a rectangle, not a rotated diamond — north/W is up on
screen, south/S is down, west/A is left, east/D is right). The character can only occupy
grid cells and always carries a spear. Every `WASD` press is one grid-step attempt *and*
a spear thrust in that direction, gated by a "reload" cooldown between moves; `/` triggers
a boost (its own separate cooldown) that dashes 3 grid cells and kills every enemy in that
line. Enemies spawn endlessly from the grid's edges and path toward the player. Combat is
direction-asymmetric: an enemy in the player's front cell — whether the player walked into
it or it walked into the player — is instant, certain death (no invulnerability window,
run over immediately). An enemy adjacent from the back or a side only costs the player a
life (with a brief invulnerability window). The boost dash is the *only* thing that ever
kills an enemy and the only way to survive a front-on encounter; landing a hit never kills
the attacker, and enemies never kill each other. `ESC` pauses/resumes (freezes the game
clock, enemy AI, and spawning). Score only comes from boost kills; the run ends when either
the player takes a front hit or their 3 (back/side) lives run out.

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
- `src/game/Game.js` — the whole game loop: Three.js scene/camera/renderer setup (with an
  orientation-aware ortho frustum so the grid never gets cropped on narrow phone screens),
  keyboard *and* touch input (swipe/tap/double-tap, feeding the same `_onDirectionInput` /
  `_onBoostInput` entry points keyboard uses), player move/boost resolution, enemy
  spawning, enemy AI (plain greedy step toward the player, no front-cell avoidance since
  front is no longer safe for them), front-cell-vs-back/side combat resolution
  (`_killPlayer` vs `_damagePlayer`), scoring, lives, difficulty ramp over time, HUD
  updates, game state machine (`start` → `playing` → `paused` → `gameover`).

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
- 2026-07-03: Added pause (`ESC`), made walking straight into a front-facing enemy a
  losing clash instead of a free kill (only the boost dash kills head-on), and lengthened
  the move/spear "reload" cooldown from 90ms to 350ms. Pause freezes `elapsed` and the
  enemy AI/spawn accumulators (they're only advanced in the `state === 'playing'` branch
  of the render loop), so nothing progresses while paused. Verified all three with
  Playwright: elapsed stays exactly flat across a paused interval and movement input is
  ignored while paused; walking into a front enemy drops a life, leaves the enemy alive,
  and blocks the player's advance; boosting into the same setup still kills the enemy and
  scores normally.
- 2026-07-03: The 350ms move cooldown from the previous change made movement feel
  sluggish (user feedback: "I hate that... as snappy as possible"). Dropped
  `MOVE_COOLDOWN` to 100ms — enough to prevent an accidental double-fire on one keypress,
  far below anything perceptible as lag. Verified with Playwright that 150ms-spaced
  presses each register a distinct move (they would have mostly been dropped at 350ms).
- 2026-07-03: User pointed out the front-cell rule was only half-fixed — `_stepEnemyAI`
  still let an enemy that walked itself into the player's front cell die for free
  (self-impale via `_resolveAdjacent`), instead of damaging the player, whenever the
  *enemy* (not the player) initiated the contact. Removed that entirely: any adjacency
  now always calls `_damagePlayer()`, with no front-cell special case. Also dropped the
  now-pointless "avoid the front cell" bias from the AI's pathing (front isn't dangerous
  for enemies anymore, so there's no reason for them to dodge it), and removed the
  now-dead `SCORE_NORMAL_KILL` constant and `Player.frontCell()` method — the boost dash
  is the only remaining kill path. Verified with Playwright: an enemy placed directly in
  front of the player with zero player input still damages the player (not itself) on the
  next AI tick and survives; boosting into the same setup still kills it and scores.
- 2026-07-03: User felt front-cell contact resolving as a life-loss-plus-invulnerability-
  flash "reads as a pause" and asked for an actual kill instead. Split combat resolution
  back into two paths: `_killPlayer()` (new) — instant game over, no invulnerability check,
  no mercy — fires whenever an enemy is in the player's front cell, whether the player
  walked into it (`_handleMove`) or it walked into the player (`_stepEnemyAI` via
  `_resolveAdjacent`, reintroduced with a front-cell computed from `player.facing`).
  `_damagePlayer()` (unchanged: costs a life, brief invulnerability) still handles back/side
  adjacency only. Enemy survives either way; the boost dash remains the only kill path.
  Verified 4 scenarios with Playwright: walking into a front enemy → instant game over; an
  enemy walking into the front cell on its own with zero player input → instant game over;
  an enemy adjacent from the side → costs exactly 1 life, game continues; boosting a front
  enemy → enemy dies, player takes no damage, game continues.
- 2026-07-03: Hosted it publicly so it can be shared. GitHub Pages on this account
  requires a paid plan for private repos (`422: Your current plan does not support GitHub
  Pages for this repository`), so with the user's explicit OK the repo was made public
  first (`z19ma/Gridiator` — no secrets in it, just the game). Pages enabled via
  `gh api POST /repos/z19ma/Gridiator/pages` serving from `master` / root. Added
  `.nojekyll` since it's a plain static site with no need for GitHub's Jekyll build step.
  Live at `https://z19ma.github.io/Gridiator/`; redeploys automatically on every push to
  `master`.
- 2026-07-03: Added mobile support (still purely a web page, no native app) - the game
  previously couldn't even start on a phone (no keyboard, so nothing ever fired
  `_startGame()`), and the grid would have clipped on portrait screens since the camera
  frustum only accounted for landscape aspect ratios. Added: a `window` `touchstart`/
  `touchend` handler (`_initTouch`) that detects swipes (→ move/thrust, same direction
  math as WASD), double-taps (→ boost, matches `/`), and single taps (→ start/restart,
  since there's no generic keypress equivalent on touch); an on-screen pause button since
  there's no Escape key (had to fix a CSS stacking bug where the full-screen pause overlay
  - itself `position: fixed`, which always creates its own stacking context - covered the
  button since `#hud` had no explicit `z-index` of its own to lift its whole subtree above
  it); and reworked `_frustumHalfExtents()` to require a real per-axis minimum (X: half the
  grid width, 6.5+margin; Y: less, since the camera's downward pitch foreshortens depth by
  ~cos(pitch) onto the screen's vertical axis, empirically ~0.79 for this camera position)
  and letterbox whichever axis the screen is more restrictive on, instead of naively tying
  both axes to the same constant - this also improved desktop framing (tighter, less dead
  space) as a side effect. Verified with Playwright using a real mobile viewport + touch
  emulation (390x844, `has_touch`/`is_mobile`, synthetic `TouchEvent`/`Touch` dispatch):
  camera frustum extends well past the grid's needed half-extents in both orientations, tap
  starts the game, swipes move in the correct directions, double-tap raises the boost
  cooldown, and the pause button toggles pause/resume both ways (this caught the stacking
  bug - the second tap was unclickable until `#hud`'s z-index was fixed).

## Notes
- Grid is 13x13, player starts centered.
- Tunable balance constants (kill scores, boost cooldown/range, spawn/AI tick intervals,
  difficulty ramp, lives) all live at the top of `src/game/Game.js`.
- No asset pipeline — all meshes are primitive Three.js geometries, no textures/models.
