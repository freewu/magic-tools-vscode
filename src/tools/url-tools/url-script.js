// URL工具功能实现
function initUrlTool() {
    const urlInput = document.getElementById('url-input');
    const urlResult = document.getElementById('url-result');

    // URL编码解码功能
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

// 导出函数供主页面调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initUrlTool };
}