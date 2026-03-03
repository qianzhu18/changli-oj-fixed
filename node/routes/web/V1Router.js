const express = require('express');
const JWT = require('../../MiddleWares/jwt');
const V1Controller = require('../../controllers/web/V1Controller');

const V1Router = express.Router();

V1Router.post('/api/v1/auth/register', V1Controller.register);
V1Router.post('/api/v1/auth/login', V1Controller.login);
V1Router.get('/api/v1/auth/me', JWT.verifyTokenMiddleware(), V1Controller.me);

V1Router.get('/api/v1/quizzes', V1Controller.getQuizList);
V1Router.get('/api/v1/quizzes/hot', V1Controller.getHotQuizList);
V1Router.get('/api/v1/quizzes/:id/types', V1Controller.getQuizTypes);
V1Router.get('/api/v1/quizzes/:id/questions', V1Controller.getQuizQuestions);

V1Router.post('/api/v1/learning/submit', JWT.verifyTokenMiddleware(), V1Controller.submitAnswer);
V1Router.get('/api/v1/learning/progress', JWT.verifyTokenMiddleware(), V1Controller.getProgress);
V1Router.get('/api/v1/learning/wrong-questions', JWT.verifyTokenMiddleware(), V1Controller.getWrongQuestions);
V1Router.post('/api/v1/learning/wrong-questions/:questionId/remove', JWT.verifyTokenMiddleware(), V1Controller.removeWrongQuestion);

module.exports = V1Router;
