import * as React from 'react'
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Save,
  Download,
  Upload,
  RefreshCw,
  Check,
  AlertCircle,
  Eye,
  Code,
  Copy,
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SelectorDefinition {
  id: string
  category: string
  label: string
  labelZh: string
  description: string
  extractMode: string
  attributes?: string[]
}

interface SelectorConfig {
  id: string
  selector: string
  extractMode: string
  attributes?: string[]
  enabled: boolean
  lastTested?: string
}

interface PlatformSelectors {
  platform: string
  version: string
  updatedAt: string
  selectors: Record<string, SelectorConfig>
}

const platformConfig: Record<string, { id: string; name: string; color: string }> = {
  pinduoduo: { id: 'pinduoduo', name: '拼多多', color: 'bg-red-500' },
  douyin: { id: 'douyin', name: '抖音', color: 'bg-pink-500' },
  taobao: { id: 'taobao', name: '淘宝', color: 'bg-orange-500' },
  jd: { id: 'jd', name: '京东', color: 'bg-red-600' },
  kuaishou: { id: 'kuaishou', name: '快手', color: 'bg-orange-500' },
}

const categoryLabels: Record<string, string> = {
  product_info: '商品信息',
  form_input: '表单输入',
  action: '操作按钮',
  upload: '上传区域',
  result: '结果反馈',
}

const extractModeLabels: Record<string, string> = {
  element: '元素（操作用）',
  text: '文本',
  value: '输入值',
  href: '链接',
  src: '图片地址',
  'data-id': 'data-id属性',
  innerHTML: 'HTML内容',
}

export function SelectorManager(): React.ReactElement {
  const [platform, setPlatform] = React.useState<string>('pinduoduo')
  const [predefinedSelectors, setPredefinedSelectors] = React.useState<Record<string, SelectorDefinition[]>>({})
  const [platformSelectors, setPlatformSelectors] = React.useState<PlatformSelectors | null>(null)
  const [profiles, setProfiles] = React.useState<Array<{ id: string; name: string }>>([])
  const [selectedProfile, setSelectedProfile] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set())
  const [editingSelector, setEditingSelector] = React.useState<{ id: string; def: SelectorDefinition; config: SelectorConfig } | null>(null)
  const [testDialogOpen, setTestDialogOpen] = React.useState(false)
  const [testResult, setTestResult] = React.useState<any>(null)
  const [isTesting, setIsTesting] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [predefinedRes, platformRes, profileList] = await Promise.all([
        window.electronAPI.getPredefinedSelectors(),
        window.electronAPI.getPlatformSelectors(platform),
        window.electronAPI.getEcommerceProfiles(),
      ])

      setPredefinedSelectors(predefinedRes.grouped || {})
      setPlatformSelectors(platformRes)
      setProfiles(profileList.filter((p: any) => p.platform === platform))

      const categories = Object.keys(predefinedRes.grouped || {})
      setExpandedCategories(new Set(categories))
    } catch (error) {
      console.error('[SelectorManager] 加载失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }, [platform])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const handleToggleEnabled = async (selectorId: string, enabled: boolean) => {
    if (!platformSelectors) return
    try {
      await window.electronAPI.updateSelectorConfig(platform, selectorId, { enabled })
      setPlatformSelectors(prev => {
        if (!prev) return prev
        return {
          ...prev,
          selectors: {
            ...prev.selectors,
            [selectorId]: { ...prev.selectors[selectorId], enabled }
          }
        }
      })
      toast.success(enabled ? '已启用' : '已禁用')
    } catch (error) {
      console.error('[SelectorManager] 更新失败:', error)
      toast.error('更新失败')
    }
  }

  const handleSaveSelector = async () => {
    if (!editingSelector) return
    try {
      await window.electronAPI.updateSelectorConfig(platform, editingSelector.id, {
        selector: editingSelector.config.selector,
        enabled: editingSelector.config.enabled,
        lastTested: editingSelector.config.lastTested,
      })
      toast.success('保存成功')
      setEditingSelector(null)
      loadData()
    } catch (error) {
      console.error('[SelectorManager] 保存失败:', error)
      toast.error('保存失败')
    }
  }

  const handleTestSelector = async () => {
    if (!editingSelector || !selectedProfile) {
      toast.error('请先选择店铺 Profile')
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.testSelector(
        platform,
        selectedProfile,
        editingSelector.id,
        editingSelector.config.selector
      )
      setTestResult(result)
      if (result.success) {
        setEditingSelector(prev => prev ? {
          ...prev,
          config: { ...prev.config, lastTested: new Date().toISOString() }
        } : null)
      }
    } catch (error) {
      console.error('[SelectorManager] 测试失败:', error)
      toast.error('测试失败')
    } finally {
      setIsTesting(false)
    }
  }

  const handleExport = () => {
    if (!platformSelectors) return
    const dataStr = JSON.stringify(platformSelectors, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${platform}-selectors.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('配置已导出')
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await window.electronAPI.savePlatformSelectors(platform, data)
        toast.success('配置已导入')
        loadData()
      } catch {
        toast.error('导入失败：文件格式错误')
      }
    }
    input.click()
  }

  const categories = Object.keys(predefinedSelectors)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            选择器配置
          </h2>
          <p className="text-sm text-muted-foreground">
            配置各平台页面元素的定位器，用于自动化操作和结果提取
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">平台</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(platformConfig).map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', p.color)} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">调试店铺</Label>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="选择店铺..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.length === 0 ? (
                <SelectItem value="none" disabled>暂无店铺</SelectItem>
              ) : (
                profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {platformSelectors && (
          <div className="ml-auto text-xs text-muted-foreground">
            版本 {platformSelectors.version} · 更新于 {new Date(platformSelectors.updatedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <button
                  onClick={() => handleToggleCategory(category)}
                  className="w-full flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{categoryLabels[category] || category}</span>
                    <Badge variant="secondary">{predefinedSelectors[category]?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{predefinedSelectors[category]?.filter(s => platformSelectors?.selectors[s.id]?.enabled).length || 0} / {predefinedSelectors[category]?.length || 0} 已配置</span>
                  </div>
                </button>
              </CardHeader>
              {expandedCategories.has(category) && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {predefinedSelectors[category]?.map(def => {
                      const config = platformSelectors?.selectors[def.id]
                      return (
                        <SelectorRow
                          key={def.id}
                          definition={def}
                          config={config}
                          onEdit={() => setEditingSelector({
                            id: def.id,
                            def,
                            config: config || {
                              id: def.id,
                              selector: '',
                              extractMode: def.extractMode,
                              enabled: false,
                            }
                          })}
                          onToggle={(enabled) => handleToggleEnabled(def.id, enabled)}
                        />
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <SelectorEditDialog
        open={!!editingSelector}
        onOpenChange={(open) => !open && setEditingSelector(null)}
        selector={editingSelector}
        profiles={profiles}
        selectedProfile={selectedProfile}
        isTesting={isTesting}
        testResult={testResult}
        onSave={handleSaveSelector}
        onTest={handleTestSelector}
        onProfileChange={setSelectedProfile}
      />
    </div>
  )
}

interface SelectorRowProps {
  definition: SelectorDefinition
  config?: SelectorConfig
  onEdit: () => void
  onToggle: (enabled: boolean) => void
}

function SelectorRow({ definition, config, onEdit, onToggle }: SelectorRowProps): React.ReactElement {
  const isEnabled = config?.enabled || false
  const hasSelector = !!config?.selector
  const isTested = !!config?.lastTested

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded border transition-colors",
      isEnabled && hasSelector ? "bg-green-50/50 border-green-200" : "bg-muted/30"
    )}>
      <Switch
        checked={isEnabled}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{definition.labelZh}</span>
          <span className="text-xs text-muted-foreground">({definition.label})</span>
          <Badge variant="outline" className="text-xs">
            {extractModeLabels[definition.extractMode] || definition.extractMode}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {definition.description}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {hasSelector ? (
          <Badge variant="outline" className="text-xs gap-1">
            <Check className="h-3 w-3 text-green-500" />
            已配置
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            未配置
          </Badge>
        )}
        {isTested && (
          <Wifi className="h-4 w-4 text-green-500" title={`测试于 ${new Date(config.lastTested!).toLocaleString()}`} />
        )}
        {!hasSelector && (
          <WifiOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
          {hasSelector ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

interface SelectorEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selector: { id: string; def: SelectorDefinition; config: SelectorConfig } | null
  profiles: Array<{ id: string; name: string }>
  selectedProfile: string
  isTesting: boolean
  testResult: any
  onSave: () => void
  onTest: () => void
  onProfileChange: (id: string) => void
}

function SelectorEditDialog({
  open,
  onOpenChange,
  selector,
  profiles,
  selectedProfile,
  isTesting,
  testResult,
  onSave,
  onTest,
  onProfileChange,
}: SelectorEditDialogProps): React.ReactElement {
  const [localSelector, setLocalSelector] = React.useState('')

  React.useEffect(() => {
    if (selector) {
      setLocalSelector(selector.config.selector || '')
    }
  }, [selector])

  if (!selector) return <></>

  const handleTest = () => {
    if (selector) {
      selector.config.selector = localSelector
    }
    onTest()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>配置选择器</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{selector.def.labelZh}</span>
            <span className="text-muted-foreground"> - {selector.def.description}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">ID：</span>
              <code className="text-xs">{selector.id}</code>
            </div>
            <div>
              <span className="text-muted-foreground">提取方式：</span>
              <span>{extractModeLabels[selector.def.extractMode]}</span>
            </div>
            <div>
              <span className="text-muted-foreground">启用状态：</span>
              <Badge variant={selector.config.enabled ? "default" : "secondary"}>
                {selector.config.enabled ? '已启用' : '已禁用'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>CSS 选择器</Label>
              <Button variant="outline" size="sm" onClick={handleTest} disabled={!selectedProfile || !localSelector || isTesting}>
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                测试
              </Button>
            </div>
            <Input
              value={localSelector}
              onChange={(e) => setLocalSelector(e.target.value)}
              placeholder="例如: input[placeholder*='标题'], button:has-text('发布')"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              支持 CSS 选择器和 Playwright 定位器语法
            </p>
          </div>

          {testResult && (
            <div className={cn(
              "p-3 rounded-lg border",
              testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={cn("text-sm font-medium", testResult.success ? "text-green-700" : "text-red-700")}>
                  {testResult.success ? `找到 ${testResult.count} 个元素` : '测试失败'}
                </span>
              </div>
              {testResult.success && testResult.results?.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {testResult.results.map((r: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">&lt;{r.tagName}&gt;</Badge>
                        {r.text && <span className="truncate flex-1">{r.text}</span>}
                      </div>
                      {Object.keys(r.attributes || {}).length > 0 && (
                        <div className="mt-1 text-muted-foreground">
                          {Object.entries(r.attributes).slice(0, 3).map(([k, v]: [string, string]) => (
                            <span key={k} className="mr-2">{k}="{v?.toString().slice(0, 30)}"</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {testResult.error && (
                <p className="text-xs text-red-600">{testResult.error}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="text-xs text-blue-700">
              <p><strong>提示：</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>选择器为空时该元素将被跳过</li>
                <li>启用后该元素才会被使用</li>
                <li>建议使用唯一性高的选择器避免误匹配</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => {
            if (selector) selector.config.selector = localSelector
            onSave()
          }}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
