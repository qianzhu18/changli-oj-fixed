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
        content = (formData.get('content') as string) || (formData.get('fileContent') as string)
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

      // 读取出题顺序（支持 order 与 orderMode）
      body = { orderMode: (formData.get('orderMode') as string) || (formData.get('order') as string) }
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

    // 设置默认AI配置，优先使用TwoAPI（无需API密钥）
    if (!aiConfig) {
      aiConfig = {
        provider: 'twoapi',
        model: 'gemini-2.5-pro-preview-06-05'
      }
    }

    // 如果没有指定provider，默认使用twoapi
    if (!aiConfig.provider) {
      aiConfig.provider = 'twoapi'
    }

    // 只有使用gemini provider时才需要API密钥
    if (aiConfig.provider === 'gemini' && !aiConfig.apiKey) {
      return NextResponse.json(
        { success: false, message: 'Gemini provider需要API密钥' },
        { status: 400 }
      )
    }

    const aiService = AiService.getInstance()
    const startTime = Date.now()

    // 强制两步流：若未提供出题顺序，则返回第一步提示
    const chosenOrder = (body?.orderMode) || (body?.order) || '未选择'
    if (chosenOrder !== '顺序' && chosenOrder !== '随机') {
      return NextResponse.json({
        success: false,
        step: 'step1',
        prompt: '您好！在为您生成刷题网页之前，请问您希望题目是按顺序出还是随机出？'
      }, { status: 400 })
    }

    const result = await aiService.generateQuizHtml(
      content,
      {
        provider: aiConfig.provider || 'twoapi',
        apiKey: aiConfig.apiKey,
        model: aiConfig.model
      },
      chosenOrder
    )

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        html: result.html,
        originalContent: content,
        questionCount: result.metadata?.questionCount || 0,
        provider: aiConfig.provider || 'twoapi',
        model: aiConfig.model || 'gemini-2.5-pro-preview-06-05',
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
