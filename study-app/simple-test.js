// 简化的功能测试
const fs = require('fs')

console.log('🧪 开始简化测试...\n')

// 1. 检查文件是否存在
console.log('📁 检查测试文件...')
const files = ['test-quiz-simple.txt', 'test-quiz-comprehensive.txt']
files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8')
    console.log(`✅ ${file}: ${content.length} 字符`)
  } else {
    console.log(`❌ ${file}: 不存在`)
  }
})

// 2. 检查核心文件
console.log('\n🔍 检查核心文件...')
const coreFiles = [
  'lib/quiz-parser.ts',
  'lib/quiz-html-generator.ts',
  'components/smart-parsing-page.tsx'
]

coreFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}: 存在`)
  } else {
    console.log(`❌ ${file}: 不存在`)
  }
})

// 3. 检查package.json
console.log('\n📦 检查项目配置...')
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  console.log(`✅ 项目名称: ${pkg.name}`)
  console.log(`✅ 版本: ${pkg.version}`)
  console.log(`✅ Next.js: ${pkg.dependencies?.next || '未安装'}`)
} else {
  console.log('❌ package.json 不存在')
}

console.log('\n🎯 测试完成！')
console.log('\n📖 下一步操作:')
console.log('1. 确保开发服务器运行: npm run dev')
console.log('2. 打开浏览器: http://localhost:3000')
console.log('3. 上传测试文件进行刷题测试')
