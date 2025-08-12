import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, orderMode, html, userId } = body

    // 验证必需字段
    if (!title || !html || !userId) {
      return NextResponse.json(
        { success: false, message: '缺少必需字段' },
        { status: 400 }
      )
    }

    // 暂时模拟保存成功，返回模拟数据
    // 在实际应用中，这里应该保存到数据库
    const mockQuiz = {
      id: `quiz_${Date.now()}`,
      title,
      description: description || '',
      orderMode: orderMode || '顺序',
      status: 'completed',
      createdAt: new Date().toISOString()
    }

    console.log('Quiz saved (mock):', mockQuiz)

    return NextResponse.json({
      success: true,
      data: mockQuiz
    })

  } catch (error: any) {
    console.error('Save quiz error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || '保存题库失败'
      },
      { status: 500 }
    )
  }
}
