import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IAiProvider,
  ValidationResult,
  QuizGenerationOptions,
  QuizGenerationResult,
  AiProviderError,
  AI_ERROR_CODES
} from '../interfaces/IAiProvider';

export class GeminiProvider implements IAiProvider {
  public readonly name = 'gemini';
  public readonly version = '1.0.0';
  
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: {
    apiKey: string;
    model?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash-8b';
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries || 3;
    
    if (!this.apiKey) {
      throw new AiProviderError(
        'Gemini API key is required',
        AI_ERROR_CODES.INVALID_API_KEY,
        this.name
      );
    }
    
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('Gemini client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini client:', error);
      throw new AiProviderError(
        'Failed to initialize Gemini client',
        AI_ERROR_CODES.INVALID_API_KEY,
        this.name
      );
    }
  }

  async validateKey(apiKey?: string): Promise<ValidationResult> {
    const keyToValidate = apiKey || this.apiKey;
    
    try {
      console.log('Validating Gemini API key...');
      
      // 创建临时客户端进行验证
      const tempGenAI = new GoogleGenerativeAI(keyToValidate);
      const model = tempGenAI.getGenerativeModel({ model: this.model });
      
      // 发送简单的测试请求
      const result = await Promise.race([
        model.generateContent('Hello'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
      ]) as any;
      
      const response = await result.response;
      const text = response.text();
      
      if (text && text.length > 0) {
        console.log('Gemini API key validation successful');
        return {
          valid: true,
          quota: {
            used: 1,
            limit: 1000, // 默认值，实际需要从API获取
            remaining: 999
          }
        };
      } else {
        throw new Error('Empty response from Gemini API');
      }
      
    } catch (error: any) {
      console.error('Gemini API key validation failed:', error);
      
      let reason = 'Unknown error';
      let code: string = AI_ERROR_CODES.UNKNOWN_ERROR;
      
      if (error.message?.includes('API key not valid')) {
        reason = 'API key is invalid or has been revoked';
        code = AI_ERROR_CODES.INVALID_API_KEY;
      } else if (error.message?.includes('quota')) {
        reason = 'API quota exceeded or billing not enabled';
        code = AI_ERROR_CODES.QUOTA_EXCEEDED;
      } else if (error.message?.includes('rate limit')) {
        reason = 'Rate limit exceeded, please try again later';
        code = AI_ERROR_CODES.RATE_LIMITED;
      } else if (error.message?.includes('Timeout')) {
        reason = 'Request timeout, please check your network connection';
        code = AI_ERROR_CODES.TIMEOUT;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        reason = 'Network error, unable to reach Gemini API';
        code = AI_ERROR_CODES.NETWORK_ERROR;
      }
      
      return {
        valid: false,
        reason: `${reason}: ${error.message}`
      };
    }
  }

  async generateQuizHtml(options: QuizGenerationOptions): Promise<QuizGenerationResult> {
    if (!this.genAI) {
      throw new AiProviderError(
        'Gemini client not initialized',
        AI_ERROR_CODES.SERVICE_UNAVAILABLE,
        this.name
      );
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        attempt++;
        console.log(`Generating quiz HTML (attempt ${attempt}/${this.maxRetries})...`);

        const model = this.genAI.getGenerativeModel({ model: this.model });
        
        const prompt = this.buildPrompt(options);
        
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          )
        ]) as any;

        const response = await result.response;
        const html = response.text();

        if (!html || html.trim().length === 0) {
          throw new Error('Empty response from Gemini API');
        }

        const processingTime = Date.now() - startTime;
        const questionCount = this.extractQuestionCount(html);

        console.log('Quiz HTML generated successfully', {
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
        console.error(`Quiz generation attempt ${attempt} failed:`, error);

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
      console.error('Gemini health check failed:', error);
      return false;
    }
  }

  async getUsageStats(): Promise<{
    requestsToday: number;
    tokensUsed: number;
    errorRate: number;
  }> {
    // 这里应该从缓存或数据库中获取实际的使用统计
    // 目前返回模拟数据
    return {
      requestsToday: 0,
      tokensUsed: 0,
      errorRate: 0
    };
  }

  private buildPrompt(options: QuizGenerationOptions): string {
    const rules = `
- 严格执行两步交互：只有在用户已选择“顺序/随机”后才生成HTML（本次已选择：${options.orderMode}）
- 随机模式：先一次性打乱题库，之后所有编号、上一题/下一题、底部题号栏严格按该随机序列
- 题目类型：自动判断。选择题显示选项按钮；填空题显示输入框+“提交答案”按钮
- 反馈：
  - 选择题：点击后即时反馈；正确项绿色；所选错误项红色；该题选项锁定
  - 填空题：提交后严格完全匹配；对→输入框边框绿；错→边框红，并显示“正确答案：{标准答案}”；锁定输入
- 状态：在页面内存中持久（切换题目返回后仍保留已答）
- 导航：上一题/下一题 + 底部可横向滚动题号栏（当前题蓝、答对绿、答错红）
- 完成页：展示“答对/总数（正确率%）”，提供“重新开始”
- 技术：单HTML（内含HTML/CSS/JS），Tailwind CSS，移动端优先，禁止动画
- 解析规则：题干后紧随四个选项为一题；或题干+一个答案为一题；正确选项行首带“。”；不要显示 A/B/C/D 标签，按文档顺序展示
`;

    return `请根据以下“内容与规则”生成一个单文件HTML刷题网页：

【出题顺序】${options.orderMode}

【内容】
${options.content}

【规则】
${rules}

输出：直接给出完整且可运行的HTML（包含<head>与<body>）。`;
  }

  private extractQuestionCount(html: string): number {
    // 简单的题目计数逻辑
    const questionMatches = html.match(/(?:题目|问题|\d+\.)/g);
    return questionMatches ? questionMatches.length : 0;
  }

  private cleanupHtml(html: string): string {
    // 清理HTML，移除不必要的标记
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
