/**
 * 浏览器池管理器 (BrowserPool)
 * 
 * 负责管理多个浏览器实例
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { Platform, BrowserInstance } from '../types'

export class BrowserPool {
  private browsers: Map<string, BrowserInstance> = new Map()
  private maxInstances: number = 10
  private defaultProfilePath: string = '~/.proma/browser-profiles'

  constructor(maxInstances: number = 10) {
    this.maxInstances = maxInstances
  }

  /**
   * 获取浏览器实例
   */
  async acquireBrowser(instanceId: string, platform: Platform): Promise<BrowserInstance> {
    console.log(`[BrowserPool] 获取浏览器实例: ${instanceId}`)

    // 检查是否已有实例
    if (this.browsers.has(instanceId)) {
      const existing = this.browsers.get(instanceId)!
      if (existing.status === 'ready') {
        console.log(`[BrowserPool] 复用已有实例: ${instanceId}`)
        return existing
      }
    }

    // 检查是否达到最大实例数
    if (this.browsers.size >= this.maxInstances) {
      console.log(`[BrowserPool] 达到最大实例数，关闭最久未使用的实例`)
      await this.releaseOldestBrowser()
    }

    // 创建新实例
    const instance = await this.createBrowser(instanceId, platform)
    this.browsers.set(instanceId, instance)

    console.log(`[BrowserPool] 浏览器实例创建成功: ${instanceId}`)
    return instance
  }

  /**
   * 创建浏览器实例
   */
  private async createBrowser(instanceId: string, platform: Platform): Promise<BrowserInstance> {
    const profilePath = `${this.defaultProfilePath}/${platform}-${instanceId}`

    const instance: BrowserInstance = {
      id: instanceId,
      profile: {
        id: instanceId,
        platform,
        storeName: `store-${platform}`,
        profilePath,
        status: 'in-use',
        lastUsedAt: Date.now()
      },
      status: 'launching'
    }

    try {
      // 启动浏览器
      const browser = await chromium.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox'
        ]
      })

      // 创建上下文
      const context = await browser.newContext({
        userDataDir: profilePath,
        viewport: { width: 1280, height: 720 }
      })

      // 创建页面
      const page = await context.newPage()

      instance.browser = browser
      instance.context = context
      instance.page = page
      instance.status = 'ready'

      console.log(`[BrowserPool] 浏览器启动成功: ${instanceId}`)
      return instance
    } catch (error) {
      instance.status = 'error'
      console.error(`[BrowserPool] 浏览器启动失败: ${instanceId}`, error)
      throw error
    }
  }

  /**
   * 释放浏览器实例
   */
  async releaseBrowser(instanceId: string): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance) {
      console.warn(`[BrowserPool] 尝试释放不存在的实例: ${instanceId}`)
      return
    }

    console.log(`[BrowserPool] 释放浏览器实例: ${instanceId}`)

    try {
      if (instance.page) {
        await instance.page.close()
      }
      if (instance.context) {
        await instance.context.close()
      }
      if (instance.browser) {
        await instance.browser.close()
      }

      instance.status = 'closed'
      this.browsers.delete(instanceId)
    } catch (error) {
      console.error(`[BrowserPool] 释放浏览器失败: ${instanceId}`, error)
      throw error
    }
  }

  /**
   * 关闭最久未使用的浏览器
   */
  private async releaseOldestBrowser(): Promise<void> {
    let oldest: BrowserInstance | null = null
    let oldestTime = Date.now()

    for (const instance of this.browsers.values()) {
      if (instance.profile.lastUsedAt && instance.profile.lastUsedAt < oldestTime) {
        oldest = instance
        oldestTime = instance.profile.lastUsedAt
      }
    }

    if (oldest) {
      await this.releaseBrowser(oldest.id)
    }
  }

  /**
   * 导航到 URL
   */
  async navigate(instanceId: string, url: string): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    console.log(`[BrowserPool] 导航: ${instanceId} -> ${url}`)
    await instance.page.goto(url, { waitUntil: 'networkidle' })
    instance.profile.lastUsedAt = Date.now()
    instance.currentUrl = url
  }

  /**
   * 填充表单
   */
  async fill(instanceId: string, selector: string, value: string): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    console.log(`[BrowserPool] 填充表单: ${instanceId} - ${selector} = ${value}`)
    await instance.page.fill(selector, value)
    instance.profile.lastUsedAt = Date.now()
  }

  /**
   * 点击元素
   */
  async click(instanceId: string, selector: string): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    console.log(`[BrowserPool] 点击: ${instanceId} - ${selector}`)
    await instance.page.click(selector)
    instance.profile.lastUsedAt = Date.now()
  }

  /**
   * 等待元素出现
   */
  async waitForSelector(instanceId: string, selector: string, timeout: number = 30000): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    console.log(`[BrowserPool] 等待元素: ${instanceId} - ${selector}`)
    await instance.page.waitForSelector(selector, { timeout })
    instance.profile.lastUsedAt = Date.now()
  }

  /**
   * 上传文件
   */
  async upload(instanceId: string, selector: string, filePath: string): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    console.log(`[BrowserPool] 上传文件: ${instanceId} - ${selector} <- ${filePath}`)
    const fileChooserPromise = instance.page.waitForEvent('filechooser')
    await instance.page.click(selector)
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
    instance.profile.lastUsedAt = Date.now()
  }

  /**
   * 截图
   */
  async screenshot(instanceId: string, path?: string): Promise<Buffer> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    const screenshot = await instance.page.screenshot({ path, fullPage: true })
    instance.profile.lastUsedAt = Date.now()
    return screenshot
  }

  /**
   * 执行 JavaScript
   */
  async evaluate<T>(instanceId: string, script: string | Function): Promise<T> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    const result = await instance.page.evaluate(script)
    instance.profile.lastUsedAt = Date.now()
    return result as T
  }

  /**
   * 滚动页面
   */
  async scroll(instanceId: string, deltaY: number = 500): Promise<void> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    await instance.page.mouse.wheel(0, deltaY)
    await instance.page.waitForTimeout(500)
    instance.profile.lastUsedAt = Date.now()
  }

  /**
   * 获取当前 URL
   */
  async getCurrentUrl(instanceId: string): Promise<string> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    return instance.page.url()
  }

  /**
   * 获取页面内容
   */
  async getContent(instanceId: string): Promise<string> {
    const instance = this.browsers.get(instanceId)
    if (!instance || !instance.page) {
      throw new Error(`浏览器实例不存在: ${instanceId}`)
    }

    return instance.page.content()
  }

  /**
   * 清理所有浏览器实例
   */
  async cleanup(): Promise<void> {
    console.log(`[BrowserPool] 清理所有浏览器实例...`)

    for (const instanceId of this.browsers.keys()) {
      await this.releaseBrowser(instanceId)
    }

    console.log(`[BrowserPool] 清理完成`)
  }

  /**
   * 获取实例状态
   */
  getStatus(): any {
    const instances: any[] = []
    
    for (const [id, instance] of this.browsers.entries()) {
      instances.push({
        id,
        platform: instance.profile.platform,
        status: instance.status,
        currentUrl: instance.currentUrl,
        lastUsedAt: instance.profile.lastUsedAt
      })
    }

    return {
      totalInstances: this.browsers.size,
      maxInstances: this.maxInstances,
      instances
    }
  }
}
