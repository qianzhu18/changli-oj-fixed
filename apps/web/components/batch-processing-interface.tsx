"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { BatchQuizGenerator, BatchProcessingOptions, BatchResult } from "@/lib/batch-quiz-generator"
import { QuizData } from "@/lib/quiz-parser"
import { Download, FileText, Settings, Zap, CheckCircle, AlertCircle } from "lucide-react"

interface BatchProcessingInterfaceProps {
  quizData: QuizData
  onBack: () => void
}

export function BatchProcessingInterface({ quizData, onBack }: BatchProcessingInterfaceProps) {
  const [options, setOptions] = useState<BatchProcessingOptions>({
    questionsPerPage: 25,
    splitStrategy: 'count',
    orderMode: '顺序',
    fileNamePrefix: quizData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '') || '题库'
  })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [validationResults, setValidationResults] = useState<any[]>([])

  // 估算分页数量
  const estimatedPages = Math.ceil(quizData.questions.length / options.questionsPerPage)

  const handleBatchProcess = async () => {
    setIsProcessing(true)
    setProcessingProgress(0)
    
    try {
      console.log('🚀 开始批量处理...')
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90))
      }, 200)
      
      // 执行批量处理
      const result = await BatchQuizGenerator.processBatchQuiz(quizData, options)
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      
      // 验证每个生成的HTML
      const validations = result.pages.map(page => ({
        fileName: page.fileName,
        validation: BatchQuizGenerator.validateHtmlFunctionality(page.htmlContent)
      }))
      
      setBatchResult(result)
      setValidationResults(validations)
      
      console.log('✅ 批量处理完成！', result)
      
    } catch (error) {
      console.error('❌ 批量处理失败:', error)
      alert('批量处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadAllFiles = () => {
    if (!batchResult) return
    
    batchResult.pages.forEach(page => {
      const blob = new Blob([page.htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = page.fileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
    
    // 下载处理报告
    const report = BatchQuizGenerator.generateBatchReport(batchResult)
    const reportBlob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
    const reportUrl = URL.createObjectURL(reportBlob)
    const reportLink = document.createElement('a')
    reportLink.href = reportUrl
    reportLink.download = `${options.fileNamePrefix}-处理报告.md`
    reportLink.style.display = 'none'
    document.body.appendChild(reportLink)
    reportLink.click()
    document.body.removeChild(reportLink)
    URL.revokeObjectURL(reportUrl)
  }

  const downloadSingleFile = (page: any) => {
    const blob = new Blob([page.htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = page.fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-blue-500" />
            <span>批量题库处理</span>
          </CardTitle>
          <p className="text-gray-600">
            将大型题库智能分割成多个独立的刷题网页，每个网页都包含完整的刷题功能
          </p>
        </CardHeader>
      </Card>

      {/* 题库信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>题库信息</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{quizData.questions.length}</div>
              <div className="text-sm text-blue-600">总题目数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{estimatedPages}</div>
              <div className="text-sm text-green-600">预计页面数</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{options.questionsPerPage}</div>
              <div className="text-sm text-purple-600">每页题目数</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{Math.round(quizData.title.length * quizData.questions.length / 1000)}K</div>
              <div className="text-sm text-orange-600">估计文件大小</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 处理选项 */}
      {!batchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>处理选项</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="questionsPerPage">每页题目数量</Label>
                <Input
                  id="questionsPerPage"
                  type="number"
                  min="10"
                  max="100"
                  value={options.questionsPerPage}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    questionsPerPage: parseInt(e.target.value) || 25 
                  }))}
                />
                <p className="text-sm text-gray-500">建议20-50题，确保良好的用户体验</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="splitStrategy">分割策略</Label>
                <Select
                  value={options.splitStrategy}
                  onValueChange={(value: any) => setOptions(prev => ({ ...prev, splitStrategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">按数量分割</SelectItem>
                    <SelectItem value="type">按题目类型分割</SelectItem>
                    <SelectItem value="topic">按主题分割</SelectItem>
                    <SelectItem value="difficulty">按难度分割</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderMode">题目顺序</Label>
                <Select
                  value={options.orderMode}
                  onValueChange={(value: any) => setOptions(prev => ({ ...prev, orderMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="顺序">顺序出题</SelectItem>
                    <SelectItem value="随机">随机出题</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileNamePrefix">文件名前缀</Label>
                <Input
                  id="fileNamePrefix"
                  value={options.fileNamePrefix}
                  onChange={(e) => setOptions(prev => ({ ...prev, fileNamePrefix: e.target.value }))}
                  placeholder="题库名称"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={onBack}>
                返回
              </Button>
              <Button 
                onClick={handleBatchProcess} 
                disabled={isProcessing}
                className="px-8"
              >
                {isProcessing ? '处理中...' : '开始批量处理'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 处理进度 */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">正在处理题库...</span>
                <span className="text-sm text-gray-500">{processingProgress}%</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-gray-600">
                正在生成 {estimatedPages} 个独立的刷题网页，请稍候...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 处理结果 */}
      {batchResult && (
        <div className="space-y-6">
          {/* 结果概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span>处理完成</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{batchResult.totalPages}</div>
                  <div className="text-sm text-green-600">生成网页数</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{batchResult.summary.averageQuestionsPerPage}</div>
                  <div className="text-sm text-blue-600">平均每页题目</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{batchResult.summary.processingTime}ms</div>
                  <div className="text-sm text-purple-600">处理时间</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {validationResults.filter(v => v.validation.isValid).length}/{validationResults.length}
                  </div>
                  <div className="text-sm text-orange-600">功能验证通过</div>
                </div>
              </div>
              
              <Button onClick={downloadAllFiles} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                下载所有文件 ({batchResult.totalPages} 个网页 + 处理报告)
              </Button>
            </CardContent>
          </Card>

          {/* 文件列表 */}
          <Card>
            <CardHeader>
              <CardTitle>生成的文件列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {batchResult.pages.map((page, index) => {
                  const validation = validationResults[index]?.validation
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{page.fileName}</h4>
                        <p className="text-sm text-gray-600">
                          {page.questionsCount} 题 | {Math.round(page.htmlContent.length / 1024)}KB
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {validation?.isValid ? (
                            <span className="flex items-center text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              功能完整
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              需要检查
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSingleFile(page)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
