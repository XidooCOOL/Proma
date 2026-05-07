/**
 * EcommerceSettings - 电商设置页面
 * 
 * 功能：
 * - 多店铺管理（添加、编辑、删除）
 * - 店铺 Profile 状态展示
 * - 浏览器登录状态检测
 * - MCP 服务器状态监控
 */

import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  Store,
  Plus,
  RefreshCw,
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
import {
  agentWorkspacesAtom,
  currentAgentWorkspaceIdAtom,
} from '@/atoms/agent-atoms'
import type { AgentWorkspace } from '@proma/shared'

// ===== Types =====

type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'other'

type LoginStatus = 'logged_in' | 'pending' | 'expired' | 'never'

interface StoreProfile {
  id: string
  name: string
  slug: string
  platform: Platform
  loginStatus: LoginStatus
  lastLoginTime?: Date
  cookieExpiry?: Date
  browserProfile: string
  mcpStatus: 'connected' | 'disconnected' | 'starting'
  totalProducts: number
  todayOrders: number
}

interface CreateStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (store: Partial<StoreProfile>) => void
}

// ===== Helpers =====

const platformConfig: Record<Platform, { icon: React.ReactNode; label: string; color: string }> = {
  pinduoduo: { icon: <ShoppingBag className="h-4 w-4" />, label: '拼多多', color: 'bg-red-500' },
  douyin: { icon: <Video className="h-4 w-4" />, label: '抖音', color: 'bg-pink-500' },
  taobao: { icon: <ShoppingBag className="h-4 w-4" />, label: '淘宝', color: 'bg-orange-500' },
  jd: { icon: <ShoppingBag className="h-4 w-4" />, label: '京东', color: 'bg-red-600' },
  other: { icon: <Store className="h-4 w-4" />, label: '其他', color: 'bg-gray-500' },
}

const statusConfig: Record<LoginStatus, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  logged_in: { icon: CheckCircle, color: 'text-green-500', label: '已登录' },
  pending: { icon: Clock, color: 'text-yellow-500', label: '待登录' },
  expired: { icon: AlertCircle, color: 'text-red-500', label: '登录过期' },
  never: { icon: AlertCircle, color: 'text-gray-400', label: '未登录' },
}

// ===== Components =====

export function EcommerceSettings(): React.ReactElement {
  const workspaces = useAtomValue(agentWorkspacesAtom)
  const currentWorkspaceId = useAtomValue(currentAgentWorkspaceIdAtom)
  
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [selectedStore, setSelectedStore] = React.useState<StoreProfile | null>(null)

  // 模拟店铺数据（实际应该从工作区配置中读取）
  const [stores, setStores] = React.useState<StoreProfile[]>([
    {
      id: 'ws-1',
      name: '拼多多店铺A',
      slug: 'pdd-store-a',
      platform: 'pinduoduo',
      loginStatus: 'logged_in',
      lastLoginTime: new Date('2024-01-15'),
      cookieExpiry: new Date('2024-02-15'),
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
      lastLoginTime: new Date('2024-01-18'),
      cookieExpiry: new Date('2024-02-18'),
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
              {stores.filter(s => s.loginStatus === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">待登录</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">
              {stores.filter(s => s.loginStatus === 'expired').length}
            </div>
            <p className="text-xs text-muted-foreground">登录过期</p>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ToolCard
              name="list_product"
              description="上架商品到电商平台"
              platforms={['拼多多', '抖音', '淘宝', '京东', '快手']}
            />
            <ToolCard
              name="collect_trends"
              description="采集社交平台热门内容"
              platforms={['小红书', '抖音', '微博', 'B站']}
            />
            <ToolCard
              name="manage_orders"
              description="订单管理、批量发货、退款"
              platforms={['拼多多', '抖音', '淘宝', '京东']}
            />
            <ToolCard
              name="update_inventory"
              description="批量更新库存和价格"
              platforms={['拼多多', '抖音', '淘宝', '京东']}
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
            isActive={store.id === currentWorkspaceId}
            onSelect={() => setSelectedStore(store)}
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

interface StoreCardProps {
  store: StoreProfile
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function StoreCard({ store, isActive, onSelect, onDelete }: StoreCardProps) {
  const StatusIcon = statusConfig[store.loginStatus].icon
  const platform = platformConfig[store.platform]

  return (
    <Card className={isActive ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={`p-1.5 rounded ${platform.color} text-white`}>
              {platform.icon}
            </div>
            <div>
              <div>{store.name}</div>
              <div className="text-xs font-normal text-muted-foreground">
                {platform.label} · {store.slug}
              </div>
            </div>
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSelect}>
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
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusConfig[store.loginStatus].color}`} />
          <span className="text-sm">{statusConfig[store.loginStatus].label}</span>
          {store.lastLoginTime && (
            <span className="text-xs text-muted-foreground ml-auto">
              {store.lastLoginTime.toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Browser Profile */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Chrome className="h-4 w-4" />
          <span>Profile: {store.browserProfile}</span>
        </div>

        {/* MCP Status */}
        <div className="flex items-center gap-2">
          <Badge variant={store.mcpStatus === 'connected' ? 'default' : 'secondary'}>
            MCP: {store.mcpStatus === 'connected' ? '已连接' : '未连接'}
          </Badge>
          {store.mcpStatus === 'disconnected' && (
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        {store.loginStatus === 'logged_in' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <div className="text-lg font-semibold">{store.totalProducts}</div>
              <div className="text-xs text-muted-foreground">商品数</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{store.todayOrders}</div>
              <div className="text-xs text-muted-foreground">今日订单</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={onSelect}
          >
            {isActive ? '当前店铺' : '切换到'}
          </Button>
          {store.loginStatus !== 'logged_in' && (
            <Button size="sm" className="flex-1">
              登录
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ToolCardProps {
  name: string
  description: string
  platforms: string[]
}

function ToolCard({ name, description, platforms }: ToolCardProps): React.ReactElement {
  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="font-mono text-sm font-medium text-primary mb-1">
        {name}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex flex-wrap gap-1">
        {platforms.map((p) => (
          <Badge key={p} variant="secondary" className="text-xs py-0">
            {p}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function CreateStoreDialog({ open, onOpenChange, onCreated }: CreateStoreDialogProps) {
  const [platform, setPlatform] = React.useState<Platform>('pinduoduo')
  const [storeName, setStoreName] = React.useState('')
  const [isCreating, setIsCreating] = React.useState(false)

  const handleCreate = React.useCallback(() => {
    if (!storeName.trim()) {
      toast.error('请输入店铺名称')
      return
    }

    setIsCreating(true)
    
    // 生成 slug
    const slug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    onCreated({
      name: storeName,
      slug,
      platform,
    })

    setStoreName('')
    setPlatform('pinduoduo')
    setIsCreating(false)
  }, [storeName, platform, onCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加新店铺</DialogTitle>
          <DialogDescription>
            创建一个新的电商店铺工作区，将自动配置浏览器 Profile 和 MCP 服务器。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="platform">电商平台</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pinduoduo">🏪 拼多多</SelectItem>
                <SelectItem value="douyin">🎵 抖音</SelectItem>
                <SelectItem value="taobao">🛒 淘宝</SelectItem>
                <SelectItem value="jd">📦 京东</SelectItem>
                <SelectItem value="other">🏬 其他平台</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeName">店铺名称</Label>
            <Input
              id="storeName"
              placeholder="例如：我的拼多多店"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              将自动生成标识符：{storeName ? storeName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '...' : '...'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? '创建中...' : '创建店铺'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
