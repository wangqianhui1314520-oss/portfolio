/* ============================================
   作品集数据源 —— 后续只需修改本文件
   ============================================ */

window.PORTFOLIO_DATA = {
  /* ---------- 个人资料 ---------- */
  profile: {
    name: "王乾辉",
    enName: "Wang Qianhui",
    title: "游戏开发 / 物联网应用技术",
    tagline: "做能跑起来的东西",
    location: "江苏",
    intro:
      "独立开发与团队协作并行。主攻 Godot / Unreal / Web 全栈游戏开发，同时做嵌入式硬件与小说创作。习惯把想法做成能真正运行的东西 —— 游戏、设备、故事，都算。",
    avatar: "",
    award: "腾讯云黑客松大赛 · 华东赛区优胜奖",
    links: [
      { label: "邮箱", url: "mailto:3171678809@qq.com" },
      { label: "抖音 · 1779807797", url: "https://www.douyin.com/search/1779807797?type=user" },
      { label: "手机 · 18361620821", url: "tel:18361620821" }
    ]
  },

  /* ---------- 作品列表（不分类，按你想展示的顺序排）----------
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
      type: "游戏",
      title: "机械纪元：人类余烬",
      subtitle: "Unreal 5 · AI 短剧",
      cover: "assets/covers/epoch-cover.jpg",
      year: "2026",
      role: "主创 / 导演",
      status: "已参赛 · Demo 完成",
      stack: ["Unreal 5", "AI 生成管线"],
      desc: "12 分钟影视化 AI 短剧，60 个片段 × 12 秒，全程 AI 生成图像与视频素材。参赛 PAVO 0 成本 AI 短剧创作大赛。",
      highlights: [
        "PAVO 0 成本 AI 短剧创作大赛 · AI 融合创新赛道",
        "12 分钟成片",
        "60 segments × 12s",
        "AI 全链路出片"
      ],
      specs: [],
      video: "assets/videos/epoch.mp4",
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "growth",
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
      play: { type: "iframe", url: "games/growth-archive/index.html", ratio: "816 / 624" },
      links: []
    },
    {
      id: "rebirth",
      type: "游戏",
      title: "Rebirth 重生",
      subtitle: "RPG Maker MV · 科幻解谜",
      cover: "assets/covers/rebirth-cg.jpg",
      year: "2026",
      role: "主创",
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
      type: "游戏",
      title: "困",
      subtitle: "视觉小说 · 罕见病教育",
      cover: "assets/covers/kun-paralysis.jpg",
      year: "2026",
      role: "制作",
      status: "已完成",
      stack: ["视觉小说", "IndexTTS 2.5"],
      desc: "嗜睡症主题的罕见病教育视觉小说，16 个角色设定，本地语音模型生成配音。",
      highlights: ["16 角色设定", "嗜睡症科普主题"],
      specs: [],
      play: { type: "none", url: "" },
      links: []
    },
    {
      id: "novel",
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
      type: "荣誉",
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
  ]
};
