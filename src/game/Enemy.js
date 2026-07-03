import * as THREE from 'three';
import { cellToWorld, DIRECTIONS } from './Grid.js';

const MOVE_SPEED = 8;

let nextId = 1;

export class Enemy {
  constructor(scene, gx, gz) {
    this.id = nextId++;
    this.scene = scene;
    this.gx = gx;
    this.gz = gz;
    this.facing = 'south';
    this.dying = false;
    this._dyingT = 0;

    this.group = new THREE.Group();
    this._buildMesh();
    scene.add(this.group);

    const { x, z } = cellToWorld(gx, gz);
    this.group.position.set(x, 0, z);
  }

  _buildMesh() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd94f4f, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.26), bodyMat);
    body.position.y = 0.36;
    this.group.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x6b1616, flatShading: true })
    );
    head.position.y = 0.76;
    this.group.add(head);

    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x4a2f18, flatShading: true })
    );
    shaft.position.set(0, 0.5, -0.5);
    this.group.add(shaft);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.24, 4),
      new THREE.MeshStandardMaterial({ color: 0xbababa, metalness: 0.6, roughness: 0.3, flatShading: true })
    );
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.y = Math.PI / 4;
    tip.position.set(0, 0.5, -1.0);
    this.group.add(tip);
  }

  moveTo(gx, gz) {
    if (gx !== this.gx || gz !== this.gz) {
      const dx = gx - this.gx;
      const dz = gz - this.gz;
      if (dx === 1) this.facing = 'east';
      else if (dx === -1) this.facing = 'west';
      else if (dz === 1) this.facing = 'south';
      else if (dz === -1) this.facing = 'north';
    }
    this.gx = gx;
    this.gz = gz;
  }

  startDeath() {
    this.dying = true;
    this._dyingT = 0;
  }

  update(dt) {
    if (this.dying) {
      this._dyingT += dt;
      const p = Math.min(1, this._dyingT / 0.25);
      const s = 1 - p;
      this.group.scale.set(s, s, s);
      this.group.rotation.y += dt * 10;
      return p >= 1;
    }

    const { x, z } = cellToWorld(this.gx, this.gz);
    this.group.position.x = THREE.MathUtils.damp(this.group.position.x, x, MOVE_SPEED, dt);
    this.group.position.z = THREE.MathUtils.damp(this.group.position.z, z, MOVE_SPEED, dt);

    const targetYaw = DIRECTIONS[this.facing].yaw;
    let diff = targetYaw - this.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.group.rotation.y += diff * Math.min(1, dt * MOVE_SPEED);
    return false;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
