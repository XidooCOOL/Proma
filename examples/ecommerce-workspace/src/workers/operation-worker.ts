/**
 * 运营 Worker (OperationWorker)
 * 
 * 负责执行运营相关任务：
 * - 商品上架
 * - 订单处理
 * - 库存更新
 */

import EventEmitter from 'events'
import {
  Task,
  TaskResult,
  WorkerConfig,
  WorkerStatus,
  Platform,
  Product,
} from '../../types'
import { BrowserPool } from '../browser-pool'

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

  /**
   * 执行任务
   */
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
   * 执行商品上架
   */
  private async executeProductListing(task: Task): Promise<TaskResult> {
    const { platform } = task.target
    const product = task.params.product as Product

    console.log(`[OperationWorker:${this.id}] 商品上架: ${product.title} -> ${platform}`)

    const startTime = Date.now()

    try {
      // 1. 获取浏览器实例
      const browser = await this.browserPool.acquireBrowser(
        `${this.id}-${platform}`,
        platform
      )

      // 2. 打开发布页面
      const listingUrl = this.getListingUrl(platform)
      await browser.navigate(listingUrl)

      task.progress = 20
      this.emit('task-progress', { taskId: task.id, progress: 20, message: '打开发布页面' })

      // 3. 填写商品标题
      await browser.fill(this.getFieldSelector(platform, 'title'), product.title)

      task.progress = 30
      this.emit('task-progress', { taskId: task.id, progress: 30, message: '填写商品标题' })

      // 4. 填写价格
      await browser.fill(this.getFieldSelector(platform, 'price'), product.price.toString())

      task.progress = 40
      this.emit('task-progress', { taskId: task.id, progress: 40, message: '填写价格' })

      // 5. 填写库存
      await browser.fill(this.getFieldSelector(platform, 'stock'), product.stock.toString())

      task.progress = 50
      this.emit('task-progress', { taskId: task.id, progress: 50, message: '填写库存' })

      // 6. 上传图片
      if (product.images && product.images.length > 0) {
        await browser.upload(
          this.getFieldSelector(platform, 'image'),
          product.images[0]
        )
      }

      task.progress = 70
      this.emit('task-progress', { taskId: task.id, progress: 70, message: '上传图片' })

      // 7. 填写商品描述
      if (product.description) {
        await browser.fill(
          this.getFieldSelector(platform, 'description'),
          product.description
        )
      }

      task.progress = 80
      this.emit('task-progress', { taskId: task.id, progress: 80, message: '填写商品描述' })

      // 8. 提交发布
      await browser.click(this.getSubmitSelector(platform))

      task.progress = 90
      this.emit('task-progress', { taskId: task.id, progress: 90, message: '提交发布' })

      // 9. 等待完成
      await browser.waitForSelector(this.getSuccessSelector(platform))

      const duration = Date.now() - startTime

      return {
        success: true,
        message: '商品上架成功',
        data: {
          platform,
          productId: `MOCK-${Date.now()}`,
          title: product.title,
          price: product.price
        },
        timestamp: Date.now(),
        duration
      }
    } catch (error) {
      throw error
    } finally {
      // 释放浏览器
      await this.browserPool.releaseBrowser(`${this.id}-${platform}`)
    }
  }

  /**
   * 执行订单管理
   */
  private async executeOrderManagement(task: Task): Promise<TaskResult> {
    const { platform } = task.target

    console.log(`[OperationWorker:${this.id}] 订单管理: ${platform}`)

    const startTime = Date.now()

    try {
      const browser = await this.browserPool.acquireBrowser(
        `${this.id}-${platform}`,
        platform
      )

      const orderUrl = this.getOrderUrl(platform)
      await browser.navigate(orderUrl)

      task.progress = 50
      this.emit('task-progress', { taskId: task.id, progress: 50, message: '获取订单列表' })

      // 模拟订单处理
      await new Promise(resolve => setTimeout(resolve, 1000))

      const duration = Date.now() - startTime

      return {
        success: true,
        message: '订单处理成功',
        data: {
          platform,
          processedOrders: 10,
          failedOrders: 0
        },
        timestamp: Date.now(),
        duration
      }
    } catch (error) {
      throw error
    } finally {
      await this.browserPool.releaseBrowser(`${this.id}-${platform}`)
    }
  }

  /**
   * 执行库存更新
   */
  private async executeInventoryUpdate(task: Task): Promise<TaskResult> {
    const { platform } = task.target
    const product = task.params.product as Product

    console.log(`[OperationWorker:${this.id}] 库存更新: ${product.title} -> ${platform}`)

    const startTime = Date.now()

    const duration = Date.now() - startTime

    return {
      success: true,
      message: '库存更新成功',
      data: {
        platform,
        productId: product.id,
        newStock: product.stock
      },
      timestamp: Date.now(),
      duration
    }
  }

  /**
   * 获取平台发布 URL
   */
  private getListingUrl(platform: Platform): string {
    const urls: Record<Platform, string> = {
      pinduoduo: 'https://mms.pinduoduo.com/goods/add',
      douyin: 'https://partner.douyin.com/goods/add',
      taobao: 'https://upload.taobao.com/auction/publish',
      jd: 'https://seller.jd.com/product/add',
      xiaohongshu: 'https://creator.xiaohongshu.com'
    }
    return urls[platform]
  }

  /**
   * 获取平台订单 URL
   */
  private getOrderUrl(platform: Platform): string {
    const urls: Record<Platform, string> = {
      pinduoduo: 'https://mms.pinduoduo.com/order/list',
      douyin: 'https://partner.douyin.com/order/list',
      taobao: 'https://trade.taobao.com/trade/itemlist/list_bought_items.htm',
      jd: 'https://order.jd.com/center/list.shtml',
      xiaohongshu: 'https://creator.xiaohongshu.com'
    }
    return urls[platform]
  }

  /**
   * 获取字段选择器
   */
  private getFieldSelector(platform: Platform, field: string): string {
    const selectors: Record<Platform, Record<string, string>> = {
      pinduoduo: {
        title: 'input[name="goods_name"]',
        price: 'input[name="price"]',
        stock: 'input[name="stock"]',
        image: 'input[type="file"]',
        description: 'textarea[name="description"]'
      },
      douyin: {
        title: 'input[placeholder*="商品名称"]',
        price: 'input[placeholder*="价格"]',
        stock: 'input[placeholder*="库存"]',
        image: 'input[type="file"]',
        description: 'textarea[name="desc"]'
      },
      taobao: {
        title: 'input#item_title',
        price: 'input#price',
        stock: 'input#qty',
        image: 'input[type="file"]',
        description: 'textarea#description'
      },
      jd: {
        title: 'input[placeholder="商品名称"]',
        price: 'input[placeholder="商品价格"]',
        stock: 'input[placeholder="商品库存"]',
        image: 'input[type="file"]',
        description: 'textarea[name="description"]'
      },
      xiaohongshu: {}
    }

    return selectors[platform]?.[field] || ''
  }

  /**
   * 获取提交按钮选择器
   */
  private getSubmitSelector(platform: Platform): string {
    const selectors: Record<Platform, string> = {
      pinduoduo: 'button:has-text("发布")',
      douyin: 'button:has-text("提交")',
      taobao: 'button:has-text("发布")',
      jd: 'button:has-text("提交审核")',
      xiaohongshu: ''
    }
    return selectors[platform]
  }

  /**
   * 获取成功选择器
   */
  private getSuccessSelector(platform: Platform): string {
    const selectors: Record<Platform, string> = {
      pinduoduo: '.success-message, .publish-success',
      douyin: '.success-tip, [class*="success"]',
      taobao: '.success-msg, .confirm-btn',
      jd: '.success-content, .success-tips',
      xiaohongshu: ''
    }
    return selectors[platform]
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
