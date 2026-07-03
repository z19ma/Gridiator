import { Game } from './game/Game.js';

const canvas = document.getElementById('scene');
const hud = {
  score: document.getElementById('score'),
  highscore: document.getElementById('highscore'),
  lives: document.getElementById('lives'),
  boostFill: document.getElementById('boost-fill'),
  startScreen: document.getElementById('start-screen'),
  gameoverScreen: document.getElementById('gameover-screen'),
  pauseScreen: document.getElementById('pause-screen'),
  finalScore: document.getElementById('final-score'),
  bestScore: document.getElementById('best-score'),
};

new Game(canvas, hud);
