/**
 * Worker Pool - 任务执行器池
 * 
 * 负责：
 * 1. 管理多个 Worker
 * 2. 分配任务到 Worker
 * 3. 协调并行执行
 */

import EventEmitter from 'events'
import { v4 as uuidv4 } from 'uuid'
import {
  Task,
  TaskGroup,
  Worker,
  WorkerConfig,
  WorkerStatus,
  WorkerType,
  Platform,
  TaskResult,
} from './types'
import { OperationWorker } from './workers/operation-worker'
import { CollectionWorker } from './workers/collection-worker'

export interface WorkerPoolConfig {
  maxOperationWorkers: number
  maxCollectionWorkers: number
  defaultTimeout: number
  enableRetry: boolean
  maxRetries: number
}

const defaultConfig: WorkerPoolConfig = {
  maxOperationWorkers: 5,
  maxCollectionWorkers: 2,
  defaultTimeout: 60000,
  enableRetry: true,
  maxRetries: 3,
}

export class WorkerPool extends EventEmitter {
  private config: WorkerPoolConfig
  private operationWorkers: OperationWorker[] = []
  private collectionWorkers: CollectionWorker[] = []
  private taskQueue: Map<string, Task> = new Map()
  private executingTasks: Map<string, Task> = new Map()
  private browserProfiles: Map<string, any> = new Map()

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super()
    this.config = { ...defaultConfig, ...config }
    this.initializeWorkers()
  }

  /**
   * 初始化 Workers
   */
  private initializeWorkers(): void {
    console.log(`[WorkerPool] 初始化 Workers...`)

    // 初始化运营 Workers
    for (let i = 0; i < this.config.maxOperationWorkers; i++) {
      const worker = new OperationWorker({
        id: `operation-worker-${i}`,
        type: 'operation',
        maxConcurrentTasks: 1,
        timeout: this.config.defaultTimeout,
        retryEnabled: this.config.enableRetry,
        maxRetries: this.config.maxRetries
      })
      
      this.setupWorkerEvents(worker)
      this.operationWorkers.push(worker)
    }

    // 初始化采集 Workers
    for (let i = 0; i < this.config.maxCollectionWorkers; i++) {
      const worker = new CollectionWorker({
        id: `collection-worker-${i}`,
        type: 'collection',
        maxConcurrentTasks: 1,
        timeout: this.config.defaultTimeout,
        retryEnabled: this.config.enableRetry,
        maxRetries: this.config.maxRetries
      })

      this.setupWorkerEvents(worker)
      this.collectionWorkers.push(worker)
    }

    console.log(`[WorkerPool] 初始化完成: ${this.operationWorkers.length} 个运营 Worker, ${this.collectionWorkers.length} 个采集 Worker`)
  }

  /**
   * 设置 Worker 事件
   */
  private setupWorkerEvents(worker: OperationWorker | CollectionWorker): void {
    worker.on('task-start', (data: any) => {
      this.emit('worker:task-start', data)
    })

    worker.on('task-progress', (data: any) => {
      this.emit('worker:task-progress', data)
    })

    worker.on('task-complete', (data: any) => {
      this.executingTasks.delete(data.task.id)
      this.emit('worker:task-complete', data)
    })

    worker.on('task-failed', (data: any) => {
      this.executingTasks.delete(data.task.id)
      this.emit('worker:task-failed', data)
    })
  }

  /**
   * 执行任务
   */
  async executeTask(sessionId: string, groupId: string, task: Task): Promise<any> {
    console.log(`[WorkerPool] 执行任务: ${task.id} (${task.type} - ${task.action})`)

    this.taskQueue.set(task.id, task)
    this.emit('worker:task-start', { sessionId, groupId, task })

    try {
      let worker: OperationWorker | CollectionWorker | undefined

      if (task.type === 'operation') {
        worker = this.getAvailableOperationWorker(task.target.platform)
      } else if (task.type === 'collection') {
        worker = this.getAvailableCollectionWorker()
      }

      if (!worker) {
        throw new Error('没有可用的 Worker')
      }

      task.status = 'running'
      task.startedAt = Date.now()
      task.workerId = worker.id

      this.executingTasks.set(task.id, task)

      const result = await worker.execute(task)

      task.status = 'completed'
      task.progress = 100
      task.result = {
        success: true,
        data: result,
        timestamp: Date.now(),
        duration: Date.now() - (task.startedAt || Date.now())
      }
      task.completedAt = Date.now()

      this.emit('worker:task-complete', { sessionId, groupId, task, result })

      return result
    } catch (error) {
      task.status = 'failed'
      task.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      }

      this.emit('worker:task-failed', {
        sessionId,
        groupId,
        task,
        error: error instanceof Error ? error.message : String(error)
      })

      throw error
    } finally {
      this.taskQueue.delete(task.id)
    }
  }

  /**
   * 获取可用的运营 Worker
   */
  private getAvailableOperationWorker(platform?: Platform): OperationWorker | undefined {
    return this.operationWorkers.find(w => w.status === 'idle')
  }

  /**
   * 获取可用的采集 Worker
   */
  private getAvailableCollectionWorker(): CollectionWorker | undefined {
    return this.collectionWorkers.find(w => w.status === 'idle')
  }

  /**
   * 并行执行多个任务
   */
  async executeTasksParallel(sessionId: string, groupId: string, tasks: Task[]): Promise<any[]> {
    console.log(`[WorkerPool] 并行执行 ${tasks.length} 个任务`)

    const promises = tasks.map(task => 
      this.executeTask(sessionId, groupId, task).catch(error => ({
        taskId: task.id,
        success: false,
        error: error.message
      }))
    )

    return Promise.all(promises)
  }

  /**
   * 获取 Worker 状态
   */
  getWorkerStatus(): any {
    return {
      operationWorkers: this.operationWorkers.map(w => ({
        id: w.id,
        status: w.status,
        currentTask: w.currentTask?.id,
        platform: w.platform
      })),
      collectionWorkers: this.collectionWorkers.map(w => ({
        id: w.id,
        status: w.status,
        currentTask: w.currentTask?.id
      })),
      queueSize: this.taskQueue.size,
      executingSize: this.executingTasks.size
    }
  }

  /**
   * 注册浏览器 Profile
   */
  registerBrowserProfile(profileId: string, profile: any): void {
    this.browserProfiles.set(profileId, profile)
  }

  /**
   * 获取浏览器 Profile
   */
  getBrowserProfile(profileId: string): any {
    return this.browserProfiles.get(profileId)
  }

  /**
   * 暂停 Worker
   */
  pauseWorker(workerId: string): void {
    const worker = this.findWorker(workerId)
    if (worker) {
      worker.pause()
    }
  }

  /**
   * 恢复 Worker
   */
  resumeWorker(workerId: string): void {
    const worker = this.findWorker(workerId)
    if (worker) {
      worker.resume()
    }
  }

  /**
   * 查找 Worker
   */
  private findWorker(workerId: string): OperationWorker | CollectionWorker | undefined {
    return [
      ...this.operationWorkers,
      ...this.collectionWorkers
    ].find(w => w.id === workerId)
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    console.log(`[WorkerPool] 清理资源...`)

    for (const worker of this.operationWorkers) {
      await worker.cleanup()
    }

    for (const worker of this.collectionWorkers) {
      await worker.cleanup()
    }

    this.browserProfiles.clear()
    this.taskQueue.clear()
    this.executingTasks.clear()

    console.log(`[WorkerPool] 资源清理完成`)
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.cleanup()
    this.removeAllListeners()
  }

  // ===== MCP 结构化工具实现 =====

  /**
   * 上架商品
   */
  async listProducts(browser: any, input: {
    platform: string
    products: Array<{
      title: string
      price: number
      description?: string
      images?: string[]
      category?: string
      stock?: number
    }>
    profile_id?: string
  }): Promise<{ listed: number; failed: number; details: any[] }> {
    console.log(`[WorkerPool] 上架商品到 ${input.platform}: ${input.products.length} 个`)

    const worker = this.getAvailableOperationWorker(input.platform as Platform)
    if (!worker) {
      throw new Error('没有可用的运营 Worker')
    }

    const results: any[] = []
    let listed = 0
    let failed = 0

    for (const product of input.products) {
      try {
        const task: Task = {
          id: uuidv4(),
          type: 'operation',
          action: 'product-listing',
          subtype: 'product-listing',
          target: { platform: input.platform as Platform, profileId: input.profile_id },
          params: { product },
          status: 'pending',
          progress: 0,
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now()
        }

        const result = await worker.execute(task)
        results.push({ product: product.title, success: true, result })
        listed++
      } catch (error) {
        results.push({ 
          product: product.title, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        })
        failed++
      }
    }

    return { listed, failed, details: results }
  }

  /**
   * 采集内容
   */
  async collectContent(browser: any, input: {
    source: string
    keywords: string[]
    count: number
    content_type?: string
  }): Promise<{ id: string; collected: number; items: any[] }> {
    console.log(`[WorkerPool] 采集内容 from ${input.source}: ${(input.keywords || []).join(', ')}`)

    const collectionId = uuidv4()
    const worker = this.getAvailableCollectionWorker()
    if (!worker) {
      throw new Error('没有可用的采集 Worker')
    }

    const items: any[] = []

    for (const keyword of input.keywords) {
      try {
        const task: Task = {
          id: uuidv4(),
          type: 'collection',
          action: 'content-collection',
          subtype: 'content-collection',
          target: { source: input.source, keyword },
          params: { count: input.count, contentType: input.content_type },
          status: 'pending',
          progress: 0,
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now()
        }

        const result = await worker.execute(task)
        items.push(...((result as TaskResult)?.data?.items || []))
      } catch (error) {
        console.error(`[WorkerPool] 采集 ${keyword} 失败:`, error)
      }
    }

    return { id: collectionId, collected: items.length, items }
  }

  /**
   * 更新库存
   */
  async updateInventory(browser: any, input: {
    platform: string
    items: Array<{ product_id: string; stock?: number; price?: number }>
    profile_id?: string
  }): Promise<{ updated: number; failed: number }> {
    console.log(`[WorkerPool] 更新库存 ${input.platform}: ${input.items.length} 个商品`)

    const worker = this.getAvailableOperationWorker(input.platform as Platform)
    if (!worker) {
      throw new Error('没有可用的运营 Worker')
    }

    let updated = 0
    let failed = 0

    for (const item of input.items) {
      try {
        const task: Task = {
          id: uuidv4(),
          type: 'operation',
          action: 'inventory-update',
          subtype: 'inventory-update',
          target: { platform: input.platform as Platform, profileId: input.profile_id },
          params: { productId: item.product_id, stock: item.stock, price: item.price },
          status: 'pending',
          progress: 0,
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now()
        }

        await worker.execute(task)
        updated++
      } catch (error) {
        failed++
      }
    }

    return { updated, failed }
  }

  /**
   * 列出订单
   */
  async listOrders(browser: any, platform: string): Promise<{ orders: any[]; total: number }> {
    console.log(`[WorkerPool] 获取订单列表 ${platform}`)

    const worker = this.getAvailableOperationWorker(platform as Platform)
    if (!worker) {
      throw new Error('没有可用的运营 Worker')
    }

    const task: Task = {
      id: uuidv4(),
      type: 'operation',
      action: 'order-management',
      subtype: 'order-management',
      target: { platform: platform as Platform },
      params: { action: 'list' },
      status: 'pending',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now()
    }

    const result = await worker.execute(task)
    return { orders: (result as TaskResult)?.data?.orders || [], total: (result as TaskResult)?.data?.total || 0 }
  }

  /**
   * 批量发货
   */
  async batchShip(browser: any, platform: string, orderIds: string[]): Promise<{ shipped: number; failed: number }> {
    console.log(`[WorkerPool] 批量发货 ${platform}: ${orderIds.length} 个订单`)

    const worker = this.getAvailableOperationWorker(platform as Platform)
    if (!worker) {
      throw new Error('没有可用的运营 Worker')
    }

    let shipped = 0
    let failed = 0

    for (const orderId of orderIds) {
      try {
        const task: Task = {
          id: uuidv4(),
          type: 'operation',
          action: 'order-management',
          subtype: 'order-management',
          target: { platform: platform as Platform },
          params: { action: 'ship', orderId },
          status: 'pending',
          progress: 0,
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now()
        }

        await worker.execute(task)
        shipped++
      } catch (error) {
        failed++
      }
    }

    return { shipped, failed }
  }

  /**
   * 处理退款
   */
  async handleRefunds(browser: any, platform: string, orderIds: string[]): Promise<{ processed: number; failed: number }> {
    console.log(`[WorkerPool] 处理退款 ${platform}: ${orderIds.length} 个订单`)

    const worker = this.getAvailableOperationWorker(platform as Platform)
    if (!worker) {
      throw new Error('没有可用的运营 Worker')
    }

    let processed = 0
    let failed = 0

    for (const orderId of orderIds) {
      try {
        const task: Task = {
          id: uuidv4(),
          type: 'operation',
          action: 'order-management',
          subtype: 'order-management',
          target: { platform: platform as Platform },
          params: { action: 'refund', orderId },
          status: 'pending',
          progress: 0,
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now()
        }

        await worker.execute(task)
        processed++
      } catch (error) {
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(browser: any, platform: string): Promise<{ loggedIn: boolean; expiresAt?: string }> {
    console.log(`[WorkerPool] 检查登录状态 ${platform}`)

    const loginUrls: Record<string, string> = {
      pinduoduo: 'https://mms.pinduoduo.com',
      douyin: 'https://creator.douyin.com',
      taobao: 'https://sell.taobao.com',
      jd: 'https://passport.jd.com'
    }

    const url = loginUrls[platform]
    if (!url) {
      return { loggedIn: false }
    }

    try {
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
      
      const isLoggedIn = !page.url().includes('login')
      await page.close()
      
      return { 
        loggedIn: isLoggedIn,
        expiresAt: isLoggedIn ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
      }
    } catch (error) {
      return { loggedIn: false }
    }
  }

  /**
   * 打开登录页面
   */
  async openLoginPage(browser: any, platform: string): Promise<string> {
    console.log(`[WorkerPool] 打开登录页面 ${platform}`)

    const loginUrls: Record<string, string> = {
      pinduoduo: 'https://mms.pinduoduo.com',
      douyin: 'https://creator.douyin.com',
      taobao: 'https://sell.taobao.com',
      jd: 'https://passport.jd.com'
    }

    const url = loginUrls[platform]
    if (!url) {
      throw new Error(`不支持的平台: ${platform}`)
    }

    return url
  }
}
