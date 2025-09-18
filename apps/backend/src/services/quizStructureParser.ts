import { randomUUID } from 'crypto';

export type DetectedQuizFormat = 'standard' | 'numbered-only' | 'mixed' | 'unknown';

export interface ParsedQuizQuestion {
  id: string;
  index: number;
  stem: string;
  options: string[];
  correctOptionLabels: string[];
  correctOptionIndexes: number[];
  answerText?: string;
  type: 'single-choice' | 'multiple-choice' | 'fill-in';
  explanation?: string;
  rawLines: string[];
}

export interface StructuredQuizParse {
  title: string;
  detectedFormat: DetectedQuizFormat;
  questions: ParsedQuizQuestion[];
  warnings: string[];
  formattedText: string;
}

interface ParsingState {
  currentQuestion: ParsedQuizQuestion | null;
  questions: ParsedQuizQuestion[];
  warnings: string[];
  titleLines: string[];
}

export class QuizStructureParser {
  static parse(raw: string): StructuredQuizParse {
    const normalized = this.normalize(raw);
    const lines = normalized.split('\n');

    const state: ParsingState = {
      currentQuestion: null,
      questions: [],
      warnings: [],
      titleLines: []
    };

    let index = 0;

    for (const originalLine of lines) {
      const line = originalLine.trim();
      if (!line) {
        continue;
      }

      if (this.isQuestionLine(line)) {
        if (state.currentQuestion) {
          this.finalizeQuestion(state);
        }
        index += 1;
        state.currentQuestion = this.createQuestion(line, index);
        continue;
      }

      if (!state.currentQuestion) {
        // 尚未遇到题干，视为标题/说明
        state.titleLines.push(line);
        continue;
      }

      if (this.isOptionLine(line)) {
        this.appendOption(state.currentQuestion, line);
        continue;
      }

      if (this.isAnswerLine(line)) {
        this.appendAnswer(state.currentQuestion, line);
        continue;
      }

      if (this.isExplanationLine(line)) {
        this.appendExplanation(state.currentQuestion, line);
        continue;
      }

      this.appendToStemOrExplanation(state.currentQuestion, line);
    }

    if (state.currentQuestion) {
      this.finalizeQuestion(state);
    }

    if (state.questions.length === 0) {
      state.warnings.push('未能在文本中识别出任何题目，已回退到原始文本。');
    }

    const detectedFormat = this.detectFormat(state.questions);
    const title = this.deriveTitle(state, state.questions);
    const formattedText = this.buildFormattedText(title, state.questions);

    return {
      title,
      detectedFormat,
      questions: state.questions,
      warnings: state.warnings,
      formattedText
    };
  }

  private static normalize(input: string): string {
    if (!input) {
      return '';
    }

    // 全角转半角
    const toHalfWidth = (text: string) => {
      let out = '';
      for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        if (code === 0x3000) {
          out += String.fromCharCode(0x20);
          continue;
        }
        if (code >= 0xFF01 && code <= 0xFF5E) {
          out += String.fromCharCode(code - 0xFEE0);
          continue;
        }
        out += text[i];
      }
      return out;
    };

    const normalized = toHalfWidth(input)
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[\t\v\f\r]/g, ' ')
      .replace(/ {2,}/g, ' ')
      .replace(/【[^】]+】/g, '')
      .replace(/，/g, ',')
      .replace(/；/g, ';')
      .replace(/。/g, '.')
      .replace(/[（]/g, '(')
      .replace(/[）]/g, ')')
      .replace(/[．。•·]/g, '.');

    return normalized
      // 保证题号独立成行，避免表格或段落合并
      .replace(/(^|\n)\s*(\d+)[\.、:）)]?/g, (match, prefix, num) => `${prefix}${num}. `)
      // 选项前缀单独占行
      .replace(/(^|\n)\s*([A-Ha-h])[\.、:）)]?/g, (match, prefix, label) => `${prefix}${label}. `)
      // 答案/解析放到新行
      .replace(/(^|\n)\s*(答案\s*[：:])/gi, (match, prefix) => `${prefix}答案：`)
      .replace(/(^|\n)\s*(解析\s*[：:])/gi, (match, prefix) => `${prefix}解析：`);
  }

  private static isQuestionLine(line: string): boolean {
    return /^(第\s*\d+\s*题|\(?\d+\)?[\.、:）)]\s*|Q\d+[:.)]|问题\s*\d+)/i.test(line);
  }

  private static isOptionLine(line: string): boolean {
    return /^[A-Ha-h][\.、:)\-]\s*/.test(line);
  }

  private static isAnswerLine(line: string): boolean {
    return /^(答案|正确答案|参考答案|解答|Answer|Correct Answer)[\s:：]/i.test(line);
  }

  private static isExplanationLine(line: string): boolean {
    return /^(解析|说明|解释|分析|解答|Explanation)[\s:：]/i.test(line);
  }

  private static createQuestion(line: string, index: number): ParsedQuizQuestion {
    const stem = line
      .replace(/^(第\s*\d+\s*题)/i, '')
      .replace(/^\(?\d+\)?[\.、:）)]\s*/, '')
      .replace(/^Q\d+[:.)]\s*/i, '')
      .trim();

    return {
      id: randomUUID(),
      index,
      stem,
      options: [],
      correctOptionLabels: [],
      correctOptionIndexes: [],
      type: 'single-choice',
      rawLines: [line]
    };
  }

  private static appendOption(question: ParsedQuizQuestion, line: string) {
    const match = line.match(/^([A-Ha-h])[\.、:)\-]\s*(.+)$/);
    if (!match) {
      return;
    }
    const label = match[1].toUpperCase();
    const text = match[2].trim();
    question.options.push(text);
    question.rawLines.push(line);

    if (question.correctOptionIndexes.length > 0) {
      // 题目已解析答案但当前行才出现选项 -> 更新索引
      this.recalculateAnswerIndexes(question);
    }
  }

  private static appendAnswer(question: ParsedQuizQuestion, line: string) {
    const answerText = line
      .replace(/^(答案|正确答案|参考答案|解答|Answer|Correct Answer)[\s:：]?/i, '')
      .trim();

    const parsed = this.parseAnswer(answerText, question.options.length);
    question.correctOptionLabels = parsed.labels;
    question.correctOptionIndexes = parsed.indexes;
    question.answerText = parsed.text;
    question.type = parsed.type;
    question.rawLines.push(line);
  }

  private static appendExplanation(question: ParsedQuizQuestion, line: string) {
    const explanationText = line
      .replace(/^(解析|说明|解释|分析|Explanation)[\s:：]?/i, '')
      .trim();

    question.explanation = question.explanation
      ? `${question.explanation}\n${explanationText}`
      : explanationText;
    question.rawLines.push(line);
  }

  private static appendToStemOrExplanation(question: ParsedQuizQuestion, line: string) {
    question.rawLines.push(line);

    if (!question.answerText) {
      question.stem = `${question.stem} ${line}`.trim();
      return;
    }

    question.explanation = question.explanation
      ? `${question.explanation}\n${line}`
      : line;
  }

  private static finalizeQuestion(state: ParsingState) {
    const question = state.currentQuestion!;

    if (question.options.length === 0 && !question.answerText) {
      state.warnings.push(`题目 ${question.index} 缺少选项与答案，将视为填空题。`);
      question.type = 'fill-in';
    } else if (question.options.length > 0 && question.correctOptionIndexes.length === 0) {
      state.warnings.push(`题目 ${question.index} 未找到答案，将保留选项供AI推断。`);
      question.type = 'single-choice';
    }

    state.questions.push(question);
    state.currentQuestion = null;
  }

  private static detectFormat(questions: ParsedQuizQuestion[]): DetectedQuizFormat {
    if (questions.length === 0) {
      return 'unknown';
    }

    const withOptions = questions.filter(q => q.options.length > 0).length;
    const withAnswers = questions.filter(q => q.correctOptionIndexes.length > 0 || q.answerText).length;

    if (withOptions === questions.length && withAnswers === questions.length) {
      return 'standard';
    }

    if (withOptions === 0) {
      return 'numbered-only';
    }

    return 'mixed';
  }

  private static deriveTitle(state: ParsingState, questions: ParsedQuizQuestion[]): string {
    if (state.titleLines.length > 0) {
      return state.titleLines.join(' ').slice(0, 120);
    }

    if (questions.length > 0) {
      const first = questions[0].stem;
      return first.length > 40 ? `${first.slice(0, 40)}...` : first;
    }

    return '未命名题库';
  }

  private static buildFormattedText(title: string, questions: ParsedQuizQuestion[]): string {
    const lines: string[] = [];
    lines.push(`题库：${title}`);
    lines.push('');

    questions.forEach((question, idx) => {
      lines.push(`${idx + 1}. ${question.stem}`);
      question.options.forEach((option, optionIdx) => {
        const label = String.fromCharCode(65 + optionIdx);
        lines.push(`${label}. ${option}`);
      });
      if (question.answerText) {
        lines.push(`答案：${question.answerText}`);
      }
      if (question.explanation) {
        lines.push(`解析：${question.explanation}`);
      }
      lines.push('');
    });

    return lines.join('\n').trim();
  }

  private static parseAnswer(answerText: string, optionCount: number): {
    labels: string[];
    indexes: number[];
    text: string;
    type: ParsedQuizQuestion['type'];
  } {
    const cleaned = answerText.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return {
        labels: [],
        indexes: [],
        text: '',
        type: optionCount > 0 ? 'single-choice' : 'fill-in'
      };
    }

    // 拆分答案（支持 A,B / A、B / AB / 1,2 等格式）
    const rawTokens = cleaned
      .split(/[、,;\s]/)
      .map(token => token.trim())
      .filter(Boolean);

    const labels: string[] = [];
    const indexes: number[] = [];

    rawTokens.forEach(token => {
      const upper = token.toUpperCase();
      if (/^[A-H]$/.test(upper)) {
        labels.push(upper);
        const idx = upper.charCodeAt(0) - 65;
        if (idx >= 0 && idx < optionCount) {
          indexes.push(idx);
        }
        return;
      }

      if (/^\d+$/.test(token)) {
        const numericIndex = parseInt(token, 10) - 1;
        if (numericIndex >= 0 && numericIndex < optionCount) {
          indexes.push(numericIndex);
          labels.push(String.fromCharCode(65 + numericIndex));
          return;
        }
      }
    });

    let type: ParsedQuizQuestion['type'] = 'fill-in';
    if (optionCount > 0) {
      if (indexes.length > 1) {
        type = 'multiple-choice';
      } else if (indexes.length === 1) {
        type = 'single-choice';
      } else {
        type = 'single-choice';
      }
    }

    return {
      labels,
      indexes,
      text: cleaned,
      type: optionCount > 0 ? type : 'fill-in'
    };
  }

  private static recalculateAnswerIndexes(question: ParsedQuizQuestion) {
    if (!question.answerText) {
      return;
    }
    const parsed = this.parseAnswer(question.answerText, question.options.length);
    question.correctOptionLabels = parsed.labels;
    question.correctOptionIndexes = parsed.indexes;
    question.type = parsed.type;
  }
}
