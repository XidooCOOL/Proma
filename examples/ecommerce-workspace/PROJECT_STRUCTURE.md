# 电商多任务并行系统 - 项目结构

## 目录结构

```
examples/ecommerce-workspace/
├── README.md                          # 项目说明文档
│
├── src/                              # 源代码
│   ├── types/
│   │   └── index.ts                 # 类型定义
│   │
│   ├── orchestrator.ts              # 任务编排器
│   ├── intent-parser.ts             # 意图解析器
│   ├── worker-pool.ts               # Worker 池管理器
│   ├── browser-pool.ts              # 浏览器池管理器
│   │
│   ├── workers/                     # Workers
│   │   ├── operation-worker.ts      # 运营 Worker
│   │   └── collection-worker.ts     # 采集 Worker
│   │
│   ├── components/                  # 前端组件
│   │   └── TaskProgress.tsx        # 进度展示组件
│   │
│   └── example.ts                   # 使用示例
│
├── skills/                          # Skills
│   ├── multi-task-orchestrator/    # 多任务编排 Skill
│   │   └── SKILL.md
│   ├── add-store/                  # 添加店铺 Skill
│   │   └── SKILL.md
│   ├── product-listing/            # 商品上架 Skill
│   │   └── SKILL.md
│   └── order-management/           # 订单管理 Skill
│       └── SKILL.md
│
└── architecture/                   # 架构文档
    └── multi-task-parallel.md      # 多任务并行方案
```

---

## 核心组件

### 1. TaskOrchestrator（任务编排器）

**文件**: [src/orchestrator.ts](src/orchestrator.ts)

**职责**:
- 理解用户意图
- 拆解任务
- 分配任务到 Worker
- 协调执行
- 汇总结果

**关键方法**:
```typescript
async processUserRequest(userInput: string): Promise<TaskSession>
async executeTasksParallel(tasks: Task[]): Promise<TaskResult[]>
generateReport(sessionId: string): any
```

### 2. IntentParser（意图解析器）

**文件**: [src/intent-parser.ts](src/intent-parser.ts)

**职责**:
- 解析用户输入
- 识别任务类型
- 提取关键信息（平台、商品、关键词等）

**关键方法**:
```typescript
async parse(userInput: string): Promise<UserIntent>
private extractOperations(input: string): ParsedOperation[]
private extractCollections(input: string): ParsedCollection[]
```

### 3. WorkerPool（Worker 池）

**文件**: [src/worker-pool.ts](src/worker-pool.ts)

**职责**:
- 管理多个 Workers
- 分配任务到可用 Worker
- 协调并行执行

**关键方法**:
```typescript
async executeTask(sessionId: string, groupId: string, task: Task): Promise<TaskResult>
async executeTasksParallel(tasks: Task[]): Promise<TaskResult[]>
getWorkerStatus(): any
```

### 4. BrowserPool（浏览器池）

**文件**: [src/browser-pool.ts](src/browser-pool.ts)

**职责**:
- 管理多个浏览器实例
- 支持多 Profile 隔离
- 提供浏览器操作接口

**关键方法**:
```typescript
async acquireBrowser(instanceId: string, platform: Platform): Promise<BrowserInstance>
async navigate(instanceId: string, url: string): Promise<void>
async fill(instanceId: string, selector: string, value: string): Promise<void>
async click(instanceId: string, selector: string): Promise<void>
async upload(instanceId: string, selector: string, filePath: string): Promise<void>
async screenshot(instanceId: string): Promise<Buffer>
```

### 5. OperationWorker（运营 Worker）

**文件**: [src/workers/operation-worker.ts](src/workers/operation-worker.ts)

**职责**:
- 执行商品上架
- 执行订单处理
- 执行库存更新

**关键方法**:
```typescript
async executeProductListing(task: Task): Promise<TaskResult>
async executeOrderManagement(task: Task): Promise<TaskResult>
async executeInventoryUpdate(task: Task): Promise<TaskResult>
```

### 6. CollectionWorker（采集 Worker）

**文件**: [src/workers/collection-worker.ts](src/workers/collection-worker.ts)

**职责**:
- 执行内容采集
- 执行价格监控
- 执行竞品分析

**关键方法**:
```typescript
async executeContentCollection(task: Task): Promise<TaskResult>
async executePriceMonitoring(task: Task): Promise<TaskResult>
async executeCompetitorAnalysis(task: Task): Promise<TaskResult>
```

---

## 数据流

```
用户输入
    ↓
IntentParser.parse()
    ↓
TaskOrchestrator.createSession()
    ↓
WorkerPool.executeTasksParallel()
    ↓
┌─────────────────┬─────────────────┐
│ OperationWorker │ CollectionWorker│
│ (商品上架)     │ (内容采集)      │
└────────┬────────┴────────┬────────┘
         ↓                ↓
    BrowserPool      BrowserPool
    (抖音浏览器)     (小红书浏览器)
         ↓                ↓
    拼多多平台       小红书平台
```

---

## 类型定义

### Task（任务）

```typescript
interface Task {
  id: string                      // 任务 ID
  type: 'operation' | 'collection' // 任务类型
  action: string                  // 动作类型
  target: TaskTarget              // 目标平台
  params: TaskParams              // 任务参数
  status: TaskStatus              // 状态
  progress: number                // 进度 (0-100)
  result?: TaskResult             // 结果
  retryCount: number              // 重试次数
  maxRetries: number              // 最大重试次数
}
```

### TaskSession（会话）

```typescript
interface TaskSession {
  id: string                      // 会话 ID
  groups: TaskGroup[]             // 任务组
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: OverallProgress       // 总体进度
  createdAt: number               // 创建时间
}
```

### TaskGroup（任务组）

```typescript
interface TaskGroup {
  id: string
  type: 'operation' | 'collection'
  name: string
  tasks: Task[]                  // 组内任务
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number                // 组进度
}
```

---

## 事件系统

### 事件类型

```typescript
type TaskEventType = 
  | 'task-created'
  | 'task-started'
  | 'task-progress'
  | 'task-completed'
  | 'task-failed'
  | 'group-started'
  | 'group-progress'
  | 'group-completed'
  | 'group-failed'
  | 'session-start'
  | 'session-complete'
  | 'session-error'
```

### 事件监听

```typescript
orchestrator.on('task-progress', ({ taskId, progress, message }) => {
  console.log(`进度: ${taskId} - ${progress}% - ${message}`)
})

orchestrator.on('task-complete', ({ task }) => {
  console.log(`任务完成: ${task.id}`)
})

orchestrator.on('session-complete', ({ session }) => {
  const report = orchestrator.generateReport(session.id)
  console.log('最终报告:', report)
})
```

---

## 使用示例

### 基本使用

```typescript
import { TaskOrchestrator } from './orchestrator'

const orchestrator = new TaskOrchestrator()

// 监听事件
orchestrator.on('session-complete', ({ session }) => {
  const report = orchestrator.generateReport(session.id)
  console.log('报告:', report)
})

// 处理用户请求
const session = await orchestrator.processUserRequest(
  '帮我上架这2个商品到抖音和拼多多，同时去小红书采集女装爆款文案'
)

// 获取会话
const currentSession = orchestrator.getSession(session.id)
```

### 批量任务

```typescript
// 商品上架
await orchestrator.processUserRequest(
  '上架商品A到抖音和拼多多，价格99'
)

// 订单处理
await orchestrator.processUserRequest(
  '处理今天所有待发货订单'
)

// 数据采集
await orchestrator.processUserRequest(
  '采集小红书女装爆款文案，50篇'
)
```

---

## 依赖项

```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "uuid": "^9.0.0"
  }
}
```

---

## 下一步

1. **集成到 Proma**
   - 创建 MCP Server 封装任务编排器
   - 在 Proma 中调用 MCP Server

2. **完善 Worker 实现**
   - 实现真实的选择器逻辑
   - 添加更多错误处理
   - 优化重试机制

3. **增强前端**
   - 实现真实的 WebSocket 连接
   - 添加更多交互功能
   - 优化样式

4. **扩展平台支持**
   - 添加淘宝、京东等平台支持
   - 适配更多电商后台
