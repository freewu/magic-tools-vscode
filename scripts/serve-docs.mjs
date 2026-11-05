#!/usr/bin/env node
// 本地预览官网 (docs/): 零依赖静态文件服务
//
// 用法: node scripts/serve-docs.mjs [端口]   (默认 1313)

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', 'docs');
const port = Number(process.argv[2] ?? process.env.PORT ?? 1313);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((request, response) => {
  const rawPath = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');
  // 归一化并限制在 docs/ 内, 防止 ../ 穿越
  const target = normalize(join(root, rawPath));
  if (!target.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let file = target;
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    statSync(file);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not Found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`官网预览: http://localhost:${port}/  (目录: docs/)`);
  console.log('提示: 改动 docs/ 下的文件后刷新即可, 无需重启');
});
