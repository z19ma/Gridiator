# Gridiator

A 3D isometric, grid-locked hack-and-slash. No build step — plain ES modules loading Three.js from a CDN via an import map.

## Run it

Browsers block ES module imports over `file://`, so serve the folder over HTTP:

```
python -m http.server 8000
```

Then open http://localhost:8000 in a browser.

## Controls

- `W` `A` `S` `D` — move one grid cell in that direction; every move is a spear thrust (has a reload cooldown).
- `/` — boost 3 grid cells in the direction you're facing, killing every enemy in the path (its own cooldown).
- `ESC` — pause/resume.
- `R` — restart after game over.

## Rules

- Enemies can only kill you by reaching your back or sides. If one ends up directly in front of your spear, it dies instead (self-impale).
- Walking straight into an enemy standing in front of you is a clash you lose — it costs a life and the enemy survives. Only the boost dash safely kills an enemy head-on.
- Enemies never kill each other — the only thing that removes an enemy is your spear (boost) or its own front-cell self-impale.
- Enemies spawn continuously from the grid's edges and get faster/more frequent the longer you survive.
- Score: +10 for a self-impale kill, +15 for a boost kill. High score is saved locally in the browser.
- You have 3 lives; losing all of them ends the run.
