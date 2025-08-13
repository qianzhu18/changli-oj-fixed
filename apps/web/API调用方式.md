/**
 * 极简AI调用函数 (内置API Key和模型)
 * @param {string} systemPrompt - 系统提示词，用于设定AI的角色和任务
 * @param {string} userMessage - 用户的具体问题或指令
 * @param {string} [baseUrl='https://twoapi-ui.qiangtu.com/v1'] - API的基础URL (可选)
 * @returns {Promise<string>} 返回一个Promise，解析为AI生成的完整文本内容
 */
async function generateContent(systemPrompt, userMessage, baseUrl = 'https://twoapi-ui.qiangtu.com/v1') {
    // --- 配置已内置 ---
    const API_KEY = 'sk-1e49426A5A63Ee3C33256F17EF152C02';
    const MODEL = 'gemini-2.5-pro-preview-06-05'; // 原始代码中的默认模型
    // -----------------

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                stream: true,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`API请求失败, 状态码: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') break;
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.choices[0].delta?.content) {
                            fullContent += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
        return fullContent;

    } catch (error) {
        console.error('调用AI模型时出错:', error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}