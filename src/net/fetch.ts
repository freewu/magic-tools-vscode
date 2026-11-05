// 网页抓取 (扩展宿主版)
//
// 供「网页 TDK 信息检测」「Sitemap 检测」使用: webview 里直接 fetch 外部站点会
// 受 CORS 限制, 这里在宿主的 Node 侧发起 HTTP 请求, 绕过跨域问题。
//
// 返回原始响应体的 Base64 (字符集可能为 GBK/GB2312 等, 交由前端探测解码),
// 内容上限 3MB。用 http/https 模块而非全局 fetch: 扩展宿主需兼容 Node 16。

import * as http from 'http';
import * as https from 'https';
import * as zlib from 'zlib';

/** 内容大小上限 */
const MAX_BODY = 3 * 1024 * 1024;

/** 请求超时 (毫秒) */
const TIMEOUT_MS = 20_000;

/** 最多跟随的重定向次数 */
const MAX_REDIRECTS = 10;

/** 伪装浏览器 UA, 避免部分站点拦截无 UA / 默认 UA 的请求 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MagicTools';

export interface FetchedPage {
  /** HTTP 状态码 */
  status: number;
  /** Content-Type 响应头 (可用于字符集探测) */
  contentType: string | null;
  /** 重定向后的最终地址 */
  finalUrl: string;
  /** 原始响应体 (Base64) */
  base64: string;
}

/** 单次请求的原始结果 */
interface RawResponse {
  status: number;
  location: string | null;
  contentType: string | null;
  contentLength: number | null;
  encoding: string | null;
  body: Buffer;
}

function requestOnce(url: string): Promise<RawResponse> {
  return new Promise<RawResponse>((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`网址格式不正确: ${url}`));
      return;
    }
    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.request(
      parsed,
      {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-encoding': 'gzip, deflate, br',
        },
        timeout: TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BODY * 4) {
            // 压缩后也不该这么大, 直接掐断, 避免解压炸弹
            request.destroy(new Error('页面内容超过 3MB 上限'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          const raw = Buffer.concat(chunks);
          const encoding = String(response.headers['content-encoding'] ?? '').toLowerCase();
          let body: Buffer;
          try {
            body = decodeBody(raw, encoding);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }
          resolve({
            status: response.statusCode ?? 0,
            location: typeof response.headers.location === 'string' ? response.headers.location : null,
            contentType: typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : null,
            contentLength: Number.isFinite(Number(response.headers['content-length']))
              ? Number(response.headers['content-length'])
              : null,
            encoding: encoding === '' ? null : encoding,
            body,
          });
        });
        response.on('error', (error) => reject(error));
      },
    );
    request.on('timeout', () => request.destroy(new Error('TIME_OUT')));
    request.on('error', (error) => reject(error));
    request.end();
  });
}

/** 解压 gzip / deflate / br */
function decodeBody(raw: Buffer, encoding: string): Buffer {
  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      return zlib.gunzipSync(raw);
    case 'deflate':
      return zlib.inflateSync(raw);
    case 'br':
      return zlib.brotliDecompressSync(raw);
    default:
      return raw;
  }
}

/** 抓取网页源码 (仅 http/https, 自动跟随重定向, 20 秒超时) */
export async function fetchUrlBody(url: string): Promise<FetchedPage> {
  const target = String(url ?? '').trim();
  if (!/^https?:\/\//i.test(target)) throw new Error('网址必须以 http:// 或 https:// 开头');

  let current = target;
  let response: RawResponse | undefined;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      response = await requestOnce(current);
    } catch (error) {
      const detail = error as Error;
      if (detail.message === 'TIME_OUT') throw new Error('请求超时 (20 秒)');
      if (detail.message === '页面内容超过 3MB 上限') throw detail;
      if ((detail as NodeJS.ErrnoException).code === 'ENOTFOUND') {
        throw new Error(`无法解析域名: ${new URL(current).hostname}`);
      }
      if ((detail as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        throw new Error(`无法连接服务器: 连接被拒绝 (${new URL(current).host})`);
      }
      throw new Error(`请求失败: ${detail.message}`);
    }

    if (response.status >= 300 && response.status < 400 && response.location) {
      const next = new URL(response.location, current).toString();
      if (!/^https?:\/\//i.test(next)) throw new Error('重定向地址不是 http/https');
      current = next;
      continue;
    }
    break;
  }

  if (!response) throw new Error('请求失败: 未收到响应');
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`服务器返回 HTTP ${response.status}`);
  }
  if (response.contentLength != null && response.contentLength > MAX_BODY) {
    throw new Error(`页面过大 (约 ${Math.round(response.contentLength / 1024)} KB), 已超过 3MB 上限`);
  }
  if (response.body.length > MAX_BODY) throw new Error('页面内容超过 3MB 上限');

  return {
    status: response.status,
    contentType: response.contentType,
    finalUrl: current,
    base64: response.body.toString('base64'),
  };
}
