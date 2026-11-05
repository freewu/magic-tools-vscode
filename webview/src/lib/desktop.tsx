// 「仅桌面版可用」能力的通用提示 (VSCode 版)
//
// DnsQuery / MtrQuery / WhoisQuery / WebTDKCheck / SitemapCheck 依赖桌面版内置的
// Rust 网络命令 (原始 DNS / ICMP / TCP Whois), 扩展宿主没有对应能力, 因此这些工具
// 在扩展里只渲染本提示条, 引导用户改用桌面版。
// 文案由各工具自己提供 (多语言), 这里只负责统一的展示形态与下载入口。
import { Alert, Button, theme } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { openUrl } from './tauri';

/** 桌面版下载地址 (magic-tools GitHub Releases 最新版本页) */
export const DESKTOP_DOWNLOAD_URL = 'https://github.com/freewu/magic-tools/releases/latest';

export type DesktopOnlyNoticeProps = {
  /** 主提示, 如「该功能仅在桌面应用中可用」 */
  text: string;
  /** 下载按钮文案, 如「下载桌面版」 */
  download: string;
  /** 补充说明 (可选), 如「扩展版无法发起 ICMP 探测」 */
  hint?: string;
};

/**
 * 桌面版专属功能提示条
 * 非桌面环境 (扩展 / 浏览器) 下渲染; 桌面环境下调用方应自行跳过渲染
 */
const DesktopOnlyNotice = ({ text, download, hint }: DesktopOnlyNoticeProps) => {
  const { token } = theme.useToken();
  return (
    <Alert
      className="desktop-only-notice"
      type="warning"
      showIcon
      style={{ margin: '12px 0', maxWidth: 720 }}
      message={<span>{text}</span>}
      description={
        hint === undefined ? undefined : (
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{hint}</span>
        )
      }
      action={
        <Button
          size="small"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => {
            void openUrl(DESKTOP_DOWNLOAD_URL);
          }}
        >
          {download}
        </Button>
      }
    />
  );
};

export default DesktopOnlyNotice;
