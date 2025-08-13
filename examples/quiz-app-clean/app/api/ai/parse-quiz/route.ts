import { NextRequest, NextResponse } from 'next/server'
import { AiService } from '../../../../server/services/aiService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 确保包含必要的参数
    if (!body.content) {
      return NextResponse.json(
        { success: false, message: '题库内容是必需的' },
        { status: 400 }
      )
    }

    if (!body.aiConfig?.apiKey) {
      return NextResponse.json(
        { success: false, message: 'AI配置信息是必需的' },
        { status: 400 }
      )
    }

    const aiService = AiService.getInstance()
    const startTime = Date.now()

    const result = await aiService.generateQuizHtml(
      body.content,
      {
        provider: body.aiConfig.provider || 'gemini',
        apiKey: body.aiConfig.apiKey,
        model: body.aiConfig.model
      },
      body.orderMode || '顺序'
    )

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        html: result.html,
        originalContent: body.content,
        questionCount: result.metadata?.questionCount || 0,
        provider: body.aiConfig.provider || 'gemini',
        model: body.aiConfig.model || process.env.AI_MODEL || 'gemini-1.5-flash-8b',
        tokensUsed: result.metadata?.tokensUsed || 0,
        processingTime
      }
    })

  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || '题库生成失败'
      },
      { status: 500 }
    )
  }
}
