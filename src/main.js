import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { Game } from './Game.js';

async function bootstrap() {
  const app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#fdf6e3',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  document.getElementById('app').appendChild(app.view);

  // 移动端自适应缩放
  const resize = () => {
    const scale = Math.min(
      window.innerWidth / GAME_WIDTH,
      window.innerHeight / GAME_HEIGHT,
      1.2
    );
    app.view.style.width = `${GAME_WIDTH * scale}px`;
    app.view.style.height = `${GAME_HEIGHT * scale}px`;
  };
  window.addEventListener('resize', resize);
  resize();

  new Game(app);
}

bootstrap();
