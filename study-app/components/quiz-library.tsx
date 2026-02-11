"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Download, 
  Eye, 
  Trash2,
  Plus,
  Filter,
  Clock,
  Target,
  Loader2
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004"

type QuizStatus = "pending" | "processing" | "completed" | "failed"
type JobStatus = "queued" | "active" | "completed" | "failed"
type OrderMode = "顺序" | "随机"

interface QuizLibraryItem {
  id: string
  title: string
  description?: string | null
  orderMode: OrderMode
  status: QuizStatus
  createdAt: string
  updatedAt: string
  latestJob?: {
    id: string
    status: JobStatus
    progress: number
    createdAt: string
  } | null
  hasHtml: boolean
  htmlContent?: string
}

interface QuizLibraryProps {
  onCreateNew: () => void
  onPreview: (quiz: QuizLibraryItem) => void
}

export function QuizLibrary({ onCreateNew, onPreview }: QuizLibraryProps) {
  const [quizzes, setQuizzes] = useState<QuizLibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | QuizStatus>("all")

  const getToken = () => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("auth_token")
  }

  const fetchQuizzes = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setLoadError("请先登录后查看题库")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError("")

    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "加载题库失败")
      }

      const apiQuizzes = (json?.data?.quizzes || []) as any[]
      const mapped: QuizLibraryItem[] = apiQuizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        orderMode: q.orderMode,
        status: q.status,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        latestJob: q.latestJob || null,
        hasHtml: !!q.hasHtml,
      }))

      setQuizzes(mapped)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "加载题库失败")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchQuizzes()
  }, [fetchQuizzes])

  // 过滤题库
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === "all" || quiz.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const getQuizDetail = async (quizId: string) => {
    const token = getToken()
    if (!token) throw new Error("请先登录")

    const res = await fetch(`${API_BASE_URL}/api/quiz/${quizId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.success) {
      throw new Error(json?.message || "获取题库失败")
    }

    return json.data as any
  }

  // 预览题库（拉取 HTML）
  const previewQuiz = async (quiz: QuizLibraryItem) => {
    try {
      const detail = await getQuizDetail(quiz.id)
      const html = detail?.html as string | undefined
      if (!html) {
        throw new Error("该题库尚未生成可预览的 HTML")
      }
      onPreview({ ...quiz, htmlContent: html })
    } catch (e) {
      alert(e instanceof Error ? e.message : "预览失败")
    }
  }

  // 下载题库（拉取 HTML）
  const downloadQuiz = async (quiz: QuizLibraryItem) => {
    try {
      const detail = await getQuizDetail(quiz.id)
      const html = detail?.html as string | undefined
      if (!html) {
        throw new Error("该题库暂无可下载的内容")
      }

      const blob = new Blob([html], { type: "text/html;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${quiz.title}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "下载失败")
    }
  }

  // 删除题库
  const deleteQuiz = async (quizId: string) => {
    if (!confirm("确定要删除这个题库吗？此操作不可恢复。")) return

    const token = getToken()
    if (!token) {
      alert("请先登录")
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/${quizId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "删除失败")
      }

      setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败")
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-CN", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: QuizStatus) => {
    switch (status) {
      case "pending": return "bg-gray-100 text-gray-800"
      case "processing": return "bg-blue-100 text-blue-800"
      case "completed": return "bg-green-100 text-green-800"
      case "failed": return "bg-red-100 text-red-800"
    }
  }

  const getStatusText = (status: QuizStatus) => {
    switch (status) {
      case "pending": return "等待中"
      case "processing": return "处理中"
      case "completed": return "已完成"
      case "failed": return "失败"
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">我的题库</h1>
            <p className="text-gray-600">管理和使用您的智能题库</p>
          </div>
        </div>
        
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          创建新题库
        </Button>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索题库标题、描述或标签..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">所有状态</option>
                <option value="pending">等待中</option>
                <option value="processing">处理中</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-red-800 font-medium">{loadError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchQuizzes()}
              className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100"
            >
              重试
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <p className="text-gray-600">正在加载题库...</p>
          </CardContent>
        </Card>
      )}

      {/* 题库列表 */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                <Badge className={`text-xs ${getStatusColor(quiz.status)}`}>
                  {getStatusText(quiz.status)}
                </Badge>
              </div>
              {quiz.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {quiz.orderMode}
                </Badge>
                {quiz.latestJob && quiz.status !== "completed" && (
                  <Badge variant="secondary" className="text-xs">
                    {quiz.latestJob.progress}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* 统计信息 */}
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-green-500" />
                <span>{formatDate(quiz.createdAt)}</span>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => void previewQuiz(quiz)}
                  className="flex-1"
                  disabled={!quiz.hasHtml}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  预览
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadQuiz(quiz)}
                  className="flex-1"
                  disabled={!quiz.hasHtml}
                >
                  <Download className="h-4 w-4 mr-1" />
                  下载
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void deleteQuiz(quiz.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && filteredQuizzes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm || filterStatus !== "all" ? "未找到匹配的题库" : "还没有题库"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== "all" 
                ? "尝试调整搜索条件或过滤器" 
                : "创建您的第一个智能题库开始学习吧"
              }
            </p>
            {(!searchTerm && filterStatus === "all") && (
              <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-5 w-5 mr-2" />
                创建新题库
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
