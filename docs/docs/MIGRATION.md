# Tem 目录整理记录

整理日期：2026-10-07。项目位置：`D:/Vibe coding/作品集/Tem`。

## 已迁移的内容

已搜索原工作区的业务文件，将网站页面、双语页、全部素材、脚本、模板、测试和历史资料迁入 Tem。迁移前生成清单，迁移后逐项检查 **1,354 个文件**的大小和 SHA256，全部一致。路径适配修改是在这次完整性检查之后进行，原始清单仍保留。

- 原 `assets/`、`zh/`、`en/`、`templates/`、`scripts/`、`tests/` 保持原相对结构。
- 原 `_archive/tem-blender/` → `Tem/blender/`。
- 原其余 `_archive/` → `Tem/_archive/`。
- 原 `SITE.md` → `Tem/docs/SITE.md`。
- 原 `王乾辉简历.pdf` → `Tem/docs/source/王乾辉简历.pdf`。
- `.git`、`.workbuddy` 和父目录的 `.gitignore` 保留，避免破坏仓库和本机工具。

## 路径与运行方式

开发服务的根目录是 Tem，浏览器地址继续使用 `/immersive.html`、`/zh/`、`/en/`。Blender 构建、渲染、MCP 和检查脚本已使用新路径；素材审查和模型检查按脚本位置确定项目根，不依赖终端所在目录。

Blender 内部路径通过 `scripts/repair-blender-paths.py` 使用 Blender API 修复；内嵌图片保持打包，不重新生成模型、材质和动画，也不覆盖 `.blend1` 历史备份。修复记录位于 `docs/blender-path-repair.json`。

## 历史文件

旧源码、概念图、截图、`.blend1`、历史日志和渲染清单完整保留。历史日志里的原绝对路径是取证记录，以迁移清单查找现在的位置；当前 MCP 作业状态文件的路径单独适配，原状态文件保存在 `docs/migration-job-history/`。

Blender 的两个旧导出缓存子目录拒绝读取，已随整个父目录原样移动，没有清除、解包或修改权限。

`_archive/print-pdf.js` 等历史工具依赖旧版本环境，属于档案。日常命令以 Tem 根目录的 `package.json` 为准。

## 上线范围

部署目录需要以 Tem 为站点根。网站页面、`assets/` 与双语页是运行内容；`blender/`、`_archive/`、原始简历和本地开发资料不作为公开页面发布。本次操作只整理本地文件，没有提交或推送。
