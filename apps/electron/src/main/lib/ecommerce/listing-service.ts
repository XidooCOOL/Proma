import {
  type ListingTask,
  type ListingResult,
  type TaskProgress,
  type Platform,
} from './types'
import {
  getStoreProfileService,
  getListingRecordService,
} from './data-service'
import { DEFAULT_CONFIG } from './config'
import {
  ecommerceLogger,
} from './error'
import {
  getProfilePath,
  getProfileCookiesPath,
  resolveImagePath,
  readJson,
  PATHS,
  writeJson,
} from './utils'
import {
  loadPlatformSelectors,
  getSelectorById,
} from './elements'

export interface TaskExecutionState {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retry'
  attempts: number
  maxAttempts: number
  result?: ListingResult
  lastAttemptAt?: string
}

export interface BatchExecutionState {
  id: string
  startedAt: string
  finishedAt?: string
  status: 'running' | 'completed' | 'failed'
  totalTasks: number
  completedTasks: number
  failedTasks: number
  results: Map<string, TaskExecutionState>
  failedTaskIds: string[]
}

export class ProductListingService {
  private static instance: ProductListingService
  private activeTasks: Map<string, { cancelled: boolean }> = new Map()
  private progressCallbacks: Map<string, (progress: TaskProgress) => void> = new Map()
  private batchStates: Map<string, BatchExecutionState> = new Map()
  private concurrentBrowsers: Map<string, boolean> = new Map()
  private maxConcurrent = 2

  static getInstance(): ProductListingService {
    if (!ProductListingService.instance) {
      ProductListingService.instance = new ProductListingService()
    }
    return ProductListingService.instance
  }

  onProgress(taskId: string, callback: (progress: TaskProgress) => void): void {
    this.progressCallbacks.set(taskId, callback)
  }

  offProgress(taskId: string): void {
    this.progressCallbacks.delete(taskId)
  }

  private emitProgress(progress: TaskProgress): void {
    const callback = this.progressCallbacks.get(progress.taskId)
    if (callback) {
      callback(progress)
    }
  }

  cancelTask(taskId: string): void {
    const task = this.activeTasks.get(taskId)
    if (task) {
      task.cancelled = true
      ecommerceLogger.info('ListingService', `任务已取消: ${taskId}`)
    }
  }

  cancelBatch(batchId: string): void {
    const state = this.batchStates.get(batchId)
    if (state) {
      for (const [taskId, taskState] of state.results) {
        if (taskState.status === 'running' || taskState.status === 'pending') {
          this.cancelTask(taskId)
        }
      }
      state.status = 'failed'
      ecommerceLogger.info('ListingService', `批量任务已取消: ${batchId}`)
    }
  }

  getBatchState(batchId: string): BatchExecutionState | undefined {
    return this.batchStates.get(batchId)
  }

  async executeListing(task: ListingTask, options?: { retry?: boolean; maxAttempts?: number }): Promise<ListingResult> {
    const taskId = task.id
    const logs: string[] = []
    const taskState = { cancelled: false }
    this.activeTasks.set(taskId, taskState)
    const maxAttempts = options?.maxAttempts || DEFAULT_CONFIG.maxRetries

    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
      this.emitProgress({ taskId, type: 'progress', progress: 0, message: msg })
    }

    const attemptExecute = async (attempt: number): Promise<ListingResult> => {
      if (taskState.cancelled) {
        throw new Error('任务已取消')
      }

      try {
        this.emitProgress({ taskId, type: 'start', progress: 0, message: `第 ${attempt} 次尝试...` })
        ecommerceLogger.info('ListingService', `开始执行上架 (尝试 ${attempt}/${maxAttempts})`, { taskId, profileId: task.profileId })

        const profile = getStoreProfileService().getById(task.profileId)
        if (!profile) {
          throw new Error('店铺不存在')
        }

        addLog(`使用店铺: ${profile.name} (${task.platform})`)

        const profilePath = getProfilePath(task.profileId)
        const cookiesFile = getProfileCookiesPath(task.profileId)

        if (!readJson(cookiesFile, null)) {
          throw new Error('请先登录该店铺')
        }

        const platformSelectors = loadPlatformSelectors(task.platform)
        addLog('已加载选择器配置')

        this.emitProgress({ taskId, type: 'progress', progress: 10, message: '正在启动浏览器...' })

        const { chromium } = require('playwright')
        const browser = await chromium.launch({ headless: DEFAULT_CONFIG.browserHeadless })
        const context = await browser.newContext({
          userDataDir: profilePath,
          viewport: { width: 1280, height: 720 },
        })
        const page = await context.newPage()

        addLog('浏览器已启动')

        const testUrls = {
          pinduoduo: 'https://mms.pinduoduo.com/goods/list',
          douyin: 'https://creator.douyin.com/product/list',
          taobao: 'https://upload.taobao.com/',
          jd: 'https://seller.jd.com/商品管理',
          kuaishou: 'https://cp.kwaixiandian.com/goods/list',
        }

        const testUrl = testUrls[task.platform as keyof typeof testUrls]
        addLog(`打开页面: ${testUrl}`)
        await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_CONFIG.timeout })
        await page.waitForTimeout(2000)

        this.emitProgress({ taskId, type: 'progress', progress: 20, message: '页面已加载' })

        const inputTitleSelector = this.getEnabledSelector(platformSelectors, 'input_title')
        const inputPriceSelector = this.getEnabledSelector(platformSelectors, 'input_price')
        const inputDescriptionSelector = this.getEnabledSelector(platformSelectors, 'input_description')
        const uploadMainImageSelector = this.getEnabledSelector(platformSelectors, 'upload_main_image')
        const uploadImagesSelector = this.getEnabledSelector(platformSelectors, 'upload_images')
        const btnSubmitSelector = this.getEnabledSelector(platformSelectors, 'btn_submit')

        if (!inputTitleSelector) addLog('警告: 未配置标题输入框选择器')
        if (!inputPriceSelector) addLog('警告: 未配置价格输入框选择器')
        if (!btnSubmitSelector) addLog('警告: 未配置提交按钮选择器')

        if (inputTitleSelector) {
          this.emitProgress({ taskId, type: 'progress', progress: 30, message: '填写商品标题...' })
          addLog(`填写标题: ${task.title}`)
          await page.locator(inputTitleSelector.selector).fill(task.title)
        }

        if (inputPriceSelector) {
          this.emitProgress({ taskId, type: 'progress', progress: 40, message: '填写价格...' })
          addLog(`填写价格: ¥${task.price}`)
          await page.locator(inputPriceSelector.selector).fill(String(task.price))
        }

        if (inputDescriptionSelector && task.description) {
          this.emitProgress({ taskId, type: 'progress', progress: 50, message: '填写描述...' })
          addLog('填写商品描述')
          await page.locator(inputDescriptionSelector.selector).fill(task.description)
        }

        const validImages = task.images
          .map(resolveImagePath)
          .filter((p): p is string => p !== null)

        if (uploadImagesSelector && validImages.length > 0) {
          this.emitProgress({ taskId, type: 'progress', progress: 60, message: '上传图片...' })
          addLog(`上传 ${validImages.length} 张图片`)
          const fileInput = page.locator(uploadImagesSelector.selector).locator('input[type="file"]').first()
          const limitedImages = validImages.slice(0, 9)
          await fileInput.setInputFiles(limitedImages)
          await page.waitForTimeout(3000)
        } else if (uploadMainImageSelector && validImages.length > 0) {
          this.emitProgress({ taskId, type: 'progress', progress: 60, message: '上传主图...' })
          addLog('上传主图')
          const fileInput = page.locator(uploadMainImageSelector.selector).locator('input[type="file"]').first()
          await fileInput.setInputFiles(validImages[0])
          await page.waitForTimeout(2000)
        }

        if (btnSubmitSelector) {
          this.emitProgress({ taskId, type: 'progress', progress: 80, message: '提交商品...' })
          addLog('点击提交按钮')
          await page.locator(btnSubmitSelector.selector).click()
          await page.waitForTimeout(3000)
        }

        this.emitProgress({ taskId, type: 'progress', progress: 90, message: '提取结果...' })
        addLog('等待上架结果...')

        let productId: string | undefined
        let productUrl: string | undefined

        const productIdSelector = this.getEnabledSelector(platformSelectors, 'product_id')
        const productUrlSelector = this.getEnabledSelector(platformSelectors, 'product_url')

        if (productIdSelector) {
          const attrs = productIdSelector.attributes || ['data-product-id', 'data-goods-id', 'id']
          for (const attr of attrs) {
            const val = await page.locator(productIdSelector.selector).first().getAttribute(attr).catch(() => null)
            if (val) {
              productId = val
              addLog(`提取到商品ID: ${productId}`)
              break
            }
          }
        }

        if (productUrlSelector) {
          productUrl = await page.locator(productUrlSelector.selector).first().getAttribute('href').catch(() => undefined)
          if (productUrl) addLog(`提取到商品链接: ${productUrl}`)
        }

        await browser.close()
        addLog('浏览器已关闭')

        const result: ListingResult = { success: true, productId, productUrl, logs }

        this.emitProgress({ taskId, type: 'complete', progress: 100, message: '上架完成', data: result })

        getStoreProfileService().updateStats(task.profileId, {
          totalProducts: (profile.stats.totalProducts || 0) + 1,
          lastUploadAt: new Date().toISOString(),
        })

        getListingRecordService().add({
          profileId: task.profileId,
          folderName: task.folderName,
          title: task.title,
          price: task.price,
          images: task.images,
          status: 'success',
          uploadedAt: new Date().toISOString(),
          productUrl,
          productId,
        })

        ecommerceLogger.info('ListingService', '上架完成', { taskId, productId })
        return result

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        addLog(`错误: ${errorMsg}`)
        throw { message: errorMsg, original: error }
      }
    }

    let lastError: string = ''
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await attemptExecute(attempt)
      } catch (err: any) {
        lastError = err.message || String(err)
        ecommerceLogger.warn('ListingService', `第 ${attempt} 次尝试失败`, { taskId, error: lastError })

        if (attempt < maxAttempts && !taskState.cancelled) {
          const delay = DEFAULT_CONFIG.retryDelay
          addLog(`${delay / 1000}秒后重试...`)
          await this.sleep(delay)
        }
      }
    }

    this.emitProgress({ taskId, type: 'error', progress: 0, message: `重试 ${maxAttempts} 次后失败`, data: { error: lastError } })

    getListingRecordService().add({
      profileId: task.profileId,
      folderName: task.folderName,
      title: task.title,
      price: task.price,
      images: task.images,
      status: 'failed',
      uploadedAt: new Date().toISOString(),
      error: lastError,
    })

    ecommerceLogger.error('ListingService', '上架失败', lastError)
    return { success: false, error: lastError, logs }

  }

  async executeBatchListing(
    tasks: ListingTask[],
    options?: {
      concurrent?: number
      retry?: boolean
      onProgress?: (batchId: string, state: BatchExecutionState) => void
    }
  ): Promise<BatchExecutionState> {
    const batchId = `batch-${Date.now()}`
    const concurrent = options?.concurrent || this.maxConcurrent

    const state: BatchExecutionState = {
      id: batchId,
      startedAt: new Date().toISOString(),
      status: 'running',
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      results: new Map(),
      failedTaskIds: [],
    }

    for (const task of tasks) {
      state.results.set(task.id, {
        taskId: task.id,
        status: 'pending',
        attempts: 0,
        maxAttempts: DEFAULT_CONFIG.maxRetries,
      })
    }

    this.batchStates.set(batchId, state)
    this.saveBatchState(state)

    ecommerceLogger.info('ListingService', `开始批量上架: ${tasks.length} 个任务, 并发数: ${concurrent}`)

    const executeTask = async (task: ListingTask): Promise<void> => {
      const taskState = state.results.get(task.id)!
      taskState.status = 'running'
      taskState.attempts++

      this.emitProgress({
        taskId: task.id,
        type: 'start',
        progress: 0,
        message: `开始执行 (${taskState.attempts}/${taskState.maxAttempts})`,
      })

      const result = await this.executeWithConcurrency(task)

      taskState.result = result
      taskState.lastAttemptAt = new Date().toISOString()

      if (result.success) {
        taskState.status = 'completed'
        state.completedTasks++
      } else {
        taskState.status = 'failed'
        state.failedTasks++
        state.failedTaskIds.push(task.id)
      }

      this.saveBatchState(state)
      options?.onProgress?.(batchId, state)
    }

    const executeWithConcurrency = async (task: ListingTask): Promise<ListingResult> => {
      const profileKey = `${task.platform}:${task.profileId}`

      while (this.concurrentBrowsers.get(profileKey)) {
        await this.sleep(100)
      }

      this.concurrentBrowsers.set(profileKey, true)
      try {
        return await this.executeListing(task, { retry: options?.retry })
      } finally {
        this.concurrentBrowsers.set(profileKey, false)
      }
    }

    const chunks: ListingTask[][] = []
    for (let i = 0; i < tasks.length; i += concurrent) {
      chunks.push(tasks.slice(i, i + concurrent))
    }

    for (const chunk of chunks) {
      if (state.status === 'failed') break
      await Promise.all(chunk.map(task => executeTask(task)))
    }

    state.finishedAt = new Date().toISOString()
    state.status = state.failedTasks === 0 ? 'completed' : 'completed'
    this.saveBatchState(state)

    ecommerceLogger.info('ListingService', `批量上架完成`, {
      batchId,
      total: state.totalTasks,
      success: state.completedTasks,
      failed: state.failedTasks,
    })

    return state
  }

  async retryFailed(batchId: string): Promise<BatchExecutionState | undefined> {
    const state = this.batchStates.get(batchId)
    if (!state) return undefined

    const failedTasks = state.failedTaskIds.map(id => {
      const taskState = state.results.get(id)
      return { id, taskState }
    }).filter(t => t.taskState)

    if (failedTasks.length === 0) return state

    const tasks: ListingTask[] = []
    for (const { id } of failedTasks) {
      const taskState = state.results.get(id)
      if (taskState && taskState.result && 'folderPath' in (taskState.result as any)) {
        tasks.push(taskState.result as unknown as ListingTask)
      }
    }

    if (tasks.length === 0) {
      ecommerceLogger.warn('ListingService', '无法获取失败任务详情，跳过重试')
      return state
    }

    state.status = 'running'
    state.failedTasks = 0
    state.failedTaskIds = []

    for (const task of tasks) {
      state.results.set(task.id, {
        taskId: task.id,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
      })
    }

    return this.executeBatchListing(tasks, {
      retry: true,
      onProgress: (_, s) => {
        state.completedTasks = s.completedTasks
        state.failedTasks = s.failedTasks
        state.failedTaskIds = s.failedTaskIds
        this.saveBatchState(state)
      },
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private saveBatchState(state: BatchExecutionState): void {
    const stateForSave = {
      ...state,
      results: Array.from(state.results.entries()),
    }
    writeJson(`${PATHS.logs}/batch-${state.id}.json`, stateForSave)
  }

  private getEnabledSelector(platformSelectors: any, selectorId: string): { selector: string; attributes?: string[] } | null {
    const config = platformSelectors.selectors?.[selectorId]
    if (!config?.enabled || !config?.selector) return null
    return { selector: config.selector, attributes: config.attributes }
  }
}

export function getProductListingService(): ProductListingService {
  return ProductListingService.getInstance()
}
