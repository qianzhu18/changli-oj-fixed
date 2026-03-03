const UserExamModel = require('../../models/UserExamModel');
const ExamSelectModel = require('../../models/SelectModel');
const ExamBlankModel = require('../../models/BlankModel');
const ExamJudgeModel = require('../../models/JudgeModel');
const ExamShortModel = require('../../models/ShortModel');
const LearningAnswerRecordModel = require('../../models/LearningAnswerRecordModel');
const ExamService = require('../user/ExamService');

const TYPE_MODEL_MAP = {
  1: ExamSelectModel,
  2: ExamBlankModel,
  3: ExamJudgeModel,
  4: ExamShortModel
};

function normalizeRefs(input, bucket = []) {
  if (Array.isArray(input)) {
    input.forEach((item) => normalizeRefs(item, bucket));
    return bucket;
  }

  if (input && typeof input === 'object') {
    if (input._id && input.category) {
      bucket.push({ _id: String(input._id), category: Number(input.category) });
      return bucket;
    }

    Object.values(input).forEach((value) => normalizeRefs(value, bucket));
  }

  return bucket;
}

function toUniqueRefs(refs) {
  const map = new Map();
  refs.forEach((ref) => {
    if (!ref || !ref._id || !ref.category) return;
    map.set(`${ref._id}-${ref.category}`, ref);
  });
  return Array.from(map.values());
}

function optionLetter(index) {
  return String.fromCharCode(65 + Number(index));
}

function normalizeQuestionForClient(question, questionType) {
  const base = {
    id: String(question._id),
    questionType,
    stem: question.stem || '',
    analysis: question.analysis || ''
  };

  if (questionType === 1) {
    return {
      ...base,
      isMultiple: Number(question.isMultiple || 0),
      options: Array.isArray(question.options)
        ? question.options.map((opt, idx) => ({
            index: idx,
            label: optionLetter(idx),
            content: opt?.content || ''
          }))
        : []
    };
  }

  if (questionType === 2) {
    return {
      ...base,
      blankCount: Array.isArray(question.options) ? question.options.length : 0
    };
  }

  if (questionType === 3) {
    return {
      ...base,
      options: [
        { index: 0, label: 'A', content: '正确' },
        { index: 1, label: 'B', content: '错误' }
      ]
    };
  }

  if (questionType === 4) {
    return {
      ...base,
      answerHint: '主观题支持自评'
    };
  }

  return base;
}

function getCorrectAnswerPayload(question, questionType) {
  if (questionType === 1) {
    const indexes = Array.isArray(question.options)
      ? question.options
          .map((option, index) => (option?.isCorrect ? index : null))
          .filter((v) => v !== null)
      : [];
    return {
      indexes,
      labels: indexes.map(optionLetter)
    };
  }

  if (questionType === 2) {
    return {
      values: Array.isArray(question.options) ? question.options.map((item) => String(item?.content || '').trim()) : []
    };
  }

  if (questionType === 3) {
    return {
      index: Number(question.answer) === 1 ? 0 : 1,
      label: Number(question.answer) === 1 ? 'A(正确)' : 'B(错误)'
    };
  }

  if (questionType === 4) {
    return {
      reference: question.content || ''
    };
  }

  return null;
}

function normalizeSubmittedAnswer(questionType, answer) {
  if (questionType === 1) {
    if (Array.isArray(answer)) {
      return answer.map((v) => Number(v)).filter((v) => Number.isInteger(v)).sort((a, b) => a - b);
    }
    if (answer === null || answer === undefined || answer === '') return [];
    const index = Number(answer);
    return Number.isInteger(index) ? [index] : [];
  }

  if (questionType === 2) {
    if (!Array.isArray(answer)) return [];
    return answer.map((v) => String(v ?? '').trim());
  }

  if (questionType === 3) {
    return Number(answer);
  }

  return answer;
}

function evaluateAnswer(question, questionType, submittedAnswer, selfCorrect) {
  if (questionType === 1) {
    const correctIndexes = (Array.isArray(question.options) ? question.options : [])
      .map((option, index) => (option?.isCorrect ? index : null))
      .filter((v) => v !== null)
      .sort((a, b) => a - b);

    const userIndexes = Array.isArray(submittedAnswer) ? [...submittedAnswer].sort((a, b) => a - b) : [];
    if (Number(question.isMultiple) === 1) {
      return JSON.stringify(userIndexes) === JSON.stringify(correctIndexes);
    }
    return userIndexes.length === 1 && correctIndexes.length === 1 && userIndexes[0] === correctIndexes[0];
  }

  if (questionType === 2) {
    const correctValues = (Array.isArray(question.options) ? question.options : []).map((item) =>
      String(item?.content || '').trim().toLowerCase()
    );
    const userValues = Array.isArray(submittedAnswer)
      ? submittedAnswer.map((item) => String(item || '').trim().toLowerCase())
      : [];
    return JSON.stringify(userValues) === JSON.stringify(correctValues);
  }

  if (questionType === 3) {
    const correctIndex = Number(question.answer) === 1 ? 0 : 1;
    return Number(submittedAnswer) === correctIndex;
  }

  if (questionType === 4) {
    if (typeof selfCorrect === 'boolean') {
      return selfCorrect;
    }
    return null;
  }

  return false;
}

async function loadQuestionByType(questionId, questionType) {
  const model = TYPE_MODEL_MAP[Number(questionType)];
  if (!model) return null;
  return model.findById(questionId).lean();
}

async function buildQuizProgress(uid, quizId) {
  const records = await LearningAnswerRecordModel.find({ uid, quizId }).lean();
  const totalAnswered = records.length;
  const correctCount = records.filter((item) => item.isCorrect === true).length;
  const wrongCount = records.filter((item) => item.isCorrect === false).length;
  const accuracy = totalAnswered > 0 ? Number(((correctCount / totalAnswered) * 100).toFixed(2)) : 0;

  return {
    quizId,
    totalAnswered,
    correctCount,
    wrongCount,
    accuracy
  };
}

const V1LearningService = {
  async getQuizSections(quizId) {
    const userExam = await UserExamModel.findOne({ examId: quizId }).lean();
    if (!userExam || !Array.isArray(userExam.questionTitle)) {
      return [];
    }

    return userExam.questionTitle
      .filter((section) => Number(section?.isPublish) === 1)
      .map((section) => {
        const refs = toUniqueRefs(normalizeRefs(section?.questionIdS || []));
        return {
          id: String(section._id),
          content: section.content || '',
          description: section.description || '',
          questionCount: refs.length
        };
      });
  },

  async getSectionQuestions(quizId, sectionId) {
    const userExam = await UserExamModel.findOne({ examId: quizId }).lean();
    if (!userExam || !Array.isArray(userExam.questionTitle)) {
      return [];
    }

    const targetSection = userExam.questionTitle.find((section) => String(section._id) === String(sectionId));
    if (!targetSection) {
      return [];
    }

    const refs = toUniqueRefs(normalizeRefs(targetSection.questionIdS || []));
    if (!refs.length) {
      return [];
    }

    const questions = await Promise.all(
      refs.map(async (ref) => {
        const question = await loadQuestionByType(ref._id, ref.category);
        if (!question || Number(question.isPublish) !== 1) return null;
        return normalizeQuestionForClient(question, ref.category);
      })
    );

    return questions.filter(Boolean);
  },

  async submitAnswer({ uid, quizId, sectionId, questionId, questionType, answer, selfCorrect }) {
    const type = Number(questionType);
    const question = await loadQuestionByType(questionId, type);
    if (!question) {
      return {
        code: 404,
        success: false,
        message: '题目不存在'
      };
    }

    const normalizedAnswer = normalizeSubmittedAnswer(type, answer);
    const isCorrect = evaluateAnswer(question, type, normalizedAnswer, selfCorrect);

    await LearningAnswerRecordModel.updateOne(
      { uid, quizId, questionId: String(questionId) },
      {
        $set: {
          uid,
          quizId: String(quizId),
          sectionId: String(sectionId || ''),
          questionId: String(questionId),
          questionType: type,
          userAnswer: normalizedAnswer,
          isCorrect,
          submittedAt: new Date()
        }
      },
      { upsert: true }
    );

    if (isCorrect === false) {
      await ExamService.useraddwrongquestion({
        uid,
        questionId,
        examId: quizId,
        Type: type
      });
    }

    if (isCorrect === true) {
      await ExamService.userDeleteWrongQuestion({
        uid,
        questionId
      });
    }

    const progress = await buildQuizProgress(uid, String(quizId));

    return {
      code: 200,
      success: true,
      data: {
        questionId: String(questionId),
        questionType: type,
        isCorrect,
        correctAnswer: getCorrectAnswerPayload(question, type),
        analysis: question.analysis || '',
        progress
      }
    };
  },

  async getProgress({ uid, quizId }) {
    if (quizId) {
      const data = await buildQuizProgress(uid, String(quizId));
      return {
        code: 200,
        success: true,
        data
      };
    }

    const grouped = await LearningAnswerRecordModel.aggregate([
      { $match: { uid } },
      {
        $group: {
          _id: '$quizId',
          totalAnswered: { $sum: 1 },
          correctCount: {
            $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] }
          },
          wrongCount: {
            $sum: { $cond: [{ $eq: ['$isCorrect', false] }, 1, 0] }
          }
        }
      }
    ]);

    return {
      code: 200,
      success: true,
      data: grouped.map((item) => ({
        quizId: item._id,
        totalAnswered: item.totalAnswered,
        correctCount: item.correctCount,
        wrongCount: item.wrongCount,
        accuracy: item.totalAnswered > 0 ? Number(((item.correctCount / item.totalAnswered) * 100).toFixed(2)) : 0
      }))
    };
  },

  async getWrongQuestions({ uid, quizId }) {
    const result = await ExamService.getUserWrongQuestionList(uid);
    const list = Array.isArray(result?.data) ? result.data : [];

    const filtered = quizId
      ? list.filter((item) => String(item.examId) === String(quizId))
      : list;

    const normalized = filtered.map((item) => ({
      questionId: String(item.questionData?._id || ''),
      quizId: String(item.examId || ''),
      quizName: item.examName || '',
      questionType: Number(item.Type || item.questionData?.Type || 0),
      stem: item.questionData?.stem || '',
      analysis: item.questionData?.analysis || '',
      createTime: item.createTime
    }));

    return {
      code: 200,
      success: true,
      data: normalized
    };
  },

  async removeWrongQuestion({ uid, questionId }) {
    const result = await ExamService.userDeleteWrongQuestion({ uid, questionId });
    return {
      code: Number(result?.code || 200),
      success: Number(result?.code || 200) === 200,
      message: result?.message || '已移除'
    };
  }
};

module.exports = V1LearningService;
