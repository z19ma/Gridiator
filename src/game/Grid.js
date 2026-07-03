export const GRID_SIZE = 13;
export const CELL_SIZE = 1;

const OFFSET = (GRID_SIZE - 1) / 2;

export function cellToWorld(gx, gz) {
  return { x: (gx - OFFSET) * CELL_SIZE, z: (gz - OFFSET) * CELL_SIZE };
}

export function inBounds(gx, gz) {
  return gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE;
}

// Facing name -> grid step + mesh yaw (radians) needed so the spear,
// which points down -Z by default, points down that grid direction.
export const DIRECTIONS = {
  north: { dx: 0, dz: -1, yaw: 0 },
  south: { dx: 0, dz: 1, yaw: Math.PI },
  east: { dx: 1, dz: 0, yaw: -Math.PI / 2 },
  west: { dx: -1, dz: 0, yaw: Math.PI / 2 },
};

export const KEY_TO_DIRECTION = {
  w: 'north',
  s: 'south',
  a: 'west',
  d: 'east',
};
