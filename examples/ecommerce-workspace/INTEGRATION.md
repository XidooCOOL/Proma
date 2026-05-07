# 电商多任务并行系统 - 集成指南

本文档描述如何将电商多任务并行系统集成到 Proma 中。

## 目录

- [快速开始](#快速开始)
- [方式一：作为 Proma 工作区配置](#方式一作为-proma-工作区配置)
- [方式二：独立运行 MCP Server](#方式二独立运行-mcp-server)
- [运行测试](#运行测试)
- [常见问题](#常见问题)

---

## 快速开始

### 1. 克隆项目

```bash
cd /workspace/examples/ecommerce-workspace
```

### 2. 安装依赖

```bash
npm install
```

### 3. 构建项目

```bash
npm run build
```

### 4. 运行示例

```bash
npm run example
```

---

## 方式一：作为 Proma 工作区配置

### 步骤 1：创建工作区目录

```bash
# 在 Proma 工作区目录下创建电商工作区
mkdir -p ~/.proma/agent-workspaces/ecommerce-demo

# 复制配置
cp mcp.playwright.json ~/.proma/agent-workspaces/ecommerce-demo/mcp.json
```

### 步骤 2：复制 Skills

```bash
# 复制多任务编排 Skill
cp -r skills/multi-task-orchestrator ~/.proma/agent-workspaces/ecommerce-demo/skills/

# 复制商品上架 Skill
cp -r skills/product-listing ~/.proma/agent-workspaces/ecommerce-demo/skills/

# 复制订单管理 Skill
cp -r skills/order-management ~/.proma/agent-workspaces/ecommerce-demo/skills/
```

### 步骤 3：配置工作区

创建工作区配置文件 `~/.proma/agent-workspaces/ecommerce-demo/workspace.json`：

```json
{
  "id": "ecommerce-demo",
  "name": "电商运营助手",
  "slug": "ecommerce-demo",
  "platform": "ecommerce",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "settings": {
    "autoLogin": true,
    "browserType": "chrome",
    "maxConcurrentTasks": 10
  }
}
```

### 步骤 4：在 Proma 中使用

1. 打开 Proma 应用
2. 切换到电商工作区
3. 在 Agent 模式下输入：

```
帮我上架这2个商品到抖音和拼多多：
1. 商品A - 女装连衣裙，价格199元
2. 商品B - 运动鞋，价格299元

同时去小红书采集最近爆款的女装文案，50篇
```

---

## 方式二：独立运行 MCP Server

如果只想单独运行 MCP Server，不集成到 Proma：

### 步骤 1：构建 MCP Server

```bash
npm run build
```

### 步骤 2：运行 MCP Server

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 步骤 3：测试 MCP Server

创建测试文件 `test-mcp.mjs`：

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/mcp-server.js']
  })

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  })

  await client.connect(transport)

  // 调用工具
  const result = await client.callTool({
    name: 'process_ecommerce_task',
    arguments: {
      user_input: '帮我上架商品到抖音和拼多多'
    }
  })

  console.log('结果:', result)

  await client.close()
}

main()
```

运行测试：

```bash
node test-mcp.mjs
```

---

## 运行测试

### 测试 1：基本任务

```bash
npm run example
```

预期输出：

```
========== 测试场景1: 商品上架 ==========
🚀 会话开始: xxx-xxx-xxx
意图: {...}
▶️ 任务开始: task-xxx (product-listing)
📊 进度: task-xxx - 20% - 打开发布页面
📊 进度: task-xxx - 30% - 填写商品标题
...
✅ 任务完成: task-xxx
🏁 会话完成: xxx-xxx-xxx

========== 最终报告 ==========
{
  "summary": {
    "totalTasks": 2,
    "completedTasks": 2,
    "failedTasks": 0
  }
}
```

### 测试 2：多任务并行

```bash
npm run example
```

预期输出：

```
========== 测试场景2: 商品上架 + 文案采集 ==========
🚀 会话开始: yyy-yyy-yyy
📦 商品上架组: 开始执行
📝 文案采集组: 开始执行
...
🏁 会话完成: yyy-yyy-yyy
```

### 测试 3：类型检查

```bash
npm run typecheck
```

---

## MCP 工具说明

### 1. process_ecommerce_task

处理电商多任务请求。

**输入**：
```javascript
{
  "user_input": "帮我上架这2个商品到抖音和拼多多，同时去小红书采集女装爆款文案"
}
```

**输出**：
```javascript
{
  "success": true,
  "session_id": "xxx-xxx-xxx",
  "message": "任务已创建，共 2 个任务组",
  "groups": [
    {
      "id": "group-xxx",
      "name": "product-listing - douyin, pinduoduo",
      "type": "operation",
      "tasks": 2
    },
    {
      "id": "group-yyy",
      "name": "content-collection - xiaohongshu",
      "type": "collection",
      "tasks": 1
    }
  ]
}
```

### 2. get_task_progress

获取任务执行进度。

**输入**：
```javascript
{
  "session_id": "xxx-xxx-xxx"
}
```

**输出**：
```javascript
{
  "success": true,
  "session_id": "xxx-xxx-xxx",
  "status": "running",
  "progress": 65,
  "groups": [
    {
      "id": "group-xxx",
      "name": "product-listing",
      "status": "running",
      "progress": 80,
      "completed": 2,
      "failed": 0,
      "total": 2
    }
  ]
}
```

### 3. get_task_report

获取任务完成报告。

**输入**：
```javascript
{
  "session_id": "xxx-xxx-xxx"
}
```

**输出**：
```javascript
{
  "success": true,
  "report": {
    "summary": {
      "totalTasks": 3,
      "completedTasks": 3,
      "failedTasks": 0,
      "duration": 45000
    },
    "operations": [...],
    "collections": [...]
  }
}
```

### 4. list_sessions

列出所有任务会话。

**输入**：无

**输出**：
```javascript
{
  "success": true,
  "sessions": [
    {
      "id": "xxx-xxx-xxx",
      "status": "completed",
      "groups": 2,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 5. cancel_session

取消正在执行的任务会话。

**输入**：
```javascript
{
  "session_id": "xxx-xxx-xxx"
}
```

**输出**：
```javascript
{
  "success": true,
  "message": "Session xxx-xxx-xxx has been cancelled"
}
```

### 6. get_worker_status

获取 Worker 池状态。

**输入**：无

**输出**：
```javascript
{
  "success": true,
  "status": "ready",
  "operation_workers": 5,
  "collection_workers": 2
}
```

---

## 常见问题

### Q1: MCP Server 启动失败

**问题**：运行 `npm start` 时报错

**解决**：
1. 确保已构建：`npm run build`
2. 检查 Node.js 版本：需要 >= 18.0.0
3. 查看错误信息

```bash
node --version
npm run build
npm start
```

### Q2: 浏览器无法启动

**问题**：Playwright 报错"Browser not found"

**解决**：
1. 安装浏览器：`npx playwright install chromium`
2. 或者使用已有的 Chrome：`export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome`

### Q3: 任务执行失败

**问题**：任务一直失败

**解决**：
1. 检查网络连接
2. 检查平台登录状态
3. 查看日志中的具体错误信息
4. 尝试减少并发数

### Q4: 如何查看详细日志

**解决**：
```bash
# 开启调试模式
DEBUG=* npm run dev

# 或者查看 stderr 输出
npm start 2>&1 | tee log.txt
```

### Q5: 如何修改 Worker 数量

**解决**：
修改 `src/worker-pool.ts`：

```typescript
const defaultConfig: WorkerPoolConfig = {
  maxOperationWorkers: 10,  // 增加运营 Worker
  maxCollectionWorkers: 5,  // 增加采集 Worker
  // ...
}
```

---

## 下一步

1. **配置真实平台**
   - 添加拼多多、抖音的登录信息
   - 配置浏览器 Profile
   - 测试完整流程

2. **优化性能**
   - 调整 Worker 数量
   - 优化选择器
   - 添加缓存

3. **扩展功能**
   - 添加更多平台支持
   - 实现定时任务
   - 添加通知功能

---

## 技术支持

如有问题，请查看：
- [项目结构文档](./PROJECT_STRUCTURE.md)
- [架构设计文档](./architecture/multi-task-parallel.md)
- [Skill 使用说明](./skills/multi-task-orchestrator/SKILL.md)
