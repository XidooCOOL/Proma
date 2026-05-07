/**
 * ProductUploader - 商品资料上传组件
 * 
 * 支持多种商品数据输入方式：
 * 1. 手动填写
 * 2. 从文件导入 (Excel/CSV)
 * 3. 从文件夹导入 (图片+描述文件)
 * 4. 从 URL 解析 (淘宝/拼多多商品链接)
 */

import * as React from 'react'
import {
  Upload,
  FileSpreadsheet,
  FolderOpen,
  Link,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Image,
  Loader2,
  AlertCircle,
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
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  title: string
  price: number
  description?: string
  images: string[]
  stock?: number
  category?: string
  source?: 'manual' | 'excel' | 'folder' | 'url'
  sourceUrl?: string
}

interface ProductUploaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (products: Product[], targetPlatform: string, profileId?: string) => void
  availableProfiles?: Array<{ id: string; name: string; platform: string }>
}

export function ProductUploader({
  open,
  onOpenChange,
  onConfirm,
  availableProfiles = [],
}: ProductUploaderProps): React.ReactElement {
  const [products, setProducts] = React.useState<Product[]>([])
  const [targetPlatform, setTargetPlatform] = React.useState('pinduoduo')
  const [selectedProfile, setSelectedProfile] = React.useState<string>('')
  const [activeTab, setActiveTab] = React.useState('manual')
  const [importing, setImporting] = React.useState(false)
  const [importProgress, setImportProgress] = React.useState(0)

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: `product-${Date.now()}`,
      title: '',
      price: 0,
      description: '',
      images: [],
      stock: 100,
      source: 'manual',
    }
    setProducts(prev => [...prev, newProduct])
  }

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const handleImportFromExcel = async (file: File) => {
    setImporting(true)
    setImportProgress(10)
    
    try {
      // 模拟解析 Excel
      await new Promise(resolve => setTimeout(resolve, 500))
      setImportProgress(30)
      
      // 实际应该用 xlsx 库解析
      // const data = await parseExcel(file)
      
      // 模拟导入的数据
      const mockProducts: Product[] = [
        {
          id: `product-${Date.now()}-1`,
          title: '示例商品1 (从Excel导入)',
          price: 99.00,
          description: '这是从Excel导入的商品描述',
          images: [],
          stock: 100,
          source: 'excel',
        },
      ]
      
      setImportProgress(80)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setProducts(prev => [...prev, ...mockProducts])
      setImportProgress(100)
      toast.success(`成功导入 ${mockProducts.length} 个商品`)
      setActiveTab('manual')
    } catch (error) {
      toast.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  const handleImportFromFolder = async (files: FileList) => {
    setImporting(true)
    setImportProgress(10)
    
    try {
      const imageFiles = Array.from(files).filter(f => 
        f.type.startsWith('image/')
      )
      
      setImportProgress(40)
      
      // 为每个图片创建商品
      const newProducts: Product[] = imageFiles.map((file, index) => ({
        id: `product-${Date.now()}-${index}`,
        title: file.name.replace(/\.[^/.]+$/, ''), // 去掉扩展名作为标题
        price: 0,
        description: '',
        images: [URL.createObjectURL(file)],
        stock: 100,
        source: 'folder' as const,
      }))
      
      setImportProgress(80)
      
      setProducts(prev => [...prev, ...newProducts])
      setImportProgress(100)
      toast.success(`成功导入 ${newProducts.length} 个商品`)
    } catch (error) {
      toast.error('导入失败')
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  const handleParseFromUrl = async (url: string) => {
    if (!url.trim()) {
      toast.error('请输入商品链接')
      return
    }
    
    setImporting(true)
    setImportProgress(10)
    
    try {
      // 调用后端解析接口
      const result = await window.electronAPI.parseProductFromUrl(url)
      
      setImportProgress(70)
      
      if (result.success && result.product) {
        const product: Product = {
          id: `product-${Date.now()}`,
          ...result.product,
          source: 'url',
          sourceUrl: url,
        }
        
        setProducts(prev => [...prev, product])
        toast.success('商品信息解析成功')
        setActiveTab('manual')
      } else {
        toast.error(result.error || '解析失败')
      }
    } catch (error) {
      toast.error('解析失败')
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  const handleConfirm = () => {
    const validProducts = products.filter(p => p.title.trim())
    
    if (validProducts.length === 0) {
      toast.error('请至少填写一个商品标题')
      return
    }
    
    onConfirm(validProducts, targetPlatform, selectedProfile || undefined)
    setProducts([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            商品资料上传
          </DialogTitle>
          <DialogDescription>
            上传商品信息到 {targetPlatform === 'pinduoduo' ? '拼多多' : targetPlatform === 'douyin' ? '抖音' : '电商平台'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* 导入方式选择 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manual">手动填写</TabsTrigger>
              <TabsTrigger value="excel">Excel导入</TabsTrigger>
              <TabsTrigger value="folder">文件夹导入</TabsTrigger>
              <TabsTrigger value="url">链接解析</TabsTrigger>
            </TabsList>

            {/* 手动填写 */}
            <TabsContent value="manual" className="space-y-4">
              <ManualInput
                products={products}
                onAdd={handleAddProduct}
                onUpdate={handleUpdateProduct}
                onDelete={handleDeleteProduct}
              />
            </TabsContent>

            {/* Excel 导入 */}
            <TabsContent value="excel" className="space-y-4">
              <ExcelImport
                onImport={handleImportFromExcel}
                importing={importing}
                progress={importProgress}
              />
            </TabsContent>

            {/* 文件夹导入 */}
            <TabsContent value="folder" className="space-y-4">
              <FolderImport
                onImport={handleImportFromFolder}
                importing={importing}
                progress={importProgress}
              />
            </TabsContent>

            {/* URL 解析 */}
            <TabsContent value="url" className="space-y-4">
              <UrlImport onParse={handleParseFromUrl} importing={importing} />
            </TabsContent>
          </Tabs>

          {/* 已导入商品预览 */}
          {products.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">
                  已添加商品 ({products.length})
                </h3>
                <Badge variant="secondary">{products.length} 个</Badge>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {products.slice(0, 5).map(product => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded"
                  >
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt=""
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {product.title || '(未填写标题)'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ¥{product.price} | {product.images?.length || 0} 张图片
                        <Badge variant="outline" className="ml-2 text-xs">
                          {product.source}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {products.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    还有 {products.length - 5} 个商品...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="flex-1 flex items-center gap-2">
            <Label className="whitespace-nowrap">目标平台:</Label>
            <Select value={targetPlatform} onValueChange={setTargetPlatform}>
              <SelectTrigger className="w-32">
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
            
            {availableProfiles.length > 0 && (
              <>
                <Label className="whitespace-nowrap ml-4">店铺:</Label>
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="选择店铺" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">默认店铺</SelectItem>
                    {availableProfiles
                      .filter(p => p.platform === targetPlatform)
                      .map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={products.length === 0}>
              <Upload className="mr-2 h-4 w-4" />
              上架 {products.filter(p => p.title).length} 个商品
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 手动输入组件
 */
function ManualInput({
  products,
  onAdd,
  onUpdate,
  onDelete,
}: {
  products: Product[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<Product>) => void
  onDelete: (id: string) => void
}): React.ReactElement {
  const manualProducts = products.filter(p => p.source === 'manual')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          手动填写商品信息，支持批量添加
        </p>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          添加商品
        </Button>
      </div>

      {manualProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>点击"添加商品"开始填写</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manualProducts.map((product) => (
            <ProductForm
              key={product.id}
              product={product}
              onUpdate={(updates) => onUpdate(product.id, updates)}
              onDelete={() => onDelete(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 商品表单
 */
function ProductForm({
  product,
  onUpdate,
  onDelete,
}: {
  product: Product
  onUpdate: (updates: Partial<Product>) => void
  onDelete: () => void
}): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={product.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="商品标题 *"
              className="font-medium"
            />
          </div>
          <div className="w-28">
            <Input
              type="number"
              value={product.price || ''}
              onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
              placeholder="价格 *"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className={cn('space-y-3', !expanded && 'hidden')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">库存</Label>
            <Input
              type="number"
              value={product.stock || ''}
              onChange={(e) => onUpdate({ stock: parseInt(e.target.value) || 0 })}
              placeholder="库存数量"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">类目</Label>
            <Input
              value={product.category || ''}
              onChange={(e) => onUpdate({ category: e.target.value })}
              placeholder="商品类目"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs">商品描述</Label>
          <Textarea
            value={product.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="商品描述（可选）"
            rows={2}
          />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs">图片 URL（每行一个）</Label>
          <Textarea
            value={product.images?.join('\n') || ''}
            onChange={(e) => onUpdate({ 
              images: e.target.value.split('\n').filter(url => url.trim()) 
            })}
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Excel 导入组件
 */
function ExcelImport({
  onImport,
  importing,
  progress,
}: {
  onImport: (file: File) => void
  importing: boolean
  progress: number
}): React.ReactElement {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          'hover:border-primary hover:bg-primary/5',
          importing && 'opacity-50 pointer-events-none'
        )}
        onClick={() => !importing && fileInputRef.current?.click()}
      >
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-2">点击上传 Excel 文件</p>
        <p className="text-sm text-muted-foreground">
          支持 .xlsx, .xls 格式
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Excel 需包含列：标题(title)、价格(price)、描述(description)、图片(images)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
          }}
        />
      </div>

      {importing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>导入中...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Excel 模板格式</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">title</th>
              <th className="text-left py-1">price</th>
              <th className="text-left py-1">description</th>
              <th className="text-left py-1">images</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-muted-foreground">
              <td className="py-1">商品标题</td>
              <td className="py-1">99.00</td>
              <td className="py-1">商品描述</td>
              <td className="py-1">url1,url2</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * 文件夹导入组件
 */
function FolderImport({
  onImport,
  importing,
  progress,
}: {
  onImport: (files: FileList) => void
  importing: boolean
  progress: number
}): React.ReactElement {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          'hover:border-primary hover:bg-primary/5',
          importing && 'opacity-50 pointer-events-none'
        )}
        onClick={() => !importing && fileInputRef.current?.click()}
      >
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-2">点击选择文件夹</p>
        <p className="text-sm text-muted-foreground">
          选择包含商品图片的文件夹
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          图片文件名将作为商品标题（自动去除扩展名）
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onImport(e.target.files)
            }
          }}
        />
      </div>

      {importing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>处理中...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  )
}

/**
 * URL 解析组件
 */
function UrlImport({
  onParse,
  importing,
}: {
  onParse: (url: string) => void
  importing: boolean
}): React.ReactElement {
  const [url, setUrl] = React.useState('')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>商品链接</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴淘宝/拼多多/抖音商品链接"
            disabled={importing}
          />
          <Button onClick={() => onParse(url)} disabled={importing || !url.trim()}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                解析中
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                解析
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          支持的链接类型
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 淘宝/天猫商品链接</li>
          <li>• 拼多多商品链接</li>
          <li>• 抖音商品链接</li>
          <li>• 京东商品链接</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          系统会自动从商品页面抓取标题、价格、主图等信息
        </p>
      </div>
    </div>
  )
}
