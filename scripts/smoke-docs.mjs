#!/usr/bin/env node
// 官网冒烟测试: 在 jsdom 里加载 docs/index.html, 检查脚本 / 数据 / 交互是否正常
//
// 覆盖:
//   - 页面无脚本报错, 版本号与工具总数被数据填充
//   - 工具卡片数量 = tools-data.js 里的工具总数
//   - 分类按钮数量正确, 点击分类 / 输入关键字能正确过滤
//   - 外部链接 (marketplace / releases / repo) 已按数据设置
//
// 用法: node scripts/smoke-docs.mjs   (CI 与 `just docs-serve` 之前都会跑)

import { JSDOM, VirtualConsole } from 'jsdom';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const indexFile = resolve(root, 'docs', 'index.html');

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => errors.push(`jsdomError: ${error.message}`));
virtualConsole.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`));

const dom = await JSDOM.fromFile(indexFile, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  url: pathToFileURL(indexFile).href,
  virtualConsole,
});

const { window } = dom;
await new Promise((done) => window.addEventListener('load', done));
// 给脚本里的 render() 一点时间
await new Promise((done) => setTimeout(done, 60));

const document = window.document;
const failures = [];
const check = (ok, label, detail = '') => {
  if (ok) return;
  failures.push(detail ? `${label} — ${detail}` : label);
};

// 数据文件本身
const data = window.MAGIC_TOOLS_DATA;
check(Boolean(data), 'docs/assets/tools-data.js 未加载');
const expectedTotal = data?.total ?? 0;
check(expectedTotal > 0, 'tools-data.js 里的工具总数为 0');

// 版本 / 总数占位符
const versionTexts = [...document.querySelectorAll('[data-version]')].map((n) => n.textContent.trim());
check(versionTexts.length > 0, '页面缺少 [data-version] 占位符');
check(
  versionTexts.every((text) => text === data?.version),
  '版本号未正确填充',
  `期望 ${data?.version}, 实际 ${versionTexts.join('/')}`,
);
const totalTexts = [...document.querySelectorAll('[data-total]')].map((n) => n.textContent.trim());
check(
  totalTexts.every((text) => text === String(expectedTotal)),
  '工具总数未正确填充',
  `期望 ${expectedTotal}, 实际 ${totalTexts.join('/')}`,
);

// 工具卡片
const cards = [...document.querySelectorAll('#tools-grid .tool')];
check(cards.length === expectedTotal, '工具卡片数量不符', `期望 ${expectedTotal}, 实际 ${cards.length}`);
check(
  cards.every((card) => card.querySelector('.tool-name')?.textContent?.trim()),
  '存在没有名称的工具卡片',
);

// 分类按钮: 全部 + 每个有工具的分类
const activeTypes = (data?.types ?? []).filter((type) => type.tools.length > 0);
const chips = [...document.querySelectorAll('#type-chips .chip')];
check(
  chips.length === activeTypes.length + 1,
  '分类按钮数量不符',
  `期望 ${activeTypes.length + 1}, 实际 ${chips.length}`,
);
check(chips[0]?.getAttribute('aria-pressed') === 'true', '「全部」按钮初始应为按下态');

// 按分类过滤
const cryptography = activeTypes.find((type) => type.key === 'crypto') ?? activeTypes[0];
const chip = document.querySelector(`#type-chips .chip[data-type="${cryptography.key}"]`);
check(Boolean(chip), `找不到分类按钮 ${cryptography.key}`);
chip?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((done) => setTimeout(done, 20));
const filtered = document.querySelectorAll('#tools-grid .tool').length;
check(
  filtered === cryptography.tools.length,
  '按分类过滤结果数量不符',
  `期望 ${cryptography.tools.length}, 实际 ${filtered}`,
);
check(chip?.getAttribute('aria-pressed') === 'true', '点击后分类按钮未变成按下态');

// 回到全部 + 关键字搜索
document.querySelector('#type-chips .chip[data-type="all"]')?.dispatchEvent(
  new window.MouseEvent('click', { bubbles: true }),
);
const search = document.querySelector('#tools-search');
search.value = 'json';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
await new Promise((done) => setTimeout(done, 20));
const searched = [...document.querySelectorAll('#tools-grid .tool-name')].map((n) => n.textContent);
check(searched.length > 0, '搜索 json 应有结果');
check(
  searched.every((name) => name.toLowerCase().includes('json')),
  '搜索结果里出现了不含 json 的工具',
  searched.join(', '),
);
const resultText = document.querySelector('#tools-result')?.textContent ?? '';
check(/找到 \d+ 个工具/.test(resultText), '搜索结果计数文案不正确', resultText);

// 搜不到时的空状态
search.value = '这个工具肯定不存在zzz';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
await new Promise((done) => setTimeout(done, 20));
check(document.querySelectorAll('#tools-grid .tool').length === 0, '无匹配时不应有卡片');
check(document.querySelector('#tools-empty')?.hidden === false, '无匹配时应显示空状态');

// 折叠区完整清单
const catBlocks = document.querySelectorAll('#tools-table .cat-block');
check(
  catBlocks.length === activeTypes.length,
  '折叠区分类块数量不符',
  `期望 ${activeTypes.length}, 实际 ${catBlocks.length}`,
);

// 外链
const linkExpect = {
  'hero-marketplace': data?.links?.marketplace,
  'hero-vsix': data?.links?.releases,
  'install-openvsx': data?.links?.openVsx,
  'footer-repo': data?.links?.repo,
};
for (const [id, expected] of Object.entries(linkExpect)) {
  if (!expected) continue;
  const node = document.getElementById(id);
  if (!node) continue; // 页面可裁剪, 缺省不视为失败
  check(node.getAttribute('href') === expected, `#${id} 链接不正确`, node.getAttribute('href') ?? '');
}

// 页面级错误
check(errors.length === 0, '页面脚本报错', errors.join(' | '));

window.close();

if (failures.length > 0) {
  console.error('✗ 官网冒烟测试失败:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `✓ 官网冒烟测试通过 — ${expectedTotal} 个工具 / ${activeTypes.length} 个分类, 过滤与搜索正常`,
);
