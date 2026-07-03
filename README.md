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

- Any enemy adjacent to you — front, back, or side, whether it walked into you or you walked into it — costs you a life. There's no safe direction to be caught next to one.
- The boost dash is the only thing that ever kills an enemy. Walking a normal thrust into one just costs you a life instead (and blocks your advance).
- Enemies never kill each other.
- Enemies spawn continuously from the grid's edges and get faster/more frequent the longer you survive.
- Score: +15 per boost kill (the only way to score). High score is saved locally in the browser.
- You have 3 lives; losing all of them ends the run.
