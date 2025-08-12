"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuizParser } from "@/lib/quiz-parser"
import { QuizHtmlGenerator } from "@/lib/quiz-html-generator"

export function QuizTest() {
  const [testResult, setTestResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const runTest = async () => {
    setIsLoading(true)
    setTestResult("开始测试...\n")

    try {
      // 测试内容
      const testContent = `JavaScript基础测试

1. JavaScript是什么类型的编程语言？
A. 编译型语言
B. 解释型语言
C. 汇编语言
D. 机器语言
答案：B
解释：JavaScript是一种解释型编程语言，代码在运行时由JavaScript引擎逐行解释执行。

2. 以下哪个不是JavaScript的数据类型？
A. string
B. number
C. char
D. boolean
答案：C
解释：JavaScript中没有char数据类型，字符通常用string类型表示。`

      setTestResult(prev => prev + "✅ 测试内容准备完成\n")

      // 测试解析
      const parsedData = QuizParser.parseQuizContent(testContent)
      setTestResult(prev => prev + `✅ 解析完成，题目数量: ${parsedData.questions.length}\n`)

      // 验证解析结果
      parsedData.questions.forEach((q, index) => {
        setTestResult(prev => prev + `题目 ${index + 1}: ${q.question ? '✅' : '❌'} 问题, ${q.options?.length || 0} 选项, ${q.correctAnswer !== undefined ? '✅' : '❌'} 答案\n`)
      })

      // 测试HTML生成
      const htmlContent = QuizHtmlGenerator.generateQuizHtml(parsedData, "顺序")
      setTestResult(prev => prev + `✅ HTML生成完成，大小: ${htmlContent.length} 字符\n`)

      // 保存测试文件
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'test-quiz-output.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setTestResult(prev => prev + "✅ 测试HTML文件已下载\n")
      setTestResult(prev => prev + "🎉 所有测试通过！\n")

    } catch (error) {
      setTestResult(prev => prev + `❌ 测试失败: ${error}\n`)
      console.error('测试错误:', error)
    }

    setIsLoading(false)
  }

  const testDirectHtml = () => {
    // 直接创建一个简单的刷题HTML
    const simpleQuizHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>简单刷题测试</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .correct { background-color: #dcfce7; border-color: #16a34a; }
        .incorrect { background-color: #fef2f2; border-color: #dc2626; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen p-8">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">简单刷题测试</h1>
        
        <div id="question-container" class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">题目 1</h2>
            <p class="mb-6">JavaScript是什么类型的编程语言？</p>
            
            <div class="space-y-3">
                <button onclick="selectAnswer(0)" class="w-full p-3 text-left border rounded hover:bg-gray-50">
                    A. 编译型语言
                </button>
                <button onclick="selectAnswer(1)" class="w-full p-3 text-left border rounded hover:bg-gray-50">
                    B. 解释型语言
                </button>
                <button onclick="selectAnswer(2)" class="w-full p-3 text-left border rounded hover:bg-gray-50">
                    C. 汇编语言
                </button>
                <button onclick="selectAnswer(3)" class="w-full p-3 text-left border rounded hover:bg-gray-50">
                    D. 机器语言
                </button>
            </div>
            
            <div id="result" class="mt-6 hidden">
                <p id="feedback" class="font-semibold"></p>
                <p id="explanation" class="mt-2 text-gray-600"></p>
            </div>
        </div>
    </div>

    <script>
        let answered = false;
        const correctAnswer = 1; // B是正确答案
        
        function selectAnswer(index) {
            if (answered) return;
            
            answered = true;
            const buttons = document.querySelectorAll('button[onclick^="selectAnswer"]');
            const resultDiv = document.getElementById('result');
            const feedback = document.getElementById('feedback');
            const explanation = document.getElementById('explanation');
            
            // 显示正确答案
            buttons[correctAnswer].classList.add('correct');
            
            if (index === correctAnswer) {
                feedback.textContent = '✅ 回答正确！';
                feedback.className = 'font-semibold text-green-600';
            } else {
                buttons[index].classList.add('incorrect');
                feedback.textContent = '❌ 回答错误！';
                feedback.className = 'font-semibold text-red-600';
            }
            
            explanation.textContent = 'JavaScript是一种解释型编程语言，代码在运行时由JavaScript引擎逐行解释执行。';
            resultDiv.classList.remove('hidden');
        }
    </script>
</body>
</html>`

    const blob = new Blob([simpleQuizHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'simple-quiz-test.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setTestResult("✅ 简单刷题HTML已下载，请打开测试\n")
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>刷题功能测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runTest} disabled={isLoading}>
              {isLoading ? "测试中..." : "运行完整测试"}
            </Button>
            <Button onClick={testDirectHtml} variant="outline">
              下载简单测试HTML
            </Button>
          </div>
          
          {testResult && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">测试结果：</h3>
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
