# 官网（GitHub Pages）

本站是纯静态站点：没有构建框架，`index.html` + `assets/style.css` + `assets/app.js` 直接部署。

```
docs/
├─ index.html            页面结构 (含纯 CSS 画的 VS Code 窗口示意)
├─ .nojekyll             让 GitHub Pages 跳过 Jekyll 处理
└─ assets/
   ├─ style.css          样式 (CSS 变量做浅色/深色)
   ├─ app.js             主题切换 / 工具搜索过滤 / 复制命令
   ├─ tools-data.js      工具清单 (生成物, 勿手改)
   └─ icon-color.svg     站点图标 (复制自 assets/)
```

## 工具清单怎么来的

`assets/tools-data.js` 由 `scripts/gen-docs.mjs` 从源码生成：

- 工具列表：`webview/src/App/*/define.tsx` 里的 `AppName` / `Icon` / `Type`
- 分类顺序与名称：`webview/src/shell/registry.ts` 的 `APP_TYPES`
- 版本 / 描述 / publisher：`package.json`

所以新增或改名工具后，执行一次就会同步：

```bash
npm run docs:gen     # 或 just docs
```

## 本地预览

```bash
npm run docs:gen     # 或 just docs      重新生成工具清单
npm run docs:test    # 或 just docs-check  jsdom 加载 index.html, 验证数据/过滤/搜索
npm run docs:serve   # 或 just docs-serve  预览 http://localhost:1313
```

不要直接双击 `index.html` 打开也能看（数据是 `tools-data.js` 里的全局变量，不做 fetch），
但用 http 预览更接近线上表现。

## 部署

推送到 `main` 后由 `.github/workflows/pages.yml` 自动部署：

1. `npm ci` → `node scripts/gen-docs.mjs`（保证清单与源码一致）
2. `node scripts/smoke-docs.mjs`（jsdom 跑一遍页面，失败则不部署）
3. 上传 `docs/` 作为 Pages 产物
4. 由 `actions/deploy-pages` 发布

改动只涉及 `docs/**`、`scripts/gen-docs.mjs`、工具 `define.tsx`、`registry.ts` 或 `package.json`
才会触发部署。

首次启用需要在仓库 **Settings → Pages → Build and deployment → Source** 选择
**GitHub Actions**（只需设置一次）。

线上地址：<https://freewu.github.io/magic-tools-vscode/>
