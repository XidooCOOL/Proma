/**
 * 工作流引擎
 * 
 * 负责：
 * 1. 加载工作流定义
 * 2. 加载 Selector 库
 * 3. 解析数据绑定
 * 4. 执行每个步骤
 * 5. 处理错误和重试
 */

import { v4 as uuidv4 } from 'uuid'
import type { Browser, Page } from 'playwright'
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep,
  WorkflowEngine,
  DataBinding,
} from './types'
import { PLATFORM_CONFIG, Selector, PageSelectors } from '../selectors/types'

export interface WorkflowEngineConfig {
  /** 浏览器实例 */
  browser: Browser
  
  /** 浏览器上下文 ID */
  contextId: string
  
  /** 默认超时 */
  defaultTimeout: number
  
  /** 默认重试次数 */
  defaultRetries: number
  
  /** 截图保存目录 */
  screenshotDir?: string
}

export class EcommerceWorkflowEngine implements WorkflowEngine {
  private config: WorkflowEngineConfig
  private execution: WorkflowExecution | null = null
  private paused = false
  private cancelled = false
  
  constructor(config: WorkflowEngineConfig) {
    this.config = config
  }
  
  async execute(workflow: WorkflowDefinition, inputData: any): Promise<WorkflowExecution> {
    this.execution = {
      id: uuidv4(),
      workflow,
      status: 'running',
      currentStepIndex: -1,
      context: {
        inputData,
        stepResults: {},
        screenshots: [],
      },
      startedAt: new Date(),
    }
    
    console.log(`[WorkflowEngine] 开始执行工作流: ${workflow.id}`)
    
    try {
      const page = await this.getPage()
      
      for (let i = 0; i < workflow.steps.length; i++) {
        if (this.cancelled) {
          this.execution.status = 'cancelled'
          throw new Error('工作流已取消')
        }
        
        while (this.paused) {
          await this.sleep(100)
          if (this.cancelled) {
            this.execution.status = 'cancelled'
            throw new Error('工作流已取消')
          }
        }
        
        const step = workflow.steps[i]
        this.execution.currentStepIndex = i
        this.execution.currentStep = step
        
        console.log(`[WorkflowEngine] 执行步骤 ${i + 1}/${workflow.steps.length}: ${step.name}`)
        
        try {
          const result = await this.executeStep(page, step, inputData)
          this.execution.context.stepResults[step.id] = result
        } catch (error) {
          if (step.retry && step.retry.maxRetries > 0) {
            console.log(`[WorkflowEngine] 步骤失败，准备重试: ${step.name}`)
            for (let retry = 1; retry <= step.retry.maxRetries; retry++) {
              await this.sleep(step.retry.delay)
              try {
                const result = await this.executeStep(page, step, inputData)
                this.execution.context.stepResults[step.id] = result
                break
              } catch (retryError) {
                if (retry === step.retry.maxRetries) {
                  throw retryError
                }
              }
            }
          } else {
            throw error
          }
        }
      }
      
      this.execution.status = 'completed'
      this.execution.completedAt = new Date()
      console.log(`[WorkflowEngine] 工作流执行完成: ${workflow.id}`)
      
    } catch (error) {
      this.execution.status = 'failed'
      this.execution.error = {
        step: this.execution.currentStep?.id,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
      this.execution.completedAt = new Date()
      console.error(`[WorkflowEngine] 工作流执行失败: ${workflow.id}`, error)
    }
    
    return this.execution
  }
  
  async pause(): Promise<void> {
    this.paused = true
    console.log('[WorkflowEngine] 工作流已暂停')
  }
  
  async resume(): Promise<void> {
    this.paused = false
    console.log('[WorkflowEngine] 工作流已恢复')
  }
  
  async cancel(): Promise<void> {
    this.cancelled = true
    this.paused = false
    console.log('[WorkflowEngine] 工作流已取消')
  }
  
  getStatus(): WorkflowExecution {
    if (!this.execution) {
      throw new Error('工作流未开始')
    }
    return this.execution
  }
  
  private async getPage(): Promise<Page> {
    const context = this.config.browser.contexts().find(
      ctx => ctx.browser() === this.config.browser
    )
    
    if (!context) {
      throw new Error('浏览器上下文不存在')
    }
    
    const pages = context.pages()
    if (pages.length === 0) {
      return await context.newPage()
    }
    
    return pages[0]
  }
  
  private async executeStep(page: Page, step: WorkflowStep, inputData: any): Promise<any> {
    const selector = step.selector ? await this.resolveSelector(step.selector) : undefined
    const value = step.data ? this.resolveData(step.data, inputData) : undefined
    
    const params = step.params || {}
    const timeout = params.timeout || this.config.defaultTimeout
    
    switch (step.action) {
      case 'goto': {
        const platform = this.execution!.workflow.platform
        const url = this.getPlatformUrl(platform)
        await page.goto(url, { timeout, waitUntil: 'domcontentloaded' })
        return { url }
      }
      
      case 'click': {
        if (!selector) throw new Error('click 动作需要 selector')
        await page.click(selector.selector, { timeout, ...this.getClickOptions(params) })
        return { clicked: selector.selector }
      }
      
      case 'fill': {
        if (!selector) throw new Error('fill 动作需要 selector')
        if (value === undefined || value === null) {
          if (step.data && typeof step.data === 'object' && (step.data as DataBinding).required) {
            throw new Error(`字段 ${selector.selector} 是必填的`)
          }
          return { skipped: true, reason: '值为空' }
        }
        await page.fill(selector.selector, String(value), { timeout })
        return { filled: selector.selector, value }
      }
      
      case 'select': {
        if (!selector) throw new Error('select 动作需要 selector')
        await page.selectOption(selector.selector, String(value), { timeout })
        return { selected: selector.selector, value }
      }
      
      case 'check': {
        if (!selector) throw new Error('check 动作需要 selector')
        await page.check(selector.selector, { timeout })
        return { checked: selector.selector }
      }
      
      case 'uncheck': {
        if (!selector) throw new Error('uncheck 动作需要 selector')
        await page.uncheck(selector.selector, { timeout })
        return { unchecked: selector.selector }
      }
      
      case 'upload': {
        if (!selector) throw new Error('upload 动作需要 selector')
        
        if (!value) {
          return { skipped: true, reason: '没有上传文件' }
        }
        
        const files = Array.isArray(value) ? value : [value]
        for (const file of files) {
          await page.setInputFiles(selector.selector, file, { timeout })
          if (params.delay) {
            await this.sleep(params.delay)
          }
        }
        return { uploaded: selector.selector, files }
      }
      
      case 'hover': {
        if (!selector) throw new Error('hover 动作需要 selector')
        await page.hover(selector.selector, { timeout })
        return { hovered: selector.selector }
      }
      
      case 'dblclick': {
        if (!selector) throw new Error('dblclick 动作需要 selector')
        await page.dblclick(selector.selector, { timeout })
        return { doubleClicked: selector.selector }
      }
      
      case 'wait': {
        await this.sleep(params.delay || 1000)
        return { waited: params.delay || 1000 }
      }
      
      case 'waitForSelector': {
        if (!selector) throw new Error('waitForSelector 动作需要 selector')
        await page.waitForSelector(selector.selector, {
          timeout,
          state: params.waitForCondition as any || 'visible',
        })
        return { found: selector.selector }
      }
      
      case 'waitForHidden': {
        if (!selector) throw new Error('waitForHidden 动作需要 selector')
        await page.waitForSelector(selector.selector, {
          timeout,
          state: 'hidden',
        })
        return { hidden: selector.selector }
      }
      
      case 'screenshot': {
        const name = params.screenshotName || `step-${step.id}`
        const path = `${this.config.screenshotDir || 'screenshots'}/${name}-${Date.now()}.png`
        await page.screenshot({ path, fullPage: true })
        this.execution?.context.screenshots.push(path)
        return { screenshot: path }
      }
      
      case 'evaluate': {
        const result = await page.evaluate(params.expression || '() => {}')
        return { evaluated: result }
      }
      
      case 'switchFrame': {
        if (!selector) throw new Error('switchFrame 动作需要 selector')
        const frame = page.frameLocator(selector.selector)
        return { switched: selector.selector }
      }
      
      case 'dialog': {
        page.on('dialog', async dialog => {
          await dialog.accept()
        })
        return { dialog: 'handled' }
      }
      
      case 'gotoEnd': {
        const targetStep = step.params?.gotoStep
        if (targetStep) {
          const targetIndex = this.execution!.workflow.steps.findIndex(s => s.id === targetStep)
          if (targetIndex > 0) {
            this.execution.currentStepIndex = targetIndex - 1
          }
        }
        return { gotoEnd: targetStep }
      }
      
      default:
        throw new Error(`未知的动作类型: ${step.action}`)
    }
  }
  
  private async resolveSelector(selectorRef: { ref: string; value?: Selector }): Promise<Selector> {
    if (selectorRef.value) {
      return selectorRef.value
    }
    
    const platform = this.execution!.workflow.platform
    const pageSelector = await this.getPageSelector(platform, 'productCreate')
    
    const selector = pageSelector?.elements[selectorRef.ref]
    if (!selector) {
      throw new Error(`找不到选择器: ${selectorRef.ref}`)
    }
    
    return selector
  }
  
  private async getPageSelector(platform: string, page: string): Promise<PageSelectors | null> {
    const selectorLib = await this.getSelectorLib(platform as any)
    return (selectorLib as any)?.pages?.[page] || null
  }
  
  private async getSelectorLib(platform: 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou') {
    switch (platform) {
      case 'pinduoduo':
        return await import('../selectors/pinduoduo').then(m => m.pinduoduoSelectors)
      case 'douyin':
        return await import('../selectors/douyin').then(m => m.douyinSelectors)
      case 'taobao':
        return await import('../selectors/taobao').then(m => m.taobaoSelectors)
      default:
        return null
    }
  }
  
  private resolveData(data: DataBinding | string, inputData: any): any {
    const binding = typeof data === 'string' ? { path: data } : data
    
    let value = this.getValueByPath(inputData, binding.path)
    
    if (value === undefined && binding.defaultValue !== undefined) {
      value = binding.defaultValue
    }
    
    if (binding.transform && value !== undefined) {
      value = binding.transform(value)
    }
    
    return value
  }
  
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.')
    let current = obj
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      
      if (part.includes('[') && part.includes(']')) {
        const [key, indexStr] = part.replace(']', '').split('[')
        const index = parseInt(indexStr, 10)
        
        if (key) {
          current = current[key]
        }
        
        if (Array.isArray(current)) {
          current = current[index]
        }
      } else {
        current = current[part]
      }
    }
    
    return current
  }
  
  private getPlatformUrl(platform: string): string {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]
    if (!config) {
      throw new Error(`不支持的平台: ${platform}`)
    }
    
    switch (platform) {
      case 'pinduoduo':
        return `${config.backendUrl}/goods/goods-detail`
      case 'douyin':
        return `${config.backendUrl}/product/product-create`
      case 'taobao':
        return `${config.backendUrl}/auction/create`
      default:
        return config.backendUrl
    }
  }
  
  private getClickOptions(params: any): any {
    return {
      force: params.force,
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export function createWorkflowEngine(config: WorkflowEngineConfig): EcommerceWorkflowEngine {
  return new EcommerceWorkflowEngine(config)
}
