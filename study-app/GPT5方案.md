我先查看 `study-app/API调用方式.md` 的具体调用规范，这样我能基于现有的API方式（而非Gemini）重写一份完整的实施与操作指南，并给出对应的前后端接入代码。

## 目标与结论
- 目标：把任意文档/文本真正解析为题库 JSON，并在前端生成可交互刷题 HTML；前端优先，解析不稳时用你们现有 API（见 `study-app/API调用方式.md`）兜底。
- 结论：完全可行。我们沿用你现在的 OpenAI‑兼容接口 twoapi（chat/completions），把“AI 解析题库”封装成服务端 API Route；前端先走本地规则解析，失败再调用该 API；最后生成/下载 HTML，并可选保存到 Supabase/Neon，通过 Vercel 一体部署。

---

## 架构与数据流

- 前端（Next.js 页面）：
  - 文档读取 → 文本标准化（已在 `study-app/lib/quiz-parser.ts` 增强）→ 本地规则解析
  - 若题数不足或失败 → 调用后端 `/api/parse-quiz`（内部转发 twoapi）
  - 拿到题库 JSON → 生成可交互 HTML → 预览/下载
  - 可选“保存到云端” → POST `/api/quizzes` → 返回分享 id

- 后端（同仓 API Routes，Vercel 无服务器）：
  - `/api/parse-quiz`：转发到 twoapi `chat/completions`，用强提示产出严格 JSON
  - `/api/quizzes`（可选）：写入 Supabase/Neon 表 `quizzes`

---

## 你要操作的 Checklist

1) twoapi 环境
- 确认可用 baseUrl（默认：`https://twoapi-ui.qiangtu.com/v1`）
- 申请/确认 API Key（不要放在前端，改放服务端环境变量）

2) 本地开发
- 在项目根目录创建 `.env.local`：
  - TWOAPI_BASE_URL=你的 twoapi 地址
  - TWOAPI_API_KEY=你的 key
  - 如用 Supabase/Neon，再加对应连接串

3) 接入服务端 API
- 新增 `/study-app/app/api/parse-quiz/route.ts`（twoapi 兜底解析）
- 可选新增 `/study-app/app/api/quizzes/route.ts`（保存题库）

4) 页面串联
- 在 `study-app/components/smart-parsing-page.tsx` 中：
  - 保持“先本地解析 → 失败用 AI”调用链
  - 生成 HTML 并提供下载按钮
  - 可选“保存到云端”按钮

5) Vercel 部署
- 关联仓库 → 添加环境变量（与 `.env.local` 一致）→ 部署
- 打开站点用三类样本测试（规整/杂乱/超大）

---

## twoapi 的安全用法（基于 `study-app/API调用方式.md`）

你当前文档把 key 写在前端，这样会泄露。改为服务端 API Route 读取环境变量，再调用 twoapi。推荐非流式收敛 JSON；如必须流式，可在服务端聚合流后返回。

### 服务端 twoapi 封装（非流式，最稳妥）
````ts path=study-app/app/api/parse-quiz/route.ts mode=EDIT
export async function POST(req: Request) {
  const { content } = await req.json()
  const sys = '你是资深题库解析器...只返回严格JSON。'
  const user = `将以下文本解析为题库JSON（title,questions[id,question,options[],correctAnswer,type,explanation],totalQuestions）:\n${content}`
  const res = await fetch(`${process.env.TWOAPI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.TWOAPI_API_KEY}` },
    body: JSON.stringify({ model: 'gemini-2.5-pro-preview-06-05', stream: false, temperature: 0.2,
      messages: [{ role:'system', content: sys }, { role:'user', content: user }] })
  })
  if (!res.ok) return new Response('twoapi调用失败', { status: 500 })
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  const json = text.match(/\{[\s\S]*\}/)?.[0] || text // 取纯JSON
  return Response.json(JSON.parse(json))
}
````

说明
- 使用与 `study-app/API调用方式.md` 相同的 twoapi 入口，但移到服务端。
- 关闭 stream，减少解析复杂度；如你的 twoapi 必须流式，改 stream:true 并在服务端聚合。

### 如需流式（服务端聚合再返回）
思路：`fetch(..., { body: { stream:true } })` → `ReadableStream` 逐行解析 `data:` → 拼接 `delta.content` → 返回最终 JSON。保持在服务端完成聚合即可（此处略）。

---

## 前端调用 AI 解析（兜底）

````ts path=study-app/lib/ai-parser.ts mode=EDIT
export async function parseWithAI(content: string){
  const r = await fetch('/api/parse-quiz',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content }) })
  if(!r.ok) throw new Error('AI解析失败'); return r.json()
}
````

在 `study-app/components/smart-parsing-page.tsx` 中把“先本地后AI”接入（仅展示关键几行）：
````tsx path=study-app/components/smart-parsing-page.tsx mode=EDIT
// 本地解析失败或题数过少时
const local = QuizParser.parseQuizContent(content)
if (!local?.questions?.length) return await parseWithAI(content)
return local
````

---

## 生成可交互刷题 HTML

你已有下载功能；将题库数据交给 HTML 生成器即可（只示意关键函数）：
````ts path=study-app/lib/html-generator.ts mode=EDIT
export function generateInteractiveHTML(q){ return `<!doctype html><html><head>...<title>${q.title}</title></head><body>...<script>const quiz=${JSON.stringify(q)};/* 渲染/判分JS */</script></body></html>` }
````

页面里使用（仅关键行）：
````tsx path=study-app/components/smart-parsing-page.tsx mode=EDIT
import { generateInteractiveHTML } from '@/lib/html-generator'
const html = generateInteractiveHTML(quizData) // 然后走 Blob 下载（你已有）
````

---

## 可选：保存到云端（Supabase/Neon）

表结构（通用）：
````sql path=db/schema.sql mode=EDIT
create table if not exists public.quizzes(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  data jsonb not null,
  created_at timestamptz default now()
);
````

API Route（Supabase 版本示意）：
````ts path=study-app/app/api/quizzes/route.ts mode=EDIT
import { createClient } from '@supabase/supabase-js'
export async function POST(req: Request){
  const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const quiz = await req.json()
  const { data, error } = await s.from('quizzes').insert({ title: quiz.title||'智能题库', data: quiz }).select('id').single()
  return new Response(JSON.stringify({ id: data?.id, error }),{ status: error?400:200 })
}
````

前端保存：
````ts path=study-app/lib/saveQuiz.ts mode=EDIT
export async function saveQuiz(quiz:any){ const r=await fetch('/api/quizzes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(quiz)}); if(!r.ok) throw new Error('保存失败'); return r.json() }
````

---

## 环境变量与配置

- 本地 `/study-app/.env.local` 与 Vercel Project Settings 中均需设置：
  - TWOAPI_BASE_URL（如 `https://twoapi-ui.qiangtu.com/v1`）
  - TWOAPI_API_KEY
  - 可选：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 或 DATABASE_URL（Neon）

注意
- 不要把 key 放在前端或提交到仓库
- Vercel 会把 `process.env.*` 注入到 API Routes（服务端）

---

## 提示词模板（稳健产出严格 JSON）

System（关键点）
- 你是资深题库解析器，只返回严格 JSON，不包含多余文本
- 识别“题干/选项/正确答案/解析”，支持选择题、判断题、填空题
- 选项数组按出现顺序，`correctAnswer` 为正确选项索引（从 0 开始）

User（示意）
- 给出 schema 与样例，附上原始文本
- 要求：无多余字段；无法确定时给出最合理结构并把不确定写入 explanation

---

## 验收与测试

1) 样本一（规整题库）→ 仅本地解析通过，不调用 AI
2) 样本二（格式混乱）→ 本地 0 题，调用 AI 返回若干题目
3) 样本三（超大文本）→ 分段（可选）或提示用户用后端解析

检查：
- 题干、选项、正确答案是否一致
- 生成的 HTML 能交互判分
- twoapi 调用失败时是否有回退提示

---

## 常见问题

- 返回含非 JSON 文本：用正则提取第一段 `{...}`；必要时在提示词再强调“只返回 JSON”
- 两端换行导致解析异常：已在 `QuizParser.normalizeContent` 统一
- 流式解析困难：先关闭 stream，拿完整结果更稳；若必须流式，再做服务端聚合
- Vercel 函数 10 秒超时：把 temperature 降低、减少内容长度，或使用 Edge Runtime（仅在 fetch 可用场景）

---

## 你的下一步（最短路径）
- 新建 `/study-app/app/api/parse-quiz/route.ts`（如上），把 twoapi 环境变量写入 Vercel
- 在页面里接上“先本地→后AI”的分支
- 用你的真实文档跑一遍，确认能生成可交互 HTML
- 需要云端保存再加表与 `/api/quizzes`

需要我帮你把上述文件直接落到仓库里并连同页面最小改动一起提交吗？如果你确定 Supabase/Neon 的选择，我可以按该后端给出对应的最小可运行版本。
