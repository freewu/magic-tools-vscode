// 冒烟测试: 把 src/App 下每个工具的页面组件在 Node 里渲染一遍
//
// 目的: 迁移 / 新增工具后快速发现「导入失败 / 渲染崩溃 / 缺少依赖」这类问题
// (不替代浏览器交互测试, 但能覆盖 90% 的低级错误)。
//
// 做法: 用 Vite SSR 加载器直接加载 TSX 源码 (免打包), 再用 react-dom/server
// 渲染到字符串; 需要浏览器 API 的部分用 jsdom 兜住。
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfigProvider } from 'antd';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const webviewRoot = fileURLToPath(new URL('../webview', import.meta.url));

// ---------------- 浏览器环境 (jsdom) ----------------
const dom = new JSDOM('<!DOCTYPE html><html><body class="vscode-dark"></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
// Node 20+ 自带只读 navigator, 用 defineProperty 覆盖
try {
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
} catch {
  /* 部分运行时不可改, 忽略 */
}
globalThis.location = window.location;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.MutationObserver = window.MutationObserver;
globalThis.localStorage = window.localStorage;
globalThis.sessionStorage = window.sessionStorage;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.URL.createObjectURL = () => 'blob:mock';
globalThis.URL.revokeObjectURL = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
globalThis.matchMedia = window.matchMedia;
// antd / 部分组件依赖的尺寸观察器
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;
globalThis.IntersectionObserver = ResizeObserverMock;
window.IntersectionObserver = ResizeObserverMock;

// ---------------- Vite SSR 加载 TSX ----------------
const server = await createServer({
  configFile: path.join(webviewRoot, 'vite.config.mts'),
  root: webviewRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const appRoot = path.join(webviewRoot, 'src', 'App');
const keys = readdirSync(appRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(appRoot, entry.name, 'index.tsx')))
  .map((entry) => entry.name)
  .sort();

const { LocaleProvider } = await server.ssrLoadModule('/src/hook/locale-context.tsx');

let failed = 0;
const errors = [];

for (const key of keys) {
  try {
    // eslint-disable-next-line no-await-in-loop
    const mod = await server.ssrLoadModule(`/src/App/${key}/index.tsx`);
    const Page = mod.default;
    if (typeof Page !== 'function') throw new Error('index.tsx 缺少默认导出的组件');
    const html = renderToStaticMarkup(
      React.createElement(ConfigProvider, null, React.createElement(LocaleProvider, null, React.createElement(Page))),
    );
    if (!html || html.length < 5) throw new Error('渲染结果为空');
    console.log(`✓ ${key}`);
  } catch (error) {
    failed += 1;
    errors.push({ key, message: error?.message ?? String(error) });
    console.log(`✗ ${key}: ${error?.message ?? error}`);
  }
}

// 外壳 (工具列表 / 面板) 也渲染一遍: 覆盖 import.meta.glob 注册表与主题适配
try {
  const { default: Shell } = await server.ssrLoadModule('/src/shell/Shell.tsx');
  const shellHtml = renderToStaticMarkup(React.createElement(Shell));
  if (!shellHtml.includes('mt-browser')) throw new Error('外壳未渲染出工具列表');
  console.log('\n✓ 外壳 (工具列表) 渲染通过');
} catch (error) {
  failed += 1;
  errors.push({ key: 'Shell', message: error?.message ?? String(error) });
  console.log(`✗ Shell: ${error?.message ?? error}`);
}

await server.close();

console.log(`\n${keys.length + 1 - failed}/${keys.length + 1} 项渲染通过 (${keys.length} 个工具 + 1 个外壳)`);
if (failed > 0) {
  console.log('\n失败详情:');
  for (const item of errors) console.log(`- ${item.key}: ${item.message}`);
  process.exit(1);
}
