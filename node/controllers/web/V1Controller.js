const UserService = require('../../services/user/UserService');
const ExamService = require('../../services/user/ExamService');
const V1LearningService = require('../../services/web/V1LearningService');

const V1Controller = {
  register: async (req, res) => {
    try {
      const { account, password, verifyCode = '' } = req.body;
      if (!account || !password) {
        return res.status(400).send({
          code: 400,
          success: false,
          message: 'account 和 password 为必填项'
        });
      }

      const result = await UserService.UserRegister(account, verifyCode, password);
      return res.status(result.code === 200 ? 200 : result.code).send(result);
    } catch (error) {
      console.error('v1 register 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '注册失败'
      });
    }
  },

  login: async (req, res) => {
    try {
      const { account, password } = req.body;
      if (!account || !password) {
        return res.status(400).send({
          code: 400,
          success: false,
          message: 'account 和 password 为必填项'
        });
      }

      const result = await UserService.UserAccountLogin(account, password);
      const httpStatus = result.code === 200 ? 200 : (result.code || 401);
      return res.status(httpStatus).send(result);
    } catch (error) {
      console.error('v1 login 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '登录失败'
      });
    }
  },

  me: async (req, res) => {
    try {
      const { uid } = req.user;
      const result = await UserService.getUserProfile(uid);
      return res.status(result.code === 200 ? 200 : result.code).send(result);
    } catch (error) {
      console.error('v1 me 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取用户信息失败'
      });
    }
  },

  getQuizList: async (_req, res) => {
    try {
      const data = await ExamService.getExamSubjects();
      return res.status(200).send({
        code: 200,
        success: true,
        data
      });
    } catch (error) {
      console.error('v1 getQuizList 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取题库失败'
      });
    }
  },

  getHotQuizList: async (_req, res) => {
    try {
      const data = await ExamService.getHotExamList();
      return res.status(200).send({
        code: 200,
        success: true,
        data
      });
    } catch (error) {
      console.error('v1 getHotQuizList 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取热门题库失败'
      });
    }
  },

  getQuizTypes: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await V1LearningService.getQuizSections(id);
      return res.status(200).send({
        code: 200,
        success: true,
        data
      });
    } catch (error) {
      console.error('v1 getQuizTypes 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取题型失败'
      });
    }
  },

  getQuizQuestions: async (req, res) => {
    try {
      const { id } = req.params;
      const { sectionId } = req.query;
      if (!sectionId) {
        return res.status(400).send({
          code: 400,
          success: false,
          message: 'sectionId 为必填参数'
        });
      }

      const data = await V1LearningService.getSectionQuestions(id, sectionId);
      return res.status(200).send({
        code: 200,
        success: true,
        data
      });
    } catch (error) {
      console.error('v1 getQuizQuestions 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取题目失败'
      });
    }
  },

  submitAnswer: async (req, res) => {
    try {
      const { uid } = req.user;
      const { quizId, sectionId, questionId, questionType, answer, selfCorrect } = req.body;
      if (!quizId || !questionId || !questionType) {
        return res.status(400).send({
          code: 400,
          success: false,
          message: 'quizId/questionId/questionType 为必填项'
        });
      }

      const result = await V1LearningService.submitAnswer({
        uid,
        quizId,
        sectionId,
        questionId,
        questionType,
        answer,
        selfCorrect
      });

      return res.status(result.code === 200 ? 200 : result.code).send(result);
    } catch (error) {
      console.error('v1 submitAnswer 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '提交答案失败'
      });
    }
  },

  getProgress: async (req, res) => {
    try {
      const { uid } = req.user;
      const { quizId } = req.query;
      const result = await V1LearningService.getProgress({ uid, quizId });
      return res.status(200).send(result);
    } catch (error) {
      console.error('v1 getProgress 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取进度失败'
      });
    }
  },

  getWrongQuestions: async (req, res) => {
    try {
      const { uid } = req.user;
      const { quizId } = req.query;
      const result = await V1LearningService.getWrongQuestions({ uid, quizId });
      return res.status(200).send(result);
    } catch (error) {
      console.error('v1 getWrongQuestions 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '获取错题失败'
      });
    }
  },

  removeWrongQuestion: async (req, res) => {
    try {
      const { uid } = req.user;
      const { questionId } = req.params;
      const result = await V1LearningService.removeWrongQuestion({ uid, questionId });
      return res.status(result.success ? 200 : 400).send(result);
    } catch (error) {
      console.error('v1 removeWrongQuestion 失败', error);
      return res.status(500).send({
        code: 500,
        success: false,
        message: '移除错题失败'
      });
    }
  }
};

module.exports = V1Controller;
