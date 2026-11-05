// MTR 探测 (扩展宿主版)
//
// 桌面版用 Rust 直接构造 ICMP 报文 (mtr_engine); 扩展宿主的 Node 没有原始套接字
// 能力 (且 Windows 上需要管理员权限), 因此改为调用系统 ping 的 TTL 参数:
//   ping -n 1 -w <ms> -i <ttl> <host>   (Windows)
//   ping -c 1 -W <秒> -t <ttl> <host>   (Linux)
//   ping -c 1 -W <ms> -t <ttl> <host>   (macOS)
// 再解析输出, 映射成与 Rust 侧 MtrProbeReply 相同的结构。
//
// 已知差异: 统计口径与真实 ICMP 略不同 (依赖系统 ping 的计时与实现), 但状态语义
// (reply / ttlExpired / unreachable / timeout) 与桌面版保持一致。

import { execFile } from 'child_process';
import * as dns from 'dns';
import * as net from 'net';

/** 探测超时下限 / 上限 (毫秒) */
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 10_000;

/** 域名解析结果 */
export interface MtrResolvedTarget {
  input: string;
  address: string;
  /** ipv4 / ipv6 / literal */
  kind: string;
  hasIpv4: boolean;
  isLiteral: boolean;
}

/** 单次探测结果 */
export interface MtrProbeReply {
  ttl: number;
  /** reply / ttlExpired / unreachable / timeout */
  status: string;
  ok: boolean;
  rttMs: number | null;
  addr: string | null;
  detail: string | null;
  reached: boolean;
  elapsedMs: number;
}

/** 目标解析: 域名 -> 首选 IPv4 地址; 直接输入 IP 时原样返回 */
export async function mtrResolve(host: string): Promise<MtrResolvedTarget> {
  const input = String(host ?? '').trim();
  if (input === '') throw new Error('请输入域名或 IP 地址');

  const literalVersion = net.isIP(input);
  if (literalVersion !== 0) {
    return {
      input,
      address: input,
      kind: literalVersion === 4 ? 'ipv4' : 'ipv6',
      hasIpv4: literalVersion === 4,
      isLiteral: true,
    };
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(input, { all: true, verbatim: true });
  } catch (error) {
    throw new Error(`域名解析失败: ${(error as Error).message}`);
  }
  if (addresses.length === 0) throw new Error(`域名 ${input} 没有解析到任何地址`);

  const ipv4 = addresses.find((entry) => entry.family === 4);
  const chosen = ipv4 ?? addresses[0];
  return {
    input,
    address: chosen.address,
    kind: chosen.family === 4 ? 'ipv4' : 'ipv6',
    hasIpv4: ipv4 !== undefined,
    isLiteral: false,
  };
}

/** 执行系统 ping (忽略退出码, 只解析输出) */
function runPing(target: string, ttl: number, timeoutMs: number): Promise<{ stdout: Buffer; stderr: Buffer }> {
  const platform = process.platform;
  let args: string[];
  if (platform === 'win32') {
    args = ['-n', '1', '-w', String(timeoutMs), '-i', String(ttl), target];
  } else if (platform === 'darwin') {
    args = ['-c', '1', '-W', String(timeoutMs), '-t', String(ttl), target];
  } else {
    // Linux (iputils): -W 单位为秒, 允许小数
    args = ['-c', '1', '-W', String(Math.max(1, Math.round(timeoutMs / 100) / 10)), '-t', String(ttl), target];
  }

  return new Promise((resolve) => {
    execFile(
      'ping',
      args,
      {
        timeout: timeoutMs + 3000,
        encoding: 'buffer',
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      } as unknown as { encoding: 'buffer'; timeout: number; maxBuffer: number; windowsHide: boolean },
      (error, stdout, stderr) => {
        // ping 无应答时退出码非 0, 输出里仍有可用信息
        void error;
        resolve({ stdout: stdout as unknown as Buffer, stderr: stderr as unknown as Buffer });
      },
    );
  });
}

/** 把 ping 输出解码成文本 (Windows 中文系统输出 GBK) */
function decodeOutput(buffer: Buffer): string {
  if (process.platform === 'win32') {
    try {
      return new TextDecoder('gbk').decode(buffer);
    } catch {
      return buffer.toString('utf8');
    }
  }
  return buffer.toString('utf8');
}

/** 解析 ping 输出, 得到 状态 / 应答地址 / 往返时延 */
function parseOutput(text: string): { status: string; addr: string | null; rttMs: number | null; detail: string | null } {
  // TTL 耗尽 (路由器回 ICMP Time Exceeded)
  const expired =
    /TTL\s*(?:传输中过期|expired)/i.exec(text) ??
    /Time to live exceeded/i.exec(text);
  // 目标不可达
  const unreachable = /(?:无法访问目标主机|无法访问目标网络|Destination (?:Host|Net) Unreachable)/i.exec(text);
  // 正常应答: bytes from <ip> / 来自 <ip> 的回复
  const reply = /(?:bytes|Bytes)\s+from\s+([0-9a-fA-F:.]+)[^\n]*?(?:time|时间)\s*[=<]\s*([\d.]+)\s*ms/i.exec(text)
    ?? /(?:来自|Reply from)\s+([0-9a-fA-F:.]+)[^\n]*?(?:时间|time)\s*[=<]\s*([\d.]+)\s*ms/i.exec(text);

  const addrOf = (source: string, pattern: RegExp): string | null => {
    const hit = pattern.exec(source);
    return hit ? hit[1] : null;
  };
  const nearAddr = /(?:来自|Reply from|From|from)\s+([0-9a-fA-F:.]+)/.exec(text);

  if (reply) {
    const [, addr, time] = reply;
    // <1ms 记为 0.5ms, 避免显示 0
    const rtt = Math.round(Number(time) * 10) / 10 || 0.5;
    return { status: 'reply', addr, rttMs: rtt, detail: null };
  }

  if (expired) {
    return {
      status: 'ttlExpired',
      addr: addrOf(text, /(?:来自|Reply from|From|from)\s+([0-9a-fA-F:.]+)/) ?? nearAddr?.[1] ?? null,
      rttMs: null,
      detail: 'TTL 耗尽',
    };
  }
  if (unreachable) {
    return {
      status: 'unreachable',
      addr: addrOf(text, /(?:来自|Reply from|From|from)\s+([0-9a-fA-F:.]+)/) ?? nearAddr?.[1] ?? null,
      rttMs: null,
      detail: '目标不可达',
    };
  }
  return { status: 'timeout', addr: null, rttMs: null, detail: null };
}

/** 对目标 IP 做一次指定 TTL 的探测 (等价于 MTR 的第 ttl 跳) */
export async function mtrProbe(host: string, ttl: number, timeoutMs?: number | null): Promise<MtrProbeReply> {
  const text = String(host ?? '').trim();
  if (net.isIPv4(text) === false) throw new Error(`MTR 探测暂只支持 IPv4 目标, 无法解析: ${text}`);

  const hop = Math.min(64, Math.max(1, Math.trunc(Number(ttl) || 1)));
  const timeout = Math.min(
    MAX_TIMEOUT_MS,
    Math.max(MIN_TIMEOUT_MS, Math.trunc(Number(timeoutMs ?? 1000) || 1000)),
  );

  const started = Date.now();
  const { stdout, stderr } = await runPing(text, hop, timeout);
  const output = decodeOutput(stdout.length > 0 ? stdout : stderr);
  const parsed = parseOutput(output);

  return {
    ttl: hop,
    status: parsed.status,
    ok: parsed.status !== 'timeout',
    rttMs: parsed.rttMs,
    addr: parsed.addr,
    detail: parsed.detail,
    reached: parsed.status === 'reply',
    elapsedMs: Date.now() - started,
  };
}
