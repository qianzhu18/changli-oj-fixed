// 测试增强的题库解析器
const fs = require('fs')

// 模拟QuizParser类（简化版）
class QuizParser {
  static parseQuizContent(content) {
    console.log('开始解析内容:', content.substring(0, 200) + '...')
    
    // 检测格式
    const format = this.detectContentFormat(content)
    console.log('检测到的格式:', format)
    
    // 尝试提取题目
    const questions = this.extractQuestionsFromText(content)
    console.log('提取到的题目数量:', questions.length)
    
    return {
      title: "测试题库",
      questions: questions,
      totalQuestions: questions.length
    }
  }
  
  static detectContentFormat(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    let hasQuestions = false
    let hasOptions = false
    let hasAnswers = false
    
    for (const line of lines) {
      if (line.includes('？') || line.includes('?')) {
        hasQuestions = true
      }
      if (/^[A-D][.、]\s*.+/.test(line)) {
        hasOptions = true
      }
      if (/^答案[：:]\s*[A-D]/.test(line)) {
        hasAnswers = true
      }
    }
    
    if (hasQuestions && hasOptions && hasAnswers) {
      return 'standard'
    } else if (hasQuestions) {
      return 'mixed'
    }
    
    return 'unknown'
  }
  
  static extractQuestionsFromText(content) {
    const questions = []
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    let currentQuestion = {}
    let questionCounter = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // 检查是否包含问号，可能是题目
      if (line.includes('？') || line.includes('?')) {
        if (currentQuestion.question) {
          // 保存上一题
          this.finalizeQuestion(currentQuestion, questions, questionCounter)
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
      this.finalizeQuestion(currentQuestion, questions, questionCounter)
    }
    
    return questions
  }
  
  static finalizeQuestion(currentQuestion, questions, questionCounter) {
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
}

// 测试函数
function testParser() {
  console.log('=== 测试增强的题库解析器 ===\n')
  
  // 读取测试文件
  const testContent = fs.readFileSync('test-quiz-simple.txt', 'utf8')
  console.log('测试内容:')
  console.log(testContent)
  console.log('\n' + '='.repeat(50) + '\n')
  
  // 解析内容
  const result = QuizParser.parseQuizContent(testContent)
  
  console.log('解析结果:')
  console.log(JSON.stringify(result, null, 2))
  
  console.log('\n=== 测试完成 ===')
}

// 运行测试
testParser()
