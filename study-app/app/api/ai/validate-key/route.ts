import { NextRequest, NextResponse } from 'next/server'
import { AiService } from '../../../../server/services/aiService'

async function validateApiKey(apiKey: string, provider: string = 'gemini', model?: string) {
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
  const provider = searchParams.get('provider') || 'gemini'
  const model = searchParams.get('model')

  return validateApiKey(apiKey || '', provider, model || undefined)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, provider = 'gemini', model } = body

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
