// 宿主网络命令桥 (webview 侧)
//
// 桌面版 (Tauri) 通过 invoke('dns_query', ...) 调用 Rust; 扩展宿主里改成把命令投递给
// 扩展 (src/extension.ts -> src/net/commands.ts), 由 Node 侧执行。
// 命令名 / 参数 / 返回结构与 Tauri 命令保持一致, 便于两类宿主共用同一份前端代码。

import { hasHost, postToHost } from './vscode';
import { isTauri } from './tauri';

/** 非桌面环境 (纯浏览器) 的提示文案 */
export const NET_UNAVAILABLE_ERROR = '该功能仅在桌面应用或 VS Code 扩展中可用';

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const pending = new Map<string, Pending>();
let requestSeq = 0;

/** 是否有可用的宿主网络能力 (Tauri 桌面端 / VS Code 扩展宿主) */
export function netAvailable(): boolean {
  return isTauri() || hasHost();
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as
      | { command?: string; requestId?: string; ok?: boolean; result?: unknown; error?: string }
      | null;
    if (!data || data.command !== 'netCommandResult' || !data.requestId) return;
    const entry = pending.get(data.requestId);
    if (!entry) return;
    pending.delete(data.requestId);
    if (data.ok) entry.resolve(data.result);
    else entry.reject(new Error(data.error ?? '宿主执行失败'));
  });
}

/** 调用宿主网络命令; 无宿主能力时抛出 NET_UNAVAILABLE_ERROR */
export async function netInvoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  if (!hasHost()) throw new Error(NET_UNAVAILABLE_ERROR);

  const requestId = `net-${Date.now()}-${(requestSeq += 1)}`;
  return new Promise<T>((resolve, reject) => {
    pending.set(requestId, { resolve: resolve as (value: unknown) => void, reject });
    postToHost({ command: 'netCommand', requestId, cmd, args });
    // Whois / 多服务器 DNS 可能较慢, 留足超时时间, 避免 pending 泄漏
    window.setTimeout(() => {
      if (pending.delete(requestId)) reject(new Error('宿主响应超时'));
    }, 60_000);
  });
}
