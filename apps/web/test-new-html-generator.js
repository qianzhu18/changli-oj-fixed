// 测试新的HTML生成器
const fs = require('fs')

console.log('🧪 测试新的HTML生成器...\n')

// 模拟题目数据
const testQuizData = {
  title: "JavaScript基础测试题库",
  questions: [
    {
      id: "q_1",
      question: "1. JavaScript是什么类型的编程语言？",
      options: ["编译型语言", "解释型语言", "汇编语言", "机器语言"],
      correctAnswer: 1,
      type: "multiple-choice",
      explanation: "JavaScript是一种解释型编程语言，代码在运行时由JavaScript引擎逐行解释执行。"
    },
    {
      id: "q_2", 
      question: "2. 以下哪个不是JavaScript的数据类型？",
      options: ["string", "number", "char", "boolean"],
      correctAnswer: 2,
      type: "multiple-choice",
      explanation: "JavaScript中没有char数据类型，字符通常用string类型表示。"
    },
    {
      id: "q_3",
      question: "3. 如何在JavaScript中声明一个变量？",
      options: ["var name", "variable name", "declare name", "dim name"],
      correctAnswer: 0,
      type: "multiple-choice", 
      explanation: "在JavaScript中，可以使用var、let或const关键字来声明变量。"
    }
  ],
  totalQuestions: 3
}

// 生成HTML的函数（基于prompt规范）
function generateQuizHtml(quizData, orderMode = '顺序') {
  let questions = [...quizData.questions]
  
  if (orderMode === '随机') {
    // Fisher-Yates 洗牌算法
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    // 重新编号
    questions = questions.map((q, index) => ({
      ...q,
      id: `q_${index + 1}`
    }))
  }

  // 自动检测题目类型
  const questionType = questions.length > 0 && questions[0].options && questions[0].options.length > 1 
    ? 'multipleChoice' 
    : 'fillInTheBlank'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quizData.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* 严格按照prompt要求：静态样式，无过渡动画 */
        .correct-option { background-color: #dcfce7 !important; border-color: #16a34a !important; }
        .incorrect-option { background-color: #fef2f2 !important; border-color: #dc2626 !important; }
        .nav-button { 
            min-width: 40px; 
            height: 40px; 
            margin: 2px; 
            border: 1px solid #d1d5db;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: 500;
        }
        .nav-button.current { background-color: #3b82f6 !important; color: white !important; }
        .nav-button.correct { background-color: #16a34a !important; color: white !important; }
        .nav-button.incorrect { background-color: #dc2626 !important; color: white !important; }
        .nav-container { 
            overflow-x: auto; 
            white-space: nowrap; 
            padding: 10px 0;
            -webkit-overflow-scrolling: touch;
        }
        .option-button {
            width: 100%;
            padding: 16px;
            text-align: left;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            margin-bottom: 12px;
            background: white;
            cursor: pointer;
            font-size: 16px;
            line-height: 1.5;
        }
        .option-button:disabled { cursor: not-allowed; }
        .question-content {
            white-space: pre-wrap;
            line-height: 1.6;
            font-size: 18px;
        }
        @media (max-width: 768px) {
            .container { padding: 16px 12px; }
            .question-content { font-size: 16px; }
            .option-button { padding: 14px; font-size: 15px; }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto max-w-4xl">
        <!-- 头部信息 -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6 mt-6">
            <div class="flex items-center justify-between mb-4">
                <h1 class="text-2xl md:text-3xl font-bold text-gray-800">${quizData.title}</h1>
                <div class="text-sm text-gray-500">
                    <span id="current-num">1</span> / <span>${questions.length}</span>
                </div>
            </div>
            <div class="text-sm text-gray-600">
                模式: ${orderMode} | 类型: ${questionType === 'multipleChoice' ? '选择题' : '填空题'}
            </div>
        </div>

        <!-- 题目区域 -->
        <div id="question-container" class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <!-- 动态内容 -->
        </div>

        <!-- 导航按钮 -->
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div class="flex justify-between items-center">
                <button id="prev-btn" class="px-6 py-3 bg-gray-500 text-white rounded-lg disabled:opacity-50">
                    上一题
                </button>
                <button id="finish-btn" class="px-6 py-3 bg-green-500 text-white rounded-lg">
                    完成练习
                </button>
                <button id="next-btn" class="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50">
                    下一题
                </button>
            </div>
        </div>

        <!-- 题目导航栏 -->
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div class="text-sm text-gray-600 mb-2">题目导航</div>
            <div class="nav-container" id="nav-container">
                ${questions.map((_, index) => 
                    `<button class="nav-button" onclick="jumpToQuestion(${index})">${index + 1}</button>`
                ).join('')}
            </div>
        </div>

        <!-- 结果页面 -->
        <div id="results-page" class="bg-white rounded-lg shadow-sm p-8 mb-6 hidden">
            <div class="text-center">
                <h2 class="text-3xl font-bold text-gray-800 mb-6">练习完成！</h2>
                <div class="text-6xl font-bold mb-4" id="score-display">0/0</div>
                <div class="text-xl text-gray-600 mb-6" id="percentage-display">正确率: 0%</div>
                <button id="restart-btn" class="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg">
                    重新开始
                </button>
            </div>
        </div>
    </div>

    <script>
        // 题目数据
        const questions = ${JSON.stringify(questions, null, 2)};
        const questionType = '${questionType}';
        
        // 状态管理
        let currentQuestionIndex = 0;
        let userAnswers = new Map();
        let answerStates = new Map();
        
        // 初始化
        function init() {
            renderQuestion();
            updateNavigation();
            updateQuestionNavBar();
        }

        // 渲染当前题目
        function renderQuestion() {
            const question = questions[currentQuestionIndex];
            const container = document.getElementById('question-container');
            
            let html = \`
                <div class="mb-6">
                    <h2 class="text-xl font-bold mb-4">题目 \${currentQuestionIndex + 1}</h2>
                    <div class="question-content mb-6">\${question.question}</div>
                    <div class="space-y-3">
            \`;
            
            // 选择题UI
            question.options.forEach((option, index) => {
                const isAnswered = userAnswers.has(question.id);
                const userAnswer = userAnswers.get(question.id);
                const isSelected = isAnswered && userAnswer === index;
                const isCorrect = index === question.correctAnswer;
                
                let buttonClass = 'option-button';
                if (isAnswered) {
                    if (isCorrect) {
                        buttonClass += ' correct-option';
                    } else if (isSelected) {
                        buttonClass += ' incorrect-option';
                    }
                }
                
                html += \`
                    <button class="\${buttonClass}" 
                            onclick="selectOption(\${index})"
                            \${isAnswered ? 'disabled' : ''}>
                        \${option}
                    </button>
                \`;
            });
            
            html += '</div></div>';
            container.innerHTML = html;
            
            document.getElementById('current-num').textContent = currentQuestionIndex + 1;
        }

        // 选择选项
        function selectOption(optionIndex) {
            const question = questions[currentQuestionIndex];
            if (userAnswers.has(question.id)) return;
            
            userAnswers.set(question.id, optionIndex);
            const isCorrect = optionIndex === question.correctAnswer;
            answerStates.set(question.id, isCorrect ? 'correct' : 'incorrect');
            
            renderQuestion();
            updateQuestionNavBar();
        }

        // 更新导航
        function updateNavigation() {
            document.getElementById('prev-btn').disabled = currentQuestionIndex === 0;
            document.getElementById('next-btn').disabled = currentQuestionIndex === questions.length - 1;
        }

        // 更新题目导航栏
        function updateQuestionNavBar() {
            const navButtons = document.querySelectorAll('.nav-button');
            navButtons.forEach((btn, index) => {
                btn.className = 'nav-button';
                if (index === currentQuestionIndex) {
                    btn.classList.add('current');
                } else {
                    const questionId = questions[index].id;
                    const answerState = answerStates.get(questionId);
                    if (answerState === 'correct') {
                        btn.classList.add('correct');
                    } else if (answerState === 'incorrect') {
                        btn.classList.add('incorrect');
                    }
                }
            });
        }

        // 跳转题目
        function jumpToQuestion(index) {
            currentQuestionIndex = index;
            renderQuestion();
            updateNavigation();
            updateQuestionNavBar();
        }

        // 上一题/下一题
        function prevQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
                updateNavigation();
                updateQuestionNavBar();
            }
        }

        function nextQuestion() {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
                updateNavigation();
                updateQuestionNavBar();
            }
        }

        // 完成练习
        function finishQuiz() {
            let correctCount = 0;
            questions.forEach(question => {
                if (answerStates.get(question.id) === 'correct') {
                    correctCount++;
                }
            });
            
            document.getElementById('score-display').textContent = \`\${correctCount}/\${questions.length}\`;
            const percentage = Math.round((correctCount / questions.length) * 100);
            document.getElementById('percentage-display').textContent = \`正确率: \${percentage}%\`;
            
            document.getElementById('question-container').style.display = 'none';
            document.querySelector('.bg-white.rounded-lg.shadow-sm.p-4.mb-6').style.display = 'none';
            document.getElementById('results-page').classList.remove('hidden');
        }

        // 重新开始
        function restartQuiz() {
            userAnswers.clear();
            answerStates.clear();
            currentQuestionIndex = 0;
            
            document.getElementById('question-container').style.display = 'block';
            document.querySelector('.bg-white.rounded-lg.shadow-sm.p-4.mb-6').style.display = 'block';
            document.getElementById('results-page').classList.add('hidden');
            
            renderQuestion();
            updateNavigation();
            updateQuestionNavBar();
        }

        // 事件监听
        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('finish-btn').addEventListener('click', finishQuiz);
        document.getElementById('restart-btn').addEventListener('click', restartQuiz);

        // 初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    </script>
</body>
</html>`;
}

// 测试生成HTML
console.log('📝 生成顺序模式HTML...')
const sequentialHtml = generateQuizHtml(testQuizData, '顺序')
fs.writeFileSync('test-sequential-quiz.html', sequentialHtml)
console.log('✅ 顺序模式HTML已生成: test-sequential-quiz.html')

console.log('📝 生成随机模式HTML...')
const randomHtml = generateQuizHtml(testQuizData, '随机')
fs.writeFileSync('test-random-quiz.html', randomHtml)
console.log('✅ 随机模式HTML已生成: test-random-quiz.html')

console.log('\n🎯 测试完成！')
console.log('📖 使用说明:')
console.log('1. 双击打开生成的HTML文件')
console.log('2. 测试刷题功能')
console.log('3. 验证是否符合prompt规范')
