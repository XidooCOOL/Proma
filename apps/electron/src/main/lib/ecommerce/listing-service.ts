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
import {
  getConfigManager,
  getEcommerceSettings,
  getPlatformSettings,
} from './config'
import {
  ecommerceLogger,
  getErrorHandler,
} from './error'
import {
  getProfilePath,
  getProfileCookiesPath,
  resolveImagePath,
  readJson,
} from './utils'
import {
  loadPlatformSelectors,
  getSelectorById,
} from './elements'

export class ProductListingService {
  private static instance: ProductListingService
  private activeTasks: Map<string, { cancelled: boolean }> = new Map()
  private progressCallbacks: Map<string, (progress: TaskProgress) => void> = new Map()

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

  async executeListing(task: ListingTask): Promise<ListingResult> {
    const taskId = task.id
    const logs: string[] = []
    const taskState = { cancelled: false }
    this.activeTasks.set(taskId, taskState)
    const errorHandler = getErrorHandler()

    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
      this.emitProgress({ taskId, type: 'progress', progress: 0, message: msg })
    }

    try {
      this.emitProgress({ taskId, type: 'start', progress: 0, message: '开始上架任务' })
      ecommerceLogger.info('ListingService', '开始执行上架', { taskId, profileId: task.profileId })

      const profile = getStoreProfileService().getById(task.profileId)
      if (!profile) {
        throw errorHandler.handleError(new Error('店铺不存在'), 'executeListing')
      }

      const settings = getEcommerceSettings()
      const platformSettings = getPlatformSettings(task.platform)

      addLog(`使用店铺: ${profile.name} (${task.platform})`)

      const profilePath = getProfilePath(task.profileId)
      const cookiesFile = getProfileCookiesPath(task.profileId)

      if (!readJson(cookiesFile, null)) {
        throw errorHandler.handleError(new Error('请先登录该店铺'), 'executeListing')
      }

      const platformSelectors = loadPlatformSelectors(task.platform)
      addLog('已加载选择器配置')

      this.emitProgress({ taskId, type: 'progress', progress: 10, message: '正在启动浏览器...' })

      const { chromium } = require('playwright')
      const browser = await chromium.launch({ headless: settings.headlessBrowser })
      const context = await browser.newContext({
        userDataDir: profilePath,
        viewport: settings.browserViewport,
      })
      const page = await context.newPage()

      addLog('浏览器已启动')

      const testUrl = platformSettings.testUrl
      addLog(`打开页面: ${testUrl}`)
      await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: settings.taskTimeout })
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
        const limitedImages = validImages.slice(0, platformSettings.upload.maxImages)
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
      const handled = errorHandler.handleError(error, 'executeListing')
      const errorMsg = 'message' in handled ? handled.message : String(error)
      addLog(`错误: ${errorMsg}`)

      this.emitProgress({ taskId, type: 'error', progress: 0, message: errorMsg, data: { error: errorMsg } })

      getListingRecordService().add({
        profileId: task.profileId,
        folderName: task.folderName,
        title: task.title,
        price: task.price,
        images: task.images,
        status: 'failed',
        uploadedAt: new Date().toISOString(),
        error: errorMsg,
      })

      ecommerceLogger.error('ListingService', '上架失败', error)
      return { success: false, error: errorMsg, logs }

    } finally {
      this.activeTasks.delete(taskId)
      this.progressCallbacks.delete(taskId)
    }
  }

  private getEnabledSelector(platformSelectors: any, selectorId: string): { selector: string; attributes?: string[] } | null {
    const config = platformSelectors.selectors?.[selectorId]
    if (!config?.enabled || !config?.selector) return null
    return { selector: config.selector, attributes: config.attributes }
  }

  async executeBatchListing(tasks: ListingTask[]): Promise<Map<string, ListingResult>> {
    const results = new Map<string, ListingResult>()
    ecommerceLogger.info('ListingService', `开始批量上架: ${tasks.length} 个任务`)

    for (const task of tasks) {
      const result = await this.executeListing(task)
      results.set(task.id, result)
    }

    return results
  }
}

export function getProductListingService(): ProductListingService {
  return ProductListingService.getInstance()
}
