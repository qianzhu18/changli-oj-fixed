import axios from 'axios'
import escconfig from '@/config/esc.config'

const baseURL = `http://${escconfig.serverHost}:${escconfig.serverPort}`

const mvpClient = axios.create({
  baseURL,
  timeout: 15000
})

const withAuth = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    : {}

export const mvpBaseURL = baseURL

export const getMvpHealth = async () => {
  const response = await mvpClient.get('/health')
  return response.data
}

export const registerMvpUser = async (payload) => {
  const response = await mvpClient.post('/api/v1/auth/register', {
    account: payload.account,
    password: payload.password,
    verifyCode: ''
  })
  return response.data
}

export const loginMvpUser = async (payload) => {
  const response = await mvpClient.post('/api/v1/auth/login', payload)
  return response.data
}

export const getMvpProfile = async (token) => {
  const response = await mvpClient.get('/api/v1/auth/me', withAuth(token))
  return response.data
}

export const getMvpQuizList = async () => {
  const response = await mvpClient.get('/api/v1/quizzes')
  return response.data
}

export const getMvpSections = async (quizId) => {
  const response = await mvpClient.get(`/api/v1/quizzes/${quizId}/types`)
  return response.data
}

export const getMvpQuestions = async (quizId, sectionId) => {
  const response = await mvpClient.get(`/api/v1/quizzes/${quizId}/questions`, {
    params: { sectionId }
  })
  return response.data
}

export const getMvpProgress = async (token, quizId) => {
  const response = await mvpClient.get('/api/v1/learning/progress', {
    ...withAuth(token),
    params: { quizId }
  })
  return response.data
}

export const getMvpWrongQuestions = async (token, quizId) => {
  const response = await mvpClient.get('/api/v1/learning/wrong-questions', {
    ...withAuth(token),
    params: { quizId }
  })
  return response.data
}

export const removeMvpWrongQuestion = async (token, questionId) => {
  const response = await mvpClient.post(
    `/api/v1/learning/wrong-questions/${questionId}/remove`,
    {},
    withAuth(token)
  )
  return response.data
}
