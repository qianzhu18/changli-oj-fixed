"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuizPreview } from "@/components/quiz-preview"
import {
  Upload,
  FileText,
  File,
  AlertCircle,
  CheckCircle,
  Brain,
  Key,
  FileSpreadsheet,
  FileType,
  Download,
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  X,
  Eye
} from "lucide-react"

interface ParsedQuestion {
  id: string
  question: string
  answer: string
  type: "multiple-choice" | "fill-in-blank"
  options?: string[]
}

export function SmartParsingPage() {
  const [mounted, setMounted] = useState(false)
  const [content, setContent] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [userChoice, setUserChoice] = useState<"顺序" | "随机" | null>(null)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [showTitleDialog, setShowTitleDialog] = useState(false)
  const [quizTitle, setQuizTitle] = useState("")
  const [showPreview, setShowPreview] = useState(false) // 新增：控制预览显示
  const [generatedHtml, setGeneratedHtml] = useState("") // 存储生成的HTML内容
  const [isDragOver, setIsDragOver] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // AI API配置
  const AI_CONFIG = {
    apiKey: 'sk-1e49426A5A63Ee3C33256F17EF152C02',
    baseUrl: 'https://twoapi-ui.qiangtu.com/v1'
  }

  // AI调用函数
  const callAIAPI = async (content: string, orderMode: string) => {
    const systemPrompt = buildQuizSystemPrompt(orderMode)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5分钟超时

    try {
      const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: 'gemini-2.5-pro-preview-06-05',
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: content }
          ],
          temperature: 0.7
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error('AI API请求失败')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') break

            try {
              const data = JSON.parse(dataStr)
              if (data.choices[0].delta?.content) {
                fullContent += data.choices[0].delta.content
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      clearTimeout(timeoutId)
      return extractHtmlFromResponse(fullContent)

    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // 构建题库生成的系统提示词
  const buildQuizSystemPrompt = (orderMode: string) => {
    return `# 智能题库生成系统

角色：专业题库设计师

你是一名专业的题库设计师，擅长从各种学习材料中提取关键知识点并设计高质量的题目。

## 任务

从我提供的内容中，提取重要知识点并生成一套完整的题库，包含多种题型，适合在线学习和考试练习。

### 题库要求

1. **题目数量**：根据内容长度生成15-30道题目
2. **题型多样**：
   - 单选题（40%）
   - 多选题（30%）
   - 判断题（20%）
   - 填空题（10%）

3. **难度分布**：
   - 基础题（50%）：考查基本概念和定义
   - 中等题（35%）：考查理解和应用
   - 困难题（15%）：考查分析和综合

4. **题目顺序**：${orderMode === '顺序' ? '按照内容出现的顺序排列' : '随机打乱顺序'}

### 输出格式

请生成一个完整的HTML文件，包含：
- 响应式设计，适配手机和电脑
- 现代化的UI界面
- 交互式答题功能
- 实时评分系统
- 答案解析功能

### HTML结构要求

\`\`\`html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能题库练习</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- 题库内容 -->
</body>
</html>
\`\`\`

### 设计要求

- 使用Tailwind CSS进行样式设计
- 包含进度条显示答题进度
- 每题显示题号、题目、选项
- 提交后显示正确答案和解析
- 最终显示总分和详细报告
- 支持重新开始功能

### 交互功能

- 单选题：点击选择答案
- 多选题：可选择多个答案
- 判断题：选择对或错
- 填空题：输入文本答案
- 提交按钮：检查答案并显示结果

请确保生成的HTML文件是完整的、可直接运行的，包含所有必要的JavaScript交互逻辑。

待处理内容：`
  }

  // 从AI响应中提取HTML内容
  const extractHtmlFromResponse = (content: string) => {
    // 首先解码转义字符
    let decodedContent = content
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\')

    // 尝试提取代码块中的HTML
    const codeBlockRegex = /```html\n([\s\S]*?)\n```/
    const match = decodedContent.match(codeBlockRegex)

    if (match && match[1]) {
      return match[1]
    }

    // 尝试提取没有语言标识的代码块
    const generalCodeBlockRegex = /```\n([\s\S]*?)\n```/
    const generalMatch = decodedContent.match(generalCodeBlockRegex)

    if (generalMatch && generalMatch[1] &&
        (generalMatch[1].trim().startsWith('<!DOCTYPE html') || generalMatch[1].trim().startsWith('<html'))) {
      return generalMatch[1]
    }

    // 如果没有代码块，尝试查找HTML标签
    const htmlTagRegex = /<html[\s\S]*<\/html>/i
    const htmlMatch = decodedContent.match(htmlTagRegex)

    if (htmlMatch) {
      return htmlMatch[0]
    }

    // 检查是否直接以HTML开头
    const trimmedContent = decodedContent.trim()
    if (trimmedContent.startsWith('<!DOCTYPE html') || trimmedContent.startsWith('<html')) {
      return trimmedContent
    }

    // 如果都没有，返回原始内容
    return decodedContent
  }

  const supportedFormats = [
    { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", icon: FileText },
    { ext: "doc", mime: "application/msword", icon: FileText },
    { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", icon: FileSpreadsheet },
    { ext: "xls", mime: "application/vnd.ms-excel", icon: FileSpreadsheet },
    { ext: "txt", mime: "text/plain", icon: FileType },
    { ext: "md", mime: "text/markdown", icon: FileType },
    { ext: "pdf", mime: "application/pdf", icon: File },
  ]

  const maxFileSize = 10 * 1024 * 1024 // 10MB

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError("")

    // 检查文件类型
    const isSupported = supportedFormats.some(format => 
      format.mime === file.type || file.name.toLowerCase().endsWith(`.${format.ext}`)
    )

    if (!isSupported) {
      setError(`不支持的文件格式"${file.name.split('.').pop()?.toUpperCase()}"。请上传 Word (.docx/.doc)、Excel (.xlsx/.xls)、PDF (.pdf)、文本 (.txt) 或 Markdown (.md) 文件。`)
      return
    }

    // 检查文件大小
    if (file.size > maxFileSize) {
      setError(`文件"${file.name}"大小为 ${formatFileSize(file.size)}，超过 ${formatFileSize(maxFileSize)} 的限制。请压缩文件或选择较小的文件。`)
      return
    }

    // 检查文件是否为空
    if (file.size === 0) {
      setError(`文件"${file.name}"为空文件，请选择包含内容的文件。`)
      return
    }

    setUploadedFile(file)
  }

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

      setError("")

      // 检查文件类型
      const isSupported = supportedFormats.some(format =>
        format.mime === file.type || file.name.toLowerCase().endsWith(`.${format.ext}`)
      )

      if (!isSupported) {
        setError(`拖拽的文件格式"${file.name.split('.').pop()?.toUpperCase()}"不受支持。请拖拽 Word (.docx/.doc)、Excel (.xlsx/.xls)、PDF (.pdf)、文本 (.txt) 或 Markdown (.md) 文件。`)
        return
      }

      // 检查文件大小
      if (file.size > maxFileSize) {
        setError(`拖拽的文件"${file.name}"大小为 ${formatFileSize(file.size)}，超过 ${formatFileSize(maxFileSize)} 的限制。`)
        return
      }

      // 检查文件是否为空
      if (file.size === 0) {
        setError(`拖拽的文件"${file.name}"为空文件，请选择包含内容的文件。`)
        return
      }

      setUploadedFile(file)
    }
  }

  const handleStartParsing = async () => {
    if (!uploadedFile && !content.trim()) {
      setError("请上传文件或输入题库内容")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // 步骤1：询问用户选择
      if (currentStep === 1) {
        setCurrentStep(2)
        setIsLoading(false)
        return
      }

      // 步骤2：处理文件并生成题库
      if (currentStep === 2 && userChoice) {
        setLoadingMessage("AI正在生成题库...")
        setLoadingProgress(80)

        // 直接调用AI API生成题库
        const htmlContent = await callAIAPI(content, userChoice)

        if (htmlContent) {
          setLoadingMessage("生成题库完成！")
          setLoadingProgress(100)

          // 保存生成的HTML内容
          setGeneratedHtml(htmlContent)
          if (typeof window !== 'undefined') {
            localStorage.setItem('generatedQuizHtml', htmlContent)
          }

          // 创建模拟题目数据用于预览
          const mockQuestions: ParsedQuestion[] = [
            {
              id: "1",
              question: "基于您上传的文件生成的题目示例",
              answer: "这是一个示例答案",
              type: "multiple-choice",
              options: ["选项A", "选项B", "选项C", "选项D"]
            }
          ]

          setParsedQuestions(mockQuestions)
          setCurrentStep(3)
          setShowPreview(true)
          setShowTitleDialog(true)
        } else {
          throw new Error('生成的HTML内容为空')
        }
      }
    } catch (error) {
      console.error('解析错误:', error)

      // 根据错误类型提供更具体的错误信息
      let errorMessage = "解析过程中发生错误，请重试"

      if (error instanceof Error) {
        if (error.message.includes('网络')) {
          errorMessage = "网络连接失败，请检查网络连接后重试"
        } else if (error.message.includes('超时')) {
          errorMessage = "解析超时，文件可能过大或网络较慢，请稍后重试"
        } else if (error.message.includes('格式')) {
          errorMessage = "文件格式不支持或文件已损坏，请检查文件后重新上传"
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      setLoadingProgress(0)
      setLoadingMessage("")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChoiceSelection = (choice: "顺序" | "随机") => {
    setUserChoice(choice)
    handleStartParsing()
  }

  const handleSaveTitleAndGenerate = async () => {
    if (!quizTitle.trim()) {
      setError("请输入题库标题")
      return
    }

    setShowTitleDialog(false)
    downloadQuizHtml()
  }

  const downloadQuizHtml = () => {
    try {
      const htmlContent = generatedHtml || (typeof window !== 'undefined' ? localStorage.getItem('generatedQuizHtml') : null)

      if (!htmlContent) {
        throw new Error('未找到生成的HTML内容')
      }

      const title = quizTitle || '智能题库'

      // 更新HTML中的标题
      const updatedHtml = htmlContent.replace(
        /<title>.*?<\/title>/,
        `<title>${title} - 智能题库系统</title>`
      ).replace(
        /<h1[^>]*>.*?<\/h1>/,
        `<h1>🎯 ${title}</h1>`
      )

      // 创建下载链接
      const blob = new Blob([updatedHtml], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert(`题库"${title}"已成功下载！`)
    } catch (error) {
      console.error('下载题库错误:', error)
      setError("下载题库时发生错误")
    }
  }

  const resetParsing = () => {
    setCurrentStep(1)
    setUserChoice(null)
    setParsedQuestions([])
    setUploadedFile(null)
    setContent("")
    setError("")
    setQuizTitle("")
    setShowPreview(false) // 隐藏预览，恢复居中布局
    setGeneratedHtml("") // 清空生成的HTML
    setLoadingProgress(0)
    setLoadingMessage("")
    // 清理localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('generatedQuizHtml')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStepIcon = (step: number) => {
    if (currentStep > step) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (currentStep === step) return <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">{step}</div>
    return <div className="h-5 w-5 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs">{step}</div>
  }

  // 防止hydration错误
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
              <div className="flex-1">
                <AlertDescription className="text-red-800 font-medium">
                  {error}
                </AlertDescription>
                <div className="mt-3 flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError("")}
                    className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100"
                  >
                    关闭
                  </Button>
                  {error.includes('API') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError("")
                        // 这里可以打开API配置对话框
                      }}
                      className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100"
                    >
                      检查API设置
                    </Button>
                  )}
                  {(error.includes('网络') || error.includes('超时')) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError("")
                        if (currentStep === 2 && userChoice) {
                          handleStartParsing()
                        }
                      }}
                      className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100"
                    >
                      重试
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* 主要内容区域 - 动态布局 */}
        <div className={`transition-all duration-1000 ease-in-out min-h-[calc(100vh-280px)] ${
          showPreview
            ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6'
            : 'flex items-center justify-center'
        }`}>
          {/* 上传区域 */}
          <div className={`transition-all duration-1000 ease-in-out ${
            showPreview 
              ? 'col-span-1 space-y-6 overflow-y-auto' 
              : 'w-full max-w-4xl space-y-6 overflow-y-auto'
          }`}>
            <Card className={`swordsman-card ${showPreview ? 'h-full' : 'h-auto'}`}>
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
                  <TabsList className="grid w-full grid-cols-2 swordsman-tabs">
                    <TabsTrigger value="upload" className="swordsman-tab flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>文件上传</span>
                    </TabsTrigger>
                    <TabsTrigger value="text" className="swordsman-tab flex items-center space-x-2">
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
                              <CheckCircle className="h-7 w-7 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-green-800 text-lg">{uploadedFile.name}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <p className="text-green-600 text-sm">
                                  📁 {formatFileSize(uploadedFile.size)}
                                </p>
                                <p className="text-green-600 text-sm">
                                  📄 {uploadedFile.type || '未知类型'}
                                </p>
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-green-600 text-sm font-medium">已准备解析</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null)
                              setError("")
                            }}
                            className="text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full w-8 h-8 p-0"
                            title="移除文件"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* 文件预览信息 */}
                        <div className="mt-4 pt-4 border-t border-green-200">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm">
                            <div className="text-center">
                              <div className="text-green-800 font-semibold mb-1">文件类型</div>
                              <div className="text-green-600">{uploadedFile.name.split('.').pop()?.toUpperCase()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-800 font-semibold mb-1">文件大小</div>
                              <div className="text-green-600">{formatFileSize(uploadedFile.size)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-800 font-semibold mb-1">上传时间</div>
                              <div className="text-green-600">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-800 font-semibold mb-1">状态</div>
                              <div className="text-green-600 flex items-center justify-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>就绪</span>
                              </div>
                            </div>
                          </div>
                        </div>
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
                        className="min-h-[400px] text-base swordsman-input resize-none"
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

                {/* 支持格式说明 */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold mb-4 text-blue-900 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2" />
                    支持的文件格式
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {supportedFormats.map((format) => (
                      <div key={format.ext} className="flex items-center space-x-2 text-blue-700">
                        <format.icon className="h-4 w-4" />
                        <span className="font-medium">.{format.ext}</span>
                      </div>
                    ))}
                  </div>
                </div>

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
                          className="swordsman-button h-14 text-lg flex items-center justify-center space-x-2"
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
                      className="swordsman-button px-12 py-4 text-xl h-16 rounded-xl"
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
              </CardContent>
            </Card>
          </div>

          {/* 右侧：解析结果和题目预览 */}
          {showPreview && (
            <div className="col-span-2 space-y-6 overflow-y-auto transition-all duration-1000 ease-in-out">
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

              {/* 题目列表预览（作为备选） */}
              {!generatedHtml && parsedQuestions.length > 0 && (
              <Card className="swordsman-card h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-xl">
                    <div className="flex items-center">
                      <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
                      <span>解析结果</span>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {parsedQuestions.length} 道题目
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                        <div>
                          <span className="font-semibold text-green-800 text-lg">
                            题库解析完成！
                          </span>
                          <p className="text-green-600">出题方式：{userChoice}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 题目预览 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      题目预览
                    </h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {parsedQuestions.slice(0, 5).map((question, index) => (
                        <div key={question.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">题目 {index + 1}</span>
                            <Badge variant={question.type === "multiple-choice" ? "default" : "secondary"}>
                              {question.type === "multiple-choice" ? "选择题" : "填空题"}
                            </Badge>
                          </div>
                          <p className="text-gray-800 mb-3 font-medium">{question.question}</p>
                          {question.options && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="text-sm text-gray-600 flex items-center">
                                  <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {parsedQuestions.length > 5 && (
                        <div className="text-center py-4">
                          <p className="text-gray-500">
                            还有 {parsedQuestions.length - 5} 道题目...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      className="swordsman-button h-12 text-lg"
                      onClick={() => setShowTitleDialog(true)}
                    >
                      <Download className="h-5 w-5 mr-2" />
                      生成题库网页
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={resetParsing}
                      className="h-12 text-lg border-2"
                    >
                      重新解析
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            
            </div>
          )}
        </div>

        {/* 题库标题命名对话框 */}
        <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
          <DialogContent className="swordsman-card max-w-md">
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
                  className="swordsman-input h-12 text-lg"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">题库信息</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>• 题目数量：{parsedQuestions.length} 道</p>
                  <p>• 出题方式：{userChoice}</p>
                  <p>• 文件格式：HTML（可直接在浏览器中打开）</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTitleDialog(false)}
                  className="flex-1 h-12"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSaveTitleAndGenerate}
                  disabled={!quizTitle.trim()}
                  className="swordsman-button flex-1 h-12"
                >
                  生成题库
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
