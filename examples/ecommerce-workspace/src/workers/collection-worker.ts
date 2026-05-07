/**
 * 采集 Worker (CollectionWorker)
 * 
 * 负责执行内容采集任务：
 * - 小红书内容采集
 * - 竞品分析
 * - 价格监控
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

export interface CollectedContent {
  id: string
  title: string
  author: string
  likes: number
  comments: number
  shares: number
  tags: string[]
  content: string
  images: string[]
  url: string
  collectedAt: number
}

export class CollectionWorker extends EventEmitter {
  readonly id: string
  readonly type: 'collection' = 'collection'
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

  get workerStatus(): WorkerStatus {
    return this.status
  }

  /**
   * 执行任务
   */
  async execute(task: Task): Promise<TaskResult> {
    console.log(`[CollectionWorker:${this.id}] 开始执行任务: ${task.id}`)

    this.status = 'busy'
    this.currentTask = task

    try {
      let result: TaskResult

      switch (task.action) {
        case 'content-collection':
          result = await this.executeContentCollection(task)
          break
        case 'price-monitoring':
          result = await this.executePriceMonitoring(task)
          break
        case 'competitor-analysis':
          result = await this.executeCompetitorAnalysis(task)
          break
        default:
          throw new Error(`未知采集类型: ${task.action}`)
      }

      console.log(`[CollectionWorker:${this.id}] 任务完成: ${task.id}`)
      return result
    } catch (error) {
      console.error(`[CollectionWorker:${this.id}] 任务失败: ${task.id}`, error)
      throw error
    } finally {
      this.status = 'idle'
      this.currentTask = undefined
    }
  }

  /**
   * 执行内容采集
   */
  private async executeContentCollection(task: Task): Promise<TaskResult> {
    const { platform } = task.target
    const { keywords, count, filters } = task.params

    console.log(`[CollectionWorker:${this.id}] 内容采集: ${keywords} from ${platform}`)

    const startTime = Date.now()
    const collected: CollectedContent[] = []

    try {
      // 获取浏览器实例
      const browser = await this.browserPool.acquireBrowser(
        `${this.id}-${platform}`,
        platform
      )

      // 打开小红书
      task.progress = 10
      this.emit('task-progress', { taskId: task.id, progress: 10, message: '打开小红书' })
      await browser.navigate('https://www.xiaohongshu.com')

      // 搜索关键词
      task.progress = 20
      this.emit('task-progress', { taskId: task.id, progress: 20, message: '搜索关键词' })
      await this.searchKeyword(browser, keywords[0] || '女装')

      // 采集内容
      const targetCount = count || 50
      let collectedCount = 0
      let scrollCount = 0
      const maxScrolls = Math.ceil(targetCount / 10) + 5

      while (collectedCount < targetCount && scrollCount < maxScrolls) {
        task.progress = 20 + Math.floor((collectedCount / targetCount) * 70)
        this.emit('task-progress', {
          taskId: task.id,
          progress: task.progress,
          message: `采集中 ${collectedCount}/${targetCount}`
        })

        // 提取当前页面的内容
        const contents = await this.extractContents(browser)
        collected.push(...contents)
        collectedCount = collected.length

        // 滚动加载更多
        await browser.scroll(1000)
        scrollCount++

        // 随机等待，避免被检测
        await this.randomDelay(1000, 2000)
      }

      task.progress = 95
      this.emit('task-progress', { taskId: task.id, progress: 95, message: '整理数据' })

      const duration = Date.now() - startTime

      return {
        success: true,
        message: `采集完成，共 ${collected.length} 条内容`,
        data: {
          platform,
          keywords,
          totalCollected: collected.length,
          contents: collected.slice(0, targetCount),
          filters
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
   * 执行价格监控
   */
  private async executePriceMonitoring(task: Task): Promise<TaskResult> {
    const { platform } = task.target
    const { keywords } = task.params

    console.log(`[CollectionWorker:${this.id}] 价格监控: ${keywords} on ${platform}`)

    const startTime = Date.now()

    // 模拟价格监控
    await new Promise(resolve => setTimeout(resolve, 2000))

    const duration = Date.now() - startTime

    return {
      success: true,
      message: '价格监控数据获取完成',
      data: {
        platform,
        keywords,
        prices: [
          { keyword: keywords[0], minPrice: 29.9, maxPrice: 99.9, avgPrice: 59.9 }
        ]
      },
      timestamp: Date.now(),
      duration
    }
  }

  /**
   * 执行竞品分析
   */
  private async executeCompetitorAnalysis(task: Task): Promise<TaskResult> {
    const { platform } = task.target
    const { keywords } = task.params

    console.log(`[CollectionWorker:${this.id}] 竞品分析: ${keywords}`)

    const startTime = Date.now()

    // 模拟竞品分析
    await new Promise(resolve => setTimeout(resolve, 3000))

    const duration = Date.now() - startTime

    return {
      success: true,
      message: '竞品分析完成',
      data: {
        platform,
        keywords,
        competitors: [
          {
            name: '竞品A',
            price: 69.9,
            sales: 10000,
            rating: 4.8
          },
          {
            name: '竞品B',
            price: 59.9,
            sales: 8000,
            rating: 4.6
          }
        ],
        insights: [
          '价格区间在 50-80 元销量最好',
          '高评分产品（4.8+）更容易获得推荐',
          '带有视频展示的产品转化率更高'
        ]
      },
      timestamp: Date.now(),
      duration
    }
  }

  /**
   * 搜索关键词
   */
  private async searchKeyword(browser: any, keyword: string): Promise<void> {
    try {
      // 等待搜索框出现
      await browser.waitForSelector('input[placeholder*="搜索"]', 10000)
      
      // 点击搜索框
      await browser.click('input[placeholder*="搜索"]')
      
      // 输入关键词
      await browser.fill('input[placeholder*="搜索"]', keyword)
      
      // 点击搜索按钮
      await browser.click('button:has-text("搜索"), [data-v-bill-search-btn]')
      
      // 等待搜索结果加载
      await this.randomDelay(2000, 3000)
    } catch (error) {
      console.warn(`[CollectionWorker:${this.id}] 搜索失败，使用备选方案`)
      // 备选：直接导航到搜索页面
      await browser.navigate(`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`)
    }
  }

  /**
   * 提取内容
   */
  private async extractContents(browser: any): Promise<CollectedContent[]> {
    const contents: CollectedContent[] = []

    try {
      const result = await browser.evaluate(() => {
        const items = document.querySelectorAll('.note-item, [class*="feeds"] > div')
        const data: any[] = []

        items.forEach((item: any) => {
          const title = item.querySelector('.title, [class*="title"]')?.textContent || ''
          const author = item.querySelector('.author, [class*="user"]')?.textContent || ''
          const likes = parseInt(item.querySelector('[class*="like"]')?.textContent || '0') || 0
          const content = item.querySelector('.content, [class*="desc"]')?.textContent || ''

          if (title || content) {
            data.push({
              id: `xhs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: title.trim(),
              author: author.trim(),
              likes,
              comments: 0,
              shares: 0,
              tags: [],
              content: content.trim(),
              images: [],
              url: '',
              collectedAt: Date.now()
            })
          }
        })

        return data
      })

      contents.push(...result)
    } catch (error) {
      console.warn(`[CollectionWorker:${this.id}] 提取内容失败:`, error)
    }

    return contents
  }

  /**
   * 随机延迟
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
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
