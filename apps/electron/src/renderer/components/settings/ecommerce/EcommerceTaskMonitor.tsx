/**
 * EcommerceTaskMonitor - 电商任务实时监控面板
 * 
 * 显示：
 * - 活跃任务列表及进度
 * - Worker 执行状态
 * - 店铺在线状态
 * - MCP 连接状态
 */

import * as React from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Server,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  useEcommerceStatus,
  useActiveTasks,
  useStoreStatus,
  useMcpConnection,
  type TaskStatusEvent,
} from '@/hooks/useEcommerceStatus'

export function EcommerceTaskMonitor(): React.ReactElement {
  const { status, connected, cancelTask } = useEcommerceStatus()
  const { activeTasks, recentTasks, totalActive } = useActiveTasks()
  const { stores, totalOnline } = useStoreStatus()
  const { connected: mcpConnected, serverName, error: mcpError } = useMcpConnection()

  return (
    <div className="space-y-4">
      {/* 状态概览 */}
      <div className="grid grid-cols-4 gap-3">
        {/* MCP 状态 */}
        <StatusCard
          icon={<Server className="h-4 w-4" />}
          title="MCP 服务"
          status={mcpConnected ? 'online' : 'offline'}
          value={mcpConnected ? serverName : '未连接'}
          subValue={mcpError}
        />
        
        {/* 活跃任务 */}
        <StatusCard
          icon={<Activity className="h-4 w-4" />}
          title="活跃任务"
          status={totalActive > 0 ? 'running' : 'idle'}
          value={String(totalActive)}
          subValue={totalActive > 0 ? '执行中' : '空闲'}
        />
        
        {/* 在线店铺 */}
        <StatusCard
          icon={<Store className="h-4 w-4" />}
          title="在线店铺"
          status={totalOnline > 0 ? 'online' : 'offline'}
          value={`${totalOnline}/${stores.length}`}
          subValue={totalOnline > 0 ? '已登录' : '无'}
        />
        
        {/* Worker */}
        <StatusCard
          icon={<Loader2 className="h-4 w-4" />}
          title="Worker"
          status={status.workers.length > 0 ? 'running' : 'idle'}
          value={String(status.workers.length)}
          subValue={status.workers.length > 0 ? '工作中' : '空闲'}
        />
      </div>

      {/* 活跃任务列表 */}
      {activeTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              活跃任务
              <Badge variant="secondary">{activeTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeTasks.map((task) => (
              <TaskItem
                key={task.taskId}
                task={task}
                onCancel={() => cancelTask(task.taskId)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 最近任务 */}
      {recentTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              最近任务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTasks.slice(-5).reverse().map((task) => (
              <RecentTaskItem key={task.taskId} task={task} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 店铺状态 */}
      {stores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="h-4 w-4" />
              店铺状态
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stores.map((store) => (
              <Badge
                key={store.profileId}
                variant={store.loggedIn ? 'default' : 'outline'}
                className={cn(
                  'gap-1',
                  store.loggedIn ? 'bg-green-500' : 'opacity-50'
                )}
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  store.loggedIn ? 'bg-white' : 'bg-muted'
                )} />
                {store.platform}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatusCardProps {
  icon: React.ReactNode
  title: string
  status: 'online' | 'offline' | 'running' | 'idle' | 'error'
  value: string
  subValue?: string | null
}

function StatusCard({ icon, title, status, value, subValue }: StatusCardProps): React.ReactElement {
  const statusColors = {
    online: 'text-green-500',
    offline: 'text-muted-foreground',
    running: 'text-orange-500',
    idle: 'text-muted-foreground',
    error: 'text-red-500',
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg bg-muted', statusColors[status])}>
            {icon}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="font-semibold">{value}</div>
          </div>
        </div>
        {subValue && (
          <div className={cn('text-xs', statusColors[status])}>
            {subValue}
          </div>
        )}
      </div>
    </Card>
  )
}

interface TaskItemProps {
  task: TaskStatusEvent
  onCancel: () => void
}

function TaskItem({ task, onCancel }: TaskItemProps): React.ReactElement {
  const taskIcons = {
    'product-listing': <ShoppingCart className="h-4 w-4" />,
    'content-collection': <Activity className="h-4 w-4" />,
    'order-management': <Store className="h-4 w-4" />,
    'inventory-update': <Activity className="h-4 w-4" />,
  }

  const taskLabels = {
    'product-listing': '商品上架',
    'content-collection': '内容采集',
    'order-management': '订单管理',
    'inventory-update': '库存更新',
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
        {taskIcons[task.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{taskLabels[task.type]}</span>
          <Badge variant="outline" className="text-xs">
            {task.message}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={task.progress || 0} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-10">
            {task.progress || 0}%
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface RecentTaskItemProps {
  task: TaskStatusEvent
}

function RecentTaskItem({ task }: RecentTaskItemProps): React.ReactElement {
  const taskLabels = {
    'product-listing': '商品上架',
    'content-collection': '内容采集',
    'order-management': '订单管理',
    'inventory-update': '库存更新',
  }

  const isSuccess = task.status === 'completed'

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className={cn('p-1.5 rounded-lg', isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')}>
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{taskLabels[task.type]}</span>
        {task.error && (
          <p className="text-xs text-red-500 truncate">{task.error}</p>
        )}
      </div>
      <span className={cn('text-xs', isSuccess ? 'text-green-500' : 'text-red-500')}>
        {isSuccess ? '成功' : '失败'}
      </span>
    </div>
  )
}

/**
 * 紧凑版状态指示器 - 用于 Agent 侧边栏
 */
export function EcommerceStatusIndicator(): React.ReactElement {
  const { totalActive } = useActiveTasks()
  const { totalOnline } = useStoreStatus()
  const { connected: mcpConnected } = useMcpConnection()

  const isHealthy = mcpConnected && totalOnline > 0

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={cn(
        'w-2 h-2 rounded-full',
        isHealthy ? 'bg-green-500' : 'bg-yellow-500'
      )} />
      <span className="text-muted-foreground">
        {mcpConnected ? (
          totalOnline > 0 ? (
            `${totalOnline} 店铺在线`
          ) : (
            '无在线店铺'
          )
        ) : (
          'MCP 未连接'
        )}
      </span>
      {totalActive > 0 && (
        <Badge variant="secondary" className="text-xs ml-1">
          {totalActive} 任务
        </Badge>
      )}
    </div>
  )
}
