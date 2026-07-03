import * as THREE from 'three';
import { GRID_SIZE, CELL_SIZE, inBounds, DIRECTIONS, KEY_TO_DIRECTION } from './Grid.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';

const LIVES_START = 3;
const SCORE_BOOST_KILL = 15;
const BOOST_RANGE = 3;
const BOOST_COOLDOWN = 1.4;
const MOVE_COOLDOWN = 0.1;
const MAX_ENEMIES = 24;
const MIN_SPAWN_DIST = 4;
const HIGHSCORE_KEY = 'gridiator_highscore';

export class Game {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.state = 'start';
    this.score = 0;
    this.lives = LIVES_START;
    this.highScore = Number(localStorage.getItem(HIGHSCORE_KEY) || 0);
    this.enemies = [];
    this.boostCooldownRemaining = 0;
    this.lastMoveTime = -999;
    this.elapsed = 0;
    this.enemyTickAcc = 0;
    this.spawnAcc = 0;

    this._initThree();
    this._initInput();
    this._updateHud();
    this.hud.startScreen.classList.remove('hidden');

    this.clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1420);
    this.scene.fog = new THREE.Fog(0x0e1420, 18, 34);

    const d = 10;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
    // Camera sits on the +Z/+Y axes only (no X offset), so the grid reads as an
    // axis-aligned rectangle rather than a rotated diamond: north/W is "up" on
    // screen, south/S is "down", west/A is "left", east/D is "right".
    this.camera.position.set(0, 17, 13);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(10, 18, 6);
    this.scene.add(dirLight);

    const groundSize = GRID_SIZE * CELL_SIZE;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      new THREE.MeshStandardMaterial({ color: 0x18202e })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(groundSize, GRID_SIZE, 0x3a4a63, 0x28344a);
    grid.position.y = 0.001;
    this.scene.add(grid);

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    const d = 10;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', '/'].includes(key)) e.preventDefault();

      if (key === 'escape') {
        if (this.state === 'playing') this._pauseGame();
        else if (this.state === 'paused') this._resumeGame();
        return;
      }

      if (this.state === 'start') {
        this._startGame();
      } else if (this.state === 'gameover') {
        if (key === 'r') this._startGame();
        return;
      } else if (this.state === 'paused') {
        return;
      }

      if (this.state !== 'playing') return;

      if (key in KEY_TO_DIRECTION) {
        this._handleMove(KEY_TO_DIRECTION[key]);
      } else if (key === '/') {
        this._handleBoost();
      }
    });
  }

  _pauseGame() {
    this.state = 'paused';
    this.hud.pauseScreen.classList.remove('hidden');
  }

  _resumeGame() {
    this.state = 'playing';
    this.hud.pauseScreen.classList.add('hidden');
  }

  _startGame() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    this.score = 0;
    this.lives = LIVES_START;
    this.boostCooldownRemaining = 0;
    this.enemyTickAcc = 0;
    this.spawnAcc = 0;
    this.elapsed = 0;
    this.lastMoveTime = -999;

    if (this.player) this.scene.remove(this.player.group);
    const center = Math.floor(GRID_SIZE / 2);
    this.player = new Player(this.scene, center, center);

    this.state = 'playing';
    this.hud.startScreen.classList.add('hidden');
    this.hud.gameoverScreen.classList.add('hidden');
    this.hud.pauseScreen.classList.add('hidden');
    this._updateHud();
  }

  _handleMove(direction) {
    if (this.elapsed - this.lastMoveTime < MOVE_COOLDOWN) return;
    this.lastMoveTime = this.elapsed;

    this.player.setFacing(direction);
    const d = DIRECTIONS[direction];
    const tx = this.player.gx + d.dx;
    const tz = this.player.gz + d.dz;

    this.player.thrust(false);
    if (!inBounds(tx, tz)) return;

    const hit = this._enemyAt(tx, tz);
    if (hit) {
      // A plain walking thrust into an enemy standing in front is a spear
      // clash you lose - only the boosted dash hits hard enough to kill an
      // enemy head-on. The player doesn't advance; the enemy holds its cell.
      this._damagePlayer();
      return;
    }
    this.player.moveTo(tx, tz);
  }

  _handleBoost() {
    if (this.boostCooldownRemaining > 0) return;
    this.boostCooldownRemaining = BOOST_COOLDOWN;
    this.player.thrust(true);

    const d = DIRECTIONS[this.player.facing];
    let cx = this.player.gx;
    let cz = this.player.gz;
    for (let i = 0; i < BOOST_RANGE; i++) {
      const nx = cx + d.dx;
      const nz = cz + d.dz;
      if (!inBounds(nx, nz)) break;
      const hit = this._enemyAt(nx, nz);
      if (hit) this._killEnemy(hit, SCORE_BOOST_KILL);
      cx = nx;
      cz = nz;
    }
    this.player.moveTo(cx, cz);
  }

  _enemyAt(gx, gz) {
    return this.enemies.find((e) => !e.dying && e.gx === gx && e.gz === gz);
  }

  _killEnemy(enemy, points) {
    enemy.startDeath();
    this.score += points;
    this._updateHud();
  }

  _difficultyT() {
    return 1 - Math.exp(-this.elapsed / 45);
  }

  _spawnInterval() {
    return THREE.MathUtils.lerp(1.6, 0.55, this._difficultyT());
  }

  _enemyTickInterval() {
    return THREE.MathUtils.lerp(0.85, 0.32, this._difficultyT());
  }

  _trySpawnEnemy() {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const last = GRID_SIZE - 1;
    const edge = Math.floor(Math.random() * 4);
    let gx, gz;
    if (edge === 0) { gx = Math.floor(Math.random() * GRID_SIZE); gz = 0; }
    else if (edge === 1) { gx = Math.floor(Math.random() * GRID_SIZE); gz = last; }
    else if (edge === 2) { gx = 0; gz = Math.floor(Math.random() * GRID_SIZE); }
    else { gx = last; gz = Math.floor(Math.random() * GRID_SIZE); }

    const dist = Math.max(Math.abs(gx - this.player.gx), Math.abs(gz - this.player.gz));
    if (dist < MIN_SPAWN_DIST || this._enemyAt(gx, gz)) return;

    this.enemies.push(new Enemy(this.scene, gx, gz));
  }

  _stepEnemyAI() {
    const p = this.player;
    const occupied = new Set(this.enemies.filter((e) => !e.dying).map((e) => `${e.gx},${e.gz}`));

    for (const enemy of [...this.enemies]) {
      if (enemy.dying) continue;

      const dgx = p.gx - enemy.gx;
      const dgz = p.gz - enemy.gz;

      // Adjacent on any side - front, back, or flank - lands a hit on the
      // player. There's no safe direction to be caught next to an enemy;
      // the boost dash is the only way to clear one out.
      if (Math.abs(dgx) + Math.abs(dgz) === 1) {
        this._damagePlayer();
        continue;
      }

      const stepOptions = [];
      if (dgx !== 0) stepOptions.push({ gx: enemy.gx + Math.sign(dgx), gz: enemy.gz, dist: Math.abs(dgx) });
      if (dgz !== 0) stepOptions.push({ gx: enemy.gx, gz: enemy.gz + Math.sign(dgz), dist: Math.abs(dgz) });
      stepOptions.sort((a, b) => b.dist - a.dist || Math.random() - 0.5);

      const isFree = (s) => inBounds(s.gx, s.gz) && !occupied.has(`${s.gx},${s.gz}`);
      const chosen = stepOptions.find(isFree);
      if (!chosen) continue;

      occupied.delete(`${enemy.gx},${enemy.gz}`);
      enemy.moveTo(chosen.gx, chosen.gz);
      occupied.add(`${chosen.gx},${chosen.gz}`);

      if (Math.abs(p.gx - chosen.gx) + Math.abs(p.gz - chosen.gz) === 1) {
        this._damagePlayer();
      }
    }
  }

  // Landing a hit never kills the attacker - enemies can never eliminate
  // each other, and they're never killed just by ending up next to the
  // player (front included). The boost dash is the only thing that ever
  // removes an enemy from the board.
  _damagePlayer() {
    if (this.player.isInvulnerable()) return;
    this.player.flashHit();
    this.lives -= 1;
    this._updateHud();
    if (this.lives <= 0) this._gameOver();
  }

  _gameOver() {
    this.state = 'gameover';
    if (this.score > this.highScore) this.highScore = this.score;
    localStorage.setItem(HIGHSCORE_KEY, String(this.highScore));
    this.hud.finalScore.textContent = String(this.score);
    this.hud.bestScore.textContent = String(this.highScore);
    this.hud.gameoverScreen.classList.remove('hidden');
    this._updateHud();
  }

  _updateHud() {
    this.hud.score.textContent = String(this.score);
    this.hud.highscore.textContent = String(this.highScore);
    this.hud.lives.textContent =
      '♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(Math.max(0, LIVES_START - this.lives));
  }

  _animate() {
    requestAnimationFrame(this._animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'playing') {
      this.elapsed += dt;

      if (this.boostCooldownRemaining > 0) {
        this.boostCooldownRemaining = Math.max(0, this.boostCooldownRemaining - dt);
        this.hud.boostFill.style.width = `${100 * (1 - this.boostCooldownRemaining / BOOST_COOLDOWN)}%`;
      } else {
        this.hud.boostFill.style.width = '100%';
      }

      this.spawnAcc += dt;
      if (this.spawnAcc >= this._spawnInterval()) {
        this.spawnAcc = 0;
        this._trySpawnEnemy();
      }

      this.enemyTickAcc += dt;
      if (this.enemyTickAcc >= this._enemyTickInterval()) {
        this.enemyTickAcc = 0;
        this._stepEnemyAI();
      }

      this.player.update(dt);
      this.enemies = this.enemies.filter((enemy) => {
        const done = enemy.update(dt);
        if (done) enemy.dispose();
        return !done;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}
