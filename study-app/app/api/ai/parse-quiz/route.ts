import { NextRequest, NextResponse } from 'next/server'
import { AiService } from '../../../../server/services/aiService'

export async function POST(request: NextRequest) {
  try {
    let body: any
    let content: string
    let aiConfig: any

    // 处理不同的请求格式
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // 处理文件上传
      const formData = await request.formData()
      const file = formData.get('file') as File
      const aiConfigStr = formData.get('aiConfig') as string

      if (file) {
        content = await file.text()
      } else {
        content = formData.get('content') as string || formData.get('fileContent') as string
      }

      if (aiConfigStr) {
        try {
          aiConfig = JSON.parse(aiConfigStr)
        } catch {
          aiConfig = { apiKey: formData.get('apiKey') as string }
        }
      } else {
        aiConfig = { apiKey: formData.get('apiKey') as string }
      }
    } else {
      // 处理 JSON 请求
      body = await request.json()
      content = body.content || body.fileContent
      aiConfig = body.aiConfig
    }

    // 确保包含必要的参数
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { success: false, message: '题库内容是必需的' },
        { status: 400 }
      )
    }

    if (!aiConfig?.apiKey) {
      return NextResponse.json(
        { success: false, message: 'AI配置信息是必需的' },
        { status: 400 }
      )
    }

    const aiService = AiService.getInstance()
    const startTime = Date.now()

    const result = await aiService.generateQuizHtml(
      content,
      {
        provider: aiConfig.provider || 'gemini',
        apiKey: aiConfig.apiKey,
        model: aiConfig.model
      },
      (body?.orderMode) || '顺序'
    )

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        html: result.html,
        originalContent: content,
        questionCount: result.metadata?.questionCount || 0,
        provider: aiConfig.provider || 'gemini',
        model: aiConfig.model || process.env.AI_MODEL || 'gemini-1.5-flash-8b',
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
