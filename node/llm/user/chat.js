const OpenAI = require("openai");

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

async function postExamAIanalyse(message,model) {
    const client = getOpenAIClient();
    if (!client) {
        return {
            Aidata: 'AI 服务未配置（缺少 DASHSCOPE_API_KEY / OPENAI_API_KEY）',
            modelName: 'unconfigured'
        };
    }

    const messages = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message }
    ];
    const completion = await client.chat.completions.create({
        model: model,
        messages: messages,
        // 添加 enable_thinking 参数，解决BadRequestError: 400 parameter.enable_thinking must be set to false for non-streaming calls
        enable_thinking: false 
    });
    return {
        Aidata:completion.choices[0].message.content,
        modelName:completion.model
    } ;
}
async function postUserChat(messages, model) {
    const client = getOpenAIClient();
    if (!client) {
        return {
            Aidata: 'AI 服务未配置（缺少 DASHSCOPE_API_KEY / OPENAI_API_KEY）',
            modelName: 'unconfigured'
        };
    }

    // 确保消息数组包含系统提示
    if (!messages || !messages.length || messages[0].role !== 'system') {
        messages = [
            { role: "system", content: "You are a helpful assistant." },
            ...messages
        ];
    }
    const completion = await client.chat.completions.create({
        model: model,
        messages: messages,
        // 添加 enable_thinking 参数，解决BadRequestError: 400 parameter.enable_thinking must be set to false for non-streaming calls
        enable_thinking: false 
    });
    return {
        Aidata:completion.choices[0].message.content,
        modelName:completion.model 
    } 
}

async function postTranslateWorld(word) {
    const client = getOpenAIClient();
    if (!client) {
        return {
            Aidata: 'AI 服务未配置（缺少 DASHSCOPE_API_KEY / OPENAI_API_KEY）',
            modelName: 'unconfigured'
        };
    }

    const messages = [
        { role: "user", content: word }  // 仅包含一个用户消息，不需要系统提示
    ];
    const completion = await client.chat.completions.create({
        model: "qwen-mt-turbo",
        messages: messages,
        enable_thinking: false,
        translation_options: {  // 添加翻译选项
            source_lang: "auto",  // 自动检测源语言
            target_lang: "zh"     // 目标语言设为中文
        }
    });
    return {
        Aidata: completion.choices[0].message.content,
        modelName: completion.model
    };
}



module.exports = { postExamAIanalyse,postUserChat ,postTranslateWorld};
