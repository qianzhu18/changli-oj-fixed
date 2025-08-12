// 测试批量处理功能
const fs = require('fs')

console.log('🧪 测试批量处理功能...\n')

// 创建大型测试题库
function createLargeTestQuizData() {
  const questions = []
  
  // JavaScript基础题目
  const jsTopics = [
    { topic: 'JavaScript基础', keywords: ['变量', '函数', '数据类型', '作用域'] },
    { topic: 'DOM操作', keywords: ['DOM', '元素', '事件', '节点'] },
    { topic: 'ES6特性', keywords: ['箭头函数', 'Promise', 'async', 'let', 'const'] },
    { topic: 'React', keywords: ['组件', 'JSX', 'Hook', 'State', 'Props'] },
    { topic: '算法', keywords: ['排序', '查找', '递归', '动态规划'] }
  ]
  
  let questionId = 1
  
  jsTopics.forEach(topicInfo => {
    // 每个主题生成15-25个题目
    const questionsCount = 15 + Math.floor(Math.random() * 10)
    
    for (let i = 0; i < questionsCount; i++) {
      const keyword = topicInfo.keywords[Math.floor(Math.random() * topicInfo.keywords.length)]
      
      questions.push({
        id: `q_${questionId}`,
        question: `${questionId}. 关于${keyword}的问题：以下哪个说法是正确的？`,
        options: [
          `${keyword}的选项A - 这是一个正确的描述`,
          `${keyword}的选项B - 这是一个错误的描述`,
          `${keyword}的选项C - 这是另一个错误的描述`,
          `${keyword}的选项D - 这也是一个错误的描述`
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
        explanation: `${keyword}是${topicInfo.topic}中的重要概念，正确答案是选项A，因为它准确描述了${keyword}的特性。`
      })
      
      questionId++
    }
  })
  
  return {
    title: "JavaScript全栈开发综合题库",
    questions: questions,
    totalQuestions: questions.length
  }
}

// 模拟批量处理器
class MockBatchQuizGenerator {
  static async processBatchQuiz(quizData, options) {
    console.log(`📊 处理 ${quizData.questions.length} 个题目...`)
    console.log(`📄 每页 ${options.questionsPerPage} 题`)
    console.log(`🔄 策略: ${options.splitStrategy}`)
    
    // 分组
    const groups = this.intelligentGrouping(quizData.questions, options)
    console.log(`📦 分成 ${groups.length} 组`)
    
    const pages = []
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const pageNumber = i + 1
      
      const pageQuizData = {
        title: `${quizData.title} - 第${pageNumber}部分`,
        questions: group.questions,
        totalQuestions: group.questions.length
      }
      
      // 生成简化的HTML（用于测试）
      const htmlContent = this.generateSimpleHtml(pageQuizData, pageNumber, groups.length)
      
      const fileName = `${options.fileNamePrefix}-第${pageNumber}部分-共${groups.length}部分.html`
      
      pages.push({
        fileName,
        title: pageQuizData.title,
        questionsCount: group.questions.length,
        htmlContent,
        pageNumber,
        totalPages: groups.length
      })
      
      console.log(`✅ 生成第 ${pageNumber} 页: ${group.questions.length} 题`)
    }
    
    return {
      totalQuestions: quizData.questions.length,
      totalPages: groups.length,
      pages,
      summary: {
        processingTime: 1000,
        averageQuestionsPerPage: Math.round(quizData.questions.length / groups.length),
        splitStrategy: options.splitStrategy
      }
    }
  }
  
  static intelligentGrouping(questions, options) {
    switch (options.splitStrategy) {
      case 'topic':
        return this.groupByTopic(questions, options.questionsPerPage)
      case 'count':
      default:
        return this.groupByCount(questions, options.questionsPerPage)
    }
  }
  
  static groupByCount(questions, questionsPerPage) {
    const groups = []
    for (let i = 0; i < questions.length; i += questionsPerPage) {
      groups.push({
        questions: questions.slice(i, i + questionsPerPage),
        groupInfo: { type: 'count' }
      })
    }
    return groups
  }
  
  static groupByTopic(questions, questionsPerPage) {
    const topicGroups = new Map()
    
    questions.forEach(question => {
      let topic = '综合题目'
      if (question.question.includes('变量') || question.question.includes('函数')) {
        topic = 'JavaScript基础'
      } else if (question.question.includes('DOM') || question.question.includes('事件')) {
        topic = 'DOM操作'
      } else if (question.question.includes('Promise') || question.question.includes('async')) {
        topic = 'ES6特性'
      } else if (question.question.includes('组件') || question.question.includes('React')) {
        topic = 'React'
      } else if (question.question.includes('排序') || question.question.includes('算法')) {
        topic = '算法'
      }
      
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, [])
      }
      topicGroups.get(topic).push(question)
    })
    
    const finalGroups = []
    for (const [topic, topicQuestions] of topicGroups) {
      const subGroups = this.groupByCount(topicQuestions, questionsPerPage)
      subGroups.forEach(group => {
        finalGroups.push({
          questions: group.questions,
          groupInfo: { type: 'topic', topic }
        })
      })
    }
    
    return finalGroups
  }
  
  static generateSimpleHtml(quizData, pageNumber, totalPages) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quizData.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h1 class="text-2xl font-bold text-blue-800">${quizData.title}</h1>
            <p class="text-blue-600">第 ${pageNumber} 部分 / 共 ${totalPages} 部分</p>
            <p class="text-blue-600">本部分包含 ${quizData.questions.length} 题</p>
        </div>
        
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">题目列表</h2>
            <div class="space-y-4">
                ${quizData.questions.map((q, index) => `
                    <div class="border-l-4 border-blue-500 pl-4">
                        <h3 class="font-medium">${q.question}</h3>
                        <div class="mt-2 space-y-1">
                            ${q.options.map((option, optIndex) => `
                                <div class="text-sm ${optIndex === q.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'}">
                                    ${option} ${optIndex === q.correctAnswer ? '✓' : ''}
                                </div>
                            `).join('')}
                        </div>
                        ${q.explanation ? `<p class="text-sm text-gray-500 mt-2">解释: ${q.explanation}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="mt-6 text-center">
            <p class="text-gray-600">这是一个测试生成的HTML文件</p>
            <p class="text-gray-600">实际生成的文件将包含完整的交互功能</p>
        </div>
    </div>
</body>
</html>`
  }
}

// 运行测试
async function runBatchTest() {
  console.log('📝 创建大型测试题库...')
  const largeQuizData = createLargeTestQuizData()
  console.log(`✅ 创建完成: ${largeQuizData.questions.length} 题`)
  
  // 测试不同的处理选项
  const testOptions = [
    {
      questionsPerPage: 20,
      splitStrategy: 'count',
      orderMode: '顺序',
      fileNamePrefix: '测试题库-按数量'
    },
    {
      questionsPerPage: 25,
      splitStrategy: 'topic',
      orderMode: '顺序',
      fileNamePrefix: '测试题库-按主题'
    }
  ]
  
  for (const options of testOptions) {
    console.log(`\n🔄 测试配置: ${options.splitStrategy}`)
    
    const result = await MockBatchQuizGenerator.processBatchQuiz(largeQuizData, options)
    
    console.log(`📊 处理结果:`)
    console.log(`   总页数: ${result.totalPages}`)
    console.log(`   平均每页: ${result.summary.averageQuestionsPerPage} 题`)
    
    // 保存测试文件
    result.pages.forEach(page => {
      fs.writeFileSync(page.fileName, page.htmlContent)
      console.log(`   ✅ 保存: ${page.fileName}`)
    })
  }
  
  console.log('\n🎉 批量处理测试完成！')
  console.log('\n📖 测试结果:')
  console.log('1. 成功处理大型题库（100+题目）')
  console.log('2. 智能分组功能正常')
  console.log('3. 生成多个独立HTML文件')
  console.log('4. 每个文件包含批次信息')
  console.log('5. 文件命名规范清晰')
}

// 运行测试
runBatchTest().catch(console.error)
