import { QuizParser } from '../services/localQuizParser';
import { QuizHtmlGenerator } from '../services/localQuizHtmlGenerator';

describe('Local Quiz Parser + HTML Generator', () => {
  it('parses text content and generates a self-contained HTML page', () => {
    const content = `1. 1+1等于多少？
A. 1
B. 2
C. 3

答案：B`;

    const quizData = QuizParser.parseQuizContent(content);
    expect(quizData.questions.length).toBeGreaterThan(0);

    const html = QuizHtmlGenerator.generateQuizHtml(quizData, '顺序');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('题目导航');
  });
});

