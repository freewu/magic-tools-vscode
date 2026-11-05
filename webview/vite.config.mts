import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// ---------------- Vditor 运行时资源 (仅「即时渲染 Markdown」使用) ----------------
// Vditor 把 lute 引擎 / 图标 / 语言包 / 代码高亮 / katex / 内容主题 / 表情图 都放在运行期
// 通过 cdn 选项按 URL 拉取 (默认指向 unpkg, 离线不可用)。这里把用到的子集在构建时拷到
// dist/webview/vditor, 开发服务器直接用中间件从 node_modules 读取; 仓库不提交这批大文件 (~5MB)。
// 资源子路径与 src/App/VditorMarkdown/lib.ts 的 vditorCdn/MARKDOWN 前缀一一对应。
const VDITOR_ROOT = resolve(here('..'), 'node_modules/vditor');

const VDITOR_FILES = [
  // 内容主题 (浅色 / 深色, 与 setTheme 的 contentTheme 参数对应)
  'dist/css/content-theme/light.css',
  'dist/css/content-theme/dark.css',
  // 界面语言包
  'dist/js/i18n/zh_CN.js',
  'dist/js/i18n/zh_TW.js',
  'dist/js/i18n/en_US.js',
  // 工具栏图标 + lute 引擎 (3.6MB, 缺它编辑器无法渲染)
  'dist/js/icons/ant.js',
  'dist/js/lute/lute.min.js',
  // 代码高亮核心 + 按需语言包 + 当前使用的两个代码主题
  'dist/js/highlight.js/highlight.min.js',
  'dist/js/highlight.js/third-languages.js',
  'dist/js/highlight.js/styles/github.min.css',
  'dist/js/highlight.js/styles/github-dark.min.css',
  // 公式渲染 (KaTeX)
  'dist/js/katex/katex.min.js',
  'dist/js/katex/katex.min.css',
  'dist/js/katex/mhchem.min.js',
];

// 整目录拷贝: 表情图很小直接全拷; KaTeX 字体只保留 woff2 (省掉 ttf/woff 约 800KB)
const VDITOR_DIRS: { path: string; keep?: (name: string) => boolean }[] = [
  { path: 'dist/images/emoji' },
  { path: 'dist/js/katex/fonts', keep: (name) => name.endsWith('.woff2') },
];

const VDITOR_MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const copyDir = (from: string, to: string, keep?: (name: string) => boolean) => {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, join(to, entry.name), keep);
    } else if (!keep || keep(entry.name)) {
      cpSync(src, join(to, entry.name));
    }
  }
};

const copyVditorAssets = (dest: string) => {
  if (!existsSync(VDITOR_ROOT)) return;
  for (const rel of VDITOR_FILES) {
    const src = join(VDITOR_ROOT, rel);
    if (!existsSync(src)) continue;
    const out = join(dest, rel);
    mkdirSync(dirname(out), { recursive: true });
    cpSync(src, out);
  }
  for (const dir of VDITOR_DIRS) {
    const src = join(VDITOR_ROOT, dir.path);
    if (!existsSync(src)) continue;
    copyDir(src, join(dest, dir.path), dir.keep);
  }
};

/** 构建时把 Vditor 运行时资源拷进产物, 开发时用中间件从 node_modules 直接读取 */
const vditorAssets = (): Plugin => {
  let outDir = resolve(here('..'), 'dist/webview');
  return {
    name: 'magictools-vditor-assets',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0].split('#')[0];
        if (!path.startsWith('/vditor/')) {
          next();
          return;
        }
        const file = resolve(VDITOR_ROOT, decodeURIComponent(path.slice('/vditor/'.length)));
        if (!file.startsWith(VDITOR_ROOT) || !existsSync(file) || !statSync(file).isFile()) {
          next();
          return;
        }
        res.setHeader('Content-Type', VDITOR_MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(file));
      });
    },
    closeBundle() {
      copyVditorAssets(join(outDir, 'vditor'));
    },
  };
};

// Webview 前端构建: 产物 dist/webview/ (index.html + assets/ + vditor/)
// - base './'  : 扩展用 asWebviewUri 重写相对路径, 不能是绝对路径
// - target      : 现代 VSCode WebView (Chromium) 即可
export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [react(), vditorAssets()],
  // 浏览器调试: just dev-web → http://localhost:1212/?app=AESCrypto
  server: {
    port: 1212,
    strictPort: true,
  },
  build: {
    outDir: here('../dist/webview'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    // 工具众多且按 app 懒加载分包, 单个 antd vendor 块偏大属正常;
    // Excalidraw (白板) / Vditor (Markdown) / mermaid 相关 chunk 体积较大, 阈值放宽
    chunkSizeWarningLimit: 6000,
    reportCompressedSize: false,
    cssCodeSplit: false,
  },
});
