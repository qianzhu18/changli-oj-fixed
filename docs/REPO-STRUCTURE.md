# 仓库结构与约定（示范版）

- apps/
  - web/: 前端应用（现 study-app）
  - backend/: 后端应用（现 backend）
- packages/
  - shared/: 共享类型与工具
- tools/
  - playwright/: 自动化/爬虫等工具（现 playwright-mcp）
- infra/
  - nginx/: 服务器配置
  - scripts/: 部署脚本
- docs/: 项目文档
- examples/: 示例/样本数据
- data/
  - raw/: 原始资料
- archive/: 归档（备份包、旧产物、一次性生成的HTML）

说明：
- 移动文件统一用 `git mv`，保证历史保留。
- 根 package.json `workspaces` 指向 apps/*。
- 不要把密钥放前端；环境变量仅在服务端使用。

