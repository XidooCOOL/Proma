/**
 * Selector 调试服务
 * 
 * 功能：
 * 1. 在真实页面上检测选择器
 * 2. 录制新选择器
 * 3. 检测页面改版后失效的选择器
 */

import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface SelectorTestResult {
  selector: string
  count: number
  valid: boolean
  elements: Array<{
    tag: string
    text: string
    visible: boolean
  }>
}

export interface SelectorRecord {
  id: string
  name: string
  selector: string
  type: string
  description: string
  required: boolean
  testedAt?: string
  valid?: boolean
  lastSelector?: string
}

export class SelectorDebugger {
  private browser: Browser | null = null
  private debugPort: number = 9222

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      })
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * 检测页面上的元素，验证现有选择器
   */
  async testSelectors(pageUrl: string, selectors: Record<string, any>): Promise<Record<string, SelectorTestResult>> {
    await this.initialize()
    
    const context = await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    
    const results: Record<string, SelectorTestResult> = {}
    
    try {
      console.log(`[SelectorDebugger] 打开页面: ${pageUrl}`)
      await page.goto(pageUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      
      await page.waitForTimeout(2000)

      for (const [name, selectorDef] of Object.entries(selectors)) {
        const selector = typeof selectorDef === 'string' ? selectorDef : selectorDef.selector
        
        try {
          const elements = await page.locator(selector).all()
          const count = elements.length
          
          const elementInfos: Array<{ tag: string; text: string; visible: boolean }> = []
          
          for (let i = 0; i < Math.min(count, 5); i++) {
            try {
              const el = elements[i]
              const tag = await el.evaluate((e: Element) => e.tagName.toLowerCase())
              const text = await el.textContent().catch(() => '')
              const visible = await el.isVisible()
              elementInfos.push({ tag, text: text?.slice(0, 100) || '', visible })
            } catch {
              // 忽略单个元素错误
            }
          }
          
          results[name] = {
            selector,
            count,
            valid: count > 0,
            elements: elementInfos,
          }
        } catch (error) {
          results[name] = {
            selector,
            count: 0,
            valid: false,
            elements: [],
          }
        }
      }
    } finally {
      await context.close()
    }
    
    return results
  }

  /**
   * 检测页面上的可用选择器
   */
  async detectAvailableSelectors(pageUrl: string): Promise<Array<{ selector: string; count: number }>> {
    await this.initialize()
    
    const context = await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    
    const detected: Array<{ selector: string; count: number }> = []
    
    try {
      console.log(`[SelectorDebugger] 检测页面选择器: ${pageUrl}`)
      await page.goto(pageUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      
      await page.waitForTimeout(2000)

      // 获取所有可交互元素
      const interactiveSelectors = [
        // 输入相关
        'input[type="text"]',
        'input[type="number"]',
        'input[type="password"]',
        'input[type="search"]',
        'textarea',
        'select',
        
        // 按钮相关
        'button',
        'a[href]',
        
        // 文件上传
        'input[type="file"]',
        
        // 复选框和单选框
        'input[type="checkbox"]',
        'input[type="radio"]',
      ]
      
      // 常用 CSS 选择器模式
      const commonPatterns = [
        // 通用元素
        '[placeholder]',
        '[class*="input"]',
        '[class*="btn"]',
        '[class*="button"]',
        '[class*="select"]',
        '[class*="search"]',
        
        // 表单元素
        '[class*="form"] input',
        '[class*="form"] button',
        '[class*="modal"] input',
        '[class*="modal"] button',
        
        // 特定功能
        '[class*="upload"]',
        '[class*="upload"] input[type="file"]',
        '[class*="submit"]',
        '[class*="confirm"]',
        '[class*="cancel"]',
        '[class*="close"]',
        '[class*="delete"]',
        '[class*="edit"]',
        
        // 商品相关
        '[class*="product"] input',
        '[class*="goods"] input',
        '[class*="title"]',
        '[class*="price"]',
        '[class*="stock"]',
        '[class*="image"]',
        '[class*="photo"]',
        
        // 表格相关
        'table th',
        'table td',
        'table button',
        '[class*="table"] input',
        
        // 分页
        '[class*="pagination"] button',
        '[class*="page"] button',
        '[class*="next"]',
        '[class*="prev"]',
        
        // 弹窗
        '[class*="dialog"]',
        '[class*="modal"]',
        '[class*="confirm"]',
      ]
      
      const allSelectors = [...interactiveSelectors, ...commonPatterns]
      
      for (const selector of allSelectors) {
        try {
          const count = await page.locator(selector).count()
          if (count > 0 && count < 100) {
            detected.push({ selector, count })
          }
        } catch {
          // 忽略无效选择器
        }
      }
      
      // 按数量排序
      detected.sort((a, b) => b.count - a.count)
      
    } finally {
      await context.close()
    }
    
    return detected
  }

  /**
   * 录制模式：监听页面交互并生成选择器
   */
  async recordSelectors(pageUrl: string): Promise<void> {
    await this.initialize()
    
    const context = await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    
    const recorded: Array<{
      action: string
      selector: string
      tag: string
      text: string
      timestamp: number
    }> = []
    
    try {
      console.log(`[SelectorDebugger] 录制模式: ${pageUrl}`)
      await page.goto(pageUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      
      // 监听点击事件
      page.on('click', async (data) => {
        try {
          const element = data.target()
          const tag = await element.evaluate((e: Element) => e.tagName.toLowerCase())
          const text = await element.textContent().catch(() => '')
          
          // 尝试生成多个可能的选择器
          const selectors = await this.generateSelectors(page, element)
          
          recorded.push({
            action: 'click',
            selector: selectors[0] || '',
            tag,
            text: text?.slice(0, 50) || '',
            timestamp: Date.now(),
          })
          
          console.log(`[录制] ${tag}: ${selectors[0] || '无法生成选择器'}`)
        } catch (error) {
          console.error('[录制] 点击录制失败:', error)
        }
      })
      
      // 监听输入事件
      page.on('input', async (data) => {
        try {
          const element = data.target()
          const tag = await element.evaluate((e: Element) => e.tagName.toLowerCase())
          const placeholder = await element.getAttribute('placeholder').catch(() => '')
          
          const selectors = await this.generateSelectors(page, element)
          
          recorded.push({
            action: 'input',
            selector: selectors[0] || '',
            tag,
            text: placeholder || '输入框',
            timestamp: Date.now(),
          })
        } catch (error) {
          console.error('[录制] 输入录制失败:', error)
        }
      })
      
      // 等待录制（最多 5 分钟）
      console.log('[录制] 开始录制，点击页面元素生成选择器...')
      await page.waitForTimeout(5 * 60 * 1000)
      
    } finally {
      await context.close()
    }
    
    return
  }

  /**
   * 为元素生成多个可能的选择器
   */
  private async generateSelectors(page: Page, element: any): Promise<string[]> {
    const selectors: string[] = []
    
    try {
      // 1. ID
      const id = await element.getAttribute('id')
      if (id) {
        selectors.push(`#${id}`)
      }
      
      // 2. data-testid
      const testId = await element.getAttribute('data-testid')
      if (testId) {
        selectors.push(`[data-testid="${testId}"]`)
      }
      
      // 3. data-* 属性
      const dataAttrs = await element.evaluate((el: Element) => {
        const attrs: string[] = []
        for (const attr of el.attributes) {
          if (attr.name.startsWith('data-')) {
            attrs.push(`[${attr.name}="${attr.value}"]`)
          }
        }
        return attrs
      })
      selectors.push(...dataAttrs.slice(0, 3))
      
      // 4. placeholder
      const placeholder = await element.getAttribute('placeholder')
      if (placeholder) {
        selectors.push(`[placeholder="${placeholder}"]`)
      }
      
      // 5. name 属性
      const name = await element.getAttribute('name')
      if (name) {
        selectors.push(`[name="${name}"]`)
      }
      
      // 6. class 选择器（简化版）
      const className = await element.evaluate((el: Element) => {
        const classes = el.className?.split(' ').filter(c => c.length > 2) || []
        return classes.slice(0, 2).map(c => `.${c}`).join('')
      })
      if (className) {
        selectors.push(className)
      }
      
      // 7. 文本内容
      const text = await element.textContent()
      if (text && text.length > 0 && text.length < 50) {
        const trimmed = text.trim().slice(0, 20)
        selectors.push(`text="${trimmed}"`)
      }
      
      // 8. 标签 + 文本
      const tag = await element.evaluate((e: Element) => e.tagName.toLowerCase())
      if (text && text.length > 0 && text.length < 30) {
        const trimmed = text.trim().slice(0, 15)
        selectors.push(`${tag}:has-text("${trimmed}")`)
      }
      
      // 9. 输入类型
      const inputType = await element.getAttribute('type')
      if (inputType && ['text', 'password', 'number', 'email'].includes(inputType)) {
        selectors.push(`input[type="${inputType}"]`)
      }
      
      // 10. button 类型
      if (tag === 'button') {
        const btnType = await element.getAttribute('type')
        selectors.push(`button[type="${btnType || 'button'}"]`)
      }
      
      // 11. href 链接
      const href = await element.getAttribute('href')
      if (href) {
        selectors.push(`a[href*="${href.slice(-20)}"]`)
      }
      
    } catch (error) {
      console.error('[generateSelectors] 失败:', error)
    }
    
    // 去重并返回
    return [...new Set(selectors)].slice(0, 10)
  }

  /**
   * 检测失效的选择器（页面改版后）
   */
  async detectBrokenSelectors(pageUrl: string, selectors: Record<string, SelectorRecord>): Promise<string[]> {
    const results = await this.testSelectors(pageUrl, selectors)
    
    const broken: string[] = []
    
    for (const [name, result] of Object.entries(results)) {
      if (!result.valid) {
        broken.push(name)
      }
    }
    
    return broken
  }

  /**
   * 批量测试多个页面的选择器
   */
  async testMultiplePages(
    pages: Array<{ url: string; name: string; selectors: Record<string, any> }>
  ): Promise<Record<string, Record<string, SelectorTestResult>>> {
    const results: Record<string, Record<string, SelectorTestResult>> = {}
    
    for (const p of pages) {
      try {
        results[p.name] = await this.testSelectors(p.url, p.selectors)
      } catch (error) {
        console.error(`[SelectorDebugger] 测试页面 ${p.name} 失败:`, error)
        results[p.name] = {}
      }
    }
    
    return results
  }

  /**
   * 保存选择器到文件
   */
  saveSelectors(platform: string, page: string, selectors: Record<string, any>): void {
    const dir = path.join(process.cwd(), 'selectors', platform)
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    const file = path.join(dir, `${page}.json`)
    fs.writeFileSync(file, JSON.stringify(selectors, null, 2))
    
    console.log(`[SelectorDebugger] 选择器已保存: ${file}`)
  }

  /**
   * 加载选择器文件
   */
  loadSelectors(platform: string, page: string): Record<string, any> | null {
    const file = path.join(process.cwd(), 'selectors', platform, `${page}.json`)
    
    if (!fs.existsSync(file)) {
      return null
    }
    
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  }
}

export const selectorDebugger = new SelectorDebugger()
