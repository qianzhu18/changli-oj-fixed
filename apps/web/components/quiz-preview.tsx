"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  Download, 
  ExternalLink, 
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Minimize2
} from "lucide-react"

interface QuizPreviewProps {
  htmlContent: string
  title: string
  onDownload: () => void
  onClose?: () => void
}

export function QuizPreview({ htmlContent, title, onDownload, onClose }: QuizPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 预览模式的样式配置
  const previewStyles = {
    desktop: 'w-full h-full',
    tablet: 'w-[768px] h-[1024px] mx-auto',
    mobile: 'w-[375px] h-[667px] mx-auto'
  }

  const previewIcons = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone
  }

  // 刷新预览
  const refreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  // 在新窗口中打开
  const openInNewWindow = () => {
    const newWindow = window.open('', '_blank', 'width=1200,height=800')
    if (newWindow) {
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    }
  }

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 创建预览用的blob URL
  const createPreviewUrl = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }

  const previewUrl = createPreviewUrl()

  // 清理blob URL
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">🎯 互动刷题界面</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{title} • 支持实时答题和错误反馈</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 预览模式切换 */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {Object.entries(previewIcons).map(([mode, Icon]) => (
                  <Button
                    key={mode}
                    variant={previewMode === mode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode(mode as any)}
                    className="h-8 w-8 p-0"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>

              {/* 操作按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshPreview}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={openInNewWindow}
                className="h-8"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <Button
                onClick={onDownload}
                size="sm"
                className="h-8 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                下载
              </Button>

              {onClose && !isFullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="h-8"
                >
                  关闭
                </Button>
              )}
            </div>
          </div>

          {/* 预览信息 */}
          <div className="flex items-center space-x-4 mt-3">
            <Badge variant="secondary" className="text-xs">
              {previewMode === 'desktop' ? '桌面端' : previewMode === 'tablet' ? '平板端' : '手机端'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              交互式刷题网页
            </Badge>
            <span className="text-xs text-gray-500">
              可直接答题 • 实时反馈 • 错误引导
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full bg-gray-50 flex items-center justify-center p-4">
            <div className={`${previewStyles[previewMode]} bg-white rounded-lg shadow-lg overflow-hidden`}>
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="题库预览"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
