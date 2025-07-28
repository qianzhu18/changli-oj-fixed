import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../../lib/prisma'

interface JWTPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

export async function GET(request: NextRequest) {
  try {
    // 获取 Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀

    // 验证 JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.json(
        { success: false, message: '服务器配置错误' },
        { status: 500 }
      )
    }

    let decoded: JWTPayload
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return NextResponse.json(
          { success: false, message: '认证令牌已过期' },
          { status: 401 }
        )
      } else if (jwtError.name === 'JsonWebTokenError') {
        return NextResponse.json(
          { success: false, message: '无效的认证令牌' },
          { status: 401 }
        )
      } else {
        throw jwtError
      }
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否激活
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: '账户已被禁用' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user
      }
    })

  } catch (error: any) {
    console.error('Get user info error:', error)
    return NextResponse.json(
      {
        success: false,
        message: '获取用户信息失败'
      },
      { status: 500 }
    )
  }
}
