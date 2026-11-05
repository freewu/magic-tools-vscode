// VSCode 主题适配: 读取 WebView body 上的 vscode-dark/light 类与 --vscode-* 变量,
// 转换成 antd 的 theme 配置, 保证工具在明暗主题下都不瞎。

import { useEffect, useMemo, useState } from 'react';
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

const isDarkBody = (): boolean => {
  const cls = document.body.classList;
  return cls.contains('vscode-dark') || cls.contains('vscode-high-contrast');
};

/** 读 VSCode 注入的 CSS 变量 (取不到返回空串) */
const cssVar = (name: string): string => {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value;
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** body 主题类变化时重新渲染 (用户切换 VSCode 主题) */
function useVscodeThemeKind(): boolean {
  const [dark, setDark] = useState(isDarkBody);
  useEffect(() => {
    const update = () => setDark(isDarkBody());
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** 生成 antd ConfigProvider 的 theme */
export function useAntdTheme(): { dark: boolean; theme: ThemeConfig } {
  const dark = useVscodeThemeKind();

  const theme = useMemo<ThemeConfig>(() => {
    const accent = cssVar('--vscode-button-background');
    return {
      algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        // 跟随 VSCode 的强调色 (通常是 #0078d4 一类的蓝)
        ...(HEX_RE.test(accent) ? { colorPrimary: accent } : {}),
        fontSize: 13,
        borderRadius: 4,
        wireframe: false,
      },
      components: {
        Button: { controlHeight: 28 },
        Input: { controlHeight: 28 },
        Select: { controlHeight: 28 },
        Table: { cellPaddingBlockSM: 4 },
      },
    };
  }, [dark]);

  return { dark, theme };
}
