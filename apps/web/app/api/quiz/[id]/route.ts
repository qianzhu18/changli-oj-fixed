import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, message: '题库ID是必需的' },
        { status: 400 }
      )
    }

    // 暂时返回模拟数据
    const mockQuiz = {
      id: id,
      title: "示例题库",
      description: "这是一个示例题库",
      orderMode: "顺序",
      status: "completed",
      html: "<html><body><h1>示例题库</h1></body></html>",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: "user_demo_id",
        email: "demo@example.com",
        name: "演示用户"
      }
    }

    return NextResponse.json({
      success: true,
      data: mockQuiz
    })

  } catch (error: any) {
    console.error('Get quiz error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || '获取题库失败'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, message: '题库ID是必需的' },
        { status: 400 }
      )
    }

    // 暂时模拟删除成功
    console.log('Quiz deleted (mock):', id)

    return NextResponse.json({
      success: true,
      message: '题库删除成功'
    })

  } catch (error: any) {
    console.error('Delete quiz error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || '删除题库失败'
      },
      { status: 500 }
    )
  }
}
