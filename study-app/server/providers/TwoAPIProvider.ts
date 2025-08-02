import { 
  IAiProvider, 
  ValidationResult, 
  QuizGenerationOptions, 
  QuizGenerationResult,
  AiProviderError,
  AI_ERROR_CODES
} from '../interfaces/IAiProvider';

export class TwoAPIProvider implements IAiProvider {
  public readonly name = 'twoapi';
  public readonly version = '1.0.0';
  
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    timeout?: number;
    maxRetries?: number;
  } = {}) {
    // 使用固定的API配置，无需用户手动配置
    this.apiKey = config.apiKey || 'sk-1e49426A5A63Ee3C33256F17EF152C02';
    this.baseUrl = config.baseUrl || 'https://twoapi-ui.qiangtu.com/v1';
    this.model = config.model || 'gemini-2.5-pro-preview-06-05';
    this.timeout = config.timeout || 300000; // 5分钟超时
    this.maxRetries = config.maxRetries || 3;
    
    console.log('TwoAPI Provider initialized with model:', this.model);
  }

  async validateKey(apiKey?: string): Promise<ValidationResult> {
    const keyToValidate = apiKey || this.apiKey;
    
    try {
      console.log('Validating TwoAPI key...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒验证超时
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToValidate}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 10,
          temperature: 0.1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        console.log('TwoAPI key validation successful');
        return {
          valid: true,
          quota: {
            used: 1,
            limit: 10000, // 估算值
            remaining: 9999
          }
        };
      } else {
        throw new Error('Invalid response format from TwoAPI');
      }
      
    } catch (error: any) {
      console.error('TwoAPI key validation failed:', error);
      
      let reason = 'Unknown error';
      let code: string = AI_ERROR_CODES.UNKNOWN_ERROR;
      
      if (error.name === 'AbortError') {
        reason = 'Request timeout, please check your network connection';
        code = AI_ERROR_CODES.TIMEOUT;
      } else if (error.message?.includes('401')) {
        reason = 'API key is invalid or has been revoked';
        code = AI_ERROR_CODES.INVALID_API_KEY;
      } else if (error.message?.includes('429')) {
        reason = 'Rate limit exceeded, please try again later';
        code = AI_ERROR_CODES.RATE_LIMITED;
      } else if (error.message?.includes('quota')) {
        reason = 'API quota exceeded';
        code = AI_ERROR_CODES.QUOTA_EXCEEDED;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        reason = 'Network error, unable to reach TwoAPI service';
        code = AI_ERROR_CODES.NETWORK_ERROR;
      }
      
      return {
        valid: false,
        reason: `${reason}: ${error.message}`
      };
    }
  }

  async generateQuizHtml(options: QuizGenerationOptions): Promise<QuizGenerationResult> {
    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        attempt++;
        console.log(`Generating quiz HTML with TwoAPI (attempt ${attempt}/${this.maxRetries})...`);

        const prompt = this.buildPrompt(options);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            stream: true,
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: options.content }
            ],
            temperature: 0.7
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} ${errorText}`);
        }

        const html = await this.parseStreamResponse(response);

        if (!html || html.trim().length === 0) {
          throw new Error('Empty response from TwoAPI');
        }

        const processingTime = Date.now() - startTime;
        const questionCount = this.extractQuestionCount(html);

        console.log('Quiz HTML generated successfully with TwoAPI', {
          questionCount,
          processingTime,
          htmlLength: html.length
        });

        return {
          success: true,
          html: this.cleanupHtml(html),
          metadata: {
            questionCount,
            processingTime,
            tokensUsed: this.estimateTokens(options.content + html)
          }
        };

      } catch (error: any) {
        console.error(`TwoAPI quiz generation attempt ${attempt} failed:`, error);

        if (attempt === this.maxRetries) {
          return {
            success: false,
            error: `Quiz generation failed after ${this.maxRetries} attempts: ${error.message}`
          };
        }

        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Quiz generation failed after all retry attempts'
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.validateKey();
      return result.valid;
    } catch (error) {
      console.error('TwoAPI health check failed:', error);
      return false;
    }
  }

  async getUsageStats(): Promise<{
    requestsToday: number;
    tokensUsed: number;
    errorRate: number;
  }> {
    // 返回模拟数据，实际应该从缓存或数据库获取
    return {
      requestsToday: 0,
      tokensUsed: 0,
      errorRate: 0
    };
  }

  private async parseStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
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
              if (data.choices?.[0]?.delta?.content) {
                fullContent += data.choices[0].delta.content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private buildPrompt(options: QuizGenerationOptions): string {
    // 完全集成题库转换prompt.md中的逻辑
    return `你是一个专业的题库转换助手。请严格按照以下交互流程进行：

## 任务目标
根据用户选择（${options.orderMode}）和题库文件，创建一个功能完善、用于刷题的前端网页，需打包在单个HTML文件中。

## 用户选择集成
- 题目顺序：严格根据用户选择（'${options.orderMode}'）来排列题目
- 随机模式行为：如果选择了'随机'模式，程序必须首先一次性地将整个题库顺序打乱，生成一个全新的随机序列。之后，所有面向用户的编号（如"题目 1 / 96"）、导航控制（"上一题"、"下一题"按钮）以及底部的题目导航栏，都必须严格地、唯一地遵循这个新生成的随机序列。题库中题目的原始位置绝不能影响用户的导航流程。

## 数据解析规则
- 题目结构：对于选择题，一个问题及其紧随其后的四个选项组成一道完整的题目。对于填空题，一个问题及其对应的一个答案组成一道完整的题目。
- 编号：网页上的题号从 '1' 开始，按顺序连续编号。
- 选项标签：选择题的选项不使用 'A/B/C/D' 标签，按文档顺序排列。
- 答案识别：对于选择题，源文档中正确选项行的开头有一个句号 '。'，程序需自动识别并设定为正确答案。
- 【关键解析逻辑】解析数据时，必须实现一个能够正确处理复杂字段的CSV或文本解析逻辑。简单地使用逗号分割或按行分割都是不可接受的，因为它会错误地切分包含复杂代码的内容。解析器必须能将被双引号包裹的、可能包含换行符和逗号的字段内容视为一个完整的、不可分割的单元，确保数据完整性。同时，需保留字段内的原始格式（如换行和空格），以便在网页上正确显示代码缩进和布局。

## 题目类型处理
- 类型检测：程序需要能自动根据题库文件内容的列数或结构，判断题库是'选择题'还是'填空题'。例如，多于2列通常为选择题，而2列（题干、答案）则为填空题。
- 填空题UI：当题目类型为'填空题'时，不应显示选项按钮。取而代之的是，在题干下方提供一个文本输入框供用户作答，旁边配有一个'提交答案'按钮。
- 填空题锁定：用户点击'提交答案'后，输入框和提交按钮应被锁定，不可再次修改或提交。
- 填空题反馈：【严格完全匹配】用户的输入内容必须与题库中提供的答案文本'完全一样'才算正确。这包括大小写、空格、标点符号等。任何细微差别都应判为错误。提交后，如果答案正确，输入框边框高亮为绿色。如果答案错误，输入框边框高亮为红色，并在其下方清晰地展示'正确答案：[题库中的答案]'。

## 核心功能
- 显示模式：一次只显示一道题目。
- 实时反馈：此反馈逻辑主要适用于选择题。选项背景高亮为绿色（正确）或红色（错误）。作答后，当前题目的所有选项应被锁定，不可更改。
- 状态管理：用户的作答记录（对错状态和选择/填写内容）需要被保存，即使在题目间来回切换也应保留。

## 导航和控制
- 自由跳转：在页面最下方创建仅占一行的题目导航栏，栏内所有题号按钮水平排列，当题号过多时可以横向自由滑动。状态显示：当前题目用蓝色高亮，答对的题目用绿色标记，答错的题目用红色标记。
- 顺序导航：提供"上一题"和"下一题"按钮。
- 评分：提供一个'完成练习'按钮，点击后跳转到结果页面。结果格式：答对题数 / 总题数 (正确率%)。结果页面上有一个'重新开始'按钮，点击后清空所有记录并返回第1题。

## 设计和技术
- 技术要求：所有代码（HTML, CSS, JavaScript）必须包含在单个文件中。
- 视觉风格：界面设计应现代、简洁、美观，使用 Tailwind CSS进行样式设计。
- 响应式设计：优先确保在手机上有良好的显示效果和使用体验。
- 视觉效果：页面所有状态更新（如选择选项、切换题目）必须是静态的，立即完成，不允许使用任何过渡动画或闪烁效果。

请生成完整的HTML代码：`;
  }

  private extractQuestionCount(html: string): number {
    // 改进的题目计数逻辑
    const questionMatches = html.match(/(?:题目|问题|\d+\.|第\s*\d+\s*题)/g);
    return questionMatches ? questionMatches.length : 0;
  }

  private cleanupHtml(html: string): string {
    // 清理HTML，移除markdown标记
    return html
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();
  }

  private estimateTokens(text: string): number {
    // 简单的token估算（1个token约等于4个字符）
    return Math.ceil(text.length / 4);
  }
}
