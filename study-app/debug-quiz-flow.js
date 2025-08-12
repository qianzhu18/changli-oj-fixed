// 完整的刷题流程调试工具
const fs = require('fs')

console.log('🔍 开始刷题流程调试...\n')

// 1. 测试文件读取和内容分析
function testFileReading() {
  console.log('📁 1. 测试文件读取...')
  
  const testFiles = [
    'test-quiz-simple.txt',
    'test-quiz-comprehensive.txt'
  ]
  
  const results = {}
  
  testFiles.forEach(fileName => {
    try {
      if (fs.existsSync(fileName)) {
        const content = fs.readFileSync(fileName, 'utf8')
        
        // 分析内容结构
        const lines = content.split('\n').filter(line => line.trim().length > 0)
        const questions = content.match(/\d+\.\s*.*[？?]/g) || []
        const options = content.match(/[A-D][.、]\s*.+/g) || []
        const answers = content.match(/答案[：:]\s*[A-D]/g) || []
        const explanations = content.match(/(解释|说明|解析)[：:]\s*.+/g) || []
        
        results[fileName] = {
          exists: true,
          size: content.length,
          lines: lines.length,
          questions: questions.length,
          options: options.length,
          answers: answers.length,
          explanations: explanations.length,
          content: content.substring(0, 200) + '...'
        }
        
        console.log(`   ✅ ${fileName}:`)
        console.log(`      文件大小: ${content.length} 字符`)
        console.log(`      总行数: ${lines.length}`)
        console.log(`      题目数: ${questions.length}`)
        console.log(`      选项数: ${options.length}`)
        console.log(`      答案数: ${answers.length}`)
        console.log(`      解释数: ${explanations.length}`)
        
      } else {
        results[fileName] = { exists: false }
        console.log(`   ❌ ${fileName}: 文件不存在`)
      }
    } catch (error) {
      results[fileName] = { exists: false, error: error.message }
      console.log(`   ❌ ${fileName}: 读取错误 - ${error.message}`)
    }
  })
  
  return results
}

// 2. 测试解析器功能
function testQuizParser() {
  console.log('\n🔍 2. 测试解析器功能...')
  
  try {
    // 模拟解析器逻辑
    const testContent = fs.readFileSync('test-quiz-simple.txt', 'utf8')
    
    // 检测格式
    const formatDetection = detectContentFormat(testContent)
    console.log(`   格式检测: ${formatDetection}`)
    
    // 提取题目
    const extractedQuestions = extractQuestionsFromContent(testContent)
    console.log(`   提取题目数: ${extractedQuestions.length}`)
    
    // 验证题目结构
    extractedQuestions.forEach((q, index) => {
      console.log(`   题目 ${index + 1}:`)
      console.log(`     问题: ${q.question ? '✅' : '❌'}`)
      console.log(`     选项: ${q.options && q.options.length > 0 ? '✅' : '❌'} (${q.options?.length || 0}个)`)
      console.log(`     答案: ${q.correctAnswer !== undefined ? '✅' : '❌'}`)
      console.log(`     解释: ${q.explanation ? '✅' : '❌'}`)
    })
    
    return { success: true, questions: extractedQuestions }
    
  } catch (error) {
    console.log(`   ❌ 解析器测试失败: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// 3. 测试HTML生成
function testHtmlGeneration(questions) {
  console.log('\n🌐 3. 测试HTML生成...')
  
  try {
    const quizData = {
      title: "调试测试题库",
      questions: questions,
      totalQuestions: questions.length
    }
    
    const htmlContent = generateQuizHtml(quizData)
    
    // 验证HTML结构
    const hasDoctype = htmlContent.includes('<!DOCTYPE html>')
    const hasTitle = htmlContent.includes('<title>')
    const hasStyles = htmlContent.includes('<style>') || htmlContent.includes('tailwindcss')
    const hasScripts = htmlContent.includes('<script>')
    const hasQuizData = htmlContent.includes('quizData')
    const hasRenderFunction = htmlContent.includes('renderQuestion')
    
    console.log(`   HTML结构检查:`)
    console.log(`     DOCTYPE: ${hasDoctype ? '✅' : '❌'}`)
    console.log(`     标题: ${hasTitle ? '✅' : '❌'}`)
    console.log(`     样式: ${hasStyles ? '✅' : '❌'}`)
    console.log(`     脚本: ${hasScripts ? '✅' : '❌'}`)
    console.log(`     题目数据: ${hasQuizData ? '✅' : '❌'}`)
    console.log(`     渲染函数: ${hasRenderFunction ? '✅' : '❌'}`)
    console.log(`     HTML大小: ${htmlContent.length} 字符`)
    
    // 保存调试HTML
    fs.writeFileSync('debug-quiz.html', htmlContent)
    console.log(`   ✅ 调试HTML已保存: debug-quiz.html`)
    
    return { success: true, html: htmlContent }
    
  } catch (error) {
    console.log(`   ❌ HTML生成失败: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// 辅助函数：格式检测
function detectContentFormat(content) {
  const hasQuestions = /\d+\.\s*.*[？?]/.test(content)
  const hasOptions = /[A-D][.、]\s*.+/.test(content)
  const hasAnswers = /答案[：:]\s*[A-D]/.test(content)
  
  if (hasQuestions && hasOptions && hasAnswers) {
    return 'standard'
  } else if (hasQuestions) {
    return 'partial'
  } else {
    return 'unknown'
  }
}

// 辅助函数：题目提取
function extractQuestionsFromContent(content) {
  const questions = []
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let currentQuestion = {}
  let questionCounter = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 检查是否是题目
    if (/^\d+\.\s*.*[？?]/.test(line)) {
      if (currentQuestion.question) {
        finalizeQuestion(currentQuestion, questions, questionCounter)
        questionCounter++
      }
      
      currentQuestion = {
        id: `q_${questionCounter + 1}`,
        question: line,
        options: [],
        type: 'multiple-choice'
      }
    }
    // 检查是否是选项
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
    finalizeQuestion(currentQuestion, questions, questionCounter)
  }
  
  return questions
}

function finalizeQuestion(currentQuestion, questions, questionCounter) {
  if (!currentQuestion.options || currentQuestion.options.length === 0) {
    currentQuestion.options = ["选项A", "选项B", "选项C", "选项D"]
    currentQuestion.correctAnswer = 0
  }
  
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

// 辅助函数：HTML生成
function generateQuizHtml(quizData) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quizData.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .correct { background-color: #dcfce7; border-color: #16a34a; color: #15803d; }
        .incorrect { background-color: #fef2f2; border-color: #dc2626; color: #dc2626; }
        .selected { background-color: #dbeafe; border-color: #3b82f6; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div id="app" class="container mx-auto px-4 py-8 max-w-4xl">
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 class="text-3xl font-bold text-gray-800">${quizData.title}</h1>
            <p class="text-gray-600 mt-2">共 ${quizData.questions.length} 题</p>
        </div>
        
        <div id="question-container" class="bg-white rounded-lg shadow-sm p-6">
            <!-- 题目内容将在这里动态生成 -->
        </div>
        
        <div class="mt-6 flex justify-between">
            <button id="prev-btn" class="px-6 py-2 bg-gray-500 text-white rounded-lg">上一题</button>
            <button id="next-btn" class="px-6 py-2 bg-blue-500 text-white rounded-lg">下一题</button>
        </div>
    </div>

    <script>
        const quizData = ${JSON.stringify(quizData, null, 2)};
        let currentQuestionIndex = 0;
        let userAnswers = new Map();
        
        function renderQuestion() {
            const question = quizData.questions[currentQuestionIndex];
            const container = document.getElementById('question-container');
            
            let html = \`
                <div class="mb-6">
                    <h2 class="text-xl font-semibold mb-4">题目 \${currentQuestionIndex + 1}</h2>
                    <p class="text-lg leading-relaxed mb-6">\${question.question}</p>
                    <div class="space-y-3">
            \`;
            
            question.options.forEach((option, index) => {
                const isSelected = userAnswers.has(question.id) && userAnswers.get(question.id).selectedOption === index;
                const isCorrect = index === question.correctAnswer;
                const isAnswered = userAnswers.has(question.id);
                
                let className = 'w-full p-4 text-left border-2 rounded-lg hover:bg-gray-50';
                if (isAnswered) {
                    if (isSelected) {
                        className += isCorrect ? ' correct' : ' incorrect';
                    } else if (isCorrect) {
                        className += ' correct';
                    }
                } else {
                    className += ' border-gray-200';
                }
                
                html += \`
                    <button onclick="selectOption(\${index})" 
                            class="\${className}"
                            \${isAnswered ? 'disabled' : ''}>
                        \${String.fromCharCode(65 + index)}. \${option}
                    </button>
                \`;
            });
            
            html += '</div>';
            
            if (userAnswers.has(question.id) && question.explanation) {
                html += \`
                    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p class="text-blue-800"><strong>解释：</strong>\${question.explanation}</p>
                    </div>
                \`;
            }
            
            html += '</div>';
            container.innerHTML = html;
        }
        
        function selectOption(optionIndex) {
            const question = quizData.questions[currentQuestionIndex];
            if (userAnswers.has(question.id)) return;
            
            const isCorrect = optionIndex === question.correctAnswer;
            userAnswers.set(question.id, {
                selectedOption: optionIndex,
                isCorrect: isCorrect
            });
            
            renderQuestion();
        }
        
        function nextQuestion() {
            if (currentQuestionIndex < quizData.questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
            }
        }
        
        function prevQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
            }
        }
        
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        
        // 初始化
        renderQuestion();
    </script>
</body>
</html>`
}

// 主函数
function main() {
  const fileResults = testFileReading()
  const parserResults = testQuizParser()
  
  if (parserResults.success && parserResults.questions.length > 0) {
    const htmlResults = testHtmlGeneration(parserResults.questions)
    
    console.log('\n📋 调试总结:')
    console.log(`   文件读取: ${Object.values(fileResults).some(r => r.exists) ? '✅' : '❌'}`)
    console.log(`   内容解析: ${parserResults.success ? '✅' : '❌'}`)
    console.log(`   HTML生成: ${htmlResults.success ? '✅' : '❌'}`)
    
    if (htmlResults.success) {
      console.log('\n🎉 调试完成！可以打开 debug-quiz.html 测试刷题功能')
    }
  } else {
    console.log('\n❌ 解析失败，无法生成HTML')
  }
}

// 运行调试
main()
