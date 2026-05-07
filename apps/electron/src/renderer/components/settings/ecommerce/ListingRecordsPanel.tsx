import * as React from 'react'
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  MoreVertical,
  Trash2,
  Eye,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ListingRecord {
  id: string
  profileId: string
  profileName?: string
  platform?: string
  folderName: string
  title: string
  price: number
  images: string[]
  status: 'pending' | 'uploading' | 'success' | 'failed'
  uploadedAt: string
  productUrl?: string
  productId?: string
  error?: string
}

interface StoreProfile {
  id: string
  name: string
  platform: string
}

export function ListingRecordsPanel(): React.ReactElement {
  const [records, setRecords] = React.useState<ListingRecord[]>([])
  const [profiles, setProfiles] = React.useState<StoreProfile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [profileFilter, setProfileFilter] = React.useState<string>('all')
  const [selectedRecord, setSelectedRecord] = React.useState<ListingRecord | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [recordsRes, profilesRes] = await Promise.all([
        window.electronAPI.getRecentListingRecords(100),
        window.electronAPI.getEcommerceProfiles(),
      ])
      setRecords(recordsRes || [])
      setProfiles(profilesRes || [])
    } catch (error) {
      console.error('[ListingRecords] 加载失败:', error)
      toast.error('加载记录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRecords = React.useMemo(() => {
    return records.filter(record => {
      if (statusFilter !== 'all' && record.status !== statusFilter) return false
      if (profileFilter !== 'all' && record.profileId !== profileFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          record.title.toLowerCase().includes(query) ||
          record.folderName.toLowerCase().includes(query) ||
          record.productId?.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [records, statusFilter, profileFilter, searchQuery])

  const getProfileName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId)
    return profile?.name || profileId
  }

  const getPlatformName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId)
    const platformNames: Record<string, string> = {
      pinduoduo: '拼多多',
      douyin: '抖音',
      taobao: '淘宝',
      jd: '京东',
      kuaishou: '快手',
    }
    return profile ? platformNames[profile.platform] || profile.platform : ''
  }

  const statusConfig = {
    pending: { label: '待处理', color: 'bg-yellow-500', icon: Clock },
    uploading: { label: '上传中', color: 'bg-blue-500', icon: Loader2 },
    success: { label: '成功', color: 'bg-green-500', icon: CheckCircle2 },
    failed: { label: '失败', color: 'bg-red-500', icon: XCircle },
  }

  const handleExport = () => {
    const data = filteredRecords.map(r => ({
      ID: r.id,
      商品标题: r.title,
      价格: r.price,
      状态: statusConfig[r.status]?.label,
      上架时间: r.uploadedAt,
      商品ID: r.productId || '',
      商品链接: r.productUrl || '',
      店铺: getProfileName(r.profileId),
      错误信息: r.error || '',
    }))
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(',')),
    ].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listing-records-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            上架记录
          </h2>
          <p className="text-sm text-muted-foreground">
            查看商品上架历史记录和状态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredRecords.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索商品标题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="uploading">上传中</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
        <Select value={profileFilter} onValueChange={setProfileFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择店铺" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部店铺</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {records.length === 0 ? '暂无上架记录' : '没有匹配条件的记录'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map(record => {
            const status = statusConfig[record.status]
            const StatusIcon = status.icon
            return (
              <Card
                key={record.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedRecord(record)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {record.images.length > 0 ? (
                        <img
                          src={`file://${record.images[0]}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{record.title || record.folderName}</h4>
                        <Badge
                          variant="secondary"
                          className={cn('gap-1 text-white', status.color)}
                        >
                          <StatusIcon className={cn('h-3 w-3', record.status === 'uploading' && 'animate-spin')} />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{getPlatformName(record.profileId)} / {getProfileName(record.profileId)}</span>
                        {record.price > 0 && <span>¥{record.price.toFixed(2)}</span>}
                        <span>{new Date(record.uploadedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.productId && (
                        <Badge variant="outline" className="font-mono text-xs">
                          ID: {record.productId}
                        </Badge>
                      )}
                      {record.productUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={record.productUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {record.error && (
                    <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded">
                      {record.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RecordDetailDialog
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  )
}

function RecordDetailDialog({
  record,
  onClose,
}: {
  record: ListingRecord | null
  onClose: () => void
}): React.ReactElement {
  if (!record) return <></>

  const statusConfig = {
    pending: { label: '待处理', color: 'bg-yellow-500' },
    uploading: { label: '上传中', color: 'bg-blue-500' },
    success: { label: '成功', color: 'bg-green-500' },
    failed: { label: '失败', color: 'bg-red-500' },
  }
  const status = statusConfig[record.status]

  return (
    <Dialog open={!!record} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>上架详情</DialogTitle>
          <DialogDescription>{record.folderName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">状态</Label>
              <p className="mt-1">
                <Badge className={cn('text-white', status.color)}>{status.label}</Badge>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">上架时间</Label>
              <p className="mt-1">{new Date(record.uploadedAt).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">商品标题</Label>
              <p className="mt-1">{record.title || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">价格</Label>
              <p className="mt-1">{record.price > 0 ? `¥${record.price.toFixed(2)}` : '-'}</p>
            </div>
            {record.productId && (
              <div>
                <Label className="text-muted-foreground">商品ID</Label>
                <p className="mt-1 font-mono">{record.productId}</p>
              </div>
            )}
            {record.productUrl && (
              <div>
                <Label className="text-muted-foreground">商品链接</Label>
                <p className="mt-1">
                  <a
                    href={record.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {record.productUrl}
                  </a>
                </p>
              </div>
            )}
          </div>

          {record.images.length > 0 && (
            <div>
              <Label className="text-muted-foreground">商品图片 ({record.images.length})</Label>
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                {record.images.map((img, i) => (
                  <img
                    key={i}
                    src={`file://${img}`}
                    alt=""
                    className="w-20 h-20 object-cover rounded border"
                  />
                ))}
              </div>
            </div>
          )}

          {record.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Label className="text-red-600">错误信息</Label>
              <p className="mt-1 text-sm text-red-700">{record.error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
