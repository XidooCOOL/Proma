import * as React from 'react'
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Terminal,
  Maximize2,
  Minimize2,
  Trash2,
  RotateCcw,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface TaskItem {
  id: string
  name: string
  folderName: string
  images: string[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  error?: string
  productId?: string
  productUrl?: string
  startedAt?: string
  finishedAt?: string
  logs: string[]
}

interface TaskGroup {
  id: string
  platform: string
  platformName: string
  profileId: string
  profileName: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  tasks: TaskItem[]
  startedAt?: string
  finishedAt?: string
  error?: string
}

interface TaskGroupInput {
  platform: string
  platformName: string
  profileId: string
  profileName: string
  tasks: Array<{
    productId: string
    productName: string
    folderName: string
    folderPath: string
    images: string[]
    baseInfo?: {
      title: string
      price: number
      description?: string
    }
    skus?: Array<{
      code: string
      stock: number
      color?: string
      size?: string
    }>
  }>
}

const platformColors: Record<string, string> = {
  pinduoduo: 'bg-red-500',
  douyin: 'bg-pink-500',
  taobao: 'bg-orange-500',
  jd: 'bg-red-600',
  kuaishou: 'bg-orange-500',
}

interface TaskMonitorPanelProps {
  taskGroups?: TaskGroupInput[]
  onTaskGroupsChange?: (groups: TaskGroup[]) => void
  autoStart?: boolean
}

export function TaskMonitorPanel({ taskGroups = [], autoStart = false }: TaskMonitorPanelProps): React.ReactElement {
  const [groups, setGroups] = React.useState<TaskGroup[]>([])
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (taskGroups.length > 0) {
      const newGroups: TaskGroup[] = taskGroups.map((g, idx) => ({
        id: `group-${Date.now()}-${idx}`,
        platform: g.platform,
        platformName: g.platformName,
        profileId: g.profileId,
        profileName: g.profileName,
        status: 'pending',
        progress: 0,
        tasks: g.tasks.map((t, tIdx) => ({
          id: `task-${Date.now()}-${idx}-${tIdx}`,
          name: t.productName,
          folderName: t.folderName,
          images: t.images,
          status: 'pending',
          progress: 0,
          logs: [],
        })),
      }))
      setGroups(newGroups)
      if (autoStart) {
        setTimeout(() => executeGroups(newGroups), 500)
      }
    }
  }, [taskGroups])

  const executeGroups = React.useCallback(async (groupsToExecute: TaskGroup[]) => {
    for (const group of groupsToExecute) {
      await executeGroup(group)
    }
  }, [])

  const executeGroup = async (group: TaskGroup): Promise<void> => {
    updateGroupStatus(group.id, { status: 'running', startedAt: new Date().toISOString() })

    for (const task of group.tasks) {
      updateTaskStatus(group.id, task.id, { status: 'running', startedAt: new Date().toISOString() })
      addTaskLog(group.id, task.id, '开始执行...')

      try {
        const result = await window.electronAPI.executeListing({
          profileId: group.profileId,
          platform: group.platform,
          folderPath: '',
          folderName: task.folderName,
          title: task.name,
          price: 0,
          images: task.images,
        })

        if (result.success) {
          updateTaskStatus(group.id, task.id, {
            status: 'completed',
            progress: 100,
            finishedAt: new Date().toISOString(),
            productId: result.productId,
            productUrl: result.productUrl,
          })
          addTaskLog(group.id, task.id, `完成！商品ID: ${result.productId || 'N/A'}`)
        } else {
          updateTaskStatus(group.id, task.id, {
            status: 'failed',
            finishedAt: new Date().toISOString(),
            error: result.error,
          })
          addTaskLog(group.id, task.id, `失败: ${result.error}`)
        }
      } catch (error) {
        updateTaskStatus(group.id, task.id, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: String(error),
        })
        addTaskLog(group.id, task.id, `异常: ${String(error)}`)
      }

      updateGroupProgress(group.id)
    }

    const finalGroup = groups.find(g => g.id === group.id)
    if (finalGroup) {
      const allCompleted = finalGroup.tasks.every(t => t.status === 'completed')
      const anyFailed = finalGroup.tasks.some(t => t.status === 'failed')
      updateGroupStatus(group.id, {
        status: allCompleted ? 'completed' : anyFailed ? 'failed' : 'completed',
        finishedAt: new Date().toISOString(),
        progress: 100,
      })
    }
  }

  const updateGroupStatus = (groupId: string, updates: Partial<TaskGroup>) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }

  const updateTaskStatus = (groupId: string, taskId: string, updates: Partial<TaskItem>) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        tasks: g.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
      }
    }))
  }

  const updateGroupProgress = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const total = g.tasks.length
      const completed = g.tasks.filter(t => t.status === 'completed' || t.status === 'failed').length
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0
      return { ...g, progress }
    }))
  }

  const addTaskLog = (groupId: string, taskId: string, message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        tasks: g.tasks.map(t => {
          if (t.id !== taskId) return t
          return { ...t, logs: [...t.logs, `[${timestamp}] ${message}`] }
        }),
      }
    }))
  }

  const handleStartAll = () => {
    const pendingGroups = groups.filter(g => g.status === 'pending')
    if (pendingGroups.length === 0) {
      toast.info('没有待执行的任务组')
      return
    }
    executeGroups(pendingGroups)
  }

  const handleStartGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (group) executeGroup(group)
  }

  const handleRetryFailed = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    const failedTasks = group.tasks.filter(t => t.status === 'failed')
    if (failedTasks.length === 0) {
      toast.info('没有失败的任务')
      return
    }

    toast.info(`重试 ${failedTasks.length} 个失败任务...`)

    for (const task of failedTasks) {
      updateTaskStatus(groupId, task.id, { status: 'pending', progress: 0, error: undefined, logs: [] })
    }

    await executeGroup(group)
  }

  const handleSkipFailed = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        tasks: g.tasks.map(t => {
          if (t.status === 'failed') return { ...t, status: 'skipped' }
          return t
        }),
      }
    }))
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const runningGroups = groups.filter(g => g.status === 'running')
  const completedGroups = groups.filter(g => g.status !== 'running' && g.status !== 'pending')
  const pendingGroups = groups.filter(g => g.status === 'pending')

  const totalProgress = groups.length > 0
    ? Math.round(groups.reduce((sum, g) => sum + g.progress, 0) / groups.length)
    : 0

  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0)
  const completedTasks = groups.reduce((sum, g) => sum + g.tasks.filter(t => t.status === 'completed').length, 0)
  const failedTasks = groups.reduce((sum, g) => sum + g.tasks.filter(t => t.status === 'failed').length, 0)

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background p-4 overflow-hidden flex flex-col'
    : 'space-y-4'

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            任务执行
          </h2>
          <p className="text-sm text-muted-foreground">
            {runningGroups.length > 0
              ? `正在执行 ${runningGroups.length} 个任务组`
              : groups.length > 0
                ? `${completedTasks}/${totalTasks} 任务完成`
                : '暂无运行中的任务'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {groups.length > 0 && (
            <div className="flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{completedTasks}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">{failedTasks}</span>
              </div>
              <Progress value={totalProgress} className="w-24 h-2" />
              <span className="text-sm text-muted-foreground">{totalProgress}%</span>
            </div>
          )}
          {pendingGroups.length > 0 && (
            <Button onClick={handleStartAll} size="sm">
              <Play className="mr-2 h-4 w-4" />
              全部开始
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
        <div className={cn('flex flex-col gap-3 overflow-y-auto', isFullscreen ? 'flex-1' : 'w-full')}>
          {/* 运行中的任务组 */}
          {runningGroups.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Play className="h-4 w-4 text-green-500" />
                执行中 ({runningGroups.length})
              </h3>
              {runningGroups.map(group => (
                <TaskGroupCard
                  key={group.id}
                  group={group}
                  expanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  statusIcon={statusIcon}
                />
              ))}
            </div>
          )}

          {/* 待执行 */}
          {pendingGroups.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                待执行 ({pendingGroups.length})
              </h3>
              {pendingGroups.map(group => (
                <TaskGroupCard
                  key={group.id}
                  group={group}
                  expanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  onStart={() => handleStartGroup(group.id)}
                  statusIcon={statusIcon}
                />
              ))}
            </div>
          )}

          {/* 已完成 */}
          {completedGroups.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                已完成 ({completedGroups.length})
              </h3>
              {completedGroups.map(group => (
                <TaskGroupCard
                  key={group.id}
                  group={group}
                  expanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  statusIcon={statusIcon}
                />
              ))}
            </div>
          )}

          {groups.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Terminal className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无任务</p>
                <p className="text-sm text-muted-foreground mt-1">
                  使用「批量导入」开始上架任务
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskGroupCard({
  group,
  expanded,
  onToggle,
  onStart,
  statusIcon,
}: {
  group: TaskGroup
  expanded: boolean
  onToggle: () => void
  onStart?: () => void
  statusIcon: (status: string) => React.ReactElement
}): React.ReactElement {
  const completedCount = group.tasks.filter(t => t.status === 'completed').length
  const failedCount = group.tasks.filter(t => t.status === 'failed').length
  const runningCount = group.tasks.filter(t => t.status === 'running').length

  return (
    <Card className={cn(
      'transition-colors',
      group.status === 'running' && 'border-green-500/50 bg-green-50/30',
      group.status === 'failed' && 'border-red-500/50'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-2 flex-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className={cn('w-2 h-2 rounded-full', platformColors[group.platform])} />
            <span className="font-medium text-sm">{group.platformName}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">{group.profileName}</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600">{completedCount}</span>
              {failedCount > 0 && <span className="text-red-600">{failedCount}</span>}
              {runningCount > 0 && <span className="text-blue-600 animate-pulse">{runningCount}</span>}
              <span className="text-muted-foreground">/ {group.tasks.length}</span>
            </div>
            {statusIcon(group.status)}
            {group.status === 'pending' && onStart && (
              <Button variant="ghost" size="sm" className="h-7" onClick={onStart}>
                <Play className="h-3 w-3" />
              </Button>
            )}
            {group.status !== 'pending' && failedCount > 0 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7" onClick={() => handleRetryFailed(group.id)} title="重试失败">
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => handleSkipFailed(group.id)} title="跳过失败">
                  <SkipForward className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <Progress value={group.progress} className="h-1 mt-2" />
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
          {group.tasks.map(task => (
            <TaskItemRow key={task.id} task={task} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

function TaskItemRow({ task }: { task: TaskItem }): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className={cn(
      'p-2 rounded border transition-colors',
      task.status === 'running' && 'bg-blue-50/50 border-blue-200',
      task.status === 'completed' && 'bg-green-50/50 border-green-200',
      task.status === 'failed' && 'bg-red-50/50 border-red-200',
      task.status === 'skipped' && 'bg-gray-50/50 border-gray-200 opacity-60',
    )}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex-shrink-0">
          {task.images.length > 0 && (
            <img
              src={`file://${task.images[0]}`}
              alt=""
              className="w-full h-full object-cover rounded"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{task.name}</div>
          <div className="text-xs text-muted-foreground">{task.folderName}</div>
        </div>
        <Badge
          variant={task.status === 'completed' ? 'default' : task.status === 'failed' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {task.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
          {task.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
          {task.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          {task.status === 'completed' && '完成'}
          {task.status === 'failed' && '失败'}
          {task.status === 'skipped' && '已跳过'}
          {task.status === 'pending' && '待执行'}
        </Badge>
        {task.productId && (
          <Badge variant="outline" className="text-xs font-mono">
            ID: {task.productId}
          </Badge>
        )}
        {task.logs.length > 0 && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
            <Terminal className="h-3 w-3" />
          </Button>
        )}
      </div>

      {expanded && task.logs.length > 0 && (
        <div className="mt-2 p-2 bg-black/90 text-green-400 font-mono text-xs rounded max-h-24 overflow-y-auto">
          {task.logs.slice(-5).map((log, i) => (
            <div key={i} className="whitespace-pre-wrap">{log}</div>
          ))}
        </div>
      )}

      {task.error && (
        <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs rounded flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {task.error}
        </div>
      )}
    </div>
  )
}
