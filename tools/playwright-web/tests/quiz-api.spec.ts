import { test, expect, request } from '@playwright/test'

const baseURL = 'http://localhost:3000'

async function isServerUp() {
  try {
    const ctx = await request.newContext()
    const r = await ctx.get(baseURL)
    await ctx.dispose()
    return r.ok() || r.status() === 404
  } catch { return false }
}

test.describe('题库生成API', () => {
  test.beforeAll(async function () {
    test.info().annotations.push({ type: 'baseURL', description: baseURL })
    if (!(await isServerUp())) test.skip(true, 'Next.js 未启动，跳过API测试')
  })

  test('step1：未提供出题顺序时返回问询提示', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/ai/parse-quiz`, {
      data: {
        content: '1. A?\nA. a\nB. b\n答案：A',
        aiConfig: { provider: 'local' }
      }
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.step).toBe('step1')
    expect(String(json.prompt)).toContain('顺序出还是随机出')
  })

  test('顺序：选择题HTML可生成', async ({ request }) => {
    const content = [
      '测试题库',
      '1. 什么是端到端测试？',
      'A. 单元测试',
      'B. 集成测试',
      'C. 完整流程测试',
      'D. 性能测试',
      '答案：C',
      '',
      '2. API的全称是什么？',
      'A. Application Programming Interface',
      'B. Advanced Programming Interface',
      'C. Automated Programming Interface',
      'D. Application Process Interface',
      '答案：A'
    ].join('\n')

    const res = await request.post(`${baseURL}/api/ai/parse-quiz`, {
      data: {
        content,
        orderMode: '顺序',
        aiConfig: { provider: 'local' }
      }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    const html: string = json.data.html
    expect(html).toContain('<html')
    expect(html).toContain('模式: 顺序')
    expect(html).toContain('题目 ${currentQuestionIndex + 1}') // 检查JS模板
    expect(html).toContain('选择题')
  })

  test('顺序：填空题HTML可生成与严格匹配', async ({ request }) => {
    const content = [
      '测试题库',
      '1. HTTP状态码200表示 _____。',
      '答案：成功',
      '',
      '2. REST的核心原则是 _____。',
      '答案：无状态'
    ].join('\n')

    const res = await request.post(`${baseURL}/api/ai/parse-quiz`, {
      data: {
        content,
        orderMode: '顺序',
        aiConfig: { provider: 'local' }
      }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    const html: string = json.data.html
    expect(html).toContain('模式: 顺序')
    expect(html).toContain('填空题')
    expect(html).toContain('提交答案')
  })

  test('随机：模式标记与题数一致', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/ai/parse-quiz`, {
      data: {
        content: '1. Q?\nA. a\nB. b\n答案：A',
        orderMode: '随机',
        aiConfig: { provider: 'local' }
      }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    const html: string = json.data.html
    expect(html).toContain('模式: 随机')
    expect(html).toMatch(/\/ <span>1<\/span>/) // 总题数为1
  })
})
