import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { AiService } from '../../../server/services/aiService'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 检查数据库连接
    let dbStatus = 'unknown'
    let dbLatency = 0
    
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatency = Date.now() - dbStart
      dbStatus = 'healthy'
    } catch (error) {
      console.error('Database health check failed:', error)
      dbStatus = 'unhealthy'
    }

    // 检查 AI 服务
    let aiStatus = 'unknown'
    let aiLatency = 0
    
    try {
      const aiStart = Date.now()
      const aiService = AiService.getInstance()
      const isHealthy = await aiService.healthCheck({
        provider: process.env.AI_PROVIDER || 'gemini',
        apiKey: process.env.AI_API_KEY || '',
        model: process.env.AI_MODEL
      })
      aiLatency = Date.now() - aiStart
      aiStatus = isHealthy ? 'healthy' : 'unhealthy'
    } catch (error) {
      console.error('AI service health check failed:', error)
      aiStatus = 'unhealthy'
    }

    const totalLatency = Date.now() - startTime
    const overallStatus = dbStatus === 'healthy' && aiStatus === 'healthy' ? 'healthy' : 'degraded'

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`
        },
        ai: {
          status: aiStatus,
          provider: process.env.AI_PROVIDER || 'gemini',
          model: process.env.AI_MODEL || 'gemini-1.5-flash-8b',
          latency: `${aiLatency}ms`
        }
      },
      performance: {
        totalLatency: `${totalLatency}ms`,
        uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown'
      }
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503

    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error',
      performance: {
        totalLatency: `${Date.now() - startTime}ms`
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}
