/**
 * 电商任务编排 MCP Server
 * 
 * 提供给 Proma 使用的 MCP 接口
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { TaskOrchestrator } from './orchestrator'
import type { TaskSession, OverallProgress } from './types'

class EcommerceOrchestratorServer {
  private server: Server
  private orchestrator: TaskOrchestrator

  constructor() {
    this.server = new Server(
      {
        name: 'ecommerce-orchestrator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.orchestrator = new TaskOrchestrator()
    
    this.setupTools()
    this.setupEventHandlers()
  }

  /**
   * 设置工具列表
   */
  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'process_ecommerce_task',
            description: '处理电商多任务请求，支持商品上架、内容采集等多种任务并行执行',
            inputSchema: {
              type: 'object',
              properties: {
                user_input: {
                  type: 'string',
                  description: '用户的自然语言指令，例如：帮我上架这2个商品到抖音和拼多多，同时去小红书采集女装爆款文案'
                }
              },
              required: ['user_input']
            }
          },
          {
            name: 'get_task_progress',
            description: '获取任务执行进度',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: '会话 ID'
                }
              },
              required: ['session_id']
            }
          },
          {
            name: 'get_task_report',
            description: '获取任务完成报告',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: '会话 ID'
                }
              },
              required: ['session_id']
            }
          },
          {
            name: 'list_sessions',
            description: '列出所有任务会话',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'cancel_session',
            description: '取消正在执行的任务会话',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: '会话 ID'
                }
              },
              required: ['session_id']
            }
          },
          {
            name: 'get_worker_status',
            description: '获取 Worker 池状态',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      }
    })
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.orchestrator.on('task-progress', (data: any) => {
      console.error(`[MCP] 任务进度: ${data.taskId} - ${data.progress}%`)
    })

    this.orchestrator.on('task-complete', (data: any) => {
      console.error(`[MCP] 任务完成: ${data.taskId}`)
    })

    this.orchestrator.on('session-complete', (data: any) => {
      console.error(`[MCP] 会话完成: ${data.sessionId}`)
    })
  }

  /**
   * 设置调用处理器
   */
  private setupCallHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'process_ecommerce_task':
            return await this.handleProcessTask(args.user_input)
          
          case 'get_task_progress':
            return await this.handleGetProgress(args.session_id)
          
          case 'get_task_report':
            return await this.handleGetReport(args.session_id)
          
          case 'list_sessions':
            return await this.handleListSessions()
          
          case 'cancel_session':
            return await this.handleCancelSession(args.session_id)
          
          case 'get_worker_status':
            return await this.handleGetWorkerStatus()
          
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ],
          isError: true
        }
      }
    })
  }

  /**
   * 处理任务请求
   */
  private async handleProcessTask(userInput: string): Promise<any> {
    console.error(`[MCP] 处理任务: ${userInput}`)
    
    const session = await this.orchestrator.processUserRequest(userInput)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            session_id: session.id,
            message: `任务已创建，共 ${session.groups.length} 个任务组`,
            groups: session.groups.map(g => ({
              id: g.id,
              name: g.name,
              type: g.type,
              tasks: g.tasks.length
            }))
          })
        }
      ]
    }
  }

  /**
   * 获取任务进度
   */
  private async handleGetProgress(sessionId: string): Promise<any> {
    const session = this.orchestrator.getSession(sessionId)
    
    if (!session) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Session not found'
            })
          }
        ],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            session_id: session.id,
            status: session.status,
            progress: session.progress,
            groups: session.groups.map(g => ({
              id: g.id,
              name: g.name,
              status: g.status,
              progress: g.progress,
              completed: g.tasks.filter(t => t.status === 'completed').length,
              failed: g.tasks.filter(t => t.status === 'failed').length,
              total: g.tasks.length
            }))
          })
        }
      ]
    }
  }

  /**
   * 获取任务报告
   */
  private async handleGetReport(sessionId: string): Promise<any> {
    const report = this.orchestrator.generateReport(sessionId)
    
    if (!report) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Session not found'
            })
          }
        ],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            report
          })
        }
      ]
    }
  }

  /**
   * 列出所有会话
   */
  private async handleListSessions(): Promise<any> {
    const sessions = this.orchestrator.getAllSessions()
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessions: sessions.map(s => ({
              id: s.id,
              status: s.status,
              groups: s.groups.length,
              created_at: new Date(s.createdAt).toISOString()
            }))
          })
        }
      ]
    }
  }

  /**
   * 取消会话
   */
  private async handleCancelSession(sessionId: string): Promise<any> {
    await this.orchestrator.cancelSession(sessionId)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Session ${sessionId} has been cancelled`
          })
        }
      ]
    }
  }

  /**
   * 获取 Worker 状态
   */
  private async handleGetWorkerStatus(): Promise<any> {
    // TODO: 从 orchestrator 获取 worker 状态
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            status: 'ready',
            operation_workers: 5,
            collection_workers: 2
          })
        }
      ]
    }
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    this.setupCallHandlers()
    
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    
    console.error('[MCP] 电商任务编排 MCP Server 已启动')
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    this.orchestrator.destroy()
    await this.server.close()
    console.error('[MCP] MCP Server 已停止')
  }
}

// 启动服务器
const server = new EcommerceOrchestratorServer()
server.start().catch(console.error)

// 处理进程信号
process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await server.stop()
  process.exit(0)
})
