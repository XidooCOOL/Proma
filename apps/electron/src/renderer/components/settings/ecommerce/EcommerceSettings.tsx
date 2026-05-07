/**
 * EcommerceSettings - 电商设置页面
 * 
 * 功能：
 * - 多店铺管理（添加、编辑、删除）
 * - 店铺 Profile 状态展示（实时）
 * - MCP 服务器状态监控（实时）
 * - 任务执行状态（实时进度条）
 */

import * as React from 'react'
import {
  Store,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Chrome,
  Settings,
  Eye,
  ExternalLink,
  MoreVertical,
  ShoppingBag,
  Video,
  Activity,
  Loader2,
  Server,
  X,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  useEcommerceStatus,
  useActiveTasks,
  useStoreStatus,
  useMcpConnection,
  type TaskStatusEvent,
} from '@/hooks/useEcommerceStatus'

type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou' | 'other'

interface StoreProfile {
  id: string
  name: string
  slug: string
  platform: Platform
  loginStatus: 'logged_in' | 'pending' | 'expired' | 'never'
  lastLoginTime?: string
  browserProfile: string
  mcpStatus: 'connected' | 'disconnected' | 'starting'
  totalProducts: number
  todayOrders: number
}

const platformConfig: Record<Platform, { icon: React.ReactNode; label: string; color: string }> = {
  pinduoduo: { icon: <ShoppingBag className="h-4 w-4" />, label: '拼多多', color: 'bg-red-500' },
  douyin: { icon: <Video className="h-4 w-4" />, label: '抖音', color: 'bg-pink-500' },
  taobao: { icon: <ShoppingBag className="h-4 w-4" />, label: '淘宝', color: 'bg-orange-500' },
  jd: { icon: <ShoppingBag className="h-4 w-4" />, label: '京东', color: 'bg-red-600' },
  kuaishou: { icon: <Video className="h-4 w-4" />, label: '快手', color: 'bg-orange-500' },
  other: { icon: <Store className="h-4 w-4" />, label: '其他', color: 'bg-gray-500' },
}

export function EcommerceSettings(): React.ReactElement {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const { connected } = useEcommerceStatus()
  const { stores: realTimeStores, onlineStores } = useStoreStatus()
  const { connected: mcpConnected, serverName, error: mcpError } = useMcpConnection()
  const { activeTasks, totalActive } = useActiveTasks()

  const [stores, setStores] = React.useState<StoreProfile[]>([
    {
      id: 'ws-1',
      name: '拼多多店铺A',
      slug: 'pdd-store-a',
      platform: 'pinduoduo',
      loginStatus: 'logged_in',
      lastLoginTime: '2024-01-15',
      browserProfile: 'pdd-store-a',
      mcpStatus: 'connected',
      totalProducts: 156,
      todayOrders: 23,
    },
    {
      id: 'ws-2',
      name: '拼多多店铺B',
      slug: 'pdd-store-b',
      platform: 'pinduoduo',
      loginStatus: 'pending',
      browserProfile: 'pdd-store-b',
      mcpStatus: 'disconnected',
      totalProducts: 0,
      todayOrders: 0,
    },
    {
      id: 'ws-3',
      name: '抖音店铺A',
      slug: 'douyin-store-a',
      platform: 'douyin',
      loginStatus: 'logged_in',
      lastLoginTime: '2024-01-18',
      browserProfile: 'douyin-store-a',
      mcpStatus: 'connected',
      totalProducts: 89,
      todayOrders: 45,
    },
  ])

  const handleCreateStore = React.useCallback((storeData: Partial<StoreProfile>) => {
    const newStore: StoreProfile = {
      id: `ws-${Date.now()}`,
      name: storeData.name || '新店铺',
      slug: storeData.slug || `store-${Date.now()}`,
      platform: storeData.platform || 'other',
      loginStatus: 'never',
      browserProfile: storeData.slug || `store-${Date.now()}`,
      mcpStatus: 'disconnected',
      totalProducts: 0,
      todayOrders: 0,
    }
    
    setStores(prev => [...prev, newStore])
    toast.success(`已创建店铺：${newStore.name}`)
    setCreateDialogOpen(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* 实时状态概览 */}
      <RealtimeStatusBar
        mcpConnected={mcpConnected}
        serverName={serverName}
        mcpError={mcpError}
        totalActive={totalActive}
        activeTasks={activeTasks}
        onlineCount={onlineStores.length}
        totalStores={stores.length}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5" />
            店铺管理
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理多个电商平台的店铺和浏览器 Profile
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加店铺
        </Button>
      </div>

      {/* 实时任务面板 */}
      {activeTasks.length > 0 && (
        <ActiveTasksPanel tasks={activeTasks} />
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stores.length}</div>
            <p className="text-xs text-muted-foreground">总店铺数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {stores.filter(s => s.loginStatus === 'logged_in').length}
            </div>
            <p className="text-xs text-muted-foreground">已登录</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">
              {stores.filter(s => s.loginStatus === 'pending' || s.loginStatus === 'never').length}
            </div>
            <p className="text-xs text-muted-foreground">待登录</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-2">
            <div className={cn(
              'w-2.5 h-2.5 rounded-full',
              mcpConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            )} />
            <div>
              <div className="text-lg font-bold">{mcpConnected ? '已连接' : '未连接'}</div>
              <p className="text-xs text-muted-foreground">MCP 服务</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            可用工具
            <Badge variant="outline" className="ml-2 text-xs">MCP Server</Badge>
            {mcpConnected ? (
              <Badge variant="default" className="ml-auto bg-green-500">在线</Badge>
            ) : (
              <Badge variant="destructive" className="ml-auto">离线</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ToolCard
              name="list_product"
              description="上架商品到电商平台"
              platforms={['拼多多', '抖音', '淘宝', '京东', '快手']}
              disabled={!mcpConnected}
            />
            <ToolCard
              name="collect_trends"
              description="采集社交平台热门内容"
              platforms={['小红书', '抖音', '微博', 'B站']}
              disabled={!mcpConnected}
            />
            <ToolCard
              name="manage_orders"
              description="订单管理、批量发货、退款"
              platforms={['拼多多', '抖音', '淘宝', '京东']}
              disabled={!mcpConnected}
            />
            <ToolCard
              name="update_inventory"
              description="批量更新库存和价格"
              platforms={['拼多多', '抖音', '淘宝', '京东']}
              disabled={!mcpConnected}
            />
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">使用说明：</span>
              在 Agent 模式下，这些工具会自动加载。告诉 AI 你想要的操作（如"帮我上架商品到抖音"），AI 会自动调用对应的工具。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            onDelete={() => {
              setStores(prev => prev.filter(s => s.id !== store.id))
              toast.success(`已删除店铺：${store.name}`)
            }}
          />
        ))}
      </div>

      {/* Create Dialog */}
      <CreateStoreDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreateStore}
      />
    </div>
  )
}

/**
 * 实时状态栏 - 展示 MCP 连接状态和活跃任务
 */
interface RealtimeStatusBarProps {
  mcpConnected: boolean
  serverName: string
  mcpError?: string
  totalActive: number
  activeTasks: TaskStatusEvent[]
  onlineCount: number
  totalStores: number
}

function RealtimeStatusBar({
  mcpConnected,
  serverName,
  mcpError,
  totalActive,
  activeTasks,
  onlineCount,
  totalStores,
}: RealtimeStatusBarProps): React.ReactElement {
  return (
    <Card className={cn(
      'border-2 transition-colors',
      mcpConnected ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'
    )}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          {/* MCP 状态 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                mcpConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              )} />
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {mcpConnected ? serverName : 'MCP 服务'}
              </span>
              <Badge variant={mcpConnected ? 'default' : 'secondary'} className={cn(
                mcpConnected ? 'bg-green-500' : ''
              )}>
                {mcpConnected ? '已连接' : '未连接'}
              </Badge>
            </div>
            
            {mcpError && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {mcpError}
              </div>
            )}
          </div>

          {/* 在线店铺 */}
          <div className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span>{onlineCount}/{totalStores} 店铺在线</span>
          </div>

          {/* 活跃任务 */}
          {totalActive > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                <span className="text-sm text-orange-600 font-medium">
                  {totalActive} 个任务执行中
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 活跃任务进度条 */}
        {activeTasks.length > 0 && (
          <div className="mt-3 space-y-2">
            {activeTasks.slice(0, 3).map((task) => (
              <TaskProgressItem key={task.taskId} task={task} />
            ))}
            {activeTasks.length > 3 && (
              <p className="text-xs text-muted-foreground">
                还有 {activeTasks.length - 3} 个任务...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 单个任务进度项
 */
function TaskProgressItem({ task }: { task: TaskStatusEvent }): React.ReactElement {
  const taskLabels = {
    'product-listing': '商品上架',
    'content-collection': '内容采集',
    'order-management': '订单管理',
    'inventory-update': '库存更新',
  }

  const taskIcons = {
    'product-listing': <ShoppingBag className="h-3 w-3" />,
    'content-collection': <Activity className="h-3 w-3" />,
    'order-management': <Store className="h-3 w-3" />,
    'inventory-update': <Activity className="h-3 w-3" />,
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-orange-500">
        {taskIcons[task.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate">{taskLabels[task.type]}</span>
          <span className="text-muted-foreground">{task.progress || 0}%</span>
        </div>
        <Progress value={task.progress || 0} className="h-1.5 mt-1" />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {task.message}
      </span>
    </div>
  )
}

/**
 * 活跃任务面板
 */
function ActiveTasksPanel({ tasks }: { tasks: TaskStatusEvent[] }): React.ReactElement {
  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
          <Activity className="h-4 w-4" />
          执行中的任务
          <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.taskId}
            className="flex items-center gap-3 p-2 rounded-lg bg-white/80"
          >
            <div className="p-1.5 rounded bg-orange-100 text-orange-600">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {task.type === 'product-listing' && '商品上架'}
                {task.type === 'content-collection' && '内容采集'}
                {task.type === 'order-management' && '订单管理'}
                {task.type === 'inventory-update' && '库存更新'}
              </div>
              <div className="text-xs text-muted-foreground">{task.message}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{task.progress || 0}%</div>
              <Progress value={task.progress || 0} className="w-20 h-1.5 mt-1" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * 工具卡片
 */
interface ToolCardProps {
  name: string
  description: string
  platforms: string[]
  disabled?: boolean
}

function ToolCard({ name, description, platforms, disabled }: ToolCardProps): React.ReactElement {
  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      disabled
        ? 'bg-muted/30 opacity-60 cursor-not-allowed'
        : 'bg-card hover:bg-muted/50 cursor-pointer'
    )}>
      <div className="flex items-center justify-between mb-2">
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
          {name}
        </code>
        {disabled ? (
          <Badge variant="secondary" className="text-xs">离线</Badge>
        ) : (
          <Badge variant="default" className="text-xs bg-green-500">就绪</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex flex-wrap gap-1">
        {platforms.slice(0, 3).map((p) => (
          <span key={p} className="text-[10px] bg-muted px-1 py-0.5 rounded">
            {p}
          </span>
        ))}
        {platforms.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{platforms.length - 3}</span>
        )}
      </div>
    </div>
  )
}

/**
 * 店铺卡片
 */
interface StoreCardProps {
  store: StoreProfile
  onDelete: () => void
}

function StoreCard({ store, onDelete }: StoreCardProps): React.ReactElement {
  const platform = platformConfig[store.platform]
  
  const statusInfo = {
    logged_in: { icon: CheckCircle, color: 'text-green-500', label: '已登录', bg: 'bg-green-100' },
    pending: { icon: Clock, color: 'text-yellow-500', label: '待登录', bg: 'bg-yellow-100' },
    expired: { icon: AlertCircle, color: 'text-red-500', label: '登录过期', bg: 'bg-red-100' },
    never: { icon: AlertCircle, color: 'text-gray-400', label: '未登录', bg: 'bg-gray-100' },
  }
  
  const StatusIcon = statusInfo[store.loginStatus].icon

  return (
    <Card className="relative overflow-hidden">
      {/* 状态指示条 */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1',
        store.loginStatus === 'logged_in' ? 'bg-green-500' :
        store.loginStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-300'
      )} />
      
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${platform.color} text-white`}>
              {platform.icon}
            </div>
            <div>
              <div className="font-semibold">{store.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Chrome className="h-3 w-3" />
                {store.browserProfile}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                设置
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                打开浏览器
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                删除店铺
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 登录状态 */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-full',
            statusInfo[store.loginStatus].bg
          )}>
            <StatusIcon className={`h-4 w-4 ${statusInfo[store.loginStatus].color}`} />
          </div>
          <span className={`text-sm font-medium ${statusInfo[store.loginStatus].color}`}>
            {statusInfo[store.loginStatus].label}
          </span>
          {store.lastLoginTime && (
            <span className="text-xs text-muted-foreground ml-auto">
              {store.lastLoginTime}
            </span>
          )}
        </div>

        {/* MCP 状态 */}
        <div className="flex items-center gap-2 text-xs">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            store.mcpStatus === 'connected' ? 'bg-green-500' :
            store.mcpStatus === 'starting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
          )} />
          <span className="text-muted-foreground">
            MCP: {store.mcpStatus === 'connected' ? '已连接' : store.mcpStatus === 'starting' ? '连接中...' : '未连接'}
          </span>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{store.totalProducts}</div>
            <div className="text-xs text-muted-foreground">商品数</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{store.todayOrders}</div>
            <div className="text-xs text-muted-foreground">今日订单</div>
          </div>
        </div>

        {/* 快捷操作 */}
        {store.loginStatus !== 'logged_in' && (
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Play className="h-3 w-3" />
            登录店铺
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 创建店铺对话框
 */
interface CreateStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (store: Partial<StoreProfile>) => void
}

function CreateStoreDialog({ open, onOpenChange, onCreated }: CreateStoreDialogProps): React.ReactElement {
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [platform, setPlatform] = React.useState<Platform>('pinduoduo')

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('请输入店铺名称')
      return
    }
    
    onCreated({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      platform,
    })
    
    setName('')
    setSlug('')
    setPlatform('pinduoduo')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加店铺</DialogTitle>
          <DialogDescription>
            添加一个新的电商平台店铺。创建后需要登录才能使用自动化功能。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">店铺名称</Label>
            <Input
              id="store-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我的拼多多店铺"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="store-slug">标识符</Label>
            <Input
              id="store-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="自动生成"
            />
            <p className="text-xs text-muted-foreground">
              用于浏览器 Profile 目录命名，可留空自动生成
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="store-platform">平台</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pinduoduo">拼多多</SelectItem>
                <SelectItem value="douyin">抖音</SelectItem>
                <SelectItem value="taobao">淘宝</SelectItem>
                <SelectItem value="jd">京东</SelectItem>
                <SelectItem value="kuaishou">快手</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate}>
            创建店铺
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
