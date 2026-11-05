// DNS 查询 (扩展宿主版)
//
// 桌面版用 Rust + trust-dns-resolver; 扩展宿主里 Node 没有"带 TTL 的解析 API"
// (dns.promises.resolve* 不返回 TTL, 也拿不到否定应答的 SOA), 因此这里直接实现
// 一个最小 DNS 客户端: 自己组包, UDP 53 发送, TC 截断时改走 TCP, 解析响应里的
// 名称压缩 / 各记录类型 RDATA。返回结构与 Rust 侧 DnsQueryResult 保持一致。

import * as dgram from 'dgram';
import * as dns from 'dns';
import * as net from 'net';
import * as crypto from 'crypto';

export interface DnsRecord {
  name: string;
  recordType: string;
  ttl: number;
  value: string;
}

export interface DnsQueryResult {
  status: 'ok' | 'nxdomain' | 'nodata';
  records: DnsRecord[];
  elapsedMs: number;
  server: string;
  message: string | null;
}

/** 支持的记录类型 (与前端下拉框一致) */
const TYPE_BY_NAME: Record<string, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  CAA: 257,
};

const NAME_BY_TYPE = new Map<number, string>(
  Object.entries(TYPE_BY_NAME).map(([name, code]) => [code, name]),
);

/** 查询超时 (毫秒), 与 Rust 侧一致 */
const QUERY_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------- 报文解析

interface ParsedRecord extends DnsRecord {
  /** 记录类型码 (用于过滤) */
  typeCode: number;
  /** 所在区段: answer / authority */
  section: 'answer' | 'authority';
}

/** 读一个可能带压缩指针的域名, 返回名称与"紧接其后"的偏移 */
function readName(buf: Buffer, offset: number): { name: string; next: number } {
  const labels: string[] = [];
  let pos = offset;
  let next = -1;
  // 指针最多跳 32 次, 防止畸形报文死循环
  for (let jumps = 0; jumps < 32; jumps += 1) {
    if (pos >= buf.length) throw new Error('DNS 响应报文被截断');
    const len = buf[pos];
    if (len === 0) {
      pos += 1;
      if (next < 0) next = pos;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (pos + 1 >= buf.length) throw new Error('DNS 响应报文被截断');
      const pointer = ((len & 0x3f) << 8) | buf[pos + 1];
      if (next < 0) next = pos + 2;
      pos = pointer;
      continue;
    }
    pos += 1;
    labels.push(buf.toString('utf8', pos, pos + len));
    pos += len;
  }
  const name = labels.join('.');
  return { name: name === '' ? '.' : `${name}.`, next: next < 0 ? pos : next };
}

/** 16 位无符号 / 32 位无符号读取 */
const u16 = (buf: Buffer, offset: number): number => buf.readUInt16BE(offset);
const u32 = (buf: Buffer, offset: number): number => buf.readUInt32BE(offset);

/** IPv6 地址格式化 (带 :: 压缩), 16 字节 -> 文本 */
function formatIpv6(bytes: Buffer): string {
  const groups: number[] = [];
  for (let i = 0; i < 16; i += 2) groups.push(u16(bytes, i));
  // 找出最长的连续 0 段
  let bestStart = -1;
  let bestLen = 0;
  let start = -1;
  for (let i = 0; i < groups.length; i += 1) {
    if (groups[i] === 0) {
      if (start < 0) start = i;
      const len = i - start + 1;
      if (len > bestLen) {
        bestLen = len;
        bestStart = start;
      }
    } else {
      start = -1;
    }
  }
  const hex = groups.map((g) => g.toString(16));
  if (bestLen < 2) return hex.join(':');
  const head = hex.slice(0, bestStart).join(':');
  const tail = hex.slice(bestStart + bestLen).join(':');
  return `${head}::${tail}`;
}

/** TXT 记录的多个字符串片段拼成 "a" "b" 形式 (与 trust-dns 的展示一致) */
function readTxt(buf: Buffer, offset: number, length: number): string {
  const parts: string[] = [];
  let pos = offset;
  const end = offset + length;
  while (pos < end) {
    const len = buf[pos];
    pos += 1;
    parts.push(buf.toString('utf8', pos, pos + len));
    pos += len;
  }
  return parts.map((part) => `"${part}"`).join(' ');
}

/** 按记录类型格式化 RDATA */
function formatRdata(buf: Buffer, typeCode: number, offset: number, length: number): string {
  const end = offset + length;
  switch (typeCode) {
    case 1: // A
      return `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`;
    case 28: // AAAA
      return formatIpv6(buf.subarray(offset, end));
    case 2: // NS
    case 5: // CNAME
    case 12: // PTR
      return readName(buf, offset).name;
    case 15: {
      // MX: 优先级 + 交换目标
      const preference = u16(buf, offset);
      const target = readName(buf, offset + 2).name;
      return `${preference} ${target}`;
    }
    case 16: // TXT
      return readTxt(buf, offset, length);
    case 33: {
      // SRV: 优先级 权重 端口 目标
      const priority = u16(buf, offset);
      const weight = u16(buf, offset + 2);
      const port = u16(buf, offset + 4);
      const target = readName(buf, offset + 6).name;
      return `${priority} ${weight} ${port} ${target}`;
    }
    case 6: {
      // SOA: mname rname serial refresh retry expire minimum
      const mname = readName(buf, offset);
      const rname = readName(buf, mname.next);
      const at = rname.next;
      const nums = [u32(buf, at), u32(buf, at + 4), u32(buf, at + 8), u32(buf, at + 12), u32(buf, at + 16)];
      return `${mname.name} ${rname.name} ${nums.join(' ')}`;
    }
    case 257: {
      // CAA: flags tag "value"
      const flags = buf[offset];
      const tagLen = buf[offset + 1];
      const tag = buf.toString('utf8', offset + 2, offset + 2 + tagLen);
      const value = buf.toString('utf8', offset + 2 + tagLen, end);
      return `${flags} ${tag} "${value}"`;
    }
    default:
      return buf.toString('hex', offset, end);
  }
}

/** 解析完整响应报文 */
function parseResponse(buf: Buffer): {
  rcode: number;
  truncated: boolean;
  answer: ParsedRecord[];
  authority: ParsedRecord[];
} {
  if (buf.length < 12) throw new Error('DNS 响应报文过短');
  const flags = u16(buf, 2);
  const rcode = flags & 0x000f;
  const truncated = (flags & 0x0200) !== 0;
  const qdcount = u16(buf, 4);
  const ancount = u16(buf, 6);
  const nscount = u16(buf, 8);

  let offset = 12;
  for (let i = 0; i < qdcount; i += 1) {
    offset = readName(buf, offset).next + 4; // 跳过 QTYPE + QCLASS
  }

  const readRecords = (count: number, section: 'answer' | 'authority'): ParsedRecord[] => {
    const out: ParsedRecord[] = [];
    for (let i = 0; i < count; i += 1) {
      const { name, next } = readName(buf, offset);
      const typeCode = u16(buf, next);
      const ttl = u32(buf, next + 4);
      const rdlength = u16(buf, next + 8);
      const rdataOffset = next + 10;
      out.push({
        name,
        typeCode,
        recordType: NAME_BY_TYPE.get(typeCode) ?? `TYPE${typeCode}`,
        ttl,
        value: formatRdata(buf, typeCode, rdataOffset, rdlength),
        section,
      });
      offset = rdataOffset + rdlength;
    }
    return out;
  };

  const answer = readRecords(ancount, 'answer');
  const authority = readRecords(nscount, 'authority');
  return { rcode, truncated, answer, authority };
}

// ---------------------------------------------------------------- 报文构造

/** 域名归一化为绝对名称 (带结尾点), 并编码成 labels */
function encodeName(name: string): Buffer {
  const labels = name.replace(/\.$/, '').split('.').filter((label) => label !== '');
  const parts: Buffer[] = [];
  for (const label of labels) {
    const bytes = Buffer.from(label, 'utf8');
    if (bytes.length > 63) throw new Error(`域名标签过长: ${label}`);
    parts.push(Buffer.from([bytes.length]), bytes);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function buildQuery(name: string, typeCode: number): { packet: Buffer; id: number } {
  const id = crypto.randomInt(0, 0xffff);
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(0x0100, 2); // RD = 1
  header.writeUInt16BE(1, 4); // QDCOUNT
  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(typeCode, 0);
  tail.writeUInt16BE(1, 2); // IN
  return { packet: Buffer.concat([header, encodeName(name), tail]), id };
}

// ---------------------------------------------------------------- 发送

/** UDP 查询 (超时 / 报文 ID 不匹配都算失败) */
function queryUdp(server: string, packet: Buffer, id: number, timeoutMs: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const socket = dgram.createSocket(net.isIPv6(server) ? 'udp6' : 'udp4');
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new Error('timeout'))), timeoutMs);
    socket.once('error', (error) => finish(() => reject(error)));
    socket.on('message', (message) => {
      // 校验 ID, 防止拿到过期 / 串包的响应
      if (message.length >= 12 && message.readUInt16BE(0) === id) {
        finish(() => resolve(message));
      }
    });
    socket.send(packet, 53, server, (error) => {
      if (error) finish(() => reject(error));
    });
  });
}

/** TCP 查询 (DNS over TCP: 2 字节长度前缀) */
function queryTcp(server: string, packet: Buffer, timeoutMs: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const socket = net.connect({ host: server, port: 53 });
    const chunks: Buffer[] = [];
    let length = -1;
    let settled = false;
    const finish = (error: Error | null, value?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value as Buffer);
    };
    const timer = setTimeout(() => finish(new Error('timeout')), timeoutMs);
    socket.once('error', (error) => finish(error));
    socket.once('connect', () => {
      const head = Buffer.alloc(2);
      head.writeUInt16BE(packet.length, 0);
      socket.write(Buffer.concat([head, packet]));
    });
    socket.on('data', (data) => {
      chunks.push(data);
      const joined = Buffer.concat(chunks);
      if (length < 0 && joined.length >= 2) length = joined.readUInt16BE(0);
      if (length >= 0 && joined.length >= length + 2) finish(null, joined.subarray(2, 2 + length));
    });
    socket.once('close', () => finish(new Error('连接提前关闭')));
  });
}

// ---------------------------------------------------------------- 服务器

/** 系统 DNS 服务器: 去重、IPv4 优先、最多 4 个 (与 Rust 侧 prune_servers 一致) */
function systemServers(): string[] {
  const list: string[] = [];
  for (const address of dns.getServers()) {
    // 去掉端口 (Windows 上可能带 %scope 或 :port)
    const ip = address.replace(/^\[([^\]]+)\].*$/, '$1').replace(/%.*$/, '').replace(/:\d+$/, '');
    if (!net.isIP(ip)) continue;
    if (!list.includes(ip)) list.push(ip);
  }
  const v4 = list.filter((ip) => net.isIPv4(ip));
  const v6 = list.filter((ip) => net.isIPv6(ip));
  return [...v4, ...v6].slice(0, 4);
}

/**
 * 查询指定域名的 DNS 记录
 * @param name 域名 (可带结尾点)
 * @param recordType A / AAAA / CNAME / MX / TXT / SRV / NS / SOA / PTR / CAA
 * @param server DNS 服务器 IP; 留空或 'system' 表示使用系统配置
 */
export async function dnsQuery(
  name: string,
  recordType: string,
  server: string | null | undefined,
): Promise<DnsQueryResult> {
  const raw = String(name ?? '').trim();
  if (raw === '') throw new Error('请输入要查询的域名');
  const typeLabel = String(recordType ?? '').trim().toUpperCase();
  const typeCode = TYPE_BY_NAME[typeLabel];
  if (typeCode === undefined) throw new Error(`不支持的记录类型: ${recordType}`);

  const queryName = `${raw.replace(/\.$/, '')}.`;
  const custom = String(server ?? '').trim();
  const servers = custom === '' || custom.toLowerCase() === 'system' ? systemServers() : [custom];
  if (custom !== '' && custom.toLowerCase() !== 'system' && !net.isIP(custom)) {
    throw new Error(`DNS 服务器地址无效: ${custom}`);
  }
  const label = servers.length > 0 ? servers.join(', ') : '系统默认';

  const { packet, id } = buildQuery(queryName, typeCode);
  const started = Date.now();
  let response: Buffer | undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 2 && !response; attempt += 1) {
    for (const target of servers) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const message = await queryUdp(target, packet, id, QUERY_TIMEOUT_MS);
        const parsed = parseResponse(message);
        // TC 位: UDP 装不下, 改走 TCP 重取完整响应
        // eslint-disable-next-line no-await-in-loop
        response = parsed.truncated ? await queryTcp(target, packet, QUERY_TIMEOUT_MS) : message;
        break;
      } catch (error) {
        lastError = error as Error;
      }
    }
  }

  if (!response) {
    if (lastError && lastError.message !== 'timeout') {
      throw new Error(`查询失败: ${lastError.message}`);
    }
    throw new Error(`查询超时, 请检查网络或更换 DNS 服务器 (${label})`);
  }

  const elapsedMs = Date.now() - started;
  const parsed = parseResponse(response);

  if (parsed.rcode === 3) {
    const soa = parsed.authority.filter((record) => record.typeCode === 6).slice(0, 1);
    return {
      status: 'nxdomain',
      records: soa.map(strip),
      elapsedMs,
      server: label,
      message: '域名不存在 (NXDOMAIN)',
    };
  }
  if (parsed.rcode !== 0) {
    const names = ['NOERROR', 'FORMERR', 'SERVFAIL', 'NXDOMAIN', 'NOTIMP', 'REFUSED'];
    throw new Error(`查询失败: ${names[parsed.rcode] ?? `RCODE ${parsed.rcode}`}`);
  }

  if (parsed.answer.length === 0) {
    const soa = parsed.authority.filter((record) => record.typeCode === 6).slice(0, 1);
    return {
      status: 'nodata',
      records: soa.map(strip),
      elapsedMs,
      server: label,
      message: `该域名没有 ${typeLabel} 记录`,
    };
  }

  return {
    status: 'ok',
    records: parsed.answer.map(strip),
    elapsedMs,
    server: label,
    message: null,
  };
}

/** 去掉内部字段 */
const strip = (record: ParsedRecord): DnsRecord => ({
  name: record.name,
  recordType: record.recordType,
  ttl: record.ttl,
  value: record.value,
});

/** 反向解析 (PTR): IP -> 主机名, 失败返回空串 */
export async function reverseDns(ip: string): Promise<string> {
  const text = String(ip ?? '').trim();
  if (net.isIP(text) === 0) throw new Error(`IP 地址无效: ${text}`);
  try {
    const names = await dns.promises.reverse(text);
    return names.map((name) => name.replace(/\.$/, '')).find((name) => name !== '') ?? '';
  } catch {
    return '';
  }
}
