"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuizPreview } from "@/components/quiz-preview"
import { FileParser } from "@/lib/file-parser"
import { QuizParser, type ParsedQuestion, type QuizData } from "@/lib/quiz-parser"
import { QuizHtmlGenerator } from "@/lib/quiz-html-generator"
import { BatchProcessingInterface } from "./batch-processing-interface"
import {
  Upload, FileText, Brain, CheckCircle, AlertCircle,
  X, Clock, Sparkles, Target, ArrowRight,
  FileType, RotateCcw, Zap
} from "lucide-react"

export function SmartParsingPageSimple() {
  // 基础状态
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [userChoice, setUserChoice] = useState<"顺序" | "随机" | "">("")
  const [showPreview, setShowPreview] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState("")
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [quizTitle, setQuizTitle] = useState("")
  const [quizDescription, setQuizDescription] = useState("")
  const [showTitleDialog, setShowTitleDialog] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // 刷题相关状态
  const [showQuizInterface, setShowQuizInterface] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const maxFileSize = 10 * 1024 * 1024 // 10MB

  useEffect(() => {
    setMounted(true)
  }, [])

  // 支持的文件格式
  const supportedFormats = [
    { ext: 'docx', icon: FileText },
    { ext: 'doc', icon: FileText },
    { ext: 'xlsx', icon: FileText },
    { ext: 'xls', icon: FileText },
    { ext: 'txt', icon: FileText },
    { ext: 'md', icon: FileText },
    { ext: 'pdf', icon: FileText }
  ]

  // 解析题库内容并生成题目 - 增强版
  const parseQuizContent = (content: string): QuizData => {
    try {
      console.log('🔍 开始解析内容，长度:', content.length)
      console.log('📝 内容预览:', content.substring(0, 300) + '...')

      // 先尝试手动解析（更可靠）
      const manualParsed = parseContentManually(content)
      if (manualParsed && manualParsed.questions.length > 0) {
        console.log('✅ 手动解析成功:', manualParsed.questions.length, '题')
        return manualParsed
      }

      // 使用QuizParser解析内容
      const parsedData = QuizParser.parseQuizContent(content)
      console.log('🤖 QuizParser解析结果:', parsedData)

      // 验证解析结果
      if (!parsedData || !parsedData.questions || parsedData.questions.length === 0) {
        console.warn('⚠️ 未解析到有效题目，使用备用方案')
        return createFallbackQuizData(content)
      }

      // 验证每个题目的完整性
      const validQuestions = parsedData.questions.filter(q =>
        q.question && q.question.trim().length > 0 &&
        q.options && q.options.length > 0
      )

      if (validQuestions.length === 0) {
        console.warn('⚠️ 没有有效的题目，使用备用方案')
        return createFallbackQuizData(content)
      }

      console.log(`✅ 成功解析 ${validQuestions.length} 个有效题目`)
      return {
        ...parsedData,
        questions: validQuestions,
        totalQuestions: validQuestions.length
      }
    } catch (error) {
      console.error('❌ 解析失败:', error)
      setError(`解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return createFallbackQuizData(content)
    }
  }

  // 手动解析内容（更可靠的解析方法）
  const parseContentManually = (content: string): QuizData | null => {
    try {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      const questions: ParsedQuestion[] = []
      let currentQuestion: any = {}
      let questionIndex = 0
      let title = "智能题库"

      // 提取标题（第一行如果不是题目）
      if (lines.length > 0 && !lines[0].match(/^\d+\./)) {
        title = lines[0]
        lines.shift()
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // 检测题目（以数字开头，以问号结尾）
        if (/^\d+\.\s*.*[？?]/.test(line)) {
          // 保存上一题
          if (currentQuestion.question) {
            finalizeCurrentQuestion(currentQuestion, questions, questionIndex)
            questionIndex++
          }

          // 开始新题
          currentQuestion = {
            id: `q_${questionIndex + 1}`,
            question: line,
            options: [],
            correctAnswer: 0,
            type: 'multiple-choice',
            explanation: ''
          }
        }
        // 检测选项（A. B. C. D.）
        else if (/^[A-D][.、]\s*.+/.test(line) && currentQuestion.question) {
          const option = line.replace(/^[A-D][.、]\s*/, '')
          currentQuestion.options.push(option)
        }
        // 检测答案
        else if (/^答案[：:]\s*[A-D]/.test(line) && currentQuestion.question) {
          const answerMatch = line.match(/[A-D]/)
          if (answerMatch) {
            currentQuestion.correctAnswer = answerMatch[0].charCodeAt(0) - 'A'.charCodeAt(0)
          }
        }
        // 检测解释
        else if (/^(解释|说明|解析)[：:]\s*.+/.test(line) && currentQuestion.question) {
          currentQuestion.explanation = line.replace(/^(解释|说明|解析)[：:]\s*/, '')
        }
      }

      // 保存最后一题
      if (currentQuestion.question) {
        finalizeCurrentQuestion(currentQuestion, questions, questionIndex)
      }

      console.log('🔧 手动解析结果:', questions.length, '题')

      if (questions.length > 0) {
        return {
          title,
          questions,
          totalQuestions: questions.length
        }
      }

      return null
    } catch (error) {
      console.error('手动解析失败:', error)
      return null
    }
  }

  // 完善当前题目
  const finalizeCurrentQuestion = (currentQuestion: any, questions: ParsedQuestion[], index: number) => {
    // 确保有选项
    if (!currentQuestion.options || currentQuestion.options.length === 0) {
      currentQuestion.options = ['选项A', '选项B', '选项C', '选项D']
    }

    // 确保有4个选项
    while (currentQuestion.options.length < 4) {
      currentQuestion.options.push(`选项${String.fromCharCode(65 + currentQuestion.options.length)}`)
    }

    // 确保有正确答案
    if (currentQuestion.correctAnswer === undefined) {
      currentQuestion.correctAnswer = 0
    }

    // 确保有解释
    if (!currentQuestion.explanation) {
      currentQuestion.explanation = '暂无解释'
    }

    questions.push({
      id: currentQuestion.id || `q_${index + 1}`,
      question: currentQuestion.question || `题目 ${index + 1}`,
      options: currentQuestion.options.slice(0, 4),
      correctAnswer: currentQuestion.correctAnswer,
      type: currentQuestion.type || 'multiple-choice',
      explanation: currentQuestion.explanation
    })
  }

  // 创建备用题库数据
  const createFallbackQuizData = (content: string): QuizData => {
    const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '')

    const fallbackQuestion: ParsedQuestion = {
      id: "q_1",
      question: `基于您上传的内容创建的示例题目：\n\n内容预览：${contentPreview}\n\n请选择最合适的描述：`,
      options: [
        "内容已成功处理，可以生成题库",
        "内容格式需要调整",
        "需要更多信息才能处理",
        "内容包含有效的学习材料"
      ],
      correctAnswer: 0,
      type: "multiple-choice",
      explanation: "这是基于您的内容生成的示例题目。实际使用时，系统会根据内容自动生成相关题目。"
    }

    return {
      title: "智能解析题库",
      questions: [fallbackQuestion],
      totalQuestions: 1
    }
  }

  // 文件上传处理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > maxFileSize) {
      setError(`文件大小超过限制（${maxFileSize / 1024 / 1024}MB）`)
      return
    }

    setUploadedFile(file)
    setError("")
    setIsParsingFile(true)
    setLoadingMessage("正在解析文件...")

    try {
      const extractedContent = await FileParser.parseFile(file)
      setContent(extractedContent)
      setIsParsingFile(false)
      setLoadingMessage("")
    } catch (error) {
      console.error('文件解析失败:', error)
      setError('文件解析失败，请检查文件格式是否正确')
      setIsParsingFile(false)
      setLoadingMessage("")
    }
  }

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (fileInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(file)
        fileInputRef.current.files = dt.files
        handleFileUpload({ target: { files: dt.files } } as any)
      }
    }
  }

  // 开始解析 - 调用API获取第一步提示
  const handleStartParsing = async () => {
    if (!content.trim() && !uploadedFile) {
      setError("请先上传文件或输入内容")
      return
    }

    setIsLoading(true)
    setLoadingMessage("正在分析内容...")
    setError("")

    try {
      // 第一次调用API，不传orderMode，获取提示
      console.log('🚀 开始第一步API调用...')
      const response = await fetch('/api/ai/parse-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          aiConfig: {
            provider: 'twoapi',
            model: 'gemini-2.5-pro-preview-06-05'
          }
          // 故意不传 orderMode，触发第一步提示
        })
      })

      console.log('📡 API响应状态:', response.status, response.ok)
      const result = await response.json()
      console.log('📦 API响应数据:', result)

      if (!response.ok && result.step === 'step1') {
        // 收到第一步提示，显示选择界面
        console.log('✅ 收到第一步提示，切换到选择界面')
        setIsLoading(false)
        setCurrentStep(2)
        return
      }

      // 如果直接成功了（不应该发生），也进入第二步
      console.log('⚠️ 直接成功，进入第二步')
      setIsLoading(false)
      setCurrentStep(2)

    } catch (error) {
      console.error('❌ 获取提示失败:', error)
      setError('连接失败，请重试')
      setIsLoading(false)
    }
  }

  // 选择出题方式 - 调用API
  const handleChoiceSelection = async (choice: "顺序" | "随机") => {
    setUserChoice(choice)
    setIsLoading(true)
    setLoadingMessage("正在解析题库内容...")
    setLoadingProgress(0)

    try {
      // 第二次调用API，传递用户选择的orderMode
      const response = await fetch('/api/ai/parse-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          orderMode: choice, // 传递用户选择
          aiConfig: {
            provider: 'twoapi', // 使用twoapi provider
            model: 'gemini-2.5-pro-preview-06-05'
          }
        })
      })

      setLoadingProgress(50)
      setLoadingMessage("正在生成交互式题库...")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '生成失败')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '生成失败')
      }

      setLoadingProgress(90)
      setLoadingMessage("正在准备下载...")

      // 获取生成的HTML
      const html = result.data.html
      setGeneratedHtml(html)

      // 解析原始内容，填充可在线刷题的题目数据
      const parsed = parseQuizContent(content)
      setQuizData(parsed)
      setParsedQuestions(parsed.questions)
      setQuizTitle(parsed.title || quizTitle)

      setLoadingProgress(100)
      setIsLoading(false)
      setLoadingMessage("")
      setLoadingProgress(0)

      // 自动下载生成的HTML文件
      setTimeout(() => {
        autoDownloadHtml(html, (parsed.title || '智能题库'))
      }, 500)

    } catch (error) {
      console.error('题库生成失败:', error)
      setError(error instanceof Error ? error.message : '题库生成失败，请检查内容格式或重试')
      setIsLoading(false)
      setLoadingMessage("")
      setLoadingProgress(0)
    }
  }

  // 自动下载HTML文件
  const autoDownloadHtml = (htmlContent: string, title: string) => {
    try {
      console.log('🎯 开始自动下载HTML文件...')

      // 生成文件名
      const fileName = `${title || '智能刷题'}-${new Date().toISOString().slice(0, 10)}.html`

      // 创建下载
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✅ HTML文件下载成功:', fileName)

      // 显示成功消息
      setError('')
      setCurrentStep(4) // 显示完成状态

      // 3秒后显示选项
      setTimeout(() => {
        setCurrentStep(5) // 显示后续选项
      }, 3000)

    } catch (error) {
      console.error('❌ HTML下载失败:', error)
      setError('HTML文件生成失败，请重试')
    }
  }

  // 手动下载HTML
  const downloadQuizHtml = () => {
    if (!generatedHtml) return

    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quizTitle || '智能题库'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 刷题相关函数
  const startQuizInterface = () => {
    if (quizData && quizData.questions.length > 0) {
      // 根据用户选择排序题目
      let questions = [...quizData.questions]
      if (userChoice === "随机") {
        questions = questions.sort(() => Math.random() - 0.5)
      }

      setQuizData({ ...quizData, questions })
      setUserAnswers(new Array(questions.length).fill(null))
      setCurrentQuestionIndex(0)
      setCorrectCount(0)
      setIsAnswered(false)
      setShowExplanation(false)
      setQuizCompleted(false)
      setShowQuizInterface(true)
      setCurrentStep(6) // 刷题界面步骤
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered || !quizData) return

    const newAnswers = [...userAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setUserAnswers(newAnswers)
    setIsAnswered(true)

    // 检查答案是否正确
    const currentQuestion = quizData.questions[currentQuestionIndex]
    if (answerIndex === currentQuestion.correctAnswer) {
      setCorrectCount(prev => prev + 1)
    }

    // 显示解释
    setShowExplanation(true)
  }

  const nextQuestion = () => {
    if (!quizData) return

    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setIsAnswered(false)
      setShowExplanation(false)
    } else {
      setQuizCompleted(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setUserAnswers(new Array(quizData?.questions.length || 0).fill(null))
    setCorrectCount(0)
    setIsAnswered(false)
    setShowExplanation(false)
    setQuizCompleted(false)
  }

  const backToParsingPage = () => {
    setShowQuizInterface(false)
    setCurrentStep(5) // 返回到选项页面
  }

  // 保存题库
  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      setError("请输入题库标题")
      return
    }

    setIsSaving(true)
    try {
      // 这里可以添加保存到数据库的逻辑
      console.log("保存题库:", { title: quizTitle, description: quizDescription, questions: parsedQuestions })
      setShowTitleDialog(false)
      // 可以显示成功消息
    } catch (error) {
      console.error("保存失败:", error)
      setError("保存失败，请重试")
    } finally {
      setIsSaving(false)
    }
  }

  // 保存标题并生成HTML
  const handleSaveTitleAndGenerate = () => {
    if (!quizTitle.trim()) {
      setError("请输入题库标题")
      return
    }

    setShowTitleDialog(false)
    downloadQuizHtml()
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 重置
  const resetParsing = () => {
    setCurrentStep(1)
    setUserChoice("")
    setShowPreview(false)
    setGeneratedHtml("")
    setParsedQuestions([])
    setQuizData(null)
    setError("")
    setIsLoading(false)
    setLoadingMessage("")
    setLoadingProgress(0)
    // 重置刷题相关状态
    setShowQuizInterface(false)
    setCurrentQuestionIndex(0)
    setUserAnswers([])
    setCorrectCount(0)
    setIsAnswered(false)
    setShowExplanation(false)
    setQuizCompleted(false)
  }

  // 步骤图标
  const getStepIcon = (step: number) => {
    if (currentStep > step) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (currentStep === step) {
      return <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{step}</div>
    } else {
      return <div className="h-5 w-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold">{step}</div>
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-full mx-auto">
        {/* 页面标题和进度 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Brain className="h-10 w-10 mr-4 text-blue-600" />
                智能生成您的专属题库
              </h1>
              <p className="text-gray-600 text-lg">
                上传您的题库文件或直接输入内容，AI 将智能解析并生成交互式答题界面
              </p>
            </div>
            
            {/* 步骤指示器 */}
            <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-2">
                {getStepIcon(1)}
                <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                  上传内容
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex items-center space-x-2">
                {getStepIcon(2)}
                <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                  选择模式
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex items-center space-x-2">
                {getStepIcon(3)}
                <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                  生成题库
                </span>
              </div>
            </div>
          </div>

          {/* 服务状态提醒 */}
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✨ 智能题库服务已就绪！无需配置API密钥，直接上传文件即可开始生成题库。
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 主要内容区域 - 动态布局 */}
        <div className={`transition-all duration-1000 ease-in-out min-h-[calc(100vh-280px)] ${
          showPreview
            ? 'grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6'
            : 'flex items-center justify-center'
        }`}>
          {/* 上传区域 */}
          <div className={`transition-all duration-1000 ease-in-out ${
            showPreview
              ? 'lg:col-span-2 space-y-6 overflow-y-auto'
              : 'w-full max-w-4xl space-y-6 overflow-y-auto'
          }`}>
            <Card className={`${showPreview ? 'h-full' : 'h-auto'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <Upload className="h-6 w-6 mr-3" />
                  上传题库文件
                  <Badge variant="secondary" className="ml-auto">
                    步骤 {currentStep}/3
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>文件上传</span>
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center space-x-2">
                      <FileType className="h-4 w-4" />
                      <span>文本输入</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="space-y-6 mt-6">
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 md:p-12 text-center transition-all cursor-pointer bg-gradient-to-br ${
                        isDragOver
                          ? 'border-blue-500 bg-blue-100 from-blue-100 to-indigo-100'
                          : 'border-blue-300 from-blue-50 to-indigo-50 hover:border-blue-500 hover:from-blue-100 hover:to-indigo-100'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                          <Upload className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <p className="text-lg md:text-xl font-semibold text-gray-800 mb-2">点击上传或拖拽文件到此处</p>
                          <p className="text-sm md:text-base text-gray-600 mb-4">
                            支持 Word (.docx/.doc)、Excel (.xlsx/.xls)、文本 (.txt/.md)、PDF (.pdf)
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            文件大小限制：{maxFileSize / 1024 / 1024}MB
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 支持格式展示 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                      {supportedFormats.map((format) => {
                        const IconComponent = format.icon
                        return (
                          <div key={format.ext} className="flex items-center space-x-1 md:space-x-2 p-2 md:p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                            <IconComponent className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium text-gray-700 uppercase truncate">{format.ext}</span>
                          </div>
                        )
                      })}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.doc,.xlsx,.xls,.txt,.md,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {uploadedFile && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                              {isParsingFile ? (
                                <div className="animate-spin rounded-full h-7 w-7 border-2 border-white border-t-transparent"></div>
                              ) : (
                                <CheckCircle className="h-7 w-7 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-green-800 text-lg">{uploadedFile.name}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <p className="text-green-600 text-sm">
                                  📁 {formatFileSize(uploadedFile.size)}
                                </p>
                                <p className="text-green-600 text-sm">
                                  📄 {FileParser.getFileType(uploadedFile)}
                                </p>
                                <div className="flex items-center space-x-1">
                                  {isParsingFile ? (
                                    <>
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                      <span className="text-blue-600 text-sm font-medium">正在解析...</span>
                                    </>
                                  ) : content ? (
                                    <>
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-green-600 text-sm font-medium">解析完成</span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                      <span className="text-yellow-600 text-sm font-medium">等待解析</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null)
                              setContent("")
                              setError("")
                              setIsParsingFile(false)
                              setLoadingMessage("")
                              if (fileInputRef.current) {
                                fileInputRef.current.value = ""
                              }
                            }}
                            className="text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full w-8 h-8 p-0"
                            title="移除文件"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* 解析状态信息 */}
                        {(isParsingFile || content) && (
                          <div className="mt-4 pt-4 border-t border-green-200">
                            {isParsingFile && loadingMessage && (
                              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                <span className="text-sm font-medium">{loadingMessage}</span>
                              </div>
                            )}
                            {content && !isParsingFile && (
                              <div className="text-sm text-green-600">
                                ✅ 已成功提取 <span className="font-medium">{content.length}</span> 个字符的内容
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="text" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <Label className="text-lg font-medium">粘贴题库内容</Label>
                      <Textarea
                        placeholder="在此处粘贴您的题库文本内容..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[400px] text-base resize-none"
                      />
                      {content && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">
                            已输入 {content.length} 个字符
                          </span>
                          <Badge variant="secondary">
                            预估 {Math.floor(content.length / 100)} 道题目
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* 步骤1：用户选择 */}
                {currentStep === 2 && !userChoice && !isLoading && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-blue-800 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        选择题目排列方式
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-6 text-blue-700">
                        您好！在为您生成刷题网页之前，请问您希望题目是按顺序出还是随机出？
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <Button 
                          onClick={() => handleChoiceSelection("顺序")}
                          className="h-14 text-lg flex items-center justify-center space-x-2"
                        >
                          <Clock className="h-5 w-5" />
                          <span>按顺序出题</span>
                        </Button>
                        <Button 
                          onClick={() => handleChoiceSelection("随机")}
                          variant="outline"
                          className="h-14 text-lg border-2 border-blue-300 hover:bg-blue-100 flex items-center justify-center space-x-2"
                        >
                          <Sparkles className="h-5 w-5" />
                          <span>随机出题</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 开始解析按钮 */}
                {currentStep === 1 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleStartParsing}
                      disabled={(!uploadedFile && !content.trim()) || isLoading}
                      size="lg"
                      className="px-12 py-4 text-xl h-16 rounded-xl"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>正在解析中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <Brain className="h-6 w-6" />
                          <span>开始智能解析</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}

                {/* 加载进度显示 */}
                {isLoading && currentStep === 2 && (
                  <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <div>
                        <h3 className="font-semibold text-blue-800">AI正在处理您的文件</h3>
                        <p className="text-blue-600 text-sm">{loadingMessage || "正在初始化..."}</p>
                      </div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600 mt-2">
                      <span>进度: {loadingProgress}%</span>
                      <span>预计还需 {Math.max(0, Math.ceil((100 - loadingProgress) / 10))} 秒</span>
                    </div>
                  </div>
                )}

                {/* HTML下载完成提示 */}
                {currentStep === 4 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-8 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-800">HTML文件生成成功！</h3>
                        <p className="text-green-700">
                          刷题网页已自动下载到您的电脑，请查看下载文件夹
                        </p>
                        <div className="animate-pulse text-green-600">
                          正在准备更多选项...
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 后续选项 */}
                {currentStep === 5 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-blue-800 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        接下来您想要做什么？
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={startQuizInterface}
                          className="h-20 flex flex-col items-center justify-center space-y-2"
                          disabled={!quizData}
                        >
                          <Target className="h-6 w-6" />
                          <span>在线刷题练习</span>
                          <span className="text-xs opacity-80">直接在网页上练习</span>
                        </Button>

                        <Button
                          onClick={downloadQuizHtml}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center space-y-2"
                          disabled={!generatedHtml}
                        >
                          <FileText className="h-6 w-6" />
                          <span>重新下载HTML</span>
                          <span className="text-xs opacity-80">再次下载刷题文件</span>
                        </Button>

                        <Button
                          onClick={() => setShowPreview(true)}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center space-y-2"
                          disabled={!generatedHtml}
                        >
                          <Brain className="h-6 w-6" />
                          <span>预览HTML</span>
                          <span className="text-xs opacity-80">查看生成的网页</span>
                        </Button>

                        <Button
                          onClick={() => setCurrentStep(7)}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center space-y-2"
                          disabled={!quizData || quizData.questions.length < 20}
                        >
                          <Zap className="h-6 w-6" />
                          <span>批量处理</span>
                          <span className="text-xs opacity-80">分割成多个网页</span>
                        </Button>

                        <Button
                          onClick={resetParsing}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center space-y-2"
                        >
                          <RotateCcw className="h-6 w-6" />
                          <span>重新开始</span>
                          <span className="text-xs opacity-80">上传新的题目文件</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 批量处理界面 */}
                {currentStep === 7 && quizData && (
                  <BatchProcessingInterface
                    quizData={quizData}
                    onBack={() => setCurrentStep(5)}
                  />
                )}

                {/* 重置按钮 */}
                {currentStep > 1 && currentStep < 4 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={resetParsing}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>重新开始</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：解析结果和题目预览 */}
          {showPreview && (
            <div className="lg:col-span-3 space-y-6 overflow-y-auto transition-all duration-1000 ease-in-out">
              {/* HTML预览区域 */}
              {generatedHtml && (
                <div className="h-full">
                  <QuizPreview
                    htmlContent={generatedHtml}
                    title={quizTitle || "智能题库"}
                    onDownload={downloadQuizHtml}
                    onClose={() => setShowPreview(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 刷题界面 */}
        {showQuizInterface && quizData && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 overflow-y-auto">
            <div className="min-h-screen p-4">
              <div className="max-w-4xl mx-auto">
                {/* 头部信息 */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-800">{quizData.title}</h1>
                        <p className="text-gray-600">
                          题目 {currentQuestionIndex + 1} / {quizData.questions.length}
                          {userChoice && ` • ${userChoice}模式`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">正确率</p>
                        <p className="text-xl font-bold text-green-600">
                          {quizData.questions.length > 0 ? Math.round((correctCount / Math.max(currentQuestionIndex, 1)) * 100) : 0}%
                        </p>
                      </div>
                      <Button
                        onClick={backToParsingPage}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        <span>返回</span>
                      </Button>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {!quizCompleted ? (
                  /* 题目卡片 */
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed">
                        {quizData.questions[currentQuestionIndex]?.question}
                      </h2>

                      {/* 选项 */}
                      <div className="space-y-3">
                        {quizData.questions[currentQuestionIndex]?.options.map((option, index) => {
                          const isSelected = userAnswers[currentQuestionIndex] === index
                          const isCorrect = index === quizData.questions[currentQuestionIndex].correctAnswer
                          const showResult = isAnswered

                          let buttonClass = "w-full p-4 text-left border-2 rounded-lg transition-all duration-200 "

                          if (showResult) {
                            if (isCorrect) {
                              buttonClass += "border-green-500 bg-green-50 text-green-800"
                            } else if (isSelected && !isCorrect) {
                              buttonClass += "border-red-500 bg-red-50 text-red-800"
                            } else {
                              buttonClass += "border-gray-200 bg-gray-50 text-gray-600"
                            }
                          } else {
                            buttonClass += isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-800"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                          }

                          return (
                            <button
                              key={index}
                              onClick={() => handleAnswerSelect(index)}
                              disabled={isAnswered}
                              className={buttonClass}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                                  showResult && isCorrect
                                    ? "border-green-500 bg-green-500 text-white"
                                    : showResult && isSelected && !isCorrect
                                    ? "border-red-500 bg-red-500 text-white"
                                    : isSelected
                                    ? "border-blue-500 bg-blue-500 text-white"
                                    : "border-gray-300"
                                }`}>
                                  {String.fromCharCode(65 + index)}
                                </div>
                                <span className="flex-1">{option}</span>
                                {showResult && isCorrect && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <X className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 解释 */}
                    {showExplanation && quizData.questions[currentQuestionIndex]?.explanation && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-2">解释</h3>
                        <p className="text-blue-700">{quizData.questions[currentQuestionIndex].explanation}</p>
                      </div>
                    )}

                    {/* 下一题按钮 */}
                    {isAnswered && (
                      <div className="flex justify-center mt-8">
                        <Button
                          onClick={nextQuestion}
                          size="lg"
                          className="px-8 py-3 text-lg"
                        >
                          {currentQuestionIndex < quizData.questions.length - 1 ? (
                            <>
                              <span>下一题</span>
                              <ArrowRight className="h-5 w-5 ml-2" />
                            </>
                          ) : (
                            <>
                              <span>查看结果</span>
                              <CheckCircle className="h-5 w-5 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 完成界面 */
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">恭喜完成！</h2>
                    <div className="text-6xl font-bold text-green-600 mb-2">
                      {Math.round((correctCount / quizData.questions.length) * 100)}%
                    </div>
                    <p className="text-gray-600 mb-8">
                      您答对了 {correctCount} / {quizData.questions.length} 道题目
                    </p>

                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={restartQuiz}
                        variant="outline"
                        size="lg"
                        className="px-6 py-3"
                      >
                        <RotateCcw className="h-5 w-5 mr-2" />
                        重新开始
                      </Button>
                      <Button
                        onClick={backToParsingPage}
                        size="lg"
                        className="px-6 py-3"
                      >
                        <ArrowRight className="h-5 w-5 mr-2" />
                        返回首页
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 题库标题命名对话框 */}
        <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <FileText className="h-6 w-6 mr-3" />
                为您的题库命名
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-3">
                <Label htmlFor="quiz-title" className="text-lg font-medium">
                  题库标题
                </Label>
                <Input
                  id="quiz-title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="请输入题库标题，如：JavaScript基础测试"
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="quiz-description" className="text-lg font-medium">
                  题库描述（可选）
                </Label>
                <Input
                  id="quiz-description"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="请输入题库描述，如：用于测试JavaScript基础知识"
                  className="h-12 text-lg"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">题库信息</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>• 题目数量：{quizData?.totalQuestions || parsedQuestions.length || 0} 道</p>
                  <p>• 出题方式：{userChoice}</p>
                  <p>• 文件格式：HTML（可直接在浏览器中打开）</p>
                  {quizData && (
                    <p>• 题库标题：{quizData.title}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={downloadQuizHtml}
                  disabled={!quizTitle.trim()}
                  className="w-full h-12"
                >
                  下载HTML文件
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTitleDialog(false)}
                  className="w-full h-12"
                >
                  取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
