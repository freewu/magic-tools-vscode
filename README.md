# Magic Tools

一个实用的VSCode开发工具集合扩展，提供多种常用的开发工具。

## 功能特性

- **Hash值计算**：支持MD5、SHA1、SHA256算法
- **Base64编码解码**：快速进行Base64编码和解码操作
- **URL编码解码**：便捷的URL编码和解码功能

## 使用方法

1. 安装扩展后，点击侧边栏的Magic Tools图标
2. 在工具面板中选择相应的功能
3. 输入需要处理的文本
4. 点击相应按钮获取结果

## 开发构建

如果需要本地构建此扩展：

```bash
npm install
npm run compile
```

## 技术栈

- TypeScript
- VSCode Extension API
- HTML/CSS/JavaScript
- CryptoJS (用于Hash算法)