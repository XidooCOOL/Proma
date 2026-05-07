/**
 * 任务编排器 (TaskOrchestrator)
 * 
 * 负责：
 * 1. 理解用户意图
 * 2. 拆解任务
 * 3. 分配任务到 Worker
 * 4. 协调执行
 * 5. 汇总结果
 */

import EventEmitter from 'events'
import { v4 as uuidv4 } from 'uuid'
import {
  Task,
  TaskType,
  TaskSession,
  TaskGroup,
  UserIntent,
  ParsedOperation,
  ParsedCollection,
  Product,
  Platform,
  createTask,
  createTaskGroup,
  calculateGroupProgress,
  TaskEvent,
  OverallProgress,
  GroupProgress,
} from '../types'
import { WorkerPool } from './worker-pool'
import { IntentParser } from './intent-parser'

export interface OrchestratorConfig {
  maxConcurrentGroups: number
  enableAutoRetry: boolean
  defaultTimeout: number
  progressUpdateInterval: number
}

const defaultConfig: OrchestratorConfig = {
  maxConcurrentGroups: 10,
  enableAutoRetry: true,
  defaultTimeout: 60000,
  progressUpdateInterval: 1000,
}

export class TaskOrchestrator extends EventEmitter {
  private config: OrchestratorConfig
  private workerPool: WorkerPool
  private intentParser: IntentParser
  private sessions: Map<string, TaskSession> = new Map()
  private progressInterval?: NodeJS.Timeout

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super()
    this.config = { ...defaultConfig, ...config }
    this.workerPool = new WorkerPool()
    this.intentParser = new IntentParser()
    
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.workerPool.on('worker:task-start', (data: any) => {
      this.emit('task-start', data)
    })

    this.workerPool.on('worker:task-progress', (data: any) => {
      this.emit('task-progress', data)
      this.updateSessionProgress(data.sessionId)
    })

    this.workerPool.on('worker:task-complete', (data: any) => {
      this.emit('task-complete', data)
      this.checkGroupCompletion(data.sessionId, data.groupId)
    })

    this.workerPool.on('worker:task-failed', (data: any) => {
      this.emit('task-failed', data)
      this.handleTaskFailure(data)
    })
  }

  /**
   * 处理用户指令
   */
  async processUserRequest(userInput: string, userId: string = 'default'): Promise<TaskSession> {
    const sessionId = uuidv4()

    console.log(`[Orchestrator] 开始处理用户请求: ${userInput}`)
    console.log(`[Orchestrator] Session ID: ${sessionId}`)

    try {
      const intent = await this.intentParser.parse(userInput)
      console.log(`[Orchestrator] 解析意图成功:`, intent)

      const session = await this.createSession(sessionId, userId, userInput, intent)
      console.log(`[Orchestrator] Session 创建成功`)

      this.sessions.set(sessionId, session)
      this.emit('session-start', { sessionId, intent })

      await this.startSession(session)
      console.log(`[Orchestrator] Session 启动成功`)

      return session
    } catch (error) {
      console.error(`[Orchestrator] 处理失败:`, error)
      throw error
    }
  }

  /**
   * 创建会话
   */
  private async createSession(
    sessionId: string,
    userId: string,
    userInput: string,
    intent: UserIntent
  ): Promise<TaskSession> {
    const groups: TaskGroup[] = []
    const allTasks: Task[] = []

    // 处理运营任务
    if (intent.parsed.operations.length > 0) {
      const { groups: opGroups, tasks: opTasks } = this.createOperationGroups(intent.parsed.operations)
      groups.push(...opGroups)
      allTasks.push(...opTasks)
    }

    // 处理采集任务
    if (intent.parsed.collections.length > 0) {
      const { groups: colGroups, tasks: colTasks } = this.createCollectionGroups(intent.parsed.collections)
      groups.push(...colGroups)
      allTasks.push(...colTasks)
    }

    const progress: OverallProgress = {
      sessionId,
      totalGroups: groups.length,
      completedGroups: 0,
      groups: groups.map(g => ({
        groupId: g.id,
        type: g.type,
        name: g.name,
        status: 'pending',
        totalTasks: g.tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        progress: 0
      })),
      overallProgress: 0,
      startTime: Date.now()
    }

    return {
      id: sessionId,
      userId,
      groups,
      status: 'pending',
      progress,
      createdAt: Date.now(),
      metadata: {
        userInput,
        intent
      }
    }
  }

  /**
   * 创建运营任务组
   */
  private createOperationGroups(operations: ParsedOperation[]): { groups: TaskGroup[], tasks: Task[] } {
    const groups: TaskGroup[] = []
    const allTasks: Task[] = []

    for (const operation of operations) {
      for (const platform of operation.targets) {
        for (const product of operation.products) {
          const task = createTask({
            type: 'operation',
            action: operation.action,
            subtype: operation.action as any,
            target: { platform, store: `store-${platform}` },
            params: { product },
            maxRetries: 3
          })

          allTasks.push(task)
        }
      }

      const groupTasks = allTasks.filter(t => 
        t.type === 'operation' && 
        operation.targets.includes(t.target.platform)
      )

      const group = createTaskGroup(
        'operation',
        `${operation.action} - ${operation.targets.join(', ')}`,
        groupTasks
      )

      groups.push(group)
    }

    return { groups, tasks: allTasks }
  }

  /**
   * 创建采集任务组
   */
  private createCollectionGroups(collections: ParsedCollection[]): { groups: TaskGroup[], tasks: Task[] } {
    const groups: TaskGroup[] = []
    const allTasks: Task[] = []

    for (const collection of collections) {
      const task = createTask({
        type: 'collection',
        action: collection.action,
        subtype: collection.action as any,
        target: { platform: collection.sources[0] },
        params: {
          keywords: collection.keywords,
          count: collection.count || 50,
          filters: collection.filters
        },
        maxRetries: 3
      })

      allTasks.push(task)

      const group = createTaskGroup(
        'collection',
        `${collection.action} - ${collection.sources.join(', ')}`,
        [task]
      )

      groups.push(group)
    }

    return { groups, tasks: allTasks }
  }

  /**
   * 启动会话
   */
  private async startSession(session: TaskSession): Promise<void> {
    session.status = 'running'

    for (const group of session.groups) {
      group.status = 'running'
      
      for (const task of group.tasks) {
        task.status = 'pending'
      }
    }

    this.emit('session-start', { sessionId: session.id })
    this.startProgressUpdater()

    await this.executeGroups(session)
  }

  /**
   * 执行任务组
   */
  private async executeGroups(session: TaskSession): Promise<void> {
    const promises: Promise<void>[] = []

    for (const group of session.groups) {
      if (group.type === 'operation') {
        const promise = this.executeOperationGroup(session.id, group)
        promises.push(promise)
      } else if (group.type === 'collection') {
        const promise = this.executeCollectionGroup(session.id, group)
        promises.push(promise)
      }
    }

    await Promise.all(promises)

    const allCompleted = session.groups.every(g => 
      g.status === 'completed' || g.status === 'failed'
    )
    
    session.status = allCompleted ? 'completed' : 'failed'
    session.completedAt = Date.now()

    this.emit('session-complete', { sessionId: session.id, session })
    this.stopProgressUpdater()
  }

  /**
   * 执行运营任务组
   */
  private async executeOperationGroup(sessionId: string, group: TaskGroup): Promise<void> {
    console.log(`[Orchestrator] 开始执行运营任务组: ${group.name}`)

    for (const task of group.tasks) {
      try {
        await this.workerPool.executeTask(sessionId, group.id, task)
      } catch (error) {
        console.error(`[Orchestrator] 任务执行失败:`, error)
        task.status = 'failed'
        task.result = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 执行采集任务组
   */
  private async executeCollectionGroup(sessionId: string, group: TaskGroup): Promise<void> {
    console.log(`[Orchestrator] 开始执行采集任务组: ${group.name}`)

    for (const task of group.tasks) {
      try {
        await this.workerPool.executeTask(sessionId, group.id, task)
      } catch (error) {
        console.error(`[Orchestrator] 任务执行失败:`, error)
        task.status = 'failed'
        task.result = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 检查任务组完成状态
   */
  private checkGroupCompletion(sessionId: string, groupId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const group = session.groups.find(g => g.id === groupId)
    if (!group) return

    const allCompleted = group.tasks.every(t => 
      t.status === 'completed' || t.status === 'failed'
    )

    if (allCompleted) {
      group.status = 'completed'
      group.completedAt = Date.now()
      group.progress = 100

      const completedCount = session.groups.filter(g => g.status === 'completed').length
      session.progress.completedGroups = completedCount

      this.emit('group-complete', { sessionId, groupId, group })
      
      if (completedCount === session.groups.length) {
        session.status = 'completed'
        session.completedAt = Date.now()
        this.emit('session-complete', { sessionId, session })
      }
    }

    this.updateSessionProgress(sessionId)
  }

  /**
   * 处理任务失败
   */
  private handleTaskFailure(data: { sessionId: string; taskId: string; error: string }): void {
    const session = this.sessions.get(data.sessionId)
    if (!session) return

    let task: Task | undefined
    for (const group of session.groups) {
      task = group.tasks.find(t => t.id === data.taskId)
      if (task) break
    }

    if (!task) return

    if (task.retryCount < task.maxRetries) {
      task.retryCount++
      task.status = 'pending'
      console.log(`[Orchestrator] 任务 ${task.id} 失败，准备重试 (${task.retryCount}/${task.maxRetries})`)
      this.emit('task-retry', { sessionId: data.sessionId, taskId: data.taskId, retryCount: task.retryCount })
    } else {
      task.status = 'failed'
      console.log(`[Orchestrator] 任务 ${task.id} 重试次数用尽，标记为失败`)
    }
  }

  /**
   * 更新会话进度
   */
  private updateSessionProgress(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    for (const group of session.groups) {
      const progress = calculateGroupProgress(group)
      group.progress = progress

      const groupProgress = session.progress.groups.find(g => g.groupId === group.id)
      if (groupProgress) {
        groupProgress.progress = progress
        groupProgress.completedTasks = group.tasks.filter(t => t.status === 'completed').length
        groupProgress.failedTasks = group.tasks.filter(t => t.status === 'failed').length
        groupProgress.status = group.status
      }
    }

    const totalProgress = session.groups.reduce((sum, g) => sum + g.progress, 0)
    session.progress.overallProgress = Math.round(totalProgress / session.groups.length)

    this.emit('progress-update', {
      sessionId,
      progress: session.progress
    })
  }

  /**
   * 启动进度更新器
   */
  private startProgressUpdater(): void {
    if (this.progressInterval) return

    this.progressInterval = setInterval(() => {
      for (const session of this.sessions.values()) {
        if (session.status === 'running') {
          this.updateSessionProgress(session.id)
        }
      }
    }, this.config.progressUpdateInterval)
  }

  /**
   * 停止进度更新器
   */
  private stopProgressUpdater(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = undefined
    }
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): TaskSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): TaskSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * 取消会话
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    for (const group of session.groups) {
      group.status = 'failed'
      for (const task of group.tasks) {
        if (task.status !== 'completed') {
          task.status = 'cancelled'
        }
      }
    }

    session.status = 'failed'
    session.completedAt = Date.now()

    this.emit('session-cancelled', { sessionId })
  }

  /**
   * 生成报告
   */
  generateReport(sessionId: string): any {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const operationResults = session.groups
      .filter(g => g.type === 'operation')
      .flatMap(g => g.tasks.map(t => ({
        platform: t.target.platform,
        action: t.action,
        status: t.status,
        result: t.result
      })))

    const collectionResults = session.groups
      .filter(g => g.type === 'collection')
      .flatMap(g => g.tasks.map(t => ({
        source: t.target.platform,
        action: t.action,
        status: t.status,
        result: t.result
      })))

    return {
      summary: {
        sessionId: session.id,
        status: session.status,
        totalTasks: session.groups.reduce((sum, g) => sum + g.tasks.length, 0),
        completedTasks: session.groups.reduce(
          (sum, g) => sum + g.tasks.filter(t => t.status === 'completed').length, 
          0
        ),
        failedTasks: session.groups.reduce(
          (sum, g) => sum + g.tasks.filter(t => t.status === 'failed').length, 
          0
        ),
        duration: session.completedAt 
          ? session.completedAt - session.createdAt 
          : Date.now() - session.createdAt
      },
      operations: operationResults,
      collections: collectionResults,
      groups: session.groups.map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        status: g.status,
        tasks: g.tasks.length,
        completed: g.tasks.filter(t => t.status === 'completed').length,
        failed: g.tasks.filter(t => t.status === 'failed').length
      }))
    }
  }

  /**
   * 清理
   */
  destroy(): void {
    this.stopProgressUpdater()
    this.workerPool.destroy()
    this.sessions.clear()
  }
}
