import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Magic Tools extension is now active!');

    // 注册侧边栏视图提供者
    const provider = new MagicToolsProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('magic-tools-view', provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );
}

export function deactivate() {}

class MagicToolsProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'calculateHash':
                    this.calculateHash(message.algorithm, message.text, webviewView.webview);
                    return;
                case 'openToolInEditor':
                    this.openToolInEditor(message.toolType);
                    return;
            }
        });
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const htmlPath = path.join(this.context.extensionPath, 'assets', 'webview.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // 替换脚本部分，添加VSCode API支持
        const scriptTag = `
        <script>
            const vscode = acquireVsCodeApi();
            
            // 风箱展开收起功能
            function toggleCategory(element) {
                element.classList.toggle('expanded');
                const content = element.nextElementSibling;
                content.classList.toggle('expanded');
            }

            // 加载工具组件的函数
            function loadToolComponent(toolName, elementId) {
                // 这里会根据工具名称加载对应的组件内容
                switch(toolName) {
                    case 'hash':
                        document.getElementById(elementId).innerHTML = "\n                            <h2>Hash值计算</h2>\n                            <div class=\"input-group\">\n                                <label for=\"hash-input\">输入文本:</label>\n                                <textarea id=\"hash-input\" rows=\"4\" placeholder=\"请输入要计算Hash值的文本...\"></textarea>\n                            </div>\n                            \n                            <div class=\"button-group\">\n                                <button id=\"calculate-md5\">计算MD5</button>\n                                <button id=\"calculate-sha1\">计算SHA1</button>\n                                <button id=\"calculate-sha256\">计算SHA256</button>\n                                <button id=\"hash-clear\">清空</button>\n                            </div>\n                            \n                            <div class=\"result-container\">\n                                <label>结果:</label>\n                                <div id=\"hash-result\"></div>\n                            </div>\n                        ";
                        initHashTool();
                        break;
                    case 'base64':
                        document.getElementById(elementId).innerHTML = "\n                            <h2>Base64编码解码</h2>\n                            <div class=\"input-group\">\n                                <label for=\"base64-input\">输入文本:</label>\n                                <textarea id=\"base64-input\" rows=\"4\" placeholder=\"请输入要进行Base64编码或解码的文本...\"></textarea>\n                            </div>\n                            \n                            <div class=\"button-group\">\n                                <button id=\"base64-encode\">Base64编码</button>\n                                <button id=\"base64-decode\">Base64解码</button>\n                                <button id=\"base64-clear\">清空</button>\n                            </div>\n                            \n                            <div class=\"result-container\">\n                                <label>结果:</label>\n                                <div id=\"base64-result\"></div>\n                            </div>\n                        ";
                        initBase64Tool();
                        break;
                    case 'url':
                        document.getElementById(elementId).innerHTML = "\n                            <h2>URL编码解码</h2>\n                            <div class=\"input-group\">\n                                <label for=\"url-input\">输入文本:</label>\n                                <textarea id=\"url-input\" rows=\"4\" placeholder=\"请输入要进行URL编码或解码的文本...\"></textarea>\n                            </div>\n                            \n                            <div class=\"button-group\">\n                                <button id=\"url-encode\">URL编码</button>\n                                <button id=\"url-decode\">URL解码</button>\n                                <button id=\"url-clear\">清空</button>\n                            </div>\n                            \n                            <div class=\"result-container\">\n                                <label>结果:</label>\n                                <div id=\"url-result\"></div>\n                            </div>\n                        ";
                        initUrlTool();
                        break;
                }
            }

            // 获取DOM元素
            const toolItems = document.querySelectorAll('.tool-item');
            const toolSections = document.querySelectorAll('.tool-section');

            // 工具项点击事件 - 发送消息到extension.ts打开新tab
            toolItems.forEach(item => {
                item.addEventListener('click', () => {
                    const toolType = item.getAttribute('data-tool');
                    
                    // 发送消息到extension.ts打开新tab
                    vscode.postMessage({
                        command: 'openToolInEditor',
                        toolType: toolType
                    });
                });
            });

            // Hash工具功能实现
            function initHashTool() {
                const hashInput = document.getElementById('hash-input');
                const hashResult = document.getElementById('hash-result');
                
                document.getElementById('calculate-md5').addEventListener('click', async () => {
                    const text = hashInput.value;
                    if (!text) {
                        hashResult.textContent = '请输入要计算的内容';
                        return;
                    }
                    
                    try {
                        const result = await vscode.postMessage({
                            command: 'calculateHash',
                            algorithm: 'md5',
                            text: text
                        });
                    } catch (error) {
                        hashResult.textContent = '计算失败: ' + error.message;
                    }
                });

                document.getElementById('calculate-sha1').addEventListener('click', async () => {
                    const text = hashInput.value;
                    if (!text) {
                        hashResult.textContent = '请输入要计算的内容';
                        return;
                    }
                    
                    try {
                        const result = await vscode.postMessage({
                            command: 'calculateHash',
                            algorithm: 'sha1',
                            text: text
                        });
                    } catch (error) {
                        hashResult.textContent = '计算失败: ' + error.message;
                    }
                });

                document.getElementById('calculate-sha256').addEventListener('click', async () => {
                    const text = hashInput.value;
                    if (!text) {
                        hashResult.textContent = '请输入要计算的内容';
                        return;
                    }
                    
                    try {
                        const result = await vscode.postMessage({
                            command: 'calculateHash',
                            algorithm: 'sha256',
                            text: text
                        });
                    } catch (error) {
                        hashResult.textContent = '计算失败: ' + error.message;
                    }
                });

                document.getElementById('hash-clear').addEventListener('click', () => {
                    hashInput.value = '';
                    hashResult.textContent = '';
                });
            }

            // Base64工具功能实现
            function initBase64Tool() {
                const base64Input = document.getElementById('base64-input');
                const base64Result = document.getElementById('base64-result');
                
                document.getElementById('base64-encode').addEventListener('click', () => {
                    const text = base64Input.value;
                    if (!text) {
                        base64Result.textContent = '请输入要编码的内容';
                        return;
                    }
                    
                    try {
                        const encoded = btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                            return String.fromCharCode('0x' + p1);
                        }));
                        base64Result.textContent = encoded;
                    } catch (error) {
                        base64Result.textContent = '编码失败: ' + error.message;
                    }
                });

                document.getElementById('base64-decode').addEventListener('click', () => {
                    const text = base64Input.value;
                    if (!text) {
                        base64Result.textContent = '请输入要解码的内容';
                        return;
                    }
                    
                    try {
                        const decoded = decodeURIComponent(atob(text).split('').map(function(c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        base64Result.textContent = decoded;
                    } catch (error) {
                        base64Result.textContent = '解码失败: ' + error.message;
                    }
                });

                document.getElementById('base64-clear').addEventListener('click', () => {
                    base64Input.value = '';
                    base64Result.textContent = '';
                });
            }

            // URL工具功能实现
            function initUrlTool() {
                const urlInput = document.getElementById('url-input');
                const urlResult = document.getElementById('url-result');
                
                document.getElementById('url-encode').addEventListener('click', () => {
                    const text = urlInput.value;
                    if (!text) {
                        urlResult.textContent = '请输入要编码的内容';
                        return;
                    }
                    
                    try {
                        const encoded = encodeURIComponent(text);
                        urlResult.textContent = encoded;
                    } catch (error) {
                        urlResult.textContent = '编码失败: ' + error.message;
                    }
                });

                document.getElementById('url-decode').addEventListener('click', () => {
                    const text = urlInput.value;
                    if (!text) {
                        urlResult.textContent = '请输入要解码的内容';
                        return;
                    }
                    
                    try {
                        const decoded = decodeURIComponent(text);
                        urlResult.textContent = decoded;
                    } catch (error) {
                        urlResult.textContent = '解码失败: ' + error.message;
                    }
                });

                document.getElementById('url-clear').addEventListener('click', () => {
                    urlInput.value = '';
                    urlResult.textContent = '';
                });
            }

            // 默认显示第一个工具面板
            const firstToolItem = document.querySelector('.tool-item');
            if (firstToolItem) {
                const toolType = firstToolItem.getAttribute('data-tool');
                loadToolComponent(toolType, toolType + '-section');
                document.getElementById(toolType + '-section').classList.add('active');
            }

            // 接收来自VSCode的消息
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'hashResult':
                        const hashResult = document.getElementById('hash-result');
                        if (hashResult) {
                            hashResult.textContent = message.result;
                        }
                        break;
                }
            });
        </script>
        `;

        // 替换HTML中的script标签
        htmlContent = htmlContent.replace(/<script>[\s\S]*<\/script>/, scriptTag);

        return htmlContent;
    }

    private async calculateHash(algorithm: string, text: string, webview: vscode.Webview) {
        try {
            // 动态导入crypto-js
            const CryptoJS = await import('crypto-js');
            
            let hashValue: string;
            
            switch (algorithm.toLowerCase()) {
                case 'md5':
                    hashValue = CryptoJS.MD5(text).toString();
                    break;
                case 'sha1':
                    hashValue = CryptoJS.SHA1(text).toString();
                    break;
                case 'sha256':
                    hashValue = CryptoJS.SHA256(text).toString();
                    break;
                default:
                    throw new Error(`Unsupported algorithm: ${algorithm}`);
            }
            
            // 将结果发送回webview
            webview.postMessage({
                command: 'hashResult',
                result: hashValue
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Hash计算失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async openToolInEditor(toolType: string) {
        try {
            // 根据工具类型获取对应的HTML内容
            let toolHtml = '';
            let toolTitle = '';
            
            switch (toolType) {
                case 'hash':
                    toolTitle = 'Hash值计算工具';
                    toolHtml = `
                        <!DOCTYPE html>
                        <html lang="zh-CN">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Hash值计算</title>
                            <style>
                                body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    margin: 20px;
                                    background-color: #ffffff;
                                    color: #000000;
                                }
                                h1 {
                                    color: #1e1e1e;
                                }
                                .input-group {
                                    margin-bottom: 20px;
                                }
                                label {
                                    display: block;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                }
                                textarea {
                                    width: 100%;
                                    padding: 10px;
                                    border: 1px solid #d0d0d0;
                                    border-radius: 4px;
                                    resize: vertical;
                                    min-height: 100px;
                                }
                                .button-group {
                                    margin-bottom: 20px;
                                }
                                button {
                                    padding: 8px 16px;
                                    margin-right: 10px;
                                    margin-bottom: 10px;
                                    border: 1px solid #0078d4;
                                    border-radius: 4px;
                                    background-color: #0078d4;
                                    color: white;
                                    cursor: pointer;
                                }
                                button:hover {
                                    background-color: #005a9e;
                                }
                                .result-container {
                                    margin-top: 20px;
                                    padding: 15px;
                                    border: 1px solid #d0d0d0;
                                    border-radius: 4px;
                                    background-color: #f5f5f5;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>Hash值计算</h1>
                            <div class="input-group">
                                <label for="hash-input">输入文本:</label>
                                <textarea id="hash-input" placeholder="请输入要计算Hash值的文本..."></textarea>
                            </div>
                            
                            <div class="button-group">
                                <button id="calculate-md5">计算MD5</button>
                                <button id="calculate-sha1">计算SHA1</button>
                                <button id="calculate-sha256">计算SHA256</button>
                                <button id="hash-clear">清空</button>
                            </div>
                            
                            <div class="result-container">
                                <label>结果:</label>
                                <div id="hash-result"></div>
                            </div>

                            <script>
                                // Hash值计算功能
                                document.getElementById('calculate-md5').addEventListener('click', () => {
                                    const text = document.getElementById('hash-input').value;
                                    if (!text) {
                                        document.getElementById('hash-result').textContent = '请输入要计算的内容';
                                        return;
                                    }
                                    
                                    try {
                                        // 使用Web Crypto API计算MD5
                                        crypto.subtle.digest('MD5', new TextEncoder().encode(text))
                                            .then(hash => {
                                                const hashArray = Array.from(new Uint8Array(hash));
                                                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                                                document.getElementById('hash-result').textContent = hashHex;
                                            });
                                    } catch (error) {
                                        document.getElementById('hash-result').textContent = '计算失败: ' + error.message;
                                    }
                                });

                                document.getElementById('calculate-sha1').addEventListener('click', () => {
                                    const text = document.getElementById('hash-input').value;
                                    if (!text) {
                                        document.getElementById('hash-result').textContent = '请输入要计算的内容';
                                        return;
                                    }
                                    
                                    try {
                                        // 使用Web Crypto API计算SHA1
                                        crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
                                            .then(hash => {
                                                const hashArray = Array.from(new Uint8Array(hash));
                                                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                                                document.getElementById('hash-result').textContent = hashHex;
                                            });
                                    } catch (error) {
                                        document.getElementById('hash-result').textContent = '计算失败: ' + error.message;
                                    }
                                });

                                document.getElementById('calculate-sha256').addEventListener('click', () => {
                                    const text = document.getElementById('hash-input').value;
                                    if (!text) {
                                        document.getElementById('hash-result').textContent = '请输入要计算的内容';
                                        return;
                                    }
                                    
                                    try {
                                        // 使用Web Crypto API计算SHA256
                                        crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
                                            .then(hash => {
                                                const hashArray = Array.from(new Uint8Array(hash));
                                                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                                                document.getElementById('hash-result').textContent = hashHex;
                                            });
                                    } catch (error) {
                                        document.getElementById('hash-result').textContent = '计算失败: ' + error.message;
                                    }
                                });

                                document.getElementById('hash-clear').addEventListener('click', () => {
                                    document.getElementById('hash-input').value = '';
                                    document.getElementById('hash-result').textContent = '';
                                });
                            </script>
                        </body>
                        </html>
                    `;
                    break;
                case 'base64':
                    toolTitle = 'Base64编码解码工具';
                    toolHtml = `
                        <!DOCTYPE html>
                        <html lang="zh-CN">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Base64编码解码</title>
                            <style>
                                body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    margin: 20px;
                                    background-color: #ffffff;
                                    color: #000000;
                                }
                                h1 {
                                    color: #1e1e1e;
                                }
                                .input-group {
                                    margin-bottom: 20px;
                                }
                                label {
                                    display: block;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                }
                                textarea {
                                    width: 100%;
                                    padding: 10px;
                                    border: 1px solid #d0d0d0;
                                    border-radius: 4px;
                                    resize: vertical;
                                    min-height: 100px;
                                }
                                .button-group {
                                    margin-bottom: 20px;
                                }
                                button {
                                    padding: 8px 16px;
                                    margin-right: 10px;
                                    margin-bottom: 10px;
                                    border: 1px solid #0078d4;
                                    border-radius: 4px;
                                    background-color: #0078d4;
                                    color: white;
                                    cursor: pointer;
                                }
                                button:hover {
                                    background-color: #005a9e;
                                }
                                .result-container {
                                    margin-top: 20px;
                                    padding: 15px;
                                    border: 1px solid #d0d0d0;
                                    border-radius: 4px;
                                    background-color: #f5f5f5;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>Base64编码解码</h1>
                            <div class="input-group">
                                <label for="base64-input">输入文本:</label>
                                <textarea id="base64-input" placeholder="请输入要进行Base64编码或解码的文本..."></textarea>
                            </div>
                            
                            <div class="button-group">
                                <button id="base64-encode">Base64编码</button>
                                <button id="base64-decode">Base64解码</button>
                                <button id="base64-clear">清空</button>
                            </div>
                            
                            <div class="result-container">
                                <label>结果:</label>
                                <div id="base64-result"></div>
                            </div>

                            <script>
                                // Base64编码解码功能
                                document.getElementById('base64-encode').addEventListener('click', () => {
                                    const text = document.getElementById('base64-input').value;
                                    if (!text) {
                                        document.getElementById('base64-result').textContent = '请输入要编码的内容';
                                        return;
                                    }
                                    
                                    try {
                                        const encoded = btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                                            return String.fromCharCode('0x' + p1);
                                        }));
                                        document.getElementById('base64-result').textContent = encoded;
                                    } catch (error) {
                                        document.getElementById('base64-result').textContent = '编码失败: ' + error.message;
                                    }
                                });

                                document.getElementById('base64-decode').addEventListener('click', () => {
                                    const text = document.getElementById('base64-input').value;
                                    if (!text) {
                                        document.getElementById('base64-result').textContent = '请输入要解码的内容';
                                        return;
                                    }
                                    
                                    try {
                                        const decoded = decodeURIComponent(atob(text).split('').map(function(c) {
                                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                                        }).join(''));
                                        document.getElementById('base64-result').textContent = decoded;
                                    } catch (error) {
                                        document.getElementById('base64-result').textContent = '解码失败: ' + error.message;
                                    }
                                });

                                document.getElementById('base64-clear').addEventListener('click', () => {
                                    document.getElementById('base64-input').value = '';
                                    document.getElementById('base64-result').textContent = '';
                                });
                            </script>
                        </body>
                        </html>
                    `;
                    break;
                case 'url':
                    toolTitle = 'URL编码解码工具';
                    toolHtml = `
                        <!DOCTYPE html>
                        <html lang="zh-CN">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>URL编码解码</title>
                            <style>
                                body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    margin: 20px;
                                    background-color: #ffffff;
                                    color: #000000;
                                }
                                h1 {
                                    color: #1e1e1e;
                                }
                                .input-group {
                                    margin-bottom: 20px;
                                }
                                label {
                                    display: block;
                                    margin-bottom: 8px;
                                    font-weight: 500;
                                }
                                textarea {
                                    width: 100%;
                                    padding: 10px;
                                    border: 1px solid #d0d0d0;
                                    border-radius: 4px;
                                    resize: vertical;
                                    min-height: 100px;
                                }
                                .button-group {
                                    margin-bottom: 20px;
                                }
                                button {
                                    padding: 8px 16px;
                                    margin-right: 10px;
                                    margin-bottom: 10px;
                                    border: 1px solid #0078d4;
                                    border-radius: 4px;
                                    background-color: #0078d4;
                                    color: white;
                                    cursor: pointer;
                                }
                                button:hover {
                                    background-color: #005a9e;
                                }
                                .result-container {
                                    margin-top: 20px;
                                    padding: 15px;
                                    border: 1px solid #d0d0d0;
                                    border-radius: 4px;
                                    background-color: #f5f5f5;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>URL编码解码</h1>
                            <div class="input-group">
                                <label for="url-input">输入文本:</label>
                                <textarea id="url-input" placeholder="请输入要进行URL编码或解码的文本..."></textarea>
                            </div>
                            
                            <div class="button-group">
                                <button id="url-encode">URL编码</button>
                                <button id="url-decode">URL解码</button>
                                <button id="url-clear">清空</button>
                            </div>
                            
                            <div class="result-container">
                                <label>结果:</label>
                                <div id="url-result"></div>
                            </div>

                            <script>
                                // URL编码解码功能
                                document.getElementById('url-encode').addEventListener('click', () => {
                                    const text = document.getElementById('url-input').value;
                                    if (!text) {
                                        document.getElementById('url-result').textContent = '请输入要编码的内容';
                                        return;
                                    }
                                    
                                    try {
                                        const encoded = encodeURIComponent(text);
                                        document.getElementById('url-result').textContent = encoded;
                                    } catch (error) {
                                        document.getElementById('url-result').textContent = '编码失败: ' + error.message;
                                    }
                                });

                                document.getElementById('url-decode').addEventListener('click', () => {
                                    const text = document.getElementById('url-input').value;
                                    if (!text) {
                                        document.getElementById('url-result').textContent = '请输入要解码的内容';
                                        return;
                                    }
                                    
                                    try {
                                        const decoded = decodeURIComponent(text);
                                        document.getElementById('url-result').textContent = decoded;
                                    } catch (error) {
                                        document.getElementById('url-result').textContent = '解码失败: ' + error.message;
                                    }
                                });

                                document.getElementById('url-clear').addEventListener('click', () => {
                                    document.getElementById('url-input').value = '';
                                    document.getElementById('url-result').textContent = '';
                                });
                            </script>
                        </body>
                        </html>
                    `;
                    break;
                default:
                    throw new Error(`Unsupported tool type: ${toolType}`);
            }
            
            // 创建临时文件
            const tempDir = require('os').tmpdir();
            const fileName = `magic-tools-${toolType}.html`;
            const filePath = path.join(tempDir, fileName);
            
            // 写入HTML内容
            fs.writeFileSync(filePath, toolHtml);
            
            // 在Editor中打开文件
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.Active,
                preview: false,
                preserveFocus: false
            });
            
            // 注意：设置编辑器标题的功能在VS Code API中可能需要不同的实现方式
            // 这里暂时注释掉，因为activeTabGroup在当前API版本中可能不可用
        } catch (error) {
            vscode.window.showErrorMessage(`打开工具失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}