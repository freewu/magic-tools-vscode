// 与扩展宿主 (src/extension.ts) 的通信桥
//
// - 纯浏览器 (just dev 直接开 http://localhost:1212) 时 hasHost() 为 false,
//   所有能力自动降级为浏览器原生实现 (下载 / window.open)
// - 在 VSCode WebView 中由宿主注入 acquireVsCodeApi(), 保存文件走
//   vscode.window.showSaveDialog + fs.writeFile (真正的系统保存框)

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

let api: VsCodeApi | null | undefined;

/** 取 VSCode WebView API (非 WebView 环境返回 null) */
export function vsCodeApi(): VsCodeApi | null {
  if (api === undefined) {
    const acquire = (globalThis as unknown as { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi;
    api = typeof acquire === 'function' ? acquire() : null;
  }
  return api;
}

/** 是否运行在 VSCode WebView 内 */
export const hasHost = (): boolean => vsCodeApi() !== null;

/** 发消息给扩展宿主 (非 WebView 环境静默丢弃) */
export function postToHost(message: Record<string, unknown>): void {
  vsCodeApi()?.postMessage(message);
}

/** WebView 内持久化状态 (关闭/切走后仍保留) */
export function getState<T>(): T | undefined {
  try {
    return vsCodeApi()?.getState() as T | undefined;
  } catch {
    return undefined;
  }
}

export function setState(state: unknown): void {
  try {
    vsCodeApi()?.setState(state);
  } catch {
    /* 忽略: 非 WebView 环境 */
  }
}

// ---------------------------------------------------------------- 保存文件

export interface SaveRequest {
  /** 默认文件名 (含后缀) */
  defaultName: string;
  /** 文本内容 (与 base64 二选一) */
  content?: string;
  /** 二进制内容 (base64 编码, 与 content 二选一) */
  base64?: string;
  /** 保存对话框标题 */
  title?: string;
  /** 文件类型显示名 */
  filterName?: string;
  /** 允许的扩展名 (不带点) */
  extensions?: string[];
}

export type SaveResult = 'saved' | 'canceled' | 'unsupported';

const pending = new Map<string, (result: SaveResult) => void>();
let requestSeq = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { command?: string; requestId?: string; ok?: boolean; canceled?: boolean } | null;
    if (!data || data.command !== 'saveFileResult' || !data.requestId) return;
    const resolve = pending.get(data.requestId);
    if (!resolve) return;
    pending.delete(data.requestId);
    resolve(data.ok ? 'saved' : data.canceled ? 'canceled' : 'unsupported');
  });
}

/** 请求宿主保存文件; 非 WebView 环境返回 'unsupported' 由调用方回退 */
export function requestSaveFile(req: SaveRequest): Promise<SaveResult> {
  if (!hasHost()) return Promise.resolve('unsupported');
  const requestId = `save-${Date.now()}-${(requestSeq += 1)}`;
  return new Promise<SaveResult>((resolve) => {
    pending.set(requestId, resolve);
    postToHost({ command: 'saveFile', requestId, ...req });
    // 宿主 30s 内必须应答, 否则视为失败, 避免 pending 泄漏
    window.setTimeout(() => {
      if (pending.delete(requestId)) resolve('unsupported');
    }, 30_000);
  });
}

/** 用系统浏览器打开链接 (WebView 内 a[target=_blank] 无效, 必须走宿主) */
export function openExternal(url: string): void {
  if (hasHost()) {
    postToHost({ command: 'openUrl', url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ---------------------------------------------------------------- 下载回退

/** 触发浏览器下载 (非 WebView 环境的回退实现) */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Uint8Array -> base64 (分块, 避免超长数组栈溢出) */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(binary);
}

/** base64 -> Uint8Array */
export function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
