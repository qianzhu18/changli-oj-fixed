#!/usr/bin/env node

/**
 * 测试TwoAPI集成的脚本
 * 验证新的API调用方式是否正常工作
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'https://twoapi-ui.qiangtu.com/v1';
const API_KEY = 'sk-1e49426A5A63Ee3C33256F17EF152C02';

async function testTwoAPIConnection() {
  console.log('🔍 测试TwoAPI连接...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-pro-preview-06-05',
        messages: [
          { role: 'user', content: 'Hello, please respond with "API connection successful"' }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      console.log('✅ TwoAPI连接成功!');
      console.log('📝 响应内容:', data.choices[0].message.content);
      return true;
    } else {
      console.log('❌ TwoAPI响应格式异常');
      console.log('📄 完整响应:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ TwoAPI连接失败:', error.message);
    return false;
  }
}

async function testQuizGeneration() {
  console.log('\n🎯 测试题库生成...');
  
  const testContent = `
1. JavaScript是什么类型的语言？
A. 编译型语言
B. 解释型语言
C. 汇编语言
D. 机器语言

2. 以下哪个不是JavaScript的数据类型？
A. string
B. number
C. boolean
D. char
`;

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-pro-preview-06-05',
        messages: [
          { 
            role: 'system', 
            content: `你是一个专业的题库转换助手。请将以下题库内容转换为一个完整的HTML刷题网页。

要求：
1. 单HTML文件，包含所有CSS和JavaScript
2. 使用Tailwind CSS
3. 一次显示一题，选择后立即反馈
4. 答对绿色，答错红色
5. 提供上下题导航和题号栏
6. 响应式设计，适合手机使用

请生成完整的HTML代码：` 
          },
          { role: 'user', content: testContent }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      const htmlContent = data.choices[0].message.content;
      
      if (htmlContent.includes('<html') || htmlContent.includes('<!DOCTYPE')) {
        console.log('✅ 题库生成成功!');
        console.log('📊 生成的HTML长度:', htmlContent.length, '字符');
        
        // 保存生成的HTML到文件
        const fs = require('fs');
        fs.writeFileSync('test-generated-quiz.html', htmlContent);
        console.log('💾 HTML已保存到 test-generated-quiz.html');
        
        return true;
      } else {
        console.log('❌ 生成的内容不是有效的HTML');
        console.log('📄 生成内容预览:', htmlContent.substring(0, 500) + '...');
        return false;
      }
    } else {
      console.log('❌ 题库生成失败，响应格式异常');
      return false;
    }
  } catch (error) {
    console.log('❌ 题库生成失败:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 开始测试TwoAPI集成...\n');
  
  const connectionTest = await testTwoAPIConnection();
  const generationTest = await testQuizGeneration();
  
  console.log('\n📋 测试结果总结:');
  console.log('- API连接测试:', connectionTest ? '✅ 通过' : '❌ 失败');
  console.log('- 题库生成测试:', generationTest ? '✅ 通过' : '❌ 失败');
  
  if (connectionTest && generationTest) {
    console.log('\n🎉 所有测试通过！TwoAPI集成成功！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试过程中发生错误:', error);
  process.exit(1);
});
