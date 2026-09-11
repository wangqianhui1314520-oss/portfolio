# 《生长档案》源代码说明

## 游戏简介

《生长档案》是一款以「现实时间 == 游戏时间」为核心的叙事解谜网页游戏。
玩家扮演一位整理旧物的人，在一台旧电脑的浏览器中，逐步拼合「档案」碎片，
穿过 QQ 空间、旧博客、医院档案、信号监听等章节，还原一段跨越多年的人生叙事，
并在多重结局中作出最终选择。

- 平台：Web（浏览器直接运行，无需安装）
- 技术栈：原生 HTML / CSS / JavaScript（无游戏引擎、无构建工具、无外部依赖）
- 参与活动：Global Game Jam 2026 · 翌光计划（Yiguang Program · 武汉全球高校游戏创作挑战赛）

## 如何运行

### 方式一：直接打开（推荐）

用浏览器打开本目录下的 `index.html` 即可开始游戏。
（建议使用 Chrome / Edge 最新版本，开启音效需要用户交互后自动允许播放。）

### 方式二：本地 HTTP 服务（推荐，可避免部分浏览器对本地文件的限制）

在 `source` 目录下任选一种方式启动本地服务：

```bash
# Python 3
python -m http.server 8000

# 或 Node.js
npx serve -l 8000
```

然后访问 http://localhost:8000/ 开始游戏。

## 目录结构

```
source/
├── index.html            # 游戏入口页面（单页应用）
├── browser-window.js     # 浏览器窗口模拟脚本
├── assets/               # 门牌等静态素材
├── css/                  # 各章节样式（qzone / archive / hospital / investigate / signal / ending 等）
├── js/                   # 各章节逻辑（game-core / game-qzone / game-archive / game-hospital /
│                         #   game-investigate / game-signal / game-ending / game-extras 等）
├── media/                # 全部美术与音频素材
│   ├── jpg/              # 游戏内图片（相册、时间线、背景等）
│   ├── mp4/              # 章节视频素材
│   ├── wav/              # 背景音乐与人声
│   └── 媒体资源清单.md     # 媒体素材清单
└── README.md             # 本文件
```

## 构建 / 打包说明

本游戏为纯静态网页，**无需编译**。将整个 `source` 目录原样部署到任意静态
Web 服务器（或直接打开 index.html）即可运行。所有资源引用均为相对路径，
目录内自包含，无外部依赖。

## 授权声明

本项目采用知识共享署名-非商业性使用-相同方式共享 4.0 国际（CC BY-NC-SA 4.0）
许可协议授权，详见主目录下 `license.txt`。
