# Tem — 个人创作宇宙

网站、代码、作品素材、Blender 工程和设计归档的完整项目目录。

## 本地预览

在这个 `docs` 文件夹打开终端（目录名为 `docs`，是因为 GitHub Pages 的分支发布只支持 `/` 或 `/docs`；项目本身仍叫 Tem）：

```powershell
npm run dev
```

打开 <http://127.0.0.1:4173/> 或 <http://127.0.0.1:4173/immersive.html>，两个入口均呈现沉浸式主站。网站运行在静态文件上；页面由项目脚本生成，本地预览不需要执行 npm 安装。本机 Node.js 26 可运行开发服务和检查工具。Three.js r161 及所需扩展固定保存在 `assets/vendor/three-0.161.0/`，浏览网站不再请求外部图形 CDN。

服务器必须以 **docs 为网站根目录**。HTML 的 `/assets/`、`/zh/`、`/en/` 路径都相对于这个根目录；不要以父目录为服务器根再访问 `/docs/immersive.html`。

主页的「直接浏览作品」进入 `/zh/work/`（英文为 `/en/work/`）。作品档案先回答「谁、做什么」：左栏是姓名、定位、一句话、证据（作品数、获奖、发布平台）和「履历与荣誉 / 联系我」两个入口，其下是可拖动的 3D 水晶 T。顶部是类型筛选（全部 / 游戏与交互 / AI 影像 / 文学与世界观 / 技术实验，带数量）和「作品带 / 列表」切换；筛选与视图写入网址（`?category=nexus`、`?view=list`），切换语言时保留。作品带每张卡片下方直接显示作品名，封面左上角标出「获奖 / 可试玩（或在线体验） / 开源」；影像带下方的「当前作品」信息区实时显示编号、类型、年份、标题、简介、我的角色与成果，标题直达案例页。左右箭头、方向键 ← → 一次切换一件，Home / End 到首尾；整条影像带只占一个 Tab 位置（当前作品），「跳到作品」直接聚焦当前作品。桌面端点击图片展开：封面按原比例移到右侧（文字烤在图里的封面不会被裁），左栏列出标题、简介、我的角色、成果、标签，以及「查看案例」「试玩 / 在线体验」和上一个 / 下一个；再点一次封面进入案例，Escape 收起；`?project=growth` 可直接展开指定作品。有视频的五件作品在展开时（窄屏为当前卡片）播放 5 秒静音预览，减少动态效果或省流量模式下不播放。列表视图把同样的作品排成一栏：编号、缩略图、标题、角色、类型与年份、成果和标签。窄屏（宽度小于 800px）改为可纵向滚动的单卡轮播：一次滑动一张，点露出边缘的卡片先滑入，点居中的卡片进入案例页。页头与其他页面一致（作品 / 关于我 / 进入宇宙 / 联系 / English），宽度低于 1280px（英文 1366px）或窄屏时折叠为「菜单」按钮；作品档案页的「联系」打开页内联系面板。案例页提供演示、实际发布入口与下一作品导航；支持跨页过渡的浏览器（Chrome / Edge 126+、Safari 18.2+）中，当前封面会平滑过渡到案例页封面。直接浏览不依赖 3D 场景初始化。作品档案的背景沿用首页宇宙的紫色银河带，底部是与首页呼应的行星地平线；点开作品时，星空上会叠加该项目的色调，地平线随之隐去。地平线只在桌面窗口高度不低于 650px 和窄屏时出现，桌面上作品带会在需要时整体上移，为地平线留出空间。

直接浏览左侧的交互式水晶 T 复用主页模型 `tem-refined-observatory-v21-lod.glb` 的 `T_IDENTITY_V19`，只渲染标志。拖动旋转、滚轮缩放，点击或按回车唤醒；方向键调整视角，Home 或「重置视角」恢复。模型独立加载，展开作品或打开关于面板时暂停，加载失败仍可浏览全部作品。

## 文件框架

```text
docs/
├── index.html                 默认入口，完整沉浸式主站
├── immersive.html             科幻沉浸式主站
├── zh/                        中文主页、作品详情、关于我、诗集
├── en/                        对应英文页面
├── poetry.html                原诗集阅读入口
├── resume.html                原简历页面，保留文件
├── portfolio-print.html       原作品集打印页面
├── assets/
│   ├── js/                    场景、交互、内容数据和国际化模块
│   ├── css/                   页面与场景样式
│   ├── vendor/                固定版本的 Three.js、本地依赖清单与许可证
│   ├── fonts/                 中英可变字体子集、覆盖清单与许可证
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
│   ├── ENGINEERING.md         当前运行资源、可编辑工程及验收边界
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

`npm run build` 会从 `templates/universe.html`、`assets/js/data.js` 与国际化资料重新生成根入口、沉浸式入口、中文/英文页面和搜索索引，修改主站结构时应同步模板。作品与人物内容的唯一数据源为 `assets/js/data.js`；`locale-data.js` 和 `i18n.js` 负责读取及界面翻译。不要只手改生成的 HTML。

正文采用本地 `Tem Narrative` 字体，界面采用 `Tem Interface`；两者是保留 OFL 许可证的 Noto SC 可变字体子集。修改文案后先生成页面，再运行 `python scripts/build-fonts.py --check` 检查字符覆盖；需要重建时运行同一脚本而不加 `--check`。脚本依赖和源字体要求见 [工程说明](docs/ENGINEERING.md)。

作品的中英文短介绍与成果位于 `data.js` 的 `international.projectCards`，个人职责继续读取每件作品的 `contribution`。同一处还有：`order`（作品档案与案例页「下一个作品」的顺序，先游戏策划相关、再按证据强弱，文学收尾）、`awards`（显示「获奖」标签的作品）、`coverFocus`（窄卡片裁切封面时的水平焦点）和 `intro`（左栏的定位与证据文案）。「可试玩 / 在线体验」标签来自作品的 `play.url`，「开源」来自 GitHub 链接。直接浏览的页面结构、展开配色由 `scripts/build-international.mjs` 生成，样式位于 `assets/css/international-site.css`，横向滚动、筛选、列表、当前作品、展开、预览、菜单和联系面板交互位于 `assets/js/international-static.js`；不要直接修改生成的中英文 HTML。这三个文件和水晶模型在页面里带内容指纹（`?v=` 后为文件哈希），改动后重新生成页面即可刷新缓存。桌面端左侧栏宽 `min(32vw, 520px)`，卡片宽 `clamp(110px, 8.6vw, 140px)`，常见桌面宽度一屏可见 6–8 张；窄屏卡片宽 78vw、按 16:10 显示完整封面。标题、年份等信息文字不小于 11px，可点击区域不小于 44px。背景图 `assets/images/work-backdrop-galaxy.webp`（桌面）与 `work-backdrop-galaxy-m.webp`（窄屏）由 `python scripts/build-backdrop.py` 从 `assets/images/optical/tem-galactic-panorama.png` 压暗导出（需要 Pillow），调整亮度后重新运行即可；`tests/work-backdrop.test.mjs` 会检查两张图分别不超过 100 KB 与 30 KB。

案例页、关于我（履历与荣誉）与诗集共用一套阅读主题（`body.reading-page`，各页另有 `case-page` / `about-page` / `poems-page`）：作品档案的银河背景固定在正文后方并加深，两侧多保留一些星空，最暗的说明文字对最亮的星点仍有约 6:1 的对比度；配色、衬线标题和 TEM 字标与作品档案一致，手机加载小尺寸背景。`tests/work-backdrop.test.mjs` 会检查这几页都用同一背景。

作品档案的资源各有生成脚本，改动来源后重新运行：

- 封面：`python scripts/build-covers.py` 为 `data.js` 引用的每张 JPEG 封面导出 480 px、960 px 与原宽的 WebP（`assets/covers/r/`，附 `manifest.json`）；页面用 `<picture>` 提供 WebP，原 JPEG 作后备，只有前两张立即加载。
- 预览：`python scripts/build-previews.py`（需要 ffmpeg）从作品视频剪出 5 秒、无声、16:10 的循环（`assets/videos/previews/`），起点写在脚本的 `CLIPS` 里；竖屏素材放在自身的模糊放大背景上。
- 水晶：`node scripts/build-identity-model.mjs` 从 `tem-refined-observatory-v21-lod.glb` 中只取出 `T_IDENTITY_V19`，写成 `assets/models/tem-identity-v21.glb`（约 300 KB，原文件 1.4 MB）。页面加载完成、浏览器空闲后才下载 Three.js 与模型；左栏隐藏（窄屏、宽度小于 1180px、窗口高度不超过 600px）时完全不下载。
- 字体：中文字形按页面重要性切成约 160 字一片，各带 `unicode-range`，页面只下载用到的切片；作品档案先占前几片，衬线体的标题字单独一片。作品档案首屏实际下载 5 个字体文件、约 205 KB（原先单文件约 985 KB）。英文页使用字体自带的比例宽度引号（`font-variant-east-asian: proportional-width`），中文保留全角标点。

完整的重新生成顺序：`node scripts/build-international.mjs` → `python scripts/build-fonts.py` → 再运行一次 `node scripts/build-international.mjs`（更新字体样式的内容指纹）。

最新建模工程：

- `blender/cinematic-v21/tem-refined-optical-observatory.blend`
- `blender/cinematic-v21/tem-refined-fleet.blend`

实体星海工程：`blender/cinematic-v20/tem-living-star-sea.blend`。GLB 导出继续放在 `assets/models/`；实时星云密度、粒子运动、光流和鼠标交互由网页着色器与场景模块计算。Blender 的离线 PNG 用于比较材质与光影，不是网页星海背景。

完整操作顺序与工程/运行资源对应表见 [SITE.md](docs/SITE.md) 和 [ENGINEERING.md](docs/ENGINEERING.md)。现有电影质感仍需持续精修；工程、导出及测试通过不代表已与概念图逐项一致。

原版本控制仓库和本机工具目录留在父目录。后续开发在 `docs` 中进行。发布方式：GitHub Pages 从 `main` 分支的 `/docs` 目录发布，域名 `wqh-tempest.cn`；`npm run dev` 仅用于本地预览，不影响线上。
