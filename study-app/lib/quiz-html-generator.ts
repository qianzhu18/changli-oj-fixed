import { ParsedQuestion, QuizData } from './quiz-parser'

export class QuizHtmlGenerator {
  /**
   * 生成完整的刷题HTML页面 - 严格按照题库转换prompt规则
   */
  static generateQuizHtml(quizData: QuizData, orderMode: '顺序' | '随机' = '顺序'): string {
    // 根据用户选择处理题目顺序
    let questions = [...quizData.questions]
    if (orderMode === '随机') {
      // 一次性打乱整个题库顺序，生成全新的随机序列
      questions = this.shuffleArray(questions)
      // 重新编号以保持连续性
      questions = questions.map((q, index) => ({
        ...q,
        id: `q_${index + 1}`
      }))
    }

    // 自动检测题目类型
    const questionType = this.detectQuestionType(questions)
    
    return this.generateCompleteHtml(questions, quizData.title, orderMode, questionType)
  }

  /**
   * 自动检测题目类型
   */
  private static detectQuestionType(questions: ParsedQuestion[]): 'multipleChoice' | 'fillInTheBlank' {
    if (questions.length === 0) return 'multipleChoice'
    
    // 检查第一个题目的结构
    const firstQuestion = questions[0]
    
    // 如果有选项且选项数量大于1，则为选择题
    if (firstQuestion.options && firstQuestion.options.length > 1) {
      return 'multipleChoice'
    }
    
    // 否则为填空题
    return 'fillInTheBlank'
  }

  /**
   * 生成完整的HTML页面
   */
  private static generateCompleteHtml(
    questions: ParsedQuestion[], 
    title: string, 
    orderMode: string,
    questionType: 'multipleChoice' | 'fillInTheBlank'
  ): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* 严格按照prompt要求：静态样式，无过渡动画 */
        .correct-option { background-color: #dcfce7 !important; border-color: #16a34a !important; }
        .incorrect-option { background-color: #fef2f2 !important; border-color: #dc2626 !important; }
        .fill-input { width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px; }
        .fill-input.correct { border-color: #16a34a !important; background-color: #dcfce7 !important; }
        .fill-input.incorrect { border-color: #dc2626 !important; background-color: #fef2f2 !important; }
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
        .option-button:disabled {
            cursor: not-allowed;
        }
        .question-content {
            white-space: pre-wrap;
            line-height: 1.6;
            font-size: 18px;
        }
        .answer-feedback {
            margin-top: 12px;
            padding: 12px;
            border-radius: 8px;
            font-weight: 500;
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
                <h1 class="text-2xl md:text-3xl font-bold text-gray-800">${title}</h1>
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
                <button id="prev-btn" class="px-6 py-3 bg-gray-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    上一题
                </button>
                <button id="finish-btn" class="px-6 py-3 bg-green-500 text-white rounded-lg">
                    完成练习
                </button>
                <button id="next-btn" class="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
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
        let userAnswers = new Map(); // 存储用户答案
        let answerStates = new Map(); // 存储答题状态 (correct/incorrect)
        
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
            \`;
            
            if (questionType === 'multipleChoice') {
                // 选择题UI
                html += '<div class="space-y-3">';
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
                html += '</div>';
            } else {
                // 填空题UI
                const isAnswered = userAnswers.has(question.id);
                const userAnswer = userAnswers.get(question.id) || '';
                const answerState = answerStates.get(question.id);
                
                let inputClass = 'fill-input';
                if (answerState === 'correct') {
                    inputClass += ' correct';
                } else if (answerState === 'incorrect') {
                    inputClass += ' incorrect';
                }
                
                html += \`
                    <div class="space-y-4">
                        <div class="flex gap-3">
                            <input type="text" 
                                   id="fill-input" 
                                   class="\${inputClass}"
                                   value="\${userAnswer}"
                                   placeholder="请输入答案"
                                   \${isAnswered ? 'disabled' : ''}
                                   onkeypress="handleEnterKey(event)">
                            <button id="submit-answer" 
                                    class="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                                    onclick="submitFillAnswer()"
                                    \${isAnswered ? 'disabled' : ''}>
                                提交答案
                            </button>
                        </div>
                \`;
                
                // 显示答案反馈
                if (answerState === 'incorrect') {
                    html += \`
                        <div class="answer-feedback bg-red-50 border border-red-200 text-red-800">
                            正确答案：\${question.explanation || question.options[0] || '未知'}
                        </div>
                    \`;
                }
                
                html += '</div>';
            }
            
            html += '</div>';
            container.innerHTML = html;
            
            // 更新题号显示
            document.getElementById('current-num').textContent = currentQuestionIndex + 1;
        }

        // 选择题选项点击
        function selectOption(optionIndex) {
            const question = questions[currentQuestionIndex];
            if (userAnswers.has(question.id)) return; // 已答题则不允许修改

            // 保存用户答案
            userAnswers.set(question.id, optionIndex);

            // 判断正确性
            const isCorrect = optionIndex === question.correctAnswer;
            answerStates.set(question.id, isCorrect ? 'correct' : 'incorrect');

            // 立即重新渲染（静态更新，无动画）
            renderQuestion();
            updateQuestionNavBar();
        }

        // 填空题提交答案
        function submitFillAnswer() {
            const question = questions[currentQuestionIndex];
            const input = document.getElementById('fill-input');
            const userAnswer = input.value.trim();

            if (!userAnswer) {
                alert('请输入答案');
                return;
            }

            // 保存用户答案
            userAnswers.set(question.id, userAnswer);

            // 严格完全匹配验证
            const correctAnswer = question.options[0] || question.explanation || '';
            const isCorrect = userAnswer === correctAnswer;
            answerStates.set(question.id, isCorrect ? 'correct' : 'incorrect');

            // 立即重新渲染
            renderQuestion();
            updateQuestionNavBar();
        }

        // 处理回车键
        function handleEnterKey(event) {
            if (event.key === 'Enter') {
                submitFillAnswer();
            }
        }

        // 更新导航按钮状态
        function updateNavigation() {
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');

            prevBtn.disabled = currentQuestionIndex === 0;
            nextBtn.disabled = currentQuestionIndex === questions.length - 1;
        }

        // 更新题目导航栏
        function updateQuestionNavBar() {
            const navButtons = document.querySelectorAll('.nav-button');

            navButtons.forEach((btn, index) => {
                // 重置样式
                btn.className = 'nav-button';

                // 当前题目
                if (index === currentQuestionIndex) {
                    btn.classList.add('current');
                }
                // 已答题目
                else {
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

        // 跳转到指定题目
        function jumpToQuestion(index) {
            currentQuestionIndex = index;
            renderQuestion();
            updateNavigation();
            updateQuestionNavBar();
        }

        // 上一题
        function prevQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
                updateNavigation();
                updateQuestionNavBar();
            }
        }

        // 下一题
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
            // 计算成绩
            let correctCount = 0;
            let totalAnswered = 0;

            questions.forEach(question => {
                if (answerStates.has(question.id)) {
                    totalAnswered++;
                    if (answerStates.get(question.id) === 'correct') {
                        correctCount++;
                    }
                }
            });

            // 显示结果
            document.getElementById('score-display').textContent = \`\${correctCount}/\${questions.length}\`;
            const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
            document.getElementById('percentage-display').textContent = \`正确率: \${percentage}%\`;

            // 隐藏题目区域，显示结果页面
            document.getElementById('question-container').style.display = 'none';
            document.querySelector('.bg-white.rounded-lg.shadow-sm.p-4.mb-6').style.display = 'none'; // 导航按钮
            document.getElementById('results-page').classList.remove('hidden');
        }

        // 重新开始
        function restartQuiz() {
            // 清空所有记录
            userAnswers.clear();
            answerStates.clear();
            currentQuestionIndex = 0;

            // 显示题目区域，隐藏结果页面
            document.getElementById('question-container').style.display = 'block';
            document.querySelector('.bg-white.rounded-lg.shadow-sm.p-4.mb-6').style.display = 'block'; // 导航按钮
            document.getElementById('results-page').classList.add('hidden');

            // 重新渲染
            renderQuestion();
            updateNavigation();
            updateQuestionNavBar();
        }

        // 事件监听器
        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('finish-btn').addEventListener('click', finishQuiz);
        document.getElementById('restart-btn').addEventListener('click', restartQuiz);

        // 键盘快捷键
        document.addEventListener('keydown', function(event) {
            if (event.key === 'ArrowLeft') {
                prevQuestion();
            } else if (event.key === 'ArrowRight') {
                nextQuestion();
            } else if (event.key >= '1' && event.key <= '4' && questionType === 'multipleChoice') {
                const optionIndex = parseInt(event.key) - 1;
                const question = questions[currentQuestionIndex];
                if (optionIndex < question.options.length && !userAnswers.has(question.id)) {
                    selectOption(optionIndex);
                }
            }
        });

        // 页面加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    </script>
</body>
</html>`;
  }

  /**
   * Fisher-Yates 洗牌算法
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
