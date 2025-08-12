// 独立的刷题HTML生成器
const fs = require('fs')

function createQuizFromFile(inputFile, outputFile) {
  console.log(`🔄 正在处理文件: ${inputFile}`)
  
  try {
    // 读取文件内容
    const content = fs.readFileSync(inputFile, 'utf8')
    console.log(`✅ 文件读取成功，内容长度: ${content.length}`)
    
    // 解析题目
    const questions = parseQuestions(content)
    console.log(`✅ 解析完成，共 ${questions.length} 题`)
    
    // 生成HTML
    const html = generateQuizHTML(questions, inputFile)
    
    // 保存文件
    fs.writeFileSync(outputFile, html)
    console.log(`✅ 刷题HTML已生成: ${outputFile}`)
    console.log(`🌐 请在浏览器中打开: file://${process.cwd()}/${outputFile}`)
    
    return true
  } catch (error) {
    console.error(`❌ 处理失败: ${error.message}`)
    return false
  }
}

function parseQuestions(content) {
  const questions = []
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let currentQuestion = {}
  let questionIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 检测题目
    if (/^\d+\.\s*.*[？?]/.test(line)) {
      if (currentQuestion.question) {
        questions.push(finalizeQuestion(currentQuestion, questionIndex))
        questionIndex++
      }
      
      currentQuestion = {
        id: questionIndex + 1,
        question: line,
        options: [],
        correctAnswer: 0,
        explanation: ''
      }
    }
    // 检测选项
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
  
  // 添加最后一题
  if (currentQuestion.question) {
    questions.push(finalizeQuestion(currentQuestion, questionIndex))
  }
  
  return questions
}

function finalizeQuestion(question, index) {
  // 确保有选项
  if (!question.options || question.options.length === 0) {
    question.options = ['选项A', '选项B', '选项C', '选项D']
  }
  
  // 确保有4个选项
  while (question.options.length < 4) {
    question.options.push(`选项${String.fromCharCode(65 + question.options.length)}`)
  }
  
  return {
    id: question.id || index + 1,
    question: question.question || `题目 ${index + 1}`,
    options: question.options.slice(0, 4),
    correctAnswer: question.correctAnswer || 0,
    explanation: question.explanation || '暂无解释'
  }
}

function generateQuizHTML(questions, sourceFile) {
  const title = `刷题练习 - ${sourceFile.replace('.txt', '')}`
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .correct { 
            background-color: #dcfce7 !important; 
            border-color: #16a34a !important; 
            color: #15803d !important; 
        }
        .incorrect { 
            background-color: #fef2f2 !important; 
            border-color: #dc2626 !important; 
            color: #dc2626 !important; 
        }
        .option-btn {
            transition: all 0.2s ease;
        }
        .option-btn:hover:not(:disabled) {
            background-color: #f3f4f6;
            transform: translateY(-1px);
        }
        .progress-bar {
            transition: width 0.3s ease;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- 头部 -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">${title}</h1>
            <p class="text-gray-600">共 ${questions.length} 题 | 当前进度: <span id="progress-text">0/${questions.length}</span></p>
            <div class="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div id="progress-bar" class="progress-bar bg-blue-500 h-2 rounded-full" style="width: 0%"></div>
            </div>
        </div>
        
        <!-- 题目区域 -->
        <div id="question-container" class="bg-white rounded-xl shadow-lg p-8 mb-6">
            <!-- 动态内容 -->
        </div>
        
        <!-- 控制按钮 -->
        <div class="flex justify-between items-center">
            <button id="prev-btn" class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                ← 上一题
            </button>
            
            <div class="flex gap-3">
                <button id="restart-btn" class="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                    🔄 重新开始
                </button>
                <button id="random-btn" class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                    🎲 随机顺序
                </button>
            </div>
            
            <button id="next-btn" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                下一题 →
            </button>
        </div>
        
        <!-- 成绩统计 -->
        <div id="stats" class="mt-6 bg-white rounded-xl shadow-lg p-6 hidden">
            <h2 class="text-2xl font-bold text-center mb-4">🎉 练习完成！</h2>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-green-600" id="correct-count">0</div>
                    <div class="text-green-600">正确</div>
                </div>
                <div class="bg-red-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-red-600" id="wrong-count">0</div>
                    <div class="text-red-600">错误</div>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600" id="accuracy">0%</div>
                    <div class="text-blue-600">正确率</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const questions = ${JSON.stringify(questions, null, 2)};
        let currentIndex = 0;
        let userAnswers = new Map();
        let isRandomMode = false;
        
        function updateProgress() {
            const answered = userAnswers.size;
            const total = questions.length;
            const percentage = (answered / total) * 100;
            
            document.getElementById('progress-text').textContent = \`\${answered}/\${total}\`;
            document.getElementById('progress-bar').style.width = \`\${percentage}%\`;
        }
        
        function renderQuestion() {
            const question = questions[currentIndex];
            const container = document.getElementById('question-container');
            const isAnswered = userAnswers.has(question.id);
            
            let html = \`
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">题目 \${currentIndex + 1}</h2>
                        <span class="text-sm text-gray-500">ID: \${question.id}</span>
                    </div>
                    <p class="text-lg leading-relaxed mb-8 text-gray-700">\${question.question}</p>
                    <div class="grid gap-3">
            \`;
            
            question.options.forEach((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const isSelected = isAnswered && userAnswers.get(question.id).selected === index;
                const isCorrect = index === question.correctAnswer;
                
                let className = 'option-btn w-full p-4 text-left border-2 rounded-lg font-medium';
                
                if (isAnswered) {
                    if (isCorrect) {
                        className += ' correct';
                    } else if (isSelected) {
                        className += ' incorrect';
                    } else {
                        className += ' border-gray-200 text-gray-500';
                    }
                } else {
                    className += ' border-gray-200 hover:border-blue-300 cursor-pointer';
                }
                
                html += \`
                    <button onclick="selectAnswer(\${index})" 
                            class="\${className}"
                            \${isAnswered ? 'disabled' : ''}>
                        <span class="font-bold">\${letter}.</span> \${option}
                    </button>
                \`;
            });
            
            html += '</div>';
            
            if (isAnswered && question.explanation) {
                const userAnswer = userAnswers.get(question.id);
                const isCorrect = userAnswer.selected === question.correctAnswer;
                
                html += \`
                    <div class="mt-8 p-6 \${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'} rounded-lg">
                        <div class="flex items-center mb-3">
                            <span class="text-2xl mr-2">\${isCorrect ? '✅' : '❌'}</span>
                            <h3 class="text-lg font-bold \${isCorrect ? 'text-green-800' : 'text-red-800'}">
                                \${isCorrect ? '回答正确！' : '回答错误！'}
                            </h3>
                        </div>
                        <p class="\${isCorrect ? 'text-green-700' : 'text-red-700'} leading-relaxed">
                            <strong>解释：</strong>\${question.explanation}
                        </p>
                    </div>
                \`;
            }
            
            html += '</div>';
            container.innerHTML = html;
            
            // 更新按钮状态
            document.getElementById('prev-btn').disabled = currentIndex === 0;
            document.getElementById('next-btn').textContent = 
                currentIndex === questions.length - 1 ? '查看成绩' : '下一题 →';
        }
        
        function selectAnswer(optionIndex) {
            const question = questions[currentIndex];
            if (userAnswers.has(question.id)) return;
            
            const isCorrect = optionIndex === question.correctAnswer;
            userAnswers.set(question.id, {
                selected: optionIndex,
                correct: isCorrect
            });
            
            updateProgress();
            renderQuestion();
            
            // 自动跳转到下一题（延迟2秒）
            setTimeout(() => {
                if (currentIndex < questions.length - 1) {
                    nextQuestion();
                } else {
                    showStats();
                }
            }, 2000);
        }
        
        function nextQuestion() {
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                renderQuestion();
            } else {
                showStats();
            }
        }
        
        function prevQuestion() {
            if (currentIndex > 0) {
                currentIndex--;
                renderQuestion();
            }
        }
        
        function showStats() {
            const correct = Array.from(userAnswers.values()).filter(a => a.correct).length;
            const total = userAnswers.size;
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
            
            document.getElementById('correct-count').textContent = correct;
            document.getElementById('wrong-count').textContent = total - correct;
            document.getElementById('accuracy').textContent = accuracy + '%';
            document.getElementById('stats').classList.remove('hidden');
        }
        
        function restart() {
            userAnswers.clear();
            currentIndex = 0;
            document.getElementById('stats').classList.add('hidden');
            updateProgress();
            renderQuestion();
        }
        
        function randomize() {
            // Fisher-Yates 洗牌算法
            for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
            }
            restart();
        }
        
        // 事件监听
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('restart-btn').addEventListener('click', restart);
        document.getElementById('random-btn').addEventListener('click', randomize);
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') prevQuestion();
            if (e.key === 'ArrowRight') nextQuestion();
            if (e.key >= '1' && e.key <= '4') {
                const index = parseInt(e.key) - 1;
                selectAnswer(index);
            }
        });
        
        // 初始化
        updateProgress();
        renderQuestion();
        
        console.log('🎉 刷题系统已加载，共', questions.length, '题');
        console.log('💡 快捷键：← → 切换题目，1-4 选择答案');
    </script>
</body>
</html>`;
}

// 使用示例
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 使用方法:');
    console.log('  node create-quiz-html.js <输入文件> [输出文件]');
    console.log('');
    console.log('📝 示例:');
    console.log('  node create-quiz-html.js test-quiz-simple.txt');
    console.log('  node create-quiz-html.js test-quiz-comprehensive.txt my-quiz.html');
    console.log('');
    
    // 自动处理现有的测试文件
    const testFiles = ['test-quiz-simple.txt', 'test-quiz-comprehensive.txt'];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const outputFile = file.replace('.txt', '-quiz.html');
        console.log(`🔄 自动处理: ${file} -> ${outputFile}`);
        createQuizFromFile(file, outputFile);
      }
    });
  } else {
    const inputFile = args[0];
    const outputFile = args[1] || inputFile.replace('.txt', '-quiz.html');
    
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ 文件不存在: ${inputFile}`);
      process.exit(1);
    }
    
    createQuizFromFile(inputFile, outputFile);
  }
}

module.exports = { createQuizFromFile, parseQuestions, generateQuizHTML };
