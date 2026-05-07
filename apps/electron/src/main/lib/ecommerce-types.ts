export type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou'

export type ExtractMode = 'element' | 'text' | 'value' | 'href' | 'src' | 'data-id' | 'innerHTML'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped'

export type ListingStatus = 'pending' | 'uploading' | 'success' | 'failed'

export type SelectorCategory = 'product_info' | 'form_input' | 'action' | 'upload' | 'result'

export interface StoreProfile {
  id: string
  name: string
  platform: Platform
  createdAt: string
  lastUsedAt: string
  stats: ProfileStats
}

export interface ProfileStats {
  totalProducts: number
  totalOrders: number
  lastUploadAt?: string
}

export interface SelectorDefinition {
  id: string
  category: SelectorCategory
  label: string
  labelZh: string
  description: string
  extractMode: ExtractMode
  attributes?: string[]
}

export interface SelectorConfig {
  id: string
  selector: string
  extractMode: ExtractMode
  attributes?: string[]
  enabled: boolean
  lastTested?: string
}

export interface PlatformSelectors {
  platform: Platform
  version: string
  updatedAt: string
  selectors: Record<string, SelectorConfig>
}

export interface ListingRecord {
  id: string
  profileId: string
  folderName: string
  title: string
  price: number
  images: string[]
  status: ListingStatus
  uploadedAt: string
  productUrl?: string
  productId?: string
  error?: string
}

export interface TaskLog {
  id: string
  type: 'listing' | 'update' | 'scrape'
  profileId?: string
  startedAt: string
  finishedAt?: string
  status: TaskStatus
  progress: number
  items: TaskItems
  error?: string
}

export interface TaskItems {
  total: number
  success: number
  failed: number
}

export interface ListingTask {
  id: string
  profileId: string
  platform: Platform
  folderPath: string
  folderName: string
  title: string
  price: number
  description?: string
  images: string[]
  skus?: SKU[]
}

export interface SKU {
  code: string
  stock: number
  color?: string
  size?: string
  price?: number
}

export interface ListingResult {
  success: boolean
  productId?: string
  productUrl?: string
  error?: string
  logs: string[]
}

export interface TaskProgress {
  taskId: string
  type: 'start' | 'progress' | 'complete' | 'error' | 'item_complete' | 'item_error'
  progress: number
  message: string
  data?: unknown
}

export interface TaskGroup {
  id: string
  platform: Platform
  platformName: string
  profileId: string
  profileName: string
  status: TaskStatus
  progress: number
  tasks: TaskItem[]
  startedAt?: string
  finishedAt?: string
  logs: string[]
  error?: string
}

export interface TaskItem {
  id: string
  name: string
  status: TaskStatus
  progress: number
  error?: string
  startedAt?: string
  finishedAt?: string
}

export interface CategoryInfo {
  id: SelectorCategory
  label: string
  labelZh: string
}

export interface PlatformInfo {
  id: Platform
  label: string
}

export interface EcommerceError {
  code: string
  message: string
  details?: unknown
}

export const PLATFORM_CONFIG: Record<Platform, PlatformInfo> = {
  pinduoduo: { id: 'pinduoduo', label: '拼多多' },
  douyin: { id: 'douyin', label: '抖音' },
  taobao: { id: 'taobao', label: '淘宝' },
  jd: { id: 'jd', label: '京东' },
  kuaishou: { id: 'kuaishou', label: '快手' },
}

export const PLATFORM_LIST: PlatformInfo[] = Object.values(PLATFORM_CONFIG)

export const CATEGORY_CONFIG: Record<SelectorCategory, CategoryInfo> = {
  product_info: { id: 'product_info', label: 'Product Info', labelZh: '商品信息' },
  form_input: { id: 'form_input', label: 'Form Input', labelZh: '表单输入' },
  action: { id: 'action', label: 'Action', labelZh: '操作按钮' },
  upload: { id: 'upload', label: 'Upload', labelZh: '上传区域' },
  result: { id: 'result', label: 'Result', labelZh: '结果反馈' },
}

export const CATEGORIES: CategoryInfo[] = Object.values(CATEGORY_CONFIG)

export const DEFAULT_TEST_URLS: Record<Platform, string> = {
  pinduoduo: 'https://mms.pinduoduo.com/goods/list',
  douyin: 'https://creator.douyin.com/product/list',
  taobao: 'https://upload.taobao.com/',
  jd: 'https://seller.jd.com/商品管理',
  kuaishou: 'https://cp.kwaixiandian.com/goods/list',
}

export const DEFAULT_PRODUCT_DETAIL_URLS: Record<Platform, string> = {
  pinduoduo: 'https://mms.pinduoduo.com/goods/goodsdetail',
  douyin: 'https://creator.douyin.com/product/list',
  taobao: 'https://upload.taobao.com/商品编辑',
  jd: 'https://seller.jd.com/商品管理',
  kuaishou: 'https://cp.kwaixiandian.com/goods/list',
}

export const EXTRACT_MODE_LABELS: Record<ExtractMode, string> = {
  element: '元素（操作用）',
  text: '文本',
  value: '输入值',
  href: '链接',
  src: '图片地址',
  'data-id': 'data-id属性',
  innerHTML: 'HTML内容',
}

export const STATUS_LABELS: Record<TaskStatus | ListingStatus, string> = {
  pending: '待处理',
  running: '执行中',
  uploading: '上传中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  skipped: '已跳过',
  success: '成功',
}

export const ERROR_CODES = {
  PROFILE_NOT_FOUND: 'E001',
  PROFILE_NOT_LOGGED_IN: 'E002',
  SELECTOR_NOT_CONFIGURED: 'E003',
  BROWSER_LAUNCH_FAILED: 'E004',
  PAGE_LOAD_FAILED: 'E005',
  SELECTOR_NOT_FOUND: 'E006',
  TASK_CANCELLED: 'E007',
  UNKNOWN_ERROR: 'E999',
} as const

export function createEcommerceError(code: keyof typeof ERROR_CODES, message: string, details?: unknown): EcommerceError {
  return {
    code: ERROR_CODES[code],
    message,
    details,
  }
}

export function isEcommerceError(error: unknown): error is EcommerceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}
