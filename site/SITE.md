# SITE.md — 作品集站点说明（唯一权威文档）

> 维护者与 AI 助手开工前先读本文件。所有约定、流程、坑都在这里。
> 最后更新：2026-09-25

---

## 1. 站点概览

| 项 | 值 |
|---|---|
| 正式访问地址 | https://wangqianhui1314520-oss.github.io/portfolio/ |
| 自定义域名 | `wqh-tempest.cn`（`site/CNAME` 生效，github.io 会 301 到该域名根路径） |
| 仓库 | `wangqianhui1314520-oss/portfolio`（分支 `main`） |
| **部署方式** | **GitHub Actions**：`.github/workflows/pages.yml` 把 `site/` 目录作为 Pages 发布源（不再是分支根目录发布） |
| 生效时间 | push 后约 1–2 分钟（Actions 构建 + CDN 刷新） |
| 技术形态 | 纯静态站点，无构建步骤；`site/assets/js/data.js` 为唯一数据源 |
| 已知问题 | HTTPS 证书尚未被信任（curl 需 `-k`），需在 Pages 设置开启 HTTPS 等待签发 |

## 2. 文件架构

仓库根只有三样东西：**`site/`（站点）、`_archive/`（本地归档）、`.github/`（发布工作流）**。

### 2.1 线上正式文件 —— `site/`（可 push）

```
site/index.html              作品集首页：HUD + 街机小游戏 + 环形作品卡 + 详情面板
site/resume.html             一页式简历（含打印/导出 PDF 按钮 + @media print）
site/portfolio-print.html    作品集打印版（独立，未被首页引用）
site/assets/js/data.js       ★ 唯一数据源：profile + works[]（改卡片只动这里）
site/assets/js/main.js       首页渲染：Hero、页脚、统计
site/assets/js/ring.js       作品环形展示与详情面板（封面图 loading="lazy"）
site/assets/js/arcade.js     首页可玩小游戏
site/assets/js/matrix.js     画风切换器 + 代码流背景（与 resume 共享）
site/assets/css/style.css    基础样式
site/assets/css/scifi.css    主题变量（科幻/终端/国风/极简/极光）
site/assets/covers/          作品封面图
site/assets/certificates/    证书图
site/assets/videos/          作品演示视频
site/CNAME                   自定义域名 wqh-tempest.cn
site/SITE.md                 本文件
```

### 2.2 本地在研 —— `site/` 内但 **禁止 push**

```
site/immersive.html                  沉浸式新版首页（半成品）
site/cinematic.html                  电影感新版首页（半成品）
site/assets/js/immersive-*.js        沉浸式专属脚本
site/assets/css/immersive-cosmos.css 沉浸式专属样式
site/assets/images/                  沉浸式专属图（含 planet/ 星球贴图）
```

> ⚠️ 铁律：2026-09-25 曾误将这批文件推上线（`448258d`），已用 `85e43de` 撤下。
> 它们依赖 `site/assets/js/data.js` 与 `site/assets/covers/*`，发布前需先补齐内容并由用户确认。

### 2.3 本地归档 —— 仓库根 `_archive/`（**禁止 push**）

```
_archive/reference_frames/   设计参考帧
_archive/reference-contact.jpg
_archive/_shots/             校验截图
_archive/.verify/
_archive/PROPOSAL.md         早期方案稿
_archive/王乾辉-作品集.pdf    旧导出 PDF
_archive/print-pdf.js
```

## 3. 数据源约定（site/assets/js/data.js）

```js
window.PORTFOLIO_DATA = {
  profile: { name, enName, cnName, title, tagline, location, intro, award, links[] },
  works: [ { id, type, section, title, subtitle, cover, ratio, year, role,
             status, stack[], desc, highlights[], specs[], images[], video,
             play:{type,url}, links[] } ]
}
```

- 加新作品：在 `works` 末尾追加对象，`section: "work"` 归作品区、`"cert"` 归证书区。
- `play.type`：现全部作品均用 `external`——《生长档案》itch.io、《Rebirth 重生》机核（本地 `games/` 72MB 已于 2026-09-25 删除）。
- `links[]`：`{ label, url }`。
- 改名同步点：`profile.name`（Tem）、`profile.cnName`（王乾辉）→ 页脚；各页面 `<title>`。
- 卡片内资源路径一律写 `assets/...`（相对于 `site/` 内的页面）。

## 4. 更新流程（照做）

1. 改文件（作品卡片只动 `site/assets/js/data.js`）。
2. 校验：`node --check site/assets/js/data.js`，并确认新引用的图片/视频真实存在。
3. `git add -A && git commit -m "..."`
4. `git push origin HEAD`
5. 等 1–2 分钟后验证：`curl -s -o /dev/null -w "%{http_code}" -L "http://wqh-tempest.cn/<路径>"`（应 200）。

> 提交前 `git status` 检查：**不得出现** `site/immersive.html`、`site/cinematic.html`、
> `site/assets/js/immersive-*`、`site/assets/images/`、`_archive/`。

## 5. 画风 / 主题系统

- 5 套主题：`scifi`（科幻）、`terminal`（终端）、`ink`（国风）、`swiss`（极简）、`aurora`（极光）。
- 切换器在首页 HUD 与简历页顶栏，`localStorage` 键 **`portfolio-theme`** —— 两页联动，改主题逻辑要同步改两处。
- 仅 `terminal` 主题显示代码流（`#matrix`）。

## 6. 资源规范

| 类型 | 上限 | 处理方式 |
|---|---|---|
| 封面/证书图 | ≤ 200KB，宽 ≤ 1200px | Pillow：resize + JPEG quality 82 + progressive |
| 演示视频 | ≤ 15MB | `ffmpeg -crf 35 -vf scale=768:-2 -acodec aac -b:a 48k -ac 1 -movflags +faststart` |
| 页面内图片 | 必须 `loading="lazy"` | 已在 `ring.js` 封面与图集生效 |

## 7. 待办

- [ ] Pages 设置开启 **HTTPS / Enforce HTTPS**，等待 wqh-tempest.cn 证书签发
- [ ] 决定 CNAME 去留：保留自定义域名 or 删除回到纯 github.io
- [ ] 沉浸式新版完成后，按第 2.2 节约定单独评审上线
- [ ] 作品卡片补「我负责：xx + 量化结果」一行（面试可直接讲）
