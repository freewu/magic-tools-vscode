# Magic Tools for VS Code

开发者的「瑞士军刀」工具箱，把 [magic-tools](https://github.com/freewu/magic-tools)（Tauri + React 版）里的
**类型转换 / 编解码 / 加解密 / 值计算** 四大类共 **71 个工具** 搬进了 VS Code。

- 左侧活动栏新增 **Magic Tools** 图标，点开就是工具列表（可搜索、按分类分组）
- 点某个工具 → 在编辑器区打开一个独立面板（可并排、可拖到第二个标签页）
- 全部逻辑纯前端运行（Web Crypto / crypto-js / WebAssembly），不联网、不上传数据

## 工具一览

| 分类 | 数量 | 示例 |
| --- | --- | --- |
| 类型转换 | 20 | 进制转换、时间戳、单位换算、颜色、经纬度、树形路径… |
| 编解码 | 13 | Base64 / Base58 / BaseX、URL、Unicode、Morse、UUencode、BCD、压缩包… |
| 加解密 | 23 | AES / DES / 3DES / RC2 / RC4 / SM2 / SM4 / SM9、哈希、HMAC、bcrypt、JWT… |
| 值计算 | 15 | CRC / BCC / LRC、补码、子网、PPI、字节容量、压缩比、贷款… |

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
just test        # 冒烟测试: jsdom 里把 71 个工具 + 外壳各渲染一遍
just check       # TypeScript 类型检查 (宿主 + WebView 两套 tsconfig)
just verify      # check + test + build
just package     # 打包 magic-tools-<version>.vsix
just install-local  # 安装本地 VSIX (覆盖)
just clean       # 清理 out/ dist/ *.vsix
```

版本号默认读 `package.json`，可临时覆盖：`VERSION=1.2.0 just package`。

也可以用 VS Code 调试：`.vscode/launch.json` 里选择 **运行扩展 (扩展开发宿主)**，会自动先 `npm run build`。

## 工程结构

```
├─ src/extension.ts          宿主: 侧边栏 WebView 视图 + 工具面板 + 保存文件/打开链接
├─ webview/                  WebView 前端 (React + antd, Vite 构建)
│  ├─ src/shell/             外壳: 工具列表 / 面板容器 / antd 主题适配 / 工具注册表
│  ├─ src/App/               71 个工具 (迁移自 magic-tools, 每个目录一个工具)
│  ├─ src/lib/               共享工具库 (字节/编码/文件/bignumber/对称加密)
│  ├─ src/hook/              locale context (简体/繁体/英文)
│  └─ src/lib/vscode.ts      WebView <-> 宿主的消息桥 (保存文件 / 打开链接 / 状态)
├─ dist/webview/             前端构建产物 (打包进 VSIX)
├─ out/                      扩展宿主编译产物
├─ scripts/smoke.mjs         冒烟测试
└─ justfile                  构建/调试/打包命令
```

### 与上游的差异

- 迁移时去掉了 Tauri 相关能力：`webview/src/lib/tauri.ts` 变成薄壳，保存文件走宿主
  `showSaveDialog`，不可用时降级为浏览器下载；打开链接走 `vscode.env.openExternal`。
- 只保留 `convert / codec / crypto / value-calc` 四类工具（其余分类未迁移）。
- 少量类型/兼容性微调（不改行为）：`ColorConvert` 的 `color-convert` 改成默认导入、
  `Hash/HmacHash/KeccakHash/SHA3Hash` 的类型改为 `export type`、
  `ComplementCalc` 的判别式改为 `r.ok === false`（`strict:false` 下的收窄）。

## 许可

MIT，见 [LICENSE](LICENSE)。工具逻辑来自 magic-tools（同作者）。
