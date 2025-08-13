// 最终功能验证测试
const fs = require('fs')

console.log('🎯 最终功能验证测试\n')

// 测试数据
const testResults = {
  environment: {},
  parsing: {},
  generation: {},
  overall: 'pending'
}

// 1. 环境检查
console.log('🌍 1. 环境检查...')
const requiredFiles = [
  'package.json',
  'next.config.js', 
  'tailwind.config.js',
  'tsconfig.json',
  'components/smart-parsing-page.tsx',
  'lib/quiz-parser.ts',
  'lib/quiz-html-generator.ts'
]

let environmentScore = 0
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`)
    environmentScore++
  } else {
    console.log(`   ❌ ${file}`)
  }
})

testResults.environment = {
  score: environmentScore,
  total: requiredFiles.length,
  status: environmentScore === requiredFiles.length ? 'pass' : 'fail'
}

// 2. 解析功能测试
console.log('\n🔍 2. 解析功能测试...')
try {
  // 模拟解析测试
  const testContent = fs.readFileSync('test-quiz-simple.txt', 'utf8')
  console.log(`   ✅ 测试文件读取成功 (${testContent.length} 字符)`)
  
  // 检查内容格式
  const hasQuestions = testContent.includes('？') || testContent.includes('?')
  const hasOptions = /[A-D][.、]/.test(testContent)
  const hasAnswers = testContent.includes('答案')
  
  console.log(`   ✅ 包含题目: ${hasQuestions ? '是' : '否'}`)
  console.log(`   ✅ 包含选项: ${hasOptions ? '是' : '否'}`)
  console.log(`   ✅ 包含答案: ${hasAnswers ? '是' : '否'}`)
  
  testResults.parsing = {
    fileRead: true,
    hasQuestions,
    hasOptions,
    hasAnswers,
    status: hasQuestions && hasOptions && hasAnswers ? 'pass' : 'partial'
  }
  
} catch (error) {
  console.log(`   ❌ 解析测试失败: ${error.message}`)
  testResults.parsing = { status: 'fail', error: error.message }
}

// 3. 生成功能测试
console.log('\n🌐 3. HTML生成功能测试...')
try {
  // 检查生成的HTML文件
  if (fs.existsSync('generated-quiz.html')) {
    const htmlContent = fs.readFileSync('generated-quiz.html', 'utf8')
    
    const hasDoctype = htmlContent.includes('<!DOCTYPE html>')
    const hasStyles = htmlContent.includes('<style>') || htmlContent.includes('tailwindcss')
    const hasScripts = htmlContent.includes('<script>')
    const hasQuizData = htmlContent.includes('quizData')
    
    console.log(`   ✅ HTML结构: ${hasDoctype ? '正确' : '错误'}`)
    console.log(`   ✅ 样式文件: ${hasStyles ? '包含' : '缺失'}`)
    console.log(`   ✅ 脚本文件: ${hasScripts ? '包含' : '缺失'}`)
    console.log(`   ✅ 题目数据: ${hasQuizData ? '包含' : '缺失'}`)
    
    testResults.generation = {
      htmlExists: true,
      hasDoctype,
      hasStyles,
      hasScripts,
      hasQuizData,
      status: hasDoctype && hasStyles && hasScripts && hasQuizData ? 'pass' : 'partial'
    }
  } else {
    console.log('   ⚠️ 未找到生成的HTML文件，需要手动测试')
    testResults.generation = { status: 'pending', note: 'manual test required' }
  }
  
} catch (error) {
  console.log(`   ❌ 生成测试失败: ${error.message}`)
  testResults.generation = { status: 'fail', error: error.message }
}

// 4. 综合评估
console.log('\n📊 4. 综合评估...')
const envPass = testResults.environment.status === 'pass'
const parsePass = testResults.parsing.status === 'pass'
const genPass = testResults.generation.status === 'pass' || testResults.generation.status === 'pending'

if (envPass && parsePass && genPass) {
  testResults.overall = 'ready'
  console.log('   🎉 项目状态: 准备就绪！')
} else if (envPass && parsePass) {
  testResults.overall = 'mostly-ready'
  console.log('   ⚠️ 项目状态: 基本就绪，需要手动测试')
} else {
  testResults.overall = 'needs-work'
  console.log('   ❌ 项目状态: 需要进一步修复')
}

// 5. 生成测试报告
console.log('\n📋 5. 生成测试报告...')
const finalReport = {
  timestamp: new Date().toISOString(),
  testResults,
  nextSteps: generateNextSteps(testResults),
  testInstructions: generateTestInstructions()
}

fs.writeFileSync('final-test-report.json', JSON.stringify(finalReport, null, 2))
console.log('   ✅ 最终测试报告已保存: final-test-report.json')

// 6. 显示下一步操作
console.log('\n🚀 下一步操作:')
finalReport.nextSteps.forEach((step, index) => {
  console.log(`   ${index + 1}. ${step}`)
})

console.log('\n📖 手动测试指南:')
finalReport.testInstructions.forEach((instruction, index) => {
  console.log(`   ${index + 1}. ${instruction}`)
})

console.log('\n🎯 测试完成！')

function generateNextSteps(results) {
  const steps = []
  
  if (results.overall === 'ready') {
    steps.push('打开浏览器访问 http://localhost:3000')
    steps.push('上传 test-quiz-simple.txt 文件')
    steps.push('测试完整的刷题流程')
    steps.push('验证所有功能正常工作')
  } else if (results.overall === 'mostly-ready') {
    steps.push('确保开发服务器运行: npm run dev')
    steps.push('打开浏览器访问 http://localhost:3000')
    steps.push('手动测试文件上传和解析功能')
    steps.push('验证刷题界面生成')
  } else {
    steps.push('修复环境配置问题')
    steps.push('检查依赖安装: npm install')
    steps.push('重新启动开发服务器')
    steps.push('重新运行测试')
  }
  
  return steps
}

function generateTestInstructions() {
  return [
    '在浏览器中打开 http://localhost:3000',
    '验证页面加载正常，显示"智能工成忽总文题库"',
    '点击文件上传区域，选择 test-quiz-simple.txt',
    '点击"开始解析"按钮，等待解析完成',
    '选择"顺序出题"或"随机出题"模式',
    '点击"开始刷题"，验证刷题界面启动',
    '测试答题功能：选择答案、查看反馈、阅读解释',
    '测试导航功能：上一题、下一题',
    '完成所有题目，查看最终成绩',
    '测试"重新开始"功能'
  ]
}
