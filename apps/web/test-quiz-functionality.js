// 完整的刷题功能测试脚本
const fs = require('fs')

// 模拟QuizParser和QuizHtmlGenerator
const { QuizParser } = require('./lib/quiz-parser')
const { QuizHtmlGenerator } = require('./lib/quiz-html-generator')

async function testCompleteQuizFlow() {
  console.log('🧪 开始完整的刷题功能测试\n')
  
  try {
    // 1. 测试文件读取
    console.log('📁 1. 测试文件读取...')
    const testFiles = [
      'test-quiz-simple.txt',
      'test-quiz-comprehensive.txt'
    ]
    
    for (const fileName of testFiles) {
      if (fs.existsSync(fileName)) {
        const content = fs.readFileSync(fileName, 'utf8')
        console.log(`   ✅ ${fileName}: ${content.length} 字符`)
      } else {
        console.log(`   ❌ ${fileName}: 文件不存在`)
      }
    }
    
    // 2. 测试题库解析
    console.log('\n🔍 2. 测试题库解析...')
    const testContent = fs.readFileSync('test-quiz-comprehensive.txt', 'utf8')
    const parsedQuiz = QuizParser.parseQuizContent(testContent)
    
    console.log(`   ✅ 解析成功: ${parsedQuiz.questions.length} 个题目`)
    console.log(`   📝 题库标题: ${parsedQuiz.title}`)
    
    // 验证题目结构
    let validQuestions = 0
    for (const question of parsedQuiz.questions) {
      if (question.question && question.options && question.options.length > 0) {
        validQuestions++
      }
    }
    console.log(`   ✅ 有效题目: ${validQuestions}/${parsedQuiz.questions.length}`)
    
    // 3. 测试HTML生成
    console.log('\n🌐 3. 测试HTML生成...')
    const htmlContent = QuizHtmlGenerator.generateQuizHtml(parsedQuiz)
    
    console.log(`   ✅ HTML生成成功: ${htmlContent.length} 字符`)
    console.log(`   📄 包含CSS样式: ${htmlContent.includes('<style>') ? '是' : '否'}`)
    console.log(`   ⚡ 包含JavaScript: ${htmlContent.includes('<script>') ? '是' : '否'}`)
    console.log(`   🎯 包含题目数据: ${htmlContent.includes('quizData') ? '是' : '否'}`)
    
    // 4. 保存生成的HTML文件
    console.log('\n💾 4. 保存HTML文件...')
    const outputFileName = 'generated-comprehensive-quiz.html'
    fs.writeFileSync(outputFileName, htmlContent)
    console.log(`   ✅ 文件已保存: ${outputFileName}`)
    
    // 5. 验证HTML结构
    console.log('\n🔍 5. 验证HTML结构...')
    const validationResults = validateHtmlStructure(htmlContent)
    
    if (validationResults.isValid) {
      console.log('   ✅ HTML结构验证通过')
    } else {
      console.log('   ❌ HTML结构验证失败:')
      validationResults.errors.forEach(error => {
        console.log(`      - ${error}`)
      })
    }
    
    // 6. 测试题目数据完整性
    console.log('\n📊 6. 测试题目数据完整性...')
    const dataIntegrityResults = validateQuestionData(parsedQuiz.questions)
    
    console.log(`   📝 题目总数: ${dataIntegrityResults.totalQuestions}`)
    console.log(`   ✅ 完整题目: ${dataIntegrityResults.completeQuestions}`)
    console.log(`   ⚠️  不完整题目: ${dataIntegrityResults.incompleteQuestions}`)
    console.log(`   🎯 有答案题目: ${dataIntegrityResults.questionsWithAnswers}`)
    console.log(`   💡 有解释题目: ${dataIntegrityResults.questionsWithExplanations}`)
    
    // 7. 生成测试报告
    console.log('\n📋 7. 生成测试报告...')
    const testReport = generateTestReport({
      parsedQuiz,
      htmlContent,
      validationResults,
      dataIntegrityResults
    })
    
    fs.writeFileSync('test-report.json', JSON.stringify(testReport, null, 2))
    console.log('   ✅ 测试报告已保存: test-report.json')
    
    console.log('\n🎉 测试完成！')
    console.log(`\n📖 使用说明:`)
    console.log(`   1. 打开浏览器访问: http://localhost:3000`)
    console.log(`   2. 上传测试文件: test-quiz-comprehensive.txt`)
    console.log(`   3. 选择出题模式并开始刷题`)
    console.log(`   4. 或者直接打开生成的HTML文件: ${outputFileName}`)
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
    console.error('错误详情:', error.stack)
  }
}

// 验证HTML结构
function validateHtmlStructure(html) {
  const errors = []
  
  // 检查基本HTML结构
  if (!html.includes('<!DOCTYPE html>')) errors.push('缺少DOCTYPE声明')
  if (!html.includes('<html')) errors.push('缺少html标签')
  if (!html.includes('<head>')) errors.push('缺少head标签')
  if (!html.includes('<body>')) errors.push('缺少body标签')
  
  // 检查CSS和JavaScript
  if (!html.includes('<style>') && !html.includes('<link')) errors.push('缺少CSS样式')
  if (!html.includes('<script>')) errors.push('缺少JavaScript代码')
  
  // 检查刷题相关元素
  if (!html.includes('quizData')) errors.push('缺少题目数据')
  if (!html.includes('renderQuestion')) errors.push('缺少题目渲染函数')
  if (!html.includes('selectOption')) errors.push('缺少选项选择函数')
  
  return {
    isValid: errors.length === 0,
    errors: errors
  }
}

// 验证题目数据完整性
function validateQuestionData(questions) {
  let completeQuestions = 0
  let questionsWithAnswers = 0
  let questionsWithExplanations = 0
  
  questions.forEach(question => {
    // 检查题目是否完整
    if (question.question && 
        question.options && 
        question.options.length > 0 && 
        question.correctAnswer !== undefined) {
      completeQuestions++
    }
    
    // 检查是否有答案
    if (question.correctAnswer !== undefined) {
      questionsWithAnswers++
    }
    
    // 检查是否有解释
    if (question.explanation) {
      questionsWithExplanations++
    }
  })
  
  return {
    totalQuestions: questions.length,
    completeQuestions,
    incompleteQuestions: questions.length - completeQuestions,
    questionsWithAnswers,
    questionsWithExplanations
  }
}

// 生成测试报告
function generateTestReport(data) {
  return {
    timestamp: new Date().toISOString(),
    testResults: {
      parsing: {
        success: true,
        questionsCount: data.parsedQuiz.questions.length,
        title: data.parsedQuiz.title
      },
      htmlGeneration: {
        success: true,
        htmlSize: data.htmlContent.length,
        hasStyles: data.htmlContent.includes('<style>'),
        hasScripts: data.htmlContent.includes('<script>')
      },
      validation: data.validationResults,
      dataIntegrity: data.dataIntegrityResults
    },
    recommendations: generateRecommendations(data)
  }
}

// 生成改进建议
function generateRecommendations(data) {
  const recommendations = []
  
  if (data.dataIntegrityResults.incompleteQuestions > 0) {
    recommendations.push('建议检查并完善不完整的题目')
  }
  
  if (data.dataIntegrityResults.questionsWithExplanations < data.dataIntegrityResults.totalQuestions) {
    recommendations.push('建议为所有题目添加解释说明')
  }
  
  if (!data.validationResults.isValid) {
    recommendations.push('建议修复HTML结构问题')
  }
  
  return recommendations
}

// 运行测试
if (require.main === module) {
  testCompleteQuizFlow()
}

module.exports = {
  testCompleteQuizFlow,
  validateHtmlStructure,
  validateQuestionData
}
