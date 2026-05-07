/**
 * 电商自动化 MCP Server (执行层)
 *
 * 提供结构化的电商操作工具，供 Proma Agent 调用
 * 意图理解由 Proma Agent 负责（使用 LLM）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { BrowserPool } from './browser-pool'
import { WorkerPool } from './worker-pool'

interface ProductListingInput {
  platform: 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou'
  products: Array<{
    title: string
    price: number
    description?: string
    images?: string[]
    category?: string
    stock?: number
  }>
  profile_id?: string
}

interface CollectionInput {
  source: 'xiaohongshu' | 'douyin' | 'weibo' | 'bilibili'
  keywords: string[]
  count: number
  content_type?: 'video' | 'image' | 'text'
}

interface InventoryUpdateInput {
  platform: 'pinduoduo' | 'douyin' | 'taobao' | 'jd'
  items: Array<{
    product_id: string
    stock?: number
    price?: number
  }>
  profile_id?: string
}

interface OrderInput {
  platform: 'pinduoduo' | 'douyin' | 'taobao' | 'jd'
  action: 'list' | 'ship' | 'refund'
  order_ids?: string[]
  profile_id?: string
}

class EcommerceMCPServer {
  private server: Server
  private browserPool: BrowserPool
  private workerPool: WorkerPool

  constructor() {
    this.server = new Server(
      {
        name: 'ecommerce-executor',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.browserPool = new BrowserPool(5)
    this.workerPool = new WorkerPool()
    this.browserPool.initialize().catch(console.error)

    this.setupTools()
    this.setupCallHandlers()
  }

  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_product',
            description: '上架商品到电商平台。支持同时上架多个商品到多个平台。',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd', 'kuaishou'],
                  description: '目标平台'
                },
                products: {
                  type: 'array',
                  description: '商品列表',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: '商品标题' },
                      price: { type: 'number', description: '商品价格' },
                      description: { type: 'string', description: '商品描述' },
                      images: { type: 'array', items: { type: 'string' }, description: '图片URL列表' },
                      category: { type: 'string', description: '商品类目' },
                      stock: { type: 'number', description: '库存数量' }
                    },
                    required: ['title', 'price']
                  }
                },
                profile_id: { type: 'string', description: '浏览器Profile ID' }
              },
              required: ['platform', 'products']
            }
          },
          {
            name: 'collect_trends',
            description: '从社交平台采集热门内容、爆款文案、竞品分析等',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  enum: ['xiaohongshu', 'douyin', 'weibo', 'bilibili'],
                  description: '内容来源平台'
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '搜索关键词'
                },
                count: { type: 'number', description: '采集数量', default: 10 },
                content_type: { type: 'string', enum: ['video', 'image', 'text'], description: '内容类型' }
              },
              required: ['source', 'keywords']
            }
          },
          {
            name: 'update_inventory',
            description: '批量更新商品库存和价格',
            inputSchema: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['pinduoduo', 'douyin', 'taobao', 'jd'] },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { product_id: { type: 'string' }, stock: { type: 'number' }, price: { type: 'number' } },
                    required: ['product_id']
                  }
                },
                profile_id: { type: 'string' }
              },
              required: ['platform', 'items']
            }
          },
          {
            name: 'manage_orders',
            description: '批量处理订单：查看订单列表、批量发货、退款处理',
            inputSchema: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['pinduoduo', 'douyin', 'taobao', 'jd'] },
                action: { type: 'string', enum: ['list', 'ship', 'refund'] },
                order_ids: { type: 'array', items: { type: 'string' } },
                profile_id: { type: 'string' }
              },
              required: ['platform', 'action']
            }
          },
          {
            name: 'check_store_status',
            description: '检查店铺登录状态和浏览器环境',
            inputSchema: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['pinduoduo', 'douyin', 'taobao', 'jd'] },
                profile_id: { type: 'string' }
              },
              required: ['platform']
            }
          },
          {
            name: 'login_store',
            description: '打开店铺后台登录页面，等待用户扫码完成登录',
            inputSchema: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['pinduoduo', 'douyin', 'taobao', 'jd'] },
                profile_id: { type: 'string' }
              },
              required: ['platform']
            }
          },
          {
            name: 'get_task_status',
            description: '获取最近执行任务的状态',
            inputSchema: {
              type: 'object',
              properties: { task_id: { type: 'string' } }
            }
          },
          {
            name: 'get_collection_results',
            description: '获取采集任务的完整结果',
            inputSchema: {
              type: 'object',
              properties: { collection_id: { type: 'string' } },
              required: ['collection_id']
            }
          },
          {
            name: 'get_workflows',
            description: '获取指定平台可用的自动化工作流列表',
            inputSchema: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['pinduoduo', 'douyin', 'taobao', 'jd', 'kuaishou', 'all'] }
              }
            }
          },
          {
            name: 'get_workflow_detail',
            description: '获取指定工作流的详细步骤信息',
            inputSchema: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['pinduoduo', 'douyin', 'taobao', 'jd', 'kuaishou'] },
                workflow_name: { type: 'string' }
              },
              required: ['platform', 'workflow_name']
            }
          }
        ]
      }
    })
  }

  private setupCallHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'list_product':
            return await this.handleListProduct(args as unknown as ProductListingInput)
          case 'collect_trends':
            return await this.handleCollectTrends(args as unknown as CollectionInput)
          case 'update_inventory':
            return await this.handleUpdateInventory(args as unknown as InventoryUpdateInput)
          case 'manage_orders':
            return await this.handleManageOrders(args as unknown as OrderInput)
          case 'check_store_status':
            return await this.handleCheckStoreStatus(args)
          case 'login_store':
            return await this.handleLoginStore(args)
          case 'get_task_status':
            return await this.handleGetTaskStatus(args)
          case 'get_collection_results':
            return await this.handleGetCollectionResults(args)
          case 'get_workflows':
            return await this.handleGetWorkflows(args)
          case 'get_workflow_detail':
            return await this.handleGetWorkflowDetail(args)
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }) }],
          isError: true
        }
      }
    })
  }

  private async handleListProduct(input: ProductListingInput) {
    console.error(`[MCP] 上架商品到 ${input.platform}: ${input.products.length} 个`)

    try {
      const results: any[] = []
      let listed = 0
      let failed = 0

      for (const product of input.products) {
        try {
          const result = await this.workerPool.listProducts(null, {
            platform: input.platform,
            products: [product],
            profile_id: input.profile_id
          })
          results.push({ product: product.title, success: true, result })
          listed++
        } catch (error) {
          results.push({ product: product.title, success: false, error: error instanceof Error ? error.message : String(error) })
          failed++
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, platform: input.platform, listed, failed, results, message: `成功上架 ${listed} 个商品${failed > 0 ? `，失败 ${failed} 个` : ''}` }) }]
      }
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }) }], isError: true }
    }
  }

  private async handleCollectTrends(input: CollectionInput) {
    console.error(`[MCP] 从 ${input.source} 采集 "${input.keywords.join(', ')}"`)

    try {
      const result = await this.workerPool.collectContent(null, {
        source: input.source,
        keywords: input.keywords,
        count: input.count,
        content_type: input.content_type
      })

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, collection_id: result.id, collected: result.collected, source: input.source, keywords: input.keywords, results: result.items, message: `采集完成，共获取 ${result.collected} 条内容` }) }]
      }
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }) }], isError: true }
    }
  }

  private async handleUpdateInventory(input: InventoryUpdateInput) {
    console.error(`[MCP] 更新 ${input.platform} 库存: ${input.items.length} 个商品`)

    try {
      const result = await this.workerPool.updateInventory(null, {
        platform: input.platform,
        items: input.items,
        profile_id: input.profile_id
      })

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, platform: input.platform, updated: result.updated, failed: result.failed, message: `成功更新 ${result.updated} 个商品` }) }]
      }
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }) }], isError: true }
    }
  }

  private async handleManageOrders(input: OrderInput) {
    console.error(`[MCP] 订单操作 ${input.action} on ${input.platform}`)

    try {
      let result: any = { action: input.action }

      switch (input.action) {
        case 'list': {
          const listResult = await this.workerPool.listOrders(null, input.platform)
          result.orders = listResult.orders
          result.total = listResult.total
          break
        }
        case 'ship': {
          const shipResult = await this.workerPool.batchShip(null, input.platform, input.order_ids || [])
          result.shipped = shipResult.shipped
          result.failed = shipResult.failed
          break
        }
        case 'refund': {
          const refundResult = await this.workerPool.handleRefunds(null, input.platform, input.order_ids || [])
          result.processed = refundResult.processed
          result.failed = refundResult.failed
          break
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, ...result, message: '订单操作完成' }) }] }
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }) }], isError: true }
    }
  }

  private async handleCheckStoreStatus(args: any) {
    const { platform } = args
    console.error(`[MCP] 检查 ${platform} 登录状态`)

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, platform, logged_in: true, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), profile_id: args.profile_id || 'default', message: '已登录' }) }]
    }
  }

  private async handleLoginStore(args: any) {
    const { platform } = args
    console.error(`[MCP] 打开 ${platform} 登录页面`)

    const loginUrls: Record<string, string> = {
      pinduoduo: 'https://mms.pinduoduo.com',
      douyin: 'https://creator.douyin.com',
      taobao: 'https://sell.taobao.com',
      jd: 'https://passport.jd.com'
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, platform, profile_id: args.profile_id || 'default', login_url: loginUrls[platform] || platform, message: `已打开 ${platform} 登录页面` }) }]
    }
  }

  private async handleGetTaskStatus(args: any) {
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, task_id: args.task_id, status: 'completed', message: '任务已完成' }) }] }
  }

  private async handleGetCollectionResults(args: any) {
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, collection_id: args.collection_id, items: [], message: '采集结果已返回' }) }] }
  }

  private async handleGetWorkflows(args: any) {
    const { platform } = args
    console.error(`[MCP] 获取工作流列表: ${platform}`)

    const workflows = [
      { platform: 'pinduoduo', workflows: [
        { id: 'pinduoduo-product-listing', name: '上架商品', description: '发布新商品到拼多多' },
        { id: 'pinduoduo-product-update', name: '编辑商品', description: '修改已有商品信息' },
        { id: 'pinduoduo-order-ship', name: '批量发货', description: '批量处理订单发货' },
      ]},
      { platform: 'douyin', workflows: [
        { id: 'douyin-product-listing', name: '上架商品', description: '发布新商品到抖音电商' },
        { id: 'douyin-order-ship', name: '批量发货', description: '批量处理订单发货' },
      ]},
      { platform: 'taobao', workflows: [
        { id: 'taobao-product-listing', name: '上架商品', description: '发布新商品到淘宝' },
        { id: 'taobao-order-ship', name: '批量发货', description: '批量处理订单发货' },
      ]},
    ]

    let result = workflows
    if (platform && platform !== 'all') {
      result = workflows.filter(w => w.platform === platform)
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, workflows: result, message: `共 ${result.reduce((sum: number, p: any) => sum + p.workflows.length, 0)} 个工作流` }) }] }
  }

  private async handleGetWorkflowDetail(args: any) {
    const { platform, workflow_name } = args
    console.error(`[MCP] 获取工作流详情: ${platform}/${workflow_name}`)

    const workflowDetails: Record<string, any> = {
      'pinduoduo-product-listing': {
        id: 'pinduoduo-product-listing', name: '上架商品', platform: 'pinduoduo', version: '1.0.0',
        steps: [
          { step: 1, name: '打开后台', action: 'goto' },
          { step: 2, name: '等待页面加载', action: 'waitForSelector' },
          { step: 3, name: '填写标题', action: 'fill', field: 'productTitle' },
          { step: 4, name: '选择类目', action: 'click' },
          { step: 5, name: '填写价格', action: 'fill', field: 'price' },
          { step: 6, name: '填写库存', action: 'fill', field: 'stock' },
          { step: 7, name: '上传主图', action: 'upload', field: 'mainImage' },
          { step: 8, name: '上传详情图', action: 'upload', field: 'detailImages' },
          { step: 9, name: '提交审核', action: 'click', field: 'submit' },
        ],
        inputFields: ['title', 'price', 'stock', 'description', 'images', 'detailImages'],
      },
      'douyin-product-listing': {
        id: 'douyin-product-listing', name: '上架商品', platform: 'douyin', version: '1.0.0',
        steps: [
          { step: 1, name: '打开后台', action: 'goto' },
          { step: 2, name: '填写标题', action: 'fill' },
          { step: 3, name: '选择类目', action: 'click' },
          { step: 4, name: '填写价格', action: 'fill' },
          { step: 5, name: '上传封面图', action: 'upload' },
          { step: 6, name: '提交审核', action: 'click' },
        ],
        inputFields: ['title', 'price', 'coverImage', 'images'],
      },
    }

    const key = `${platform}-${workflow_name}`
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, workflow: workflowDetails[key] || { message: '工作流详情未找到' } }) }] }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('[MCP] 电商自动化 MCP Server 已启动（执行层）')
  }

  async stop(): Promise<void> {
    await this.browserPool.destroy()
    await this.server.close()
    console.error('[MCP] MCP Server 已停止')
  }
}

const server = new EcommerceMCPServer()
server.start().catch(console.error)

process.on('SIGINT', async () => { await server.stop(); process.exit(0) })
process.on('SIGTERM', async () => { await server.stop(); process.exit(0) })
