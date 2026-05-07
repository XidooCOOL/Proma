export const EXTRACT_MODE = {
  ELEMENT: 'element',
  TEXT: 'text',
  VALUE: 'value',
  HREF: 'href',
  SRC: 'src',
  DATA_ID: 'data-id',
  INNER_HTML: 'innerHTML',
} as const

export type ExtractMode = typeof EXTRACT_MODE[keyof typeof EXTRACT_MODE]

export interface SelectorDefinition {
  id: string
  category: 'product_info' | 'form_input' | 'action' | 'upload' | 'result'
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
  platform: string
  version: string
  updatedAt: string
  selectors: Record<string, SelectorConfig>
}

export const CATEGORIES = [
  { id: 'product_info', label: 'Product Info', labelZh: '商品信息' },
  { id: 'form_input', label: 'Form Input', labelZh: '表单输入' },
  { id: 'action', label: 'Action', labelZh: '操作按钮' },
  { id: 'upload', label: 'Upload', labelZh: '上传区域' },
  { id: 'result', label: 'Result', labelZh: '结果反馈' },
] as const

export const PREDEFINED_SELECTORS: SelectorDefinition[] = [
  { id: 'product_id', category: 'product_info', label: 'Product ID', labelZh: '商品ID', description: '商品唯一标识符', extractMode: 'data-id', attributes: ['data-product-id', 'data-goods-id', 'data-item-id'] },
  { id: 'product_title', category: 'product_info', label: 'Product Title', labelZh: '商品标题', description: '商品显示标题', extractMode: 'text' },
  { id: 'product_url', category: 'product_info', label: 'Product URL', labelZh: '商品链接', description: '商品详情页链接', extractMode: 'href' },
  { id: 'product_price', category: 'product_info', label: 'Product Price', labelZh: '商品价格', description: '商品售价', extractMode: 'text' },
  { id: 'product_stock', category: 'product_info', label: 'Product Stock', labelZh: '商品库存', description: '商品库存数量', extractMode: 'text' },
  { id: 'product_status', category: 'product_info', label: 'Product Status', labelZh: '商品状态', description: '上架/下架/草稿状态', extractMode: 'text' },
  { id: 'product_images', category: 'product_info', label: 'Product Images', labelZh: '商品图片', description: '商品展示图片', extractMode: 'src' },
  { id: 'created_time', category: 'product_info', label: 'Created Time', labelZh: '创建时间', description: '商品创建/发布时间', extractMode: 'text' },

  { id: 'input_title', category: 'form_input', label: 'Title Input', labelZh: '标题输入框', description: '商品标题输入框', extractMode: 'element' },
  { id: 'input_price', category: 'form_input', label: 'Price Input', labelZh: '价格输入框', description: '商品价格输入框', extractMode: 'element' },
  { id: 'input_original_price', category: 'form_input', label: 'Original Price Input', labelZh: '原价输入框', description: '商品原价输入框', extractMode: 'element' },
  { id: 'input_stock', category: 'form_input', label: 'Stock Input', labelZh: '库存输入框', description: '商品库存输入框', extractMode: 'element' },
  { id: 'input_description', category: 'form_input', label: 'Description Input', labelZh: '描述输入框', description: '商品详情输入框', extractMode: 'element' },
  { id: 'select_category', category: 'form_input', label: 'Category Select', labelZh: '类目选择', description: '商品分类选择器', extractMode: 'element' },
  { id: 'select_shipping', category: 'form_input', label: 'Shipping Template', labelZh: '运费模板', description: '运费模板选择', extractMode: 'element' },

  { id: 'btn_submit', category: 'action', label: 'Submit Button', labelZh: '提交按钮', description: '提交/发布商品按钮', extractMode: 'element' },
  { id: 'btn_save_draft', category: 'action', label: 'Save Draft Button', labelZh: '保存草稿', description: '保存为草稿按钮', extractMode: 'element' },
  { id: 'btn_preview', category: 'action', label: 'Preview Button', labelZh: '预览按钮', description: '预览商品效果按钮', extractMode: 'element' },
  { id: 'btn_cancel', category: 'action', label: 'Cancel Button', labelZh: '取消按钮', description: '取消/返回按钮', extractMode: 'element' },

  { id: 'upload_main_image', category: 'upload', label: 'Main Image Upload', labelZh: '主图上传', description: '商品主图上传区域', extractMode: 'element' },
  { id: 'upload_images', category: 'upload', label: 'Images Upload', labelZh: '图片上传', description: '商品图片组上传', extractMode: 'element' },
  { id: 'upload_video', category: 'upload', label: 'Video Upload', labelZh: '视频上传', description: '商品视频上传', extractMode: 'element' },

  { id: 'toast_success', category: 'result', label: 'Success Toast', labelZh: '成功提示', description: '操作成功提示', extractMode: 'text' },
  { id: 'toast_error', category: 'result', label: 'Error Toast', labelZh: '错误提示', description: '操作失败提示', extractMode: 'text' },
  { id: 'modal_success', category: 'result', label: 'Success Modal', labelZh: '成功弹窗', description: '发布成功弹窗', extractMode: 'innerHTML' },
  { id: 'modal_error', category: 'result', label: 'Error Modal', labelZh: '错误弹窗', description: '错误信息弹窗', extractMode: 'innerHTML' },
]

export function getSelectorById(id: string): SelectorDefinition | undefined {
  return PREDEFINED_SELECTORS.find(s => s.id === id)
}

export function getSelectorsByCategory(category: string): SelectorDefinition[] {
  return PREDEFINED_SELECTORS.filter(s => s.category === category)
}

export function createEmptyPlatformSelectors(platform: string): PlatformSelectors {
  const selectors: Record<string, SelectorConfig> = {}
  for (const def of PREDEFINED_SELECTORS) {
    selectors[def.id] = {
      id: def.id,
      selector: '',
      extractMode: def.extractMode,
      attributes: def.attributes,
      enabled: false,
    }
  }
  return {
    platform,
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    selectors,
  }
}

export function getCategoryLabel(category: string): string {
  const cat = CATEGORIES.find(c => c.id === category)
  return cat?.labelZh || category
}

export const PLATFORM_LIST = [
  { id: 'pinduoduo', label: '拼多多' },
  { id: 'douyin', label: '抖音' },
  { id: 'taobao', label: '淘宝' },
  { id: 'jd', label: '京东' },
  { id: 'kuaishou', label: '快手' },
]

export const DEFAULT_TEST_URLS: Record<string, string> = {
  pinduoduo: 'https://mms.pinduoduo.com/goods/list',
  douyin: 'https://creator.douyin.com/product/list',
  taobao: 'https://upload.taobao.com/',
  jd: 'https://seller.jd.com/商品管理',
  kuaishou: 'https://cp.kwaixiandian.com/goods/list',
}
