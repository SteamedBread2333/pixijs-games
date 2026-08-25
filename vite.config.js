import { defineConfig } from 'vite';

// GitHub Pages 部署在 /pixijs-games/ 子路径下，base 必须匹配
export default defineConfig({
  base: '/pixijs-games/',
  build: {
    outDir: 'dist',
  },
});
