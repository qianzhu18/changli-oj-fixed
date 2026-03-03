const OpenAI = require("openai");
const { filterLastUserMessage } = require('../../../helpers/MessageFilter');

let openai = null;

function getOpenAIClient() {
    if (openai) return openai;
    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
        return null;
    }

    openai = new OpenAI({
        apiKey,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
    return openai;
}

async function postUserSingleChat(messages, model) {
    const filteredMessages = filterLastUserMessage(messages);
    console.log('Filtered messages:', filteredMessages);
    const client = getOpenAIClient();
    if (!client) {
        return {
            Aidata: 'AI 服务未配置（缺少 DASHSCOPE_API_KEY / OPENAI_API_KEY）',
            modelName: 'unconfigured'
        };
    }

    const completion = await client.chat.completions.create({
        model: model,
        messages: filteredMessages,
        // 添加 enable_thinking 参数
        enable_thinking: false 
    });
    return {
        Aidata:completion.choices[0].message.content,
        modelName:completion.model 
    } 
}


module.exports = { postUserSingleChat};
