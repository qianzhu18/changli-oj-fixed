import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '用户ID是必需的' },
        { status: 400 }
      )
    }

    // 暂时返回模拟数据
    // 在实际应用中，这里应该从数据库获取
    const mockQuizzes = [
      {
        id: "quiz_1",
        title: "JavaScript基础测试",
        description: "涵盖JavaScript基本语法、变量、函数等核心概念",
        orderMode: "顺序",
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "quiz_2",
        title: "React组件开发",
        description: "React组件生命周期、状态管理、事件处理等",
        orderMode: "随机",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]

    console.log('Quiz list requested for user:', userId)

    return NextResponse.json({
      success: true,
      data: mockQuizzes
    })

  } catch (error: any) {
    console.error('Get quiz list error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || '获取题库列表失败'
      },
      { status: 500 }
    )
  }
}
