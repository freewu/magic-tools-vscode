/* Magic Tools for VS Code — 官网脚本
 *
 * 数据来自 docs/assets/tools-data.js (由 scripts/gen-docs.mjs 从源码生成)，
 * 所以这里的工具清单永远不会和扩展里的实际工具漂移。
 */

(() => {
  'use strict';

  const data = window.MAGIC_TOOLS_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // ------------------------------------------------------------ 版本 / 链接

  const setText = (selector, text) => {
    for (const node of $$(selector)) node.textContent = text;
  };

  const setHref = (id, href) => {
    const node = document.getElementById(id);
    if (node && href) node.href = href;
  };

  if (data) {
    setText('[data-version]', data.version);
    setText('[data-total]', String(data.total));

    const links = data.links || {};
    setHref('header-repo', links.repo);
    setHref('hero-marketplace', links.marketplace);
    setHref('hero-vsix', links.releases);
    setHref('feat-upstream', links.upstream);
    setHref('install-marketplace', links.marketplace);
    setHref('install-openvsx', links.openVsx);
    setHref('install-releases', links.releases);
    setHref('dev-repo', links.repo);
    setHref('footer-marketplace', links.marketplace);
    setHref('footer-openvsx', links.openVsx);
    setHref('footer-releases', links.releases);
    setHref('footer-issues', links.issues);
    setHref('footer-upstream', links.upstream);
    setHref('footer-repo', links.repo);
    document.title = `${data.name} for VS Code — ${data.total} 个开发者工具，左侧活动栏一键进入`;
  }

  const buildYear = $('#build-year');
  if (buildYear) buildYear.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------- 主题切换

  const THEME_KEY = 'magic-tools-docs-theme';
  const themeToggle = $('#theme-toggle');
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeToggle?.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
  };

  applyTheme(document.documentElement.dataset.theme || 'light');
  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 隐私模式下忽略 */
    }
  });

  // ---------------------------------------------------------------- 复制按钮

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // 非 https / 老浏览器回退
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
  };

  for (const button of $$('[data-copy]')) {
    button.addEventListener('click', async () => {
      const raw = button.dataset.copy || '';
      const text =
        button.hasAttribute('data-copy-version') && data
          ? raw.replace('{version}', data.version)
          : raw;
      const original = button.textContent;
      try {
        await copyText(text);
        button.textContent = '已复制';
        button.classList.add('is-done');
      } catch {
        button.textContent = '复制失败';
      }
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-done');
      }, 1600);
    });
  }

  // ---------------------------------------------------------------- 工具列表

  const grid = $('#tools-grid');
  const chips = $('#type-chips');
  const search = $('#tools-search');
  const result = $('#tools-result');
  const empty = $('#tools-empty');
  const allTable = $('#tools-table');

  if (!data || !grid || !chips) return;

  const types = data.types.filter((type) => type.tools.length > 0);
  const monogramOf = (name) => name.trim().charAt(0).toUpperCase();

  /** 扁平化工具清单, 附带分类信息与搜索用的小写文本 */
  const tools = types.flatMap((type) =>
    type.tools.map((tool) => ({
      ...tool,
      typeKey: type.key,
      typeName: type.name,
      searchText: `${tool.name} ${tool.key} ${type.name}`.toLowerCase(),
    })),
  );

  let activeType = 'all';
  let keyword = '';

  const matches = (tool) =>
    (activeType === 'all' || tool.typeKey === activeType) &&
    (keyword === '' || tool.searchText.includes(keyword));

  const toolCard = (tool) => {
    const link = document.createElement('a');
    link.className = 'tool';
    link.href = data.links?.repo ? `${data.links.repo}/tree/main/webview/src/App/${tool.key}` : '#tools';
    if (link.href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noopener';
      link.title = `${tool.name} — 查看源码 (${tool.typeName})`;
    } else {
      link.title = `${tool.name} — ${tool.typeName}`;
    }

    const monogram = document.createElement('span');
    monogram.className = 'tool-monogram';
    monogram.textContent = monogramOf(tool.name);
    monogram.setAttribute('aria-hidden', 'true');

    const body = document.createElement('span');
    body.className = 'tool-body';
    const name = document.createElement('span');
    name.className = 'tool-name';
    name.textContent = tool.name;
    const meta = document.createElement('span');
    meta.className = 'tool-meta';
    meta.textContent = `${tool.typeName} · ${tool.key}`;
    body.append(name, meta);

    link.append(monogram, body);
    return link;
  };

  const render = () => {
    const visible = tools.filter(matches);
    grid.replaceChildren(...visible.map(toolCard));
    if (empty) empty.hidden = visible.length > 0;

    if (result) {
      const scope = activeType === 'all' ? '' : `（${types.find((t) => t.key === activeType)?.name}）`;
      result.textContent =
        keyword === '' && activeType === 'all'
          ? `共 ${data.total} 个工具`
          : `找到 ${visible.length} 个工具${scope}`;
    }

    for (const chip of $$('.chip', chips)) {
      chip.setAttribute('aria-pressed', String(chip.dataset.type === activeType));
    }
  };

  const makeChip = (label, type, count) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.type = type;
    chip.setAttribute('aria-pressed', 'false');
    chip.textContent = label;
    if (count !== undefined) {
      const badge = document.createElement('span');
      badge.className = 'chip-count';
      badge.textContent = String(count);
      chip.append(badge);
    }
    chip.addEventListener('click', () => {
      activeType = type;
      render();
    });
    return chip;
  };

  chips.append(makeChip('全部', 'all', data.total));
  for (const type of types) {
    chips.append(makeChip(type.name, type.key, type.tools.length));
  }

  search?.addEventListener('input', () => {
    keyword = search.value.trim().toLowerCase();
    render();
  });

  // "/" 快速聚焦搜索框
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = (event.target instanceof HTMLElement ? event.target.tagName : '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    event.preventDefault();
    search?.focus();
  });

  // 折叠区里的完整清单
  if (allTable) {
    const blocks = types.map((type) => {
      const block = document.createElement('div');
      block.className = 'cat-block';

      const title = document.createElement('h4');
      title.textContent = `${type.name} · ${type.tools.length}`;

      const list = document.createElement('ul');
      list.className = 'cat-list';
      for (const tool of type.tools) {
        const item = document.createElement('li');
        item.textContent = tool.name;
        list.append(item);
      }

      block.append(title, list);
      return block;
    });
    allTable.replaceChildren(...blocks);
  }

  render();
})();
