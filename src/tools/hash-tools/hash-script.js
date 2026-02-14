// Hash工具功能实现
function initHashTool() {
    const hashInput = document.getElementById('hash-input');
    const hashResult = document.getElementById('hash-result');

    // Hash值计算功能
    document.getElementById('calculate-md5').addEventListener('click', async () => {
        const text = hashInput.value;
        if (!text) {
            hashResult.textContent = '请输入要计算的内容';
            return;
        }
        
        try {
            const result = await acquireVsCodeApi().postMessage({
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
            const result = await acquireVsCodeApi().postMessage({
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
            const result = await acquireVsCodeApi().postMessage({
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

// 导出函数供主页面调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initHashTool };
}