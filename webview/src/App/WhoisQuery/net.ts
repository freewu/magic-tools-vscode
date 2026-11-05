// Whois 查询网络层: 走宿主命令桥 (桌面版 = Tauri TCP 43, VS Code = 扩展宿主 Node TCP 43)

import { NET_UNAVAILABLE_ERROR, netAvailable, netInvoke } from '../../lib/net-bridge';
import type { WhoisResult } from './lib';

/** 无宿主网络能力时调用网络命令的统一错误 */
export const DESKTOP_ONLY_ERROR = NET_UNAVAILABLE_ERROR;

/**
 * 查询域名 / IP 的 Whois 信息 (跟随注册局转介, 最多 3 跳)
 * @param query 已归一化的域名或 IP
 */
export async function whoisQuery(query: string): Promise<WhoisResult> {
  if (!netAvailable()) throw new Error(DESKTOP_ONLY_ERROR);
  return netInvoke<WhoisResult>('whois_query', { query });
}
