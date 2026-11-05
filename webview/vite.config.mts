import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Webview 前端构建: 产物 dist/webview/ (index.html + assets/)
// - base './'  : 扩展用 asWebviewUri 重写相对路径, 不能是绝对路径
// - target      : 现代 VSCode WebView (Chromium) 即可
export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [react()],
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
    // 工具众多且按 app 懒加载分包, 单个 antd vendor 块偏大属正常
    chunkSizeWarningLimit: 4096,
    reportCompressedSize: false,
    cssCodeSplit: false,
  },
});
