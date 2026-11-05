// 网络能力命令桥 (扩展宿主侧)
//
// webview 无法直接做 DNS / Whois / ICMP / 跨域抓取, 统一投递到这里执行。
// 命令名与桌面版 Tauri 的 #[tauri::command] 保持一致, webview 侧只换调用方式。

import { dnsQuery, reverseDns } from './dns';
import { fetchUrlBody } from './fetch';
import { mtrProbe, mtrResolve } from './mtr';
import { whoisQuery } from './whois';

/** 支持的宿主命令 */
export type NetCommand =
  | 'dns_query'
  | 'reverse_dns'
  | 'whois_query'
  | 'mtr_resolve'
  | 'mtr_probe'
  | 'fetch_url_body';

type Args = Record<string, unknown>;

const argString = (args: Args, key: string): string => {
  const value = args[key];
  return typeof value === 'string' ? value : '';
};

const argNumber = (args: Args, key: string): number | null => {
  const value = args[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
};

/**
 * 执行一条网络命令
 * @param command 命令名 (与 Tauri 命令同名)
 * @param args 命令参数 (camelCase 为 Tauri 的默认约定, snake_case 亦兼容)
 */
export async function runNetCommand(command: string, args: Args): Promise<unknown> {
  switch (command) {
    case 'dns_query': {
      const name = argString(args, 'name');
      const recordType = argString(args, 'recordType') || argString(args, 'record_type');
      const server = argString(args, 'server');
      return dnsQuery(name, recordType, server);
    }
    case 'reverse_dns':
      return reverseDns(argString(args, 'ip'));
    case 'whois_query':
      return whoisQuery(argString(args, 'query'));
    case 'mtr_resolve':
      return mtrResolve(argString(args, 'host'));
    case 'mtr_probe': {
      const host = argString(args, 'host');
      const ttl = argNumber(args, 'ttl') ?? 1;
      const timeoutMs = argNumber(args, 'timeoutMs') ?? argNumber(args, 'timeout_ms');
      return mtrProbe(host, ttl, timeoutMs);
    }
    case 'fetch_url_body':
      return fetchUrlBody(argString(args, 'url'));
    default:
      throw new Error(`不支持的命令: ${command}`);
  }
}
