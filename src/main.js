import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GAMES } from './games/index.js';
import { HomeScreen } from './home.js';

const appElement = document.getElementById('app');
const loadingElement = document.getElementById('loading');
const loadingMessage = document.getElementById('loading-message');
let app = null;

// 移动端自适应缩放
const resize = () => {
  if (!app) return;
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT,
    1.2
  );
  app.view.style.width = `${GAME_WIDTH * scale}px`;
  app.view.style.height = `${GAME_HEIGHT * scale}px`;
};
window.addEventListener('resize', resize);

// ---------- hash 路由 ----------
let current = null; // { destroy() }

function destroyCurrent() {
  if (current && typeof current.destroy === 'function') {
    current.destroy();
  }
  current = null;
  app.stage.removeChildren();
  app.renderer.background.color = '#10131c';
}

function route() {
  if (!app) return;
  destroyCurrent();
  // 恢复舞台事件（各游戏/首页依赖 stage 命中测试）
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  const match = window.location.hash.match(/^#\/game\/(\w+)/);
  const game = match && GAMES.find((g) => g.id === match[1]);

  if (!game) {
    app.renderer.background.color = '#10131c';
    current = new HomeScreen(app);
    return;
  }

  app.renderer.background.color = game.background;
  current = game.create(app);
}

async function preloadResources() {
  const resourceUrls = [...new Set(GAMES.flatMap((game) => game.assets ?? []))];

  const loadedAssets = await Promise.all(
    resourceUrls.map(async (url) => {
      const asset = await PIXI.Assets.load(url);
      if (asset == null) throw new Error(`资源加载结果为空: ${url}`);
      return asset;
    })
  );

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  return loadedAssets;
}

function showApp() {
  appElement.setAttribute('aria-hidden', 'false');
  appElement.classList.add('is-ready');
  loadingElement.classList.add('is-hidden');
  loadingElement.addEventListener('transitionend', () => loadingElement.remove(), { once: true });
}

function showLoadError(error) {
  console.error('游戏资源加载失败', error);
  loadingElement.classList.add('has-error');
  loadingMessage.textContent = '资源加载失败，请检查网络后刷新重试。';
}

async function bootstrap() {
  try {
    await preloadResources();

    app = new PIXI.Application({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      background: '#10131c',
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    appElement.appendChild(app.view);
    resize();
    window.addEventListener('hashchange', route);
    route();
    showApp();
  } catch (error) {
    showLoadError(error);
  }
}

bootstrap();
