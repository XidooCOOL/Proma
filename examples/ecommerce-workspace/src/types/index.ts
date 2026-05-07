/**
 * 电商多任务并行系统 - 类型定义
 * 
 * 定义任务、Worker、进度等核心数据结构
 */

// ===== 任务相关类型 =====

export type TaskType = 'operation' | 'collection'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type OperationType = 'product-listing' | 'order-management' | 'inventory-update'
export type CollectionType = 'content-collection' | 'price-monitoring' | 'competitor-analysis'
export type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'xiaohongshu'

export interface Product {
  id?: string
  title: string
  price: number
  stock?: number
  images?: string[]
  description?: string
  category?: string
  specifications?: Record<string, string>
}

export interface TaskTarget {
  platform?: Platform
  store?: string
  profileId?: string
  source?: string
  keyword?: string
}

export interface TaskParams {
  products?: Product[]
  product?: Product
  keywords?: string[]
  count?: number
  filters?: Record<string, any>
  [key: string]: any
}

export interface TaskResult {
  success: boolean
  message?: string
  data?: any
  error?: string
  timestamp: number
  duration?: number
}

export interface Task {
  id: string
  type: TaskType
  action: string
  subtype?: OperationType | CollectionType
  target: TaskTarget
  params: TaskParams
  status: TaskStatus
  progress: number
  result?: TaskResult
  retryCount: number
  maxRetries: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  workerId?: string
  dependencies?: string[]
  metadata?: Record<string, any>
}

// ===== Worker 相关类型 =====

export type WorkerStatus = 'idle' | 'busy' | 'error' | 'stopped'
export type WorkerType = 'operation' | 'collection' | 'orchestrator'

export interface WorkerConfig {
  id: string
  type: WorkerType
  platform?: Platform
  maxConcurrentTasks: number
  timeout: number
  retryEnabled: boolean
  maxRetries: number
}

export interface WorkerStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageDuration: number
  lastActiveAt: number
}

export interface Worker {
  id: string
  config: WorkerConfig
  status: WorkerStatus
  stats: WorkerStats
  currentTask?: Task
  taskQueue: Task[]
}

// ===== 任务组相关类型 =====

export interface TaskGroup {
  id: string
  type: 'operation' | 'collection'
  name: string
  tasks: Task[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  result?: TaskGroupResult
  createdAt: number
  completedAt?: number
}

export interface TaskGroupResult {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  results: TaskResult[]
  duration: number
}

// ===== 进度相关类型 =====

export interface TaskProgress {
  taskId: string
  status: TaskStatus
  progress: number
  message?: string
  result?: TaskResult
  timestamp: number
}

export interface GroupProgress {
  groupId: string
  type: 'operation' | 'collection'
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalTasks: number
  completedTasks: number
  failedTasks: number
  progress: number
  currentTask?: string
  estimatedTimeRemaining?: number
}

export interface OverallProgress {
  sessionId: string
  totalGroups: number
  completedGroups: number
  groups: GroupProgress[]
  overallProgress: number
  startTime: number
  estimatedTotalTime?: number
}

// ===== 会话相关类型 =====

export interface TaskSession {
  id: string
  userId: string
  groups: TaskGroup[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: OverallProgress
  createdAt: number
  completedAt?: number
  metadata?: {
    userInput?: string
    intent?: any
    settings?: Record<string, any>
  }
}

// ===== 浏览器相关类型 =====

export interface BrowserProfile {
  id: string
  platform: Platform
  storeName: string
  profilePath: string
  status: 'available' | 'in-use' | 'error'
  lastUsedAt?: number
}

export interface BrowserInstance {
  id: string
  profile: BrowserProfile
  browser?: any
  context?: any
  page?: any
  status: 'launching' | 'ready' | 'busy' | 'closed' | 'error'
  currentUrl?: string
}

// ===== 事件相关类型 =====

export type TaskEventType = 
  | 'task-created'
  | 'task-started'
  | 'task-progress'
  | 'task-completed'
  | 'task-failed'
  | 'task-retry'
  | 'task-cancelled'
  | 'group-started'
  | 'group-progress'
  | 'group-completed'
  | 'group-failed'
  | 'worker-status'
  | 'browser-status'
  | 'session-start'
  | 'session-complete'
  | 'session-error'

export interface TaskEvent {
  type: TaskEventType
  sessionId: string
  timestamp: number
  data: any
}

// ===== 意图理解相关类型 =====

export interface UserIntent {
  raw: string
  parsed: {
    operations: ParsedOperation[]
    collections: ParsedCollection[]
  }
  confidence: number
}

export interface ParsedOperation {
  action: OperationType
  targets: Platform[]
  products: Product[]
  constraints?: Record<string, any>
}

export interface ParsedCollection {
  action: CollectionType
  sources: Platform[]
  keywords: string[]
  count?: number
  filters?: Record<string, any>
}

// ===== 配置相关类型 =====

export interface EcommerceConfig {
  platforms: {
    [key in Platform]?: PlatformConfig
  }
  workers: {
    operationWorkerCount: number
    collectionWorkerCount: number
    maxConcurrentTasks: number
    defaultTimeout: number
  }
  browser: {
    maxInstances: number
    defaultProfilePath: string
    headless: boolean
  }
  retry: {
    enabled: boolean
    maxRetries: number
    baseDelay: number
    backoffMultiplier: number
  }
}

export interface PlatformConfig {
  enabled: boolean
  listingUrl: string
  orderUrl: string
  username?: string
  password?: string
  twoFactorEnabled?: boolean
}

// ===== 辅助函数 =====

export function createTask(partial: Partial<Task> & { type: TaskType; action: string; target: TaskTarget }): Task {
  return {
    id: partial.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    params: partial.params || {},
    status: partial.status || 'pending',
    progress: partial.progress || 0,
    retryCount: partial.retryCount || 0,
    maxRetries: partial.maxRetries || 3,
    createdAt: partial.createdAt || Date.now(),
    ...partial
  }
}

export function createTaskGroup(type: 'operation' | 'collection', name: string, tasks: Task[]): TaskGroup {
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    name,
    tasks,
    status: 'pending',
    progress: 0,
    createdAt: Date.now()
  }
}

export function calculateGroupProgress(group: TaskGroup): number {
  if (group.tasks.length === 0) return 0
  const totalProgress = group.tasks.reduce((sum, task) => sum + task.progress, 0)
  return Math.round(totalProgress / group.tasks.length)
}
