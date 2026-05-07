# 电商多任务并行架构方案

本文档描述如何实现「商品上架 + 内容采集」的多任务并行场景。

## 目录

- [场景分析](#场景分析)
- [架构设计](#架构设计)
- [实现方案](#实现方案)
- [代码示例](#代码示例)

---

## 场景分析

### 用户指令示例

```
"帮我上架这5个商品到抖音和拼多多，同时去小红书采集最近爆款的女装文案"
```

### 任务拆解

```
┌─────────────────────────────────────────────────────────────┐
│  任务类型 A：商品上架（运营任务）                        │
│  ├─ 商品1 → 抖音                                          │
│  ├─ 商品1 → 拼多多                                        │
│  ├─ 商品2 → 抖音                                          │
│  ├─ 商品2 → 拼多多                                        │
│  ├─ ...                                                   │
│  └─ (5个商品 × 2个平台 = 10个子任务)                      │
├─────────────────────────────────────────────────────────────┤
│  任务类型 B：内容采集（数据任务）                         │
│  └─ 小红书爆款文案采集                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户界面层                                    │
│  Proma UI                                                          │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      任务理解与调度层                                 │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Orchestrator Agent (任务编排器)                               │ │
│  │  - 理解用户意图                                               │ │
│  │  - 拆解任务                                                   │ │
│  │  - 分配任务到不同的执行器                                      │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                    ↓                              ↓
        ┌─────────────────────┐      ┌─────────────────────┐
        │   运营任务执行器      │      │   采集任务执行器      │
        │   (Operation Pool)  │      │   (Collection Pool) │
        └─────────────────────┘      └─────────────────────┘
                    ↓                              ↓
        ┌─────────────────────┐      ┌─────────────────────┐
        │  Playwright MCP    │      │  Web Scraping MCP   │
        │  (多浏览器实例)     │      │  (小红书采集)       │
        └─────────────────────┘      └─────────────────────┘
                    ↓                              ↓
        ┌──────────┬──────────┐      ┌──────────────┐
        │ 拼多多   │  抖音   │      │  小红书     │
        └──────────┴──────────┘      └──────────────┘
```

---

## 实现方案

### 方案 1：单 Orchestrator + 多 Worker Pool（推荐）

#### 核心思想
- 一个 Orchestrator Agent 负责任务理解与分配
- 多个 Worker Agents 分别处理不同类型的任务
- 通过任务队列协调并行执行

#### 工作流程

```
用户指令
    ↓
Orchestrator Agent
├─ 1. 解析用户意图
├─ 2. 识别任务类型
│   ├─ 运营任务 (商品上架)
│   └─ 采集任务 (文案采集)
├─ 3. 创建任务队列
└─ 4. 分配给 Worker Agents
    ↓
Worker Agents 并行执行
├─ Operation Workers → 商品上架
└─ Collection Worker → 文案采集
    ↓
实时进度推送
    ↓
结果汇总与报告
```

---

### 方案 2：基于 Claude Agent Teams（Proma 原生支持）

#### 核心思想
- 利用 Proma 已有的 Claude Agent Teams 功能
- Team Lead 负责任务分配与协调
- Worker Agents 独立执行各自任务

#### Team 配置示例

```json
{
  "team": {
    "name": "ecommerce-operations",
    "lead": {
      "role": "orchestrator",
      "systemPrompt": "你是一个任务编排专家..."
    },
    "workers": [
      {
        "id": "operation-pdd",
        "role": "operation-worker",
        "workspace": "pdd-store-a",
        "platform": "pinduoduo",
        "capabilities": ["product-listing", "order-management"]
      },
      {
        "id": "operation-douyin",
        "role": "operation-worker", 
        "workspace": "douyin-store-a",
        "platform": "douyin",
        "capabilities": ["product-listing", "live-management"]
      },
      {
        "id": "collection-xhs",
        "role": "collection-worker",
        "workspace": "xhs-collection",
        "capabilities": ["content-collection", "trend-analysis"]
      }
    ]
  }
}
```

---

## 代码示例

### 1. 任务编排器 (Orchestrator)

```typescript
// orchestrator.ts
interface Task {
  id: string
  type: 'operation' | 'collection'
  action: string
  target: {
    platform?: string
    store?: string
  }
  params: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
}

class TaskOrchestrator {
  private tasks: Map<string, Task> = new Map()
  private operationWorkers: WorkerAgent[]
  private collectionWorkers: WorkerAgent[]

  async processUserRequest(userInput: string) {
    // 1. 理解用户意图
    const intent = await this.understandIntent(userInput)
    
    // 2. 拆解任务
    const tasks = this.decomposeTasks(intent)
    
    // 3. 分配任务
    await this.assignTasks(tasks)
    
    // 4. 监控执行
    await this.monitorExecution(tasks)
    
    // 5. 汇总结果
    return this.generateReport(tasks)
  }

  private async understandIntent(input: string) {
    // 使用 Claude 理解用户意图
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `
          分析以下用户指令，提取任务信息：
          
          用户指令：${input}
          
          请以 JSON 格式返回：
          {
            "tasks": [
              {
                "type": "operation | collection",
                "action": "具体动作",
                "targets": ["目标1", "目标2"],
                "params": {}
              }
            ]
          }
        `
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }

  private decomposeTasks(intent: any): Task[] {
    const tasks: Task[] = []
    
    for (const task of intent.tasks) {
      if (task.type === 'operation') {
        // 商品上架任务 → 按平台拆分为多个子任务
        for (const platform of task.targets) {
          tasks.push({
            id: this.generateId(),
            type: 'operation',
            action: task.action,
            target: { platform },
            params: task.params,
            status: 'pending'
          })
        }
      } else if (task.type === 'collection') {
        // 采集任务 → 单任务
        tasks.push({
          id: this.generateId(),
          type: 'collection',
          action: task.action,
          target: task.targets[0],
          params: task.params,
          status: 'pending'
        })
      }
    }
    
    return tasks
  }

  private async assignTasks(tasks: Task[]) {
    const operations = tasks.filter(t => t.type === 'operation')
    const collections = tasks.filter(t => t.type === 'collection')
    
    // 并行分配运营任务和采集任务
    await Promise.all([
      this.assignOperationTasks(operations),
      this.assignCollectionTasks(collections)
    ])
  }

  private async assignOperationTasks(tasks: Task[]) {
    // 为每个平台分配 Worker
    const platformWorkers = new Map<string, WorkerAgent>()
    
    for (const task of tasks) {
      const platform = task.target.platform
      
      if (!platformWorkers.has(platform)) {
        const worker = this.getWorkerForPlatform(platform)
        platformWorkers.set(platform, worker)
      }
      
      const worker = platformWorkers.get(platform)
      await worker.addTask(task)
    }
    
    // 启动所有 Worker
    await Promise.all(
      Array.from(platformWorkers.values()).map(w => w.execute())
    )
  }

  private async assignCollectionTasks(tasks: Task[]) {
    const worker = this.collectionWorkers[0]
    for (const task of tasks) {
      await worker.addTask(task)
    }
    await worker.execute()
  }

  private async monitorExecution(tasks: Task[]) {
    // 实时推送进度
    const progress = this.calculateProgress(tasks)
    this.emit('progress', progress)
    
    // 等待所有任务完成
    while (!this.allCompleted(tasks)) {
      await this.sleep(1000)
      const progress = this.calculateProgress(tasks)
      this.emit('progress', progress)
    }
  }

  private generateReport(tasks: Task[]) {
    const operationResults = tasks.filter(t => t.type === 'operation')
    const collectionResults = tasks.filter(t => t.type === 'collection')
    
    return {
      summary: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      operations: operationResults.map(t => ({
        platform: t.target.platform,
        action: t.action,
        status: t.status,
        result: t.result
      })),
      collections: collectionResults.map(t => ({
        source: t.target,
        status: t.status,
        result: t.result
      }))
    }
  }
}
```

### 2. Worker Agent

```typescript
// worker-agent.ts
class WorkerAgent {
  private platform: string
  private browser: Browser
  private mcp: PlaywrightMCP

  async executeTask(task: Task) {
    try {
      task.status = 'running'
      
      switch (task.action) {
        case 'product-listing':
          await this.executeProductListing(task)
          break
        case 'content-collection':
          await this.executeContentCollection(task)
          break
      }
      
      task.status = 'completed'
      return task.result
    } catch (error) {
      task.status = 'failed'
      task.result = { error: error.message }
      return task.result
    }
  }

  private async executeProductListing(task: Task) {
    const { platform, product } = task.params
    
    // 1. 打开发布页面
    await this.browser.navigate(this.getListingUrl(platform))
    
    // 2. 填写商品信息
    await this.browser.fill('[name="title"]', product.title)
    await this.browser.fill('[name="price"]', product.price)
    
    // 3. 上传图片
    await this.browser.upload('[type="file"]', product.images)
    
    // 4. 提交发布
    await this.browser.click('[type="submit"]')
    
    // 5. 获取结果
    task.result = {
      success: true,
      productId: await this.browser.getProductId()
    }
  }

  private async executeContentCollection(task: Task) {
    const { keywords, count } = task.params
    
    // 1. 打开小红书
    await this.browser.navigate('https://www.xiaohongshu.com')
    
    // 2. 搜索关键词
    await this.browser.fill('[placeholder="搜索"]', keywords)
    await this.browser.click('[data-v-bill-search-btn]')
    
    // 3. 采集内容
    const results = []
    for (let i = 0; i < count; i++) {
      const content = await this.browser.extractNote()
      results.push(content)
      await this.browser.scrollDown()
    }
    
    task.result = {
      success: true,
      count: results.length,
      data: results
    }
  }

  private getListingUrl(platform: string): string {
    const urls = {
      pinduoduo: 'https://mms.pinduoduo.com/goods/add',
      douyin: 'https://partner.douyin.com/goods/add',
      taobao: 'https://upload.taobao.com/auction/publish',
      jd: 'https://seller.jd.com/product/add'
    }
    return urls[platform]
  }
}
```

### 3. 多浏览器实例管理

```typescript
// browser-pool.ts
class BrowserPool {
  private browsers: Map<string, Browser> = new Map()
  private maxBrowsers: number = 5

  async getBrowser(instanceId: string, profilePath: string): Promise<Browser> {
    if (!this.browsers.has(instanceId)) {
      if (this.browsers.size >= this.maxBrowsers) {
        // 关闭最久未使用的浏览器
        await this.releaseOldestBrowser()
      }
      
      // 创建新浏览器实例
      const browser = await playwright.chromium.launch({
        userDataDir: profilePath,
        headless: false
      })
      
      this.browsers.set(instanceId, browser)
    }
    
    return this.browsers.get(instanceId)
  }

  async releaseBrowser(instanceId: string) {
    const browser = this.browsers.get(instanceId)
    if (browser) {
      await browser.close()
      this.browsers.delete(instanceId)
    }
  }

  async releaseAll() {
    for (const browser of this.browsers.values()) {
      await browser.close()
    }
    this.browsers.clear()
  }
}
```

---

## 进度追踪与实时反馈

### WebSocket 实时推送

```typescript
// 实时推送任务进度
io.on('connection', (socket) => {
  socket.on('subscribe-task', (taskId) => {
    socket.join(`task-${taskId}`)
  })
})

// 任务状态更新时推送
function emitProgress(taskId: string, progress: Progress) {
  io.to(`task-${taskId}`).emit('progress-update', {
    taskId,
    progress,
    timestamp: Date.now()
  })
}
```

### 前端进度展示

```tsx
// TaskProgress.tsx
function TaskProgress({ taskId }: { taskId: string }) {
  const [progress, setProgress] = useState<Progress | null>(null)

  useEffect(() => {
    const socket = io()
    socket.emit('subscribe-task', taskId)
    socket.on('progress-update', (data) => {
      setProgress(data.progress)
    })
    
    return () => socket.disconnect()
  }, [taskId])

  return (
    <div className="space-y-4">
      {/* 运营任务进度 */}
      <div>
        <h3>📦 商品上架</h3>
        <ProgressList items={progress?.operations || []} />
      </div>
      
      {/* 采集任务进度 */}
      <div>
        <h3>📝 文案采集</h3>
        <ProgressList items={progress?.collections || []} />
      </div>
    </div>
  )
}
```

---

## 错误处理与重试

### 任务失败重试策略

```typescript
interface RetryConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
}

async function executeWithRetry(
  task: Task,
  executor: (task: Task) => Promise<any>,
  config: RetryConfig = defaultRetryConfig
): Promise<any> {
  let lastError: Error
  
  for (let i = 0; i <= config.maxRetries; i++) {
    try {
      return await executor(task)
    } catch (error) {
      lastError = error
      
      if (i < config.maxRetries) {
        const delay = config.retryDelay * Math.pow(config.backoffMultiplier, i)
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}
```

---

## 总结

### 方案对比

| 方案 | 复杂度 | 扩展性 | 推荐场景 |
|------|--------|--------|---------|
| 单 Orchestrator + Worker Pool | 中 | 高 | 大部分场景（推荐） |
| Claude Agent Teams | 高 | 高 | 需要复杂协同 |
| 顺序执行 | 低 | 低 | 小规模、简单任务 |

### 推荐实施路径

1. **Phase 1**：实现单 Agent + 多 MCP 并行
   - 一个 Orchestrator Agent
   - 多个 Playwright 实例
   - 任务队列管理

2. **Phase 2**：添加多 Agent Teams
   - Team Lead 协调
   - 专业 Worker Agents
   - 更复杂的任务分配

3. **Phase 3**：完善监控与报告
   - 实时进度推送
   - 详细执行日志
   - 可视化报告
