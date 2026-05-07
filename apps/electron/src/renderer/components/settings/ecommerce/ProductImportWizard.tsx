/**
 * ProductImportWizard - 商品导入向导 v3
 * 
 * 支持多平台多店铺的任务规划
 * 
 * 文件结构：
 * 📁 /商品上架/
 * ├── 📁 001_夏季短袖/
 * │   ├── 🖼️ 001.jpg
 * │   ├── 📄 products.csv
 * │   └── 📄 skus.csv
 * └── ...
 */

import * as React from 'react'
import {
  FolderOpen,
  Image,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Loader2,
  Layers,
  Package,
  Edit3,
  Grid3x3,
  List,
  Plus,
  Minus,
  Settings,
  Play,
  Pause,
  CheckCircle2,
  Circle,
  XCircle,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/** 商品基础信息 */
interface ProductBaseInfo {
  title: string
  price: number
  origin?: string
  description?: string
}

/** SKU 信息 */
interface SKUInfo {
  code: string
  stock: number
  color?: string
  size?: string
}

/** 单个商品数据 */
interface ProductData {
  id: string
  folderPath: string
  folderName: string
  images: string[]
  imageCount: number
  baseInfo?: ProductBaseInfo
  skus?: SKUInfo[]
  /** 平台-店铺映射 */
  targets: Map<string, boolean> // key: "platform:profileId"
}

/** 目标平台/店铺配置 */
interface TargetConfig {
  platform: string
  platformName: string
  profileId: string
  profileName: string
  enabled: boolean
}

/** 任务规划项 */
interface TaskItem {
  productId: string
  productName: string
  folderName: string
  images: string[]
  baseInfo?: ProductBaseInfo
  skus?: SKUInfo[]
  platform: string
  platformName: string
  profileId: string
  profileName: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  error?: string
}

/** 任务组 */
interface TaskGroup {
  id: string
  platform: string
  platformName: string
  profileId: string
  profileName: string
  tasks: TaskItem[]
}

interface ProductImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (taskGroups: TaskGroup[]) => void
  availableTargets: TargetConfig[]
}

type Step = 'select-root' | 'config-targets' | 'plan-review' | 'confirm'

export function ProductImportWizard({
  open,
  onOpenChange,
  onConfirm,
  availableTargets = [],
}: ProductImportWizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState<Step>('select-root')
  const [products, setProducts] = React.useState<ProductData[]>([])
  const [scanning, setScanning] = React.useState(false)
  const [editProduct, setEditProduct] = React.useState<ProductData | null>(null)
  const [viewMode, setViewMode] = React.useState<'grid' | 'matrix'>('grid')

  /** 选择根文件夹并扫描 */
  const handleSelectRootFolder = async () => {
    setScanning(true)
    try {
      const result = await window.electronAPI.selectImageFolders(false)
      if (result.success && result.folders?.[0]) {
        const root = result.folders[0].path
        const scanResult = await window.electronAPI.scanProductFolders(root)
        if (scanResult.success && scanResult.products) {
          // 初始化 targets
          const productsWithTargets = scanResult.products.map((p: any) => ({
            ...p,
            targets: new Map<string, boolean>(),
          }))
          setProducts(productsWithTargets)
          toast.success(`扫描完成，发现 ${scanResult.products.length} 个商品`)
          setCurrentStep('config-targets')
        } else {
          toast.error(scanResult.error || '扫描失败')
        }
      }
    } catch (error) {
      toast.error('选择文件夹失败')
    } finally {
      setScanning(false)
    }
  }

  /** 切换商品的目标平台 */
  const handleToggleTarget = (productId: string, targetKey: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== productId) return p
        const newTargets = new Map(p.targets)
        newTargets.set(targetKey, !newTargets.get(targetKey))
        return { ...p, targets: newTargets }
      })
    )
  }

  /** 全选/取消全选某个平台 */
  const handleTogglePlatformAll = (targetKey: string, enabled: boolean) => {
    setProducts(prev =>
      prev.map(p => {
        const newTargets = new Map(p.targets)
        newTargets.set(targetKey, enabled)
        return { ...p, targets: newTargets }
      })
    )
  }

  /** 生成任务计划 */
  const generateTaskGroups = (): TaskGroup[] => {
    const groups: Map<string, TaskGroup> = new Map()

    for (const product of products) {
      for (const [targetKey, enabled] of product.targets) {
        if (!enabled) continue

        const [platform, profileId] = targetKey.split(':')
        const config = availableTargets.find(
          t => t.platform === platform && t.profileId === profileId
        )
        if (!config) continue

        const groupKey = targetKey
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            id: groupKey,
            platform,
            platformName: config.platformName,
            profileId,
            profileName: config.profileName,
            tasks: [],
          })
        }

        groups.get(groupKey)!.tasks.push({
          productId: product.id,
          productName: product.baseInfo?.title || product.folderName,
          folderName: product.folderName,
          images: product.images,
          baseInfo: product.baseInfo,
          skus: product.skus,
          platform,
          platformName: config.platformName,
          profileId,
          profileName: config.profileName,
          status: 'pending',
          progress: 0,
        })
      }
    }

    return Array.from(groups.values())
  }

  /** 确认执行 */
  const handleConfirm = () => {
    const taskGroups = generateTaskGroups()
    if (taskGroups.length === 0) {
      toast.error('没有配置任何上架任务')
      return
    }
    
    const totalTasks = taskGroups.reduce((sum, g) => sum + g.tasks.length, 0)
    toast.success(`已生成 ${taskGroups.length} 个任务组，共 ${totalTasks} 个上架任务`)
    
    onConfirm(taskGroups)
    resetState()
    onOpenChange(false)
  }

  const resetState = () => {
    setCurrentStep('select-root')
    setProducts([])
    setEditProduct(null)
  }

  const selectedTargetsCount = availableTargets.filter(t => t.enabled).length
  const enabledProductCount = products.filter(p => 
    Array.from(p.targets.values()).some(v => v)
  ).length
  const totalTaskCount = products.reduce((sum, p) => 
    sum + Array.from(p.targets.values()).filter(Boolean).length, 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            商品批量导入
          </DialogTitle>
          <DialogDescription>
            选择商品文件夹，配置目标平台，支持多平台多店铺同时上架
          </DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center py-3">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'select-root' && (
            <FolderSelectView scanning={scanning} onSelect={handleSelectRootFolder} />
          )}

          {currentStep === 'config-targets' && (
            <ConfigTargetsView
              products={products}
              availableTargets={availableTargets}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onToggleTarget={handleToggleTarget}
              onTogglePlatformAll={handleTogglePlatformAll}
              onEdit={setEditProduct}
            />
          )}

          {currentStep === 'plan-review' && (
            <PlanReviewView
              taskGroups={generateTaskGroups()}
              onBack={() => setCurrentStep('config-targets')}
            />
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {currentStep === 'config-targets' && (
              <span>
                已选择 <strong>{enabledProductCount}</strong> 个商品，
                共 <strong>{totalTaskCount}</strong> 个上架任务
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep !== 'select-root' && (
              <Button variant="outline" onClick={() => {
                if (currentStep === 'config-targets') {
                  setCurrentStep('select-root')
                } else {
                  setCurrentStep('config-targets')
                }
              }}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                上一步
              </Button>
            )}
            
            {currentStep === 'config-targets' && (
              <Button onClick={() => setCurrentStep('plan-review')} disabled={totalTaskCount === 0}>
                下一步
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === 'plan-review' && (
              <Button onClick={handleConfirm}>
                <Play className="mr-2 h-4 w-4" />
                开始上传
              </Button>
            )}
          </div>
        </div>

        {/* 编辑对话框 */}
        {editProduct && (
          <ProductEditDialog
            product={editProduct}
            onChange={setEditProduct}
            onClose={() => setEditProduct(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** 步骤指示器 */
function StepIndicator({ currentStep }: { currentStep: Step }): React.ReactElement {
  const steps = [
    { id: 'select-root', label: '选择文件夹' },
    { id: 'config-targets', label: '配置目标' },
    { id: 'plan-review', label: '任务规划' },
  ]

  const currentIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full transition-colors',
            index === currentIndex && 'bg-primary text-primary-foreground',
            index < currentIndex && 'bg-green-100 text-green-700',
            index > currentIndex && 'bg-muted text-muted-foreground'
          )}>
            {index < currentIndex ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-sm font-medium">{index + 1}</span>
            )}
            <span className="text-sm">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/** 步骤1：选择文件夹 */
function FolderSelectView({ scanning, onSelect }: { scanning: boolean; onSelect: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer max-w-lg',
          'hover:border-primary hover:bg-primary/5',
          scanning && 'opacity-50 pointer-events-none'
        )}
        onClick={onSelect}
      >
        {scanning ? (
          <>
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-medium">扫描中...</p>
          </>
        ) : (
          <>
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">点击选择商品文件夹</p>
            <p className="text-sm text-muted-foreground mt-2">
              选择包含多个商品子文件夹的根目录
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** 步骤2：配置目标平台 */
function ConfigTargetsView({
  products,
  availableTargets,
  viewMode,
  onViewModeChange,
  onToggleTarget,
  onTogglePlatformAll,
  onEdit,
}: {
  products: ProductData[]
  availableTargets: TargetConfig[]
  viewMode: 'grid' | 'matrix'
  onViewModeChange: (mode: 'grid' | 'matrix') => void
  onToggleTarget: (productId: string, targetKey: string) => void
  onTogglePlatformAll: (targetKey: string, enabled: boolean) => void
  onEdit: (product: ProductData) => void
}): React.ReactElement {
  if (viewMode === 'matrix') {
    return (
      <MatrixView
        products={products}
        availableTargets={availableTargets}
        onToggleTarget={onToggleTarget}
        onTogglePlatformAll={onTogglePlatformAll}
        onEdit={onEdit}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* 视图切换和平台选择 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">目标平台：</span>
          {availableTargets.map(target => (
            <Badge
              key={`${target.platform}:${target.profileId}`}
              variant={target.enabled ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer',
                target.enabled && 'bg-green-600'
              )}
            >
              {target.platformName} / {target.profileName}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <List className="h-4 w-4 mr-1" />
            列表
          </Button>
          <Button
            variant={viewMode === 'matrix' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('matrix')}
          >
            <Grid3x3 className="h-4 w-4 mr-1" />
            矩阵
          </Button>
        </div>
      </div>

      {/* 商品列表 */}
      <ScrollArea className="h-[450px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <ProductConfigCard
              key={product.id}
              product={product}
              availableTargets={availableTargets}
              onToggleTarget={onToggleTarget}
              onEdit={() => onEdit(product)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

/** 商品配置卡片 */
function ProductConfigCard({
  product,
  availableTargets,
  onToggleTarget,
  onEdit,
}: {
  product: ProductData
  availableTargets: TargetConfig[]
  onToggleTarget: (productId: string, targetKey: string) => void
  onEdit: () => void
}): React.ReactElement {
  const selectedCount = Array.from(product.targets.values()).filter(Boolean).length

  return (
    <Card className="overflow-hidden">
      <div className={cn(
        'h-1',
        selectedCount > 0 ? 'bg-green-500' : 'bg-yellow-400'
      )} />
      
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="w-16 h-16 flex-shrink-0">
            {product.images.length > 0 ? (
              <img
                src={`file://${product.images[0]}`}
                alt=""
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">
              {product.baseInfo?.title || product.folderName}
            </h4>
            <p className="text-sm text-primary font-bold">
              {product.baseInfo?.price > 0 && `¥${product.baseInfo.price}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {product.imageCount} 图
              </Badge>
              {selectedCount > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50">
                  已选 {selectedCount}
                </Badge>
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>

        {/* 目标平台选择 */}
        <div className="mt-3 pt-3 border-t space-y-2">
          {availableTargets.map(target => {
            const key = `${target.platform}:${target.profileId}`
            const selected = product.targets.get(key)
            return (
              <div
                key={key}
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onToggleTarget(product.id, key)}
              >
                {selected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {target.platformName} / {target.profileName}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** 矩阵视图 */
function MatrixView({
  products,
  availableTargets,
  onToggleTarget,
  onTogglePlatformAll,
  onEdit,
}: {
  products: ProductData[]
  availableTargets: TargetConfig[]
  onToggleTarget: (productId: string, targetKey: string) => void
  onTogglePlatformAll: (targetKey: string, enabled: boolean) => void
  onEdit: (product: ProductData) => void
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <ScrollArea className="h-[500px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr>
              <th className="text-left p-2 border-b w-48">商品</th>
              {availableTargets.map(target => (
                <th key={`${target.platform}:${target.profileId}`} className="p-2 border-b text-center min-w-[120px]">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{target.platformName}</div>
                    <div className="text-xs text-muted-foreground">{target.profileName}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs w-full"
                      onClick={() => {
                        const selectedCount = products.filter(p => 
                          p.targets.get(`${target.platform}:${target.profileId}`)
                        ).length
                        onTogglePlatformAll(
                          `${target.platform}:${target.profileId}`,
                          selectedCount < products.length
                        )
                      }}
                    >
                      全选/取消
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="hover:bg-muted/50">
                <td className="p-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex-shrink-0">
                      {product.images.length > 0 ? (
                        <img
                          src={`file://${product.images[0]}`}
                          alt=""
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {product.baseInfo?.title || product.folderName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ¥{product.baseInfo?.price || 0}
                      </div>
                    </div>
                  </div>
                </td>
                {availableTargets.map(target => {
                  const key = `${target.platform}:${target.profileId}`
                  const selected = product.targets.get(key)
                  return (
                    <td key={key} className="p-2 border-b text-center">
                      <button
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-colors mx-auto',
                          selected
                            ? 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                        )}
                        onClick={() => onToggleTarget(product.id, key)}
                      >
                        {selected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/50">
            <tr>
              <td className="p-2 border-b font-medium">已选商品</td>
              {availableTargets.map(target => {
                const key = `${target.platform}:${target.profileId}`
                const count = products.filter(p => p.targets.get(key)).length
                return (
                  <td key={key} className="p-2 border-b text-center">
                    <Badge variant="outline">{count} 个</Badge>
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </ScrollArea>
    </div>
  )
}

/** 步骤3：任务规划预览 */
function PlanReviewView({
  taskGroups,
  onBack,
}: {
  taskGroups: TaskGroup[]
  onBack: () => void
}): React.ReactElement {
  const totalTasks = taskGroups.reduce((sum, g) => sum + g.tasks.length, 0)

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">任务规划摘要</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">任务组数：</span>
            <span className="font-bold">{taskGroups.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">总任务数：</span>
            <span className="font-bold">{totalTasks}</span>
          </div>
          <div>
            <span className="text-muted-foreground">并行店铺：</span>
            <span className="font-bold">{taskGroups.length}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {taskGroups.map(group => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{group.platformName} / {group.profileName}</span>
                  <Badge variant="secondary">{group.tasks.length} 个任务</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.tasks.map((task, index) => (
                    <div
                      key={`${task.productId}-${index}`}
                      className="flex items-center gap-3 p-2 bg-muted/50 rounded"
                    >
                      <div className="w-8 h-8 flex-shrink-0">
                        {task.images.length > 0 ? (
                          <img
                            src={`file://${task.images[0]}`}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {task.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {task.images.length} 张图片
                          {task.skus && task.skus.length > 0 && ` / ${task.skus.length} SKU`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        待执行
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

/** 商品编辑对话框 */
function ProductEditDialog({
  product,
  onChange,
  onClose,
}: {
  product: ProductData
  onChange: (product: ProductData) => void
  onClose: () => void
}): React.ReactElement {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑商品信息</DialogTitle>
          <DialogDescription>{product.folderName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {product.images.map((img, i) => (
              <div key={i} className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border">
                <img src={`file://${img}`} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>商品标题</Label>
            <Input
              value={product.baseInfo?.title || ''}
              onChange={(e) => onChange({
                ...product,
                baseInfo: { ...product.baseInfo!, title: e.target.value }
              })}
              placeholder="输入商品标题"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>价格</Label>
              <Input
                type="number"
                value={product.baseInfo?.price || ''}
                onChange={(e) => onChange({
                  ...product,
                  baseInfo: { ...product.baseInfo!, price: parseFloat(e.target.value) || 0 }
                })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>产地</Label>
              <Input
                value={product.baseInfo?.origin || ''}
                onChange={(e) => onChange({
                  ...product,
                  baseInfo: { ...product.baseInfo!, origin: e.target.value }
                })}
                placeholder="如：浙江"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={onClose}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
