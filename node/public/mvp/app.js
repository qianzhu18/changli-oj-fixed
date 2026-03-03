const state = {
  userToken: localStorage.getItem('mvp_user_token') || '',
  adminToken: localStorage.getItem('mvp_admin_token') || '',
  profile: null,
  quizzes: [],
  sections: [],
  questions: [],
  selectedQuizId: '',
  selectedSectionId: '',
  currentQuestionIndex: 0
};

const el = {
  authPanel: document.getElementById('auth-panel'),
  learnerPanel: document.getElementById('learner-panel'),
  authMessage: document.getElementById('auth-message'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  profileText: document.getElementById('profile-text'),
  logoutBtn: document.getElementById('logout-btn'),
  quizList: document.getElementById('quiz-list'),
  sectionList: document.getElementById('section-list'),
  progressBox: document.getElementById('progress-box'),
  questionBox: document.getElementById('question-box'),
  submitAnswerBtn: document.getElementById('submit-answer'),
  answerResult: document.getElementById('answer-result'),
  prevQuestionBtn: document.getElementById('prev-question'),
  nextQuestionBtn: document.getElementById('next-question'),
  wrongList: document.getElementById('wrong-list'),
  refreshWrongBtn: document.getElementById('refresh-wrong'),

  adminLoginForm: document.getElementById('admin-login-form'),
  adminMessage: document.getElementById('admin-message'),
  adminWorkspace: document.getElementById('admin-workspace'),
  createQuizForm: document.getElementById('create-quiz-form'),
  refreshAdminQuizzesBtn: document.getElementById('refresh-admin-quizzes'),
  adminQuizList: document.getElementById('admin-quiz-list')
};

async function api(path, { method = 'GET', body, authType = '' } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authType === 'user' && state.userToken) {
    headers.Authorization = `Bearer ${state.userToken}`;
  }

  if (authType === 'admin' && state.adminToken) {
    headers.Authorization = `Bearer ${state.adminToken}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const rawText = await response.text();
  let json = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    json = { message: rawText || '响应解析失败' };
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    data: json
  };
}

function setText(target, text, isError = false) {
  target.textContent = text || '';
  target.style.color = isError ? '#ffb3b3' : '';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(input) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function updateAuthUi() {
  const authed = Boolean(state.userToken);
  el.learnerPanel.classList.toggle('hidden', !authed);
  if (!authed) {
    el.profileText.textContent = '';
    return;
  }

  const name = state.profile?.nickname || state.profile?.username || '匿名用户';
  const uid = state.profile?.uid ? `UID: ${state.profile.uid}` : '';
  el.profileText.textContent = `${name} ${uid}`;
}

async function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(el.registerForm);
  const account = String(form.get('account') || '').trim();
  const password = String(form.get('password') || '');

  const res = await api('/api/v1/auth/register', {
    method: 'POST',
    body: { account, password, verifyCode: '' }
  });

  if (res.data?.success) {
    setText(el.authMessage, '注册成功，请登录');
    el.registerForm.reset();
    return;
  }

  setText(el.authMessage, res.data?.message || '注册失败', true);
}

async function afterLogin(token) {
  state.userToken = token;
  localStorage.setItem('mvp_user_token', token);

  const meRes = await api('/api/v1/auth/me', { authType: 'user' });
  if (!meRes.data?.success) {
    setText(el.authMessage, meRes.data?.message || '获取用户信息失败', true);
    return;
  }

  state.profile = meRes.data.data;
  updateAuthUi();
  await loadQuizzes();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(el.loginForm);
  const account = String(form.get('account') || '').trim();
  const password = String(form.get('password') || '');

  const res = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { account, password }
  });

  if (!res.data?.success || !res.data?.data?.token) {
    setText(el.authMessage, res.data?.message || '登录失败', true);
    return;
  }

  setText(el.authMessage, '登录成功');
  await afterLogin(res.data.data.token);
}

function renderQuizList() {
  if (!state.quizzes.length) {
    el.quizList.innerHTML = '<div class="list-item">暂无题库，可用管理端新增并发布。</div>';
    return;
  }

  el.quizList.innerHTML = state.quizzes
    .map(
      (quiz) => `<button class="list-item ${state.selectedQuizId === quiz._id ? 'active' : ''}" data-quiz-id="${quiz._id}">
      <h4>${escapeHtml(quiz.name)}</h4>
      <small>${escapeHtml(quiz.code || '')} · ${escapeHtml(quiz.year || '')}</small>
    </button>`
    )
    .join('');

  el.quizList.querySelectorAll('[data-quiz-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.selectedQuizId = btn.getAttribute('data-quiz-id') || '';
      state.selectedSectionId = '';
      state.questions = [];
      state.currentQuestionIndex = 0;
      renderQuizList();
      await loadSections();
      await loadProgress();
      await loadWrongQuestions();
    });
  });
}

async function loadQuizzes() {
  const res = await api('/api/v1/quizzes');
  if (!res.data?.success) {
    setText(el.authMessage, res.data?.message || '加载题库失败', true);
    return;
  }

  state.quizzes = Array.isArray(res.data.data) ? res.data.data : [];
  renderQuizList();
}

function renderSectionList() {
  if (!state.selectedQuizId) {
    el.sectionList.innerHTML = '<div class="list-item">先选择题库</div>';
    return;
  }

  if (!state.sections.length) {
    el.sectionList.innerHTML = '<div class="list-item">该题库暂无已发布题型</div>';
    return;
  }

  el.sectionList.innerHTML = state.sections
    .map(
      (section) => `<button class="list-item ${state.selectedSectionId === section.id ? 'active' : ''}" data-section-id="${section.id}">
      <h4>${escapeHtml(section.content || '未命名题型')}</h4>
      <small>${escapeHtml(section.description || '')} · ${section.questionCount || 0} 题</small>
    </button>`
    )
    .join('');

  el.sectionList.querySelectorAll('[data-section-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.selectedSectionId = btn.getAttribute('data-section-id') || '';
      state.currentQuestionIndex = 0;
      renderSectionList();
      await loadQuestions();
    });
  });
}

async function loadSections() {
  if (!state.selectedQuizId) return;
  const res = await api(`/api/v1/quizzes/${state.selectedQuizId}/types`);
  if (!res.data?.success) {
    el.sectionList.innerHTML = '<div class="list-item">加载题型失败</div>';
    return;
  }

  state.sections = Array.isArray(res.data.data) ? res.data.data : [];
  renderSectionList();
}

function renderQuestion() {
  if (!state.questions.length) {
    el.questionBox.innerHTML = '当前题型没有题目';
    return;
  }

  const question = state.questions[state.currentQuestionIndex];
  if (!question) {
    el.questionBox.innerHTML = '题目索引超出范围';
    return;
  }

  const head = `<div class="stem">${state.currentQuestionIndex + 1}/${state.questions.length}. ${escapeHtml(
    question.stem
  )}</div>`;

  if (question.questionType === 1) {
    const inputType = Number(question.isMultiple) === 1 ? 'checkbox' : 'radio';
    const optionsHtml = (question.options || [])
      .map(
        (option) => `<label class="option">
      <input type="${inputType}" name="question-option" value="${option.index}" />
      <span>${escapeHtml(option.label)}. ${escapeHtml(option.content)}</span>
    </label>`
      )
      .join('');
    el.questionBox.innerHTML = `${head}${optionsHtml}`;
    return;
  }

  if (question.questionType === 2) {
    const blankCount = Number(question.blankCount || 1);
    const blanks = new Array(blankCount)
      .fill(0)
      .map(
        (_, index) => `<label class="option">空${index + 1}
      <input class="blank-input" data-blank-index="${index}" placeholder="请输入答案" />
    </label>`
      )
      .join('');
    el.questionBox.innerHTML = `${head}${blanks}`;
    return;
  }

  if (question.questionType === 3) {
    el.questionBox.innerHTML = `${head}
    <label class="option"><input type="radio" name="judge-answer" value="0" /> A. 正确</label>
    <label class="option"><input type="radio" name="judge-answer" value="1" /> B. 错误</label>`;
    return;
  }

  if (question.questionType === 4) {
    el.questionBox.innerHTML = `${head}
    <label>你的答案</label>
    <textarea id="essay-answer" rows="4" placeholder="填写你的主观题答案"></textarea>
    <label>是否答对（主观题自评）</label>
    <select id="essay-self-correct">
      <option value="">暂不判断</option>
      <option value="true">我认为答对了</option>
      <option value="false">我认为答错了</option>
    </select>`;
    return;
  }

  el.questionBox.innerHTML = `${head}<div>不支持的题型：${question.questionType}</div>`;
}

async function loadQuestions() {
  if (!state.selectedQuizId || !state.selectedSectionId) return;

  const res = await api(
    `/api/v1/quizzes/${state.selectedQuizId}/questions?sectionId=${encodeURIComponent(state.selectedSectionId)}`
  );
  if (!res.data?.success) {
    el.questionBox.innerHTML = '加载题目失败';
    return;
  }

  state.questions = Array.isArray(res.data.data) ? res.data.data : [];
  state.currentQuestionIndex = 0;
  el.answerResult.textContent = '';
  renderQuestion();
}

function collectCurrentAnswer() {
  const question = state.questions[state.currentQuestionIndex];
  if (!question) return { answer: null, selfCorrect: undefined };

  if (question.questionType === 1) {
    const checked = Array.from(el.questionBox.querySelectorAll('input[name="question-option"]:checked')).map((item) =>
      Number(item.value)
    );
    if (Number(question.isMultiple) === 1) {
      return { answer: checked, selfCorrect: undefined };
    }
    return { answer: checked.length ? checked[0] : null, selfCorrect: undefined };
  }

  if (question.questionType === 2) {
    const values = Array.from(el.questionBox.querySelectorAll('.blank-input')).map((item) => item.value);
    return { answer: values, selfCorrect: undefined };
  }

  if (question.questionType === 3) {
    const selected = el.questionBox.querySelector('input[name="judge-answer"]:checked');
    return { answer: selected ? Number(selected.value) : null, selfCorrect: undefined };
  }

  if (question.questionType === 4) {
    const answer = document.getElementById('essay-answer')?.value || '';
    const selfValue = document.getElementById('essay-self-correct')?.value || '';
    return {
      answer,
      selfCorrect: selfValue === '' ? undefined : selfValue === 'true'
    };
  }

  return { answer: null, selfCorrect: undefined };
}

function formatCorrectAnswer(correctAnswer) {
  if (!correctAnswer) return '无';
  if (Array.isArray(correctAnswer.labels)) return correctAnswer.labels.join(', ');
  if (Array.isArray(correctAnswer.values)) return correctAnswer.values.join(' / ');
  if (correctAnswer.label) return correctAnswer.label;
  if (correctAnswer.reference) return correctAnswer.reference;
  return JSON.stringify(correctAnswer);
}

async function submitAnswer() {
  const question = state.questions[state.currentQuestionIndex];
  if (!question || !state.selectedQuizId || !state.selectedSectionId) {
    setText(el.answerResult, '请先选择题库和题型', true);
    return;
  }

  const { answer, selfCorrect } = collectCurrentAnswer();
  const res = await api('/api/v1/learning/submit', {
    method: 'POST',
    authType: 'user',
    body: {
      quizId: state.selectedQuizId,
      sectionId: state.selectedSectionId,
      questionId: question.id,
      questionType: question.questionType,
      answer,
      selfCorrect
    }
  });

  if (!res.data?.success) {
    setText(el.answerResult, res.data?.message || '提交失败', true);
    return;
  }

  const payload = res.data.data;
  const correctText = formatCorrectAnswer(payload.correctAnswer);
  const prefix = payload.isCorrect === true ? '答对了' : payload.isCorrect === false ? '答错了' : '已提交';

  setText(
    el.answerResult,
    `${prefix} | 正确答案: ${correctText}${payload.analysis ? ` | 解析: ${payload.analysis}` : ''}`,
    payload.isCorrect === false
  );

  if (payload.progress) {
    renderProgress(payload.progress);
  }

  await loadWrongQuestions();
}

function renderProgress(progress) {
  if (!progress) {
    el.progressBox.textContent = '暂无进度';
    return;
  }

  el.progressBox.innerHTML = `
    <div>答题数：<strong>${progress.totalAnswered}</strong></div>
    <div>答对：<strong>${progress.correctCount}</strong></div>
    <div>答错：<strong>${progress.wrongCount}</strong></div>
    <div>正确率：<strong>${progress.accuracy}%</strong></div>
  `;
}

async function loadProgress() {
  if (!state.selectedQuizId || !state.userToken) {
    el.progressBox.textContent = '请选择题库';
    return;
  }

  const res = await api(`/api/v1/learning/progress?quizId=${encodeURIComponent(state.selectedQuizId)}`, {
    authType: 'user'
  });

  if (!res.data?.success) {
    el.progressBox.textContent = '进度加载失败';
    return;
  }

  renderProgress(res.data.data);
}

function renderWrongQuestions(list) {
  if (!list.length) {
    el.wrongList.innerHTML = '<div class="list-item">暂无错题</div>';
    return;
  }

  el.wrongList.innerHTML = list
    .map(
      (item) => `<div class="list-item">
      <h4>${escapeHtml(item.stem || '(无题干)')}</h4>
      <small>${escapeHtml(item.quizName || '')} · ${fmtDate(item.createTime)}</small>
      <div class="mt-16">
        <button class="btn ghost" data-remove-wrong="${item.questionId}">从错题本移除</button>
      </div>
    </div>`
    )
    .join('');

  el.wrongList.querySelectorAll('[data-remove-wrong]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const questionId = btn.getAttribute('data-remove-wrong') || '';
      if (!questionId) return;
      await api(`/api/v1/learning/wrong-questions/${questionId}/remove`, {
        method: 'POST',
        authType: 'user'
      });
      await loadWrongQuestions();
    });
  });
}

async function loadWrongQuestions() {
  if (!state.userToken) return;

  const query = state.selectedQuizId ? `?quizId=${encodeURIComponent(state.selectedQuizId)}` : '';
  const res = await api(`/api/v1/learning/wrong-questions${query}`, {
    authType: 'user'
  });

  if (!res.data?.success) {
    el.wrongList.innerHTML = '<div class="list-item">错题加载失败</div>';
    return;
  }

  const list = Array.isArray(res.data.data) ? res.data.data : [];
  renderWrongQuestions(list);
}

function moveQuestion(step) {
  if (!state.questions.length) return;
  const next = state.currentQuestionIndex + step;
  if (next < 0 || next >= state.questions.length) return;
  state.currentQuestionIndex = next;
  el.answerResult.textContent = '';
  renderQuestion();
}

function handleLogout() {
  state.userToken = '';
  state.profile = null;
  state.selectedQuizId = '';
  state.selectedSectionId = '';
  state.questions = [];
  localStorage.removeItem('mvp_user_token');

  updateAuthUi();
  el.quizList.innerHTML = '';
  el.sectionList.innerHTML = '';
  el.questionBox.textContent = '请选择题型加载题目';
  el.progressBox.textContent = '请选择题库';
  el.wrongList.innerHTML = '';
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const form = new FormData(el.adminLoginForm);
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');

  const res = await api('/adminapi/user/login', {
    method: 'POST',
    body: { username, password }
  });

  const token = res.headers.get('authorization');
  if (!token || res.data?.code === '-1') {
    setText(el.adminMessage, res.data?.error || '管理员登录失败', true);
    return;
  }

  state.adminToken = token;
  localStorage.setItem('mvp_admin_token', token);
  setText(el.adminMessage, '管理员登录成功');
  el.adminWorkspace.classList.remove('hidden');
  await loadAdminQuizzes();
}

async function loadAdminQuizzes() {
  if (!state.adminToken) return;

  const res = await api('/adminapi/exam/list?page=1&size=100', {
    authType: 'admin'
  });

  const rows = res.data?.data?.data || [];
  if (!Array.isArray(rows) || !rows.length) {
    el.adminQuizList.innerHTML = '<div class="list-item">暂无题库</div>';
    return;
  }

  el.adminQuizList.innerHTML = rows
    .map(
      (item) => `<div class="list-item">
      <h4>${escapeHtml(item.name)} <span class="badge ${Number(item.isPublish) === 1 ? '' : 'warn'}">${
        Number(item.isPublish) === 1 ? '已发布' : '未发布'
      }</span></h4>
      <small>${escapeHtml(item.code || '')} · ${escapeHtml(item.year || '')}</small>
      <div class="mt-16">
        <button class="btn" data-toggle-publish="${item._id}" data-next-state="${
        Number(item.isPublish) === 1 ? 0 : 1
      }">${Number(item.isPublish) === 1 ? '下架' : '发布'}</button>
      </div>
    </div>`
    )
    .join('');

  el.adminQuizList.querySelectorAll('[data-toggle-publish]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const _id = btn.getAttribute('data-toggle-publish') || '';
      const stateValue = Number(btn.getAttribute('data-next-state'));
      await api('/adminapi/exam/updateExamStatus', {
        method: 'POST',
        authType: 'admin',
        body: { _id, state: stateValue }
      });
      await loadAdminQuizzes();
      await loadQuizzes();
    });
  });
}

async function handleCreateQuiz(event) {
  event.preventDefault();
  if (!state.adminToken) {
    setText(el.adminMessage, '请先登录管理端', true);
    return;
  }

  const form = new FormData(el.createQuizForm);
  const payload = {
    name: String(form.get('name') || '').trim(),
    code: String(form.get('code') || '').trim(),
    year: String(form.get('year') || '').trim(),
    category: JSON.stringify([Number(form.get('category') || 1)]),
    creator: String(form.get('creator') || '').trim(),
    day: String(form.get('day') || ''),
    isPublish: 0
  };

  const res = await api('/adminapi/exam/add', {
    method: 'POST',
    authType: 'admin',
    body: payload
  });

  if (res.data?.ActionType !== 'OK') {
    setText(el.adminMessage, '题库创建失败', true);
    return;
  }

  setText(el.adminMessage, '题库创建成功');
  el.createQuizForm.reset();
  await loadAdminQuizzes();
}

function bindEvents() {
  el.registerForm.addEventListener('submit', handleRegister);
  el.loginForm.addEventListener('submit', handleLogin);
  el.logoutBtn.addEventListener('click', handleLogout);
  el.submitAnswerBtn.addEventListener('click', submitAnswer);
  el.prevQuestionBtn.addEventListener('click', () => moveQuestion(-1));
  el.nextQuestionBtn.addEventListener('click', () => moveQuestion(1));
  el.refreshWrongBtn.addEventListener('click', loadWrongQuestions);

  el.adminLoginForm.addEventListener('submit', handleAdminLogin);
  el.createQuizForm.addEventListener('submit', handleCreateQuiz);
  el.refreshAdminQuizzesBtn.addEventListener('click', loadAdminQuizzes);
}

async function bootstrap() {
  bindEvents();

  if (state.userToken) {
    await afterLogin(state.userToken);
  } else {
    updateAuthUi();
  }

  if (state.adminToken) {
    el.adminWorkspace.classList.remove('hidden');
    await loadAdminQuizzes();
  }
}

bootstrap();
