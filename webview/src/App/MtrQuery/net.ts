// MTR 查询网络层: 走宿主命令桥 (桌面版 = Tauri ICMP, VS Code = 扩展宿主调用系统 ping)

import { NET_UNAVAILABLE_ERROR, netAvailable, netInvoke } from '../../lib/net-bridge';
import type { MtrProbeReply, MtrResolvedTarget } from './lib';

/** 无宿主网络能力时调用网络命令的统一错误 */
export const DESKTOP_ONLY_ERROR = NET_UNAVAILABLE_ERROR;

/** 解析目标主机 (域名 -> 首选 IPv4) */
export async function mtrResolve(host: string): Promise<MtrResolvedTarget> {
  if (!netAvailable()) throw new Error(DESKTOP_ONLY_ERROR);
  return netInvoke<MtrResolvedTarget>('mtr_resolve', { host });
}

/**
 * 对目标做一次指定 TTL 的探测 (= 第 ttl 跳)
 * @param host 目标 IPv4 地址
 * @param ttl 生存时间 (= 第几跳)
 * @param timeoutMs 超时毫秒 (宿主限制 100-10000)
 */
export async function mtrProbe(host: string, ttl: number, timeoutMs: number): Promise<MtrProbeReply> {
  if (!netAvailable()) throw new Error(DESKTOP_ONLY_ERROR);
  return netInvoke<MtrProbeReply>('mtr_probe', { host, ttl, timeoutMs });
}

/** 反向解析 IP (失败返回空串) */
export async function reverseDns(ip: string): Promise<string> {
  if (!netAvailable()) throw new Error(DESKTOP_ONLY_ERROR);
  return (await netInvoke<string | null>('reverse_dns', { ip })) ?? '';
}
