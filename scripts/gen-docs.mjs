#!/usr/bin/env node
// 生成官网数据文件: docs/assets/tools-data.js
//
// 工具清单的唯一来源是 webview/src/App/<工具>/define.tsx (AppName / Icon / Type) 与
// webview/src/shell/registry.ts 里的 APP_TYPES; 这里在构建 docs 前把它们抽成静态 JS,
// 避免官网手写一份会和代码漂移的工具列表。
//
// 用法: node scripts/gen-docs.mjs   (或 npm run docs:gen / just docs)

import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const appDir = join(root, 'webview', 'src', 'App');
const registryFile = join(root, 'webview', 'src', 'shell', 'registry.ts');
const docsAssets = join(root, 'docs', 'assets');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** 从 define.tsx 里取常量字符串 */
const constOf = (source, name) => {
  const hit = new RegExp(`const\\s+${name}\\s*=\\s*(['"])(.*?)\\1`).exec(source);
  return hit ? hit[2] : '';
};

// 分类顺序 / 名称以 registry.ts 为准
const registry = readFileSync(registryFile, 'utf8');
const typeBlock = /APP_TYPES[^=]*=\s*\[([\s\S]*?)\n\];/.exec(registry);
if (!typeBlock) throw new Error('无法从 registry.ts 解析 APP_TYPES');
const types = [...typeBlock[1].matchAll(/\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g)].map(
  ([, key, name]) => ({ key, name, tools: [] }),
);
const typeIndex = new Map(types.map((type, index) => [type.key, index]));

// 枚举工具目录
for (const entry of readdirSync(appDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const definePath = join(appDir, entry.name, 'define.tsx');
  let source;
  try {
    source = readFileSync(definePath, 'utf8');
  } catch {
    continue; // 没有 define.tsx 的目录不是工具
  }
  const type = constOf(source, 'Type');
  const index = typeIndex.get(type);
  if (index === undefined) continue; // 未迁移的分类 (如「游戏」)
  types[index].tools.push({
    key: entry.name,
    name: constOf(source, 'AppName') || entry.name,
    icon: constOf(source, 'Icon'),
  });
}

for (const type of types) {
  type.tools.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
const total = types.reduce((sum, type) => sum + type.tools.length, 0);

const repo = 'https://github.com/freewu/magic-tools-vscode';
const data = {
  name: pkg.displayName,
  version: pkg.version,
  description: pkg.description,
  publisher: pkg.publisher,
  extensionId: `${pkg.publisher}.${pkg.name}`,
  license: pkg.license,
  engines: pkg.engines?.vscode ?? '',
  total,
  types,
  links: {
    repo,
    issues: `${repo}/issues`,
    releases: `${repo}/releases`,
    marketplace: `https://marketplace.visualstudio.com/items?itemName=${pkg.publisher}.${pkg.name}`,
    openVsx: `https://open-vsx.org/extension/${pkg.publisher}/${pkg.name}`,
    upstream: 'https://github.com/freewu/magic-tools',
    site: 'https://freewu.github.io/magic-tools-vscode/',
  },
};

mkdirSync(docsAssets, { recursive: true });
const banner = '// 由 scripts/gen-docs.mjs 生成, 请勿手改 (改动会被下次生成覆盖)\n';
writeFileSync(
  join(docsAssets, 'tools-data.js'),
  `${banner}window.MAGIC_TOOLS_DATA = ${JSON.stringify(data, null, 2)};\n`,
  'utf8',
);

// 站点图标直接复用扩展的图标资源
for (const icon of ['icon-color.svg', 'icon.svg']) {
  copyFileSync(join(root, 'assets', icon), join(docsAssets, icon));
}

// index.html 里的版本号 / 总数占位符同步一份, 保证禁用 JS 时看到的也是真实数据
const indexPath = join(root, 'docs', 'index.html');
const html = readFileSync(indexPath, 'utf8');
const patched = html
  .replace(/(data-version>)[^<]*/g, `$1${pkg.version}`)
  .replace(/(data-total>)[^<]*/g, `$1${total}`);
if (patched !== html) writeFileSync(indexPath, patched, 'utf8');

console.log(
  `✓ docs/assets/tools-data.js — ${total} 个工具 / ${types.length} 个分类 (v${pkg.version})`,
);
console.log(`  ${types.map((type) => `${type.name} ${type.tools.length}`).join(' · ')}`);
