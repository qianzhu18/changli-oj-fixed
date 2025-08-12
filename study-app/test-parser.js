// 解析器测试 - 模拟您截图中的内容格式
const testContent1 = `测试题库

1. JavaScript是什么？
A. 编程语言
B. 数据库
C. 操作系统
D. 浏览器
答案：A

2. HTML是什么？
A. 样式表
B. 标记语言
C. 脚本语言
D. 数据库
答案：B`;

// 模拟您截图中显示的格式（题目+数字选项）
const testContent2 = `Generated json

1. 基于您提供的内容（26025 个字符），请选择最合适的描述：

1 内容为空或无效

2 内容已成功解析并可用于生成题库

3 内容格式不支持

4 需要更多信息才能处理`;

// 另一种可能的格式
const testContent3 = `物理题库

1. 什么是牛顿第一定律？

2. 光的传播速度是多少？

3. 如何计算物体的动能？`;

// 模拟解析逻辑
function parseQuizContent(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const questions = [];
  let currentQuestion = {};
  let questionCounter = 0;
  let title = "智能题库";

  // 提取标题
  if (lines.length > 0 && !isQuestionLine(lines[0])) {
    title = lines[0];
    lines.shift();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isQuestionLine(line)) {
      // 保存上一题
      if (currentQuestion.question) {
        finalizeQuestion(currentQuestion, questions, questionCounter);
        questionCounter++;
      }

      // 开始新题
      currentQuestion = {
        id: `q_${questionCounter + 1}`,
        question: extractQuestion(line),
        options: [],
        type: 'multiple-choice'
      };
    }
    else if (isOptionLine(line)) {
      if (currentQuestion.options) {
        currentQuestion.options.push(extractOption(line));
      }
    }
    // 检测数字编号选项
    else if (isNumberedOptionLine(line)) {
      if (currentQuestion.options) {
        currentQuestion.options.push(extractNumberedOption(line));
      }
    }
    else if (isAnswerLine(line)) {
      const answerInfo = extractAnswer(line, currentQuestion.options || []);
      currentQuestion.correctAnswer = answerInfo.index;
      currentQuestion.explanation = answerInfo.explanation;
    }
  }

  // 保存最后一题
  if (currentQuestion.question) {
    finalizeQuestion(currentQuestion, questions, questionCounter);
  }

  return {
    title,
    questions,
    totalQuestions: questions.length
  };
}

function isQuestionLine(line) {
  // 检查是否以"题目"开头
  if (line.startsWith('题目')) {
    return true;
  }

  if (/^\d+[.、]\s*.+/.test(line)) {
    // 题目通常包含疑问词、问号，或者长度较长
    return line.includes('？') || line.includes('?') ||
           line.includes('什么') || line.includes('哪个') || line.includes('如何') ||
           line.includes('是否') || line.includes('选择') || line.includes('描述') ||
           line.length > 20;
  }
  return false;
}

function isOptionLine(line) {
  if (/^[A-D][.、]\s*.+/.test(line)) {
    return true;
  }

  // 检查是否以数字开头的选项格式（如：1 选项内容）
  if (/^\d+\s+.+/.test(line) && !isQuestionLine(line)) {
    return true;
  }

  // 检查是否以数字和点开头但不是题目的选项格式
  if (/^\d+[.]\s*.+/.test(line) && !isQuestionLine(line) && line.length < 100) {
    return true;
  }

  return !isQuestionLine(line) && !isAnswerLine(line) && line.length > 0 && line.length < 200;
}

function isAnswerLine(line) {
  return line.startsWith('答案：') || line.startsWith('答案:') || /^答案\s*[：:]\s*/.test(line);
}

function extractQuestion(line) {
  return line.replace(/^\d+[.、]\s*/, '').trim();
}

function extractOption(line) {
  return line.trim();
}

function isNumberedOptionLine(line) {
  // 匹配 "1 选项内容" 或 "1. 选项内容" 格式，但不是题目
  return /^\d+\s+.+/.test(line) || (/^\d+[.]\s*.+/.test(line) && !isQuestionLine(line));
}

function extractNumberedOption(line) {
  return line.replace(/^\d+[.\s]*/, '').trim();
}

function extractAnswer(line, options) {
  let answerText = line.replace(/^答案\s*[：:]\s*/, '').trim();

  // 如果答案是A、B、C、D格式，转换为索引
  if (/^[A-D]$/i.test(answerText)) {
    const index = answerText.toUpperCase().charCodeAt(0) - 65;
    return { index, explanation: options[index] || answerText };
  }

  // 直接在选项中查找匹配的答案
  for (let i = 0; i < options.length; i++) {
    const option = options[i].replace(/^[A-D][.、]\s*/, '').trim();
    if (option === answerText || answerText.includes(option) || option.includes(answerText)) {
      return { index: i, explanation: answerText };
    }
  }

  return { index: 0, explanation: answerText };
}

function finalizeQuestion(currentQuestion, questions, questionCounter) {
  if (!currentQuestion.question) return;

  if (!currentQuestion.options || currentQuestion.options.length === 0) {
    currentQuestion.type = 'fill-blank';
    currentQuestion.options = [];
    currentQuestion.correctAnswer = 0;
  }

  if (currentQuestion.correctAnswer === undefined) {
    currentQuestion.correctAnswer = 0;
  }

  questions.push({
    id: currentQuestion.id || `q_${questionCounter + 1}`,
    question: currentQuestion.question,
    options: currentQuestion.options || [],
    correctAnswer: currentQuestion.correctAnswer,
    type: currentQuestion.type || 'multiple-choice',
    explanation: currentQuestion.explanation
  });
}

// 测试多种格式
console.log('=== 测试1: 标准格式 ===');
const result1 = parseQuizContent(testContent1);
console.log('解析结果:', JSON.stringify(result1, null, 2));

console.log('\n=== 测试2: 数字选项格式 ===');
const result2 = parseQuizContent(testContent2);
console.log('解析结果:', JSON.stringify(result2, null, 2));

console.log('\n=== 测试3: 只有题目格式 ===');
const result3 = parseQuizContent(testContent3);
console.log('解析结果:', JSON.stringify(result3, null, 2));
