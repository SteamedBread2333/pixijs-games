<div align="center">

# 🎮 小游戏盒子

**基于 PixiJS 的网页游戏合集 · 现代圆角视觉 · 完美适配手机触屏**

[![GitHub Pages](https://img.shields.io/badge/在线体验-GitHub%20Pages-2a8?logo=github&style=flat-square)](https://SteamedBread2333.github.io/pixijs-games/)
[![PixiJS](https://img.shields.io/badge/PixiJS-7.x-e85d4a?logo=pixijs&style=flat-square)](https://pixijs.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?logo=vite&style=flat-square)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-4caf73?style=flat-square)](LICENSE)

</div>

---

## ✨ 项目简介

一个小巧精致的网页游戏厅，使用 PixiJS 渲染引擎打造统一的圆角现代视觉风格。
所有游戏在 400×640 的竖屏画布中运行，自适应缩放适配各种手机屏幕，支持触摸操作。

<div align="center">

📸 **[在线体验 →](https://SteamedBread2333.github.io/pixijs-games/)**

</div>

---

## 🕹️ 游戏列表

### 🍉 合成大西瓜
> 物理合成 · 相同水果碰撞升级 · 冲击大西瓜

基于 Matter.js 物理引擎，将相同水果拖入容器碰撞合成更大水果，最终目标合成大西瓜。

### 🧩 超级积木
> 旋转拼块 · 填满灯光棋盘 · 共 100 关

拖动彩色积木到棋盘上，点按积木旋转 90°，恰好填满所有亮灯格子即通关。三星评价系统，进度本地保存。

### 🏯 华容道
> 经典 + 数字 · 双模式滑块解谜 · 参考计客超级华容道

| 模式 | 玩法 |
| --- | --- |
| **经典华容道** | 4×5 棋盘，滑动各色方块将曹操移至底部出口，含横刀立马等 12 关经典名局 |
| **数字华容道** | 3×3 / 4×4 数字拼图，滑动数字按顺序排列即通关，共 8 关由易到难 |

**特色功能：**
- 🎯 平滑滑动动画 + 计时计步 + 三星评价
- ↶ 撤销功能 · 可回退上一步操作
- 🎆 通关烟花粒子特效 + 星星弹出动画
- 🔊 WebAudio 合成音效 · 支持静音切换
- 💾 双模式独立存档 · 最佳步数/时间记录

### 🎯 光标迷航（开发中）
> 藏起光标 · 收集核心 · 走出迷局

---

## 🚀 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

开发服务器启动后访问 `http://localhost:5173/pixijs-games/`

---

## 🏗️ 技术架构

| 技术 | 用途 |
| --- | --- |
| [PixiJS 7](https://pixijs.com/) | 2D 渲染引擎，Canvas 绘制 |
| [Matter.js](https://brm.io/matter-js/) | 物理模拟（合成大西瓜） |
| [Vite 5](https://vitejs.dev/) | 构建工具与开发服务器 |
| WebAudio API | 程序化合成音效（无需音频文件） |
| localStorage | 游戏进度本地存档 |

### 📁 项目结构

```
pixijs-games/
├── index.html              # 入口 HTML（加载画面 + 画布容器）
├── vite.config.js          # Vite 配置（base 路径）
├── src/
│   ├── main.js             # 应用启动 · 资源预加载 · Hash 路由
│   ├── config.js           # 画布尺寸常量（400 × 640）
│   ├── home.js             # 首页大厅 · 可滚动游戏列表
│   ├── ui.js               # 共享 UI 组件（按钮 · 背景 · 字体）
│   └── games/
│       ├── index.js        # 游戏注册表（新增游戏在此登记）
│       ├── watermelon/     # 合成大西瓜
│       ├── superblock/     # 超级积木
│       ├── klotski/        # 华容道
│       │   ├── KlotskiGame.js   # 游戏主逻辑（双模式 · 动画 · 特效）
│       │   ├── levels.js        # 关卡数据（经典 + 数字）
│       │   ├── progress.js      # 进度存档（localStorage）
│       │   └── sound.js         # 音效系统（WebAudio）
│       └── cursorquest/   # 光标迷航
└── .github/workflows/
    └── deploy.yml          # GitHub Actions 自动部署
```

### 🎨 新增游戏

只需 3 步即可添加新游戏：

1. 在 `src/games/` 下创建游戏目录，实现 `destroy()` 接口
2. 在 `src/games/index.js` 的 `GAMES` 数组中注册
3. 在 `src/home.js` 的 `drawGameIcon()` 中添加图标

---

## 📤 部署

推送 `main` 分支后，GitHub Actions 自动构建并发布到 GitHub Pages。

**调试技巧：** 超级积木可通过 URL 参数临时解锁关卡：
```
#/game/superblock?sbUnlock=80
```

---

<div align="center">

Made with ❤️ using PixiJS

</div>
