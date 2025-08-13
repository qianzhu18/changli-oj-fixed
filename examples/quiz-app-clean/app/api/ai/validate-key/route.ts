import { NextRequest, NextResponse } from 'next/server'
import { AiService } from '../../../../server/services/aiService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('apiKey')
    const provider = searchParams.get('provider') || 'gemini'
    const model = searchParams.get('model')

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, reason: 'API Key is required' },
        { status: 400 }
      )
    }

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
