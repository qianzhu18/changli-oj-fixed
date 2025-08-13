// 测试解析修复
const fs = require('fs')

console.log('🧪 测试解析修复功能...\n')

// 模拟手动解析函数
function parseContentManually(content) {
  try {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const questions = []
    let currentQuestion = {}
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
function finalizeCurrentQuestion(currentQuestion, questions, index) {
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

// 测试文件
const testFiles = ['test-quiz-simple.txt', 'test-quiz-comprehensive.txt']

testFiles.forEach(fileName => {
  if (fs.existsSync(fileName)) {
    console.log(`\n📁 测试文件: ${fileName}`)
    const content = fs.readFileSync(fileName, 'utf8')
    console.log(`   文件大小: ${content.length} 字符`)
    
    const result = parseContentManually(content)
    
    if (result) {
      console.log(`   ✅ 解析成功: ${result.questions.length} 题`)
      console.log(`   📝 标题: ${result.title}`)
      
      result.questions.forEach((q, index) => {
        console.log(`   题目 ${index + 1}:`)
        console.log(`     问题: ${q.question.substring(0, 50)}...`)
        console.log(`     选项数: ${q.options.length}`)
        console.log(`     正确答案: ${String.fromCharCode(65 + q.correctAnswer)}`)
        console.log(`     有解释: ${q.explanation ? '是' : '否'}`)
      })
    } else {
      console.log(`   ❌ 解析失败`)
    }
  } else {
    console.log(`\n❌ 文件不存在: ${fileName}`)
  }
})

console.log('\n🎯 测试完成！')
console.log('\n📖 下一步:')
console.log('1. 打开浏览器: http://localhost:3000')
console.log('2. 上传测试文件')
console.log('3. 验证刷题功能是否正常工作')
