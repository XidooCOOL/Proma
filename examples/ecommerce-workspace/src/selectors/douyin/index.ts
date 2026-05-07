/**
 * 抖音选择器库
 */

import { PageSelectors, PLATFORM_CONFIG } from '../types'

export const douyinLogin: PageSelectors = {
  page: '登录页面',
  platform: 'douyin',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*creator\\.douyin\\.com.*login.*',
  
  elements: {
    qrCodeContainer: {
      selector: '[class*="qrcode"], [class*="code-container"]',
      type: 'container',
      description: '二维码容器',
    },
    scanSuccessIndicator: {
      selector: '[class*="success"], [class*="checked"]',
      type: 'container',
      description: '扫码成功指示器',
      waitFor: 'visible',
    },
    phoneLoginTab: {
      selector: '[class*="tab"]:has-text("手机"), [class*="login-tab"]',
      type: 'tab',
      description: '手机登录标签',
    },
    phoneInput: {
      selector: 'input[type="tel"], input[placeholder*="手机"]',
      type: 'input',
      description: '手机号输入框',
    },
    sendCodeButton: {
      selector: 'button:has-text("获取验证码"), button:has-text("发送")',
      type: 'button',
      description: '发送验证码按钮',
    },
    verifyCodeInput: {
      selector: 'input[placeholder*="验证码"]',
      type: 'input',
      description: '验证码输入框',
    },
    loginButton: {
      selector: 'button:has-text("登录"), button[type="submit"]',
      type: 'button',
      description: '登录按钮',
    },
  },
  
  actions: {
    waitForPageLoad: '[class*="qrcode"]',
    loadTimeout: 15000,
  },
}

export const douyinProductCreate: PageSelectors = {
  page: '新增商品页面',
  platform: 'douyin',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*creator\\.douyin\\.com.*product.*create.*|.*creator\\.douyin\\.com.*goods.*add.*',
  
  elements: {
    // ===== 商品基本信息 =====
    productTitleInput: {
      selector: 'input[placeholder*="商品名称"], input[placeholder*="标题"], textarea[placeholder*="商品名称"]',
      type: 'input',
      description: '商品标题输入框',
      required: true,
      timeout: 5000,
    },
    
    productDescription: {
      selector: 'textarea[placeholder*="描述"], .description-editor',
      type: 'input',
      description: '商品描述输入框',
    },
    
    categorySelect: {
      selector: '[class*="category"] input, [class*="cascader"]',
      type: 'input',
      description: '类目选择器',
      required: true,
    },
    
    categoryOption: {
      selector: '[class*="option"]:not([class*="select-option"]), [class*="category-item"]',
      type: 'list',
      description: '类目选项',
    },
    
    // ===== 价格库存 =====
    priceInput: {
      selector: 'input[placeholder*="价格"], input[placeholder*="¥"]',
      type: 'input',
      description: '商品价格输入框',
      required: true,
    },
    
    stockInput: {
      selector: 'input[placeholder*="库存"], input[placeholder*="数量"]',
      type: 'input',
      description: '库存数量输入框',
    },
    
    // ===== 图片视频 =====
    coverImageUpload: {
      selector: '[class*="cover"] input[type="file"], [class*="main-image"] input[type="file"]',
      type: 'file',
      description: '封面图上传',
      required: true,
    },
    
    detailImageUpload: {
      selector: '[class*="detail"] input[type="file"], [class*="image-list"] input[type="file"]',
      type: 'file',
      description: '详情图片上传',
    },
    
    videoUpload: {
      selector: '[class*="video"] input[type="file"], [class*="upload-video"]',
      type: 'file',
      description: '视频上传',
    },
    
    uploadProgress: {
      selector: '[class*="progress"]:not([class*="bar"]), [class*="uploading"]',
      type: 'container',
      description: '上传进度',
      waitFor: 'hidden',
    },
    
    imagePreview: {
      selector: '[class*="preview"], [class*="thumbnail"] img',
      type: 'container',
      description: '图片预览',
    },
    
    // ===== 按钮 =====
    saveDraftButton: {
      selector: 'button:has-text("保存草稿"), button:has-text("存草稿")',
      type: 'button',
      description: '保存草稿按钮',
    },
    
    submitButton: {
      selector: 'button:has-text("提交审核"), button:has-text("发布"), button:has-text("确认")',
      type: 'button',
      description: '提交审核按钮',
      required: true,
    },
    
    previewButton: {
      selector: 'button:has-text("预览")',
      type: 'button',
      description: '预览按钮',
    },
    
    // ===== 弹窗 =====
    confirmDialog: {
      selector: '[class*="modal"], [class*="dialog"]',
      type: 'dialog',
      description: '确认弹窗',
    },
    
    confirmOk: {
      selector: '[class*="modal"] button:has-text("确定"), [class*="dialog"] button:has-text("确认")',
      type: 'button',
      description: '确认按钮',
    },
    
    // ===== 提示 =====
    successToast: {
      selector: '[class*="toast"]:has-text("成功"), [class*="message"]:has-text("成功")',
      type: 'container',
      description: '成功提示',
      waitFor: 'visible',
    },
    
    errorToast: {
      selector: '[class*="toast"][class*="error"], [class*="message"][class*="error"]',
      type: 'container',
      description: '错误提示',
      waitFor: 'visible',
    },
    
    loadingMask: {
      selector: '[class*="loading"], [class*="spinner"]',
      type: 'container',
      waitFor: 'hidden',
    },
  },
  
  actions: {
    waitForPageLoad: 'input[placeholder*="商品名称"]',
    waitForComplete: '[class*="toast"]:has-text("成功")',
    loadTimeout: 15000,
  },
}

export const douyinProductList: PageSelectors = {
  page: '商品列表页面',
  platform: 'douyin',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*creator\\.douyin\\.com.*product.*list.*',
  
  elements: {
    searchInput: {
      selector: 'input[placeholder*="搜索"], input[placeholder*="商品"]',
      type: 'input',
      description: '搜索框',
    },
    
    searchButton: {
      selector: 'button:has-text("搜索")',
      type: 'button',
      description: '搜索按钮',
    },
    
    productTable: {
      selector: '[class*="table"], table',
      type: 'table',
      description: '商品表格',
    },
    
    productRow: {
      selector: '[class*="table"] tbody tr, table tbody tr',
      type: 'list',
      description: '商品行',
    },
    
    productName: {
      selector: '[class*="name"], [class*="title"]',
      type: 'container',
      description: '商品名称',
    },
    
    productStatus: {
      selector: '[class*="status"]',
      type: 'container',
      description: '商品状态',
    },
    
    editButton: {
      selector: 'button:has-text("编辑"), [class*="action"]:has-text("编辑")',
      type: 'button',
      description: '编辑按钮',
    },
    
    addProductButton: {
      selector: 'button:has-text("添加商品"), button:has-text("新增")',
      type: 'button',
      description: '添加商品按钮',
    },
    
    selectAllCheckbox: {
      selector: 'thead input[type="checkbox"]',
      type: 'checkbox',
      description: '全选',
    },
    
    batchAction: {
      selector: 'button:has-text("批量")',
      type: 'button',
      description: '批量操作',
    },
    
    pagination: {
      selector: '[class*="pagination"], [class*="page"]',
      type: 'container',
      description: '分页',
    },
  },
  
  actions: {
    waitForPageLoad: '[class*="table"] tbody tr',
    loadTimeout: 10000,
  },
}

export const douyinOrderList: PageSelectors = {
  page: '订单列表页面',
  platform: 'douyin',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*creator\\.douyin\\.com.*order.*',
  
  elements: {
    orderSearch: {
      selector: 'input[placeholder*="订单"], input[placeholder*="订单号"]',
      type: 'input',
      description: '订单搜索',
    },
    
    statusFilter: {
      selector: '[class*="status"] select, [class*="filter"]',
      type: 'select',
      description: '状态筛选',
    },
    
    orderTable: {
      selector: '[class*="table"], table',
      type: 'table',
      description: '订单表格',
    },
    
    orderRow: {
      selector: '[class*="table"] tbody tr',
      type: 'list',
      description: '订单行',
    },
    
    orderId: {
      selector: 'a[href*="order"], [class*="order-id"]',
      type: 'link',
      description: '订单号',
    },
    
    orderStatus: {
      selector: '[class*="status"]',
      type: 'container',
      description: '订单状态',
    },
    
    shipButton: {
      selector: 'button:has-text("发货"), button:has-text("发货")',
      type: 'button',
      description: '发货按钮',
    },
    
    selectCheckbox: {
      selector: 'input[type="checkbox"]',
      type: 'checkbox',
      description: '选择框',
    },
    
    batchShipButton: {
      selector: 'button:has-text("批量发货")',
      type: 'button',
      description: '批量发货',
    },
    
    pagination: {
      selector: '[class*="pagination"]',
      type: 'container',
      description: '分页',
    },
  },
  
  actions: {
    waitForPageLoad: '[class*="table"] tbody tr',
    loadTimeout: 10000,
  },
}

export const douyinSelectors = {
  platform: 'douyin' as const,
  config: PLATFORM_CONFIG.douyin,
  
  pages: {
    login: douyinLogin,
    productCreate: douyinProductCreate,
    productList: douyinProductList,
    orderList: douyinOrderList,
  },
}
