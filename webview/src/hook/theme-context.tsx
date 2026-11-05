// 全局显示模式 (VSCode 版)
//
// 桌面版可以在「浅色 / 深色 / 系统跟随」之间切换并同步托盘, 扩展里显示模式由 VSCode
// 主题决定 (body 上的 vscode-dark / vscode-light 类), 因此这里只提供只读的 isDark,
// 供需要跟随主题的第三方渲染器 (Vditor / Excalidraw / markmap / mermaid) 使用。
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  /** 当前显示模式 (由 VSCode 主题推导, 不可切换) */
  mode: ThemeMode;
  /** 是否深色 */
  isDark: boolean;
  /** 兼容桌面版 API: 扩展内由 VSCode 主题决定, 调用无效 */
  setMode: (mode: ThemeMode) => void;
}

const isDarkBody = (): boolean => {
  const cls = document.body.classList;
  return cls.contains('vscode-dark') || cls.contains('vscode-high-contrast');
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  isDark: false,
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(isDarkBody);

  // 用户切换 VSCode 主题时同步 (body class 变化)
  useEffect(() => {
    const update = () => setIsDark(isDarkBody());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const value: ThemeContextValue = {
    mode: isDark ? 'dark' : 'light',
    isDark,
    setMode: () => {},
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
