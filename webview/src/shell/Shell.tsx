// Magic Tools WebView 外壳
//
// 两种模式 (同一个构建产物):
//   1. 侧边栏视图 (无 ?app= 参数): 工具浏览器 —— 搜索 + 按分类分组的工具列表,
//      点击工具 -> 通知宿主在编辑器区打开一个 WebView 面板
//   2. 编辑器面板 (?app=<key>): 只渲染该工具 (整块宽度, 适合宽表单类工具)

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Empty, Input } from 'antd';
import { CompressOutlined, ExpandOutlined, SearchOutlined } from '@ant-design/icons';
import { APP_LIST, APP_TYPES } from './registry';
import type { AppMeta } from './registry';
import { appIconNode } from './app-icons';
import { ToolPane } from './ToolPane';
import { hasHost, postToHost } from '../lib/vscode';
import { LocaleProvider } from '../hook/locale-context';
import { useAntdTheme } from './use-antd-theme';
import './shell.css';

const openTool = (app: AppMeta): void => {
  postToHost({ command: 'openTool', key: app.key, name: app.name });
};

/** 分类折叠状态 (按分类 key 记) 持久化到 WebView 的 localStorage */
const COLLAPSE_KEY = 'magic-tools.collapsed-groups';

function loadCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? new Set(list.filter((key): key is string => typeof key === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsed(next: Set<string>): void {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
  } catch {
    /* 隐私模式等场景下不可写, 忽略 */
  }
}

/** 编辑器面板: 单个工具 (带一条很窄的标题栏) */
function PanelView({ appKey, onBack }: { appKey: string; onBack?: () => void }) {
  const app = APP_LIST.find((item) => item.key === appKey);
  return (
    <div className="mt-panel">
      <div className="mt-panel-head">
        <span className="mt-panel-icon">{appIconNode(app?.icon)}</span>
        <span className="mt-panel-title">{app?.name ?? appKey}</span>
        {onBack && (
          <button type="button" className="mt-link-btn" onClick={onBack}>
            返回列表
          </button>
        )}
      </div>
      <div className="mt-panel-body">
        <ToolPane appKey={appKey} />
      </div>
    </div>
  );
}

/** 侧边栏: 搜索 + 分组工具列表 */
function BrowserView({ onPreview }: { onPreview: (key: string) => void }) {
  const [keyword, setKeyword] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const inputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return APP_TYPES.map((type) => ({
      ...type,
      apps: APP_LIST.filter(
        (app) => app.type === type.key && (!kw || app.name.toLowerCase().includes(kw) || app.key.toLowerCase().includes(kw)),
      ),
    })).filter((group) => group.apps.length > 0);
  }, [keyword]);

  // 搜索时一律展开 (否则命中的工具藏在折叠的分类里), 此时分类标题不可点
  const searching = keyword.trim().length > 0;
  const isCollapsed = (key: string) => !searching && collapsed.has(key);

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCollapsed(next);
      return next;
    });
  }, []);

  const allCollapsed = groups.length > 0 && groups.every((group) => collapsed.has(group.key));
  const toggleAll = useCallback(() => {
    const keys = groups.map((group) => group.key);
    const foldAll = !keys.every((key) => collapsed.has(key));
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (foldAll) next.add(key);
        else next.delete(key);
      }
      saveCollapsed(next);
      return next;
    });
  }, [collapsed, groups]);

  const click = (app: AppMeta) => {
    if (hasHost()) {
      openTool(app);
      return;
    }
    // 浏览器调试 (just dev): 直接在当前页打开, 无宿主可通知
    onPreview(app.key);
  };

  return (
    <div className="mt-browser">
      <div className="mt-browser-head">
        <Input
          ref={inputRef as never}
          className="mt-search"
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索工具"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          type="button"
          className="mt-head-btn"
          disabled={searching || groups.length === 0}
          title={allCollapsed ? '展开全部分类' : '折叠全部分类'}
          onClick={toggleAll}
        >
          {allCollapsed ? <ExpandOutlined /> : <CompressOutlined />}
        </button>
      </div>

      <div className="mt-list">
        {groups.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的工具" />}
        {groups.map((group) => {
          const folded = isCollapsed(group.key);
          return (
            <section key={group.key} className="mt-group">
              <header className="mt-group-title">
                <button
                  type="button"
                  className="mt-group-toggle"
                  aria-expanded={!folded}
                  aria-controls={`mt-group-${group.key}`}
                  disabled={searching}
                  title={folded ? `展开「${group.name}」` : `折叠「${group.name}」`}
                  onClick={() => toggle(group.key)}
                >
                  <span className={`mt-caret${folded ? '' : ' mt-caret--open'}`} aria-hidden>
                    ▶
                  </span>
                  <span className="mt-group-name">{group.name}</span>
                  <span className="mt-group-count">{group.apps.length}</span>
                </button>
              </header>
              {!folded && (
                <div className="mt-group-body" id={`mt-group-${group.key}`}>
                  {group.apps.map((app) => (
                    <button
                      type="button"
                      key={app.key}
                      className="mt-item"
                      title={app.name}
                      onClick={() => click(app)}
                    >
                      <span className="mt-item-icon">{appIconNode(app.icon)}</span>
                      <span className="mt-item-name">{app.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="mt-browser-foot">共 {APP_LIST.length} 个工具 · 点击在编辑器区打开</footer>
    </div>
  );
}

export default function Shell() {
  const { theme } = useAntdTheme();
  const initialApp = useMemo(() => {
    // 编辑器面板: 宿主注入 window.__MAGIC_TOOLS_APP__; 浏览器调试: ?app=<key>
    const injected = (window as unknown as { __MAGIC_TOOLS_APP__?: string }).__MAGIC_TOOLS_APP__;
    return injected || new URLSearchParams(window.location.search).get('app') || '';
  }, []);
  const [preview, setPreview] = useState('');

  // 宿主里由多个 WebView 面板共享同一份 antd 样式? 各 WebView 相互隔离, 无需额外处理;
  // 这里只在浏览器调试的「列表 -> 工具」切换时把滚动位置复位
  useEffect(() => {
    if (preview) window.scrollTo({ top: 0 });
  }, [preview]);

  const appKey = initialApp || preview;

  return (
    <ConfigProvider theme={theme}>
      <LocaleProvider>
        <div className="mt-root">
          {appKey ? (
            <PanelView appKey={appKey} onBack={initialApp ? undefined : () => setPreview('')} />
          ) : (
            <BrowserView onPreview={setPreview} />
          )}
        </div>
      </LocaleProvider>
    </ConfigProvider>
  );
}
