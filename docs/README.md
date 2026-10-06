# Tem — 个人创作宇宙

网站、代码、作品素材、Blender 工程和设计归档的完整项目目录。

## 本地预览

在这个 `docs` 文件夹打开终端（目录名为 `docs`，是因为 GitHub Pages 的分支发布只支持 `/` 或 `/docs`；项目本身仍叫 Tem）：

```powershell
npm run dev
```

打开 <http://127.0.0.1:4173/immersive.html>。站点是纯静态网站，没有 npm 安装步骤。本机已安装的 Node.js 26 可运行开发服务和检查工具。Three.js 当前从网页声明的 CDN 加载。

服务器必须以 **docs 为网站根目录**。HTML 的 `/assets/`、`/zh/`、`/en/` 路径都相对于这个根目录；不要以父目录为服务器根再访问 `/docs/immersive.html`。

## 文件框架

```text
docs/
├── index.html                 默认入口，跳转至沉浸式主站
├── immersive.html             科幻沉浸式主站
├── zh/                        中文主页、作品详情、关于我、诗集
├── en/                        对应英文页面
├── poetry.html                原诗集阅读入口
├── resume.html                原简历页面，保留文件
├── portfolio-print.html       原作品集打印页面
├── assets/
│   ├── js/                    场景、交互、内容数据和国际化模块
│   ├── css/                   页面与场景样式
│   ├── models/                网站加载的 GLB 和场景元数据
│   ├── images/                贴图、光学素材及兼容资源
│   ├── covers/                作品封面
│   ├── videos/                作品视频
│   ├── captions/              视频字幕
│   ├── certificates/          证书材料
│   └── poems/                 诗集原稿图片
├── templates/                 双语网站生成模板
├── scripts/
│   ├── dev-server.mjs         本地预览服务
│   ├── build-international.mjs 双语页面生成器
│   ├── audit-assets.mjs       素材引用检查
│   ├── build-tem-*.py         Blender 建模和导出
│   ├── render-tem-*.py        Blender 离线渲染
│   ├── repair-blender-paths.py 已有工程的迁移路径修复
│   └── blender-mcp/           本机 Blender MCP 服务与客户端
├── tests/                     内容、流程、镜头和资源完整性测试
├── blender/                   可编辑 .blend、备份、渲染、MCP 记录
│   ├── cinematic-v17/         历史工程
│   ├── cinematic-v18/         初代电影观景舱和星图
│   ├── cinematic-v19/         梦幻观景舱
│   ├── cinematic-v20/         实体星海
│   ├── cinematic-v21/         第二轮平台、晶体 T 和星舰精修
│   └── references-v18/        工程使用的概念参考
├── docs/
│   ├── SITE.md                站点维护说明
│   ├── MIGRATION.md           本次整理与维护约定
│   ├── folder-migration.json  原始路径、文件大小及 SHA256 清单
│   ├── blender-path-repair.json Blender 内部路径修复记录
│   └── source/                原始简历资料，独立于网站展示素材
├── _archive/                  概念图、参考帧、验收截图、旧源码和方案
├── CNAME                      现有域名配置
├── robots.txt / sitemap.xml   现有搜索索引文件
├── package.json               统一开发、检查、构建命令
└── .gitignore                 工程和本地资料的排除规则
```

## 日常操作

```powershell
npm test
npm run audit
npm run build
npm run blender:info
```

`npm run build` 会从 `templates/universe.html`、`assets/js/data.js` 与国际化资料重新生成页面，修改主站结构时应同步模板。内容的唯一数据源为 `assets/js/data.js`。

最新建模工程：

- `blender/cinematic-v21/tem-refined-optical-observatory.blend`
- `blender/cinematic-v21/tem-refined-fleet.blend`

实体星海工程：`blender/cinematic-v20/tem-living-star-sea.blend`。GLB 导出继续放在 `assets/models/`，网页实时星云与交互继续放在 `assets/js/`。

原版本控制仓库和本机工具目录留在父目录。后续开发在 `docs` 中进行。发布方式：GitHub Pages 从 `main` 分支的 `/docs` 目录发布，域名 `wqh-tempest.cn`；`npm run dev` 仅用于本地预览，不影响线上。
