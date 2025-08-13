"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuizPreview } from "@/components/quiz-preview"

export function SimpleQuizTest() {
  const [showQuiz, setShowQuiz] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState("")

  const createTestQuizHtml = () => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试题库</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h1 class="text-2xl font-bold text-center mb-6 text-blue-600">📚 测试题库</h1>

            <!-- 题目显示区域 -->
            <div id="quiz-container" class="mb-6">
                <div id="question-0" class="question">
                    <h2 class="text-xl font-semibold mb-4">1. 这是一个测试题目，请选择正确答案？</h2>
                    <div class="space-y-2">
                        <div class="option p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                             onclick="selectOption(0, 0, false)">
                            A. 错误选项1
                        </div>
                        <div class="option p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                             data-correct="true"
                             onclick="selectOption(0, 1, true)">
                            B. 正确答案
                        </div>
                        <div class="option p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                             onclick="selectOption(0, 2, false)">
                            C. 错误选项2
                        </div>
                    </div>
                </div>

                <div id="question-1" class="question" style="display: none">
                    <h2 class="text-xl font-semibold mb-4">2. 第二个测试题目？</h2>
                    <div class="space-y-2">
                        <div class="option p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                             data-correct="true"
                             onclick="selectOption(1, 0, true)">
                            A. 这是正确答案
                        </div>
                        <div class="option p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                             onclick="selectOption(1, 1, false)">
                            B. 错误选项
                        </div>
                        <div class="option p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                             onclick="selectOption(1, 2, false)">
                            C. 另一个错误选项
                        </div>
                    </div>
                </div>
            </div>

            <!-- 导航区域 -->
            <div class="flex justify-between items-center mt-6 pt-4 border-t">
                <button id="prev-btn" onclick="previousQuestion()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50" disabled>
                    ← 上一题
                </button>
                <span id="progress" class="text-gray-600">第 1 题 / 共 2 题</span>
                <button id="next-btn" onclick="nextQuestion()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    下一题 →
                </button>
            </div>

            <!-- 成绩显示 -->
            <div id="score" class="text-center mt-4 text-lg font-semibold text-green-600"></div>
            
            <!-- 完成练习按钮 -->
            <div class="text-center mt-4">
                <button id="finish-btn" onclick="finishQuiz()" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                    完成练习
                </button>
            </div>
        </div>
    </div>

    <script>
        let currentQuestion = 0;
        let score = 0;
        let answered = [];
        const totalQuestions = 2;

        function selectOption(questionIndex, optionIndex, isCorrect) {
            if (answered[questionIndex]) return;

            answered[questionIndex] = true;
            const options = document.querySelectorAll(\`#question-\${questionIndex} .option\`);

            options.forEach((option, index) => {
                option.classList.remove('hover:bg-gray-100');
                option.style.pointerEvents = 'none';
                if (index === optionIndex) {
                    option.classList.add(isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500');
                    option.innerHTML += isCorrect ? ' ✓' : ' ✗';
                }
                if (option.dataset.correct === 'true') {
                    option.classList.add('bg-green-100 border-green-500');
                    if (index !== optionIndex) option.innerHTML += ' ✓ (正确答案)';
                }
            });

            if (isCorrect) {
                score++;
                document.getElementById('score').textContent = \`已答对: \${score} / \${totalQuestions}\`;
            }
        }

        function showQuestion(index) {
            document.querySelectorAll('.question').forEach(q => q.style.display = 'none');
            document.getElementById(\`question-\${index}\`).style.display = 'block';

            document.getElementById('prev-btn').disabled = index === 0;
            document.getElementById('next-btn').disabled = index === totalQuestions - 1;
            document.getElementById('progress').textContent = \`第 \${index + 1} 题 / 共 \${totalQuestions} 题\`;
        }

        function previousQuestion() {
            if (currentQuestion > 0) {
                currentQuestion--;
                showQuestion(currentQuestion);
            }
        }

        function nextQuestion() {
            if (currentQuestion < totalQuestions - 1) {
                currentQuestion++;
                showQuestion(currentQuestion);
            }
        }

        function finishQuiz() {
            const percentage = Math.round((score / totalQuestions) * 100);
            alert(\`练习完成！\\n\\n答对题数: \${score} / \${totalQuestions}\\n正确率: \${percentage}%\`);
        }

        // 初始化
        showQuestion(0);
        document.getElementById('score').textContent = \`已答对: 0 / \${totalQuestions}\`;
    </script>
</body>
</html>`
  }

  const handleGenerateTestQuiz = () => {
    const html = createTestQuizHtml()
    setGeneratedHtml(html)
    setShowQuiz(true)
  }

  const downloadQuiz = () => {
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-quiz.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧控制面板 */}
          <Card>
            <CardHeader>
              <CardTitle>测试交互式题库功能</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                点击下面的按钮生成一个测试题库，验证交互式刷题功能是否正常工作。
              </p>
              
              <Button 
                onClick={handleGenerateTestQuiz}
                className="w-full"
              >
                生成测试题库
              </Button>

              {generatedHtml && (
                <Button 
                  onClick={downloadQuiz}
                  variant="outline"
                  className="w-full"
                >
                  下载HTML文件
                </Button>
              )}

              <div className="text-sm text-gray-500">
                <h4 className="font-medium mb-2">测试功能：</h4>
                <ul className="space-y-1">
                  <li>• 点击选项查看答题反馈</li>
                  <li>• 正确答案显示绿色✓</li>
                  <li>• 错误答案显示红色✗</li>
                  <li>• 使用导航按钮切换题目</li>
                  <li>• 查看答题进度和得分</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 右侧预览区域 */}
          {showQuiz && generatedHtml && (
            <div className="lg:col-span-1">
              <QuizPreview
                htmlContent={generatedHtml}
                title="测试题库"
                onDownload={downloadQuiz}
                onClose={() => setShowQuiz(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
