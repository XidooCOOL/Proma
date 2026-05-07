/**
 * 意图解析器 (IntentParser)
 * 
 * 负责解析用户输入，理解任务意图
 */

import {
  UserIntent,
  ParsedOperation,
  ParsedCollection,
  Product,
  Platform,
  OperationType,
  CollectionType,
} from '../types'

export class IntentParser {
  /**
   * 解析用户输入
   */
  async parse(userInput: string): Promise<UserIntent> {
    console.log(`[IntentParser] 开始解析: ${userInput}`)

    const intent: UserIntent = {
      raw: userInput,
      parsed: {
        operations: [],
        collections: []
      },
      confidence: 0.8
    }

    // 识别运营任务
    const operations = this.extractOperations(userInput)
    intent.parsed.operations = operations

    // 识别采集任务
    const collections = this.extractCollections(userInput)
    intent.parsed.collections = collections

    // 计算置信度
    if (operations.length > 0 || collections.length > 0) {
      intent.confidence = 0.9
    }

    console.log(`[IntentParser] 解析完成:`, intent)

    return intent
  }

  /**
   * 提取运营任务
   */
  private extractOperations(input: string): ParsedOperation[] {
    const operations: ParsedOperation[] = []

    // 商品上架任务
    if (this.matchesPattern(input, ['上架', '发布商品', '上新'])) {
      const platforms = this.extractPlatforms(input, ['抖音', '拼多多', '淘宝', '京东'])
      const products = this.extractProducts(input)
      
      if (platforms.length > 0 && products.length > 0) {
        operations.push({
          action: 'product-listing',
          targets: platforms,
          products,
          constraints: this.extractConstraints(input)
        })
      }
    }

    // 订单处理任务
    if (this.matchesPattern(input, ['处理订单', '发货', '批量发货'])) {
      const platforms = this.extractPlatforms(input, ['抖音', '拼多多', '淘宝', '京东'])
      
      if (platforms.length > 0) {
        operations.push({
          action: 'order-management',
          targets: platforms,
          products: [],
          constraints: this.extractConstraints(input)
        })
      }
    }

    // 库存更新任务
    if (this.matchesPattern(input, ['更新库存', '调整库存', '修改库存'])) {
      const platforms = this.extractPlatforms(input, ['抖音', '拼多多', '淘宝', '京东'])
      const products = this.extractProducts(input)
      
      if (platforms.length > 0) {
        operations.push({
          action: 'inventory-update',
          targets: platforms,
          products,
          constraints: this.extractConstraints(input)
        })
      }
    }

    return operations
  }

  /**
   * 提取采集任务
   */
  private extractCollections(input: string): ParsedCollection[] {
    const collections: ParsedCollection[] = []

    // 内容采集任务
    if (this.matchesPattern(input, ['采集', '抓取', '获取'])) {
      const sources = this.extractSources(input)
      
      if (sources.length > 0) {
        collections.push({
          action: 'content-collection',
          sources,
          keywords: this.extractKeywords(input),
          count: this.extractCount(input),
          filters: this.extractFilters(input)
        })
      }
    }

    // 价格监控任务
    if (this.matchesPattern(input, ['监控价格', '价格监测', '比价'])) {
      collections.push({
        action: 'price-monitoring',
        sources: this.extractSources(input) || ['pinduoduo', 'douyin'],
        keywords: this.extractKeywords(input),
        count: this.extractCount(input)
      })
    }

    // 竞品分析任务
    if (this.matchesPattern(input, ['竞品分析', '竞争对手', '市场分析'])) {
      collections.push({
        action: 'competitor-analysis',
        sources: ['xiaohongshu', 'pinduoduo'],
        keywords: this.extractKeywords(input),
        count: 20
      })
    }

    return collections
  }

  /**
   * 提取平台
   */
  private extractPlatforms(input: string, platformNames: string[]): Platform[] {
    const platforms: Platform[] = []
    const platformMap: Record<string, Platform> = {
      '抖音': 'douyin',
      '拼多多': 'pinduoduo',
      '淘宝': 'taobao',
      '京东': 'jd',
      '小红书': 'xiaohongshu'
    }

    for (const name of platformNames) {
      if (input.includes(name)) {
        const platform = platformMap[name]
        if (platform) {
          platforms.push(platform)
        }
      }
    }

    // 如果没有明确指定平台，但有电商相关操作，默认添加常见平台
    if (platforms.length === 0 && this.matchesPattern(input, ['上架', '商品', '店铺'])) {
      platforms.push('pinduoduo', 'douyin')
    }

    return platforms
  }

  /**
   * 提取来源
   */
  private extractSources(input: string): Platform[] {
    return this.extractPlatforms(input, ['小红书', '抖音', '拼多多', '淘宝', '京东'])
  }

  /**
   * 提取商品
   */
  private extractProducts(input: string): Product[] {
    const products: Product[] = []

    // 匹配商品信息
    // 格式: "商品: 标题, 价格: 99, 库存: 100"
    const productPatterns = [
      /商品[：:]\s*(.+?)(?:,|$)/gi,
      /(.+?)\s*,\s*价格[：:]\s*(\d+)/gi,
      /(?:标题|名称)[：:]\s*(.+?)(?:,|$)/gi
    ]

    for (const pattern of productPatterns) {
      let match
      while ((match = pattern.exec(input)) !== null) {
        const product: Product = {
          id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: match[1]?.trim() || '未命名商品',
          price: this.extractNumber(match[2] || match[1]) || 99,
          stock: 100,
          images: []
        }

        // 尝试提取价格
        const priceMatch = input.match(/价格[：:]\s*(\d+)/i)
        if (priceMatch) {
          product.price = parseFloat(priceMatch[1])
        }

        // 尝试提取库存
        const stockMatch = input.match(/库存[：:]\s*(\d+)/i)
        if (stockMatch) {
          product.stock = parseInt(stockMatch[1])
        }

        // 尝试提取图片路径
        const imageMatches = input.match(/\/[^\s]+\.(jpg|jpeg|png|gif)/gi)
        if (imageMatches) {
          product.images = imageMatches
        }

        if (product.title && !products.some(p => p.title === product.title)) {
          products.push(product)
        }
      }
    }

    // 如果没有提取到具体商品，创建一个默认商品
    if (products.length === 0 && this.matchesPattern(input, ['上架', '发布'])) {
      products.push({
        id: `product-${Date.now()}`,
        title: '待上架商品',
        price: 99,
        stock: 100,
        images: []
      })
    }

    return products
  }

  /**
   * 提取关键词
   */
  private extractKeywords(input: string): string[] {
    const keywords: string[] = []

    // 匹配引号中的关键词
    const quotedMatches = input.match(/["']([^"']+)["']/g)
    if (quotedMatches) {
      for (const match of quotedMatches) {
        keywords.push(match.replace(/["']/g, ''))
      }
    }

    // 匹配"关键词"或"关于xxx"等模式
    const patterns = [
      /关于(.+?)(?:的|文章|内容)/i,
      /搜索(.+?)(?:的|文章|内容)/i,
      /(?:爆款|热门|流行)(.+?)(?:文案|内容|文章)/i
    ]

    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match && match[1]) {
        keywords.push(match[1].trim())
      }
    }

    return keywords.length > 0 ? keywords : ['女装']
  }

  /**
   * 提取数量
   */
  private extractCount(input: string): number {
    const countPatterns = [
      /(\d+)\s*(?:个|篇|条|件|款)/,
      /(?:采集|获取|抓取)\s*(\d+)/,
      /(?:总共|共|一共)\s*(\d+)/
    ]

    for (const pattern of countPatterns) {
      const match = input.match(pattern)
      if (match && match[1]) {
        return parseInt(match[1])
      }
    }

    return 50 // 默认采集50条
  }

  /**
   * 提取约束条件
   */
  private extractConstraints(input: string): Record<string, any> {
    const constraints: Record<string, any> = {}

    // 提取价格约束
    const priceMatch = input.match(/(?:价格|售价)(?:是|为|在)?\s*(\d+)/)
    if (priceMatch) {
      constraints.price = parseFloat(priceMatch[1])
    }

    // 提取数量约束
    const countMatch = input.match(/(\d+)\s*(?:个|件|款)/)
    if (countMatch) {
      constraints.count = parseInt(countMatch[1])
    }

    // 提取时间约束
    const timeMatch = input.match(/(?:今天|明天|本周)/)
    if (timeMatch) {
      constraints.timeRange = timeMatch[1]
    }

    return constraints
  }

  /**
   * 提取筛选条件
   */
  private extractFilters(input: string): Record<string, any> {
    const filters: Record<string, any> = {}

    // 热度筛选
    if (input.includes('爆款') || input.includes('热门')) {
      filters.minHotness = 80
    }

    // 时间筛选
    if (input.includes('最近')) {
      filters.recentDays = 7
    }

    // 类别筛选
    const categories = ['女装', '男装', '美妆', '数码', '家居']
    for (const category of categories) {
      if (input.includes(category)) {
        filters.category = category
        break
      }
    }

    return filters
  }

  /**
   * 匹配模式
   */
  private matchesPattern(input: string, patterns: string[]): boolean {
    return patterns.some(pattern => input.includes(pattern))
  }

  /**
   * 提取数字
   */
  private extractNumber(text: string): number | null {
    const match = text.match(/\d+/)
    return match ? parseFloat(match[0]) : null
  }
}
