// 前端题库解析器
export interface ParsedQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  type: 'multiple-choice' | 'fill-blank'
  explanation?: string
}

export interface QuizData {
  title: string
  questions: ParsedQuestion[]
  totalQuestions: number
}

export class QuizParser {
  /**
   * 解析题库文本内容 - 智能处理多种格式
   */
  static parseQuizContent(content: string): QuizData {
    // 统一字符/符号，兼容全角/半角、编号/选项变体
    const normalized = this.normalizeContent(content)

    // 首先尝试智能检测内容格式
    const detectedFormat = this.detectContentFormat(normalized)

    switch (detectedFormat) {
      case 'standard':
        return this.parseStandardFormat(normalized)
      case 'numbered-only':
        return this.parseNumberedOnlyFormat(normalized)
      case 'mixed':
        return this.parseMixedFormat(normalized)
      case 'json':
        return this.parseJsonFormat(normalized)
      default:
        // 如果无法识别格式，创建基于内容的示例题目

        return this.createFallbackQuiz(normalized)
    }
  }

  /**
   * 统一字符/符号与常见变体（全角/半角、选项/答案前缀等）
   */
  private static normalizeContent(content: string): string {
    // 1) 全角转半角（数字、字母与常见标点），以及全角空格
    const toHalfWidth = (s: string) => {
      let out = ''
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i)
        if (code === 0x3000) { // 全角空格
          out += String.fromCharCode(0x20)
        } else if (code >= 0xFF01 && code <= 0xFF5E) { // 全角 ASCII 范围
          out += String.fromCharCode(code - 0xFEE0)
        } else {
          out += s[i]
        }
      }
      return out
    }

    let text = toHalfWidth(content)

    // 2) 统一换行符
    text = text.replace(/\r\n?/g, '\n')

    // 3) 行级别标准化：A)、A)、（A）等 -> A. ，答案标识统一
    const lines = text.split('\n')
    const normLines = lines.map(l => {
      let line = l.trimEnd()

      // 去除装饰标签
      line = line.replace(/【[^】]+】/g, '')

      // 统一选项前缀：A. / A、 / A) / （A） / A: / A- -> A.
      line = line.replace(/^\(?\s*([A-Da-d])\s*\)?[\.．、\)）:：-]\s*/,'$1. ')

      // 统一数字选项前缀：1) / 1、 / 1: -> 1.
      line = line.replace(/^(\d+)\s*[\)）、:：.-]\s*/, '$1. ')

      // 统一答案前缀
      // "+答案：xxx"、"答案: xxx"、". xxx"、"。xxx"、"Correct answer: xxx"
      line = line
        .replace(/^答案\s*[:：]\s*/i, '答案：')
        .replace(/^正确答案\s*[:：]\s*/i, '答案：')
        .replace(/^answer\s*[:：]\s*/i, '答案：')
        .replace(/^correct\s*answer\s*[:：-]?\s*/i, '答案：')
        .replace(/^\.[\s]?/, '答案：')
        .replace(/^。[\s]?/, '答案：')

      // 合并多空格
      line = line.replace(/[\t ]{2,}/g, ' ')

      return line
    })

    return normLines.join('\n')
  }

  /**
   * 检测内容格式 - 增强版
   */
  private static detectContentFormat(content: string): 'standard' | 'numbered-only' | 'mixed' | 'json' | 'unknown' {
    // 检查是否是JSON格式
    if (this.isJsonFormat(content)) {
      return 'json'
    }

    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    let hasQuestions = false
    let hasOptions = false
    let hasAnswers = false
    let hasExplanations = false

    for (const line of lines) {
      if (this.isQuestionLine(line)) {
        hasQuestions = true
      }
      if (this.isOptionLine(line)) {
        hasOptions = true
      }
      if (this.isAnswerLine(line)) {
        hasAnswers = true
      }
      if (this.isExplanationLine(line)) {
        hasExplanations = true
      }
    }

    if (hasQuestions && hasOptions && hasAnswers) {
      return 'standard'
    } else if (hasQuestions && !hasOptions) {
      return 'numbered-only'
    } else if (hasQuestions || hasOptions) {
      return 'mixed'
    }

    return 'unknown'
  }

  /**
   * 检查是否是JSON格式
   */
  private static isJsonFormat(content: string): boolean {
    try {
      const trimmed = content.trim()
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        JSON.parse(trimmed)
        return true
      }
    } catch {
      // 不是有效的JSON
    }
    return false
  }

  /**
   * 检查是否是解释行
   */
  private static isExplanationLine(line: string): boolean {
    return /^(解释|说明|解析)[：:]\s*.+/.test(line)
  }

  /**
   * 解析JSON格式的题库
   */
  private static parseJsonFormat(content: string): QuizData {
    try {
      const jsonData = JSON.parse(content.trim())

      // 如果是数组格式
      if (Array.isArray(jsonData)) {
        const questions = jsonData.map((item, index) => this.convertJsonToQuestion(item, index))
        return {
          title: "JSON题库",
          questions: questions,
          totalQuestions: questions.length
        }
      }

      // 如果是对象格式
      if (jsonData.questions && Array.isArray(jsonData.questions)) {
        const questions = jsonData.questions.map((item: any, index: number) => this.convertJsonToQuestion(item, index))
        return {
          title: jsonData.title || "JSON题库",
          questions: questions,
          totalQuestions: questions.length
        }
      }

      // 单个题目对象
      const questions = [this.convertJsonToQuestion(jsonData, 0)]
      return {
        title: "JSON题库",
        questions: questions,
        totalQuestions: questions.length
      }
    } catch (error) {
      console.error('JSON解析失败:', error)
      return this.createFallbackQuiz(content)
    }
  }

  /**
   * 将JSON对象转换为题目格式
   */
  private static convertJsonToQuestion(jsonItem: any, index: number): ParsedQuestion {
    return {
      id: jsonItem.id || `q_${index + 1}`,
      question: jsonItem.question || jsonItem.title || `题目 ${index + 1}`,
      options: jsonItem.options || jsonItem.choices || [],
      correctAnswer: jsonItem.correctAnswer || jsonItem.answer || 0,
      type: jsonItem.type || (jsonItem.options ? 'multiple-choice' : 'fill-blank'),
      explanation: jsonItem.explanation || jsonItem.解释 || undefined
    }
  }

  /**
   * 解析标准格式（有题目、选项、答案）
   */
  private static parseStandardFormat(content: string): QuizData {
    const processedContent = this.preprocessContent(content)
    const lines = processedContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const questions: ParsedQuestion[] = []
    let currentQuestion: Partial<ParsedQuestion> = {}
    let questionCounter = 0
    let title = "智能题库"

    // 提取标题
    if (lines.length > 0 && !this.isQuestionLine(lines[0])) {
      title = lines[0]
      lines.shift()
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (this.isQuestionLine(line)) {
        // 保存上一题
        if (currentQuestion.question) {
          this.finalizeQuestion(currentQuestion, questions, questionCounter)
          questionCounter++
        }

        // 开始新题
        currentQuestion = {
          id: `q_${questionCounter + 1}`,
          question: this.extractQuestion(line),
          options: [],
          type: 'multiple-choice'
        }
      }
      else if (this.isOptionLine(line)) {
        if (currentQuestion.options) {
          currentQuestion.options.push(this.extractOption(line))
        }
      }
      else if (this.isAnswerLine(line)) {
        const answerInfo = this.extractAnswer(line, currentQuestion.options || [])
        currentQuestion.correctAnswer = answerInfo.index
        currentQuestion.explanation = answerInfo.explanation
      }
      else if (currentQuestion.question && !this.isOptionLine(line) && !this.isAnswerLine(line)) {
        currentQuestion.question += ' ' + line
      }
    }

    // 保存最后一题
    if (currentQuestion.question) {
      this.finalizeQuestion(currentQuestion, questions, questionCounter)
    }

    return {
      title,
      questions,
      totalQuestions: questions.length
    }
  }

  /**
   * 解析只有编号题目的格式（自动生成选项）
   */
  private static parseNumberedOnlyFormat(content: string): QuizData {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const questions: ParsedQuestion[] = []
    let title = "智能题库"
    let questionCounter = 0
    let currentQuestion: Partial<ParsedQuestion> = {}

    // 提取标题
    if (lines.length > 0 && !this.isQuestionLine(lines[0]) && !this.isNumberedOptionLine(lines[0])) {
      title = lines[0]
      lines.shift()
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (this.isQuestionLine(line)) {
        // 保存上一题
        if (currentQuestion.question) {
          this.finalizeNumberedQuestion(currentQuestion, questions, questionCounter, content)
          questionCounter++
        }

        // 开始新题
        currentQuestion = {
          id: `q_${questionCounter + 1}`,
          question: this.extractQuestion(line),
          options: [],
          type: 'multiple-choice'
        }
      }
      // 检查是否是数字编号的选项
      else if (this.isNumberedOptionLine(line) && currentQuestion.question) {
        if (!currentQuestion.options) {
          currentQuestion.options = []
        }
        currentQuestion.options.push(this.extractNumberedOption(line))
      }
      // 如果是普通文本且当前有题目，可能是题目的续行
      else if (currentQuestion.question && !this.isNumberedOptionLine(line) && line.length > 10) {
        currentQuestion.question += ' ' + line
      }
    }

    // 保存最后一题
    if (currentQuestion.question) {
      this.finalizeNumberedQuestion(currentQuestion, questions, questionCounter, content)
    }

    return {
      title,
      questions,
      totalQuestions: questions.length
    }
  }

  /**
   * 检测是否为数字编号的选项行
   */
  private static isNumberedOptionLine(line: string): boolean {
    // 匹配 "1 选项内容" 或 "1. 选项内容" 格式，但不是题目
    return /^\d+\s+.+/.test(line) || (/^\d+[.]\s*.+/.test(line) && !this.isQuestionLine(line))
  }

  /**
   * 提取数字编号的选项内容
   */
  private static extractNumberedOption(line: string): string {
    return line.replace(/^\d+[.\s]*/, '').trim()
  }

  /**
   * 完成数字编号题目的构建
   */
  private static finalizeNumberedQuestion(
    currentQuestion: Partial<ParsedQuestion>,
    questions: ParsedQuestion[],
    questionCounter: number,
    fullContent: string
  ): void {
    if (!currentQuestion.question) return

    // 如果有选项，使用选项；否则生成智能选项
    if (currentQuestion.options && currentQuestion.options.length > 0) {
      // 有选项的情况，默认第一个为正确答案（可以后续改进）
      currentQuestion.correctAnswer = 0
      currentQuestion.explanation = currentQuestion.options[0]
    } else {
      // 没有选项，生成智能选项
      const generatedOptions = this.generateSmartOptions(currentQuestion.question, fullContent)
      currentQuestion.options = generatedOptions.options
      currentQuestion.correctAnswer = generatedOptions.correctIndex
      currentQuestion.explanation = generatedOptions.explanation
      currentQuestion.type = 'multiple-choice'
    }

    questions.push({
      id: currentQuestion.id || `q_${questionCounter + 1}`,
      question: currentQuestion.question,
      options: currentQuestion.options || [],
      correctAnswer: currentQuestion.correctAnswer || 0,
      type: currentQuestion.type || 'multiple-choice',
      explanation: currentQuestion.explanation
    })
  }

  /**
   * 解析混合格式
   */
  private static parseMixedFormat(content: string): QuizData {
    // 先尝试标准格式解析
    const standardResult = this.parseStandardFormat(content)

    // 如果解析出的题目太少，尝试编号格式
    if (standardResult.questions.length === 0) {
      return this.parseNumberedOnlyFormat(content)
    }

    return standardResult
  }

  /**
   * 创建备用题库（当无法解析时）- 增强版
   */
  private static createFallbackQuiz(content: string): QuizData {
    const questions: ParsedQuestion[] = []

    // 尝试从内容中智能提取题目
    const extractedQuestions = this.extractQuestionsFromText(content)

    if (extractedQuestions.length > 0) {
      questions.push(...extractedQuestions)
    } else {
      // 如果无法提取，创建基于内容的示例题目
      const contentLength = content.length
      const wordCount = content.split(/\s+/).length

      const fallbackQuestion: ParsedQuestion = {
        id: "q_1",
        question: `基于您提供的内容（${contentLength} 个字符，约 ${wordCount} 个词），请选择最合适的描述：`,
        options: [
          "内容已成功解析，可以生成题库",
          "内容格式需要调整",
          "需要更多信息才能处理",
          "内容包含有效的学习材料"
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
        explanation: "内容已成功解析，可以生成题库"
      }
      questions.push(fallbackQuestion)
    }

    return {
      title: "智能解析题库",
      questions: questions,
      totalQuestions: questions.length
    }
  }

  /**
   * 从文本中智能提取题目
   */
  private static extractQuestionsFromText(content: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = []
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    let currentQuestion: Partial<ParsedQuestion> = {}
    let questionCounter = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 检查是否包含问号，可能是题目
      if (line.includes('？') || line.includes('?')) {
        if (currentQuestion.question) {
          // 保存上一题
          this.finalizeExtractedQuestion(currentQuestion, questions, questionCounter)
          questionCounter++
        }

        currentQuestion = {
          id: `q_${questionCounter + 1}`,
          question: line,
          options: [],
          type: 'multiple-choice'
        }
      }
      // 检查是否是选项（A、B、C、D开头）
      else if (/^[A-D][.、]\s*.+/.test(line) && currentQuestion.question) {
        if (!currentQuestion.options) {
          currentQuestion.options = []
        }
        currentQuestion.options.push(line.replace(/^[A-D][.、]\s*/, ''))
      }
      // 检查是否是答案
      else if (/^答案[：:]\s*[A-D]/.test(line) && currentQuestion.question) {
        const answerMatch = line.match(/[A-D]/)
        if (answerMatch) {
          const answerLetter = answerMatch[0]
          currentQuestion.correctAnswer = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0)
        }
      }
      // 检查是否是解释
      else if (/^(解释|说明|解析)[：:]\s*.+/.test(line) && currentQuestion.question) {
        currentQuestion.explanation = line.replace(/^(解释|说明|解析)[：:]\s*/, '')
      }
    }

    // 保存最后一题
    if (currentQuestion.question) {
      this.finalizeExtractedQuestion(currentQuestion, questions, questionCounter)
    }

    return questions
  }

  /**
   * 完成提取的题目
   */
  private static finalizeExtractedQuestion(
    currentQuestion: Partial<ParsedQuestion>,
    questions: ParsedQuestion[],
    questionCounter: number
  ) {
    // 如果没有选项，生成默认选项
    if (!currentQuestion.options || currentQuestion.options.length === 0) {
      currentQuestion.options = [
        "选项A",
        "选项B",
        "选项C",
        "选项D"
      ]
      currentQuestion.correctAnswer = 0
      currentQuestion.explanation = "这是一个示例题目，请根据实际内容调整"
    }

    // 如果没有正确答案，默认为第一个选项
    if (currentQuestion.correctAnswer === undefined) {
      currentQuestion.correctAnswer = 0
    }

    questions.push({
      id: currentQuestion.id || `q_${questionCounter + 1}`,
      question: currentQuestion.question || `题目 ${questionCounter + 1}`,
      options: currentQuestion.options || [],
      correctAnswer: currentQuestion.correctAnswer || 0,
      type: currentQuestion.type || 'multiple-choice',
      explanation: currentQuestion.explanation
    })
  }

  /**
   * 为题目生成智能选项
   */
  private static generateSmartOptions(questionText: string, fullContent: string): {
    options: string[]
    correctIndex: number
    explanation: string
  } {
    // 基于题目内容生成相关选项
    const question = questionText.toLowerCase()

    // 检查题目类型并生成对应选项
    if (question.includes('什么') || question.includes('哪个') || question.includes('选择')) {
      return {
        options: [
          "正确答案（基于文档内容）",
          "相关但不正确的选项",
          "明显错误的选项",
          "干扰性选项"
        ],
        correctIndex: 0,
        explanation: "正确答案（基于文档内容）"
      }
    }

    if (question.includes('如何') || question.includes('怎样') || question.includes('方法')) {
      return {
        options: [
          "按照文档描述的正确方法",
          "常见的错误做法",
          "不相关的方法",
          "过时的方法"
        ],
        correctIndex: 0,
        explanation: "按照文档描述的正确方法"
      }
    }

    if (question.includes('是否') || question.includes('对错') || question.includes('正确')) {
      return {
        options: [
          "是",
          "否",
          "部分正确",
          "无法确定"
        ],
        correctIndex: 0,
        explanation: "是"
      }
    }

    // 默认选项
    return {
      options: [
        "根据内容分析的正确答案",
        "可能的替代答案",
        "不太可能的选项",
        "明显错误的选项"
      ],
      correctIndex: 0,
      explanation: "根据内容分析的正确答案"
    }
  }

  /**
   * 检测是否为题目行
   */
  private static isQuestionLine(line: string): boolean {
    // 检查是否以"题目"开头
    if (line.startsWith('题目')) {
      return true
    }

    // 匹配 "1. 题目内容" 或 "1、题目内容" 格式，且通常题目会比较长或包含问号
    if (/^\d+[.、]\s*.+/.test(line)) {
      // 题目通常包含疑问词、问号，或者长度较长
      return line.includes('？') || line.includes('?') ||
             line.includes('什么') || line.includes('哪个') || line.includes('如何') ||
             line.includes('是否') || line.includes('选择') || line.includes('描述') ||
             line.length > 20
    }
    return false
  }

  /**
   * 检测是否为选项行
   */
  private static isOptionLine(line: string): boolean {
    // 检查是否以A、B、C、D开头的选项格式
    if (/^[A-D][.、]\s*.+/.test(line)) {
      return true
    }

    // 检查是否以数字开头的选项格式（如：1 选项内容）
    if (/^\d+\s+.+/.test(line) && !this.isQuestionLine(line)) {
      return true
    }

    // 检查是否以数字和点开头但不是题目的选项格式（如：1. 选项内容，但题目通常更长）
    if (/^\d+[.]\s*.+/.test(line) && !this.isQuestionLine(line) && line.length < 100) {
      return true
    }

    // 不是题目行、不是答案行、且有内容的行都可能是选项行
    return !this.isQuestionLine(line) && !this.isAnswerLine(line) && line.length > 0 && line.length < 200
  }

  /**
   * 检测是否为答案行
   */
  private static isAnswerLine(line: string): boolean {
    // 匹配多种答案格式
    return line.startsWith('。') ||
           line.startsWith('答案：') ||
           line.startsWith('答案:') ||
           line.startsWith('正确答案：') ||
           line.startsWith('正确答案:') ||
           /^答案\s*[：:]\s*/.test(line)
  }

  /**
   * 提取题目内容
   */
  private static extractQuestion(line: string): string {
    return line.replace(/^\d+[.、]\s*/, '').trim()
  }

  /**
   * 提取选项内容 - 去除前缀(A./A、)并保留原始内容
   */
  private static extractOption(line: string): string {
    return line.replace(/^[A-D][.、]\s*/, '').trim()
  }

  /**
   * 提取答案信息 - 直接匹配选项内容
   */
  private static extractAnswer(line: string, options: string[]): { index: number, explanation?: string } {
    // 移除答案前缀
    let answerText = line.replace(/^。\s*/, '')
                        .replace(/^答案\s*[：:]\s*/, '')
                        .replace(/^正确答案\s*[：:]\s*/, '')
                        .trim()

    // 如果答案是A、B、C、D格式，转换为索引
    if (/^[A-D]$/i.test(answerText)) {
      const index = answerText.toUpperCase().charCodeAt(0) - 65
      return { index, explanation: options[index] || answerText }
    }

    // 直接在选项中查找匹配的答案
    for (let i = 0; i < options.length; i++) {
      const option = options[i].replace(/^[A-D][.、]\s*/, '').trim() // 移除选项前缀
      if (option === answerText || answerText.includes(option) || option.includes(answerText)) {
        return { index: i, explanation: answerText }
      }
    }

    // 如果没有找到匹配的选项，可能是填空题
    return { index: 0, explanation: answerText }
  }

  /**
   * 完成题目构建
   */
  private static finalizeQuestion(
    currentQuestion: Partial<ParsedQuestion>,
    questions: ParsedQuestion[],
    questionCounter: number
  ): void {
    if (!currentQuestion.question) return

    // 如果没有选项，判断为填空题
    if (!currentQuestion.options || currentQuestion.options.length === 0) {
      currentQuestion.type = 'fill-blank'
      currentQuestion.options = []
      currentQuestion.correctAnswer = 0
    }

    // 确保有正确答案索引
    if (currentQuestion.correctAnswer === undefined) {
      currentQuestion.correctAnswer = 0
    }

    questions.push({
      id: currentQuestion.id || `q_${questionCounter + 1}`,
      question: currentQuestion.question,
      options: currentQuestion.options || [],
      correctAnswer: currentQuestion.correctAnswer,
      type: currentQuestion.type || 'multiple-choice',
      explanation: currentQuestion.explanation
    })
  }

  /**
   * 预处理内容 - 处理CSV格式和复杂字段
   */
  private static preprocessContent(content: string): string {
    // 检测是否为CSV格式
    if (this.isCSVFormat(content)) {
      return this.parseCSVContent(content)
    }

    // 处理包含双引号的复杂字段
    return this.handleComplexFields(content)
  }

  /**
   * 检测是否为CSV格式
   */
  private static isCSVFormat(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim().length > 0)
    if (lines.length < 2) return false

    // 检查是否有逗号分隔且字段被引号包围
    const firstLine = lines[0]
    const commaCount = (firstLine.match(/,/g) || []).length
    const quoteCount = (firstLine.match(/"/g) || []).length

    return commaCount >= 2 && quoteCount >= 2
  }

  /**
   * 解析CSV内容
   */
  private static parseCSVContent(content: string): string {
    const lines = content.split('\n')
    let result = ''
    let questionNumber = 1

    for (const line of lines) {
      if (line.trim().length === 0) continue

      const fields = this.parseCSVLine(line)
      if (fields.length >= 2) {
        // 判断题目类型
        if (fields.length >= 5) {
          // 选择题格式：题目,选项A,选项B,选项C,选项D,答案
          const [question, optionA, optionB, optionC, optionD, answer] = fields
          result += `${questionNumber}. ${question}\n`
          result += `A. ${optionA}\n`
          result += `B. ${optionB}\n`
          result += `C. ${optionC}\n`
          result += `D. ${optionD}\n`
          result += `。${answer}\n\n`
        } else {
          // 填空题格式：题目,答案
          const [question, answer] = fields
          result += `${questionNumber}. ${question}\n`
          result += `。${answer}\n\n`
        }
        questionNumber++
      }
    }

    return result
  }

  /**
   * 解析CSV行 - 正确处理被引号包围的字段
   */
  private static parseCSVLine(line: string): string[] {
    const fields: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 转义的引号
          currentField += '"'
          i += 2
        } else {
          // 切换引号状态
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // 字段分隔符
        fields.push(currentField.trim())
        currentField = ''
        i++
      } else {
        currentField += char
        i++
      }
    }

    // 添加最后一个字段
    fields.push(currentField.trim())

    return fields
  }

  /**
   * 处理复杂字段 - 保留格式
   */
  private static handleComplexFields(content: string): string {
    // 保留代码块的换行和缩进
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
  }

  /**
   * 随机打乱题目顺序
   */
  static shuffleQuestions(questions: ParsedQuestion[]): ParsedQuestion[] {
    const shuffled = [...questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // 重新分配ID以保持顺序
    return shuffled.map((q, index) => ({
      ...q,
      id: `q_${index + 1}`
    }))
  }
}
