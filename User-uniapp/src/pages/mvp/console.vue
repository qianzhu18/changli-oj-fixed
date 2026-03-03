<template>
  <view class="page">
    <view class="hero">
      <text class="title">MiaowTest MVP（User-uniapp）</text>
      <text class="sub">按开源项目原结构开发的 Web First 调试页</text>
    </view>

    <view class="card">
      <text class="card-title">用户认证</text>
      <input v-model="authForm.account" class="ipt" placeholder="账号（mvp_user）" />
      <input v-model="authForm.password" class="ipt" placeholder="密码（mvp123456）" password />
      <view class="row">
        <button class="btn primary" @click="handleLogin">登录</button>
        <button class="btn" @click="handleRegister">注册</button>
        <button class="btn ghost" @click="handleLogout">退出</button>
      </view>
      <text class="msg" :class="{ err: authMessageType === 'error' }">{{ authMessage }}</text>
      <text v-if="profile" class="info">当前用户：{{ profile.nickname || profile.username }}（{{ profile.uid }}）</text>
    </view>

    <view class="card" v-if="isLoggedIn">
      <text class="card-title">题库与进度</text>
      <view class="section">
        <text class="section-title">题库</text>
        <view class="pill-wrap">
          <view
            v-for="quiz in quizzes"
            :key="quiz._id"
            class="pill"
            :class="{ active: selectedQuizId === quiz._id }"
            @click="selectQuiz(quiz._id)">
            {{ quiz.name }}
          </view>
        </view>
      </view>

      <view class="section" v-if="selectedQuizId">
        <text class="section-title">题型分组</text>
        <view class="pill-wrap">
          <view
            v-for="section in sections"
            :key="section.id"
            class="pill"
            :class="{ active: selectedSectionId === section.id }"
            @click="selectSection(section.id)">
            {{ section.content }}（{{ section.questionCount }}）
          </view>
        </view>
      </view>

      <view class="progress-box" v-if="progress">
        <text>答题数：{{ progress.totalAnswered }}</text>
        <text>答对：{{ progress.correctCount }}</text>
        <text>答错：{{ progress.wrongCount }}</text>
        <text>正确率：{{ progress.accuracy }}%</text>
      </view>
    </view>

    <view class="card" v-if="currentQuestion">
      <view class="q-head">
        <text class="card-title">刷题区</text>
        <text>{{ currentQuestionIndex + 1 }}/{{ questions.length }}</text>
      </view>
      <text class="stem">{{ currentQuestion.stem }}</text>

      <view v-if="currentQuestion.questionType === 1" class="option-wrap">
        <view
          v-for="opt in currentQuestion.options"
          :key="opt.index"
          class="option"
          :class="{ selected: isOptionSelected(opt.index) }"
          @click="toggleOption(opt.index)">
          {{ opt.label }}. {{ opt.content }}
        </view>
      </view>

      <view v-if="currentQuestion.questionType === 2" class="option-wrap">
        <input
          v-for="idx in currentQuestion.blankCount"
          :key="idx"
          class="ipt"
          :placeholder="`空${idx}答案`"
          :value="getBlankValue(idx - 1)"
          @input="setBlankValue(idx - 1, $event.detail.value)" />
      </view>

      <view v-if="currentQuestion.questionType === 3" class="option-wrap">
        <view class="option" :class="{ selected: judgeAnswer === 0 }" @click="judgeAnswer = 0">A. 正确</view>
        <view class="option" :class="{ selected: judgeAnswer === 1 }" @click="judgeAnswer = 1">B. 错误</view>
      </view>

      <view v-if="currentQuestion.questionType === 4" class="option-wrap">
        <textarea class="txt" :value="essayAnswer" placeholder="输入主观题答案" @input="essayAnswer = $event.detail.value" />
        <view class="row">
          <button class="btn" :class="{ primary: essaySelfCorrect === true }" @click="essaySelfCorrect = true">我答对了</button>
          <button class="btn" :class="{ primary: essaySelfCorrect === false }" @click="essaySelfCorrect = false">我答错了</button>
        </view>
      </view>

      <view class="row">
        <button class="btn ghost" @click="prevQuestion">上一题</button>
        <button class="btn ghost" @click="nextQuestion">下一题</button>
        <button class="btn primary" @click="submitCurrentAnswer">提交答案</button>
      </view>
      <text class="msg" :class="{ err: answerResultType === 'error' }">{{ answerResult }}</text>
    </view>

    <view class="card" v-if="isLoggedIn">
      <view class="q-head">
        <text class="card-title">错题</text>
        <button class="mini" @click="loadWrongQuestions">刷新</button>
      </view>
      <view v-if="wrongQuestions.length === 0" class="empty">暂无错题</view>
      <view v-for="item in wrongQuestions" :key="item.questionId" class="wrong-item">
        <text class="wrong-stem">{{ item.stem }}</text>
        <text class="wrong-sub">{{ item.quizName }}</text>
        <button class="mini" @click="removeWrong(item.questionId)">移除</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  mvpLogin,
  mvpMe,
  mvpRegister,
  getMvpQuizzes,
  getMvpQuizSections,
  getMvpSectionQuestions,
  submitMvpAnswer,
  getMvpProgress,
  getMvpWrongQuestions,
  removeMvpWrongQuestion
} from '../../API/Mvp/MvpAPI';

const authForm = ref({
  account: 'mvp_user',
  password: 'mvp123456'
});

const authMessage = ref('');
const authMessageType = ref('normal');
const answerResult = ref('');
const answerResultType = ref('normal');

const profile = ref(null);
const quizzes = ref([]);
const sections = ref([]);
const questions = ref([]);
const wrongQuestions = ref([]);
const progress = ref(null);

const selectedQuizId = ref('');
const selectedSectionId = ref('');
const currentQuestionIndex = ref(0);

const optionAnswer = ref([]);
const blankAnswer = ref([]);
const judgeAnswer = ref(null);
const essayAnswer = ref('');
const essaySelfCorrect = ref(undefined);
const token = ref(uni.getStorageSync('token') || '');

const isLoggedIn = computed(() => !!token.value);
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || null);

const setAuthMessage = (message, type = 'normal') => {
  authMessage.value = message;
  authMessageType.value = type;
};

const setAnswerMessage = (message, type = 'normal') => {
  answerResult.value = message;
  answerResultType.value = type;
};

const resetAnswerState = () => {
  optionAnswer.value = [];
  blankAnswer.value = [];
  judgeAnswer.value = null;
  essayAnswer.value = '';
  essaySelfCorrect.value = undefined;
  setAnswerMessage('');
};

const loadProfile = async () => {
  try {
    const res = await mvpMe();
    if (res?.success) {
      profile.value = res.data;
      return true;
    }
    setAuthMessage(res?.message || '获取用户信息失败', 'error');
    return false;
  } catch (error) {
    setAuthMessage('获取用户信息失败', 'error');
    return false;
  }
};

const loadQuizzes = async () => {
  const res = await getMvpQuizzes();
  quizzes.value = Array.isArray(res?.data) ? res.data : [];
};

const loadProgress = async () => {
  if (!selectedQuizId.value) {
    progress.value = null;
    return;
  }
  const res = await getMvpProgress(selectedQuizId.value);
  progress.value = res?.success ? res.data : null;
};

const loadWrongQuestions = async () => {
  if (!selectedQuizId.value) {
    wrongQuestions.value = [];
    return;
  }
  const res = await getMvpWrongQuestions(selectedQuizId.value);
  wrongQuestions.value = Array.isArray(res?.data) ? res.data : [];
};

const selectQuiz = async (quizId) => {
  selectedQuizId.value = quizId;
  selectedSectionId.value = '';
  sections.value = [];
  questions.value = [];
  currentQuestionIndex.value = 0;
  resetAnswerState();

  const res = await getMvpQuizSections(quizId);
  sections.value = Array.isArray(res?.data) ? res.data : [];
  await loadProgress();
  await loadWrongQuestions();
};

const selectSection = async (sectionId) => {
  selectedSectionId.value = sectionId;
  questions.value = [];
  currentQuestionIndex.value = 0;
  resetAnswerState();

  const res = await getMvpSectionQuestions(selectedQuizId.value, sectionId);
  questions.value = Array.isArray(res?.data) ? res.data : [];
};

const isOptionSelected = (index) => optionAnswer.value.includes(index);

const toggleOption = (index) => {
  if (!currentQuestion.value) return;
  if (Number(currentQuestion.value.isMultiple) === 1) {
    if (optionAnswer.value.includes(index)) {
      optionAnswer.value = optionAnswer.value.filter((v) => v !== index);
    } else {
      optionAnswer.value = [...optionAnswer.value, index];
    }
    return;
  }
  optionAnswer.value = [index];
};

const getBlankValue = (index) => blankAnswer.value[index] || '';
const setBlankValue = (index, value) => {
  const clone = [...blankAnswer.value];
  clone[index] = value;
  blankAnswer.value = clone;
};

const prevQuestion = () => {
  if (currentQuestionIndex.value <= 0) return;
  currentQuestionIndex.value -= 1;
  resetAnswerState();
};

const nextQuestion = () => {
  if (currentQuestionIndex.value >= questions.value.length - 1) return;
  currentQuestionIndex.value += 1;
  resetAnswerState();
};

const getCurrentAnswerPayload = () => {
  const q = currentQuestion.value;
  if (!q) return { answer: null, selfCorrect: undefined };

  if (q.questionType === 1) {
    if (Number(q.isMultiple) === 1) {
      return { answer: optionAnswer.value, selfCorrect: undefined };
    }
    return { answer: optionAnswer.value[0] ?? null, selfCorrect: undefined };
  }

  if (q.questionType === 2) {
    return { answer: blankAnswer.value, selfCorrect: undefined };
  }

  if (q.questionType === 3) {
    return { answer: judgeAnswer.value, selfCorrect: undefined };
  }

  if (q.questionType === 4) {
    return {
      answer: essayAnswer.value,
      selfCorrect: essaySelfCorrect.value
    };
  }

  return { answer: null, selfCorrect: undefined };
};

const formatCorrectAnswer = (correctAnswer) => {
  if (!correctAnswer) return '无';
  if (Array.isArray(correctAnswer.labels)) return correctAnswer.labels.join(',');
  if (Array.isArray(correctAnswer.values)) return correctAnswer.values.join('/');
  if (correctAnswer.label) return correctAnswer.label;
  if (correctAnswer.reference) return correctAnswer.reference;
  return JSON.stringify(correctAnswer);
};

const submitCurrentAnswer = async () => {
  if (!currentQuestion.value || !selectedQuizId.value || !selectedSectionId.value) {
    setAnswerMessage('请先选择题库与题型', 'error');
    return;
  }

  const { answer, selfCorrect } = getCurrentAnswerPayload();
  const res = await submitMvpAnswer({
    quizId: selectedQuizId.value,
    sectionId: selectedSectionId.value,
    questionId: currentQuestion.value.id,
    questionType: currentQuestion.value.questionType,
    answer,
    selfCorrect
  });

  if (!res?.success) {
    setAnswerMessage(res?.message || '提交失败', 'error');
    return;
  }

  const result = res.data;
  const head = result.isCorrect === true ? '答对了' : result.isCorrect === false ? '答错了' : '已提交';
  setAnswerMessage(`${head}；正确答案：${formatCorrectAnswer(result.correctAnswer)}`);
  progress.value = result.progress || progress.value;
  await loadWrongQuestions();
};

const removeWrong = async (questionId) => {
  await removeMvpWrongQuestion(questionId);
  await loadWrongQuestions();
};

const handleLogin = async () => {
  try {
    const res = await mvpLogin(authForm.value);
    if (!res?.success || !res?.data?.token) {
      setAuthMessage(res?.message || '登录失败', 'error');
      return;
    }

    uni.setStorageSync('token', res.data.token);
    token.value = res.data.token;
    const loaded = await loadProfile();
    if (!loaded) return;
    await loadQuizzes();
    setAuthMessage('登录成功');
  } catch (error) {
    setAuthMessage('登录失败', 'error');
  }
};

const handleRegister = async () => {
  try {
    const res = await mvpRegister(authForm.value);
    if (res?.success) {
      setAuthMessage('注册成功，请登录');
      return;
    }
    setAuthMessage(res?.message || '注册失败', 'error');
  } catch (error) {
    setAuthMessage('注册失败', 'error');
  }
};

const handleLogout = () => {
  uni.removeStorageSync('token');
  token.value = '';
  profile.value = null;
  quizzes.value = [];
  sections.value = [];
  questions.value = [];
  wrongQuestions.value = [];
  progress.value = null;
  selectedQuizId.value = '';
  selectedSectionId.value = '';
  currentQuestionIndex.value = 0;
  resetAnswerState();
  setAuthMessage('已退出登录');
};

onMounted(async () => {
  if (isLoggedIn.value) {
    const loaded = await loadProfile();
    if (loaded) {
      await loadQuizzes();
      setAuthMessage('已恢复登录状态');
    }
  }
});
</script>

<style scoped lang="scss">
.page {
  padding: 20rpx;
  background: #f4f8ff;
  min-height: 100vh;
}

.hero {
  margin-bottom: 20rpx;
  .title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #16233d;
  }
  .sub {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #5c6f94;
  }
}

.card {
  background: #fff;
  border-radius: 18rpx;
  padding: 20rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 8rpx 20rpx rgba(57, 93, 168, 0.08);
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a2e55;
  margin-bottom: 14rpx;
}

.section {
  margin-top: 14rpx;
}

.section-title {
  display: block;
  font-size: 24rpx;
  color: #4f6590;
  margin-bottom: 8rpx;
}

.row {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
}

.ipt,
.txt {
  width: 100%;
  background: #f7faff;
  border: 2rpx solid #d8e5ff;
  border-radius: 12rpx;
  padding: 14rpx;
  margin-top: 8rpx;
  font-size: 26rpx;
}

.txt {
  min-height: 180rpx;
}

.btn {
  border: 2rpx solid #cddaf6;
  background: #edf3ff;
  color: #2c467d;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.btn.primary {
  background: #0d78ff;
  border-color: #0d78ff;
  color: #fff;
}

.btn.ghost {
  background: #fff;
}

.mini {
  border: none;
  background: #0d78ff;
  color: #fff;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.msg {
  display: block;
  margin-top: 10rpx;
  color: #1d61c7;
  font-size: 24rpx;
}

.msg.err {
  color: #d64545;
}

.info {
  display: block;
  margin-top: 8rpx;
  color: #4a5f89;
  font-size: 22rpx;
}

.pill-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.pill {
  background: #eef4ff;
  color: #23477f;
  border: 2rpx solid #cfdef9;
  border-radius: 999rpx;
  padding: 8rpx 18rpx;
  font-size: 22rpx;
}

.pill.active {
  background: #dff8f2;
  color: #096f5e;
  border-color: #00b495;
}

.progress-box {
  margin-top: 16rpx;
  display: grid;
  gap: 6rpx;
  color: #314f85;
  font-size: 24rpx;
}

.q-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stem {
  display: block;
  margin-top: 10rpx;
  color: #0f2247;
  font-size: 28rpx;
  font-weight: 600;
}

.option-wrap {
  margin-top: 14rpx;
  display: grid;
  gap: 8rpx;
}

.option {
  background: #f6f9ff;
  border: 2rpx solid #d8e3fb;
  border-radius: 12rpx;
  padding: 12rpx;
  font-size: 24rpx;
  color: #1f3f75;
}

.option.selected {
  background: #e5fff8;
  border-color: #00b495;
  color: #066c5b;
}

.empty {
  color: #6580b3;
  font-size: 24rpx;
}

.wrong-item {
  margin-top: 10rpx;
  padding: 12rpx;
  background: #f8fbff;
  border-radius: 12rpx;
  border: 2rpx solid #dce8ff;
}

.wrong-stem {
  display: block;
  color: #223f71;
  font-size: 24rpx;
}

.wrong-sub {
  display: block;
  margin: 6rpx 0 10rpx;
  color: #6a82af;
  font-size: 22rpx;
}
</style>
