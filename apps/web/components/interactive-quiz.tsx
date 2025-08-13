"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Trophy,
  Target,
  Clock
} from "lucide-react"
import { ParsedQuestion } from "@/lib/quiz-parser"

interface InteractiveQuizProps {
  questions: ParsedQuestion[]
  title: string
  onComplete?: (score: number, totalQuestions: number) => void
  onExit?: () => void
}

interface UserAnswer {
  questionId: string
  selectedOption?: number
  textAnswer?: string
  isCorrect: boolean
  timeSpent: number
}

export function InteractiveQuiz({ questions, title, onComplete, onExit }: InteractiveQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map())
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [isAnswered, setIsAnswered] = useState(false)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [isCompleted, setIsCompleted] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // 检查当前题目是否已回答
  useEffect(() => {
    const answer = userAnswers.get(currentQuestion?.id)
    if (answer) {
      setIsAnswered(true)
      setSelectedOption(answer.selectedOption ?? null)
      setTextAnswer(answer.textAnswer ?? "")
    } else {
      setIsAnswered(false)
      setSelectedOption(null)
      setTextAnswer("")
    }
    setQuestionStartTime(Date.now())
  }, [currentQuestionIndex, currentQuestion?.id, userAnswers])

  // 提交答案
  const submitAnswer = () => {
    if (!currentQuestion) return

    const timeSpent = Date.now() - questionStartTime
    let isCorrect = false

    if (currentQuestion.type === 'multiple-choice') {
      isCorrect = selectedOption === currentQuestion.correctAnswer
    } else {
      // 填空题：简单的文本匹配
      const correctText = currentQuestion.explanation || ""
      isCorrect = textAnswer.trim().toLowerCase() === correctText.toLowerCase()
    }

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOption: currentQuestion.type === 'multiple-choice' ? selectedOption ?? undefined : undefined,
      textAnswer: currentQuestion.type === 'fill-blank' ? textAnswer : undefined,
      isCorrect,
      timeSpent
    }

    setUserAnswers(prev => new Map(prev.set(currentQuestion.id, answer)))
    setIsAnswered(true)
    setShowResult(true)

    // 自动跳转到下一题（延迟1.5秒）
    setTimeout(() => {
      setShowResult(false)
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        completeQuiz()
      }
    }, 1500)
  }

  // 完成测试
  const completeQuiz = () => {
    const correctAnswers = Array.from(userAnswers.values()).filter(answer => answer.isCorrect).length
    setIsCompleted(true)
    onComplete?.(correctAnswers, questions.length)
  }

  // 重新开始
  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setUserAnswers(new Map())
    setSelectedOption(null)
    setTextAnswer("")
    setShowResult(false)
    setIsAnswered(false)
    setIsCompleted(false)
    setStartTime(Date.now())
    setQuestionStartTime(Date.now())
  }

  // 跳转到指定题目
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
    setShowResult(false)
  }

  // 获取题目状态样式
  const getQuestionStatus = (index: number) => {
    const question = questions[index]
    const answer = userAnswers.get(question.id)
    
    if (index === currentQuestionIndex) {
      return "bg-blue-500 text-white"
    } else if (answer) {
      return answer.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
    } else {
      return "bg-gray-200 text-gray-700 hover:bg-gray-300"
    }
  }

  // 计算统计信息
  const getStats = () => {
    const answered = userAnswers.size
    const correct = Array.from(userAnswers.values()).filter(a => a.isCorrect).length
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
    const totalTime = Math.round((Date.now() - startTime) / 1000)
    
    return { answered, correct, accuracy, totalTime }
  }

  if (isCompleted) {
    const stats = getStats()
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">测试完成！</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.correct}</div>
                <div className="text-sm text-blue-600">答对题数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.accuracy}%</div>
                <div className="text-sm text-green-600">正确率</div>
              </div>
            </div>
            
            <div className="text-gray-600">
              <p>总题数：{questions.length} 题</p>
              <p>用时：{Math.floor(stats.totalTime / 60)}分{stats.totalTime % 60}秒</p>
            </div>

            <div className="flex space-x-4">
              <Button onClick={restartQuiz} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                重新开始
              </Button>
              <Button onClick={onExit} variant="outline" className="flex-1">
                退出测试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentQuestion) {
    return <div>加载中...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部信息 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Badge variant="outline">
            {currentQuestionIndex + 1} / {questions.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 题目卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>题目 {currentQuestionIndex + 1}</span>
            <Badge variant={currentQuestion.type === 'multiple-choice' ? 'default' : 'secondary'}>
              {currentQuestion.type === 'multiple-choice' ? '选择题' : '填空题'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg leading-relaxed">{currentQuestion.question}</p>

          {/* 选择题选项 */}
          {currentQuestion.type === 'multiple-choice' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                let buttonClass = "w-full text-left p-4 border rounded-lg transition-colors "
                
                if (showResult) {
                  if (index === currentQuestion.correctAnswer) {
                    buttonClass += "bg-green-100 border-green-500 text-green-800"
                  } else if (index === selectedOption && index !== currentQuestion.correctAnswer) {
                    buttonClass += "bg-red-100 border-red-500 text-red-800"
                  } else {
                    buttonClass += "bg-gray-50 border-gray-200"
                  }
                } else if (selectedOption === index) {
                  buttonClass += "bg-blue-100 border-blue-500"
                } else {
                  buttonClass += "hover:bg-gray-50 border-gray-200"
                }

                return (
                  <button
                    key={index}
                    onClick={() => !isAnswered && setSelectedOption(index)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center">
                      <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                      {showResult && index === currentQuestion.correctAnswer && (
                        <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                      )}
                      {showResult && index === selectedOption && index !== currentQuestion.correctAnswer && (
                        <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* 填空题输入 */}
          {currentQuestion.type === 'fill-blank' && (
            <div className="space-y-3">
              <Input
                value={textAnswer}
                onChange={(e) => !isAnswered && setTextAnswer(e.target.value)}
                placeholder="请输入答案..."
                disabled={isAnswered}
                className="text-lg p-4"
              />
              {showResult && (
                <div className={`p-3 rounded-lg ${
                  userAnswers.get(currentQuestion.id)?.isCorrect 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  正确答案：{currentQuestion.explanation || "答案未提供"}
                </div>
              )}
            </div>
          )}

          {/* 提交按钮 */}
          {!isAnswered && (
            <Button 
              onClick={submitAnswer}
              disabled={
                (currentQuestion.type === 'multiple-choice' && selectedOption === null) ||
                (currentQuestion.type === 'fill-blank' && textAnswer.trim() === "")
              }
              className="w-full"
            >
              提交答案
            </Button>
          )}

          {/* 结果显示 */}
          {showResult && (
            <div className={`p-4 rounded-lg text-center ${
              userAnswers.get(currentQuestion.id)?.isCorrect 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className="flex items-center justify-center mb-2">
                {userAnswers.get(currentQuestion.id)?.isCorrect ? (
                  <CheckCircle className="h-6 w-6 mr-2" />
                ) : (
                  <XCircle className="h-6 w-6 mr-2" />
                )}
                <span className="font-medium">
                  {userAnswers.get(currentQuestion.id)?.isCorrect ? '回答正确！' : '回答错误'}
                </span>
              </div>
              {currentQuestion.explanation && (
                <p className="text-sm">{currentQuestion.explanation}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between mb-6">
        <Button
          onClick={() => goToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          上一题
        </Button>
        
        <Button
          onClick={() => {
            if (currentQuestionIndex === questions.length - 1) {
              completeQuiz()
            } else {
              goToQuestion(currentQuestionIndex + 1)
            }
          }}
          disabled={!isAnswered}
        >
          {currentQuestionIndex === questions.length - 1 ? '完成测试' : '下一题'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* 题目导航栏 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">题目导航</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToQuestion(index)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${getQuestionStatus(index)}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
