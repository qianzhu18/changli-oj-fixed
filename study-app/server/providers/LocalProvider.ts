import { IAiProvider, QuizGenerationOptions, QuizGenerationResult, ValidationResult } from '../interfaces/IAiProvider'
import { QuizParser } from '../../lib/quiz-parser'
import { QuizHtmlGenerator } from '../../lib/quiz-html-generator'

export class LocalProvider implements IAiProvider {
  public readonly name = 'local'
  public readonly version = '1.0.0'

  constructor() {}

  async validateKey(): Promise<ValidationResult> {
    return { valid: true }
  }

  async generateQuizHtml(options: QuizGenerationOptions): Promise<QuizGenerationResult> {
    try {
      const quizData = QuizParser.parseQuizContent(options.content)
      const html = QuizHtmlGenerator.generateQuizHtml(quizData, options.orderMode === '随机' ? '随机' : '顺序')
      return {
        success: true,
        html,
        metadata: {
          questionCount: quizData.questions.length,
          processingTime: 0,
          tokensUsed: 0,
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Local generation failed' }
    }
  }

  async healthCheck(): Promise<boolean> {
    return true
  }

  async getUsageStats() {
    return { requestsToday: 0, tokensUsed: 0, errorRate: 0 }
  }
}

