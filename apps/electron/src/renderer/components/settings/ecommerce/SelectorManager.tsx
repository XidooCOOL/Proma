/**
 * SelectorManager - 选择器管理组件
 * 
 * 功能：
 * 1. 查看/编辑各平台页面的 DOM 选择器
 * 2. 增删改选择器
 * 3. 导入/导出配置
 * 4. 版本管理和变更记录
 */

import * as React from 'react'
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
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
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou'
type ElementType = 'input' | 'button' | 'select' | 'checkbox' | 'radio' | 'file' | 'dialog' | 'link' | 'table' | 'container' | 'iframe' | 'tab'

interface SelectorDef {
  id: string
  name: string
  selector: string
  type: ElementType
  description: string
  required: boolean
  timeout?: number
  waitFor?: 'visible' | 'hidden' | 'attached' | 'detached' | 'enabled' | 'disabled'
}

interface PageSelectors {
  page: string
  urlPattern?: string
  elements: Record<string, SelectorDef>
  version: string
  updatedAt: string
}

interface PlatformSelectors {
  platform: Platform
  name: string
  color: string
  pages: Record<string, PageSelectors>
}

const platformConfig: Record<Platform, { name: string; color: string }> = {
  pinduoduo: { name: '拼多多', color: 'bg-red-500' },
  douyin: { name: '抖音', color: 'bg-pink-500' },
  taobao: { name: '淘宝', color: 'bg-orange-500' },
  jd: { name: '京东', color: 'bg-red-600' },
  kuaishou: { name: '快手', color: 'bg-orange-500' },
}

const elementTypeConfig: Record<ElementType, { label: string; color: string }> = {
  input: { label: '输入框', color: 'bg-blue-500' },
  button: { label: '按钮', color: 'bg-green-500' },
  select: { label: '下拉框', color: 'bg-purple-500' },
  checkbox: { label: '复选框', color: 'bg-cyan-500' },
  radio: { label: '单选框', color: 'bg-cyan-400' },
  file: { label: '文件上传', color: 'bg-yellow-500' },
  dialog: { label: '弹窗', color: 'bg-orange-500' },
  link: { label: '链接', color: 'bg-indigo-500' },
  table: { label: '表格', color: 'bg-teal-500' },
  container: { label: '容器', color: 'bg-gray-500' },
  iframe: { label: 'iframe', color: 'bg-pink-400' },
  tab: { label: '标签页', color: 'bg-rose-500' },
}

export function SelectorManager(): React.ReactElement {
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>('pinduoduo')
  const [selectedPage, setSelectedPage] = React.useState<string>('productCreate')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedPages, setExpandedPages] = React.useState<Set<string>>(new Set(['productCreate']))
  const [selectors, setSelectors] = React.useState<PlatformSelectors | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingSelector, setEditingSelector] = React.useState<SelectorDef | null>(null)
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [isDebugging, setIsDebugging] = React.useState(false)

  const loadSelectors = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getPlatformSelectors(selectedPlatform)
      setSelectors({
        platform: selectedPlatform,
        ...platformConfig[selectedPlatform],
        pages: data,
      })
    } catch (error) {
      console.error('[SelectorManager] 加载失败:', error)
      toast.error('加载选择器失败')
    } finally {
      setLoading(false)
    }
  }, [selectedPlatform])

  React.useEffect(() => {
    loadSelectors()
  }, [loadSelectors])

  const togglePage = (page: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev)
      if (next.has(page)) next.delete(page)
      else next.add(page)
      return next
    })
  }

  const handleEdit = (selector: SelectorDef) => {
    setEditingSelector(selector)
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingSelector || !selectors) return
    try {
      await window.electronAPI.updateSelector(
        selectedPlatform,
        selectedPage,
        editingSelector.id,
        editingSelector
      )
      toast.success('选择器已保存')
      setEditDialogOpen(false)
      loadSelectors()
    } catch (error) {
      console.error('[SelectorManager] 保存失败:', error)
      toast.error('保存失败')
    }
  }

  const handleAdd = async (newSelector: Omit<SelectorDef, 'id'>) => {
    if (!selectors) return
    const id = `selector_${Date.now()}`
    try {
      await window.electronAPI.addSelector(
        selectedPlatform,
        selectedPage,
        id,
        { ...newSelector, id }
      )
      toast.success('选择器已添加')
      setAddDialogOpen(false)
      loadSelectors()
    } catch (error) {
      console.error('[SelectorManager] 添加失败:', error)
      toast.error('添加失败')
    }
  }

  const handleDelete = async (selectorId: string) => {
    if (!confirm('确定删除此选择器？')) return
    try {
      await window.electronAPI.deleteSelector(selectedPlatform, selectedPage, selectorId)
      toast.success('选择器已删除')
      loadSelectors()
    } catch (error) {
      console.error('[SelectorManager] 删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleExport = () => {
    if (!selectors) return
    const dataStr = JSON.stringify(selectors, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedPlatform}-selectors.json`
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
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        await window.electronAPI.importSelectors(selectedPlatform, data)
        toast.success('配置已导入')
        loadSelectors()
      } catch (error) {
        toast.error('导入失败：文件格式错误')
      }
    }
    input.click()
  }

  const filteredSelectors = React.useMemo(() => {
    if (!selectors?.pages[selectedPage]) return []
    const elements = selectors.pages[selectedPage].elements
    if (!searchQuery) return Object.values(elements)
    return Object.values(elements).filter(
      s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.selector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [selectors, selectedPage, searchQuery])

  const pageList = selectors?.pages ? Object.keys(selectors.pages) : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            DOM 选择器管理
          </h2>
          <p className="text-sm text-muted-foreground">
            管理各平台页面的 DOM 元素定位器，便于页面改版后快速更新
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
          <Button
            variant={isDebugging ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsDebugging(!isDebugging)}
          >
            {isDebugging ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                退出调试
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                页面调试
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Debug Panel */}
      {isDebugging && (
        <SelectorDebugger
          platform={selectedPlatform}
          page={selectedPage}
          onSelectorFound={(selector) => {
            setEditingSelector({
              id: `selector_${Date.now()}`,
              name: '',
              selector: selector.selector,
              type: 'container',
              description: '',
              required: false,
            })
            setAddDialogOpen(true)
          }}
        />
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel - Platform & Page Tree */}
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">平台 & 页面</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-2 border-b">
              <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as Platform)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(platformConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', config.color)} />
                        {config.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pageList.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  暂无页面配置
                </div>
              ) : (
                pageList.map((page) => (
                  <div key={page}>
                    <button
                      onClick={() => togglePage(page)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 rounded transition-colors"
                    >
                      {expandedPages.has(page) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-left truncate">{page}</span>
                      {selectors?.pages[page] && (
                        <Badge variant="secondary" className="text-xs">
                          {Object.keys(selectors.pages[page].elements).length}
                        </Badge>
                      )}
                    </button>
                    {expandedPages.has(page) && selectedPage === page && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {Object.keys(selectors?.pages[page]?.elements || {}).map((el) => (
                          <button
                            key={el}
                            className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded"
                          >
                            {el}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Selector List */}
        <Card className="col-span-9">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {platformConfig[selectedPlatform].name} / {selectedPage}
                {selectors?.pages[selectedPage] && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    v{selectors.pages[selectedPage].version}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索选择器..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 w-48 text-sm"
                  />
                </div>
                <Button size="sm" onClick={() => { setEditingSelector(null); setAddDialogOpen(true) }}>
                  <Plus className="mr-1 h-4 w-4" />
                  添加
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSelectors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? '没有匹配的选择器' : '暂无选择器配置'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSelectors.map((selector) => (
                  <SelectorRow
                    key={selector.id}
                    selector={selector}
                    onEdit={() => handleEdit(selector)}
                    onDelete={() => handleDelete(selector.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <SelectorEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        selector={editingSelector}
        onSave={handleSave}
      />

      {/* Add Dialog */}
      <SelectorAddDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAdd}
        initialSelector={editingSelector}
      />
    </div>
  )
}

interface SelectorRowProps {
  selector: SelectorDef
  onEdit: () => void
  onDelete: () => void
}

function SelectorRow({ selector, onEdit, onDelete }: SelectorRowProps): React.ReactElement {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(selector.selector)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
      <div className={cn('px-2 py-0.5 rounded text-xs text-white', elementTypeConfig[selector.type]?.color || 'bg-gray-500')}>
        {elementTypeConfig[selector.type]?.label || selector.type}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{selector.name}</span>
          {selector.required && (
            <Badge variant="destructive" className="text-xs py-0">必填</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs bg-muted px-2 py-0.5 rounded flex-1 truncate">
            {selector.selector}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        {selector.description && (
          <p className="text-xs text-muted-foreground mt-1">{selector.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface SelectorEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selector: SelectorDef | null
  onSave: () => void
}

function SelectorEditDialog({ open, onOpenChange, selector, onSave }: SelectorEditDialogProps): React.ReactElement {
  const [form, setForm] = React.useState<SelectorDef | null>(selector)

  React.useEffect(() => {
    setForm(selector)
  }, [selector])

  if (!form) return <></>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑选择器</DialogTitle>
          <DialogDescription>修改选择器的配置信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="选择器名称"
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ElementType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(elementTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>选择器</Label>
            <Textarea
              value={form.selector}
              onChange={(e) => setForm({ ...form, selector: e.target.value })}
              placeholder="CSS 选择器或 Playwright 定位器"
              className="font-mono text-sm min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="选择器用途说明"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="required" className="cursor-pointer">必填</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">超时 (ms)</Label>
              <Input
                type="number"
                value={form.timeout || ''}
                onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value) || undefined })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">等待条件</Label>
              <Select
                value={form.waitFor || ''}
                onValueChange={(v) => setForm({ ...form, waitFor: v as any || undefined })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="无" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  <SelectItem value="visible">可见</SelectItem>
                  <SelectItem value="hidden">隐藏</SelectItem>
                  <SelectItem value="attached">附加</SelectItem>
                  <SelectItem value="detached">分离</SelectItem>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SelectorAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (selector: Omit<SelectorDef, 'id'>) => void
  initialSelector?: SelectorDef | null
}

function SelectorAddDialog({ open, onOpenChange, onAdd, initialSelector }: SelectorAddDialogProps): React.ReactElement {
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<ElementType>('input')
  const [selector, setSelector] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [required, setRequired] = React.useState(false)

  React.useEffect(() => {
    if (initialSelector) {
      setName(initialSelector.name)
      setType(initialSelector.type)
      setSelector(initialSelector.selector)
      setDescription(initialSelector.description)
      setRequired(initialSelector.required)
    } else {
      setName('')
      setType('input')
      setSelector('')
      setDescription('')
      setRequired(false)
    }
  }, [initialSelector, open])

  const handleAdd = () => {
    if (!name.trim() || !selector.trim()) {
      toast.error('请填写名称和选择器')
      return
    }
    onAdd({ name, type, selector, description, required })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加选择器</DialogTitle>
          <DialogDescription>
            {initialSelector?.selector ? (
              <span className="text-muted-foreground">检测到选择器：<code className="bg-muted px-1 rounded">{initialSelector.selector}</code></span>
            ) : (
              '创建新的选择器配置'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>名称 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：商品标题输入框"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={type} onValueChange={(v) => setType(v as ElementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(elementTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-required"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="add-required" className="cursor-pointer">必填元素</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>选择器 *</Label>
            <Textarea
              value={selector || initialSelector?.selector || ''}
              onChange={(e) => setSelector(e.target.value)}
              placeholder="CSS 选择器或 Playwright 定位器"
              className="font-mono text-sm min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="选择器用途说明"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SelectorDebuggerProps {
  platform: Platform
  page: string
  onSelectorFound: (selector: SelectorDef) => void
}

function SelectorDebugger({ platform, page, onSelectorFound }: SelectorDebuggerProps): React.ReactElement {
  const [debugUrl, setDebugUrl] = React.useState('')
  const [isRunning, setIsRunning] = React.useState(false)
  const [foundElements, setFoundElements] = React.useState<Array<{ selector: string; count: number }>>([])
  const [error, setError] = React.useState<string | null>(null)

  const startDebug = async () => {
    if (!debugUrl.trim()) {
      toast.error('请输入页面 URL')
      return
    }
    setIsRunning(true)
    setError(null)
    setFoundElements([])
    try {
      const elements = await window.electronAPI.debugSelectors(platform, page, debugUrl)
      setFoundElements(elements)
      if (elements.length === 0) {
        toast.warning('未找到任何匹配的元素')
      } else {
        toast.success(`找到 ${elements.length} 个可用的选择器`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '调试失败')
      toast.error('调试失败')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
          <Eye className="h-4 w-4" />
          页面调试模式
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={debugUrl}
            onChange={(e) => setDebugUrl(e.target.value)}
            placeholder="输入要调试的页面 URL（如商品发布页面）"
            className="flex-1"
          />
          <Button onClick={startDebug} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                检测中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                检测
              </>
            )}
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-100 rounded text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {foundElements.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-700">
              检测到的可用选择器（按匹配数量排序）：
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {foundElements.slice(0, 10).map((el, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-blue-50"
                  onClick={() => onSelectorFound({ ...el, id: '', name: '', description: '', type: 'container', required: false } as any)}
                >
                  <code className="text-xs flex-1 truncate">{el.selector}</code>
                  <Badge variant="secondary" className="ml-2">
                    {el.count} 个元素
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
