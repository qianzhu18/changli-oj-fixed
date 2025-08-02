import { GeminiProvider } from '../providers/GeminiProvider';
import { TwoAPIProvider } from '../providers/TwoAPIProvider';
import { IAiProvider, QuizGenerationOptions, ValidationResult } from '../interfaces/IAiProvider';

export class AiService {
  private static instance: AiService;
  private providers: Map<string, IAiProvider> = new Map();

  private constructor() {}

  static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  /**
   * 创建或获取 AI Provider
   */
  getProvider(config: {
    provider: string;
    apiKey?: string;
    model?: string;
  }): IAiProvider {
    const key = `${config.provider}-${config.apiKey || 'default'}`;

    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: IAiProvider;

    switch (config.provider.toLowerCase()) {
      case 'gemini':
        if (!config.apiKey) {
          throw new Error('Gemini provider requires API key');
        }
        provider = new GeminiProvider({
          apiKey: config.apiKey,
          model: config.model || process.env.AI_MODEL || 'gemini-1.5-flash-8b'
        });
        break;
      case 'twoapi':
        // TwoAPI不需要用户提供API密钥，使用内置配置
        provider = new TwoAPIProvider({
          model: config.model || 'gemini-2.5-pro-preview-06-05'
        });
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }

    this.providers.set(key, provider);
    return provider;
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(config: {
    provider: string;
    apiKey?: string;
    model?: string;
  }): Promise<ValidationResult> {
    try {
      const provider = this.getProvider(config);
      return await provider.validateKey(config.apiKey);
    } catch (error: any) {
      console.error('API key validation failed:', error);
      return {
        valid: false,
        reason: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 生成题库 HTML
   */
  async generateQuizHtml(
    content: string,
    config: {
      provider: string;
      apiKey?: string;
      model?: string;
    },
    orderMode: '顺序' | '随机' = '顺序'
  ) {
    try {
      const provider = this.getProvider(config);
      
      const options: QuizGenerationOptions = {
        content,
        orderMode
      };

      const result = await provider.generateQuizHtml(options);
      
      if (!result.success) {
        throw new Error(result.error || '题库生成失败');
      }

      return {
        success: true,
        html: result.html,
        metadata: result.metadata
      };
    } catch (error: any) {
      console.error('Quiz generation failed:', error);
      throw new Error(error.message || '题库生成失败');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(config: {
    provider: string;
    apiKey?: string;
    model?: string;
  }): Promise<boolean> {
    try {
      const provider = this.getProvider(config);
      return await provider.healthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
