import { logger } from '../utils/logger';
import { AiProviderFactory } from '../providers/AiProviderFactory';
import { configManager } from '../config/settings';
import { cacheService, CacheService } from './cacheService';
import { QuizParser } from './localQuizParser';
import { QuizHtmlGenerator } from './localQuizHtmlGenerator';

/**
 * 使用Gemini AI生成题库HTML
 * @param content 解析后的文本内容
 * @param orderMode 出题模式：'顺序' 或 '随机'
 * @returns 生成的HTML内容
 */
export async function generateQuizHTML(content: string, orderMode: '顺序' | '随机'): Promise<string> {
  try {
    logger.info('开始调用Gemini生成题库HTML', {
      contentLength: content.length,
      orderMode,
    });

    const config = configManager.get('ai');
    const factory = AiProviderFactory.getInstance();
    const geminiApiKey = config.geminiApiKey;

    // 根据配置选择Provider
    let html: string | undefined;
    const useGemini = !!geminiApiKey && config.provider === 'gemini';
    const providerType = useGemini ? 'gemini' : 'local';

    const contentHash = CacheService.generateContentHash(content, {
      orderMode,
      provider: providerType,
      model: config.model,
    });

    const cachedResult = await cacheService.getCachedGenerationResult(contentHash);
    if (cachedResult?.html) {
      logger.info('使用缓存的题库HTML', {
        provider: cachedResult.provider || providerType,
        contentHash: contentHash.substring(0, 8),
      });
      return cachedResult.html;
    }

    if (useGemini && geminiApiKey) {
      try {
        const provider = factory.createProvider('gemini', {
          apiKey: geminiApiKey,
          model: config.model,
          timeout: config.timeout
        });

        const result = await provider.generateQuizHtml({
          content,
          orderMode
        });

        if (result.success && result.html) {
          html = result.html;
          logger.info('题库HTML生成成功', {
            provider: provider.name,
            htmlLength: result.html.length,
            metadata: result.metadata
          });
        } else {
          logger.warn('Gemini生成失败，回退到本地解析器', { error: result.error });
        }
      } catch (error) {
        logger.warn('Gemini生成异常，回退到本地解析器', error);
      }
    }

    if (!html) {
      logger.warn('使用本地规则解析器生成题库HTML');
      const quizData = QuizParser.parseQuizContent(content);
      html = QuizHtmlGenerator.generateQuizHtml(quizData, orderMode);
    }

    await cacheService.cacheGenerationResult(
      contentHash,
      {
        html,
        provider: providerType,
      },
      7200
    );

    return html;

  } catch (error) {
    logger.error('Gemini题库生成失败:', error);
    throw new Error(`题库生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
