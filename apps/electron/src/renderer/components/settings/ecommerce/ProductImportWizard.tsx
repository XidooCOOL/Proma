/**
 * ProductImportWizard - 商品导入向导
 * 
 * 支持的导入方式：
 * 1. 选择图片文件夹（每个文件夹 = 一个商品）
 * 2. 商品参数 Excel（标题、价格、产地等）
 * 3. SKU 参数 Excel（货号、库存、规格等）
 * 4. 支持同时上架多个商品
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
  Plus,
  Minus,
  Eye,
  Loader2,
  AlertCircle,
  Layers,
  Package,
  Settings,
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
  freight?: string
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

/** 单个商品的完整数据 */
interface ProductData {
  id: string
  folderPath: string
  folderName: string
  images: string[]
  imageCount: number
  baseInfo?: ProductBaseInfo
  skus?: SKUInfo[]
  platform?: string
  profileId?: string
}

/** Excel 数据映射 */
interface ExcelMapping {
  filePath: string
  sheetName?: string
  columnMapping: {
    folderName?: number  // 对应哪个文件夹
    title?: number
    price?: number
    origin?: number
    description?: number
    freight?: number
  }
}

/** SKU Excel 映射 */
interface SKUExcelMapping {
  filePath: string
  sheetName?: string
  groupBy?: number  // 按哪列分组（对应文件夹名）
  codeColumn?: number
  stockColumn?: number
  priceColumn?: number
  colorColumn?: number
  sizeColumn?: number
}

interface ProductImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (products: ProductData[]) => void
  defaultPlatform?: string
  availableProfiles?: Array<{ id: string; name: string; platform: string }>
}

type Step = 'select-folders' | 'select-excel' | 'sku-excel' | 'preview' | 'confirm'

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: 'select-folders', label: '选择图片', description: '选择商品图片文件夹' },
  { id: 'select-excel', label: '商品参数', description: '导入商品基础信息' },
  { id: 'sku-excel', label: 'SKU参数', description: '导入库存规格' },
  { id: 'preview', label: '预览确认', description: '预览并确认' },
  { id: 'confirm', label: '开始上传', description: '执行上架' },
]

export function ProductImportWizard({
  open,
  onOpenChange,
  onConfirm,
  defaultPlatform = 'pinduoduo',
  availableProfiles = [],
}: ProductImportWizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState<Step>('select-folders')
  const [platform, setPlatform] = React.useState(defaultPlatform)
  const [profileId, setProfileId] = React.useState('')
  
  // Step 1: 图片文件夹
  const [selectedFolders, setSelectedFolders] = React.useState<ProductData[]>([])
  const [includeSubfolders, setIncludeSubfolders] = React.useState(false)
  
  // Step 2: 商品参数 Excel
  const [baseExcelFile, setBaseExcelFile] = React.useState<string | null>(null)
  const [baseExcelData, setBaseExcelData] = React.useState<Record<string, ProductBaseInfo>>({})
  
  // Step 3: SKU 参数 Excel
  const [skuExcelFile, setSkuExcelFile] = React.useState<string | null>(null)
  const [skuExcelData, setSkuExcelData] = React.useState<Record<string, SKUInfo[]>>({})
  
  // Step 4: 预览数据
  const [previewProducts, setPreviewProducts] = React.useState<ProductData[]>([])

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  const canGoNext = () => {
    switch (currentStep) {
      case 'select-folders':
        return selectedFolders.length > 0
      case 'select-excel':
        return true // Excel 可选
      case 'sku-excel':
        return true // SKU 可选
      case 'preview':
        return previewProducts.length > 0
      default:
        return false
    }
  }

  const handleNext = async () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex >= STEPS.length) {
      handleConfirm()
      return
    }
    
    const nextStep = STEPS[nextIndex].id
    
    if (nextStep === 'preview') {
      await buildPreview()
    }
    
    setCurrentStep(nextStep)
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }

  /** 选择图片文件夹 */
  const handleSelectFolders = async () => {
    try {
      const result = await window.electronAPI.selectImageFolders(includeSubfolders)
      if (result.success && result.folders) {
        const folders: ProductData[] = result.folders.map((folder: any) => ({
          id: `product-${Date.now()}-${Math.random()}`,
          folderPath: folder.path,
          folderName: folder.name,
          images: folder.images || [],
          imageCount: folder.imageCount || 0,
        }))
        setSelectedFolders(folders)
        toast.success(`已选择 ${folders.length} 个图片文件夹`)
      }
    } catch (error) {
      toast.error('选择文件夹失败')
    }
  }

  /** 读取商品参数 Excel */
  const handleSelectBaseExcel = async () => {
    try {
      const result = await window.electronAPI.selectExcelFile()
      if (result.success && result.filePath) {
        setBaseExcelFile(result.filePath)
        
        // 读取并解析 Excel
        const data = await window.electronAPI.readExcelData(result.filePath)
        if (data.success && data.rows) {
          // 按文件夹名索引
          const indexed: Record<string, ProductBaseInfo> = {}
          for (const row of data.rows) {
            const folderName = row[0] // 第一列是文件夹名
            if (folderName) {
              indexed[folderName] = {
                title: row[1] || '',
                price: parseFloat(row[2]) || 0,
                origin: row[3] || '',
                description: row[4] || '',
                freight: row[5] || '',
              }
            }
          }
          setBaseExcelData(indexed)
          toast.success(`已读取 ${Object.keys(indexed).length} 条商品参数`)
        }
      }
    } catch (error) {
      toast.error('读取 Excel 失败')
    }
  }

  /** 读取 SKU 参数 Excel */
  const handleSelectSkuExcel = async () => {
    try {
      const result = await window.electronAPI.selectExcelFile()
      if (result.success && result.filePath) {
        setSkuExcelFile(result.filePath)
        
        const data = await window.electronAPI.readExcelData(result.filePath)
        if (data.success && data.rows) {
          // 按文件夹名分组
          const grouped: Record<string, SKUInfo[]> = {}
          for (const row of data.rows) {
            const folderName = row[0] // 第一列是文件夹名
            if (folderName) {
              if (!grouped[folderName]) {
                grouped[folderName] = []
              }
              grouped[folderName].push({
                code: row[1] || '',
                stock: parseInt(row[2]) || 0,
                price: parseFloat(row[3]) || undefined,
                color: row[4] || '',
                size: row[5] || '',
              })
            }
          }
          setSkuExcelData(grouped)
          toast.success(`已读取 SKU 数据，${Object.keys(grouped).length} 个商品`)
        }
      }
    } catch (error) {
      toast.error('读取 SKU Excel 失败')
    }
  }

  /** 构建预览数据 */
  const buildPreview = async () => {
    const products: ProductData[] = selectedFolders.map(folder => {
      const baseInfo = baseExcelData[folder.folderName]
      const skus = skuExcelData[folder.folderName]
      
      return {
        ...folder,
        baseInfo,
        skus,
        platform,
        profileId: profileId || undefined,
      }
    })
    
    setPreviewProducts(products)
  }

  /** 确认并执行 */
  const handleConfirm = () => {
    if (previewProducts.length === 0) {
      toast.error('没有可上传的商品')
      return
    }
    
    onConfirm(previewProducts)
    resetState()
    onOpenChange(false)
  }

  /** 重置状态 */
  const resetState = () => {
    setCurrentStep('select-folders')
    setSelectedFolders([])
    setBaseExcelFile(null)
    setBaseExcelData({})
    setSkuExcelFile(null)
    setSkuExcelData({})
    setPreviewProducts([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            商品批量导入
          </DialogTitle>
          <DialogDescription>
            选择图片文件夹并导入商品参数，一次性上架多个商品
          </DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center py-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full transition-colors',
                index === currentStepIndex && 'bg-primary text-primary-foreground',
                index < currentStepIndex && 'bg-green-100 text-green-700',
                index > currentStepIndex && 'bg-muted text-muted-foreground'
              )}>
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
                <span className="text-sm hidden sm:inline">{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'select-folders' && (
            <FolderSelectStep
              selectedFolders={selectedFolders}
              includeSubfolders={includeSubfolders}
              onIncludeSubfoldersChange={setIncludeSubfolders}
              onSelectFolders={handleSelectFolders}
            />
          )}
          
          {currentStep === 'select-excel' && (
            <ExcelSelectStep
              title="商品参数 Excel"
              description="导入标题、价格、产地等基础信息"
              file={baseExcelFile}
              data={baseExcelData}
              sampleHeaders={['文件夹名', '标题', '价格', '产地', '描述', '运费']}
              onSelect={handleSelectBaseExcel}
              optional
            />
          )}
          
          {currentStep === 'sku-excel' && (
            <ExcelSelectStep
              title="SKU 参数 Excel"
              description="导入货号、库存、规格等信息（可选）"
              file={skuExcelFile}
              data={skuExcelData}
              sampleHeaders={['文件夹名', '货号', '库存', '价格', '颜色', '尺码']}
              onSelect={handleSelectSkuExcel}
              optional
            />
          )}
          
          {currentStep === 'preview' && (
            <PreviewStep
              products={previewProducts}
              platform={platform}
              onPlatformChange={setPlatform}
              profileId={profileId}
              onProfileChange={setProfileId}
              availableProfiles={availableProfiles}
            />
          )}
          
          {currentStep === 'confirm' && (
            <ConfirmStep
              products={previewProducts}
              onConfirm={handleConfirm}
              onBack={handleBack}
            />
          )}
        </div>

        {/* 底部导航 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            上一步
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {selectedFolders.length > 0 && `${selectedFolders.length} 个商品待上传`}
          </div>
          
          <Button onClick={handleNext} disabled={!canGoNext()}>
            {currentStepIndex === STEPS.length - 1 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                开始上传
              </>
            ) : (
              <>
                下一步
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Step 1: 选择图片文件夹 */
function FolderSelectStep({
  selectedFolders,
  includeSubfolders,
  onIncludeSubfoldersChange,
  onSelectFolders,
}: {
  selectedFolders: ProductData[]
  includeSubfolders: boolean
  onIncludeSubfoldersChange: (v: boolean) => void
  onSelectFolders: () => void
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">选择图片文件夹</h3>
          <p className="text-sm text-muted-foreground">
            每个文件夹对应一个商品，文件夹内的图片将作为商品图片
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="subfolders"
              checked={includeSubfolders}
              onCheckedChange={onIncludeSubfoldersChange}
            />
            <Label htmlFor="subfolders" className="text-sm cursor-pointer">
              包含子目录
            </Label>
          </div>
          <Button onClick={onSelectFolders}>
            <FolderOpen className="mr-2 h-4 w-4" />
            选择文件夹
          </Button>
        </div>
      </div>

      {selectedFolders.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">点击上方按钮选择图片文件夹</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedFolders.map((folder) => (
              <div
                key={folder.id}
                className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-sm truncate flex-1" title={folder.folderName}>
                    {folder.folderName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {folder.imageCount} 张
                  </Badge>
                </div>
                {folder.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    {folder.images.slice(0, 3).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-muted rounded overflow-hidden"
                      >
                        <img
                          src={`file://${img}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {folder.images.length > 3 && (
                      <div className="aspect-square bg-muted rounded flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          +{folder.images.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">文件夹结构说明</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• 每个文件夹对应一个商品链接</p>
          <p>• 文件夹名称应与 Excel 中的「文件夹名」列对应</p>
          <p>• 支持 jpg、png、jpeg、gif、webp 格式</p>
          <p>• 第一张图片将作为商品主图</p>
        </div>
      </div>
    </div>
  )
}

/** Step 2/3: 选择 Excel */
function ExcelSelectStep({
  title,
  description,
  file,
  data,
  sampleHeaders,
  onSelect,
  optional,
}: {
  title: string
  description: string
  file: string | null
  data: Record<string, any>
  sampleHeaders: string[]
  onSelect: () => void
  optional: boolean
}): React.ReactElement {
  const dataCount = Object.keys(data).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            {title}
            {optional && <Badge variant="outline" className="text-xs">可选</Badge>}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={onSelect} variant={file ? 'outline' : 'default'}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {file ? '重新选择' : '选择 Excel'}
        </Button>
      </div>

      {file ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              已选择文件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono truncate" title={file}>{file}</p>
            {dataCount > 0 && (
              <Badge variant="secondary" className="mt-2">
                {dataCount} 条数据
              </Badge>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {optional ? '可选步骤，可跳过' : '点击上方按钮选择 Excel 文件'}
          </p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Excel 格式要求</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {sampleHeaders.map((h, i) => (
                  <th key={i} className="text-left py-1 px-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-muted-foreground">
                {sampleHeaders.map((h, i) => (
                  <td key={i} className="py-1 px-2">
                    {i === 0 ? '文件夹名称' : i === 1 ? '示例内容' : '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** Step 4: 预览 */
function PreviewStep({
  products,
  platform,
  onPlatformChange,
  profileId,
  onProfileChange,
  availableProfiles,
}: {
  products: ProductData[]
  platform: string
  onPlatformChange: (v: string) => void
  profileId: string
  onProfileChange: (v: string) => void
  availableProfiles: Array<{ id: string; name: string; platform: string }>
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">预览确认</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>目标平台:</Label>
            <select
              value={platform}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="pinduoduo">拼多多</option>
              <option value="douyin">抖音</option>
              <option value="taobao">淘宝</option>
              <option value="jd">京东</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label>店铺:</Label>
            <select
              value={profileId}
              onChange={(e) => onProfileChange(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">默认店铺</option>
              {availableProfiles
                .filter(p => p.platform === platform)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* 图片预览 */}
                  <div className="w-24 h-24 flex-shrink-0 grid grid-cols-2 gap-1">
                    {product.images.slice(0, 4).map((img, i) => (
                      <div key={i} className="bg-muted rounded overflow-hidden">
                        <img
                          src={`file://${img}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* 商品信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">
                          {product.baseInfo?.title || product.folderName}
                        </h4>
                        {product.baseInfo?.price && (
                          <p className="text-lg font-bold text-primary">
                            ¥{product.baseInfo.price}
                          </p>
                        )}
                      </div>
                      <Badge>{product.imageCount} 张图</Badge>
                    </div>
                    
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      {product.baseInfo?.origin && (
                        <span>产地: {product.baseInfo.origin}</span>
                      )}
                      {product.skus && product.skus.length > 0 && (
                        <span>SKU: {product.skus.length} 个规格</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

/** Step 5: 确认执行 */
function ConfirmStep({
  products,
  onConfirm,
  onBack,
}: {
  products: ProductData[]
  onConfirm: () => void
  onBack: () => void
}): React.ReactElement {
  const [isUploading, setIsUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const handleStart = async () => {
    setIsUploading(true)
    // 模拟上传进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300))
      setProgress(i)
    }
    onConfirm()
  }

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-medium mb-2">
          准备上传 {products.length} 个商品
        </h3>
        <p className="text-muted-foreground">
          点击「开始上传」后将自动执行上架操作
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>商品数量:</span>
          <span className="font-medium">{products.length} 个</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>图片总数:</span>
          <span className="font-medium">
            {products.reduce((sum, p) => sum + p.imageCount, 0)} 张
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>SKU 总数:</span>
          <span className="font-medium">
            {products.reduce((sum, p) => sum + (p.skus?.length || 0), 0)} 个
          </span>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>上传中...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onBack}>
          返回修改
        </Button>
        <Button onClick={handleStart} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              开始上传
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
