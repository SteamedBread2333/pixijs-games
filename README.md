# 小游戏盒子

基于 **PixiJS** 的网页游戏合集，采用现代圆角视觉风格并适配手机。

在线体验：https://SteamedBread2333.github.io/pixijs-games/

## 游戏列表

| 游戏 | 玩法 |
| --- | --- |
| 合成大西瓜 | 物理合成：相同水果碰撞升级，冲击大西瓜 |
| 超级积木 | 旋转拼块：拖动彩色积木填满灯光棋盘，共 100 关 |

## 超级积木玩法

- 棋盘亮起目标图案，把下方积木拖到棋盘上
- 点按积木可旋转 90°，恰好填满所有亮灯格子即通关
- 不用重置拿 3 星，进度自动保存在本地
- 调试时可通过 `#/game/superblock?sbUnlock=80` 临时开通至指定关卡

## 本地运行

```bash
npm install
npm run dev
```

## 部署

推送 `main` 分支后由 GitHub Actions 自动发布到 GitHub Pages。
