<template>
  <div class="mvp-console">
    <el-alert
      type="success"
      :closable="false"
      show-icon
      title="MVP 调试控制台（开源项目内实现）"
      :description="`当前后端地址：${mvpBaseURL}`" />

    <el-row :gutter="16" class="block">
      <el-col :xs="24" :lg="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>用户认证</span>
              <el-button size="small" @click="refreshHealth">健康检查</el-button>
            </div>
          </template>

          <el-form label-position="top">
            <el-form-item label="账号">
              <el-input v-model="authForm.account" placeholder="mvp_user" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="authForm.password" type="password" show-password placeholder="mvp123456" />
            </el-form-item>
          </el-form>

          <div class="btn-row">
            <el-button type="primary" @click="handleLogin">登录</el-button>
            <el-button @click="handleRegister">注册</el-button>
            <el-button type="danger" plain @click="handleLogout">退出</el-button>
          </div>

          <div class="status-row">
            <el-tag v-if="health?.status === 'ok'" type="success">后端健康</el-tag>
            <el-tag v-else type="danger">后端不可用</el-tag>
            <el-tag :type="isLoggedIn ? 'success' : 'info'">{{ isLoggedIn ? '已登录用户态' : '未登录用户态' }}</el-tag>
          </div>

          <el-descriptions v-if="profile" :column="1" border size="small" class="desc">
            <el-descriptions-item label="UID">{{ profile.uid }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ profile.nickname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="账号">{{ profile.username || profile.account || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>题库与题目</span>
              <el-button size="small" @click="loadQuizList">刷新题库</el-button>
            </div>
          </template>

          <el-form label-position="top">
            <el-form-item label="题库">
              <el-select v-model="selectedQuizId" placeholder="请选择题库" class="full-width" @change="handleQuizChange">
                <el-option
                  v-for="quiz in quizzes"
                  :key="quiz._id"
                  :label="`${quiz.name} (${quiz.code || '-'})`"
                  :value="quiz._id" />
              </el-select>
            </el-form-item>

            <el-form-item label="题型分组">
              <el-select
                v-model="selectedSectionId"
                placeholder="请选择题型分组"
                class="full-width"
                :disabled="!selectedQuizId"
                @change="handleSectionChange">
                <el-option
                  v-for="section in sections"
                  :key="section.id"
                  :label="`${section.content} (${section.questionCount})`"
                  :value="section.id" />
              </el-select>
            </el-form-item>
          </el-form>

          <el-row :gutter="12" class="meta-row">
            <el-col :span="8"><el-statistic title="题库总数" :value="quizzes.length" /></el-col>
            <el-col :span="8"><el-statistic title="分组数量" :value="sections.length" /></el-col>
            <el-col :span="8"><el-statistic title="题目数量" :value="questions.length" /></el-col>
          </el-row>

          <el-table :data="questionPreview" size="small" max-height="220" empty-text="请选择题库和分组查看题目">
            <el-table-column prop="questionType" label="题型" width="72" />
            <el-table-column prop="stem" label="题干">
              <template #default="{ row }">
                <div class="stem">{{ row.stem }}</div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="block">
      <el-col :xs="24" :lg="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>学习进度</span>
              <el-button size="small" :disabled="!selectedQuizId || !isLoggedIn" @click="loadProgressAndWrong">
                刷新
              </el-button>
            </div>
          </template>

          <el-empty v-if="!selectedQuizId" description="请先选择题库" />
          <el-descriptions v-else-if="progress" :column="1" border size="small">
            <el-descriptions-item label="答题数">{{ progress.totalAnswered }}</el-descriptions-item>
            <el-descriptions-item label="答对">{{ progress.correctCount }}</el-descriptions-item>
            <el-descriptions-item label="答错">{{ progress.wrongCount }}</el-descriptions-item>
            <el-descriptions-item label="正确率">{{ progress.accuracy }}%</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="暂无进度数据" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>错题列表（{{ wrongQuestions.length }}）</span>
              <el-button size="small" :disabled="!selectedQuizId || !isLoggedIn" @click="loadProgressAndWrong">
                刷新
              </el-button>
            </div>
          </template>

          <el-table :data="wrongQuestions" size="small" max-height="260" empty-text="暂无错题">
            <el-table-column prop="questionType" label="题型" width="72" />
            <el-table-column prop="stem" label="题干">
              <template #default="{ row }">
                <div class="stem">{{ row.stem }}</div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="removeWrong(row.questionId)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getMvpHealth,
  getMvpProfile,
  getMvpProgress,
  getMvpQuestions,
  getMvpQuizList,
  getMvpSections,
  getMvpWrongQuestions,
  loginMvpUser,
  mvpBaseURL,
  registerMvpUser,
  removeMvpWrongQuestion
} from '@/API/Mvp/mvpAPI'

const MVP_TOKEN_KEY = 'mvp_v1_token'

const authForm = ref({
  account: 'mvp_user',
  password: 'mvp123456'
})

const mvpToken = ref(localStorage.getItem(MVP_TOKEN_KEY) || '')
const health = ref(null)
const profile = ref(null)
const quizzes = ref([])
const sections = ref([])
const questions = ref([])
const progress = ref(null)
const wrongQuestions = ref([])
const selectedQuizId = ref('')
const selectedSectionId = ref('')

const isLoggedIn = computed(() => Boolean(mvpToken.value))
const questionPreview = computed(() =>
  questions.value.map((item) => ({
    questionType: item.questionType,
    stem: item.stem
  }))
)

const parseMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback

const saveToken = (token) => {
  mvpToken.value = token
  localStorage.setItem(MVP_TOKEN_KEY, token)
}

const clearToken = () => {
  mvpToken.value = ''
  localStorage.removeItem(MVP_TOKEN_KEY)
}

const refreshHealth = async () => {
  try {
    health.value = await getMvpHealth()
  } catch (error) {
    health.value = null
    ElMessage.error(parseMessage(error, '后端健康检查失败'))
  }
}

const loadProfile = async () => {
  if (!mvpToken.value) {
    profile.value = null
    return
  }

  try {
    const response = await getMvpProfile(mvpToken.value)
    if (!response?.success) {
      throw new Error(response?.message || '用户态失效')
    }
    profile.value = response.data
  } catch (error) {
    clearToken()
    profile.value = null
    ElMessage.error(parseMessage(error, '用户信息获取失败，请重新登录'))
  }
}

const loadQuizList = async () => {
  try {
    const response = await getMvpQuizList()
    quizzes.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    quizzes.value = []
    ElMessage.error(parseMessage(error, '题库加载失败'))
  }
}

const loadProgressAndWrong = async () => {
  if (!selectedQuizId.value || !mvpToken.value) {
    progress.value = null
    wrongQuestions.value = []
    return
  }

  try {
    const [progressRes, wrongRes] = await Promise.all([
      getMvpProgress(mvpToken.value, selectedQuizId.value),
      getMvpWrongQuestions(mvpToken.value, selectedQuizId.value)
    ])
    progress.value = progressRes?.success ? progressRes.data : null
    wrongQuestions.value = Array.isArray(wrongRes?.data) ? wrongRes.data : []
  } catch (error) {
    ElMessage.error(parseMessage(error, '学习数据加载失败'))
  }
}

const handleLogin = async () => {
  try {
    const response = await loginMvpUser(authForm.value)
    if (!response?.success || !response?.data?.token) {
      throw new Error(response?.message || '登录失败')
    }
    saveToken(response.data.token)
    await loadProfile()
    await loadProgressAndWrong()
    ElMessage.success('MVP 用户登录成功')
  } catch (error) {
    ElMessage.error(parseMessage(error, '登录失败'))
  }
}

const handleRegister = async () => {
  try {
    const response = await registerMvpUser(authForm.value)
    if (!response?.success) {
      throw new Error(response?.message || '注册失败')
    }
    ElMessage.success('注册成功，请登录')
  } catch (error) {
    ElMessage.error(parseMessage(error, '注册失败'))
  }
}

const handleLogout = () => {
  clearToken()
  profile.value = null
  progress.value = null
  wrongQuestions.value = []
  ElMessage.success('已退出 MVP 用户态')
}

const handleQuizChange = async () => {
  selectedSectionId.value = ''
  sections.value = []
  questions.value = []
  progress.value = null
  wrongQuestions.value = []

  if (!selectedQuizId.value) return

  try {
    const response = await getMvpSections(selectedQuizId.value)
    sections.value = Array.isArray(response?.data) ? response.data : []
    await loadProgressAndWrong()
  } catch (error) {
    ElMessage.error(parseMessage(error, '题型分组加载失败'))
  }
}

const handleSectionChange = async () => {
  questions.value = []
  if (!selectedQuizId.value || !selectedSectionId.value) return

  try {
    const response = await getMvpQuestions(selectedQuizId.value, selectedSectionId.value)
    questions.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    ElMessage.error(parseMessage(error, '题目加载失败'))
  }
}

const removeWrong = async (questionId) => {
  if (!mvpToken.value) return
  try {
    const response = await removeMvpWrongQuestion(mvpToken.value, questionId)
    if (!response?.success) {
      throw new Error(response?.message || '移除失败')
    }
    await loadProgressAndWrong()
    ElMessage.success('错题已移除')
  } catch (error) {
    ElMessage.error(parseMessage(error, '移除错题失败'))
  }
}

onMounted(async () => {
  await refreshHealth()
  await loadQuizList()
  await loadProfile()
  await loadProgressAndWrong()
})
</script>

<style scoped>
.mvp-console {
  display: grid;
  gap: 16px;
}

.block {
  margin-top: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.desc {
  margin-top: 12px;
}

.meta-row {
  margin: 8px 0 12px;
}

.stem {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.full-width {
  width: 100%;
}
</style>
