# Magic Tools for VSCode — 构建 / 调试 / 打包 (just)
#
# 依赖:
#   - Node.js 20+ 与 npm   (构建宿主扩展 + WebView 前端)
#   - just                 (本命令运行器)
#   - sh                   (just 的默认 shell; Windows 下随 Git 提供)
#   - VS Code `code` CLI   (仅 dev / install-local 需要)
#
# 常用:
#   just            -> 显示帮助
#   just dev        -> 构建并打开「扩展开发宿主」窗口调试
#   just dev-web    -> 只跑前端, 浏览器打开 http://localhost:1212 调试页面
#   just package    -> 生成 magic-tools-<version>.vsix
#
# 提醒: 所有步骤都收敛在 package.json 的 scripts 里, 需要时直接 npm run <script> 也可。

# 版本号; 默认取 package.json, 可用 VERSION 环境变量覆盖
# 例: VERSION=1.2.0 just package
version := env_var_or_default("VERSION", `node -p "require('./package.json').version"`)

vsix := "magic-tools-" + version + ".vsix"

# 默认: 显示帮助
default: help

# 显示帮助 (默认命令)
help:
    @echo "Magic Tools for VSCode v{{version}} — 可用命令:"
    @just --list

# 安装依赖 (首次 / 依赖变更后)
install:
    npm install

# 构建全部: WebView 前端 (vite) -> dist/webview/, 宿主扩展 (tsc) -> out/
build:
    npm run build

# 只构建 WebView 前端
build-web:
    npm run build:webview

# 只编译宿主扩展
build-host:
    npm run build:host

# TypeScript 类型检查 (宿主扩展)
check:
    npm run typecheck

# 冒烟测试: 用 jsdom 把 71 个工具页面 + 外壳各渲染一遍 (查导入/渲染错误)
test:
    npm run test

# 提交前自检: 类型检查 + 冒烟测试 + 构建
verify: check test build

# 构建后在浏览器里调试 WebView (http://localhost:1212/?app=<工具key>)
# 例: http://localhost:1212/?app=AESCrypto
dev-web:
    npm run dev:web

# 构建并打开「扩展开发宿主」窗口调试 (改完代码在宿主窗口里 Ctrl+R 重载)
dev: build
    code --extensionDevelopmentPath="{{justfile_directory()}}" --new-window

# 监听重建 (配合 dev 打开的宿主窗口; 重建后在宿主里 Ctrl+R 重载)
watch:
    npm run build:host
    npm run build:webview
    npm run watch:host & npm run watch:webview & wait

# 打包 VSIX (out/ + dist/webview/ 打进扩展)
package: build
    npm run package -- --out {{vsix}}
    @echo "✓ 已生成 {{vsix}}"

# 本地安装已打包的 VSIX (覆盖安装)
install-local: package
    code --install-extension {{vsix}} --force

# 发布到 VS Code Marketplace (需先 npx vsce login <publisher>, 并把 publisher 写进 package.json)
publish: package
    npm run publish -- --packagePath {{vsix}}

# 清理构建产物
clean:
    npm run clean
    rm -f *.vsix
