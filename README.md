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

- An enemy in your front cell is instant death — no invulnerability, no second life. It doesn't matter whether you walked into it or it walked into you.
- An enemy adjacent from the back or a side only costs you a life (with a brief invulnerability window), not the whole run.
- The boost dash is the only thing that ever kills an enemy and lets you survive a front-on encounter. Walking a normal thrust into one is fatal instead.
- Enemies never kill each other.
- Enemies spawn continuously from the grid's edges and get faster/more frequent the longer you survive.
- Score: +15 per boost kill (the only way to score). High score is saved locally in the browser.
- You have 3 lives against back/side hits; a front clash ends the run immediately regardless of lives remaining.
