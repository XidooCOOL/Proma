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
  priority: number
  lastTested?: string
}

export interface PlatformSelectors {
  platform: string
  version: string
  updatedAt: string
  selectors: Record<string, SelectorConfig>
}

export const PREDEFINED_SELECTORS: SelectorDefinition[] = [
  { id: 'product_id', category: 'product_info', label: 'Product ID', labelZh: '商品ID', description: '商品唯一标识符', extractMode: 'data-id', attributes: ['data-product-id', 'data-goods-id', 'data-item-id', 'id'] },
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

export const DEFAULT_SELECTORS: Record<string, Record<string, SelectorConfig>> = {
  pinduoduo: {
    product_id: { id: 'product_id', selector: '[data-product-id], [class*="goods-id"]', extractMode: 'data-id', attributes: ['data-product-id', 'data-goods-id'], enabled: true, priority: 1 },
    product_title: { id: 'product_title', selector: '[class*="goods-title"], [class*="product-title"]', extractMode: 'text', enabled: true, priority: 1 },
    product_price: { id: 'product_price', selector: '[class*="price"]:not([class*="original"])', extractMode: 'text', enabled: true, priority: 1 },
    input_title: { id: 'input_title', selector: 'input[placeholder*="商品标题"], [class*="title"] input', extractMode: 'element', enabled: true, priority: 1 },
    input_price: { id: 'input_price', selector: 'input[placeholder*="价格"], [class*="price"] input', extractMode: 'element', enabled: true, priority: 1 },
    input_stock: { id: 'input_stock', selector: 'input[placeholder*="库存"], [class*="stock"] input', extractMode: 'element', enabled: true, priority: 1 },
    input_description: { id: 'input_description', selector: 'textarea[placeholder*="商品描述"]', extractMode: 'element', enabled: true, priority: 1 },
    btn_submit: { id: 'btn_submit', selector: 'button:has-text("发布商品"), [class*="submit"] button', extractMode: 'element', enabled: true, priority: 1 },
    upload_main_image: { id: 'upload_main_image', selector: '[class*="main-image"] input[type="file"]', extractMode: 'element', enabled: true, priority: 1 },
    toast_success: { id: 'toast_success', selector: '[class*="toast"]:has-text("发布成功")', extractMode: 'text', enabled: true, priority: 1 },
  },
  douyin: {
    product_id: { id: 'product_id', selector: '[data-product-id]', extractMode: 'data-id', attributes: ['data-product-id'], enabled: true, priority: 1 },
    product_title: { id: 'product_title', selector: '[class*="product-title"]', extractMode: 'text', enabled: true, priority: 1 },
    product_price: { id: 'product_price', selector: '[class*="price"]', extractMode: 'text', enabled: true, priority: 1 },
    input_title: { id: 'input_title', selector: 'input[placeholder*="标题"]', extractMode: 'element', enabled: true, priority: 1 },
    input_price: { id: 'input_price', selector: 'input[placeholder*="价格"]', extractMode: 'element', enabled: true, priority: 1 },
    btn_submit: { id: 'btn_submit', selector: 'button:has-text("发布"), button:has-text("确认")', extractMode: 'element', enabled: true, priority: 1 },
    upload_images: { id: 'upload_images', selector: '[class*="upload"] input[type="file"]', extractMode: 'element', enabled: true, priority: 1 },
    toast_success: { id: 'toast_success', selector: '[class*="toast"]:has-text("发布成功")', extractMode: 'text', enabled: true, priority: 1 },
  },
  taobao: {
    product_id: { id: 'product_id', selector: '[data-itemid]', extractMode: 'data-id', attributes: ['data-itemid'], enabled: true, priority: 1 },
    product_title: { id: 'product_title', selector: '[class*="item-title"], h3[class*="title"]', extractMode: 'text', enabled: true, priority: 1 },
    product_price: { id: 'product_price', selector: '[class*="price"]', extractMode: 'text', enabled: true, priority: 1 },
    input_title: { id: 'input_title', selector: '#title, input[name="title"]', extractMode: 'element', enabled: true, priority: 1 },
    input_price: { id: 'input_price', selector: '#price, input[name="price"]', extractMode: 'element', enabled: true, priority: 1 },
    btn_submit: { id: 'btn_submit', selector: 'button:has-text("发布"), button:has-text("上架")', extractMode: 'element', enabled: true, priority: 1 },
    upload_main_image: { id: 'upload_main_image', selector: '[class*="main-pic"] input[type="file"]', extractMode: 'element', enabled: true, priority: 1 },
  },
  jd: {
    product_id: { id: 'product_id', selector: '[data-sku]', extractMode: 'data-id', attributes: ['data-sku'], enabled: true, priority: 1 },
    product_title: { id: 'product_title', selector: '[class*="product-name"], h3[class*="name"]', extractMode: 'text', enabled: true, priority: 1 },
    product_price: { id: 'product_price', selector: '[class*="price"], [class*="jd-price"]', extractMode: 'text', enabled: true, priority: 1 },
    input_title: { id: 'input_title', selector: 'input[placeholder*="商品名称"]', extractMode: 'element', enabled: true, priority: 1 },
    input_price: { id: 'input_price', selector: 'input[placeholder*="价格"]', extractMode: 'element', enabled: true, priority: 1 },
    btn_submit: { id: 'btn_submit', selector: 'button:has-text("提交"), button:has-text("发布")', extractMode: 'element', enabled: true, priority: 1 },
    toast_success: { id: 'toast_success', selector: '[class*="message"]:has-text("发布成功")', extractMode: 'text', enabled: true, priority: 1 },
  },
}

export function getSelectorById(id: string): SelectorDefinition | undefined {
  return PREDEFINED_SELECTORS.find(s => s.id === id)
}

export function getSelectorsByCategory(category: string): SelectorDefinition[] {
  return PREDEFINED_SELECTORS.filter(s => s.category === category)
}

export function createDefaultPlatformSelectors(platform: string): PlatformSelectors {
  const defaults = DEFAULT_SELECTORS[platform] || {}
  const selectors: Record<string, SelectorConfig> = {}
  for (const def of PREDEFINED_SELECTORS) {
    selectors[def.id] = {
      id: def.id,
      selector: defaults[def.id]?.selector || '',
      extractMode: def.extractMode,
      attributes: def.attributes || defaults[def.id]?.attributes,
      enabled: defaults[def.id]?.enabled ?? false,
      priority: 1,
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
  const labels: Record<string, string> = {
    product_info: '商品信息',
    form_input: '表单输入',
    action: '操作按钮',
    upload: '上传区域',
    result: '结果反馈',
  }
  return labels[category] || category
}
