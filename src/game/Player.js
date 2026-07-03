import * as THREE from 'three';
import { cellToWorld, DIRECTIONS } from './Grid.js';

const MOVE_SPEED = 12; // world units/sec the visual mesh chases the grid target
const THRUST_DURATION = 0.16;
const BOOST_DURATION = 0.22;

export class Player {
  constructor(scene, gx, gz) {
    this.scene = scene;
    this.gx = gx;
    this.gz = gz;
    this.facing = 'south';

    this.group = new THREE.Group();
    this._buildMesh();
    scene.add(this.group);

    const { x, z } = cellToWorld(gx, gz);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = DIRECTIONS[this.facing].yaw;

    this._thrustT = Infinity; // time since thrust started; Infinity = idle
    this._thrustDuration = THRUST_DURATION;
    this.invulnerableUntil = 0;
  }

  _buildMesh() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3fa9f5, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.3), bodyMat);
    body.position.y = 0.41;
    this.group.add(body);
    this.bodyMesh = body;

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xffd8a8, flatShading: true })
    );
    head.position.y = 0.86;
    this.group.add(head);

    // Spear pivots forward/back for the thrust animation.
    this.spearGroup = new THREE.Group();
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.25), shaftMat);
    shaft.position.set(0, 0.55, -0.62);
    this.spearGroup.add(shaft);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 0.6, roughness: 0.3, flatShading: true })
    );
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.y = Math.PI / 4;
    tip.position.set(0, 0.55, -1.25);
    this.spearGroup.add(tip);

    this.group.add(this.spearGroup);
  }

  setFacing(direction) {
    this.facing = direction;
  }

  moveTo(gx, gz) {
    this.gx = gx;
    this.gz = gz;
  }

  thrust(boosted = false) {
    this._thrustT = 0;
    this._thrustDuration = boosted ? BOOST_DURATION : THRUST_DURATION;
  }

  flashHit() {
    this.invulnerableUntil = performance.now() / 1000 + 1;
  }

  isInvulnerable() {
    return performance.now() / 1000 < this.invulnerableUntil;
  }

  update(dt) {
    const { x, z } = cellToWorld(this.gx, this.gz);
    this.group.position.x = THREE.MathUtils.damp(this.group.position.x, x, MOVE_SPEED, dt);
    this.group.position.z = THREE.MathUtils.damp(this.group.position.z, z, MOVE_SPEED, dt);

    // Shortest-path yaw correction (avoids spinning the long way around).
    const targetYaw = DIRECTIONS[this.facing].yaw;
    let diff = targetYaw - this.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.group.rotation.y += diff * Math.min(1, dt * MOVE_SPEED);

    if (this._thrustT !== Infinity) {
      this._thrustT += dt;
      const p = Math.min(1, this._thrustT / this._thrustDuration);
      const offset = Math.sin(p * Math.PI) * (this._thrustDuration > THRUST_DURATION ? 0.55 : 0.32);
      this.spearGroup.position.z = -offset;
      if (p >= 1) this._thrustT = Infinity;
    }

    if (this.bodyMesh) {
      const blink = this.isInvulnerable() ? (Math.sin(performance.now() / 60) > 0 ? 1 : 0.3) : 1;
      this.bodyMesh.material.opacity = blink;
      this.bodyMesh.material.transparent = blink < 1;
    }
  }
}
