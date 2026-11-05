import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Magic Tools - VS Code 扩展宿主
 *
 * 左侧活动栏图标 -> 侧边栏工具列表 (WebView) -> 点击工具在编辑器区打开面板 (WebView)。
 * 两个 WebView 共用同一份前端产物 dist/webview/ (Vite 构建, 见 webview/):
 *   - 无参数        -> 侧边栏: 搜索 + 分类工具列表
 *   - ?app=<key>    -> 编辑器面板: 渲染单个工具
 *
 * 宿主只负责三件事: 提供 WebView 资源 / 打开工具面板 / 提供保存文件与打开链接的系统能力。
 */

const SIDEBAR_CONTAINER_ID = 'magic-tools-sidebar';
const SIDEBAR_VIEW_ID = 'magic-tools-view';
const WEBVIEW_DIR = ['dist', 'webview'];

export function activate(context: vscode.ExtensionContext) {
  const provider = new ToolsViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('magic-tools.open', () => focusSidebar()),
    vscode.commands.registerCommand('magic-tools.reload', () => provider.reload()),
  );
}

export function deactivate() {
  /* 无需清理: 取消订阅由 context.subscriptions 负责 */
}

/** 聚焦到活动栏里的 Magic Tools 视图 (命令面板入口) */
async function focusSidebar(): Promise<void> {
  const candidates = [`workbench.view.extension.${SIDEBAR_CONTAINER_ID}`, `${SIDEBAR_VIEW_ID}.focus`];
  for (const command of candidates) {
    try {
      await vscode.commands.executeCommand(command);
      return;
    } catch {
      /* 试下一个 */
    }
  }
  void vscode.window.showWarningMessage('未找到 Magic Tools 视图, 请点击左侧活动栏图标打开。');
}

/**
 * 读取并改写 index.html:
 * - 把 ./assets/xxx 换成 WebView 可访问的 URI
 * - 注入 CSP (含随机 nonce, 供注入的启动脚本使用)
 * - 侧边栏无 appKey; 面板注入 window.__MAGIC_TOOLS_APP__ = '<key>'
 */
function buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri, appKey = ''): string | undefined {
  const rootUri = vscode.Uri.joinPath(extensionUri, ...WEBVIEW_DIR);
  const indexPath = path.join(extensionUri.fsPath, ...WEBVIEW_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return undefined;

  let html = fs.readFileSync(indexPath, 'utf8');
  // <script src="./assets/index-xxx.js"> / <link href="./assets/index-xxx.css">
  html = html.replace(/(src|href)="\.\/([^"]+)"/g, (_match, attr: string, rel: string) => {
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(rootUri, ...rel.split('/')));
    return `${attr}="${uri}"`;
  });

  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data: blob:`,
    `media-src ${webview.cspSource} data: blob:`,
    `font-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    // wasm-unsafe-eval: SM9 / ZUC 等工具用 WebAssembly 实现
    `script-src ${webview.cspSource} 'wasm-unsafe-eval' 'nonce-${nonce}'`,
    `connect-src ${webview.cspSource} data: blob:`,
    `worker-src ${webview.cspSource} blob:`,
  ].join('; ');

  const boot = appKey ? `<script nonce="${nonce}">window.__MAGIC_TOOLS_APP__=${JSON.stringify(appKey)};</script>` : '';

  html = html.replace(
    '</head>',
    `  <meta http-equiv="Content-Security-Policy" content="${csp}">\n  ${boot}\n  </head>`,
  );

  return html;
}

/** 未构建前端时的兜底页面 (给出明确的构建指引) */
function missingBuildHtml(): string {
  return `<!DOCTYPE html><html lang="zh-CN"><body style="font-family: var(--vscode-font-family); padding: 12px; color: var(--vscode-editor-foreground);">
    <p><strong>前端资源未构建</strong></p>
    <p>请在扩展目录执行 <code>just build</code> (或 <code>npm run build</code>) 后重试。</p>
  </body></html>`;
}

class ToolsViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly panels = new Map<string, vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** 重新加载侧边栏 (前端刚构建完时用) */
  public reload(): void {
    if (this.view) this.render(this.view.webview);
  }

  public resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.render(view.webview);

    view.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
      this.onMessage(view.webview, message);
    });
  }

  private render(webview: vscode.Webview): void {
    const extensionUri = this.context.extensionUri;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, ...WEBVIEW_DIR)],
    };
    webview.html = buildHtml(webview, extensionUri) ?? missingBuildHtml();
  }

  /** 统一的消息分发 (侧边栏与面板共用同一套命令) */
  private onMessage(webview: vscode.Webview, message: Record<string, unknown>): void {
    switch (message.command) {
      case 'openTool':
        this.openTool(String(message.key ?? ''), String(message.name ?? ''));
        return;
      case 'openUrl':
        if (typeof message.url === 'string') {
          void vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        return;
      case 'saveFile':
        void this.saveFile(webview, message);
        return;
      default:
        return;
    }
  }

  /** 在编辑器区打开 (或聚焦) 一个工具面板 */
  private openTool(appKey: string, appName: string): void {
    if (!appKey) return;

    const existing = this.panels.get(appKey);
    if (existing) {
      existing.reveal(undefined, false);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'magic-tools.tool',
      appName || appKey,
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, ...WEBVIEW_DIR)],
      },
    );
    panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'icon-color.svg');
    panel.webview.html = buildHtml(panel.webview, this.context.extensionUri, appKey) ?? missingBuildHtml();

    panel.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
      this.onMessage(panel.webview, message);
    });
    panel.onDidDispose(() => this.panels.delete(appKey));
    this.panels.set(appKey, panel);
  }

  /**
   * 保存文件: 前端 (webview/src/lib/tauri.ts) 的保存能力最终落到这里
   * - content: UTF-8 文本; base64: 二进制
   * - 返回 saveFileResult, 前端据此区分「已保存 / 用户取消 / 不支持」
   */
  private async saveFile(webview: vscode.Webview, message: Record<string, unknown>): Promise<void> {
    const requestId = String(message.requestId ?? '');
    const reply = (result: { ok: boolean; canceled?: boolean }) => {
      void webview.postMessage({ command: 'saveFileResult', requestId, ...result });
    };

    try {
      const defaultName = String(message.defaultName ?? 'untitled');
      const baseDir = vscode.workspace.workspaceFolders?.[0]?.uri ?? vscode.Uri.file(os.homedir());
      const extensions = Array.isArray(message.extensions) ? message.extensions.map(String) : [];
      const filters = extensions.length > 0 ? { [String(message.filterName ?? '文件')]: extensions } : undefined;

      const target = await vscode.window.showSaveDialog({
        title: String(message.title ?? '保存文件'),
        defaultUri: vscode.Uri.joinPath(baseDir, defaultName),
        filters,
        saveLabel: '保存',
      });
      if (!target) {
        reply({ ok: false, canceled: true });
        return;
      }

      const data =
        typeof message.base64 === 'string'
          ? Buffer.from(message.base64, 'base64')
          : Buffer.from(String(message.content ?? ''), 'utf8');
      await vscode.workspace.fs.writeFile(target, data);
      reply({ ok: true });
      void vscode.window.setStatusBarMessage(`已保存: ${path.basename(target.fsPath)}`, 3000);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`保存文件失败: ${detail}`);
      reply({ ok: false });
    }
  }
}
