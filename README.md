# Magic Tools for VS Code

[![CI](https://github.com/freewu/magic-tools-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/freewu/magic-tools-vscode/actions/workflows/ci.yml)
[![Release VSIX](https://github.com/freewu/magic-tools-vscode/actions/workflows/release.yml/badge.svg)](https://github.com/freewu/magic-tools-vscode/actions/workflows/release.yml)
[![官网](https://img.shields.io/badge/%E5%AE%98%E7%BD%91-freewu.github.io-3794ff)](https://freewu.github.io/magic-tools-vscode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

开发者的「瑞士军刀」工具箱，把 [magic-tools](https://github.com/freewu/magic-tools)（Tauri + React 版）里的
**类型转换 / 编解码 / 加解密 / 值计算 / 格式化 / 生成器 / 站长工具 / 其它** 等九类共 **119 个工具** 搬进了 VS Code。

> 官网（可搜索工具清单 / 下载 .vsix）：<https://freewu.github.io/magic-tools-vscode/>

- 左侧活动栏新增 **Magic Tools** 图标，点开就是工具列表（可搜索、按分类分组）
- 点某个工具 → 在编辑器区打开一个独立面板（可并排、可拖到第二个标签页）
- 全部逻辑纯前端运行（Web Crypto / crypto-js / WebAssembly），不联网、不上传数据
- 少数需要宿主网络能力的工具（DNS / MTR / Whois / 网页抓取）由扩展宿主用 Node 内置模块实现，无需联网权限之外的额外依赖

## 工具一览

| 分类 | 数量 | 示例 |
| --- | --- | --- |
| 类型转换 | 20 | 进制转换、时间戳、单位换算、经纬度、树形路径… |
| 编解码 | 13 | Base64 / Base58 / BaseX、URL、Unicode、Morse、UUencode、BCD、压缩包… |
| 加解密 | 23 | AES / DES / 3DES / RC2 / RC4 / SM2 / SM4 / SM9、哈希、HMAC、bcrypt、JWT… |
| 值计算 | 15 | CRC / BCC / LRC、补码、子网、PPI、字节容量、压缩比、贷款… |
| 格式化 | 12 | JSON / JSON5 / JS / XML / HTML / SQL / SVG 格式化、Markdown 编辑器、Mermaid、思维导图… |
| 生成器 | 15 | 二维码 / 条形码、密码、OTP、Cron、Mock 数据、Gitignore、htpasswd、数独、习字帖… |
| 站长工具 | 16 | UA 解析、Browser 指纹、Cookie 分析、robots / sitemap、Nginx / iptables / tc 规则、关键词密度… |
| 图片 | 1 | 像素画 |
| 其它 | 4 | 正则表达式、Chmod 权限、CIDR 计算器、取色板 |

## 使用

1. 安装扩展后，点击左侧活动栏的 **Magic Tools** 图标
2. 在列表里点工具（顶部搜索框可按中文名或英文 key 过滤）
3. 工具在编辑器区打开，输入内容即时得到结果
4. 需要保存结果时用工具内的「保存」按钮（VS Code 会弹系统保存框）

命令面板里也有两个命令：

- `Magic Tools: 打开工具箱` — 聚焦侧边栏
- `Magic Tools: 重新加载工具面板` — 前端重新构建后刷新（开发用）

## 开发

依赖：Node.js 20+、[just](https://github.com/casey/just)、`sh`（Windows 下随 Git 提供）、VS Code 的 `code` 命令。

```bash
just install     # 安装依赖
just build       # 构建: WebView 前端 (vite) -> dist/webview/ + 宿主扩展 (tsc) -> out/
just dev         # 构建并打开「扩展开发宿主」窗口
just dev-web     # 只跑前端, 浏览器打开 http://localhost:1212/?app=AESCrypto
```

其它常用命令（`just --list` 看全部）：

```bash
just test        # 冒烟测试: jsdom 里把 119 个工具 + 外壳各渲染一遍
just check       # TypeScript 类型检查 (宿主 + WebView 两套 tsconfig)
just verify      # check + test + build
just package     # 打包 magic-tools-<version>.vsix
just install-local  # 安装本地 VSIX (覆盖)
just docs        # 重新生成官网数据 (工具清单 / 版本)
just docs-check  # 官网冒烟测试
just docs-serve  # 本地预览官网 http://localhost:1313
just clean       # 清理 out/ dist/ *.vsix
```

版本号默认读 `package.json`，可临时覆盖：`VERSION=1.4.0 just package`。

也可以用 VS Code 调试：`.vscode/launch.json` 里选择 **运行扩展 (扩展开发宿主)**，会自动先 `npm run build`。

## 工程结构

```
├─ src/extension.ts          宿主: 侧边栏 WebView 视图 + 工具面板 + 保存文件/打开链接 + 网络命令桥
├─ src/net/                  宿主网络能力: DNS / 反向解析 / Whois / MTR 探测 / 网页抓取
├─ webview/                  WebView 前端 (React + antd, Vite 构建)
│  ├─ src/shell/             外壳: 工具列表 / 面板容器 / antd 主题适配 / 工具注册表
│  ├─ src/App/               119 个工具 (迁移自 magic-tools, 每个目录一个工具)
│  ├─ src/lib/               共享工具库 (字节/编码/文件/bignumber/对称加密)
│  ├─ src/hook/              locale / theme context (简体·繁体·英文 / 跟随 VSCode 深浅色)
│  └─ src/lib/vscode.ts      WebView <-> 宿主的消息桥 (保存文件 / 打开链接 / 网络命令 / 状态)
├─ dist/webview/             前端构建产物 (打包进 VSIX)
├─ out/                      扩展宿主编译产物
├─ docs/                     官网 (纯静态, 部署到 GitHub Pages)
├─ scripts/smoke.mjs         冒烟测试
├─ scripts/gen-docs.mjs      从源码生成官网工具清单 (docs/assets/tools-data.js)
├─ scripts/serve-docs.mjs    官网本地预览 (无依赖静态服务)
├─ scripts/smoke-docs.mjs    官网冒烟测试 (jsdom 加载页面)
├─ .github/workflows/        CI / Release VSIX / Deploy Docs
└─ justfile                  构建/调试/打包命令
```

## 发布（GitHub Actions）

`.github/workflows/release.yml` 负责打包并发布 `.vsix`：

```bash
git tag v1.4.0            # 版本号必须与 package.json 一致 (不一致则 workflow 直接报错)
git push origin v1.4.0
```

推标签（或在 Actions 里手动触发 `Release VSIX` 并填版本号）后会自动：

1. `npm ci` → 类型检查 → 冒烟测试 → 构建
2. `vsce package` 生成 `magic-tools-<version>.vsix`，并输出 `.sha256`
3. 创建/更新 GitHub Release（附 vsix + 校验文件 + 安装说明），并在 Actions 产物里保留 30 天
4. 若仓库配置了密钥 `VSCE_PAT`（Azure DevOps PAT，Marketplace 权限），同时发布到 VS Code Marketplace

`ci.yml` 在每次推送到 `main` / PR 时跑类型检查 + 冒烟测试 + 构建。

## 官网（GitHub Pages）

官网源码在 `docs/`（单页静态站，无框架）：

```bash
just docs          # 从源码重生成工具清单 docs/assets/tools-data.js
just docs-check    # 官网冒烟测试 (jsdom 加载页面, 验证数据/过滤/搜索)
just docs-serve    # 本地预览 http://localhost:1313
```

工具清单不是手写的：`scripts/gen-docs.mjs` 从 `webview/src/App/*/define.tsx` 与
`webview/src/shell/registry.ts` 的 `APP_TYPES` 抽数据，新增或改名工具后跑一次即同步。

`pages.yml` 在 `docs/**` 或工具清单来源文件变更时自动部署到 GitHub Pages。
首次启用需在仓库 **Settings → Pages → Source** 选 **GitHub Actions**。
线上地址：<https://freewu.github.io/magic-tools-vscode/>

### 与上游的差异

- 迁移时去掉了 Tauri 相关能力：`webview/src/lib/tauri.ts` 变成薄壳，保存文件走宿主
  `showSaveDialog`，不可用时降级为浏览器下载；打开链接走 `vscode.env.openExternal`。
- 迁移了 `convert / codec / crypto / value-calc / formatter / image / generator / webmaster / misc`
  九类工具；上游的「游戏」类与其余图片类工具未迁移。
- 上游依赖 Tauri Rust 命令的网络能力（原始 DNS / ICMP / TCP Whois / 无 CORS 网页抓取）在扩展里由宿主侧
  `src/net/` 重新实现，webview 通过 `webview/src/lib/net-bridge.ts` 投递「命令名 + 参数」（与 Tauri 命令同名），
  因此 DNS 查询、MTR、Whois、网页 TDK、Sitemap 检测在扩展里可正常使用：
  - `dns_query` / `reverse_dns`：Node 无「带 TTL 的解析 API」，改为自己组 DNS 报文走 UDP 53（截断时改 TCP），
    拿到真实 TTL、否定应答 SOA，状态语义（ok / nxdomain / nodata）与桌面版一致；
  - `whois_query`：TCP 43 + `refer:` / `Registrar WHOIS Server:` 逐级转介，最多 3 跳，内置 TLD 表沿用上游；
  - `mtr_resolve` / `mtr_probe`：Node 无原始套接字能力，改用系统 `ping` 的 TTL 参数（`-i` / `-t`）逐跳探测，
    再解析输出映射到 reply / ttlExpired / unreachable / timeout；因此计时口径与真实 ICMP 略有差异；
  - `fetch_url_body`：宿主侧用 `http/https` 抓取（绕过 CORS，3MB 上限、20 秒超时），返回 Base64 由前端探测字符集。
  纯浏览器环境（`just dev:web`）无宿主能力，这些工具会渲染「仅桌面版可用」提示并给出下载入口。
- Vditor 的运行时资源（lute 引擎 / KaTeX / 高亮主题等，约 5MB）由 `webview/vite.config.mts` 的
  `vditorAssets` 插件在构建时拷到 `dist/webview/vditor/`；宿主在 WebView 里注入 `<base href>`，
  使这些相对路径资源能落到 `asWebviewUri` 可访问的目录（仓库不提交这批大文件）。
- 少量类型/兼容性微调（不改行为）：`ColorConvert` / `Color` 的 `color-convert` 改成默认导入、
  `Hash/HmacHash/KeccakHash/SHA3Hash` 的类型改为 `export type`、
  `ComplementCalc` 的判别式改为 `r.ok === false`、`Unicode` 的数组显式标注 `string[]`、
  `lib/index.ts` 的 `debounce` 内部时间戳标注为 `number | null`（`strictNullChecks` 下的收窄要求）。

## 许可

MIT，见 [LICENSE](LICENSE)。工具逻辑来自 magic-tools（同作者）。
