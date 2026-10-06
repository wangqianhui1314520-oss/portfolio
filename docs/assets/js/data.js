/* ============================================
   作品集数据源 —— 后续只需修改本文件
   ============================================ */

window.PORTFOLIO_DATA = {
  /* ---------- 个人资料 ---------- */
  profile: {
    name: "Tem",
    enName: "Wang Qianhui",
    cnName: "王乾辉",
    title: "游戏开发 / 物联网应用技术",
    tagline: "理解过去，生活当下，畅想未来。",
    location: "江苏",
    intro:
      "我是 Tem，喜欢从历史中理解人，从文学中感受生活，也从科幻中想象未来。我写诗，设计游戏，探索 AI 与交互技术，愿意把好奇与思考变成可以被阅读、被体验的作品。",
    persona: {
      origin: "Tem 取意于古埃及创世神 Atum。对我而言，它寄托着从无到有、圆满自主的愿望。",
      motto: "尽人事，已安俟天命。",
      outlook: "认真做好能够把握的事，也给未知与变化留出空间。",
      interests: [
        { name: "历史", text: "理解时代中的人，以及选择如何留下回响。" },
        { name: "文学", text: "留意语言、情感与生活细节，用文字记录所感。" },
        { name: "政治", text: "关注制度、权力与公共事务中的选择和影响。" },
        { name: "哲学", text: "追问自我、意义与行动，思考如何安顿自己。" },
        { name: "科幻", text: "在宇宙尺度和未知技术中，想象人类的可能。" },
        { name: "策略", text: "观察局势与因果，在约束中推演不同路径。" }
      ],
      curiosity: "我也喜欢新奇的科幻事物：未知的世界、未来的技术，以及新的表达方式。这样的好奇，也延伸进我的游戏、影像和技术实验。"
    },
    readings: [
      { title: "童年的底色", books: ["淘气包马小跳", "笑猫日记"], summary: "善意、真诚与对生活的感受。", reflection: "这些从小陪伴我的故事，帮助我形成最初的是非判断与价值观，也让我珍惜善意、真诚，以及人与人之间的理解。" },
      { title: "理解过去", books: ["明朝那些事"], summary: "从人物与故事走进历史。", reflection: "《明朝那些事》让我对历史产生了浓厚的兴趣。我开始想了解时代中的人，他们面临怎样的处境，又为什么作出那些选择。" },
      { title: "畅想未来", books: ["三体"], summary: "看见人类的渺小，也看见智慧。", reflection: "《三体》让我看到人类在宇宙面前的渺小，也看到人类所蕴含的智慧。这种尺度上的变化，让我对未知保持好奇，也重新思考人的处境与可能。" },
      { title: "回到行动", books: ["毛选"], summary: "梳理思路，把理解带入实践。", reflection: "阅读《毛选》让我逐渐摒弃过去的杂念，尝试融会贯通，把理解与实际行动连接起来，践行知行合一。" }
    ],
    avatar: "",
    award: "腾讯云黑客松大赛 · 华东赛区优胜奖",
    // 提炼自《王乾辉简历.pdf》（2026-09-27 版本），用于沉浸式创作者档案。
    resume: {
      focus: "AI 原生游戏策划 / 产品策划 / AI 应用开发",

      headline: "让创意拥有机制，让世界真正运行。",
      summary: "我以游戏策划为起点，把玩法、叙事与 AI 系统连接起来。从需求分析、原型设计到开发部署，亲手推进一个想法成为可以被体验的作品。物联网与嵌入式技术，是我关注实现细节与交付质量的技术基础。",
      capabilities: [
        { code: "01 / GAME SYSTEMS", title: "设计可玩的规则", text: "从核心循环、数值框架到关卡与多结局，让玩家的选择产生可理解、可持续的后果。", tools: ["玩法 / 系统策划", "GDD", "Godot", "RPG Maker MV", "Playtest"], evidence: "ming", proof: "10 角色 × 5 步骤的交互框架" },
        { code: "02 / AI ENGINEERING", title: "让 AI 进入真实系统", text: "构建本地模型、RAG 与智能体应用；用规则约束叙事，以接口、鉴权和部署完成产品交付。", tools: ["Python / FastAPI", "Dify / Ollama", "RAG / Agent", "Docker", "WebSocket"], evidence: "zhihu", proof: "单人、2–5 人联机与剧本生产工作台" },
        { code: "03 / NARRATIVE & FILM", title: "为技术注入情感", text: "从世界观与角色设定，到 AI 图像、配音与视频剪辑，把故事转化为完整的视听体验。", tools: ["多分支叙事", "ComfyUI", "IndexTTS", "ffmpeg / PR / AE"], evidence: "kun", proof: "16 角色叙事与按角色生成的配音" },
        { code: "04 / INTERACTIVE PRODUCTS", title: "连接屏幕与现实", text: "以物联网与嵌入式为基础，设计交互式教学产品，把知识拆成可以操作、验证的学习路径。", tools: ["Vue 3 / TypeScript", "ESP32 / STM32", "Wokwi", "课程设计"], evidence: "esp32-learn", proof: "13 个模块 / 47 章节的学习路线" }
      ],
      experience: [
        { period: "2026.05 — 至今", kind: "工作室 / AI 产品", title: "腾魄斯特软件开发工作室", role: "负责人 · AI 工程 / 产品落地", text: "交付本地大模型与 IT 故障诊断智能体；搭建「乾坤 token 云」，实现多厂商接入、鉴权、Key 池调度、配额与多租户调用计费。" },
        { period: "2025.07 — 2025.12", kind: "实习 / 工程研发", title: "长盈精密", role: "高速连接器研发助理工程师 · AI 服务器方向", text: "整理 200+ 份技术资料，跟进 5+ 新品研发，采集清洗 1,000+ 实测数据；参与模治具验证、样品测试、工程图纸与 BOM 校对。" },
        { period: "2024.07 — 2025.08", kind: "创业 / 玩家运营", title: "阳明电竞工作室", role: "创始人 · 玩家运营 / 社群策划", text: "组织 SLG 千人级联盟与大型活动，从零搭建游戏电竞服务，累计服务 300+ 客户；将玩家反馈与内容运营连接起来。" },
        { period: "2024.07 — 2025.08", kind: "自由职业 / 技术服务", title: "线上 IT 技术服务", role: "独立技术服务 · 客户交付", text: "独立完成需求确认、工期规划与交付；提供 PC 故障排查、Windows 部署、驱动与软件冲突修复。" }
      ],
      recognition: [
        { kind: "获奖", title: "腾讯云黑客松 · 华东赛区第 5 名", text: "2026 /《元末逐鹿》团队作品 · 华东赛区优胜奖" },
        { kind: "完赛", title: "翌光计划 Game Jam · 通关双证", text: "2026 / 团队作品 ReBirth ＋ 独立作品《生长档案》" },
        { kind: "参赛", title: "知乎黑客松 · 校园新锐季", text: "2026.09 /《求真档案局·看山失踪夜》参赛凭证" },
        { kind: "参赛", title: "AdventureX 2026", text: "2026.07 / 情感智能体框架《秘境引擎》· 5 天独立原型" },
        { kind: "认证", title: "阿里云 ACA · 大模型认证", text: "2026 / Alibaba Cloud Certified Associate · LLM" }
      ],
      otherCredentials: ["CET-4", "全国计算机一级", "SYB 创业培训", "CAAC 轻型无人机安全操控资质"]
    },
    links: [
      { label: "邮箱", url: "mailto:3171678809@qq.com" },
      { label: "Gmail", url: "mailto:wangqianhui1314520@gmail.com" },
      { label: "抖音 · 1779807797", url: "https://www.douyin.com/search/1779807797?type=user" },
      { label: "手机 · 18361620821", url: "tel:18361620821" }
    ]
  },

  /* 原创诗歌：以作者提供的四张原稿为依据；日期优先采用文末署日期。 */
  poetry: {
    title: "乾元诗集",
    author: "Tem · 王乾辉",
    description: "以古典意象写当下的感受。三十余首原创诗篇，先选四首，记录情感、时光与人生中的思考。",
    totalLabel: "三十余首原创 · 四首精选",
    poems: [
      { id: "san-tan-fu-sheng", title: "三叹浮生", date: "2026-05-28", dateLabel: "2026.05.28 · 原稿记录", theme: "人生与自省", image: "assets/poems/san-tan-fu-sheng.jpg", paragraphs: [
        "幸承顾财东雅邀，临小桥流水，览风物清嘉。三酌琉璃佳酿，百感交集。",
        "一叹情之缘。昔尝叩问苍穹，良缘安在？天有定数，未至秋期，难遇知心之人。自古伤情者多为情殇，天之道损有余而补不足，孽缘萦怀，俗念难泯。然终待花好月圆，得遇佳偶。",
        "二叹仕之途。尝投石问路，仰问苍天。幸而出世入世皆逢贵人相助。但尽人事，安俟天命，坚守本心，循序而行，终可登高致远。",
        "三叹命之数。试问苍穹，命数何如？流光不居，岁不我与，中年多逢困顿灾厄。躲天意，避因果，诸般枷锁困真我；顺天意，承因果，今日方知我是我。断绝俗果，修身守心，方能享天年之乐。",
        "谚云：命里有时终须有，命中无时莫强求。求得三事皆为定数，毋逆天命，顺循因果。沉心守拙，自能众望相扶。"
      ] },
      { id: "wu-ti-si", title: "无题（四）", date: "2025-12-10", dateLabel: "2025.12.10 · 文末署日", theme: "风雨与感怀", image: "assets/poems/wu-ti-si.jpg", paragraphs: [
        "微风细雨育万物，随风飘雪潜人心\n犹记伟人柔似水，只叹苍龙缚长缨"
      ] },
      { id: "meng-jun-ling", title: "梦君令", date: "2025-09-04", dateLabel: "2025.09.04 · 文末署日", theme: "梦境与相思", image: "assets/poems/meng-jun-ling.jpg", paragraphs: [
        "画天酒，醉思梦。重觅仙君难相逢。嫣然一笑解吾愁。吾弹琴瑟君舞凤，恍若海棠飘纱一丝逐天流。",
        "怨郎诗，白龙吟。偏遇文君徒得闻，泣下沾襟添吾恨，吾披简信君喃啼，奈何年华飘逝一世断芳尘。",
        "明月皎，清风拂，凝眸月君常冥思，怅然若失殇吾魂，吾非长卿君非文，只息佳人飘渺一偶惜缘深。"
      ] },
      { id: "ye-ou-ran-si-xu", title: "夜偶然思绪", date: "2021-05-27", dateLabel: "2021.05.27 · 文末署日", theme: "旧事与时光", image: "assets/poems/ye-ou-ran-si-xu.jpg", paragraphs: [
        "昨夜随风巧碰书信，纸砂硬，拨心琴，不免重进相思境。春娇与志明，三年兮，终是分道俩人行。",
        "明日潜梦熟遇旧识，唢呐铃，震耳鸣，怕是初出桃花郡。蕙仙别务观，十纪情，有《钗头凤》消磨尽。"
      ] }
    ]
  },

  /* ---------- 作品列表（按你想展示的顺序排）----------
     sector   沉浸式星域：forge 游戏 / lumen AI影像 / echo 文学 / nexus 技术实训
     type     类型标签，自由填写：游戏 / 参与 / 设备 / 小说 / 视频 ...
     cover    封面图路径，留空显示占位框
     ratio    封面比例，默认 "16 / 9"，竖屏视频用 "9 / 16"
     play     试玩配置：
                { type: "iframe",   url: "..." }  站内弹窗直接玩
                { type: "external", url: "..." }  新窗口打开
                { type: "none",     url: "" }     仅展示
     highlights  亮点条目（可选）
     specs       参数表（可选）
     excerpt     摘录段落（可选，小说类用）
     links       外链按钮（可选）
  */
  works: [
    {
      id: "ming",
      contribution: { period: "2026.08 — 至今", role: "独立开发 · 剧情 / 系统策划", actions: ["搭建 10 角色 × 5 步骤交互框架，组织人物、物品与地点之间的关系。", "设计多分支叙事与 9 档结局，以 Agent、记忆、时间线与一致性约束驱动角色对话。"], outcome: "基于 Godot 持续迭代；腾讯游戏创作大赛参赛作品。" },
      sector: "forge",
      type: "游戏",
      title: "大明王朝 1566：天下棋局",
      subtitle: "Godot 4 · 单机叙事策略",
      cover: "assets/covers/ming-kv.jpg",
      year: "2026",
      role: "主创",
      status: "第 1 章已发布",
      stack: ["Godot 4", "GDScript"],
      desc: "以政治抉择驱动的明代叙事策略游戏。核心承诺：每个选择都产生可理解、角色特有、可持续的后果。",
      highlights: ["10 角色 × 5 步骤 = 50 route steps", "21 人物 / 48 物品 / 33 地点", "11 段教程引导"],
      specs: [],
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "yuanmo",
      contribution: { period: "2026.06 — 2026.07", role: "团队主创 · 产品策划 / 核心玩法设计", actions: ["负责核心玩法、数值框架与商业化逻辑，推进从立项到内测的完整流程。", "参与架构打磨与部署，完成商业逻辑梳理、路演材料及现场展示。"], outcome: "作品已完成；团队获腾讯云黑客松华东赛区第 5 名 / 优胜奖。" },
      sector: "forge",
      type: "游戏",
      title: "元末逐鹿",
      subtitle: "v3.0 · 网页策略",
      cover: "assets/covers/yuanmo-factions.jpg",
      year: "2026",
      role: "主创 / 全栈",
      status: "已完成 · 腾讯云黑客松华东赛区优胜奖",
      stack: ["Vue 3", "Canvas2D", "Three.js", "FastAPI"],
      desc: "多派系博弈的元末乱世策略游戏，含局势推演引擎、双结局与三条自定义势力国策路径。自然语言即操控，活的乱世沙盘。",
      highlights: [
        "腾讯云黑客松大赛 · 华东赛区优胜奖",
        "自然语言即操控 · 活的乱世沙盘",
        "多派系博弈系统",
        "局势推演引擎",
        "双结局 + 3 条国策路径"
      ],
      specs: [],
      video: "assets/videos/yuanmo.mp4",
      play: { type: "external", url: "https://qiankuntokenyun.cn" },
      links: []
    },
    {
      id: "epoch",
      contribution: { period: "2026.09", role: "独立创作 · 编剧 / AI 视频生成 / 剪辑", actions: ["完成科幻短剧脚本、AI 图像与视频素材生成，组织镜头并剪辑成片。", "以低成本 AI 制作流程，验证从脚本到发布的完整内容生产链路。"], outcome: "已发布两期作品至抖音；pavo0 低成本 AI 短剧创作大赛参赛作品。" },
      sector: "lumen",
      type: "AI 影像",
      title: "机械纪元：人类余烬",
      subtitle: "AI 科幻短剧 · 编剧与剪辑",
      cover: "assets/covers/epoch-cover.jpg",
      year: "2026",
      role: "主创 / 导演",
      status: "已参赛 · Demo 完成",
      stack: ["AI 图像 / 视频生成", "视频剪辑"],
      desc: "以 AI 图像与视频生成、镜头组织和剪辑完成的科幻短剧。两期作品已发布于抖音，探索从脚本到成片的低成本创作流程；参赛 pavo0 AI 短剧创作大赛。",
      highlights: [
        "PAVO 0 成本 AI 短剧创作大赛 · AI 融合创新赛道",
        "两期作品已发布于抖音",
        "独立完成编剧、AI 生成与剪辑",
        "AI 全链路出片"
      ],
      specs: [],
      video: "assets/videos/epoch.mp4",
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "growth",
      contribution: { period: "2026.09", role: "独立开发 · 策划 / 设计 / 实现", actions: ["在 48 小时内设计并实现「线索 → 解谜 → 揭示」的 ARG 核心循环。", "独立完成网页交互、叙事设计与可游玩版本交付。"], outcome: "作品发布于 itch.io；获得翌光计划 Game Jam 通关证书。" },
      sector: "forge",
      type: "游戏",
      title: "生长档案",
      subtitle: "Global Game Jam 2026 · 网页叙事解谜",
      cover: "assets/covers/growth-kv.jpg",
      ratio: "16 / 9",
      year: "2026",
      role: "独立开发",
      status: "已完成",
      stack: ["原生 HTML / CSS / JS", "无引擎 · 无依赖"],
      desc: "「有些事，不说出来，就永远没人知道了。」以 2009 年 QQ 空间为入口的叙事互动游戏。玩家扮演「拾光客」，在复古界面的六章中翻相册、听录音、查档案，拼回一位失忆者被偷走的成长，直面五重结局。",
      highlights: [
        "GGJ 2026 · 翌光计划（武汉全球高校游戏创作挑战赛）",
        "核心机制：现实时间 == 游戏时间",
        "六章主线 · 五重结局 · 约 60–90 分钟",
        "QQ 空间 / 医院档案 / 信号监听等多章节叙事"
      ],
      specs: [
        { k: "平台", v: "Web 浏览器直接运行" },
        { k: "技术栈", v: "原生 HTML / CSS / JS" },
        { k: "素材", v: "28 图 / 8 音频 / 8 视频" }
      ],
      video: "assets/videos/growth.mp4",
      play: { type: "external", url: "https://tempestwang.itch.io/growth-archive" },
      links: [{ label: "itch.io 页面", url: "https://tempestwang.itch.io/growth-archive" }]
    },
    {
      id: "rebirth",
      contribution: { period: "2026.09", role: "团队开发 · 游戏策划 / 测试", actions: ["参与 48 小时 Game Jam，以 RPG Maker MV 搭建科幻解谜原型。", "负责玩法与关卡、异化设施与编号实验体的叙事落地，建立 Playtest 清单并跟进体验缺陷。"], outcome: "团队作品发布于机核 GCORES；获得翌光计划 Game Jam 通关证书。" },
      sector: "forge",
      type: "游戏",
      title: "Rebirth 重生",
      subtitle: "RPG Maker MV · 科幻解谜",
      cover: "assets/covers/rebirth-cg.jpg",
      year: "2026",
      role: "团队开发 · 游戏策划 / 测试",
      status: "已发布",
      stack: ["RPG Maker MV", "JavaScript", "nw.js"],
      desc: "你从实验室培养皿中苏醒（系统提示「已唤醒实验对象」），在逐渐异化的设施中探索逃亡：墙壁血字、监控红灯、积液与血管组织逐渐蔓延。沿途遭遇编号实验体——03号（视觉敏锐）、07号、13号（无眼，靠嗅觉）、42号，最终面对模仿你一切的 99号母体。",
      highlights: [
        "实验室逃亡 × 逐步异化的设施叙事",
        "五种编号实验体遭遇战，各具感知特性",
        "最终决战：模仿你一切的 99号母体"
      ],
      specs: [
        { k: "平台", v: "Windows 桌面端 · 816 × 624" },
        { k: "类型", v: "解谜 / 科幻" }
      ],
      video: "assets/videos/rebirth.mp4",
      play: { type: "external", url: "https://www.gcores.com/games/181588" },
      links: [{ label: "机核主页", url: "https://www.gcores.com/games/181588" }]
    },
    {
      id: "kun",
      contribution: { period: "2026.08 — 2026.09", role: "团队创作 · 剧情 / 系统策划 / 音频", actions: ["构建 16 角色设定与多线叙事，将嗜睡症科普融入视觉小说。", "使用本地 IndexTTS 2.5 按角色、按句生成配音，完成叙事音频生产。"], outcome: "作品已完成；作为腾讯游戏创作大赛「小红花作品」参展。" },
      sector: "forge",
      type: "游戏",
      title: "困",
      subtitle: "视觉小说游戏 · 罕见病教育",
      cover: "assets/covers/kun-cover.jpg",
      year: "2026",
      role: "团队创作 · 剧情 / 系统策划 / 音频",
      status: "已完成",
      stack: ["视觉小说", "IndexTTS 2.5", "罕见病科普"],
      desc: "罕见病教育主题视觉小说游戏《困》，聚焦嗜睡症科普与人文关怀。构建 16 个角色完整设定驱动多线叙事，配音由本地 IndexTTS 2.5 按角色 / 按句切片生成；已作为腾讯游戏创作大赛「小红花作品」参展。",
      highlights: [
        "16 角色完整设定 · 多线叙事",
        "嗜睡症等罕见病科普与人文关怀",
        "本地 IndexTTS 2.5 按角色 / 句切片配音",
        "腾讯游戏创作大赛「小红花作品」参展"
      ],
      specs: [
        { k: "类型", v: "视觉小说 / 教育游戏" },
        { k: "角色", v: "16 角色设定" },
        { k: "音频", v: "本地 IndexTTS 2.5 零成本配音" }
      ],
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "novel",
      sector: "echo",
      type: "小说",
      title: "斗修天诀",
      subtitle: "玄幻 · 修炼",
      cover: "assets/covers/douxiu-cover.jpg",
      year: "连载中",
      role: "作者",
      status: "",
      stack: [],
      desc: "玄幻修炼长篇，配套完整的世界观、人物与修炼体系设定。",
      highlights: [],
      specs: [
        { k: "章节长度", v: "2800–3200 字" },
        { k: "星石品阶", v: "白 黄 青 蓝 紫 金 红" }
      ],
      excerpt: "夜色如墨，星辉垂落。少年立于断崖之巅，掌心那枚黯淡的白色星石忽然一颤——一缕比发丝更细的青芒，正沿着石纹缓缓爬升。品阶之别，天壤之分，白阶之上是黄，黄阶之上是青。而传闻中的黑，从来不入谱录。他攥紧星石，听见了体内第一声剑鸣。",
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "zhihu",
      contribution: { period: "2026.09", role: "独立开发 · 玩法 / 系统 / AI 架构", actions: ["设计污染对照、回声证据链、AI 法官辩论与阵营策反四套信息操纵机制。", "实现 10 档结局、8 个角色，以及单人、2–5 人联机与剧本生产工作台。"], outcome: "完成 48 小时开发；获颁知乎黑客松校园新锐季参赛凭证。" },
      sector: "forge",
      type: "游戏",
      title: "求真档案局·看山失踪夜",
      subtitle: "AI 网页剧本杀 · 知乎黑客松参赛作品",
      cover: "assets/covers/zhihu-cover.jpg",
      ratio: "16 / 9",
      year: "2026",
      role: "主创 / AI 叙事",
      status: "知乎黑客松参赛作品",
      stack: ["原生 Web", "LLM 驱动", "自然语言推理"],
      desc: "AI 驱动的网页剧本杀推理游戏。玩家化身「求真档案局」调查员，在「看山失踪夜」事件中通过自由对话与线索推演，逐步还原一桩被掩埋的失踪真相。叙事由 LLM 动态生成，每次推理走向都可能不同。",
      highlights: [
        "知乎黑客松参赛作品",
        "LLM 动态叙事 · 自由对话推理",
        "网页即开即玩 · 零安装",
        "多结局分支 · 线索驱动"
      ],
      specs: [
        { k: "平台", v: "Web 浏览器直接运行" },
        { k: "类型", v: "AI 剧本杀 / 互动推理" }
      ],
      video: "assets/videos/zhihu.mp4",
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "yiguang-cert",
      type: "作品证书",
      section: "work",
      title: "2026 翌光计划通关证书",
      subtitle: "武汉全球高校游戏创作挑战赛",
      cover: "assets/certificates/cert-growth.jpg",
      year: "2026",
      role: "参赛者 / 开发者",
      status: "已完赛",
      stack: ["Global Game Jam", "翌光计划"],
      desc: "2026 翌光计划（武汉全球高校游戏创作挑战赛）通关证书。两张证书分别对应《Rebirth 重生》Yaozi'team 队伍与《生长档案》腾魄斯特 / 王乾辉队伍。",
      highlights: [
        "Rebirth 重生 · Yaozi'team",
        "生长档案 · 腾魄斯特 / 王乾辉"
      ],
      specs: [
        { k: "赛事", v: "2026 翌光计划 · 武汉全球高校游戏创作挑战赛" },
        { k: "证书", v: "2 张通关证书" }
      ],
      images: [
        { src: "assets/certificates/cert-rebirth.jpg", caption: "Rebirth 重生 · Yaozi'team" },
        { src: "assets/certificates/cert-growth.jpg", caption: "生长档案 · 腾魄斯特 / 王乾辉" }
      ],
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "poetry",
      sector: "echo",
      collection: "poetry",
      type: "诗集",
      title: "乾元诗集",
      subtitle: "古风现代体 · 原创诗篇",
      cover: "assets/covers/poetry-cover.svg",
      year: "持续创作",
      role: "作者",
      status: "三十余首原创 · 四首精选",
      stack: ["诗歌", "古典意象", "个人表达"],
      desc: "以古典意象写当下的感受。这里先收录《三叹浮生》《无题（四）》《梦君令》《夜偶然思绪》四首代表作品，可阅读全文，也可查看原稿。",
      highlights: ["三十余首原创诗篇", "四首精选全文与原稿", "情感、时光与人生中的思考"],
      play: { type: "none", url: "" },
      links: [{ label: "阅读诗集", url: "poetry.html" }]
    },
    {
      id: "tencent-hackathon-ec",
      type: "作品证书",
      section: "work",
      title: "腾讯云黑客松华东赛区优胜奖",
      subtitle: "游戏开发挑战赛 · 华东区",
      cover: "assets/certificates/tencent-hackathon-ec.jpg",
      year: "2026",
      role: "获奖团队",
      status: "优胜奖",
      stack: ["腾讯云黑客松", "元末逐鹿"],
      desc: "腾讯云黑客松游戏开发挑战赛（华东区）优胜奖。参赛作品《元末逐鹿》在华东赛区评选中荣获优胜奖。",
      highlights: ["参赛作品《元末逐鹿》", "华东赛区优胜奖"],
      specs: [
        { k: "赛事", v: "腾讯云黑客松游戏开发挑战赛（华东区）" },
        { k: "奖项", v: "优胜奖" }
      ],
      images: [
        { src: "assets/certificates/tencent-hackathon-ec.jpg", caption: "腾讯云黑客松华东赛区优胜奖" }
      ],
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "zhihu-hackathon-cert",
      type: "作品证书",
      section: "work",
      title: "知乎黑客松·校园新锐季 参赛凭证",
      subtitle: "ZHIHU HACKATHON · Campus Rising Stars",
      cover: "assets/certificates/zhihu-hackathon-cert.jpg",
      year: "2026",
      role: "参赛者",
      status: "参赛凭证",
      stack: ["知乎黑客松", "求真档案局·看山失踪夜"],
      desc: "知乎黑客松「校园新锐季」参赛凭证（2026/9/19 颁发）。表彰在 48 小时极限开发中以 AI 共创知识社区新可能，参赛作品为 AI 网页剧本杀《求真档案局·看山失踪夜》。",
      highlights: [
        "48 小时极限开发",
        "以 AI 共创知识社区新可能",
        "参赛作品《求真档案局·看山失踪夜》"
      ],
      specs: [
        { k: "赛事", v: "知乎黑客松 · 校园新锐季" },
        { k: "证书", v: "参赛凭证（2026/9/19）" }
      ],
      images: [
        { src: "assets/certificates/zhihu-hackathon-cert.jpg", caption: "知乎黑客松·校园新锐季 参赛凭证 · 王乾辉" }
      ],
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "esp32-learn",
      contribution: { period: "2026.09", role: "独立开发 · 前端 / 课程设计 / 教学产品", actions: ["以 Vue 3 构建交互式教学站，接入 Wokwi 模拟器，实现零硬件在线学习。", "规划 13 模块 / 47 章节，设计交互接线图、自测与结业证书。"], outcome: "实训平台已上线知乎 AIWorks。" },
      sector: "nexus",
      type: "教学 / 实训平台",
      title: "ESP32 嵌入式实训平台",
      subtitle: "零硬件也能学的交互式教程",
      cover: "assets/covers/esp32-learn-cover.jpg",
      year: "2026",
      role: "独立开发",
      status: "已上线 · 知乎 AIWorks",
      stack: ["Vue 3", "Wokwi", "ESP32", "PlatformIO"],
      desc: "面向物联网 / 电子专业学生的交互式 ESP32 学习平台。把开发板装进浏览器——内置 Wokwi 在线模拟器、可交互接线图与实验室模拟台，零硬件、零后端、离线可用，从点亮一颗 LED 一路学到把 ESP32 接上 AI。",
      highlights: [
        "13 模块 / 47 章节 · 约 10.6 小时渐进式学习路线",
        "内置 Wokwi 模拟器 + 交互接线图 · 改代码即时看现象",
        "实验室模拟台 · 24 种元件 + AI 语音控灯",
        "闯关自测 + 结业证书 · 进度本地保存",
        "纯静态 Vue 3 · 零后端 · 离线可用"
      ],
      specs: [
        { k: "平台", v: "Web 浏览器直接运行" },
        { k: "技术栈", v: "Vue 3 / Wokwi / ESP32" },
        { k: "内容", v: "13 模块 · 47 章节 · 24 元件" }
      ],
      play: { type: "external", url: "https://ybqru2c8ouvs.preview.aiworks.site/" },
      links: [{ label: "知乎 AIWorks 预览", url: "https://ybqru2c8ouvs.preview.aiworks.site/" }]
    }
  ]
};

// International presentation is part of the same editorial source as the Chinese originals.
window.PORTFOLIO_DATA.international = {
  featured: ['growth', 'yuanmo', 'zhihu'],
  languages: {ming:'zh',yuanmo:'zh',epoch:'zh',growth:'zh',rebirth:'zh',kun:'zh',novel:'zh',zhihu:'zh',poetry:'zh', 'esp32-learn':'zh'},
  caseStudies: {
    ming: {
      zh: {challenge:'让政治选择产生有规则、有记忆的后果，而不仅是一段生成的对话。',context:'以明代政治叙事为背景，连接人物、物品与地点。项目基于 Godot 持续迭代，参加腾讯游戏创作大赛。',
        decisions:[{title:'先搭建可推演的世界',text:'用 10 角色 × 5 步骤组织交互框架；21 人物、48 物品与 33 地点构成叙事所依赖的世界结构。'},{title:'让 AI 表演，让规则裁定',text:'NPCAgent、MemorySystem、Timeline 与 ConsistencyGuard 配合约束角色对话；多分支叙事与九档结局让选择延续到后续体验。'}],facts:['独立开发 / 叙事与系统策划','10 角色 × 5 步骤','持续迭代中的 Godot 项目']},
      en: {challenge:'Give political decisions consequences that follow rules and remember the player’s choices.',context:'Set in Ming-era China, the project connects characters, objects, and places. Development continues in Godot; the project entered a Tencent game-creation competition.',
        decisions:[{title:'Build a world that can respond',text:'Ten characters and five interaction steps organize the framework. Twenty-one people, forty-eight items, and thirty-three locations form the world behind the narrative.'},{title:'Let AI perform; let rules decide',text:'NPCAgent, MemorySystem, Timeline, and ConsistencyGuard constrain character dialogue. Branching narrative and nine ending tiers carry decisions into later play.'}],facts:['Solo development / Narrative & systems','10 characters × 5 steps','Godot project in active development']}
    },
    rebirth: {
      zh: {challenge:'在限时开发中，把设施异化与实验体遭遇组织成可游玩的科幻解谜。',context:'武汉翌光计划 Game Jam 团队作品，使用 RPG Maker MV 制作可玩原型，已发布机核。我的职责为游戏策划与测试。',
        decisions:[{title:'以环境推进叙事',text:'玩法和关卡围绕异化设施与编号实验体展开，让探索中的环境变化承载故事。'},{title:'在限时创作中保留测试',text:'建立 Playtest 清单，记录并跟进体验缺陷，在 48 小时团队协作中推进可游玩版本交付。'}],facts:['团队作品 / 游戏策划与测试','48 小时 Game Jam','已发布机核'],proof:'assets/certificates/cert-rebirth.jpg'},
      en: {challenge:'Turn a transforming facility and experimental subjects into a playable science-fiction mystery within a game jam.',context:'A team project for the Wuhan Yiguang Game Jam, prototyped in RPG Maker MV and released on GCORES. My role was game design and testing.',
        decisions:[{title:'Tell the story through the environment',text:'Gameplay and levels revolve around the changing facility and numbered experimental subjects, allowing exploration to carry the story.'},{title:'Make time for testing',text:'A playtest checklist tracked experience defects and follow-up work during the 48-hour team development process.'}],facts:['Team project / Game design & testing','48-hour game jam','Released on GCORES'],proof:'assets/certificates/cert-rebirth.jpg'}
    },
    kun: {
      zh: {challenge:'通过角色与声音，把嗜睡症主题转化为可以体验的叙事。',context:'团队创作的罕见病教育视觉小说。我的工作包括剧情、系统策划与音频，作品已完成并作为腾讯游戏创作大赛「小红花作品」参展。',
        decisions:[{title:'用多条人物线索组织故事',text:'构建十六个角色与多线叙事，把科普主题放进人物经历与叙事结构中。'},{title:'让音频跟随角色与台词',text:'使用本地 IndexTTS 2.5，按角色与句子生成配音片段，形成可用于视觉小说的叙事音频。'}],facts:['团队创作 / 剧情、系统与音频','16 角色 / 多线叙事','已完成 / 腾讯游戏创作大赛参展']},
      en: {challenge:'Bring a story about hypersomnia to life through characters and voice.',context:'A team-created educational visual novel. My work covered narrative, systems design, and audio. The completed project appeared in Tencent’s “Little Red Flower” game-creation showcase.',
        decisions:[{title:'Organize the story around people',text:'Sixteen character profiles and multiple storylines connect the educational theme to individual experiences and the narrative structure.'},{title:'Build voice around characters and lines',text:'Local IndexTTS 2.5 generated voice clips by character and sentence, providing narrative audio for the visual novel.'}],facts:['Team project / Narrative, systems & audio','16 characters / Multiple storylines','Completed / Tencent showcase participant']}
    },
    epoch: {
      zh: {challenge:'把独立编写的科幻故事，转化为可发布的 AI 短剧。',context:'独立完成编剧、AI 图像与视频生成、镜头组织和剪辑。两期作品已发布抖音，并参赛 pavo0 低成本 AI 短剧创作大赛。',
        decisions:[{title:'让脚本指导素材生产',text:'围绕科幻脚本生成图像与视频素材，再组织镜头，使素材服务于故事的呈现。'},{title:'完成从生成到发布的链路',text:'将生成素材剪辑成片并发布，探索低成本 AI 创作流程。本站提供作品影像及项目介绍。'}],facts:['独立创作 / 编剧、AI 生成与剪辑','两期作品已发布抖音','pavo0 AI 短剧创作大赛参赛作品']},
      en: {challenge:'Turn an independently written science-fiction story into a publishable AI short drama.',context:'I handled writing, AI image and video generation, shot arrangement, and editing. Two episodes were published on Douyin; the work entered the PAVO low-cost AI short-drama competition.',
        decisions:[{title:'Use the script to guide generation',text:'Images and video were generated around the science-fiction script, then arranged into shots that serve the story.'},{title:'Complete the path to publication',text:'The generated material was edited and published, exploring a low-cost AI workflow. This site presents project footage alongside the project description.'}],facts:['Solo creation / Writing, AI generation & editing','Two episodes published on Douyin','PAVO AI short-drama competition entry']}
    },
    'esp32-learn': {
      zh: {challenge:'让没有实体开发板的学习者，也能操作并理解 ESP32 实验。',context:'独立开发的 Vue 3 交互式教学站，已上线知乎 AIWorks。课程与前端实现一同设计，连接知识、操作与自测。',
        decisions:[{title:'将知识组织成学习路径',text:'规划十三个模块、四十七个章节，循序展开课程内容，并设置自测与结业证书。'},{title:'把实验带进浏览器',text:'接入 Wokwi 模拟器与实验室，配合交互接线图，让学习者在零硬件条件下进行操作。'}],facts:['独立开发 / 前端与课程设计','13 模块 / 47 章节','已上线知乎 AIWorks']},
      en: {challenge:'Let learners operate and understand ESP32 experiments without a physical development board.',context:'An independently developed Vue 3 learning site, published on Zhihu AIWorks. Curriculum and frontend implementation connect concepts, interaction, and self-assessment.',
        decisions:[{title:'Give learning a path',text:'Thirteen modules and forty-seven chapters structure the content, accompanied by self-tests and completion certificates.'},{title:'Bring experiments into the browser',text:'Wokwi simulation and a virtual lab work alongside interactive wiring diagrams, allowing practical exploration without hardware.'}],facts:['Solo development / Frontend & curriculum','13 modules / 47 chapters','Published on Zhihu AIWorks']}
    },
    growth: {
      zh: {challenge:'让一段被遗忘的成长，通过玩家亲手寻找证据重新浮现。', context:'QQ 空间是中国的个人社交主页。《生长档案》以 2009 年的界面和生活片段构建叙事入口，让相册、录音与医院档案成为可调查的证据。',
        decisions:[{title:'从碎片组织叙事',text:'六章主线围绕线索、解谜和揭示推进；玩家通过翻阅相册、听录音与查看档案，拼回人物的成长经历。'},{title:'让时间参与机制',text:'游戏将现实时间与游戏时间连接；五种结局让不同探索路径产生不同结果。'}],
        facts:['48 小时独立开发','六章 / 五种结局','已发布于 itch.io'], proof:'assets/certificates/cert-growth.jpg'},
      en: {challenge:'Reconstruct a forgotten life through evidence the player discovers firsthand.',context:'Qzone is a Chinese personal social-network page. A recreated 2009 interface gives this mystery a familiar, intimate setting. Albums, recordings, and hospital records become evidence rather than background decoration.',
        decisions:[{title:'A story assembled from fragments',text:'Six chapters follow a clue → puzzle → reveal loop. Browsing albums, listening to recordings, and investigating documents reconstructs a missing personal history.'},{title:'Time as part of the rules',text:'Real time and game time are connected. Five endings give different paths through the evidence different consequences.'}],
        facts:['48-hour solo development','6 chapters / 5 endings','Published on itch.io'], proof:'assets/certificates/cert-growth.jpg'}
    },
    yuanmo: {
      zh: {challenge:'让自然语言指令转化为多派系策略沙盘中的行动与后果。',context:'故事发生在元末乱世。不同势力在持续变化的局势中博弈，玩家以自然语言表达意图。',
        decisions:[{title:'把意图接到系统上',text:'自然语言操控与局势推演引擎连接，将输入放回多派系博弈的规则中。'},{title:'让选择具有方向',text:'双结局与三条自定义势力国策路径形成不同策略方向。我的工作围绕核心玩法、数值框架和产品策划展开。'}],
        facts:['团队作品 / 核心玩法与产品策划','双结局 / 三条国策路径','腾讯云黑客松华东赛区第 5 名 / 优胜奖'], proof:'assets/certificates/tencent-hackathon-ec.jpg'},
      en: {challenge:'Turn natural-language intentions into actions and consequences in a multi-faction strategy simulation.',context:'Set during the final years of China’s Yuan dynasty, the game places competing factions in an evolving political landscape. Players express their intentions in natural language.',
        decisions:[{title:'Connect intentions to rules',text:'Natural-language control feeds a situation-simulation engine and multi-faction rules. The input becomes part of a strategy system.'},{title:'Give choices a direction',text:'Two endings and three custom-faction policy paths create distinct strategic directions. My contribution focused on core gameplay, the numerical framework, and product planning.'}],
        facts:['Team project / Gameplay & product design','2 endings / 3 policy paths','5th place / East China regional award'], proof:'assets/certificates/tencent-hackathon-ec.jpg'}
    },
    zhihu: {
      zh: {challenge:'让自由对话推理拥有可运行的机制与多种结局。',context:'玩家以档案局调查员身份调查失踪事件，结合线索、角色对话和信息博弈逐步还原真相。',
        decisions:[{title:'为推理设计机制',text:'污染对照、回声证据链、AI 法官辩论与阵营策反构成四套信息操纵机制。'},{title:'把故事落到可交付系统',text:'实现八个角色、十档结局、单人及 2–5 人联机模式，并配套剧本生产工作台。'}],
        facts:['48 小时开发','8 角色 / 10 档结局','知乎黑客松参赛凭证'],proof:'assets/certificates/zhihu-hackathon-cert.jpg'},
      en: {challenge:'Give open-ended conversational deduction a working set of rules and multiple outcomes.',context:'As an archive investigator, the player examines a disappearance through evidence, character conversations, and conflicting information.',
        decisions:[{title:'Design rules for deduction',text:'Four mechanisms structure information manipulation: contamination comparison, echo evidence chains, AI-judge debates, and faction persuasion.'},{title:'Deliver a playable system',text:'The implementation includes eight characters, ten ending tiers, solo and 2–5-player modes, and a script-production workspace.'}],
        facts:['48-hour development','8 characters / 10 ending tiers','Zhihu Hackathon participation record'],proof:'assets/certificates/zhihu-hackathon-cert.jpg'}
    }
  },
  // English project guides explain the visible work; they are not dialogue transcripts.
  guides: {
    growth:[{start:0,end:9,text:'Growth Archive — an interactive mystery set inside a 2009 Qzone-style page.'},{start:9,end:20,text:'Explore albums, recordings, and documents to reconstruct a forgotten life.'},{start:20,end:34,text:'The story follows a clue → puzzle → reveal loop across six chapters.'},{start:34,end:48,text:'Created independently during a 48-hour game jam. The original game is in Chinese.'}],
    yuanmo:[{start:0,end:12,text:'Contenders of the Late Yuan — a multi-faction strategy game.'},{start:12,end:26,text:'Set in the final years of China’s Yuan dynasty. Natural language expresses the player’s intentions.'},{start:26,end:40,text:'A situation-simulation engine connects player intentions to the evolving world.'},{start:40,end:55,text:'My role: core gameplay, numerical framework, and product planning in a team project.'},{start:55,end:70,text:'Two endings and three custom-faction policy paths create different strategic directions.'}],
    zhihu:[{start:0,end:12,text:'Truth Archive Bureau: The Kanshan Disappearance — an AI-driven deduction game.'},{start:12,end:28,text:'Investigate a disappearance through open conversations and evidence.'},{start:28,end:44,text:'Eight characters, ten ending tiers, and four information-manipulation mechanisms.'},{start:44,end:60,text:'Solo and 2–5-player modes, with a script-production workspace.'},{start:60,end:75,text:'Independently developed in 48 hours for the Zhihu Hackathon. Participation is recorded separately from awards.'}]
  }
};
window.PORTFOLIO_DATA.locales = {en:{
  profile:{
    title:'Game Designer & Creative Technologist',
    tagline:'Understand the past. Live in the present. Imagine the future.',
    location:'Jiangsu, China · UTC+8',
    intro:'I’m Tem. History helps me understand people; literature connects me to everyday life; science fiction lets me imagine what comes next. I write poetry, design games, and explore AI and interactive technology, turning curiosity into things people can read and experience.',
    award:'Tencent Cloud Hackathon · East China regional award',
    persona:{
      origin:'The name Tem draws on Atum, the ancient Egyptian creator deity. To me, it expresses the wish to bring something into being and find a sense of wholeness and independence.',
      motto:'Do what is within your power; meet what comes with calm.',
      outlook:'Work carefully on what I can influence, while leaving room for uncertainty and change.',
      interests:[{name:'History',text:'Understanding people within their times, and the echoes of their choices.'},{name:'Literature',text:'Attending to language, feeling, and everyday details; recording what stays with me.'},{name:'Politics',text:'Examining institutions, power, and the consequences of public decisions.'},{name:'Philosophy',text:'Questioning identity, meaning, and action; finding a place for oneself.'},{name:'Science fiction',text:'Imagining human possibilities across cosmic scales and unfamiliar technologies.'},{name:'Strategy',text:'Tracing situations and causes, and exploring possible paths within constraints.'}],
      curiosity:'Unfamiliar worlds, future technologies, and new forms of expression keep me curious. That curiosity carries into my games, films, and technical experiments.'
    },
    readings:[
      {title:'Early influences',books:['The Adventures of Ma Xiaotiao','Diary of a Smiling Cat'],summary:'Kindness, sincerity, and attention to everyday life.',reflection:'These childhood stories shaped my early sense of right and wrong and my appreciation of kindness, sincerity, and understanding between people.'},
      {title:'Understanding the past',books:['Those Things in the Ming Dynasty'],summary:'Entering history through people and their stories.',reflection:'This Chinese history series sparked my interest in the past. I wanted to understand the situations people faced and the reasons behind their choices.'},
      {title:'Imagining the future',books:['The Three-Body Problem'],summary:'Human vulnerability, ingenuity, and cosmic scale.',reflection:'The story showed me how small humanity is within the universe, but also how inventive it can be. That shift in scale keeps me curious about the unknown and human possibility.'},
      {title:'Returning to action',books:['Selected Works of Mao Zedong'],summary:'Connecting reflection with practical action.',reflection:'Reading these works encouraged me to bring scattered thoughts together and connect understanding with action in everyday practice.'}
    ],
    resume:{
      focus:'AI-native game design / Product design / AI application development',

      headline:'Give ideas rules. Give worlds a way to work.',
      summary:'Starting with game design, I connect play, narrative, and AI systems. I take ideas from requirements and prototypes through development and deployment. IoT and embedded systems give me a practical foundation for implementation and delivery.',
      capabilities:[
        {code:'01 / GAME SYSTEMS',title:'Design rules people can play',text:'From core loops and numerical frameworks to levels and branching endings, I connect player choices to understandable, sustained consequences.',tools:['Game & systems design','GDD','Godot','RPG Maker MV','Playtest'],evidence:'ming',proof:'10 characters × 5 interaction steps'},
        {code:'02 / AI ENGINEERING',title:'Build AI into working systems',text:'Local models, RAG, and agents combine with rules for narrative consistency, APIs, authentication, and deployment.',tools:['Python / FastAPI','Dify / Ollama','RAG / Agent','Docker','WebSocket'],evidence:'zhihu',proof:'Solo / 2–5 players / Script workspace'},
        {code:'03 / NARRATIVE & FILM',title:'Bring feeling to technology',text:'From worlds and characters to generated images, voice, and editing, I turn stories into audiovisual experiences.',tools:['Branching narrative','ComfyUI','IndexTTS','ffmpeg / PR / AE'],evidence:'kun',proof:'16 characters with character-specific voice'},
        {code:'04 / INTERACTIVE PRODUCTS',title:'Connect screens to the real world',text:'IoT and embedded systems inform interactive learning products: knowledge becomes something people can manipulate and test.',tools:['Vue 3 / TypeScript','ESP32 / STM32','Wokwi','Curriculum design'],evidence:'esp32-learn',proof:'13 modules / 47 chapters'}
      ],
      experience:[
        {period:'May 2026 — Present',kind:'Studio / AI products',title:'Tempest Software Development Studio',role:'Studio lead · AI engineering / Product delivery',text:'Delivered local-model and IT-diagnosis agents; built a multi-provider token service with authentication, key-pool scheduling, quotas, and multi-tenant usage billing.'},
        {period:'Jul 2025 — Dec 2025',kind:'Internship / Engineering R&D',title:'Everwin Precision',role:'Assistant R&D engineer · High-speed connectors for AI servers',text:'Organized 200+ technical documents, followed 5+ new-product projects, and cleaned 1,000+ measurements. Assisted with tooling validation, sample testing, engineering drawings, and BOM checks.'},
        {period:'Jul 2024 — Aug 2025',kind:'Entrepreneurship / Player operations',title:'Yangming Esports Studio',role:'Founder · Player operations / Community planning',text:'Organized large SLG alliances and events, built an esports service from the ground up, and served 300+ clients. Connected player feedback with content and community operations.'},
        {period:'Jul 2024 — Aug 2025',kind:'Freelance / Technical services',title:'Independent IT services',role:'Independent technical support / Client delivery',text:'Handled requirements, schedules, and delivery for PC troubleshooting, Windows deployment, drivers, and software-conflict resolution.'}
      ],
      recognition:[
        {kind:'Award',title:'Tencent Cloud Hackathon · 5th, East China',text:'2026 / Team project: Contenders of the Late Yuan · Regional award'},
        {kind:'Completion',title:'Yiguang Game Jam · Two completion certificates',text:'2026 / Team project: ReBirth + solo project: Growth Archive'},
        {kind:'Participation',title:'Zhihu Hackathon · Campus Rising Stars',text:'Sep 2026 / Truth Archive Bureau · Participation certificate'},
        {kind:'Participation',title:'AdventureX 2026',text:'Jul 2026 / Emotional-agent framework · Five-day solo prototype'},
        {kind:'Certification',title:'Alibaba Cloud Certified Associate · LLM',text:'2026 / ACA large-language-model certification'}
      ],
      otherCredentials:['CET-4 English','National Computer Rank Examination · Level 1','SYB entrepreneurship training','CAAC lightweight UAV safe-operation qualification']
    },
    links:[{label:'Email',url:'mailto:wangqianhui1314520@gmail.com'},{label:'QQ email',url:'mailto:3171678809@qq.com'},{label:'Douyin · Chinese-language films',url:'https://www.douyin.com/search/1779807797?type=user'},{label:'Phone · +86 183 6162 0821',url:'tel:+8618361620821'}]
  },
  poetry:{title:'Qianyuan: Collected Poems',author:'Tem · Wang Qianhui',description:'Classical imagery, present-day feelings. Four selections from more than thirty original Chinese poems, reflecting on affection, time, and life.',totalLabel:'30+ original poems · 4 selections'},
  poems:{
    'san-tan-fu-sheng':{title:'Three Sighs for a Passing Life',theme:'Life & introspection',dateLabel:'May 28, 2026 · Notebook record',paragraphs:[
      'At Mr. Gu’s gracious invitation, I stood beside a small bridge and flowing water, taking in the gentle landscape. Three cups of fine wine brought a hundred feelings to the surface.',
      'The first sigh is for the bonds of love. I once asked the sky: where is the meeting meant for me? The seasons have their order; before autumn arrives, a kindred heart is hard to find. Those wounded by love have long been many. Heaven lessens excess and makes up what is lacking, yet troubled attachments linger and worldly thoughts are difficult to quiet. Still, I wait for the flowers in bloom, the moon full, and a companion at last.',
      'The second sigh is for a path through the world. I cast a stone ahead to test the road and looked up for an answer. Whether stepping away or taking part, I was fortunate to meet people who helped me. Do what is within your power, await what comes with calm, hold to your heart, and move one step at a time: the path may yet lead upward and outward.',
      'The third sigh is for the measure of a life. I ask the sky: what lies ahead? Light does not stay, and the years do not wait. Midlife can bring hardship and misfortune. To evade fate and consequence is to bind the self with chains; to accept them is to discover, today, that I am myself. Let go of worldly entanglements, cultivate the self, and guard the heart, to find peace in the years given.',
      'A saying tells us: what is yours will come; what is not, do not force. These three concerns have their own course. Do not fight the sky; follow cause and consequence. Quiet the heart and keep to modest practice, and support may gather around you.'
    ]},
    'wu-ti-si':{title:'Untitled IV',theme:'Weather & remembrance',dateLabel:'December 10, 2025 · Manuscript date',paragraphs:['Soft wind and fine rain nurture all things;\nsnow carried on the wind slips into the heart.\nI remember a great figure, gentle as water,\nand sigh for the blue dragon bound by a long cord.']},
    'meng-jun-ling':{title:'A Song of Dreaming of You',theme:'Dreams & longing',dateLabel:'September 4, 2025 · Manuscript date',paragraphs:[
      'Wine paints the sky; in drunken thought I dream.\nI seek you again, but a meeting remains beyond reach.\nOne bright smile loosens my sorrow.\nI play the strings as you dance like a phoenix—\na thread of gauze drifting with crabapple petals toward the sky.',
      'A lover’s lament, a white dragon’s song.\nI hear of Wenjun, yet only at a distance.\nTears wet my collar and deepen regret.\nI open a simple letter while you whisper and weep;\nthe years drift away, and a lifetime’s fragrant traces break.',
      'The moon shines clear; a light wind brushes past.\nI gaze at it and fall again into thought.\nA nameless loss wounds the heart.\nI am no Changqing, and you no Wenjun—\nonly a fleeting image of someone dear, and the wish to cherish our bond.'
    ]},
    'ye-ou-ran-si-xu':{title:'Thoughts That Came at Night',theme:'Memory & time',dateLabel:'May 27, 2021 · Manuscript date',paragraphs:[
      'Last night the wind brought an old letter to my hand.\nThe rough paper plucked a string within me;\nI entered longing once again.\nCherie and Jimmy, three years together—\nin the end, two people taking separate roads.',
      'Tomorrow, in a hidden dream, I meet old faces.\nSuona bells ring sharp against the ear—\nas if departing the peach-blossom county for the first time.\nHuixian parted from Wuguan; years of feeling\nwear away within the song “Phoenix Hairpin.”'
    ]}
  },
  works:{
    ming:{type:'Game',title:'Ming Dynasty 1566: The Grand Game',subtitle:'Godot 4 · Narrative strategy',role:'Lead creator',status:'Chapter 1 released',desc:'A narrative strategy game set in Ming-era China, driven by political decisions. Its design promise: every choice creates understandable, character-specific, sustained consequences.',highlights:['10 characters × 5 interaction steps','21 people / 48 items / 33 locations','11 tutorial sequences'],contribution:{period:'Aug 2026 — Present',role:'Solo development · Narrative & systems design',actions:['Built a 10-character, 5-step interaction framework linking people, items, and locations.','Designed branching narrative and nine ending tiers, using agents, memory, timelines, and consistency constraints for character dialogue.'],outcome:'Continuing development in Godot; entered in a Tencent game-creation competition.'}},
    yuanmo:{type:'Game',title:'Contenders of the Late Yuan',subtitle:'v3.0 · Browser strategy',role:'Team lead / Full stack',status:'Completed · East China regional award',desc:'A multi-faction strategy game set in the final years of the Yuan dynasty. Natural-language control meets a living simulation, with two endings and three custom-faction policy paths.',highlights:['Tencent Cloud Hackathon · East China regional award','Natural-language control','Multi-faction strategy','Situation-simulation engine','2 endings / 3 policy paths'],contribution:{period:'Jun — Jul 2026',role:'Team project · Product & core gameplay design',actions:['Designed core gameplay, numerical frameworks, and product logic; helped take the project from concept to internal testing.','Contributed to architecture and deployment, pitch materials, and the live presentation.'],outcome:'Completed team project. Tencent Cloud Hackathon: 5th place / East China regional award.'}},
    epoch:{type:'AI film',title:'Machine Epoch: Humanity’s Embers',subtitle:'AI science-fiction drama · Writing & editing',role:'Writer / Director',status:'Competition entry · Demo completed',desc:'A science-fiction short drama made with AI-generated images and video, shot arrangement, and editing. Two episodes were published on Douyin, exploring a low-cost workflow from script to film. Entered in the PAVO AI short-drama competition.',stack:['AI image / Video generation','Video editing'],highlights:['PAVO AI short-drama competition entry','Two episodes published on Douyin','Independent writing, AI generation, and editing','From script to AI-assisted film'],contribution:{period:'Sep 2026',role:'Solo creator · Writing / AI production / Editing',actions:['Wrote the science-fiction script, generated images and video, arranged shots, and edited the film.','Explored a low-cost production workflow from script through publication.'],outcome:'Two episodes published on Douyin; entered in the PAVO low-cost AI short-drama competition.'}},
    growth:{type:'Game',title:'Growth Archive',subtitle:'Game Jam · Browser narrative mystery',role:'Solo developer',status:'Completed',desc:'“Some things, if never spoken, will never be known.” Enter a recreated 2009 Qzone page and investigate albums, recordings, and archives across six chapters, rebuilding a forgotten life and reaching one of five endings.',stack:['Vanilla HTML / CSS / JavaScript','No engine / No dependencies'],highlights:['2026 Yiguang Game Jam','Real time connected to game time','6 chapters / 5 endings / approximately 60–90 minutes','Albums, hospital records, and signal investigations'],specs:[{k:'Platform',v:'Web browser'},{k:'Stack',v:'Vanilla HTML / CSS / JavaScript'},{k:'Assets',v:'28 images / 8 audio files / 8 videos'}],links:[{label:'Play on itch.io',url:'https://tempestwang.itch.io/growth-archive'}],contribution:{period:'Sep 2026',role:'Solo development · Design / Narrative / Implementation',actions:['Designed and implemented a clue → puzzle → reveal loop within a 48-hour game jam.','Independently delivered browser interactions, the narrative, and a playable release.'],outcome:'Published on itch.io; received a Yiguang Game Jam completion certificate.'}},
    rebirth:{type:'Game',title:'ReBirth',subtitle:'RPG Maker MV · Sci-fi puzzle adventure',role:'Game designer',status:'Released',desc:'Awaken in a laboratory dish and escape a facility that gradually transforms around you. Numbered experimental subjects have distinct senses; the final encounter is an entity that imitates your actions.',highlights:['Laboratory escape through an evolving environment','Five numbered subjects with distinct senses','A final encounter that mirrors the player'],specs:[{k:'Platform',v:'Windows desktop · 816 × 624'},{k:'Genre',v:'Puzzle / Science fiction'}],links:[{label:'GCORES release · Chinese',url:'https://www.gcores.com/games/181588'}],contribution:{period:'Sep 2026',role:'Team development · Game design / Testing',actions:['Joined a 48-hour game jam to build a science-fiction puzzle prototype in RPG Maker MV.','Designed gameplay and levels, developed the facility narrative and experimental subjects, and maintained playtest and defect checklists.'],outcome:'Team release on GCORES; received a Yiguang Game Jam completion certificate.'}},
    kun:{type:'Game',title:'Kun: A Story of Sleep',subtitle:'Visual novel · Rare-disease awareness',role:'Team project · Narrative / Systems / Audio',status:'Completed',desc:'An educational visual novel exploring hypersomnia with empathy. Sixteen characters support branching stories; locally generated character-specific voice uses IndexTTS 2.5. Exhibited in Tencent’s “Little Red Flower” game-creation showcase.',stack:['Visual novel','IndexTTS 2.5','Rare-disease awareness'],highlights:['16 characters / Branching stories','Hypersomnia awareness and human experience','Local character-specific voice generation','Tencent game-creation showcase participant'],specs:[{k:'Genre',v:'Visual novel / Educational game'},{k:'Characters',v:'16 character profiles'},{k:'Audio',v:'Local IndexTTS 2.5 voice generation'}],contribution:{period:'Aug — Sep 2026',role:'Team project · Narrative / Systems / Audio',actions:['Created sixteen character profiles and branching narrative, incorporating hypersomnia education into a visual novel.','Generated voice by character and sentence with local IndexTTS 2.5.'],outcome:'Completed and exhibited in Tencent’s “Little Red Flower” game-creation showcase.'}},
    novel:{type:'Novel',title:'Douxiu Tianjue',year:'Serial in progress',subtitle:'Chinese fantasy · Cultivation & worldbuilding',role:'Author',desc:'A long-form Chinese fantasy novel with an accompanying world, character profiles, and cultivation system.',specs:[{k:'Chapter length',v:'2,800–3,200 Chinese characters'},{k:'Starstone ranks',v:'White / Yellow / Cyan / Blue / Violet / Gold / Red'}],excerpt:'Night lay black as ink, and starlight fell. At the edge of the cliff, the dim white starstone in the young man’s palm suddenly trembled. A green gleam finer than a strand of hair climbed its veins. Above white lay yellow; above yellow, cyan. But the rumored black rank appeared in no record. He closed his hand around the stone and heard the first ring of a sword within.'},
    zhihu:{type:'Game',title:'Truth Archive Bureau: The Kanshan Disappearance',subtitle:'AI deduction game · Zhihu Hackathon',role:'Solo developer / AI narrative',status:'Hackathon participation',desc:'An AI-driven browser mystery. As an archive investigator, use open conversations and evidence to unravel a disappearance. LLM-generated narrative supports different paths through the investigation.',stack:['Vanilla Web','LLM-driven narrative','Natural-language deduction'],highlights:['Zhihu Hackathon participation','LLM narrative / Open conversations','Browser-based / No installation','Branching endings / Evidence-led investigation'],specs:[{k:'Platform',v:'Web browser'},{k:'Genre',v:'AI mystery / Interactive deduction'}],contribution:{period:'Sep 2026',role:'Solo development · Gameplay / Systems / AI architecture',actions:['Designed contamination comparison, echo evidence chains, AI-judge debates, and faction persuasion.','Implemented ten ending tiers, eight characters, solo and 2–5-player modes, and a script-production workspace.'],outcome:'Completed 48-hour development; received a Zhihu Hackathon Campus Rising Stars participation certificate.'}},
    poetry:{type:'Poetry',title:'Qianyuan: Collected Poems',subtitle:'Classical imagery · Original poetry',year:'Ongoing',role:'Author',status:'30+ originals / 4 selections',stack:['Poetry','Classical imagery','Personal expression'],desc:'Four selections from my original Chinese poetry: reflections on life, weather, longing, and memory. Read the complete poems alongside the original manuscripts.',highlights:['More than thirty original poems','Four complete selections with manuscripts','Affection, time, and reflections on life'],links:[{label:'Read the collection',url:'en/poetry/'}]},
    'esp32-learn':{type:'Interactive learning',title:'ESP32 Learning Lab',subtitle:'Learn embedded systems without hardware',role:'Solo developer',status:'Published on Zhihu AIWorks',desc:'An interactive ESP32 learning platform for IoT and electronics learners. A browser-based board, Wokwi simulation, wiring diagrams, and a virtual lab connect first LEDs to AI-enabled experiments.',highlights:['13 modules / 47 chapters / approximately 10.6 hours','Wokwi simulation and interactive wiring','Virtual lab with 24 components','Self-tests, completion certificates, and locally saved progress','Static Vue 3 implementation'],specs:[{k:'Platform',v:'Web browser'},{k:'Stack',v:'Vue 3 / Wokwi / ESP32'},{k:'Content',v:'13 modules / 47 chapters / 24 components'}],links:[{label:'Open the learning lab · Chinese',url:'https://ybqru2c8ouvs.preview.aiworks.site/'}],contribution:{period:'Sep 2026',role:'Solo development · Frontend / Curriculum / Learning product',actions:['Built an interactive Vue 3 site with Wokwi simulation for learning without physical hardware.','Planned thirteen modules and forty-seven chapters, interactive wiring, self-tests, and completion certificates.'],outcome:'Published on Zhihu AIWorks.'}},
    'yiguang-cert':{type:'Project certificate',title:'Yiguang Game Jam Completion Certificates',subtitle:'Wuhan global university game-creation challenge',role:'Participant / Developer',status:'Completed',stack:['Game Jam','Yiguang'],desc:'Two completion certificates for team project ReBirth and solo project Growth Archive.',highlights:['ReBirth · Team project','Growth Archive · Solo project'],specs:[{k:'Event',v:'2026 Yiguang game-creation challenge'},{k:'Record',v:'2 completion certificates'}],images:[{src:'assets/certificates/cert-rebirth.jpg',caption:'ReBirth · Team completion certificate'},{src:'assets/certificates/cert-growth.jpg',caption:'Growth Archive · Solo completion certificate'}]},
    'tencent-hackathon-ec':{type:'Project certificate',title:'Tencent Cloud Hackathon: East China Regional Award',subtitle:'Game-development challenge · East China',role:'Awarded team',status:'Regional award',stack:['Tencent Cloud Hackathon','Contenders of the Late Yuan'],desc:'Regional award for team project Contenders of the Late Yuan in the Tencent Cloud Hackathon game-development challenge.',highlights:['Team project: Contenders of the Late Yuan','East China regional award'],specs:[{k:'Event',v:'Tencent Cloud Hackathon · East China'},{k:'Record',v:'Regional award'}],images:[{src:'assets/certificates/tencent-hackathon-ec.jpg',caption:'Tencent Cloud Hackathon · East China regional award'}]},
    'zhihu-hackathon-cert':{type:'Project certificate',title:'Zhihu Hackathon Participation Certificate',subtitle:'Campus Rising Stars',role:'Participant',status:'Participation record',stack:['Zhihu Hackathon','Truth Archive Bureau'],desc:'Participation certificate dated September 19, 2026, for the AI browser mystery Truth Archive Bureau. A record of participation, distinct from an award.',highlights:['48-hour development','AI-powered interactive deduction','Project: Truth Archive Bureau'],specs:[{k:'Event',v:'Zhihu Hackathon · Campus Rising Stars'},{k:'Record',v:'Participation certificate · September 19, 2026'}],images:[{src:'assets/certificates/zhihu-hackathon-cert.jpg',caption:'Zhihu Hackathon participation certificate · Wang Qianhui'}]}
  }
}};

