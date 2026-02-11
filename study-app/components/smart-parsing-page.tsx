"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { QuizPreview } from "@/components/quiz-preview"
import {
  Upload,
  FileText,
  File as FileIcon,
  AlertCircle,
  CheckCircle,
  Brain,
  FileSpreadsheet,
  FileType,
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  X,
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004"

export function SmartParsingPage() {
  const [content, setContent] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [userChoice, setUserChoice] = useState<"顺序" | "随机" | null>(null)
  const [quizTitle, setQuizTitle] = useState("")
  const [showPreview, setShowPreview] = useState(false) // 新增：控制预览显示
  const [generatedHtml, setGeneratedHtml] = useState("") // 存储生成的HTML内容
  const [isDragOver, setIsDragOver] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedFormats = [
    { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", icon: FileText },
    { ext: "doc", mime: "application/msword", icon: FileText },
    { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", icon: FileSpreadsheet },
    { ext: "xls", mime: "application/vnd.ms-excel", icon: FileSpreadsheet },
    { ext: "txt", mime: "text/plain", icon: FileType },
    { ext: "md", mime: "text/markdown", icon: FileType },
    { ext: "pdf", mime: "application/pdf", icon: FileIcon },
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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const startUploadAndParse = async (orderMode: "顺序" | "随机") => {
    if (!uploadedFile && !content.trim()) {
      setError("请上传文件或输入题库内容")
      return
    }

    const token = localStorage.getItem("auth_token")
    if (!token) {
      setError("请先登录后再上传解析")
      return
    }

    setIsLoading(true)
    setError("")
    setLoadingProgress(0)
    setLoadingMessage("正在提交任务...")
    setGeneratedHtml("")
    setShowPreview(false)

    try {
      const authHeaders: HeadersInit = {
        Authorization: `Bearer ${token}`,
      }

      let quizId: string
      let jobId: string

      if (uploadedFile) {
        const formData = new FormData()
        formData.append("file", uploadedFile)
        formData.append("orderMode", orderMode)
        formData.append("title", uploadedFile.name)

        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
          method: "POST",
          headers: authHeaders,
          body: formData,
        })

        const uploadJson = await uploadRes.json().catch(() => null)
        if (!uploadRes.ok || !uploadJson?.success) {
          throw new Error(uploadJson?.message || "上传失败，请稍后重试")
        }

        quizId = uploadJson.data.quizId
        jobId = uploadJson.data.jobId
      } else {
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload/text`, {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            title: "粘贴文字题库",
            description: "",
            orderMode,
          }),
        })

        const uploadJson = await uploadRes.json().catch(() => null)
        if (!uploadRes.ok || !uploadJson?.success) {
          throw new Error(uploadJson?.message || "提交失败，请稍后重试")
        }

        quizId = uploadJson.data.quizId
        jobId = uploadJson.data.jobId
      }

      setLoadingMessage("任务已提交，正在排队处理...")
      setLoadingProgress(5)

      // 轮询任务状态（最多等待 3 分钟）
      let attempts = 0
      const maxAttempts = 180

      while (attempts < maxAttempts) {
        await sleep(1000)

        const statusRes = await fetch(`${API_BASE_URL}/api/job/${jobId}`, {
          method: "GET",
          headers: authHeaders,
        })
        const statusJson = await statusRes.json().catch(() => null)

        if (!statusRes.ok || !statusJson?.success) {
          throw new Error(statusJson?.message || "获取解析状态失败")
        }

        const job = statusJson.data as any
        const progress = typeof job?.progress === "number" ? job.progress : 0
        setLoadingProgress(Math.max(0, Math.min(100, progress)))

        if (job?.status === "queued") {
          setLoadingMessage("任务排队中...")
        } else if (job?.status === "active") {
          if (progress < 30) setLoadingMessage("正在解析文件内容...")
          else if (progress < 60) setLoadingMessage("正在生成刷题网页...")
          else setLoadingMessage("正在保存结果...")
        } else if (job?.status === "failed") {
          throw new Error(job?.error || job?.quiz?.errorMsg || "解析失败")
        } else if (job?.status === "completed") {
          let html = job?.quiz?.html as string | undefined

          if (!html && quizId) {
            const quizRes = await fetch(`${API_BASE_URL}/api/quiz/${quizId}`, {
              method: "GET",
              headers: authHeaders,
            })
            const quizJson = await quizRes.json().catch(() => null)
            if (quizRes.ok && quizJson?.success) {
              html = quizJson?.data?.html
            }
          }

          if (!html) {
            throw new Error("生成的HTML内容为空")
          }

          setLoadingMessage("生成题库完成！")
          setLoadingProgress(100)
          setGeneratedHtml(html)
          setQuizTitle(job?.quiz?.title || uploadedFile?.name || "智能题库")
          setCurrentStep(3)
          setShowPreview(true)
          return
        }

        attempts++
      }

      throw new Error("解析超时，请稍后重试")
    } catch (error) {
      console.error("解析错误:", error)

      let errorMessage = "解析过程中发生错误，请重试"
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("无权")) {
          errorMessage = "登录已失效，请重新登录后重试"
        } else if (error.message.includes("网络")) {
          errorMessage = "网络连接失败，请检查网络连接后重试"
        } else if (error.message.includes("超时")) {
          errorMessage = "解析超时，文件可能过大或网络较慢，请稍后重试"
        } else if (error.message.includes("格式") || error.message.includes("不支持")) {
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

  const handleStartParsing = () => {
    if (!uploadedFile && !content.trim()) {
      setError("请上传文件或输入题库内容")
      return
    }
    setError("")
    setCurrentStep(2)
  }

  const handleChoiceSelection = (choice: "顺序" | "随机") => {
    setUserChoice(choice)
    void startUploadAndParse(choice)
  }

  const downloadQuizHtml = () => {
    try {
      const htmlContent = generatedHtml

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
    setUploadedFile(null)
    setContent("")
    setError("")
    setQuizTitle("")
    setShowPreview(false) // 隐藏预览，恢复居中布局
    setGeneratedHtml("") // 清空生成的HTML
    setLoadingProgress(0)
    setLoadingMessage("")
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
                  {(error.includes('网络') || error.includes('超时')) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError("")
                        if (currentStep === 2 && userChoice) {
                          void startUploadAndParse(userChoice)
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

                {/* 完成后操作 */}
                {currentStep === 3 && !isLoading && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={resetParsing}
                      className="h-12 text-lg border-2"
                    >
                      重新解析
                    </Button>
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

            
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
