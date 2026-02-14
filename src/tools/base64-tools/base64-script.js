// Base64工具功能实现
function initBase64Tool() {
    const base64Input = document.getElementById('base64-input');
    const base64Result = document.getElementById('base64-result');

    // Base64编码解码功能
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

// 导出函数供主页面调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initBase64Tool };
}