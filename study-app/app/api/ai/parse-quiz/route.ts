import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

    const response = await fetch(`${BACKEND_URL}/api/v2/ai/parse-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API代理错误:', error)
    return NextResponse.json(
      { success: false, message: '服务器连接失败' },
      { status: 500 }
    )
  }
}
