/**
 * ProductImportWizard - 商品导入向导 v2
 * 
 * 文件结构：
 * 📁 /商品上架/
 * ├── 📁 001_夏季短袖/
 * │   ├── 🖼️ 001.jpg
 * │   ├── 🖼️ 001_1.jpg
 * │   ├── 📄 products.csv   ← 商品参数
 * │   └── 📄 skus.csv      ← SKU参数
 * ├── 📁 002_牛仔裤/
 * │   ├── 🖼️ 002.jpg
 * │   ├── 📄 products.csv
 * │   └── 📄 skus.csv
 * └── ...
 */

import * as React from 'react'
import {
  FolderOpen,
  FileSpreadsheet,
  Image,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
  Loader2,
  AlertCircle,
  Layers,
  Package,
  Edit3,
  Plus,
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/** 商品基础信息 */
interface ProductBaseInfo {
  title: string
  price: number
  origin?: string
  description?: string
  freight?: string
  weight?: string
  brand?: string
  category?: string
}

/** SKU 信息 */
interface SKUInfo {
  code: string
  stock: number
  price?: number
  color?: string
  size?: string
  specs?: Record<string, string>
}

/** 单个商品完整数据 */
interface ProductData {
  id: string
  folderPath: string
  folderName: string
  images: string[]
  imageCount: number
  baseInfo?: ProductBaseInfo
  skus?: SKUInfo[]
  hasProductsCsv: boolean
  hasSkusCsv: boolean
  readError?: string
}

/** 预览编辑状态 */
interface PreviewEditState {
  folderName: string
  title: string
  price: string
  origin: string
  description: string
  images: string[]
  skus: SKUInfo[]
}

interface ProductImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (products: ProductData[]) => void
  defaultPlatform?: string
  availableProfiles?: Array<{ id: string; name: string; platform: string }>
}

type Step = 'select-root' | 'preview-edit' | 'confirm'

export function ProductImportWizard({
  open,
  onOpenChange,
  onConfirm,
  defaultPlatform = 'pinduoduo',
  availableProfiles = [],
}: ProductImportWizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState<Step>('select-root')
  const [platform, setPlatform] = React.useState(defaultPlatform)
  const [profileId, setProfileId] = React.useState('')
  const [selectedProducts, setSelectedProducts] = React.useState<ProductData[]>([])
  const [rootPath, setRootPath] = React.useState('')
  const [scanning, setScanning] = React.useState(false)
  const [editProduct, setEditProduct] = React.useState<PreviewEditState | null>(null)

  /** 选择根文件夹并扫描 */
  const handleSelectRootFolder = async () => {
    setScanning(true)
    try {
      const result = await window.electronAPI.selectImageFolders(false)
      if (result.success && result.folders?.[0]) {
        const root = result.folders[0]
        setRootPath(root.path)

        // 扫描子文件夹
        const scanResult = await window.electronAPI.scanProductFolders(root.path)
        if (scanResult.success && scanResult.products) {
          setSelectedProducts(scanResult.products)
          toast.success(`扫描完成，发现 ${scanResult.products.length} 个商品`)
          setCurrentStep('preview-edit')
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

  /** 更新商品选择状态 */
  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.map(p => p.id === id ? { ...p, _selected: !p._selected } : p)
    )
  }

  /** 编辑商品信息 */
  const handleEditProduct = (product: ProductData) => {
    setEditProduct({
      folderName: product.folderName,
      title: product.baseInfo?.title || product.folderName,
      price: product.baseInfo?.price?.toString() || '',
      origin: product.baseInfo?.origin || '',
      description: product.baseInfo?.description || '',
      images: product.images,
      skus: product.skus || [],
    })
  }

  /** 保存编辑 */
  const handleSaveEdit = () => {
    if (!editProduct) return
    
    setSelectedProducts(prev =>
      prev.map(p =>
        p.folderName === editProduct.folderName
          ? {
              ...p,
              baseInfo: {
                title: editProduct.title,
                price: parseFloat(editProduct.price) || 0,
                origin: editProduct.origin,
                description: editProduct.description,
              },
              skus: editProduct.skus,
            }
          : p
      )
    )
    setEditProduct(null)
    toast.success('已保存修改')
  }

  /** 确认并执行 */
  const handleConfirm = () => {
    const validProducts = selectedProducts.filter(p => p.baseInfo?.title)
    if (validProducts.length === 0) {
      toast.error('没有可上传的商品')
      return
    }
    
    onConfirm(validProducts.map(p => ({
      ...p,
      platform,
      profileId: profileId || undefined,
    })))
    
    resetState()
    onOpenChange(false)
  }

  const resetState = () => {
    setCurrentStep('select-root')
    setSelectedProducts([])
    setRootPath('')
    setEditProduct(null)
  }

  const selectedCount = selectedProducts.filter(p => p._selected !== false).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            商品批量导入
          </DialogTitle>
          <DialogDescription>
            选择商品文件夹，自动读取图片和参数文件
          </DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center py-3">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'select-root' && (
            <FolderSelectView
              scanning={scanning}
              onSelectFolder={handleSelectRootFolder}
            />
          )}

          {currentStep === 'preview-edit' && (
            <PreviewEditView
              products={selectedProducts}
              platform={platform}
              onPlatformChange={setPlatform}
              profileId={profileId}
              onProfileChange={setProfileId}
              availableProfiles={availableProfiles}
              onEdit={handleEditProduct}
              onToggle={handleToggleProduct}
            />
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {currentStep === 'preview-edit' && (
              <span>
                已选择 <strong>{selectedProducts.length}</strong> 个商品
                {selectedProducts.filter(p => p.baseInfo?.title).length > 0 && (
                  <span className="ml-2 text-green-600">
                    ({selectedProducts.filter(p => p.baseInfo?.title).length} 个已配置)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep === 'preview-edit' && (
              <Button variant="outline" onClick={resetState}>
                重新选择
              </Button>
            )}
            {currentStep === 'preview-edit' && (
              <Button onClick={() => setCurrentStep('confirm')} disabled={selectedProducts.length === 0}>
                下一步
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {currentStep === 'confirm' && (
              <>
                <Button variant="outline" onClick={() => setCurrentStep('preview-edit')}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={handleConfirm}>
                  <Check className="mr-2 h-4 w-4" />
                  开始上传
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 编辑对话框 */}
        <ProductEditDialog
          open={!!editProduct}
          onOpenChange={(open) => !open && setEditProduct(null)}
          product={editProduct}
          onChange={setEditProduct}
          onSave={handleSaveEdit}
        />
      </DialogContent>
    </Dialog>
  )
}

/** 步骤指示器 */
function StepIndicator({ currentStep }: { currentStep: Step }): React.ReactElement {
  const steps = [
    { id: 'select-root', label: '选择文件夹' },
    { id: 'preview-edit', label: '预览编辑' },
    { id: 'confirm', label: '确认上传' },
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

/** 步骤1：选择文件夹视图 */
function FolderSelectView({
  scanning,
  onSelectFolder,
}: {
  scanning: boolean
  onSelectFolder: () => void
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={cn(
        'border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer',
        'hover:border-primary hover:bg-primary/5',
        scanning && 'opacity-50 pointer-events-none'
      )}
        onClick={onSelectFolder}
      >
        {scanning ? (
          <>
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-medium">扫描中...</p>
            <p className="text-sm text-muted-foreground mt-2">
              正在读取文件夹结构和参数文件
            </p>
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

      <div className="mt-8 bg-muted/50 rounded-lg p-4 max-w-lg">
        <h4 className="font-medium mb-2">文件夹结构说明</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <code className="block bg-muted p-2 rounded text-xs">
            📁 /商品上架/ (选择这个文件夹)<br />
            &nbsp;&nbsp;├── 📁 001_夏季短袖/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;├── 🖼️ 001.jpg<br />
            &nbsp;&nbsp;&nbsp;&nbsp;├── 📄 products.csv<br />
            &nbsp;&nbsp;&nbsp;&nbsp;└── 📄 skus.csv<br />
            &nbsp;&nbsp;├── 📁 002_牛仔裤/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;├── 🖼️ 002.jpg<br />
            &nbsp;&nbsp;&nbsp;&nbsp;├── 📄 products.csv<br />
            &nbsp;&nbsp;&nbsp;&nbsp;└── 📄 skus.csv<br />
          </code>
        </div>
      </div>
    </div>
  )
}

/** 步骤2：预览编辑视图 */
function PreviewEditView({
  products,
  platform,
  onPlatformChange,
  profileId,
  onProfileChange,
  availableProfiles,
  onEdit,
  onToggle,
}: {
  products: ProductData[]
  platform: string
  onPlatformChange: (v: string) => void
  profileId: string
  onProfileChange: (v: string) => void
  availableProfiles: Array<{ id: string; name: string; platform: string }>
  onEdit: (p: ProductData) => void
  onToggle: (id: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* 筛选和设置 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm">目标平台:</span>
          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="pinduoduo">拼多多</option>
            <option value="douyin">抖音</option>
            <option value="taobao">淘宝</option>
            <option value="jd">京东</option>
          </select>
          
          <span className="text-sm ml-4">店铺:</span>
          <select
            value={profileId}
            onChange={(e) => onProfileChange(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">默认店铺</option>
            {availableProfiles
              .filter(p => p.platform === platform)
              .map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span>已配置:</span>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {products.filter(p => p.baseInfo?.title).length}
          </Badge>
          <span>/</span>
          <Badge variant="outline">{products.length}</Badge>
        </div>
      </div>

      {/* 商品列表 */}
      <ScrollArea className="h-[450px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => onEdit(product)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

/** 商品卡片 */
function ProductCard({
  product,
  onEdit,
}: {
  product: ProductData
  onEdit: () => void
}): React.ReactElement {
  const hasBaseInfo = !!product.baseInfo?.title
  const hasSkus = product.skus && product.skus.length > 0
  const hasError = !!product.readError

  return (
    <Card className={cn(
      'overflow-hidden transition-colors hover:bg-muted/50',
      hasError && 'border-red-300 bg-red-50/50'
    )}>
      {/* 顶部状态条 */}
      <div className={cn(
        'h-1',
        hasBaseInfo ? 'bg-green-500' : hasError ? 'bg-red-400' : 'bg-yellow-400'
      )} />

      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* 图片预览 */}
          <div className="w-20 h-20 flex-shrink-0">
            {product.images.length > 0 ? (
              <div className="w-full h-full grid grid-cols-2 gap-0.5">
                {product.images.slice(0, 4).map((img, i) => (
                  <div key={i} className="bg-muted overflow-hidden rounded">
                    <img
                      src={`file://${img}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate" title={product.baseInfo?.title || product.folderName}>
                  {product.baseInfo?.title || product.folderName}
                  {!hasBaseInfo && (
                    <Badge variant="outline" className="ml-2 text-xs bg-yellow-50">未配置</Badge>
                  )}
                </h4>
                {product.baseInfo?.price > 0 && (
                  <p className="text-lg font-bold text-primary">
                    ¥{product.baseInfo.price}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {product.imageCount} 图
              </Badge>
              {product.hasProductsCsv && (
                <Badge variant="outline" className="text-xs bg-green-50">参数</Badge>
              )}
              {hasSkus && (
                <Badge variant="outline" className="text-xs bg-blue-50">
                  SKU {product.skus!.length}
                </Badge>
              )}
            </div>

            {hasError && (
              <p className="text-xs text-red-500 mt-2">{product.readError}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** 商品编辑对话框 */
function ProductEditDialog({
  open,
  onOpenChange,
  product,
  onChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: PreviewEditState | null
  onChange: (state: PreviewEditState) => void
  onSave: () => void
}): React.ReactElement {
  if (!product) return <></>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>编辑商品信息</DialogTitle>
          <DialogDescription>{product.folderName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 图片预览 */}
          <div>
            <Label className="text-sm font-medium">商品图片 ({product.images.length} 张)</Label>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <div key={i} className="w-20 h-20 flex-shrink-0 rounded overflow-hidden border">
                  <img src={`file://${img}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* 基础信息 */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              基础信息
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">商品标题 *</Label>
                <Input
                  value={product.title}
                  onChange={(e) => onChange({ ...product, title: e.target.value })}
                  placeholder="输入商品标题"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">价格 *</Label>
                <Input
                  type="number"
                  value={product.price}
                  onChange={(e) => onChange({ ...product, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">产地</Label>
                <Input
                  value={product.origin}
                  onChange={(e) => onChange({ ...product, origin: e.target.value })}
                  placeholder="如：浙江"
                />
              </div>
              
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">商品描述</Label>
                <Textarea
                  value={product.description}
                  onChange={(e) => onChange({ ...product, description: e.target.value })}
                  placeholder="商品描述..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* SKU 信息 */}
          {product.skus.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                SKU 信息 ({product.skus.length})
              </h4>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">货号</th>
                      <th className="text-left p-2 font-medium">库存</th>
                      <th className="text-left p-2 font-medium">规格</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.skus.map((sku, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{sku.code}</td>
                        <td className="p-2">{sku.stock}</td>
                        <td className="p-2 text-muted-foreground">
                          {[sku.color, sku.size].filter(Boolean).join(' / ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave}>
            <Check className="mr-2 h-4 w-4" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
