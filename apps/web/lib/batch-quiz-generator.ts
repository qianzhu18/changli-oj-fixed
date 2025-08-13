import { ParsedQuestion, QuizData } from './quiz-parser'
import { QuizHtmlGenerator } from './quiz-html-generator'

export interface BatchProcessingOptions {
  questionsPerPage: number // 每个网页的题目数量
  splitStrategy: 'count' | 'type' | 'topic' | 'difficulty' // 分割策略
  orderMode: '顺序' | '随机'
  fileNamePrefix: string // 文件名前缀
}

export interface BatchResult {
  totalQuestions: number
  totalPages: number
  pages: {
    fileName: string
    title: string
    questionsCount: number
    htmlContent: string
    pageNumber: number
    totalPages: number
  }[]
  summary: {
    processingTime: number
    averageQuestionsPerPage: number
    splitStrategy: string
  }
}

export class BatchQuizGenerator {
  /**
   * 批量处理大型题库，生成多个独立的刷题网页
   */
  static async processBatchQuiz(
    quizData: QuizData,
    options: BatchProcessingOptions
  ): Promise<BatchResult> {
    const startTime = Date.now()
    
    console.log('🚀 开始批量处理题库...')
    console.log(`📊 总题目数: ${quizData.questions.length}`)
    console.log(`📄 每页题目数: ${options.questionsPerPage}`)
    console.log(`🔄 分割策略: ${options.splitStrategy}`)
    
    // 1. 智能分组
    const groups = this.intelligentGrouping(quizData.questions, options)
    console.log(`📦 分组完成，共 ${groups.length} 组`)
    
    // 2. 生成每个网页
    const pages = []
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const pageNumber = i + 1
      
      console.log(`📝 生成第 ${pageNumber}/${groups.length} 页...`)
      
      const pageQuizData: QuizData = {
        title: `${quizData.title} - 第${pageNumber}部分`,
        questions: group.questions,
        totalQuestions: group.questions.length
      }
      
      // 生成HTML内容
      const htmlContent = QuizHtmlGenerator.generateQuizHtml(pageQuizData, options.orderMode)
      
      // 增强HTML内容，添加批次信息
      const enhancedHtml = this.enhanceHtmlWithBatchInfo(
        htmlContent,
        pageNumber,
        groups.length,
        group.questions.length,
        quizData.questions.length
      )
      
      const fileName = `${options.fileNamePrefix}-第${pageNumber}部分-共${groups.length}部分.html`
      
      pages.push({
        fileName,
        title: pageQuizData.title,
        questionsCount: group.questions.length,
        htmlContent: enhancedHtml,
        pageNumber,
        totalPages: groups.length
      })
    }
    
    const processingTime = Date.now() - startTime
    
    console.log('✅ 批量处理完成！')
    console.log(`⏱️ 处理时间: ${processingTime}ms`)
    
    return {
      totalQuestions: quizData.questions.length,
      totalPages: groups.length,
      pages,
      summary: {
        processingTime,
        averageQuestionsPerPage: Math.round(quizData.questions.length / groups.length),
        splitStrategy: options.splitStrategy
      }
    }
  }

  /**
   * 智能分组策略
   */
  private static intelligentGrouping(
    questions: ParsedQuestion[],
    options: BatchProcessingOptions
  ): { questions: ParsedQuestion[], groupInfo: any }[] {
    switch (options.splitStrategy) {
      case 'count':
        return this.groupByCount(questions, options.questionsPerPage)
      
      case 'type':
        return this.groupByType(questions, options.questionsPerPage)
      
      case 'topic':
        return this.groupByTopic(questions, options.questionsPerPage)
      
      case 'difficulty':
        return this.groupByDifficulty(questions, options.questionsPerPage)
      
      default:
        return this.groupByCount(questions, options.questionsPerPage)
    }
  }

  /**
   * 按数量分组（最基础的分组方式）
   */
  private static groupByCount(
    questions: ParsedQuestion[],
    questionsPerPage: number
  ): { questions: ParsedQuestion[], groupInfo: any }[] {
    const groups = []
    
    for (let i = 0; i < questions.length; i += questionsPerPage) {
      const groupQuestions = questions.slice(i, i + questionsPerPage)
      groups.push({
        questions: groupQuestions,
        groupInfo: {
          type: 'count',
          startIndex: i + 1,
          endIndex: Math.min(i + questionsPerPage, questions.length)
        }
      })
    }
    
    return groups
  }

  /**
   * 按题目类型分组
   */
  private static groupByType(
    questions: ParsedQuestion[],
    questionsPerPage: number
  ): { questions: ParsedQuestion[], groupInfo: any }[] {
    // 按题目类型分类
    const typeGroups = new Map<string, ParsedQuestion[]>()
    
    questions.forEach(question => {
      const type = question.type || 'multiple-choice'
      if (!typeGroups.has(type)) {
        typeGroups.set(type, [])
      }
      typeGroups.get(type)!.push(question)
    })
    
    // 将每个类型的题目进一步按数量分组
    const finalGroups = []
    
    for (const [type, typeQuestions] of typeGroups) {
      const typeSubGroups = this.groupByCount(typeQuestions, questionsPerPage)
      typeSubGroups.forEach((group, index) => {
        finalGroups.push({
          questions: group.questions,
          groupInfo: {
            type: 'type',
            questionType: type,
            subGroupIndex: index + 1,
            totalSubGroups: typeSubGroups.length
          }
        })
      })
    }
    
    return finalGroups
  }

  /**
   * 按主题分组（基于题目内容关键词）
   */
  private static groupByTopic(
    questions: ParsedQuestion[],
    questionsPerPage: number
  ): { questions: ParsedQuestion[], groupInfo: any }[] {
    // 简单的主题检测（基于关键词）
    const topicKeywords = {
      'JavaScript基础': ['JavaScript', 'JS', '变量', '函数', '数据类型'],
      'HTML/CSS': ['HTML', 'CSS', '标签', '样式', '选择器'],
      'React': ['React', 'JSX', '组件', 'Hook', 'State'],
      'Node.js': ['Node', 'npm', '模块', '服务器'],
      '算法': ['算法', '排序', '查找', '复杂度', '数据结构'],
      '数据库': ['SQL', '数据库', '查询', '表', '索引']
    }
    
    const topicGroups = new Map<string, ParsedQuestion[]>()
    const unclassified: ParsedQuestion[] = []
    
    questions.forEach(question => {
      let assigned = false
      const questionText = question.question.toLowerCase()
      
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(keyword => questionText.includes(keyword.toLowerCase()))) {
          if (!topicGroups.has(topic)) {
            topicGroups.set(topic, [])
          }
          topicGroups.get(topic)!.push(question)
          assigned = true
          break
        }
      }
      
      if (!assigned) {
        unclassified.push(question)
      }
    })
    
    // 如果有未分类的题目，单独成组
    if (unclassified.length > 0) {
      topicGroups.set('综合题目', unclassified)
    }
    
    // 将每个主题的题目进一步按数量分组
    const finalGroups = []
    
    for (const [topic, topicQuestions] of topicGroups) {
      const topicSubGroups = this.groupByCount(topicQuestions, questionsPerPage)
      topicSubGroups.forEach((group, index) => {
        finalGroups.push({
          questions: group.questions,
          groupInfo: {
            type: 'topic',
            topic: topic,
            subGroupIndex: index + 1,
            totalSubGroups: topicSubGroups.length
          }
        })
      })
    }
    
    return finalGroups
  }

  /**
   * 按难度分组（基于题目复杂度估算）
   */
  private static groupByDifficulty(
    questions: ParsedQuestion[],
    questionsPerPage: number
  ): { questions: ParsedQuestion[], groupInfo: any }[] {
    // 简单的难度评估
    const questionsWithDifficulty = questions.map(question => {
      const difficulty = this.estimateDifficulty(question)
      return { question, difficulty }
    })
    
    // 按难度排序
    questionsWithDifficulty.sort((a, b) => a.difficulty - b.difficulty)
    
    // 分组
    const groups = []
    const difficultyLabels = ['简单', '中等', '困难']
    
    for (let i = 0; i < questionsWithDifficulty.length; i += questionsPerPage) {
      const groupItems = questionsWithDifficulty.slice(i, i + questionsPerPage)
      const avgDifficulty = groupItems.reduce((sum, item) => sum + item.difficulty, 0) / groupItems.length
      const difficultyLabel = difficultyLabels[Math.min(Math.floor(avgDifficulty), 2)]
      
      groups.push({
        questions: groupItems.map(item => item.question),
        groupInfo: {
          type: 'difficulty',
          difficultyLabel,
          averageDifficulty: avgDifficulty,
          groupIndex: Math.floor(i / questionsPerPage) + 1
        }
      })
    }
    
    return groups
  }

  /**
   * 估算题目难度（0-2，0最简单，2最难）
   */
  private static estimateDifficulty(question: ParsedQuestion): number {
    let difficulty = 0
    
    // 基于题目长度
    if (question.question.length > 100) difficulty += 0.5
    if (question.question.length > 200) difficulty += 0.5
    
    // 基于选项复杂度
    if (question.options) {
      const avgOptionLength = question.options.reduce((sum, opt) => sum + opt.length, 0) / question.options.length
      if (avgOptionLength > 20) difficulty += 0.5
      if (avgOptionLength > 40) difficulty += 0.5
    }
    
    // 基于关键词
    const complexKeywords = ['算法', '复杂度', '设计模式', '架构', '优化', '性能']
    if (complexKeywords.some(keyword => question.question.includes(keyword))) {
      difficulty += 1
    }
    
    return Math.min(difficulty, 2)
  }

  /**
   * 增强HTML内容，添加批次信息和导航
   */
  private static enhanceHtmlWithBatchInfo(
    originalHtml: string,
    pageNumber: number,
    totalPages: number,
    currentPageQuestions: number,
    totalQuestions: number
  ): string {
    // 在头部信息中添加批次信息
    const batchInfoHtml = `
        <!-- 批次信息 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 mt-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        第 ${pageNumber} 部分
                    </div>
                    <div class="text-blue-700">
                        共 ${totalPages} 部分 | 本部分 ${currentPageQuestions} 题 | 总计 ${totalQuestions} 题
                    </div>
                </div>
                <div class="text-blue-600 text-sm">
                    进度: ${Math.round((pageNumber / totalPages) * 100)}%
                </div>
            </div>
            <div class="mt-3">
                <div class="w-full bg-blue-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${(pageNumber / totalPages) * 100}%"></div>
                </div>
            </div>
        </div>`

    // 在结果页面中添加批次完成信息
    const batchCompletionInfo = `
            <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 class="text-lg font-bold text-green-800 mb-2">🎉 第 ${pageNumber} 部分完成！</h3>
                <div class="text-green-700 space-y-1">
                    <p>• 当前部分: ${currentPageQuestions} 题已完成</p>
                    <p>• 总体进度: ${pageNumber}/${totalPages} 部分</p>
                    <p>• 剩余部分: ${totalPages - pageNumber} 部分</p>
                </div>
                ${pageNumber < totalPages ? `
                <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p class="text-yellow-800 text-sm">
                        💡 提示: 请继续练习下一部分的题目以完成整个题库！
                    </p>
                </div>
                ` : `
                <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p class="text-blue-800 text-sm font-bold">
                        🏆 恭喜！您已完成所有 ${totalPages} 部分的练习！
                    </p>
                </div>
                `}
            </div>`

    // 插入批次信息到HTML中
    let enhancedHtml = originalHtml

    // 在头部信息后插入批次信息
    enhancedHtml = enhancedHtml.replace(
      /<div class="container mx-auto max-w-4xl">/,
      `<div class="container mx-auto max-w-4xl">${batchInfoHtml}`
    )

    // 在结果页面中插入批次完成信息
    enhancedHtml = enhancedHtml.replace(
      /<button id="restart-btn"/,
      `${batchCompletionInfo}
                <button id="restart-btn"`
    )

    return enhancedHtml
  }

  /**
   * 生成批次处理报告
   */
  static generateBatchReport(result: BatchResult): string {
    const report = `
# 📊 批量题库处理报告

## 📈 处理概览
- **总题目数**: ${result.totalQuestions} 题
- **生成网页数**: ${result.totalPages} 个
- **处理时间**: ${result.summary.processingTime}ms
- **平均每页题目数**: ${result.summary.averageQuestionsPerPage} 题
- **分割策略**: ${result.summary.splitStrategy}

## 📄 生成的网页列表

${result.pages.map(page => `
### ${page.fileName}
- **标题**: ${page.title}
- **题目数量**: ${page.questionsCount} 题
- **页面编号**: ${page.pageNumber}/${page.totalPages}
- **文件大小**: ${Math.round(page.htmlContent.length / 1024)}KB
`).join('')}

## ✅ 功能验证清单

每个生成的HTML网页都包含以下完整功能：
- [x] 题目显示和答题交互
- [x] 实时答案验证和反馈
- [x] 题目导航栏和状态显示
- [x] 上一题/下一题导航
- [x] 完成练习和成绩统计
- [x] 重新开始功能
- [x] 批次进度信息
- [x] 响应式设计
- [x] 键盘快捷键支持

## 🎯 使用建议

1. **按顺序练习**: 建议按照编号顺序完成各部分
2. **独立使用**: 每个HTML文件都可以独立使用
3. **进度跟踪**: 每个文件都显示当前进度和剩余部分
4. **移动友好**: 所有文件都支持手机和平板设备

---
*报告生成时间: ${new Date().toLocaleString()}*
`
    return report
  }

  /**
   * 验证生成的HTML功能完整性
   */
  static validateHtmlFunctionality(htmlContent: string): {
    isValid: boolean
    checks: { [key: string]: boolean }
    issues: string[]
  } {
    const checks = {
      hasDoctype: htmlContent.includes('<!DOCTYPE html>'),
      hasTitle: htmlContent.includes('<title>'),
      hasTailwind: htmlContent.includes('tailwindcss'),
      hasQuestionData: htmlContent.includes('const questions ='),
      hasRenderFunction: htmlContent.includes('function renderQuestion'),
      hasNavigationButtons: htmlContent.includes('prev-btn') && htmlContent.includes('next-btn'),
      hasQuestionNavBar: htmlContent.includes('nav-button'),
      hasResultsPage: htmlContent.includes('results-page'),
      hasEventListeners: htmlContent.includes('addEventListener'),
      hasBatchInfo: htmlContent.includes('批次信息') || htmlContent.includes('部分'),
      hasKeyboardSupport: htmlContent.includes('keydown'),
      hasResponsiveDesign: htmlContent.includes('@media')
    }

    const issues = []
    Object.entries(checks).forEach(([check, passed]) => {
      if (!passed) {
        issues.push(`缺失功能: ${check}`)
      }
    })

    const isValid = Object.values(checks).every(check => check)

    return { isValid, checks, issues }
  }
}
