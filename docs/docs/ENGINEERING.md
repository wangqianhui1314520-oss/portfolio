# Tem 当前工程说明

最后核对：2026-10-19。当前沉浸式主站缓存标识为 v21.19。以下路径均相对于网站根目录 `D:/Vibe coding/作品集/docs`。

## 1. 运行与生成路径

| 输入/模块 | 输出或职责 |
|---|---|
| `templates/universe.html` | 沉浸式主站结构模板 |
| `assets/js/data.js` | 人物、作品、诗集、联系方式与双语内容资料 |
| `scripts/build-international.mjs` | 生成 `index.html`、`immersive.html`、`zh/`、`en/`、`robots.txt` 和 `sitemap.xml` |
| `international-boot.js` → `immersive-engine.js` | 本地 Three.js 预热、场景启动与失败回退 |
| `immersive-cosmos.js` | 主场景、后期渲染、实时光影与画面调度 |
| `immersive-shader-preparation.js` | 有限关键资产等待、首屏真实灯光/材质组合、全屏后期通道预编译、后续内容后台预编译与“先编译后显示” |
| `immersive-light-rig.js` | 固定 6 个点光灯位：模块自建点光移到不渲染的图层，由灯位按屏幕影响力承载，着色器灯光数恒定 |
| `immersive-planetary-look.js` / `immersive-planet.js` | 原生行星共享参数、不可变几何本地化、天气与连续飞行姿态 |
| `immersive-scene-layers.js` | 独立主场景 HDR/深度目标、独立粒子 HDR 目标与解析后合成 |
| `immersive-navigation.js` / `immersive-session.js` / `immersive-journey.js` | 镜头、探索状态、取消与返回 |
| `immersive-profile.js` / `immersive-world-surface.js` / `immersive-projection.js` | 个人四章、世界内界面与透视投影 |
| `immersive-volume-field.js` / `immersive-nebula-pass.js` / `immersive-star-sea.js` | 三维密度、深度感知星云/云海与 Blender 星海语义 |
| `immersive-crystal-volume.js` | T 晶体内的双有限腔体、共享密度场与折射光积分 |
| `immersive-atmosphere.js` / `immersive-light-flow.js` / `immersive-pointer-field.js` | 粒子、光流与指针影响 |
| `immersive-lightstage.js` / `immersive-planar-reflection.js` / `immersive-optical.js` | 实时照明、反射捕获与光学天空 |
| `immersive-frame-budget.js` / `immersive-gpu-timing.js` | 按刷新率整数倍出帧、自适应像素预算、GPU 档位（多重采样/透射分辨率）与可用设备上的异步 GPU 计时 |
| `immersive-hud.js` / `assets/css/immersive-hud.css` | v22 战术界面：步骤导轨与时钟、代码解码、吸附准星、锁定圈（`placeLock()` 由场景每帧定位）；旁白面板的透明玻璃。样式放在 `@layer hud` 中，层内 `!important` 压过旧样式表的 `!important` |

主站模板与沉浸式模块图的 CSS/JS 缓存标识统一为 `cinematic-v21.19`。直接浏览的页面（作品档案、案例、关于、诗集）另行使用内容指纹：`fonts.css`、`international-site.css`、`international-static.js` 与 `tem-identity-v21.glb` 的地址带 `?v=` 加文件 SHA-256 前十位，字体切片带前八位，由 `scripts/build-international.mjs` 与 `scripts/build-fonts.py` 生成，改动这些文件不需要提升全站标识。这些标识用于缓存和模块身份，不等同于 Blender 文件版本。`immersive-observatory-v19.js` 的名称属于兼容接口，当前实际加载 v21 观测站；观测站几何仍为 Blender revision `21.7` / `plinth-layer-04`，星云材质精修为 `21.8` / `filament-01`，主行星精修为 `horizon-01`，晶体内部体积为 `crystal-field-01`，陶瓷材质和限定恒星受体为 `ceramic-light-01`。

v21.13 的星港/舰队准备从隐藏构建移到实际星图入口。`ensureAssets()` 不作为移动端导航阻塞条件；载入失败保持后备。矩阵额外遍历只服务到期的地图/信号标签遮挡，静止投影复用。`render-report.js` 从已有 canvas 证据导出 JSON，设置中的复制按钮无持续额外采样；帧率、p95 和 GPU 信息分别保留测量边界。详见 `docs/QA-V21-13.md`。

v21.19 处理卡顿的三个根因，详见 `docs/QA-V21-19.md`。星云与环境探针的体积着色器改为单一调用点（D3D 冷编译每个约 1 分钟 → 约 2 秒）；点光由 `immersive-light-rig.js` 固定灯位、环境探针固定 128、实例网格使用独立材质副本，场景切换不再生成新的着色器变体；后续内容在后台或显示前完成编译。GPU 按适配器分档：独显 `cinematic`（4×MSAA、全尺寸透射），集显 `balanced`（2×MSAA、透射 0.75），软件渲染 `light`（无 MSAA、透射 0.5），分辨率降到下限仍慢时才降档。透射缩放是对 r172 `transmissionResolutionScale` 的回移植，补丁由 `scripts/vendor-three-patches.mjs` 记录并在 `vendor-three.mjs` 重建时重放，`manifest.json` 同时保存上游与实际 SHA256。一次性音乐与音效另存 AAC（`.m4a`），不支持时回退 WAV；无缝循环的 Bed 保持 WAV。

v22 界面（未发布，缓存标识沿用 `cinematic-v21.19`）：界面外壳（导航、读数、按钮、步骤导轨、锁定圈、准星）用全息战术风格，旁白（序章字幕、欢迎、个人四章、星图标题与控制台、航行、到达、锁定和作品舱文字）放在透明玻璃上；只有 `cinematic` 档开启背景模糊，因为画布每帧都在变，模糊每帧都要重算。等宽字体 IBM Plex Mono 拉丁子集放在 `assets/vendor/ibm-plex-mono-5.3.0/`（OFL，清单含 SHA-256）。隐藏的界面部件不运行动画：SVG 子元素的 transform 动画在主线程推进，即使透明也会每帧重算样式并重新布局；状态点的闪烁跟随界面时钟每秒切换一次。第 0 批场景修正：星域小行星改为非金属岩石、星海玄武岩加紫色自发光底色、AI 影像入口圆环移到星舰左后方、轨道环导航灯改为琥珀色点光且镜头离环 16 个环单位以内时隐藏、序章航门细环改为金属。详见 `docs/VISUAL-PLAN-V22.md`。

## 2. Blender 工程与网站资产

### v21.12 陶瓷微表面与限定恒星接收

`immersive-surface-look.js` 保存两种陶瓷涂层的严格 JSON 参数及 .18 恒星接收比例。固定 MCP 操作 `polish_tem_refined_ceramic_light` 增量调整已保存原生工程的两个材质，加入仅照明 55 个受体的同方向恒星补光，保护 2,140 个已有对象的几何/矩阵及原主光。其他受体不受新补光影响。该关系属于显式电影布光，不能称为真实舱体遮挡。

GLB 只修改材质索引 6、7 的 JSON；全部二进制与其他 JSON 独立比对保持。当前 full / LOD 为 3,918,756 / 1,419,576 字节，三角形仍为 182,166 / 62,086，各 25 网格、5 个体积材质。浏览器 `bindSolarReceiver` 以每个实际摄像机的视空间太阳方向匹配共享恒星，只改变该方向光贡献，并添加有界解析微粗糙度；普通访问不新增渲染通道。共享材质编译钩子只安装一次，反射摄像机使用自己的太阳方向。

32 样本 Cycles 检查图 `tem-observatory-ceramic-light-01.png`、原生报告 `polish-ceramic-light.json` 和渲染报告 `render-ceramic-light-01.json` 保留在工程目录；备份为 `backup-ceramic-light-01`。当前 53 项交付摘要复核通过。原生噪声与网页微表面不同，不能保证逐像素一致。完整证据及仍未达标项目见 `docs/QA-V21-12.md`。

### 主行星与连续世界

`scripts/polish-tem-planetary-horizon.py` 通过固定 MCP 操作，增量调整三个现有工程中同名 Dawn、有限天气壳、大气壳及限定受体的天空补光。`immersive-planetary-look.js` 的严格 JSON 是共享尺寸与光学参数源。其他物体的顶点、面和矩阵有保护摘要；精修前文件位于 `blender/cinematic-v21/backup-horizon-01`。

网页导出的球体是绝对米坐标。`localizeAuthoredPlanetGeometry` 复制几何、应用父变换、移到局部中心并缩放到半径 34；拒绝错误的中心或尺寸。`createStarSea` 将该模型交给已有 orbital actor，隐藏重复源球体；主窗口和三个侧窗共享同一个局部几何，原天气和飞行系统继续工作。抵达、扫描、停靠期间保持同一外部球体。原生补光为明确的电影布光，原生和网页噪声、散射积分不保证逐像素一致。

仅 Dawn 从 Blender 临时选中导出再替换到两套星海 GLB。所有其他节点与网格二进制受保护；同拓扑再次精修时在私有缓冲区覆盖，避免文件不断追加。32 样本 Cycles 检视图 `tem-observatory-horizon-01.png` 为本地工程证据，不是网页背景。

| 可编辑工程 | 网站使用的产物 | 维护脚本 |
|---|---|---|
| `blender/cinematic-v21/tem-refined-optical-observatory.blend` | `assets/models/tem-refined-observatory-v21.glb`、`-lod.glb`、同名前缀 `.json` | `build-tem-refined-observatory-v21.py`、`polish-tem-cinematic-v21.py` |
| `blender/cinematic-v21/tem-refined-fleet.blend` | `assets/models/tem-refined-fleet-v21.glb`、`-lod.glb` | `build-tem-refined-fleet-v21.py`、`polish-tem-cinematic-v21.py` |
| `blender/cinematic-v20/tem-living-star-sea.blend` | `assets/models/tem-star-sea-v20.glb`、`-lod.glb`、`tem-star-sea-v20.json` | `build-tem-star-sea-v20.py` |
| `blender/cinematic-v18/tem-cinematic.blend` | `assets/models/tem-cinematic-deck.glb`、`tem-cinematic-display.glb`、`tem-cinematic-starport.glb` | `build-tem-cinematic.py`、`tem-cinematic-bake.py` |
| `blender/tem-identity.blend`、`blender/tem-observatory.blend` | 对应基础身份和观景舱 GLB | `build-tem-identity.py`、`build-tem-observatory.py` |

维护脚本位于 `scripts/`。表格列出的 GLB 是浏览器资源；`.blend`、Cycles 渲染、烘焙中间文件、验证报告和 MCP 任务记录位于 `blender/`，不作为网页运行入口。

模型加载表以 `assets/js/immersive-blender-assets.js` 为准。作品档案页的水晶标志另用 `assets/models/tem-identity-v21.glb`：`scripts/build-identity-model.mjs` 从观测站 LOD 中原样取出 `T_IDENTITY_V19` 子树（网格、材质扩展与节点变换不变），重导出观测站后需要重新运行。全精与 LOD 沿用同一世界坐标和语义节点：观测站保留 `CABIN_V19`、`T_IDENTITY_V19`、`SURFACE_FRAME_V19`、`EXTERIOR_V19`，舰队保留 `SHIP_0` 至 `SHIP_3` 的本地原点。重导出时不能把 Blender 摆拍位移写入这些节点，也不能把别的场景中星云或地面重复导出。

### v21.4 按场景加载（v21.7 保留）

欢迎页和个人空间概览使用当前观测站工程。历史身份仅在新观测站加载失败时请求；阅读玻璃展具在进入后续章节的镜头移动开始时请求；旧甲板与远方舱体在星图或真实失败回退时请求。完整资源保留，数据集中的 deferred 标记代表尚未请求，不能作为资源缺失判断。实际浏览和阻断模型回退验收见 `docs/QA-V21-4.md`。

### v21.6 光学源修正与工程检视

`polish-tem-cinematic-v21.py` 的 `optics-source-03` 阶段修正了 Blender 材质的导出接口。全精与 LOD 各有 5 个真实 `KHR_materials_volume` 扩展，分别对应 T 外层晶体、T 内层膜、压力屏正面、屏内层膜与平台透镜；几何、法线、索引、变换和语义节点保持原样。T 中央光学厚度约 2.98、衰减距离约 125 已进入 GLB，压力屏透射率约 .975。运行时保留这些外层光学参数及无限衰减距离，不再以旧的 2.36 / 18 上限覆盖源值。内层膜在运行时明确作为低不透明度薄膜处理，避免重复的实体透射。

Blender 对室内甲板使用 SUN 接收者排除的 light-link；浏览器在该地面材质中按太阳的实际视空间方向排除其直接光照，保留其他方向光、点光与环境反射。这里是显式布光关系，不是由舱体几何形成的真实遮挡。GLB 不包含灯光或 light-link，浏览器必须单独维持这项逻辑。

本轮最终 Cycles 检视图为 `blender/cinematic-v21/tem-observatory-optics-source-03.png`，实际渲染为 64 samples、1600 × 900；记录见 `render-optics-source-03.json`。该图用于工程比较，不作网页背景。源工程和上轮产物备份位于 `before-optics-source-03/`。

光学检查见 `blender/cinematic-v21/inspection-observatory-optics.json`。T 外壳与内层均无开放边，但保留了历史多重接触边，不能宣称为严格流形：

| 产物 | T 外壳 multiple edges | T 内层 multiple edges | 开放边 | strict manifold |
|---|---:|---:|---:|---|
| 全精 | 14 | 6 | 0 | 否 |
| LOD | 6 | 6 | 0 | 否 |

压力屏正面、屏内层膜和平台透镜的开放边与多重接触边均为零。验证报告的通过结论覆盖实际导出光学扩展、有限数、语义、未变更几何和闭合边界，不代表所有实体均达到严格流形拓扑。

### v21.7 展台分层与启动准备

`plinth-layer-04` 在原平台上加入 16 个陶瓷分段、实体导光夹层、连续承载环与 4 个压接件/4 组内嵌光源；肩部上抬 0.24，保持原透镜与世界坐标。全精 / LOD 为 3,918,876 / 1,419,696 字节，182,166 / 62,086 三角形，各 25 个网格和 5 个体积材质。T、屏框、外部场景共 16 个批次二进制几何及变换与备份一致。

22 个新承载/导光实体闭合且存在实际表面接触。报告 `inspection-plinth-engineering.json`、`inspection-plinth-layer-04.json`；实际 32 样本 Cycles 图 `tem-observatory-plinth-layer-04.png` 和记录 `render-plinth-layer-04.json` 均位于工程目录，不作网页背景。前轮工程备份为 `before-plinth-layer-04/`。

实时环境探针先复用主星云密度图集，以 `compileAsync` 准备体积着色器后首次捕获；首次成功绘制后才发布就绪并重置镜头时钟。`createFrameClock` 保留真实可见慢帧的墙钟证据，限制数值模拟步长。云海仅裁去原乘数严格为零的采样，非零路径质量参数不变。启动诊断与软件渲染证据见 `QA-V21-7.md`，不能将缓存预热样本当作首次启动或硬件性能结论。

## 3. 真实动态背景与离线图像的边界

### v21.9 首屏实体与镜面准备

`immersive-shader-preparation.js` 在关键模型有限等待后，按零时间步的真实首屏灯光与可见性，准备主场景、观测站补光和镜面薄玻璃三个组合。浅代理共用几何和材质，不重挂载来源物体。`compileAsync` 后逐程序完成 r161 延迟的 uniform/attribute 查询，每个程序间让出执行时间并保留失败诊断。升级 Three.js 时需要重新核对 `renderer.properties` 和程序接口。

镜面预编译与真实反射共用 `materialForCapture` 缓存；首次成功绘制后仍由主循环发布场景就绪并重置开场时钟。画质参数不变。采样、缓存影响、实际序章验证和软件渲染限制见 `docs/QA-V21-9.md`。

### v21.8 星云材质与统一构图

`scripts/polish-tem-stellar-medium.py` 通过项目本机 MCP 的固定 `polish_tem_stellar_medium` 操作，在保存的 v20 星海和 v21 观测站中各精修五个已有星云材质，保留所有几何及物体矩阵。共享数值源 `assets/js/immersive-stellar-medium.js` 是严格 JSON 对象；Blender 只解析该对象，网页将参数用于公共密度和发光 GLSL。两个渲染器的原生噪声和光照算法不同，不能声明逐像素相同。

工程备份为 `blender/cinematic-v21/before-stellar-filament-01/`，报告 `polish-stellar-medium.json`。最终 32 样本 Cycles 图为 `tem-observatory-stellar-filament-01.png`，记录 `render-stellar-filament-01.json`；实际 481.01 秒，未用作网页背景。首次体积混色优化崩溃已通过逐通道等价插值修复并复渲确认。

`archivePose` 现在完整持有章节升降、轻微变焦及窄桌面取景，导航不再覆盖 FOV。构图回归读取真实全精/LOD 顶点，检查压力屏和 T 共同入镜。屏内倍率按镜头补偿，世界表面保持原坐标。实际英文概览完整标语已位于滚动区内；证据与性能限制见 `docs/QA-V21-8.md`。

本机只读设备检查检测到 Iris Xe 与 RTX 3070 Laptop GPU，但当前预览实际报告 Microsoft Basic Render Driver。不能以设备列表推断浏览器已硬件加速，也不能用软件预览的结果宣称目标显卡流畅度通过。没有更改系统图形设置。

星海的结构由 Blender 建立，并导出行星、碎石、设施、流线及体积区域信息。网页继续实时计算三维星云密度、粒子位置、光流和相机/指针响应。新星海 GLB 与 v21 观测站导出不包含图片，`tem-star-sea-v20.json` 声明环境图片依赖为零。

网站仍保留作品封面、视频、诗稿原图和旧版烘焙法线/ORM 等必要图像；“星海不用图片”不能解释为删掉所有网站图像。历史 `cosmos-nebula-*.png` 文件存在也不代表当前 WebGL 背景正在加载它们。

Cycles 的灯光、折射和多次反弹用于离线质量比较。网页使用实时 PBR、体积光、局部反射捕获和后期合成；DOM 文字与后合成体积雾不全部进入地面反射。这套渲染不是浏览器内完整路径追踪，当前模型细节、星云构图与概念图仍有差距。

### v21.6 场景、粒子与后处理目标

| 阶段 | 渲染目标 | 覆盖与深度 |
|---|---|---|
| `SceneTargetPass` | 独立 HalfFloat HDR 主场景目标 | 目标为 4× MSAA，保留独立深度纹理；实际样本数受设备 `maxSamples` 限制 |
| `NebulaPass` | 单采样体积目标及颜色合成目标 | 读取已解析的主场景颜色/深度，保持体积的场景遮挡 |
| `ParticleLayerPass` | 独立 HalfFloat HDR 粒子目标 | 目标为 4× MSAA，实际沿用主场景可用样本数；无深度附件，以主场景深度纹理手动裁剪粒子 |
| Bloom / Output / Film 等颜色后处理 | 单采样颜色目标 | 读取解析后的结果，不重复对全屏颜色通道作 MSAA 解析 |

主场景几何与延后绘制的粒子仍保留原有多重采样覆盖。粒子目标从黑色、零 alpha 开始，以原材质的加法混合积累 RGBA，再与体积合成结果相加；不再次乘 alpha，也不将粒子几何绘入后处理颜色目标。主场景深度在后续合成中保持独立，避免采样正在写入的同一附件。

`immersive-crystal-volume.js` 在真实 T 网格内限定横梁和竖干两个有限腔体，每腔 16 步积分，使用星海共用的程序生成三维 density atlas。射线、粒子及内部流光在世界/模型空间计算；atlas 不是背景图片。`onBeforeRender` 按实际绘制摄像机更新局部 eye 与模型逆矩阵，因此主视图和镜面摄像机分别使用正确视点。该处理仍是实时有限积分，并不等同于完整的多次散射路径追踪。

`immersive-crystal-look.js` 是晶体的严格 JSON 数值源。固定 MCP 操作 `polish_tem_refined_crystal_medium` 在保存的原生工程内增加两个父级绑定的动画体积域，保护已有几何与变换，不改动网页 GLB。运行时在既有实体内积分同一尺寸与光谱方向；Blender 原生噪声和光传输不同。`?profile=shader` 可采集驱动警告与实际源码，普通访问不包装 WebGL。星云合成器对没有 mip 链的渲染目标使用显式 LOD 0，避免分支与滤波循环中的隐式导数警告。

## 4. 本机 MCP

`scripts/blender-mcp/server.mjs` 与 `client.mjs` 提供项目范围内的本机 MCP 1.5.0。客户端通过 stdio 启动服务，后台 Blender 只执行项目固定脚本；不依赖手动安装 BlenderMCP 插件。

```powershell
npm run blender:info
node scripts/blender-mcp/client.mjs list
node scripts/blender-mcp/client.mjs get_tem_job refined-observatory-polish
node scripts/blender-mcp/client.mjs get_tem_job refined-fleet-render
```

`get_tem_job` 的最后参数是任务名。建模、精修、渲染命令会写工程和导出，不属于只读操作；同一资产应等上一任务结束再启动新任务。任务 JSON、stdout/stderr 日志和协议记录保存在对应 `blender/cinematic-v*/` 文件夹。任务已启动不能视为完成，须检查最终状态、产物和实际渲染。

## 5. 本地字体与图形依赖

- `assets/vendor/three-0.161.0/`：固定 Three.js r161 核心与实际使用的扩展、MIT 许可证和 SHA256 清单。`scripts/vendor-three.mjs` 为重建工具；正常浏览无需访问外部图形 CDN。
- `assets/fonts/`：4 个中英 WOFF2 子集、OFL 许可证和覆盖清单。`assets/css/fonts.css` 是生成文件。
- `Tem Interface` 为界面无衬线字体，保留 100–900 可变字重；`Tem Narrative` 为叙事衬线字体，保留 200–900 可变字重。少数源字体不支持的符号/emoji 使用系统回退。
- `scripts/build-fonts.py` 依赖 `fonttools==4.66.1` 与 `brotli==1.2.0`，项目本地依赖目录为 `.tools/python`。默认读取本机 Noto Sans SC / Noto Serif SC；可用 `--sans`、`--serif` 指定源字体。文本修改后先生成页面，再检查/重建子集。

## 6. 工程、归档与发布范围

| 目录 | 用途 | 维护要求 |
|---|---|---|
| 页面、`assets/`、`scripts/`、`templates/`、`tests/` | 运行、生成、校验源码 | 保持完整引用关系 |
| `blender/` | 可编辑工程、烘焙、渲染、任务与验证报告 | 当前工程和历史工程都保留；不作网页入口 |
| `_archive/` | 概念图、参考帧、旧源码与截图 | 本地归档，不作当前效果证据 |
| `docs/source/` | 原始简历等内容依据 | 不作为个人网站下载附件 |
| `.workbuddy/` | 本地服务日志与工具资料 | 不发布 |
| `.tools/` | 本地制作依赖 | 不发布 |

父目录保留 Git 仓库与宿主工具目录。此轮以完善现有结构为目标，未移动、删除或重构工程。`.gitignore` 当前排除了 Blender 工程及资料归档；工程交付/备份须包含这些本地文件，不能仅凭 Git 仓库已提交判断 `.blend` 已备份。

## 7. 2026-10-09 验证快照

- Node.js 全套验收以 `docs/QA-LATEST.md` 的本轮记录为准；实际读取 Git 已追踪文件清单，未使用旧发布快照。
- v21 观测站全精/LOD：182,166 / 62,086 三角形，25 个网格，零内嵌图片；唯一反射地面、实体 T、曲面压力玻璃均无开放边。T 外壳/内层的历史多重接触边与严格流形限制见上表。
- v20 星海全精/LOD：64,132 / 40,452 三角形，6 个体积区域、5 条流线、环境图片依赖为零；坐标、有限数、法线和语义节点检查通过。
- `audit-assets.mjs`：71 项资源，63 项在扫描语料中有引用，8 项未被匹配。脚本是文件名文本搜索，会把自己的清单计为引用；也不覆盖所有字体/依赖/工程引用，因此不能直接作为删除许可。
- 舰队最终全精 / LOD 为 201,992 / 122,226 三角形、各 24 个网格；全部玻璃与陶瓷压力壳无开放边，保留的 40 枚散热鳍片已接入 8 组槽与支座。实际检查见 `blender/cinematic-v21/validation-fleet.json`、`inspection-floating-details.json`。
- 当前浏览器报告 `ANGLE / Microsoft Basic Render Driver`。此时的画面与计时属于软件渲染环境，硬件 GPU 的性能尚未验收；不能据此宣称完整画质已经达到目标帧率。
- 本轮浏览器与自动验收记录见 `docs/QA-LATEST.md`；自动检查不替代真实视觉验收。当前画面尚未达到概念图质量目标，也尚未完成硬件流畅度验收。

历史日志中的旧测试总数、页面跳转行为和尺寸/帧率只代表当时版本。以当前源码、二进制验证结果和本轮真实浏览器证据为准。
