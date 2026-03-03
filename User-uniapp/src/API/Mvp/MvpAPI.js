import { http } from '../../util/http';

export async function mvpRegister({ account, password }) {
  return http({
    url: '/api/v1/auth/register',
    method: 'POST',
    data: {
      account,
      password,
      verifyCode: ''
    }
  });
}

export async function mvpLogin({ account, password }) {
  return http({
    url: '/api/v1/auth/login',
    method: 'POST',
    data: { account, password }
  });
}

export async function mvpMe() {
  return http({
    url: '/api/v1/auth/me',
    method: 'GET'
  });
}

export async function getMvpQuizzes() {
  return http({
    url: '/api/v1/quizzes',
    method: 'GET'
  });
}

export async function getMvpQuizSections(quizId) {
  return http({
    url: `/api/v1/quizzes/${quizId}/types`,
    method: 'GET'
  });
}

export async function getMvpSectionQuestions(quizId, sectionId) {
  return http({
    url: `/api/v1/quizzes/${quizId}/questions?sectionId=${encodeURIComponent(sectionId)}`,
    method: 'GET'
  });
}

export async function submitMvpAnswer(payload) {
  return http({
    url: '/api/v1/learning/submit',
    method: 'POST',
    data: payload
  });
}

export async function getMvpProgress(quizId) {
  return http({
    url: `/api/v1/learning/progress?quizId=${encodeURIComponent(quizId)}`,
    method: 'GET'
  });
}

export async function getMvpWrongQuestions(quizId) {
  return http({
    url: `/api/v1/learning/wrong-questions?quizId=${encodeURIComponent(quizId)}`,
    method: 'GET'
  });
}

export async function removeMvpWrongQuestion(questionId) {
  return http({
    url: `/api/v1/learning/wrong-questions/${questionId}/remove`,
    method: 'POST'
  });
}
