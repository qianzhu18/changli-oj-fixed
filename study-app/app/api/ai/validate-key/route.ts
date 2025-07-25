import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('apiKey')
    
    if (!apiKey) {
      return NextResponse.json(
        { valid: false, reason: 'API Key is required' },
        { status: 400 }
      )
    }
    
    const response = await fetch(`${BACKEND_URL}/api/v2/ai/validate-key?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API代理错误:', error)
    return NextResponse.json(
      { valid: false, reason: '服务器连接失败' },
      { status: 500 }
    )
  }
}
