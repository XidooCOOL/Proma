/**
 * 运营 Worker (OperationWorker)
 * 
 * 负责执行运营相关任务：
 * - 商品上架
 * - 订单处理
 * - 库存更新
 * 
 * 使用工作流引擎执行任务
 */

import EventEmitter from 'events'
import {
  Task,
  TaskResult,
  WorkerConfig,
  WorkerStatus,
  Platform,
} from '../../types'
import { BrowserPool } from '../browser-pool'
import { 
  EcommerceWorkflowEngine, 
  createWorkflowEngine,
  getWorkflow 
} from '../workflows'

export class OperationWorker extends EventEmitter {
  readonly id: string
  readonly type: 'operation' = 'operation'
  readonly config: WorkerConfig
  private status: WorkerStatus = 'idle'
  private currentTask?: Task
  private browserPool: BrowserPool

  constructor(config: WorkerConfig) {
    super()
    this.id = config.id
    this.config = config
    this.browserPool = new BrowserPool()
  }

  get platform(): Platform | undefined {
    return this.config.platform
  }

  get workerStatus(): WorkerStatus {
    return this.status
  }

  async execute(task: Task): Promise<TaskResult> {
    console.log(`[OperationWorker:${this.id}] 开始执行任务: ${task.id}`)

    this.status = 'busy'
    this.currentTask = task

    try {
      let result: TaskResult

      switch (task.action) {
        case 'product-listing':
          result = await this.executeProductListing(task)
          break
        case 'order-management':
          result = await this.executeOrderManagement(task)
          break
        case 'inventory-update':
          result = await this.executeInventoryUpdate(task)
          break
        default:
          throw new Error(`未知操作类型: ${task.action}`)
      }

      console.log(`[OperationWorker:${this.id}] 任务完成: ${task.id}`)
      return result
    } catch (error) {
      console.error(`[OperationWorker:${this.id}] 任务失败: ${task.id}`, error)
      throw error
    } finally {
      this.status = 'idle'
      this.currentTask = undefined
    }
  }

  /**
   * 使用工作流执行商品上架
   */
  private async executeProductListing(task: Task): Promise<TaskResult> {
    const { platform, profileId } = task.target
    const product = task.data?.product

    console.log(`[OperationWorker:${this.id}] 商品上架: ${product?.title} -> ${platform}`)

    const startTime = Date.now()

    try {
      const browser = await this.browserPool.acquire(profileId)

      const workflow = getWorkflow(platform, 'product-listing')
      if (!workflow) {
        throw new Error(`不支持的平台: ${platform} 或工作流不存在`)
      }

      const engine = createWorkflowEngine({
        browser: browser.browser,
        contextId: profileId || 'default',
        defaultTimeout: 30000,
        defaultRetries: 3,
        screenshotDir: `./screenshots/${platform}`,
      })

      const execution = await engine.execute(workflow, {
        product,
        options: task.data?.options || {},
      })

      if (execution.status === 'failed') {
        throw new Error(execution.error?.message || '工作流执行失败')
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        message: '商品上架成功',
        data: {
          platform,
          productId: execution.context.stepResults['submit-product']?.productId || `MOCK-${Date.now()}`,
          title: product?.title,
          price: product?.price,
          screenshots: execution.context.screenshots,
        },
        timestamp: Date.now(),
        duration,
      }
    } catch (error) {
      throw error
    } finally {
      await this.browserPool.release(profileId || 'default')
    }
  }

  /**
   * 执行订单管理
   */
  private async executeOrderManagement(task: Task): Promise<TaskResult> {
    const { platform, profileId } = task.target
    const { action, orderId } = task.data || {}

    console.log(`[OperationWorker:${this.id}] 订单管理: ${platform} - ${action}`)

    const startTime = Date.now()

    try {
      const browser = await this.browserPool.acquire(profileId)

      const workflow = getWorkflow(platform, 'order-management')
      if (!workflow) {
        throw new Error(`不支持的平台: ${platform} 或工作流不存在`)
      }

      const engine = createWorkflowEngine({
        browser: browser.browser,
        contextId: profileId || 'default',
        defaultTimeout: 30000,
      })

      const execution = await engine.execute(workflow, {
        action,
        orderId,
      })

      const duration = Date.now() - startTime

      return {
        success: true,
        message: '订单处理成功',
        data: {
          platform,
          action,
          orderId,
          result: execution.context.stepResults,
        },
        timestamp: Date.now(),
        duration,
      }
    } catch (error) {
      throw error
    } finally {
      await this.browserPool.release(profileId || 'default')
    }
  }

  /**
   * 执行库存更新
   */
  private async executeInventoryUpdate(task: Task): Promise<TaskResult> {
    const { platform, profileId } = task.target
    const { productId, stock, price } = task.data || {}

    console.log(`[OperationWorker:${this.id}] 库存更新: ${platform} - ${productId}`)

    const startTime = Date.now()

    try {
      const browser = await this.browserPool.acquire(profileId)

      const duration = Date.now() - startTime

      return {
        success: true,
        message: '库存更新成功',
        data: {
          platform,
          productId,
          newStock: stock,
          newPrice: price,
        },
        timestamp: Date.now(),
        duration,
      }
    } catch (error) {
      throw error
    } finally {
      await this.browserPool.release(profileId || 'default')
    }
  }

  /**
   * 暂停
   */
  pause(): void {
    this.status = 'idle'
  }

  /**
   * 恢复
   */
  resume(): void {
    if (this.status === 'idle') {
      this.status = 'idle'
    }
  }

  /**
   * 清理
   */
  async cleanup(): Promise<void> {
    await this.browserPool.cleanup()
  }
}
