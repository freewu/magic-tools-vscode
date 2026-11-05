// 应用注册表: 通过 Vite 的 import.meta.glob 在构建期静态枚举 src/App/* 下的
// define.tsx (元信息) 与 index.tsx (页面组件), 保持「新增工具目录即自动注册」。
//
// 说明: define.tsx 体积很小, 用 eager 一次载入; 页面组件保持懒加载,
// 每个工具单独分包, 打开时才拉取。

import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/** 工具分类 (顺序即侧边栏分组顺序) */
export const APP_TYPES: ReadonlyArray<{ key: string; name: string }> = [
  { key: 'convert', name: '类型转换' },
  { key: 'codec', name: '编解码' },
  { key: 'crypto', name: '加解密' },
  { key: 'value-calc', name: '值计算' },
  { key: 'formatter', name: '格式化' },
  { key: 'image', name: '图片' },
  { key: 'generator', name: '生成器' },
  { key: 'webmaster', name: '站长工具' },
  { key: 'misc', name: '其它' },
];

const TYPE_KEYS = new Set(APP_TYPES.map((t) => t.key));

export interface AppMeta {
  /** 目录名, 同时是打开工具的唯一 key */
  key: string;
  /** 显示名 (define.tsx 的 AppName) */
  name: string;
  /** antd 图标名 (define.tsx 的 Icon) */
  icon: string;
  /** 分类 (define.tsx 的 Type) */
  type: string;
}

const defineGlob = import.meta.glob<Record<string, unknown>>('/src/App/*/define.tsx', { eager: true });
const pageGlob = import.meta.glob('/src/App/*/index.tsx');

const appKeyOf = (path: string): string => path.replace(/^.*\/App\//, '').replace(/\/define\.tsx$/, '');

/** 全部可用工具 (已按分类过滤, 按名称排序) */
export const APP_LIST: AppMeta[] = Object.keys(defineGlob)
  .map((path) => {
    const key = appKeyOf(path);
    const mod = defineGlob[path] ?? {};
    return {
      key,
      name: String(mod.AppName ?? key),
      icon: String(mod.Icon ?? ''),
      type: String(mod.Type ?? ''),
    };
  })
  .filter((app) => TYPE_KEYS.has(app.type))
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

const pageCache = new Map<string, LazyExoticComponent<ComponentType>>();

/** 取工具的懒加载页面组件 (src/App/<key>/index.tsx 默认导出) */
export function pageOf(key: string): LazyExoticComponent<ComponentType> | undefined {
  const cached = pageCache.get(key);
  if (cached) return cached;
  const loader = pageGlob[`/src/App/${key}/index.tsx`];
  if (!loader) return undefined;
  const comp = lazy(loader as () => Promise<{ default: ComponentType }>);
  pageCache.set(key, comp);
  return comp;
}

/** 按 key 取元信息 */
export const appMetaOf = (key: string): AppMeta | undefined => APP_LIST.find((app) => app.key === key);
