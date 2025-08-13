// 完整功能流程测试
const fs = require('fs')

// 模拟完整的解析和HTML生成流程
function testCompleteFlow() {
  console.log('=== 完整功能流程测试 ===\n')
  
  // 1. 读取测试文件
  console.log('1. 读取测试文件...')
  const testContent = fs.readFileSync('test-quiz-simple.txt', 'utf8')
  console.log(`   文件大小: ${testContent.length} 字符`)
  console.log(`   内容预览: ${testContent.substring(0, 100)}...\n`)
  
  // 2. 模拟解析过程
  console.log('2. 解析题库内容...')
  const parsedData = simulateQuizParsing(testContent)
  console.log(`   解析结果: 成功解析 ${parsedData.questions.length} 个题目`)
  console.log(`   题库标题: ${parsedData.title}\n`)
  
  // 3. 模拟HTML生成
  console.log('3. 生成交互式HTML...')
  const htmlContent = simulateHtmlGeneration(parsedData)
  console.log(`   HTML大小: ${htmlContent.length} 字符`)
  console.log(`   包含JavaScript: ${htmlContent.includes('<script>') ? '是' : '否'}`)
  console.log(`   包含CSS样式: ${htmlContent.includes('<style>') ? '是' : '否'}\n`)
  
  // 4. 保存生成的HTML文件
  console.log('4. 保存HTML文件...')
  fs.writeFileSync('generated-quiz.html', htmlContent)
  console.log('   文件已保存为: generated-quiz.html\n')
  
  // 5. 验证HTML结构
  console.log('5. 验证HTML结构...')
  const validation = validateHtmlStructure(htmlContent)
  console.log(`   HTML结构完整性: ${validation.isValid ? '通过' : '失败'}`)
  if (!validation.isValid) {
    console.log(`   错误信息: ${validation.errors.join(', ')}`)
  }
  
  console.log('\n=== 测试完成 ===')
  console.log('您可以打开 generated-quiz.html 文件来测试刷题功能')
}

// 模拟题库解析
function simulateQuizParsing(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const questions = []
  
  let currentQuestion = {}
  let questionCounter = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 检查是否是题目（包含问号）
    if (line.includes('？') || line.includes('?')) {
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
  
  return {
    title: "JavaScript基础知识测试",
    questions: questions,
    totalQuestions: questions.length
  }
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

// 模拟HTML生成
function simulateHtmlGeneration(quizData) {
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

// 验证HTML结构
function validateHtmlStructure(html) {
  const errors = []
  
  if (!html.includes('<!DOCTYPE html>')) {
    errors.push('缺少DOCTYPE声明')
  }
  
  if (!html.includes('<script>')) {
    errors.push('缺少JavaScript代码')
  }
  
  if (!html.includes('quizData')) {
    errors.push('缺少题目数据')
  }
  
  if (!html.includes('renderQuestion')) {
    errors.push('缺少题目渲染函数')
  }
  
  if (!html.includes('selectOption')) {
    errors.push('缺少选项选择函数')
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  }
}

// 运行测试
testCompleteFlow()
