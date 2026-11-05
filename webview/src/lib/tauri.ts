// 桌面端 (Tauri) 能力在 VSCode 扩展里的平替实现
//
// 原项目 src/lib/tauri.ts 通过 @tauri-apps 插件弹系统对话框 / 写文件;
// 扩展里没有 Tauri, 改为:
//   1. VSCode WebView 内 -> postMessage 给宿主, 由 vscode.window.showSaveDialog + fs 落盘
//   2. 纯浏览器调试       -> <a download> 下载
// 事件类接口 (主题/语言/托盘) 在扩展里无对应来源, 保持空实现, 不影响工具本身。

import { bytesToBase64, downloadBlob, openExternal, requestSaveFile, hasHost } from './vscode';

/** 用系统默认浏览器打开链接 */
export async function openUrl(url: string): Promise<void> {
  openExternal(url);
}

/** 是否运行在 Tauri WebView 中 (扩展里恒为 false, 走 Web 实现) */
export function isTauri(): boolean {
  return false;
}

interface SaveOpts {
  title?: string;
  filterName?: string;
  extensions?: string[];
}

/** 把 data URL 里的 base64 部分取出来 */
const dataUrlToBase64 = (dataUrl: string): string => {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
};

/**
 * 保存二进制 (宿主保存对话框 / 浏览器下载)
 * @returns true = 已保存或已触发下载; false = 用户取消
 */
async function saveBinary(defaultName: string, bytes: Uint8Array, opts: SaveOpts = {}): Promise<boolean> {
  const result = await requestSaveFile({
    defaultName,
    base64: bytesToBase64(bytes),
    title: opts.title,
    filterName: opts.filterName,
    extensions: opts.extensions,
  });
  if (result === 'saved') return true;
  if (result === 'canceled') return false;
  downloadBlob(defaultName, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' }));
  return true;
}

/**
 * 保存 PNG 图片 (canvas.toDataURL('image/png'))
 * @returns true = 已保存/已触发下载; false = 用户取消
 */
export async function savePngFile(defaultName: string, dataUrl: string): Promise<boolean> {
  const result = await requestSaveFile({
    defaultName,
    base64: dataUrlToBase64(dataUrl),
    title: '保存图片',
    filterName: 'PNG 图片',
    extensions: ['png'],
  });
  if (result === 'saved') return true;
  if (result === 'canceled') return false;
  const a = document.createElement('a');
  a.download = defaultName;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

/**
 * 保存文本文件 (密钥导出等)
 * @returns true = 已保存/已触发下载; false = 用户取消
 */
export async function saveTextFile(
  defaultName: string,
  content: string,
  title = '保存文件',
  opts: { filterName?: string; extensions?: string[] } = {},
): Promise<boolean> {
  const result = await requestSaveFile({
    defaultName,
    content,
    title,
    filterName: opts.filterName ?? '文本文件',
    extensions: opts.extensions ?? ['txt', 'pem', 'key', 'htpasswd'],
  });
  if (result === 'saved') return true;
  if (result === 'canceled') return false;
  downloadBlob(defaultName, new Blob([content], { type: 'text/plain;charset=utf-8' }));
  return true;
}

/** 保存任意字节文件 */
export async function saveBytesFile(
  defaultName: string,
  bytes: Uint8Array,
  opts: SaveOpts = {},
): Promise<boolean> {
  return saveBinary(defaultName, bytes, opts);
}

/** 批量保存 PNG (二维码 / 条形码批量导出), 返回实际保存数量 */
export async function savePngBatch(defaultNames: string[], dataUrls: string[]): Promise<number> {
  const names = defaultNames.slice(0, dataUrls.length);
  let ok = 0;
  for (let i = 0; i < names.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await savePngFile(names[i], dataUrls[i])) ok += 1;
  }
  return ok;
}

/** 批量保存任意文件 (Zip 解压导出等), 返回实际保存数量 */
export async function saveBytesBatch(
  files: readonly { name: string; bytes: Uint8Array }[],
  opts: { title?: string; dirName?: string } = {},
): Promise<number> {
  if (files.length === 0) return 0;
  // 路径防御: 去掉 .. 与开头的 /, 分隔符统一为 /
  const safeName = (name: string): string =>
    String(name ?? '').replace(/\\/g, '/').split('/').filter((p) => p !== '' && p !== '.' && p !== '..').join('/');
  const prefix = opts.dirName ? `${opts.dirName}/` : '';

  let ok = 0;
  for (const file of files) {
    const name = safeName(file.name).split('/').pop() ?? 'file';
    // eslint-disable-next-line no-await-in-loop
    if (await saveBinary(prefix.replace(/\//g, '-') + name, file.bytes, { title: opts.title ?? '保存文件' })) ok += 1;
  }
  return ok;
}

// ------------------------------------------------------- 桌面端事件 (空实现)

/** 通知托盘同步主题 (扩展内无托盘) */
export async function emitThemeMode(_mode: string): Promise<void> {
  /* noop */
}

/** 通知托盘同步语言 (扩展内无托盘) */
export async function emitLocale(_locale: string): Promise<void> {
  /* noop */
}

/** 监听托盘切换语言 -> 扩展内无此事件 */
export async function listenLocale(_handler: (locale: string) => void): Promise<() => void> {
  return () => {};
}

/** 监听托盘打开页面 -> 扩展内无此事件 */
export async function listenOpenPage(_handler: (page: string) => void): Promise<() => void> {
  return () => {};
}

/** 监听托盘切换主题 -> 扩展内无此事件 */
export async function listenThemeMode(_handler: (mode: string) => void): Promise<() => void> {
  return () => {};
}

/** 是否在真实宿主内 (供工具判断是否需要额外提示) */
export const hasNativeHost = hasHost;
