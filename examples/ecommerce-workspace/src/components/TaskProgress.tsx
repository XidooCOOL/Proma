/**
 * 任务进度展示组件
 * 
 * 实时展示多任务并行执行进度
 */

import React, { useState, useEffect } from 'react'
import {
  OverallProgress,
  GroupProgress,
  TaskSession,
} from './types'

interface TaskProgressProps {
  sessionId: string
  onComplete?: (report: any) => void
}

export function TaskProgress({ sessionId, onComplete }: TaskProgressProps) {
  const [progress, setProgress] = useState<OverallProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟 WebSocket 连接
    const ws = connectWebSocket(sessionId)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'progress-update') {
        setProgress(data.progress)
        setIsLoading(false)
        
        if (data.progress.overallProgress === 100) {
          onComplete?.(data.report)
        }
      }
    }

    return () => {
      ws.close()
    }
  }, [sessionId])

  if (isLoading || !progress) {
    return <ProgressSkeleton />
  }

  return (
    <div className="task-progress-container space-y-6 p-6 bg-background rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📊 任务进度</h2>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            任务组: {progress.totalGroups}
          </Badge>
          <Badge variant="outline">
            已完成: {progress.completedGroups}
          </Badge>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>总体进度</span>
          <span className="font-medium">{progress.overallProgress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Time Estimate */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <ClockIcon className="w-4 h-4" />
        <span>预计剩余时间: {formatDuration(progress.estimatedTotalTime)}</span>
      </div>

      {/* Group Progress */}
      <div className="space-y-4">
        {progress.groups.map((group) => (
          <GroupProgressCard key={group.groupId} group={group} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button variant="outline" size="sm">
          <PauseIcon className="w-4 h-4 mr-2" />
          暂停
        </Button>
        <Button variant="outline" size="sm" className="text-destructive">
          <StopIcon className="w-4 h-4 mr-2" />
          取消
        </Button>
      </div>
    </div>
  )
}

interface GroupProgressCardProps {
  group: GroupProgress
}

function GroupProgressCard({ group }: GroupProgressCardProps) {
  const statusColors = {
    pending: 'bg-gray-400',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500'
  }

  const statusLabels = {
    pending: '⏳ 等待中',
    running: '🔄 进行中',
    completed: '✅ 已完成',
    failed: '❌ 失败'
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GroupIcon type={group.type} />
          <span className="font-medium">{group.name}</span>
        </div>
        <Badge variant={group.status === 'completed' ? 'default' : 'secondary'}>
          {statusLabels[group.status]}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>进度</span>
          <span className="font-medium">
            {group.completedTasks}/{group.totalTasks} ({group.progress}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColors[group.status]} transition-all duration-300`}
            style={{ width: `${group.progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>✅ 完成: {group.completedTasks}</span>
        <span>❌ 失败: {group.failedTasks}</span>
        <span>⏳ 剩余: {group.totalTasks - group.completedTasks - group.failedTasks}</span>
      </div>

      {/* Current Task */}
      {group.currentTask && (
        <div className="flex items-center gap-2 text-sm">
          <LoaderIcon className="w-4 h-4 animate-spin" />
          <span className="text-muted-foreground">
            当前: {group.currentTask}
          </span>
        </div>
      )}
    </div>
  )
}

// ===== Icons =====

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  )
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function GroupIcon({ type }: { type: 'operation' | 'collection' }) {
  if (type === 'operation') {
    return <span className="text-lg">📦</span>
  }
  return <span className="text-lg">📝</span>
}

// ===== Helpers =====

function Badge({ variant = 'default', children, className }: any) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border bg-background'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className || ''}`}>
      {children}
    </span>
  )
}

function Button({ variant = 'default', size = 'default', children, className, ...props }: any) {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border bg-background hover:bg-accent',
    ghost: 'hover:bg-accent',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  }

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-6'
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

function ProgressSkeleton() {
  return (
    <div className="task-progress-skeleton space-y-6 p-6">
      <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 w-full bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function formatDuration(ms?: number): string {
  if (!ms) return '计算中...'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${seconds}秒`
}

// ===== WebSocket Connection =====

function connectWebSocket(sessionId: string): WebSocket {
  // 模拟 WebSocket 连接
  // 实际使用: return new WebSocket(`ws://localhost:3000/ws/tasks/${sessionId}`)
  
  return {
    onmessage: null,
    close: () => {},
    send: () => {}
  } as any
}

// ===== Task Report =====

interface TaskReportProps {
  report: any
}

export function TaskReport({ report }: TaskReportProps) {
  return (
    <div className="task-report space-y-6 p-6 bg-background rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">✅ 任务完成报告</h2>
        <Badge variant="default">完成</Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总任务" value={report.summary.totalTasks} />
        <StatCard label="已完成" value={report.summary.completedTasks} variant="success" />
        <StatCard label="失败" value={report.summary.failedTasks} variant="error" />
        <StatCard label="耗时" value={formatDuration(report.summary.duration)} />
      </div>

      {/* Operations */}
      {report.operations?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            <span>📦</span> 商品上架
          </h3>
          <div className="border rounded-lg divide-y">
            {report.operations.map((op: any, i: number) => (
              <div key={i} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{op.platform}</span>
                  <span className="mx-2 text-muted-foreground">-</span>
                  <span>{op.action}</span>
                </div>
                <Badge variant={op.status === 'completed' ? 'default' : 'secondary'}>
                  {op.status === 'completed' ? '✅ 成功' : '❌ 失败'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections */}
      {report.collections?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            <span>📝</span> 内容采集
          </h3>
          <div className="border rounded-lg divide-y">
            {report.collections.map((col: any, i: number) => (
              <div key={i} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{col.source}</span>
                  <span className="mx-2 text-muted-foreground">-</span>
                  <span>{col.action}</span>
                </div>
                <Badge variant={col.status === 'completed' ? 'default' : 'secondary'}>
                  {col.status === 'completed' ? '✅ 成功' : '❌ 失败'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button variant="default">
          <DownloadIcon className="w-4 h-4 mr-2" />
          导出报告
        </Button>
        <Button variant="outline">
          <ShareIcon className="w-4 h-4 mr-2" />
          分享
        </Button>
      </div>
    </div>
  )
}

function StatCard({ label, value, variant }: any) {
  const colors = {
    default: 'text-foreground',
    success: 'text-green-600',
    error: 'text-red-600'
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className={`text-2xl font-bold ${colors[variant || 'default']}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}
