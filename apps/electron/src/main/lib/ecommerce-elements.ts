export const ELEMENT_CATEGORIES = {
  PRODUCT_INFO: 'product_info',
  FORM_INPUT: 'form_input',
  ACTION: 'action',
  UPLOAD: 'upload',
  RESULT: 'result',
  NAVIGATION: 'navigation',
} as const

export const ELEMENT_TYPES = {
  INPUT_TEXT: 'input_text',
  INPUT_NUMBER: 'input_number',
  INPUT_PRICE: 'input_price',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  BUTTON: 'button',
  LINK: 'link',
  CONTAINER: 'container',
  FILE_UPLOAD: 'file_upload',
  IMAGE: 'image',
  TABLE: 'table',
  MODAL: 'modal',
  TOAST: 'toast',
} as const

export interface EcommerceElement {
  id: string
  category: typeof ELEMENT_CATEGORIES[keyof typeof ELEMENT_CATEGORIES]
  type: typeof ELEMENT_TYPES[keyof typeof ELEMENT_TYPES]
  label: string
  labelZh: string
  description: string
  commonSelectors: string[]
  attributes?: string[]
  extractAs?: 'text' | 'href' | 'value' | 'src' | 'data-id' | 'innerHTML'
  postExtract?: string
}

export const PREDEFINED_ELEMENTS: Record<string, EcommerceElement[]> = {
  common: [
    {
      id: 'product_id',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.CONTAINER,
      label: 'Product ID',
      labelZh: '商品ID',
      description: '商品发布后获得的唯一标识符',
      commonSelectors: [
        '[class*="product-id"]',
        '[class*="goods-id"]',
        '[class*="item-id"]',
        '[data-product-id]',
        '[data-goods-id]',
        '[data-item-id]',
        '[id*="productId"]',
        '[id*="goodsId"]',
      ],
      attributes: ['data-product-id', 'data-goods-id', 'data-item-id', 'id'],
      extractAs: 'data-id',
    },
    {
      id: 'product_title',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.CONTAINER,
      label: 'Product Title',
      labelZh: '商品标题',
      description: '商品显示标题',
      commonSelectors: [
        '[class*="product-title"]',
        '[class*="goods-title"]',
        '[class*="item-title"]',
        '[class*="title"]',
        'h1[class*="title"]',
        '[class*="name"]',
      ],
      extractAs: 'text',
    },
    {
      id: 'product_url',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.LINK,
      label: 'Product URL',
      labelZh: '商品链接',
      description: '商品详情页链接',
      commonSelectors: [
        'a[class*="product-link"]',
        'a[class*="goods-link"]',
        'a[class*="item-link"]',
        '[class*="product"] a',
        '[class*="goods"] a',
      ],
      extractAs: 'href',
    },
    {
      id: 'product_price',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.CONTAINER,
      label: 'Product Price',
      labelZh: '商品价格',
      description: '商品售价',
      commonSelectors: [
        '[class*="product-price"]',
        '[class*="goods-price"]',
        '[class*="price"]',
        '[class*="amount"]',
        '[class*="selling-price"]',
        '[class*="sale-price"]',
      ],
      extractAs: 'text',
      postExtract: 'price',
    },
    {
      id: 'product_stock',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.CONTAINER,
      label: 'Product Stock',
      labelZh: '商品库存',
      description: '商品库存数量',
      commonSelectors: [
        '[class*="product-stock"]',
        '[class*="goods-stock"]',
        '[class*="stock"]',
        '[class*="inventory"]',
        '[class*="quantity"]',
      ],
      extractAs: 'text',
    },
    {
      id: 'product_status',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.CONTAINER,
      label: 'Product Status',
      labelZh: '商品状态',
      description: '上架/下架/草稿等状态',
      commonSelectors: [
        '[class*="product-status"]',
        '[class*="status"]',
        '[class*="state"]',
        '[class*="badge"]',
        '[class*="tag"]',
      ],
      extractAs: 'text',
    },
    {
      id: 'product_images',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.IMAGE,
      label: 'Product Images',
      labelZh: '商品图片',
      description: '商品展示图片列表',
      commonSelectors: [
        '[class*="product-images"] img',
        '[class*="goods-images"] img',
        '[class*="gallery"] img',
        '[class*="swiper"] img',
        'img[class*="product"]',
      ],
      extractAs: 'src',
    },
    {
      id: 'created_time',
      category: ELEMENT_CATEGORIES.PRODUCT_INFO,
      type: ELEMENT_TYPES.CONTAINER,
      label: 'Created Time',
      labelZh: '创建时间',
      description: '商品创建/发布时间',
      commonSelectors: [
        '[class*="created"]',
        '[class*="publish-time"]',
        '[class*="create-time"]',
        '[class*="time"]',
        '[class*="date"]',
      ],
      extractAs: 'text',
    },
  ],
  form: [
    {
      id: 'input_title',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.INPUT_TEXT,
      label: 'Title Input',
      labelZh: '标题输入框',
      description: '商品标题输入框',
      commonSelectors: [
        'input[placeholder*="标题"]',
        'input[placeholder*="title"]',
        'input[placeholder*="名称"]',
        'input[class*="title"]',
        'textarea[placeholder*="标题"]',
        '[class*="title"] input',
        '[class*="title"] textarea',
      ],
      extractAs: 'value',
    },
    {
      id: 'input_price',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.INPUT_PRICE,
      label: 'Price Input',
      labelZh: '价格输入框',
      description: '商品价格输入框',
      commonSelectors: [
        'input[placeholder*="价格"]',
        'input[placeholder*="price"]',
        'input[placeholder*="售价"]',
        'input[class*="price"]',
        'input[class*="amount"]',
        '[class*="price"] input',
        '[class*="amount"] input',
      ],
      extractAs: 'value',
    },
    {
      id: 'input_original_price',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.INPUT_PRICE,
      label: 'Original Price Input',
      labelZh: '原价输入框',
      description: '商品原价/市场价输入框',
      commonSelectors: [
        'input[placeholder*="原价"]',
        'input[placeholder*="市场价"]',
        'input[placeholder*="original"]',
        'input[class*="original-price"]',
        'input[class*="market-price"]',
      ],
      extractAs: 'value',
    },
    {
      id: 'input_stock',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.INPUT_NUMBER,
      label: 'Stock Input',
      labelZh: '库存输入框',
      description: '商品库存数量输入框',
      commonSelectors: [
        'input[placeholder*="库存"]',
        'input[placeholder*="stock"]',
        'input[placeholder*="数量"]',
        'input[placeholder*="quantity"]',
        'input[class*="stock"]',
        '[class*="stock"] input',
      ],
      extractAs: 'value',
    },
    {
      id: 'input_description',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.TEXTAREA,
      label: 'Description Input',
      labelZh: '描述输入框',
      description: '商品详情描述输入框',
      commonSelectors: [
        'textarea[placeholder*="描述"]',
        'textarea[placeholder*="详情"]',
        'textarea[placeholder*="description"]',
        'textarea[placeholder*="detail"]',
        '[class*="description"] textarea',
        '[class*="detail"] textarea',
        'div[contenteditable="true"]',
      ],
      extractAs: 'innerHTML',
    },
    {
      id: 'select_category',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.SELECT,
      label: 'Category Select',
      labelZh: '类目选择',
      description: '商品分类选择器',
      commonSelectors: [
        'select[class*="category"]',
        'select[class*="分类"]',
        '[class*="category"] select',
        '[class*="类目"] select',
        '[class*="cascader"]',
        '[class*="category-picker"]',
      ],
      extractAs: 'value',
    },
    {
      id: 'select_shipping',
      category: ELEMENT_CATEGORIES.FORM_INPUT,
      type: ELEMENT_TYPES.SELECT,
      label: 'Shipping Template',
      labelZh: '运费模板',
      description: '运费模板选择',
      commonSelectors: [
        'select[class*="shipping"]',
        'select[class*="freight"]',
        'select[class*="运费"]',
        '[class*="shipping"] select',
        '[class*="freight"] select',
      ],
      extractAs: 'value',
    },
  ],
  action: [
    {
      id: 'btn_submit',
      category: ELEMENT_CATEGORIES.ACTION,
      type: ELEMENT_TYPES.BUTTON,
      label: 'Submit Button',
      labelZh: '提交按钮',
      description: '提交/发布商品按钮',
      commonSelectors: [
        'button:has-text("发布")',
        'button:has-text("提交")',
        'button:has-text("上架")',
        'button:has-text("确认")',
        'button[class*="submit"]',
        'button[class*="publish"]',
        'button[class*="release"]',
        'button[type="submit"]',
        '[class*="submit"] button',
        '[class*="publish"] button',
      ],
      extractAs: 'text',
    },
    {
      id: 'btn_save_draft',
      category: ELEMENT_CATEGORIES.ACTION,
      type: ELEMENT_TYPES.BUTTON,
      label: 'Save Draft Button',
      labelZh: '保存草稿',
      description: '保存为草稿按钮',
      commonSelectors: [
        'button:has-text("草稿")',
        'button:has-text("保存")',
        'button:has-text("暂存")',
        'button[class*="draft"]',
        'button[class*="save"]',
        '[class*="draft"] button',
      ],
      extractAs: 'text',
    },
    {
      id: 'btn_preview',
      category: ELEMENT_CATEGORIES.ACTION,
      type: ELEMENT_TYPES.BUTTON,
      label: 'Preview Button',
      labelZh: '预览按钮',
      description: '预览商品效果按钮',
      commonSelectors: [
        'button:has-text("预览")',
        'button:has-text("preview")',
        'button[class*="preview"]',
        '[class*="preview"] button',
      ],
      extractAs: 'text',
    },
    {
      id: 'btn_cancel',
      category: ELEMENT_CATEGORIES.ACTION,
      type: ELEMENT_TYPES.BUTTON,
      label: 'Cancel Button',
      labelZh: '取消按钮',
      description: '取消/返回按钮',
      commonSelectors: [
        'button:has-text("取消")',
        'button:has-text("返回")',
        'button:has-text("back")',
        'button[class*="cancel"]',
        'button[class*="back"]',
      ],
      extractAs: 'text',
    },
  ],
  upload: [
    {
      id: 'upload_main_image',
      category: ELEMENT_CATEGORIES.UPLOAD,
      type: ELEMENT_TYPES.FILE_UPLOAD,
      label: 'Main Image Upload',
      labelZh: '主图上传',
      description: '商品主图上传区域',
      commonSelectors: [
        '[class*="main-image"] input[type="file"]',
        '[class*="cover-image"] input[type="file"]',
        '[class*="主图"] input[type="file"]',
        '[class*="首图"] input[type="file"]',
        'input[type="file"][accept*="image"]',
        '[class*="upload"] input[type="file"]',
        '[class*="dropzone"]',
      ],
      extractAs: 'src',
    },
    {
      id: 'upload_images',
      category: ELEMENT_CATEGORIES.UPLOAD,
      type: ELEMENT_TYPES.FILE_UPLOAD,
      label: 'Images Upload',
      labelZh: '图片上传',
      description: '商品图片组上传区域',
      commonSelectors: [
        '[class*="images"] input[type="file"]',
        '[class*="gallery"] input[type="file"]',
        '[class*="photos"] input[type="file"]',
        '[class*="picture"] input[type="file"]',
        '[class*="图片"] input[type="file"]',
      ],
      extractAs: 'src',
    },
    {
      id: 'upload_video',
      category: ELEMENT_CATEGORIES.UPLOAD,
      type: ELEMENT_TYPES.FILE_UPLOAD,
      label: 'Video Upload',
      labelZh: '视频上传',
      description: '商品视频上传区域',
      commonSelectors: [
        '[class*="video"] input[type="file"]',
        '[class*="视频"] input[type="file"]',
        'input[type="file"][accept*="video"]',
      ],
      extractAs: 'src',
    },
  ],
  result: [
    {
      id: 'toast_success',
      category: ELEMENT_CATEGORIES.RESULT,
      type: ELEMENT_TYPES.TOAST,
      label: 'Success Toast',
      labelZh: '成功提示',
      description: '操作成功提示消息',
      commonSelectors: [
        '[class*="toast"][class*="success"]',
        '[class*="message"][class*="success"]',
        '[class*="notify"][class*="success"]',
        '[class*="alert"][class*="success"]',
        '[class*="tips"][class*="success"]',
        'div:has-text("发布成功")',
        'div:has-text("上架成功")',
        'div:has-text("success")',
      ],
      extractAs: 'text',
    },
    {
      id: 'toast_error',
      category: ELEMENT_CATEGORIES.RESULT,
      type: ELEMENT_TYPES.TOAST,
      label: 'Error Toast',
      labelZh: '错误提示',
      description: '操作失败提示消息',
      commonSelectors: [
        '[class*="toast"][class*="error"]',
        '[class*="message"][class*="error"]',
        '[class*="notify"][class*="error"]',
        '[class*="alert"][class*="error"]',
        '[class*="warning"]',
        'div:has-text("失败")',
        'div:has-text("错误")',
        'div:has-text("error")',
      ],
      extractAs: 'text',
    },
    {
      id: 'modal_success',
      category: ELEMENT_CATEGORIES.RESULT,
      type: ELEMENT_TYPES.MODAL,
      label: 'Success Modal',
      labelZh: '成功弹窗',
      description: '发布成功弹窗',
      commonSelectors: [
        '[class*="modal"]:has-text("成功")',
        '[class*="dialog"]:has-text("成功")',
        '[class*="popup"]:has-text("成功")',
        '[class*="modal"]:has-text("发布成功")',
        '[role="dialog"]:has-text("成功")',
      ],
      extractAs: 'innerHTML',
    },
    {
      id: 'modal_error',
      category: ELEMENT_CATEGORIES.RESULT,
      type: ELEMENT_TYPES.MODAL,
      label: 'Error Modal',
      labelZh: '错误弹窗',
      description: '错误信息弹窗',
      commonSelectors: [
        '[class*="modal"]:has-text("错误")',
        '[class*="modal"]:has-text("失败")',
        '[class*="dialog"]:has-text("错误")',
        '[class*="popup"]:has-text("失败")',
        '[role="dialog"]:has-text("错误")',
      ],
      extractAs: 'innerHTML',
    },
  ],
}

export interface PlatformElementMapping {
  platform: string
  version: string
  mappings: {
    [predefinedId: string]: {
      selector: string
      priority: number
      customAttributes?: string[]
      fallbackExtract?: string
      enabled: boolean
    }
  }
}

export const DEFAULT_PLATFORM_MAPPINGS: Record<string, PlatformElementMapping> = {
  pinduoduo: {
    platform: 'pinduoduo',
    version: '1.0.0',
    mappings: {
      product_id: {
        selector: '[data-product-id], [class*="goods-id"], [class*="product-id"]',
        priority: 1,
        customAttributes: ['data-product-id', 'data-goods-id'],
        enabled: true,
      },
      product_title: {
        selector: '[class*="goods-title"], [class*="product-title"], h1[class*="title"]',
        priority: 1,
        enabled: true,
      },
      product_price: {
        selector: '[class*="price"]:not([class*="original"]), [class*="amount"]',
        priority: 1,
        enabled: true,
      },
      input_title: {
        selector: 'input[placeholder*="商品标题"], [class*="title"] input',
        priority: 1,
        enabled: true,
      },
      input_price: {
        selector: 'input[placeholder*="价格"], [class*="price"] input',
        priority: 1,
        enabled: true,
      },
      input_stock: {
        selector: 'input[placeholder*="库存"], [class*="stock"] input',
        priority: 1,
        enabled: true,
      },
      input_description: {
        selector: 'textarea[placeholder*="商品描述"], [class*="description"] textarea',
        priority: 1,
        enabled: true,
      },
      btn_submit: {
        selector: 'button:has-text("发布商品"), [class*="submit"] button',
        priority: 1,
        enabled: true,
      },
      upload_main_image: {
        selector: '[class*="main-image"] input[type="file"], [class*="cover"] input[type="file"]',
        priority: 1,
        enabled: true,
      },
      toast_success: {
        selector: '[class*="toast"]:has-text("发布成功"), [class*="message"]:has-text("发布成功")',
        priority: 1,
        enabled: true,
      },
    },
  },
  douyin: {
    platform: 'douyin',
    version: '1.0.0',
    mappings: {
      product_id: {
        selector: '[data-product-id], [class*="product-id"]',
        priority: 1,
        customAttributes: ['data-product-id'],
        enabled: true,
      },
      product_title: {
        selector: '[class*="product-title"], [class*="title"]',
        priority: 1,
        enabled: true,
      },
      product_price: {
        selector: '[class*="price"], [class*="amount"]',
        priority: 1,
        enabled: true,
      },
      input_title: {
        selector: 'input[placeholder*="标题"], [class*="title"] input',
        priority: 1,
        enabled: true,
      },
      input_price: {
        selector: 'input[placeholder*="价格"], [class*="price"] input',
        priority: 1,
        enabled: true,
      },
      btn_submit: {
        selector: 'button:has-text("发布"), button:has-text("确认")',
        priority: 1,
        enabled: true,
      },
      upload_images: {
        selector: '[class*="upload"] input[type="file"], [class*="image"] input[type="file"]',
        priority: 1,
        enabled: true,
      },
      toast_success: {
        selector: '[class*="toast"]:has-text("发布成功")',
        priority: 1,
        enabled: true,
      },
    },
  },
  taobao: {
    platform: 'taobao',
    version: '1.0.0',
    mappings: {
      product_id: {
        selector: '[data-itemid], [class*="item-id"]',
        priority: 1,
        customAttributes: ['data-itemid'],
        extractAs: 'data-id',
        enabled: true,
      },
      product_title: {
        selector: '[class*="item-title"], [class*="title"] h3, h3[class*="title"]',
        priority: 1,
        enabled: true,
      },
      product_price: {
        selector: '[class*="price"], [class*="original-price"]',
        priority: 1,
        enabled: true,
      },
      input_title: {
        selector: 'input[placeholder*="商品标题"], #title, [name="title"]',
        priority: 1,
        enabled: true,
      },
      input_price: {
        selector: 'input[placeholder*="商品价格"], #price, [name="price"]',
        priority: 1,
        enabled: true,
      },
      btn_submit: {
        selector: 'button:has-text("发布"), button:has-text("上架")',
        priority: 1,
        enabled: true,
      },
      upload_main_image: {
        selector: '[class*="main-pic"] input[type="file"], [class*="pic-upload"] input[type="file"]',
        priority: 1,
        enabled: true,
      },
    },
  },
  jd: {
    platform: 'jd',
    version: '1.0.0',
    mappings: {
      product_id: {
        selector: '[data-sku], [class*="sku-id"]',
        priority: 1,
        customAttributes: ['data-sku'],
        extractAs: 'data-id',
        enabled: true,
      },
      product_title: {
        selector: '[class*="product-name"], [class*="goods-name"], h3[class*="name"]',
        priority: 1,
        enabled: true,
      },
      product_price: {
        selector: '[class*="price"], [class*="jd-price"]',
        priority: 1,
        enabled: true,
      },
      input_title: {
        selector: 'input[placeholder*="商品名称"], [class*="name"] input',
        priority: 1,
        enabled: true,
      },
      input_price: {
        selector: 'input[placeholder*="价格"], [class*="price"] input',
        priority: 1,
        enabled: true,
      },
      btn_submit: {
        selector: 'button:has-text("提交"), button:has-text("发布")',
        priority: 1,
        enabled: true,
      },
      toast_success: {
        selector: '[class*="message"]:has-text("发布成功"), [class*="toast"]:has-text("成功")',
        priority: 1,
        enabled: true,
      },
    },
  },
}

export const ALL_PREDEFINED_IDS = [
  'product_id',
  'product_title',
  'product_url',
  'product_price',
  'product_stock',
  'product_status',
  'product_images',
  'created_time',
  'input_title',
  'input_price',
  'input_original_price',
  'input_stock',
  'input_description',
  'select_category',
  'select_shipping',
  'btn_submit',
  'btn_save_draft',
  'btn_preview',
  'btn_cancel',
  'upload_main_image',
  'upload_images',
  'upload_video',
  'toast_success',
  'toast_error',
  'modal_success',
  'modal_error',
]

export function getElementById(id: string): EcommerceElement | undefined {
  for (const elements of Object.values(PREDEFINED_ELEMENTS)) {
    const found = elements.find(e => e.id === id)
    if (found) return found
  }
  return undefined
}

export function getElementsByCategory(category: string): EcommerceElement[] {
  return PREDEFINED_ELEMENTS[category] || []
}

export function getAllElements(): EcommerceElement[] {
  return Object.values(PREDEFINED_ELEMENTS).flat()
}

export function createDefaultMapping(platform: string): PlatformElementMapping {
  const existing = DEFAULT_PLATFORM_MAPPINGS[platform]
  if (existing) {
    return JSON.parse(JSON.stringify(existing))
  }
  return {
    platform,
    version: '1.0.0',
    mappings: {},
  }
}
