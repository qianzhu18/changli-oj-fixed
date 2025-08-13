import { NextRequest, NextResponse } from 'next/server'
import { AiService } from '../../../../server/services/aiService'

async function validateApiKey(apiKey: string, provider: string = 'twoapi', model?: string) {
  // TwoAPI不需要API密钥验证，直接返回成功
  if (provider === 'twoapi') {
    return NextResponse.json({
      valid: true,
      provider,
      quota: {
        used: 0,
        limit: 10000,
        remaining: 10000
      },
      reason: 'TwoAPI service is available'
    })
  }

  if (!apiKey) {
    return NextResponse.json(
      { valid: false, reason: 'API Key is required' },
      { status: 400 }
    )
  }

  try {
    const aiService = AiService.getInstance()
    const result = await aiService.validateApiKey({
      provider,
      apiKey,
      model: model || undefined
    })

    return NextResponse.json({
      valid: result.valid,
      provider,
      quota: result.quota,
      reason: result.reason
    })

  } catch (error: any) {
    console.error('API key validation error:', error)
    return NextResponse.json(
      {
        valid: false,
        reason: error.message || 'Validation failed'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const apiKey = searchParams.get('apiKey')
  const provider = searchParams.get('provider') || 'twoapi'
  const model = searchParams.get('model')

  return validateApiKey(apiKey || '', provider, model || undefined)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, provider = 'twoapi', model } = body

    return validateApiKey(apiKey, provider, model)

  } catch (error: any) {
    console.error('POST API key validation error:', error)
    return NextResponse.json(
      {
        valid: false,
        reason: 'Invalid request body'
      },
      { status: 400 }
    )
  }
}
