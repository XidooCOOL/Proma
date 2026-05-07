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
  ExternalLink,
  MoreVertical,
  ShoppingBag,
  Video,
  Loader2,
  Server,
  Play,
  Layers,
  ListOrdered,
  Terminal,
  Code,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { SelectorManager } from './SelectorManager'
import { ProductImportWizard } from './ProductImportWizard'
import { ListingRecordsPanel } from './ListingRecordsPanel'
import { TaskMonitorPanel } from './TaskMonitorPanel'

type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou'

interface StoreProfile {
  id: string
  name: string
  platform: string
  createdAt: string
  lastUsedAt?: string
  stats: {
    totalProducts: number
    totalOrders: number
    lastUploadAt?: string
  }
}

const platformConfig: Record<string, { label: string; color: string }> = {
  pinduoduo: { label: '拼多多', color: 'bg-red-500' },
  douyin: { label: '抖音', color: 'bg-pink-500' },
  taobao: { label: '淘宝', color: 'bg-orange-500' },
  jd: { label: '京东', color: 'bg-red-600' },
  kuaishou: { label: '快手', color: 'bg-orange-500' },
}

export function EcommerceSettings(): React.ReactElement {
  const [profiles, setProfiles] = React.useState<StoreProfile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [importWizardOpen, setImportWizardOpen] = React.useState(false)

  const loadProfiles = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getEcommerceProfiles()
      setProfiles(data || [])
    } catch (error) {
      console.error('[EcommerceSettings] 加载失败:', error)
      toast.error('加载店铺失败')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const handleCreateProfile = async (data: { name: string; platform: string }) => {
    try {
      await window.electronAPI.createEcommerceProfile(data)
      toast.success('店铺创建成功')
      setCreateDialogOpen(false)
      loadProfiles()
    } catch (error) {
      console.error('[EcommerceSettings] 创建失败:', error)
      toast.error('创建失败')
    }
  }

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('确定删除该店铺？')) return
    try {
      await window.electronAPI.deleteEcommerceProfile(id)
      toast.success('店铺已删除')
      loadProfiles()
    } catch (error) {
      console.error('[EcommerceSettings] 删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleStartImport = (taskGroups: any[]) => {
    setImportWizardOpen(false)
    toast.success(`已生成 ${taskGroups.length} 个任务组`)
  }

  const availableTargets = profiles.map(p => ({
    platform: p.platform,
    platformName: platformConfig[p.platform]?.label || p.platform,
    profileId: p.id,
    profileName: p.name,
    enabled: true,
  }))

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="stores" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingBag className="h-6 w-6" />
                电商自动化
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                多平台店铺管理 · 商品批量上架 · 自动化运营
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setImportWizardOpen(true)}>
                <Layers className="mr-2 h-4 w-4" />
                批量导入
              </Button>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="stores" className="gap-2">
              <Store className="h-4 w-4" />
              店铺管理
            </TabsTrigger>
            <TabsTrigger value="selectors" className="gap-2">
              <Code className="h-4 w-4" />
              选择器配置
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              上架记录
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2">
              <Terminal className="h-4 w-4" />
              任务监控
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stores" className="flex-1 overflow-auto p-6 mt-0">
          <StoreManagementTab
            profiles={profiles}
            loading={loading}
            onRefresh={loadProfiles}
            onCreate={() => setCreateDialogOpen(true)}
            onDelete={handleDeleteProfile}
          />
        </TabsContent>

        <TabsContent value="selectors" className="flex-1 overflow-auto p-6 mt-0">
          <SelectorManager />
        </TabsContent>

        <TabsContent value="records" className="flex-1 overflow-auto p-6 mt-0">
          <ListingRecordsPanel />
        </TabsContent>

        <TabsContent value="monitor" className="flex-1 overflow-hidden p-0 mt-0">
          <TaskMonitorPanel />
        </TabsContent>
      </Tabs>

      <CreateProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateProfile}
      />

      <ProductImportWizard
        open={importWizardOpen}
        onOpenChange={setImportWizardOpen}
        onConfirm={handleStartImport}
        availableTargets={availableTargets}
      />
    </div>
  )
}

function StoreManagementTab({
  profiles,
  loading,
  onRefresh,
  onCreate,
  onDelete,
}: {
  profiles: StoreProfile[]
  loading: boolean
  onRefresh: () => void
  onCreate: () => void
  onDelete: (id: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">店铺管理</h2>
          <p className="text-sm text-muted-foreground">管理已连接的电商平台店铺</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <Loader2 className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button size="sm" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            添加店铺
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{profiles.length}</div>
            <p className="text-xs text-muted-foreground">总店铺数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {profiles.filter(p => p.stats.totalProducts > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">已上架商品</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {profiles.reduce((sum, p) => sum + (p.stats.totalProducts || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">总商品数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">
              {profiles.reduce((sum, p) => sum + (p.stats.totalOrders || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">总订单数</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">暂无店铺</p>
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              添加第一个店铺
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => {
            const platform = platformConfig[profile.platform] || { label: profile.platform, color: 'bg-gray-500' }
            return (
              <Card key={profile.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg text-white', platform.color)}>
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{profile.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{platform.label}</p>
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
                          <ExternalLink className="mr-2 h-4 w-4" />
                          打开后台
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(profile.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>状态正常</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{profile.stats.totalProducts || 0}</div>
                        <div className="text-xs text-muted-foreground">商品数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{profile.stats.totalOrders || 0}</div>
                        <div className="text-xs text-muted-foreground">订单数</div>
                      </div>
                    </div>
                    {profile.stats.lastUploadAt && (
                      <div className="text-xs text-muted-foreground text-center">
                        上次上架：{new Date(profile.stats.lastUploadAt).toLocaleDateString()}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Play className="h-3 w-3" />
                      开始上架
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateProfileDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; platform: string }) => void
}): React.ReactElement {
  const [name, setName] = React.useState('')
  const [platform, setPlatform] = React.useState<Platform>('pinduoduo')
  const [creating, setCreating] = React.useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('请输入店铺名称')
      return
    }
    setCreating(true)
    try {
      await onCreate({ name: name.trim(), platform })
      setName('')
      setPlatform('pinduoduo')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加店铺</DialogTitle>
          <DialogDescription>添加一个新的电商平台店铺</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">店铺名称</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：拼多多店铺A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-platform">平台</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(platformConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', config.color)} />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
