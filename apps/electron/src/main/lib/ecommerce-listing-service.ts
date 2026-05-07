import * as path from 'path'
import * as fs from 'fs'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import { getStoreProfileService, getListingRecordService, getTaskLogService } from './ecommerce-data-service'
import {
  loadPlatformSelectors,
  getSelectorById,
  DEFAULT_TEST_URLS,
  type PlatformSelectors,
  type SelectorConfig,
  type SelectorDefinition,
} from './ecommerce-elements'

const ECOMMERCE_DIR = path.join(app.getPath('userData'), 'ecommerce')
const PROFILES_DIR = path.join(ECOMMERCE_DIR, 'profiles')

export interface ListingTask {
  id: string
  profileId: string
  platform: string
  folderPath: string
  folderName: string
  title: string
  price: number
  description?: string
  images: string[]
  skus?: Array<{ code: string; stock: number; color?: string; size?: string }>
}

export interface ListingResult {
  success: boolean
  productId?: string
  productUrl?: string
  error?: string
  logs: string[]
}

export interface TaskProgress {
  taskId: string
  type: 'start' | 'progress' | 'complete' | 'error' | 'item_complete' | 'item_error'
  progress: number
  message: string
  data?: any
}

type ProgressCallback = (progress: TaskProgress) => void

const DEFAULT_PRODUCT_LIST_URLS: Record<string, string> = {
  pinduoduo: 'https://mms.pinduoduo.com/goods/goodsdetail',
  douyin: 'https://creator.douyin.com/product/list',
  taobao: 'https://upload.taobao.com/商品编辑',
  jd: 'https://seller.jd.com/商品管理',
  kuaishou: 'https://cp.kwaixiandian.com/goods/list',
}

export class ProductListingService {
  private static instance: ProductListingService
  private activeTasks: Map<string, { cancelled: boolean }> = new Map()
  private progressCallbacks: Map<string, ProgressCallback> = new Map()

  static getInstance(): ProductListingService {
    if (!ProductListingService.instance) {
      ProductListingService.instance = new ProductListingService()
    }
    return ProductListingService.instance
  }

  onProgress(taskId: string, callback: ProgressCallback): void {
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
    }
  }

  async executeListing(task: ListingTask): Promise<ListingResult> {
    const taskId = task.id || randomUUID()
    const logs: string[] = []
    const taskState = { cancelled: false }
    this.activeTasks.set(taskId, taskState)

    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
      this.emitProgress({
        taskId,
        type: 'progress',
        progress: 0,
        message: msg,
      })
    }

    try {
      this.emitProgress({ taskId, type: 'start', progress: 0, message: '开始上架任务' })

      const profile = getStoreProfileService().getById(task.profileId)
      if (!profile) {
        throw new Error(`店铺不存在: ${task.profileId}`)
      }

      addLog(`使用店铺: ${profile.name} (${task.platform})`)

      const profilePath = path.join(PROFILES_DIR, task.profileId)
      const cookiesFile = path.join(profilePath, 'cookies.json')

      if (!fs.existsSync(cookiesFile)) {
        throw new Error('请先登录该店铺')
      }

      const platformSelectors = loadPlatformSelectors(task.platform)
      addLog('已加载选择器配置')

      this.emitProgress({ taskId, type: 'progress', progress: 10, message: '正在启动浏览器...' })

      const { chromium } = require('playwright')
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        userDataDir: profilePath,
        viewport: { width: 1280, height: 720 },
      })
      const page = await context.newPage()

      addLog('浏览器已启动')

      const productListUrl = DEFAULT_PRODUCT_LIST_URLS[task.platform] || DEFAULT_TEST_URLS[task.platform]
      addLog(`打开页面: ${productListUrl}`)

      await page.goto(productListUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      this.emitProgress({ taskId, type: 'progress', progress: 20, message: '页面已加载' })

      const inputTitleSelector = this.getEnabledSelector(platformSelectors, 'input_title')
      const inputPriceSelector = this.getEnabledSelector(platformSelectors, 'input_price')
      const inputDescriptionSelector = this.getEnabledSelector(platformSelectors, 'input_description')
      const uploadMainImageSelector = this.getEnabledSelector(platformSelectors, 'upload_main_image')
      const uploadImagesSelector = this.getEnabledSelector(platformSelectors, 'upload_images')
      const btnSubmitSelector = this.getEnabledSelector(platformSelectors, 'btn_submit')

      if (!inputTitleSelector) {
        addLog('警告: 未配置标题输入框选择器')
      }
      if (!inputPriceSelector) {
        addLog('警告: 未配置价格输入框选择器')
      }
      if (!btnSubmitSelector) {
        addLog('警告: 未配置提交按钮选择器')
      }

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

      if (uploadImagesSelector && task.images.length > 0) {
        this.emitProgress({ taskId, type: 'progress', progress: 60, message: '上传图片...' })
        addLog(`上传 ${task.images.length} 张图片`)
        const fileInput = page.locator(uploadImagesSelector.selector).locator('input[type="file"]').first()
        const imagePaths = task.images.map(img => path.resolve(img)).filter(p => fs.existsSync(p))
        if (imagePaths.length > 0) {
          await fileInput.setInputFiles(imagePaths)
          await page.waitForTimeout(3000)
        }
      } else if (uploadMainImageSelector && task.images.length > 0) {
        this.emitProgress({ taskId, type: 'progress', progress: 60, message: '上传主图...' })
        addLog(`上传主图`)
        const fileInput = page.locator(uploadMainImageSelector.selector).locator('input[type="file"]').first()
        const mainImage = path.resolve(task.images[0])
        if (fs.existsSync(mainImage)) {
          await fileInput.setInputFiles(mainImage)
          await page.waitForTimeout(2000)
        }
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
        if (productUrl) {
          addLog(`提取到商品链接: ${productUrl}`)
        }
      }

      await browser.close()
      addLog('浏览器已关闭')

      const result: ListingResult = {
        success: true,
        productId,
        productUrl,
        logs,
      }

      this.emitProgress({ taskId, type: 'complete', progress: 100, message: '上架完成', data: result })

      getStoreProfileService().updateStats(task.profileId, {
        totalProducts: (profile.stats.totalProducts || 0) + 1,
        lastUploadAt: new Date().toISOString(),
      })

      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      addLog(`错误: ${errorMsg}`)

      this.emitProgress({ taskId, type: 'error', progress: 0, message: errorMsg, data: { error: errorMsg } })

      return {
        success: false,
        error: errorMsg,
        logs,
      }

    } finally {
      this.activeTasks.delete(taskId)
      this.progressCallbacks.delete(taskId)
    }
  }

  private getEnabledSelector(platformSelectors: PlatformSelectors, selectorId: string): (SelectorConfig & { definition?: SelectorDefinition }) | null {
    const config = platformSelectors.selectors[selectorId]
    if (!config || !config.enabled || !config.selector) {
      return null
    }
    const definition = getSelectorById(selectorId)
    return { ...config, definition }
  }

  async executeBatchListing(tasks: ListingTask[], onTaskProgress?: (taskId: string, progress: TaskProgress) => void): Promise<Map<string, ListingResult>> {
    const results = new Map<string, ListingResult>()
    const total = tasks.length

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]

      if (onTaskProgress) {
        this.onProgress(task.id, (progress) => onTaskProgress(task.id, progress))
      }

      const result = await this.executeListing(task)
      results.set(task.id, result)

      const log = getTaskLogService().add({
        type: 'listing',
        profileId: task.profileId,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        items: { total: 1, success: result.success ? 1 : 0, failed: result.success ? 0 : 1 },
        error: result.error,
      })

      getListingRecordService().add({
        profileId: task.profileId,
        folderName: task.folderName,
        title: task.title,
        price: task.price,
        images: task.images,
        status: result.success ? 'success' : 'failed',
        uploadedAt: new Date().toISOString(),
        productUrl: result.productUrl,
        productId: result.productId,
        error: result.error,
      })

      if (onTaskProgress) {
        this.offProgress(task.id)
      }
    }

    return results
  }
}

export function getProductListingService(): ProductListingService {
  return ProductListingService.getInstance()
}
