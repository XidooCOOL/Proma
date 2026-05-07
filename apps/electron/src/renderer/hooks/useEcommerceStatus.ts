/**
 * useEcommerceStatus - 电商状态监控 Hook
 * 
 * 提供实时状态订阅功能：
 * - 任务执行进度
 * - Worker 状态
 * - 店铺在线状态
 * - MCP 连接状态
 */

import { useEffect, useState, useCallback } from 'react'

export interface WorkerProgressEvent {
  workerId: string
  taskId: string
  progress: number
  message: string
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

export interface EcommerceStatus {
  workers: WorkerProgressEvent[]
  tasks: TaskStatusEvent[]
  stores: StoreStatusEvent[]
  mcp: McpStatusEvent | null
}

export function useEcommerceStatus() {
  const [status, setStatus] = useState<EcommerceStatus>({
    workers: [],
    tasks: [],
    stores: [],
    mcp: null,
  })
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // 订阅初始状态
    const subscribe = async () => {
      try {
        const initialStatus = await window.electronAPI.subscribeEcommerceStatus()
        setStatus(initialStatus)
        setConnected(true)
      } catch (error) {
        console.error('[useEcommerceStatus] 订阅失败:', error)
        setConnected(false)
      }
    }
    subscribe()

    // 监听任务进度
    const unsubTaskProgress = window.electronAPI.onEcommerceTaskProgress((event) => {
      setStatus(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.taskId === event.taskId ? event : t)
      }))
    })

    // 监听任务批量更新
    const unsubTasksBatch = window.electronAPI.onEcommerceTasksBatch((event) => {
      setStatus(prev => ({
        ...prev,
        tasks: event.tasks,
      }))
    })

    // 监听 Worker 进度
    const unsubWorkerProgress = window.electronAPI.onEcommerceWorkerProgress((event) => {
      setStatus(prev => {
        const workers = prev.workers.filter(w => w.workerId !== event.workerId)
        if (event.progress < 100) {
          workers.push(event)
        }
        return { ...prev, workers }
      })
    })

    // 监听 Worker 结果
    const unsubWorkerResult = window.electronAPI.onEcommerceWorkerResult((event) => {
      setStatus(prev => ({
        ...prev,
        workers: prev.workers.filter(w => w.workerId !== event.workerId),
      }))
    })

    // 监听店铺状态更新
    const unsubStoreUpdate = window.electronAPI.onEcommerceStoreUpdate((event) => {
      setStatus(prev => {
        const stores = prev.stores.filter(s => s.profileId !== event.profileId)
        stores.push(event)
        return { ...prev, stores }
      })
    })

    // 监听 MCP 状态
    const unsubMcpStatus = window.electronAPI.onEcommerceMcpStatus((event) => {
      setStatus(prev => ({ ...prev, mcp: event }))
    })

    return () => {
      unsubTaskProgress()
      unsubTasksBatch()
      unsubWorkerProgress()
      unsubWorkerResult()
      unsubStoreUpdate()
      unsubMcpStatus()
    }
  }, [])

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      await window.electronAPI.cancelEcommerceTask(taskId)
      return true
    } catch (error) {
      console.error('[useEcommerceStatus] 取消任务失败:', error)
      return false
    }
  }, [])

  return {
    status,
    connected,
    cancelTask,
  }
}

/**
 * useTaskProgress - 单个任务进度 Hook
 */
export function useTaskProgress(taskId: string | null) {
  const [task, setTask] = useState<TaskStatusEvent | null>(null)

  useEffect(() => {
    if (!taskId) {
      setTask(null)
      return
    }

    const fetchStatus = async () => {
      try {
        const status = await window.electronAPI.getEcommerceTaskStatus(taskId)
        if (status) {
          setTask(status)
        }
      } catch (error) {
        console.error('[useTaskProgress] 获取状态失败:', error)
      }
    }

    fetchStatus()

    const unsubscribe = window.electronAPI.onEcommerceTaskProgress((event) => {
      if (event.taskId === taskId) {
        setTask(event)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [taskId])

  return task
}

/**
 * useActiveTasks - 活跃任务列表 Hook
 */
export function useActiveTasks() {
  const { status } = useEcommerceStatus()
  
  const activeTasks = status.tasks.filter(
    t => t.status === 'pending' || t.status === 'running'
  )
  
  const recentTasks = status.tasks.filter(
    t => t.status === 'completed' || t.status === 'failed'
  ).slice(-10) // 最近10个

  return {
    activeTasks,
    recentTasks,
    totalActive: activeTasks.length,
  }
}

/**
 * useStoreStatus - 店铺状态 Hook
 */
export function useStoreStatus() {
  const { status } = useEcommerceStatus()
  
  const onlineStores = status.stores.filter(s => s.status === 'online' && s.loggedIn)
  const offlineStores = status.stores.filter(s => s.status !== 'online' || !s.loggedIn)

  return {
    stores: status.stores,
    onlineStores,
    offlineStores,
    totalOnline: onlineStores.length,
  }
}

/**
 * useMcpConnection - MCP 连接状态 Hook
 */
export function useMcpConnection() {
  const { status, connected } = useEcommerceStatus()
  
  return {
    connected: status.mcp?.connected ?? false,
    serverName: status.mcp?.serverName ?? '未连接',
    error: status.mcp?.error,
    isConnecting: connected && !status.mcp,
  }
}
