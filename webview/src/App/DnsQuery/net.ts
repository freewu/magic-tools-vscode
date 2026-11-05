// DNS 查询网络层: 走宿主命令桥 (桌面版 = Tauri Rust 命令, VS Code = 扩展宿主 Node)

import { NET_UNAVAILABLE_ERROR, netAvailable, netInvoke } from '../../lib/net-bridge';
import { ALL_RECORD_TYPES, RECORD_TYPES, type DnsQueryResult, type DnsTypeResult } from './lib';

/** 无宿主网络能力时调用网络命令的统一错误 */
export const DESKTOP_ONLY_ERROR = NET_UNAVAILABLE_ERROR;

/** 调用宿主命令 (无宿主能力时直接报错, 避免触发动态导入) */
async function invokeCmd<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  if (!netAvailable()) throw new Error(DESKTOP_ONLY_ERROR);
  return netInvoke<T>(cmd, args);
}

/** 判断是否「全部类型」查询 */
export function isAllTypes(recordType: string): boolean {
  return recordType === ALL_RECORD_TYPES;
}

/**
 * 查询单个记录类型
 * @param name 域名 (已归一化, 无需带结尾点)
 * @param recordType A / AAAA / CNAME / MX / TXT / SRV / NS
 * @param server DNS 服务器 IP; 'system' 或空串表示使用系统配置
 */
export async function queryDns(
  name: string,
  recordType: string,
  server: string,
): Promise<DnsQueryResult> {
  const custom = server.trim();
  return invokeCmd<DnsQueryResult>('dns_query', {
    name,
    recordType,
    server: custom === '' || custom === 'system' ? null : custom,
  });
}

/**
 * 查询全部记录类型 (并行)
 * 单个类型失败 (超时等) 不阻断其它类型, 该类型以 status='error' 的结果返回
 * @param name 域名 (已归一化)
 * @param server DNS 服务器 IP
 */
export async function queryAllDns(name: string, server: string): Promise<DnsTypeResult[]> {
  if (!netAvailable()) throw new Error(DESKTOP_ONLY_ERROR);
  const custom = server.trim();
  const settled = await Promise.allSettled(RECORD_TYPES.map((t) => queryDns(name, t, server)));
  return settled.map((item, i) => {
    const recordType = RECORD_TYPES[i] as string;
    if (item.status === 'fulfilled') return { recordType, result: item.value };
    const err = item.reason as Error;
    // 失败的类型没有实际使用的服务器信息, 空值时与后端一致展示「系统默认」
    return {
      recordType,
      result: {
        status: 'error',
        records: [],
        elapsedMs: 0,
        server: custom === '' || custom === 'system' ? '系统默认' : custom,
        message: err?.message ?? String(item.reason),
      },
    };
  });
}
