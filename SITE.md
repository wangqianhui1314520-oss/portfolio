# SITE.md — 作品集站点说明（唯一权威文档）

> 维护者与 AI 助手开工前先读本文件。所有约定、流程、坑都在这里。
> 最后更新：2026-09-25

---

## 1. 站点概览

| 项 | 值 |
|---|---|
| 正式访问地址 | https://wangqianhui1314520-oss.github.io/portfolio/ |
| 自定义域名 | `wqh-tempest.cn`（CNAME 生效，github.io 会 301 到该域名根路径） |
| 仓库 | `wangqianhui1314520-oss/portfolio`（分支 `main`） |
| 部署方式 | GitHub Pages，push 即自动重建（生效约 30–60 秒） |
| 技术形态 | 纯静态站点，无构建步骤；`data.js` 为唯一数据源 |
| 已知问题 | HTTPS 证书尚未被信任（curl 需 `-k`），需在 Pages 设置勾选 Enforce HTTPS 等待签发 |

## 2. 文件架构

### 2.1 线上正式文件（可 push）

```
index.html              作品集首页：HUD + 街机小游戏 + 环形作品卡 + 详情面板
resume.html             一页式简历（含打印/导出 PDF 按钮 + @media print）
portfolio-print.html    作品集打印版（独立，未被首页引用）
assets/js/data.js       ★ 唯一数据源：profile + works[]（改卡片只动这里）
assets/js/main.js       首页渲染：Hero、页脚、统计
assets/js/ring.js       作品环形展示与详情面板（封面图 loading="lazy")
assets/js/arcade.js     首页可玩小游戏
assets/js/matrix.js     画风切换器 + 代码流背景（与 resume 共享）
assets/css/style.css    基础样式
assets/css/scifi.css    主题变量（科幻/终端/国风/极简/极光）
assets/covers/          作品封面图
assets/certificates/    证书图
assets/videos/          作品演示视频
assets/images/          （注意：此目录当前被在研版占用，正式站未使用）
games/growth-archive/   《生长档案》本地可玩 iframe
CNAME                   自定义域名 wqh-tempest.cn
SITE.md                 本文件
```

### 2.2 本地在研（**禁止 push**）

```
immersive.html                  沉浸式新版首页（半成品）
cinematic.html                  电影感新版首页（半成品）
assets/js/immersive-*.js        沉浸式专属脚本
assets/css/immersive-cosmos.css 沉浸式专属样式
assets/images/                  沉浸式专属图（含 planet/ 星球贴图）
```

> ⚠️ 铁律：2026-09-25 曾误将这批文件推上线（`448258d`），已用 `85e43de` 撤下。
> 它们深度依赖根目录共享资源（`assets/js/data.js`、`assets/covers/*`），
> 若要正式发布，需先补齐路径与内容，再由用户确认后单独提交。

### 2.3 本地归档（**禁止 push**）

```
_archive/           设计参考帧、参考联系方式图、校验截图、旧 PDF、方案稿
.workbuddy/         工具数据
```

## 3. 数据源约定（data.js）

```js
window.PORTFOLIO_DATA = {
  profile: { name, enName, cnName, title, tagline, location, intro, award, links[] },
  works: [ { id, type, section, title, subtitle, cover, ratio, year, role,
             status, stack[], desc, highlights[], specs[], images[], video,
             play:{type,url,ratio}, links[] } ]
}
```

- 加新作品：在 `works` 末尾追加一个对象即可，`section: "work"` 归作品区、`"cert"` 归证书区。
- `play.type`：`iframe`（本地可玩）/ `external`（外链试玩）/ `none`。
- `links[]`：`{ label, url }`，如 itch.io、机核主页。
- 改名同步点：`profile.name`（Tem）、`profile.cnName`（王乾辉） → 页脚；各页面 `<title>`。

## 4. 更新流程（照做）

1. 改文件（作品卡片只动 `data.js`）。
2. 校验：`node --check assets/js/data.js`，并 grep 确认新引用的图片/视频文件真实存在。
3. `git add -A && git commit -m "..."`
4. `git push origin HEAD`
5. 等 30–60 秒后验证：`curl -s -o /dev/null -w "%{http_code}" -L "http://wqh-tempest.cn/<路径>"`（应 200）。

> 提交前务必 `git status` 检查：**不得出现** `immersive.html`、`cinematic.html`、
> `assets/js/immersive-*`、`assets/images/`。

## 5. 画风 / 主题系统

- 5 套主题：`scifi`（科幻）、`terminal`（终端）、`ink`（国风）、`swiss`（极简）、`aurora`（极光）。
- 切换器在首页 HUD 与简历页顶栏，`localStorage` 键 **`portfolio-theme`** —— 两页联动，改主题逻辑要同步改两处。
- 仅 `terminal` 主题显示代码流（`#matrix`）。
- 简历页 `<html data-theme>` 在 head 内按 localStorage 预设，避免首屏闪烁。

## 6. 资源规范

| 类型 | 上限 | 处理方式 |
|---|---|---|
| 封面/证书图 | ≤ 200KB，宽 ≤ 1200px | Pillow：resize + JPEG quality 82 + progressive |
| 演示视频 | ≤ 15MB | `ffmpeg -crf 35 -vf scale=768:-2 -acodec aac -b:a 48k -ac 1 -movflags +faststart` |
| 页面内图片 | 必须 `loading="lazy"` | 已在 `ring.js` 封面与图集生效 |

已压：`epoch.mp4` 66MB → 13.2MB；kun-cover 1MB → 202KB。

## 7. 待办

- [ ] Pages 设置勾选 **Enforce HTTPS**，等待 wqh-tempest.cn 证书签发
- [ ] 决定 CNAME 去留：保留自定义域名 or 删除回到纯 github.io
- [ ] 沉浸式新版完成后，按第 2.2 节约定单独评审上线
- [ ] 作品卡片补「我负责：xx + 量化结果」一行（面试可直接讲）
