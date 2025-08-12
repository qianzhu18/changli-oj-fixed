// 项目诊断和修复脚本
const fs = require('fs')
const path = require('path')

console.log('🔧 开始项目诊断和修复...\n')

// 诊断结果
const diagnostics = {
  files: {},
  dependencies: {},
  configuration: {},
  issues: [],
  fixes: []
}

// 1. 检查关键文件
console.log('📁 检查关键文件...')
const criticalFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'components/smart-parsing-page.tsx',
  'lib/quiz-parser.ts',
  'lib/quiz-html-generator.ts',
  'test-quiz-simple.txt',
  'test-quiz-comprehensive.txt'
]

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file)
  diagnostics.files[file] = exists
  
  if (exists) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - 缺失`)
    diagnostics.issues.push(`缺失关键文件: ${file}`)
  }
})

// 2. 检查package.json依赖
console.log('\n📦 检查项目依赖...')
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  
  const requiredDeps = {
    'next': '>=14.0.0',
    'react': '>=18.0.0',
    'react-dom': '>=18.0.0',
    'typescript': '>=5.0.0',
    '@types/react': '>=18.0.0',
    'tailwindcss': '>=3.0.0'
  }
  
  Object.entries(requiredDeps).forEach(([dep, version]) => {
    const installed = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]
    diagnostics.dependencies[dep] = installed || 'not installed'
    
    if (installed) {
      console.log(`✅ ${dep}: ${installed}`)
    } else {
      console.log(`❌ ${dep}: 未安装`)
      diagnostics.issues.push(`缺失依赖: ${dep}`)
    }
  })
}

// 3. 检查TypeScript配置
console.log('\n⚙️ 检查TypeScript配置...')
if (fs.existsSync('tsconfig.json')) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
    console.log('✅ tsconfig.json 格式正确')
    diagnostics.configuration.typescript = 'valid'
  } catch (error) {
    console.log('❌ tsconfig.json 格式错误')
    diagnostics.issues.push('tsconfig.json 格式错误')
    diagnostics.configuration.typescript = 'invalid'
  }
} else {
  console.log('❌ tsconfig.json 不存在')
  diagnostics.issues.push('缺失 tsconfig.json')
}

// 4. 检查组件文件语法
console.log('\n🔍 检查组件文件...')
const componentFiles = [
  'components/smart-parsing-page.tsx',
  'lib/quiz-parser.ts',
  'lib/quiz-html-generator.ts'
]

componentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8')
    
    // 基本语法检查
    const hasImports = content.includes('import')
    const hasExports = content.includes('export')
    const hasTypeScript = content.includes(': ') || content.includes('interface') || content.includes('type ')
    
    console.log(`📄 ${file}:`)
    console.log(`   导入语句: ${hasImports ? '✅' : '❌'}`)
    console.log(`   导出语句: ${hasExports ? '✅' : '❌'}`)
    console.log(`   TypeScript: ${hasTypeScript ? '✅' : '❌'}`)
    
    if (!hasImports || !hasExports) {
      diagnostics.issues.push(`${file} 可能有语法问题`)
    }
  }
})

// 5. 生成修复建议
console.log('\n🛠️ 生成修复建议...')

if (diagnostics.issues.length === 0) {
  console.log('✅ 未发现问题，项目状态良好！')
} else {
  console.log('⚠️ 发现以下问题:')
  diagnostics.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`)
  })
  
  // 生成修复命令
  console.log('\n🔧 建议的修复命令:')
  
  if (diagnostics.issues.some(issue => issue.includes('缺失依赖'))) {
    console.log('   npm install')
    diagnostics.fixes.push('npm install')
  }
  
  if (diagnostics.issues.some(issue => issue.includes('tsconfig.json'))) {
    console.log('   npx tsc --init')
    diagnostics.fixes.push('npx tsc --init')
  }
  
  if (diagnostics.issues.some(issue => issue.includes('缺失关键文件'))) {
    console.log('   检查并恢复缺失的文件')
    diagnostics.fixes.push('restore missing files')
  }
}

// 6. 保存诊断报告
console.log('\n📋 保存诊断报告...')
const report = {
  timestamp: new Date().toISOString(),
  diagnostics,
  summary: {
    totalIssues: diagnostics.issues.length,
    criticalFiles: Object.values(diagnostics.files).filter(Boolean).length,
    missingFiles: Object.values(diagnostics.files).filter(v => !v).length,
    status: diagnostics.issues.length === 0 ? 'healthy' : 'needs attention'
  }
}

fs.writeFileSync('diagnostic-report.json', JSON.stringify(report, null, 2))
console.log('✅ 诊断报告已保存: diagnostic-report.json')

// 7. 运行状态检查
console.log('\n🚀 运行状态检查...')
console.log('开发服务器应该运行在: http://localhost:3000')
console.log('如果服务器未运行，请执行: npm run dev')

console.log('\n📖 下一步操作:')
console.log('1. 修复发现的问题（如果有）')
console.log('2. 确保开发服务器运行')
console.log('3. 打开浏览器测试功能')
console.log('4. 参考 TESTING_GUIDE.md 进行完整测试')

console.log('\n🎯 诊断完成！')

// 返回诊断结果
process.exit(diagnostics.issues.length)
