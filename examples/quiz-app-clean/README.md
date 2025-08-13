# Quiz App

智能题库系统 - Next.js 全栈应用

## 功能特性
- 📝 智能题库解析
- 🤖 AI 生成刷题页面  
- 📊 实时健康监控
- ⚡ Serverless 部署

## 技术栈
- **前端**: Next.js 15 + React 19
- **数据库**: Neon PostgreSQL  
- **部署**: Vercel Serverless
- **AI**: Google Gemini

## 环境要求
```
DATABASE_URL=postgresql://...
GOOGLE_GEMINI_KEY=your_key_here
```


## 快速验证

部署后访问以下端点验证：

- `/` - 主页
- `/api/health` - 健康检查  
- `/api/ai/validate-key` - AI 服务状态

## 演示数据

可以上传以下格式的题库文件进行测试：
- `.txt` - 纯文本
- `.md` - Markdown  
- `.csv` - CSV 格式

