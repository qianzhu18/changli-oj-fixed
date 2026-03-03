/**
 * MVP 调试种子数据
 * 用法：
 * 1) node script/init-database.js
 * 2) node script/seed-mvp-demo.js
 */
const { dbManager } = require('../db/db.enhanced');
const ExamModel = require('../models/ExamModel');
const UserExamModel = require('../models/UserExamModel');
const SelectModel = require('../models/SelectModel');
const BlankModel = require('../models/BlankModel');
const JudgeModel = require('../models/JudgeModel');
const ShortModel = require('../models/ShortModel');
const ConsumerModel = require('../models/ConsumerModel');
const { getNextUserCount } = require('../models/CounterModel');
const { hashPassword } = require('../helpers/passwordHelper');

async function ensureDemoExam() {
  const existExam = await ExamModel.findOne({ code: 'MVP-DEMO-001' });
  if (existExam) {
    console.log(`✅ 已存在演示题库: ${existExam.name}`);
    return existExam;
  }

  const exam = await ExamModel.create({
    name: 'MVP 演示高数题库',
    code: 'MVP-DEMO-001',
    category: [1],
    year: '2026',
    cover: '',
    isPublish: 1,
    isAuthRequired: 0,
    creator: 'system',
    day: new Date('2026-01-10'),
    createdTime: new Date()
  });

  console.log(`✅ 创建演示题库: ${exam.name}`);
  return exam;
}

async function ensureDemoQuestions(examId) {
  const existingSelect = await SelectModel.findOne({ examId, stem: '函数 f(x)=x^2 在 x=2 处的导数是？' });
  if (existingSelect) {
    console.log('✅ 演示题目已存在，跳过题目创建');
    return;
  }

  const select = await SelectModel.create({
    examId,
    stem: '函数 f(x)=x^2 在 x=2 处的导数是？',
    options: [
      { content: '2', isCorrect: false },
      { content: '3', isCorrect: false },
      { content: '4', isCorrect: true },
      { content: '8', isCorrect: false }
    ],
    isMultiple: 0,
    isPublish: 1,
    analysis: "f'(x)=2x，代入 x=2 得 4。",
    isAIanswer: 0,
    isAddUserList: 1,
    Type: 1,
    createdTime: new Date()
  });

  const blank = await BlankModel.create({
    examId,
    stem: '极限 lim(x→0) sin(x)/x = ___ 。',
    options: [{ content: '1' }],
    isPublish: 1,
    analysis: '经典极限，结果为 1。',
    isAIanswer: 0,
    isAddUserList: 1,
    Type: 2,
    createdTime: new Date()
  });

  const judge = await JudgeModel.create({
    examId,
    stem: '函数 y=x^3 是偶函数。',
    answer: 0,
    isPublish: 1,
    analysis: 'x^3 为奇函数，不是偶函数。',
    isAIanswer: 0,
    isAddUserList: 1,
    Type: 3,
    createdTime: new Date()
  });

  const short = await ShortModel.create({
    examId,
    stem: '简述导数的几何意义。',
    content: '导数表示曲线在该点切线的斜率，反映函数瞬时变化率。',
    isPublish: 1,
    analysis: '写出“切线斜率”与“瞬时变化率”即可得分。',
    isAIanswer: 0,
    isAddUserList: 1,
    Type: 4,
    createdTime: new Date()
  });

  const refs = [
    { _id: select._id, category: 1 },
    { _id: blank._id, category: 2 },
    { _id: judge._id, category: 3 },
    { _id: short._id, category: 4 }
  ];

  await UserExamModel.updateOne(
    { examId },
    {
      $set: {
        examId,
        questionTitle: [
          {
            content: '综合练习',
            description: 'MVP 调试分组',
            questionIdS: refs.map((item) => [item]),
            isPublish: 1
          }
        ]
      }
    },
    { upsert: true }
  );

  console.log('✅ 创建演示题目与题型分组');
}

async function ensureDemoConsumer() {
  const account = 'mvp_user';
  const password = 'mvp123456';

  const existing = await ConsumerModel.findOne({
    $or: [{ username: account }, { email: account }]
  });

  if (existing) {
    console.log(`✅ 演示用户已存在: ${account}`);
    return;
  }

  const userCount = await getNextUserCount();
  await ConsumerModel.create({
    username: account,
    email: account,
    password: await hashPassword(password),
    nickname: 'MVP学员',
    createTime: new Date(),
    userCount
  });

  console.log(`✅ 创建演示用户: ${account} / ${password}`);
}

async function main() {
  try {
    console.log('🚀 开始初始化 MVP 演示数据...');
    await dbManager.connect();

    const exam = await ensureDemoExam();
    await ensureDemoQuestions(String(exam._id));
    await ensureDemoConsumer();

    console.log('🎉 MVP 演示数据已就绪');
    process.exit(0);
  } catch (error) {
    console.error('❌ 种子数据失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
