/**
 * 电商状态监控服务
 * 
 * 实时推送以下状态变化：
 * 1. Worker 执行状态（进度、结果）
 * 2. 店铺登录状态
 * 3. MCP 连接状态
 * 4. 任务执行状态
 */

import { ipcMain, BrowserWindow } from 'electron'
import { EventEmitter } from 'events'

// 事件类型定义
export interface WorkerProgressEvent {
  workerId: string
  taskId: string
  progress: number
  message: string
  timestamp: number
}

export interface WorkerResultEvent {
  workerId: string
  taskId: string
  success: boolean
  result?: any
  error?: string
  timestamp: number
}

export interface StoreStatusEvent {
  profileId: string
  platform: string
  status: 'online' | 'offline' | 'error'
  loggedIn: boolean
  lastActivity?: number
}

export interface McpStatusEvent {
  connected: boolean
  serverName: string
  error?: string
  timestamp: number
}

export interface TaskStatusEvent {
  taskId: string
  type: 'product-listing' | 'content-collection' | 'order-management' | 'inventory-update'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  message?: string
  result?: any
  error?: string
}

// 状态管理器
class EcommerceStatusMonitor extends EventEmitter {
  private windows: Set<BrowserWindow> = new Set()
  private workerStatuses: Map<string, WorkerProgressEvent> = new Map()
  private taskStatuses: Map<string, TaskStatusEvent> = new Map()
  private storeStatuses: Map<string, StoreStatusEvent> = new Map()
  private mcpStatus: McpStatusEvent | null = null

  constructor() {
    super()
    this.startHeartbeat()
  }

  // 注册窗口
  registerWindow(window: BrowserWindow) {
    this.windows.add(window)
    window.on('closed', () => {
      this.windows.delete(window)
    })
    // 发送当前状态
    this.sendCurrentStatus(window)
  }

  // 发送当前所有状态到指定窗口
  private sendCurrentStatus(window: BrowserWindow) {
    if (window.isDestroyed()) return

    // 发送 Worker 状态
    window.webContents.send('ecommerce:worker-status', {
      workers: Array.from(this.workerStatuses.values())
    })

    // 发送任务状态
    window.webContents.send('ecommerce:task-status', {
      tasks: Array.from(this.taskStatuses.values())
    })

    // 发送店铺状态
    window.webContents.send('ecommerce:store-status', {
      stores: Array.from(this.storeStatuses.values())
    })

    // 发送 MCP 状态
    if (this.mcpStatus) {
      window.webContents.send('ecommerce:mcp-status', this.mcpStatus)
    }
  }

  // 广播到所有窗口
  private broadcast(channel: string, data: any) {
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    }
  }

  // 更新 Worker 进度
  updateWorkerProgress(event: WorkerProgressEvent) {
    this.workerStatuses.set(event.workerId, event)
    this.broadcast('ecommerce:worker-progress', event)
  }

  // Worker 执行完成
  workerCompleted(event: WorkerResultEvent) {
    this.workerStatuses.delete(event.workerId)
    this.broadcast('ecommerce:worker-result', event)
  }

  // 更新任务状态
  updateTaskStatus(event: TaskStatusEvent) {
    this.taskStatuses.set(event.taskId, event)
    this.broadcast('ecommerce:task-progress', event)

    // 如果完成或失败，从活跃列表移除
    if (event.status === 'completed' || event.status === 'failed') {
      setTimeout(() => {
        this.taskStatuses.delete(event.taskId)
      }, 60000) // 1分钟后从列表移除
    }
  }

  // 更新店铺状态
  updateStoreStatus(event: StoreStatusEvent) {
    this.storeStatuses.set(event.profileId, event)
    this.broadcast('ecommerce:store-updated', event)
  }

  // 更新 MCP 状态
  updateMcpStatus(event: McpStatusEvent) {
    this.mcpStatus = event
    this.broadcast('ecommerce:mcp-status', event)
  }

  // 批量更新任务状态
  updateTasksBatch(tasks: TaskStatusEvent[]) {
    for (const task of tasks) {
      this.taskStatuses.set(task.taskId, task)
    }
    this.broadcast('ecommerce:tasks-batch', { tasks: Array.from(this.taskStatuses.values()) })
  }

  // 获取当前状态
  getCurrentStatus() {
    return {
      workers: Array.from(this.workerStatuses.values()),
      tasks: Array.from(this.taskStatuses.values()),
      stores: Array.from(this.storeStatuses.values()),
      mcp: this.mcpStatus,
    }
  }

  // 心跳检测 - 定期检查状态
  private startHeartbeat() {
    setInterval(() => {
      // 检查 Worker 超时
      const now = Date.now()
      for (const [workerId, status] of this.workerStatuses) {
        if (status.timestamp && now - status.timestamp > 60000) {
          // Worker 超过1分钟没更新，可能是卡住了
          this.emit('worker-timeout', { workerId, lastStatus: status })
        }
      }
    }, 30000) // 每30秒检查一次
  }
}

export const ecommerceStatusMonitor = new EcommerceStatusMonitor()

/**
 * 注册电商状态监控 IPC 处理器
 */
export function registerEcommerceStatusHandlers() {
  // 订阅状态变化（前端主动订阅）
  ipcMain.handle('ecommerce:subscribe-status', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      ecommerceStatusMonitor.registerWindow(window)
    }
    return ecommerceStatusMonitor.getCurrentStatus()
  })

  // 获取当前状态
  ipcMain.handle('ecommerce:get-status', async () => {
    return ecommerceStatusMonitor.getCurrentStatus()
  })

  // 获取特定任务状态
  ipcMain.handle('ecommerce:get-task-status', async (_, taskId: string) => {
    return ecommerceStatusMonitor.getCurrentStatus().tasks.find(t => t.taskId === taskId)
  })

  // 取消任务
  ipcMain.handle('ecommerce:cancel-task', async (_, taskId: string) => {
    ecommerceStatusMonitor.emit('cancel-task', { taskId })
    return { success: true }
  })

  console.log('[EcommerceStatus] IPC 处理器已注册')
}

// 便捷函数：更新任务进度
export function emitTaskProgress(
  taskId: string,
  type: TaskStatusEvent['type'],
  progress: number,
  message: string
) {
  ecommerceStatusMonitor.updateTaskStatus({
    taskId,
    type,
    status: 'running',
    progress,
    message,
  })
}

// 便捷函数：任务完成
export function emitTaskComplete(taskId: string, type: TaskStatusEvent['type'], result: any) {
  ecommerceStatusMonitor.updateTaskStatus({
    taskId,
    type,
    status: 'completed',
    progress: 100,
    message: '执行完成',
    result,
  })
}

// 便捷函数：任务失败
export function emitTaskError(taskId: string, type: TaskStatusEvent['type'], error: string) {
  ecommerceStatusMonitor.updateTaskStatus({
    taskId,
    type,
    status: 'failed',
    message: '执行失败',
    error,
  })
}

// 便捷函数：更新店铺状态
export function emitStoreStatus(profileId: string, platform: string, status: StoreStatusEvent['status'], loggedIn: boolean) {
  ecommerceStatusMonitor.updateStoreStatus({
    profileId,
    platform,
    status,
    loggedIn,
    lastActivity: Date.now(),
  })
}
