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

    this.browserPool = new BrowserPool({ maxInstances: 5 })
    this.workerPool = new WorkerPool()
    this.browserPool.initialize().catch(console.error)

    this.setupTools()
  }

  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // ===== 商品上架 =====
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
                profile_id: { type: 'string', description: '浏览器Profile ID（用于多店铺隔离）' }
              },
              required: ['platform', 'products']
            }
          },

          // ===== 内容采集 =====
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
                count: {
                  type: 'number',
                  description: '采集数量',
                  default: 10
                },
                content_type: {
                  type: 'string',
                  enum: ['video', 'image', 'text'],
                  description: '内容类型过滤'
                }
              },
              required: ['source', 'keywords']
            }
          },

          // ===== 库存更新 =====
          {
            name: 'update_inventory',
            description: '批量更新商品库存和价格',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd'],
                  description: '目标平台'
                },
                items: {
                  type: 'array',
                  description: '要更新的商品',
                  items: {
                    type: 'object',
                    properties: {
                      product_id: { type: 'string', description: '商品ID' },
                      stock: { type: 'number', description: '新库存' },
                      price: { type: 'number', description: '新价格' }
                    },
                    required: ['product_id']
                  }
                },
                profile_id: { type: 'string', description: '浏览器Profile ID' }
              },
              required: ['platform', 'items']
            }
          },

          // ===== 获取可用工作流 =====
          {
            name: 'get_workflows',
            description: '获取指定平台可用的自动化工作流列表',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd', 'kuaishou', 'all'],
                  description: '平台名称，all 表示获取所有平台'
                }
              }
            }
          },

          // ===== 获取工作流详情 =====
          {
            name: 'get_workflow_detail',
            description: '获取指定工作流的详细步骤信息',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd', 'kuaishou'],
                  description: '平台名称'
                },
                workflow_name: {
                  type: 'string',
                  description: '工作流名称，如 product-listing, order-management'
                }
              },
              required: ['platform', 'workflow_name']
            }
          },

          // ===== 订单管理 =====
          {
            name: 'manage_orders',
            description: '批量处理订单：查看订单列表、批量发货、退款处理',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd'],
                  description: '目标平台'
                },
                action: {
                  type: 'string',
                  enum: ['list', 'ship', 'refund'],
                  description: '操作类型：list=查看订单，ship=批量发货，refund=处理退款'
                },
                order_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '订单ID列表（ship和refund时需要）'
                },
                profile_id: { type: 'string', description: '浏览器Profile ID' }
              },
              required: ['platform', 'action']
            }
          },

          // ===== 店铺状态 =====
          {
            name: 'check_store_status',
            description: '检查店铺登录状态和浏览器环境',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd'],
                  description: '目标平台'
                },
                profile_id: { type: 'string', description: '浏览器Profile ID' }
              },
              required: ['platform']
            }
          },

          // ===== 登录店铺 =====
          {
            name: 'login_store',
            description: '打开店铺后台登录页面，等待用户扫码完成登录',
            inputSchema: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['pinduoduo', 'douyin', 'taobao', 'jd'],
                  description: '目标平台'
                },
                profile_id: { type: 'string', description: '浏览器Profile ID' }
              },
              required: ['platform']
            }
          },

          // ===== 获取任务状态 =====
          {
            name: 'get_task_status',
            description: '获取最近执行任务的状态',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: '任务ID' }
              }
            }
          },

          // ===== 获取采集结果 =====
          {
            name: 'get_collection_results',
            description: '获取采集任务的完整结果',
            inputSchema: {
              type: 'object',
              properties: {
                collection_id: { type: 'string', description: '采集任务ID' }
              },
              required: ['collection_id']
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
            return await this.handleListProduct(args as ProductListingInput)

          case 'collect_trends':
            return await this.handleCollectTrends(args as CollectionInput)

          case 'update_inventory':
            return await this.handleUpdateInventory(args as InventoryUpdateInput)

          case 'manage_orders':
            return await this.handleManageOrders(args as OrderInput)

          case 'check_store_status':
            return await this.handleCheckStoreStatus(args)

          case 'login_store':
            return await this.handleLoginStore(args)

          case 'get_task_status':
            return await this.handleGetTaskStatus(args)

          case 'get_workflows':
            return await this.handleGetWorkflows(args)

          case 'get_workflow_detail':
            return await this.handleGetWorkflowDetail(args)

          case 'get_collection_results':
            return await this.handleGetCollectionResults(args)

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            })
          }],
          isError: true
        }
      }
    })
  }

  private async handleListProduct(input: ProductListingInput) {
    console.error(`[MCP] 上架商品到 ${input.platform}: ${input.products.length} 个`)

    const browser = await this.browserPool.acquire(input.profile_id)
    try {
      const results = await this.workerPool.listProducts(browser, input)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            platform: input.platform,
            listed: results.listed,
            failed: results.failed,
            results: results.details,
            message: `成功上架 ${results.listed} 个商品${results.failed > 0 ? `，失败 ${results.failed} 个` : ''}`
          })
        }]
      }
    } finally {
      this.browserPool.release(browser)
    }
  }

  private async handleCollectTrends(input: CollectionInput) {
    console.error(`[MCP] 从 ${input.source} 采集 "${input.keywords.join(', ')}"`)

    const browser = await this.browserPool.acquire()
    try {
      const results = await this.workerPool.collectContent(browser, input)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            collection_id: results.id,
            collected: results.collected,
            source: input.source,
            keywords: input.keywords,
            results: results.items,
            message: `采集完成，共获取 ${results.collected} 条内容`
          })
        }]
      }
    } finally {
      this.browserPool.release(browser)
    }
  }

  private async handleUpdateInventory(input: InventoryUpdateInput) {
    console.error(`[MCP] 更新 ${input.platform} 库存: ${input.items.length} 个商品`)

    const browser = await this.browserPool.acquire(input.profile_id)
    try {
      const results = await this.workerPool.updateInventory(browser, input)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            platform: input.platform,
            updated: results.updated,
            failed: results.failed,
            message: `成功更新 ${results.updated} 个商品${results.failed > 0 ? `，失败 ${results.failed} 个` : ''}`
          })
        }]
      }
    } finally {
      this.browserPool.release(browser)
    }
  }

  private async handleManageOrders(input: OrderInput) {
    console.error(`[MCP] 订单操作 ${input.action} on ${input.platform}`)

    const browser = await this.browserPool.acquire(input.profile_id)
    try {
      let results: any

      switch (input.action) {
        case 'list':
          results = await this.workerPool.listOrders(browser, input.platform)
          break
        case 'ship':
          results = await this.workerPool.batchShip(browser, input.platform, input.order_ids || [])
          break
        case 'refund':
          results = await this.workerPool.handleRefunds(browser, input.platform, input.order_ids || [])
          break
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            action: input.action,
            ...results
          })
        }]
      }
    } finally {
      this.browserPool.release(browser)
    }
  }

  private async handleCheckStoreStatus(args: any) {
    const { platform, profile_id } = args
    console.error(`[MCP] 检查 ${platform} 登录状态`)

    const browser = await this.browserPool.acquire(profile_id)
    try {
      const status = await this.workerPool.checkLoginStatus(browser, platform)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            platform,
            logged_in: status.loggedIn,
            expires_at: status.expiresAt,
            profile_id: profile_id || 'default',
            message: status.loggedIn ? '已登录' : '未登录或登录已过期'
          })
        }]
      }
    } finally {
      this.browserPool.release(browser)
    }
  }

  private async handleLoginStore(args: any) {
    const { platform, profile_id } = args
    console.error(`[MCP] 打开 ${platform} 登录页面`)

    const browser = await this.browserPool.acquire(profile_id)
    try {
      const loginUrl = await this.workerPool.openLoginPage(browser, platform)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            platform,
            profile_id: profile_id || 'default',
            login_url: loginUrl,
            message: `已打开 ${platform} 登录页面，请在浏览器中完成扫码登录`
          })
        }]
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }],
        isError: true
      }
    }
  }

  private async handleGetTaskStatus(args: any) {
    const { task_id } = args

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          task_id,
          status: 'completed',
          message: '任务已完成'
        })
      }]
    }
  }

  private async handleGetCollectionResults(args: any) {
    const { collection_id } = args

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          collection_id,
          items: [],
          message: '采集结果已返回'
        })
      }]
    }
  }

  private async handleGetWorkflows(args: any) {
    const { platform } = args
    console.error(`[MCP] 获取工作流列表: ${platform}`)

    const workflows = [
      {
        platform: 'pinduoduo',
        workflows: [
          { id: 'pinduoduo-product-listing', name: '上架商品', description: '发布新商品到拼多多' },
          { id: 'pinduoduo-product-update', name: '编辑商品', description: '修改已有商品信息' },
          { id: 'pinduoduo-order-ship', name: '批量发货', description: '批量处理订单发货' },
        ]
      },
      {
        platform: 'douyin',
        workflows: [
          { id: 'douyin-product-listing', name: '上架商品', description: '发布新商品到抖音电商' },
          { id: 'douyin-product-update', name: '编辑商品', description: '修改已有商品信息' },
          { id: 'douyin-order-ship', name: '批量发货', description: '批量处理订单发货' },
        ]
      },
      {
        platform: 'taobao',
        workflows: [
          { id: 'taobao-product-listing', name: '上架商品', description: '发布新商品到淘宝' },
          { id: 'taobao-order-ship', name: '批量发货', description: '批量处理订单发货' },
        ]
      },
    ]

    let result = workflows
    if (platform && platform !== 'all') {
      result = workflows.filter(w => w.platform === platform)
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          workflows: result,
          message: `共 ${result.reduce((sum, p) => sum + p.workflows.length, 0)} 个工作流`
        })
      }]
    }
  }

  private async handleGetWorkflowDetail(args: any) {
    const { platform, workflow_name } = args
    console.error(`[MCP] 获取工作流详情: ${platform}/${workflow_name}`)

    const workflowDetails: Record<string, any> = {
      'pinduoduo-product-listing': {
        id: 'pinduoduo-product-listing',
        name: '上架商品',
        platform: 'pinduoduo',
        version: '1.0.0',
        steps: [
          { step: 1, name: '打开后台', action: 'goto' },
          { step: 2, name: '等待页面加载', action: 'waitForSelector' },
          { step: 3, name: '填写标题', action: 'fill', field: 'productTitle' },
          { step: 4, name: '选择类目', action: 'click' },
          { step: 5, name: '填写价格', action: 'fill', field: 'price' },
          { step: 6, name: '填写库存', action: 'fill', field: 'stock' },
          { step: 7, name: '上传主图', action: 'upload', field: 'mainImage' },
          { step: 8, name: '上传详情图', action: 'upload', field: 'detailImages' },
          { step: 9, name: '选择运费模板', action: 'select' },
          { step: 10, name: '提交审核', action: 'click', field: 'submit' },
        ],
        inputFields: ['title', 'price', 'stock', 'description', 'images', 'detailImages', 'category'],
      },
      'douyin-product-listing': {
        id: 'douyin-product-listing',
        name: '上架商品',
        platform: 'douyin',
        version: '1.0.0',
        steps: [
          { step: 1, name: '打开后台', action: 'goto' },
          { step: 2, name: '填写标题', action: 'fill' },
          { step: 3, name: '选择类目', action: 'click' },
          { step: 4, name: '填写价格', action: 'fill' },
          { step: 5, name: '填写库存', action: 'fill' },
          { step: 6, name: '上传封面图', action: 'upload' },
          { step: 7, name: '上传图片', action: 'upload' },
          { step: 8, name: '上传视频', action: 'upload' },
          { step: 9, name: '提交审核', action: 'click' },
        ],
        inputFields: ['title', 'price', 'stock', 'coverImage', 'images', 'video'],
      },
    }

    const key = `${platform}-${workflow_name}`
    const detail = workflowDetails[key]

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          workflow: detail || { message: '工作流详情未找到' },
        })
      }]
    }
  }

  async start(): Promise<void> {
    this.setupCallHandlers()

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

process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await server.stop()
  process.exit(0)
})
