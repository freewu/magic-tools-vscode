// Whois 查询 (扩展宿主版)
//
// 浏览器无法直接使用 Whois 协议 (TCP 43), 桌面版在 Rust 侧实现; 扩展宿主里用
// Node 的 net 模块做同样的逐级追查:
// 1. 归一化输入 (域名 / IPv4 / IPv6), 去掉协议头、路径与端口;
// 2. 选择起始服务器 (内置常用 TLD 表, 其余交给 whois.iana.org);
// 3. 按 `refer:` / `ReferralServer:` / `Registrar WHOIS Server:` 逐级追查,
//    最多 3 跳, 每跳结果都返回给前端展示。

import * as net from 'net';

/** Whois 协议端口 */
const WHOIS_PORT = 43;
/** 建立连接超时 */
const CONNECT_TIMEOUT_MS = 10_000;
/** 单次读取超时 (超时视为输出结束, 部分服务器不主动断开) */
const READ_TIMEOUT_MS = 15_000;
/** 单次响应最大字节数 (防止超大 TOS 文本) */
const MAX_BYTES = 512 * 1024;
/** 最多追查跳数 */
const MAX_HOPS = 3;
/** 缺省起始服务器 (权威的 TLD / ASN 分配信息) */
const IANA_SERVER = 'whois.iana.org';

/** 一跳 Whois 响应 */
export interface WhoisSection {
  /** 本次查询的 Whois 服务器 */
  server: string;
  /** 原始响应文本 */
  text: string;
  /** 补充说明 (如该跳查询失败) */
  note: string | null;
}

/** Whois 查询结果 */
export interface WhoisResult {
  /** 归一化后的查询对象 */
  query: string;
  /** domain / ipv4 / ipv6 */
  kind: string;
  /** 逐跳结果 (第 1 跳为权威注册局 / IANA) */
  sections: WhoisSection[];
}

/** 常用 TLD / 二级后缀 -> Whois 服务器 (命中可省去一次 IANA 跳转) */
const TLD_SERVERS: ReadonlyArray<readonly [string, string]> = [
  ['com', 'whois.verisign-grs.com'],
  ['net', 'whois.verisign-grs.com'],
  ['org', 'whois.pir.org'],
  ['info', 'whois.afilias.net'],
  ['biz', 'whois.biz'],
  ['mobi', 'whois.mobi'],
  ['name', 'whois.nic.name'],
  ['io', 'whois.nic.io'],
  ['ai', 'whois.nic.ai'],
  ['co', 'whois.nic.co'],
  ['me', 'whois.nic.me'],
  ['tv', 'whois.nic.tv'],
  ['cc', 'ccwhois.verisign-grs.com'],
  ['dev', 'whois.nic.google'],
  ['app', 'whois.nic.google'],
  ['page', 'whois.nic.google'],
  ['xyz', 'whois.nic.xyz'],
  ['top', 'whois.nic.top'],
  ['site', 'whois.nic.site'],
  ['online', 'whois.nic.online'],
  ['store', 'whois.nic.store'],
  ['tech', 'whois.nic.tech'],
  ['cloud', 'whois.nic.cloud'],
  ['shop', 'whois.nic.shop'],
  ['vip', 'whois.nic.vip'],
  ['club', 'whois.nic.club'],
  ['pro', 'whois.nic.pro'],
  ['red', 'whois.nic.red'],
  ['link', 'whois.nic.link'],
  ['art', 'whois.nic.art'],
  ['fun', 'whois.nic.fun'],
  ['live', 'whois.nic.live'],
  ['space', 'whois.nic.space'],
  ['website', 'whois.nic.website'],
  ['cn', 'whois.cnnic.cn'],
  ['com.cn', 'whois.cnnic.cn'],
  ['net.cn', 'whois.cnnic.cn'],
  ['org.cn', 'whois.cnnic.cn'],
  ['gov.cn', 'whois.cnnic.cn'],
  ['tw', 'whois.twnic.net.tw'],
  ['hk', 'whois.hkirc.hk'],
  ['jp', 'whois.jprs.jp'],
  ['kr', 'whois.kr'],
  ['sg', 'whois.sgnic.sg'],
  ['in', 'whois.registry.in'],
  ['uk', 'whois.nic.uk'],
  ['co.uk', 'whois.nic.uk'],
  ['org.uk', 'whois.nic.uk'],
  ['de', 'whois.denic.de'],
  ['fr', 'whois.nic.fr'],
  ['nl', 'whois.domain-registry.nl'],
  ['be', 'whois.dns.be'],
  ['it', 'whois.nic.it'],
  ['es', 'whois.nic.es'],
  ['ch', 'whois.nic.ch'],
  ['at', 'whois.nic.at'],
  ['se', 'whois.iis.se'],
  ['no', 'whois.norid.no'],
  ['fi', 'whois.fi'],
  ['dk', 'whois.dk-hostmaster.dk'],
  ['pl', 'whois.dns.pl'],
  ['cz', 'whois.nic.cz'],
  ['ru', 'whois.tcinet.ru'],
  ['ua', 'whois.ua'],
  ['us', 'whois.nic.us'],
  ['ca', 'whois.cira.ca'],
  ['au', 'whois.auda.org.au'],
  ['nz', 'whois.srs.net.nz'],
  ['br', 'whois.registro.br'],
  ['mx', 'whois.mx'],
  ['ar', 'whois.nic.ar'],
  ['za', 'whois.registry.net.za'],
  ['ae', 'whois.aeda.net.ae'],
  ['il', 'whois.isoc.org.il'],
  ['tr', 'whois.trabis.gov.tr'],
];

/** 归一化查询对象: 去掉协议头 / 路径 / 端口, 校验格式 */
function normalizeQuery(input: string): string {
  let text = String(input ?? '').trim();
  if (text === '') throw new Error('请输入域名或 IP 地址');

  // 已经是 IP 地址时直接返回
  if (net.isIP(text) !== 0) return text;

  // 去掉协议头
  for (const scheme of ['whois://', 'http://', 'https://']) {
    if (text.startsWith(scheme)) {
      text = text.slice(scheme.length);
      break;
    }
  }
  // 去掉路径 / 查询串
  const cut = text.search(/[/?#]/);
  if (cut >= 0) text = text.slice(0, cut);
  // 去掉端口
  const colon = text.lastIndexOf(':');
  if (colon >= 0) text = text.slice(0, colon);

  const name = text.trim().replace(/\.$/, '').toLowerCase();
  if (name === '') throw new Error('请输入域名或 IP 地址');
  if (!/^[\x20-\x7e]*$/.test(name)) {
    throw new Error('暂不支持中文域名, 请使用 Punycode 形式 (如 xn--fiq228c.com)');
  }
  if (name.length > 253) throw new Error('域名长度超出限制 (最长 253 个字符)');
  const labels = name.split('.');
  const valid =
    name.includes('.') &&
    labels.every(
      (label) =>
        label !== '' &&
        label.length <= 63 &&
        !label.startsWith('-') &&
        !label.endsWith('-') &&
        /^[a-z0-9_-]+$/.test(label),
    );
  if (!valid) throw new Error(`域名格式不正确: ${name}`);
  return name;
}

/** 判断查询对象类型 */
function kindOf(query: string): 'ipv4' | 'ipv6' | 'domain' {
  const version = net.isIP(query);
  if (version === 4) return 'ipv4';
  if (version === 6) return 'ipv6';
  return 'domain';
}

/** 内置 TLD 表查询 (先试二级后缀, 再试顶级后缀) */
function tldServer(query: string): string | undefined {
  const labels = query.split('.');
  if (labels.length >= 3) {
    const two = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
    const hit = TLD_SERVERS.find(([suffix]) => suffix === two);
    if (hit) return hit[1];
  }
  const tld = labels[labels.length - 1];
  const hit = TLD_SERVERS.find(([suffix]) => suffix === tld);
  return hit?.[1];
}

/** 起始服务器: IP 交给 IANA (由它转介到对应 RIR), 域名优先用内置表 */
function defaultServer(query: string): string {
  if (kindOf(query) === 'domain') return tldServer(query) ?? IANA_SERVER;
  return IANA_SERVER;
}

/** 部分服务器需要特定查询语法 (ARIN 建议用 `n +` 查网络、`r +` 查域名) */
function requestFor(server: string, query: string): string {
  if (server === 'whois.arin.net') {
    return kindOf(query) === 'domain' ? `r + ${query}` : `n + ${query}`;
  }
  return query;
}

/** 从响应文本中提取下一跳服务器 */
function referralOf(text: string): string | undefined {
  const prefixes = ['refer:', 'referralserver:', 'registrar whois server:', 'whois server:', 'whois:'];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const lower = line.toLowerCase();
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) {
        const host = hostOf(line.slice(prefix.length));
        if (host) return host;
      }
    }
  }
  return undefined;
}

/** 把 `whois://host:port/path` 之类的值规整为纯主机名 */
function hostOf(value: string): string | undefined {
  const cleaned = value.trim().toLowerCase();
  const withoutScheme = cleaned.startsWith('whois://') ? cleaned.slice('whois://'.length) : cleaned;
  const host = (withoutScheme.split(/[/?# ]/)[0] ?? '')
    .split(':')[0]
    .trim()
    .replace(/\.$/, '');
  if (host === '' || !host.includes('.')) return undefined;
  if (!/^[a-z0-9.-]+$/.test(host)) return undefined;
  return host;
}

/** 查询单个 Whois 服务器 (TCP 43) */
function queryServer(server: string, request: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    let connected = false;
    let readTimer: NodeJS.Timeout | undefined;

    const socket = net.connect({ host: server, port: WHOIS_PORT });
    socket.setTimeout(CONNECT_TIMEOUT_MS);

    const done = (error: Error | null, text?: string) => {
      if (settled) return;
      settled = true;
      if (readTimer) clearTimeout(readTimer);
      socket.destroy();
      if (error) reject(error);
      else resolve(text as string);
    };

    socket.once('connect', () => {
      connected = true;
      socket.setTimeout(0);
      socket.write(`${request}\r\n`);
      // 部分服务器不主动断开连接, 静默超过 READ_TIMEOUT 视为输出结束
      readTimer = setTimeout(() => done(null, finishText(chunks)), READ_TIMEOUT_MS);
    });

    socket.on('data', (data) => {
      chunks.push(data);
      total += data.length;
      if (total >= MAX_BYTES) {
        done(null, finishText(chunks));
        return;
      }
      if (readTimer) {
        clearTimeout(readTimer);
        readTimer = setTimeout(() => done(null, finishText(chunks)), READ_TIMEOUT_MS);
      }
    });

    socket.once('timeout', () => {
      if (!connected) done(new Error(`连接 ${server}:${WHOIS_PORT} 超时`));
      else done(null, finishText(chunks));
    });

    socket.once('error', (error) => {
      if (!connected) {
        done(new Error(`连接 ${server}:${WHOIS_PORT} 失败: ${error.message}`));
        return;
      }
      if (chunks.length === 0) done(new Error(`读取 ${server} 响应失败: ${error.message}`));
      else done(null, finishText(chunks));
    });

    socket.once('end', () => done(null, finishText(chunks)));
    socket.once('close', () => {
      if (!settled) done(null, finishText(chunks));
    });
  });
}

/** 合并分块, 去掉末尾 NUL (部分服务器以此结尾) */
function finishText(chunks: Buffer[]): string {
  const merged = Buffer.concat(chunks);
  let end = merged.length;
  while (end > 0 && merged[end - 1] === 0) end -= 1;
  return merged.toString('utf8', 0, end);
}

/** Whois 查询: 自动逐级追查注册局 / 注册商信息 */
export async function whoisQuery(input: string): Promise<WhoisResult> {
  const target = normalizeQuery(input);
  const kind = kindOf(target);
  let server = defaultServer(target);
  const seen = new Set<string>();
  const sections: WhoisSection[] = [];

  for (;;) {
    seen.add(server);
    // eslint-disable-next-line no-await-in-loop
    const text = await queryServer(server, requestFor(server, target)).then(
      (value) => ({ ok: true as const, value }),
      (error: Error) => ({ ok: false as const, value: error }),
    );

    if (!text.ok) {
      if (sections.length === 0) throw text.value;
      sections.push({ server, text: '', note: text.value.message });
      break;
    }

    const next = referralOf(text.value);
    sections.push({ server, text: text.value, note: null });
    if (next && !seen.has(next) && sections.length < MAX_HOPS) server = next;
    else break;
  }

  return { query: target, kind, sections };
}
