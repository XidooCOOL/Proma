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
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  error?: string
  startedAt?: string
  finishedAt?: string
}

interface TaskGroup {
  id: string
  platform: string
  platformName: string
  profileId: string
  profileName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  tasks: TaskItem[]
  startedAt?: string
  finishedAt?: string
  logs: string[]
  error?: string
}

interface TaskLog {
  id: string
  type: string
  profileId?: string
  startedAt: string
  finishedAt?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  items: { total: number; success: number; failed: number }
  error?: string
}

const platformColors: Record<string, string> = {
  pinduoduo: 'bg-red-500',
  douyin: 'bg-pink-500',
  taobao: 'bg-orange-500',
  jd: 'bg-red-600',
  kuaishou: 'bg-orange-500',
}

const platformNames: Record<string, string> = {
  pinduoduo: '拼多多',
  douyin: '抖音',
  taobao: '淘宝',
  jd: '京东',
  kuaishou: '快手',
}

export function TaskMonitorPanel(): React.ReactElement {
  const [taskGroups, setTaskGroups] = React.useState<TaskGroup[]>([])
  const [historicalTasks, setHistoricalTasks] = React.useState<TaskLog[]>([])
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const loadHistoricalTasks = React.useCallback(async () => {
    setLoading(true)
    try {
      const tasks = await window.electronAPI.getRecentTaskLogs(50)
      setHistoricalTasks(tasks || [])
    } catch (error) {
      console.error('[TaskMonitor] 加载历史任务失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadHistoricalTasks()
  }, [loadHistoricalTasks])

  React.useEffect(() => {
    const unsubscribe = window.electronAPI.onEcommerceTaskProgress((data: any) => {
      if (data.type === 'start') {
        setTaskGroups(prev => [...prev, {
          id: data.taskId,
          platform: data.platform,
          platformName: platformNames[data.platform] || data.platform,
          profileId: data.profileId,
          profileName: data.profileName,
          status: 'running',
          progress: 0,
          tasks: [],
          logs: [],
        }])
      } else if (data.type === 'progress') {
        setTaskGroups(prev => prev.map(g => {
          if (g.id === data.taskId) {
            return {
              ...g,
              progress: data.progress,
              logs: [...g.logs, data.message].slice(-100),
            }
          }
          return g
        }))
      } else if (data.type === 'complete') {
        setTaskGroups(prev => prev.map(g => {
          if (g.id === data.taskId) {
            return { ...g, status: 'completed', progress: 100, finishedAt: new Date().toISOString() }
          }
          return g
        }))
      } else if (data.type === 'error') {
        setTaskGroups(prev => prev.map(g => {
          if (g.id === data.taskId) {
            return { ...g, status: 'failed', error: data.error, finishedAt: new Date().toISOString() }
          }
          return g
        }))
      }
    })

    return () => unsubscribe()
  }, [])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const runningGroups = taskGroups.filter(g => g.status === 'running')
  const completedGroups = taskGroups.filter(g => g.status !== 'running')

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
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
            任务监控
          </h2>
          <p className="text-sm text-muted-foreground">
            {runningGroups.length > 0 ? `正在执行 ${runningGroups.length} 个任务` : '暂无运行中的任务'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadHistoricalTasks}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            历史
          </Button>
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
        <div className={cn('flex flex-col gap-4 overflow-y-auto', isFullscreen ? 'flex-1' : 'w-1/2')}>
          {/* 运行中的任务 */}
          {runningGroups.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Play className="h-4 w-4 text-green-500" />
                运行中 ({runningGroups.length})
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

          {/* 已完成的任务 */}
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

          {runningGroups.length === 0 && completedGroups.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Terminal className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无任务</p>
                <p className="text-sm text-muted-foreground mt-1">
                  使用商品导入向导开始批量上架
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 历史记录 */}
        <div className={cn('border rounded-lg overflow-hidden flex flex-col', isFullscreen ? 'w-80' : 'hidden')}>
          <div className="p-2 border-b bg-muted/50">
            <h3 className="text-sm font-medium">历史任务</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {historicalTasks.map(task => (
                <div
                  key={task.id}
                  className="p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {statusIcon(task.status)}
                    <span className="text-sm truncate flex-1">{task.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.items.success}/{task.items.total} 成功</span>
                    <Progress value={task.progress} className="h-1 flex-1" />
                  </div>
                </div>
              ))}
              {historicalTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">暂无历史记录</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

function TaskGroupCard({
  group,
  expanded,
  onToggle,
  statusIcon,
}: {
  group: TaskGroup
  expanded: boolean
  onToggle: () => void
  statusIcon: (status: string) => React.ReactElement
}): React.ReactElement {
  return (
    <Card className={cn(
      'transition-colors',
      group.status === 'running' && 'border-green-500/50 bg-green-50/30',
      group.status === 'failed' && 'border-red-500/50'
    )}>
      <CardHeader className="pb-2">
        <button onClick={onToggle} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className={cn('w-2 h-2 rounded-full', platformColors[group.platform])} />
            <span className="font-medium text-sm">{group.platformName}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">{group.profileName}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon(group.status)}
            <span className="text-sm">{group.progress}%</span>
          </div>
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        <Progress value={group.progress} className="h-1.5" />
        
        {expanded && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{group.tasks.length} 个任务</span>
              {group.startedAt && (
                <span>开始于 {new Date(group.startedAt).toLocaleTimeString()}</span>
              )}
            </div>

            {group.logs.length > 0 && (
              <div className="bg-black/90 text-green-400 font-mono text-xs p-2 rounded max-h-32 overflow-y-auto">
                {group.logs.slice(-10).map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))}
              </div>
            )}

            {group.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                {group.error}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
