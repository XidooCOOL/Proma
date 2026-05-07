/**
 * 淘宝选择器库
 */

import { PageSelectors, PLATFORM_CONFIG } from '../types'

export const taobaoLogin: PageSelectors = {
  page: '登录页面',
  platform: 'taobao',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*login\\.taobao\\.com.*|.*taobao\\.com.*login.*',
  
  elements: {
    usernameInput: {
      selector: '#fm-login-id, input[name="loginId"], input[placeholder*="账号"]',
      type: 'input',
      description: '用户名输入框',
    },
    passwordInput: {
      selector: '#fm-login-password, input[name="password"], input[type="password"]',
      type: 'input',
      description: '密码输入框',
    },
    loginButton: {
      selector: '#login-button, button[type="submit"], .btn-login',
      type: 'button',
      description: '登录按钮',
    },
    qrCodeContainer: {
      selector: '.qrcode-login, [class*="qrcode"]',
      type: 'container',
      description: '二维码登录区',
    },
  },
  
  actions: {
    waitForPageLoad: '#fm-login-id, .qrcode-login',
    loadTimeout: 15000,
  },
}

export const taobaoProductCreate: PageSelectors = {
  page: '新增商品页面',
  platform: 'taobao',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*sell\\.taobao\\.com.*auction.*create.*|.*upload\\.taobao\\.com.*',
  
  elements: {
    productTitleInput: {
      selector: 'input[placeholder*="商品标题"], textarea[placeholder*="商品名称"]',
      type: 'input',
      description: '商品标题',
      required: true,
    },
    
    productDescription: {
      selector: 'textarea[placeholder*="商品描述"], .editor-textarea',
      type: 'input',
      description: '商品描述',
    },
    
    priceInput: {
      selector: 'input[placeholder*="价格"], input[name*="price"]',
      type: 'input',
      description: '价格输入',
      required: true,
    },
    
    stockInput: {
      selector: 'input[placeholder*="数量"], input[name*="quantity"]',
      type: 'input',
      description: '库存输入',
    },
    
    mainImageUpload: {
      selector: '[class*="picture-item"] input[type="file"], input[type="file"][accept*="image"]',
      type: 'file',
      description: '主图上传',
      required: true,
    },
    
    detailImageUpload: {
      selector: '[class*="description"] input[type="file"]',
      type: 'file',
      description: '详情图上传',
    },
    
    categorySelect: {
      selector: '[class*="category"] input, .category-trigger',
      type: 'input',
      description: '类目选择',
    },
    
    submitButton: {
      selector: 'button:has-text("发布"), button:has-text("提交"), .submit-btn',
      type: 'button',
      description: '发布按钮',
      required: true,
    },
    
    saveDraftButton: {
      selector: 'button:has-text("保存"), button:has-text("草稿")',
      type: 'button',
      description: '保存草稿',
    },
    
    successToast: {
      selector: '[class*="success"], .tips-success',
      type: 'container',
      description: '成功提示',
      waitFor: 'visible',
    },
    
    errorToast: {
      selector: '[class*="error"], .tips-error, .error-tips',
      type: 'container',
      description: '错误提示',
      waitFor: 'visible',
    },
    
    loadingMask: {
      selector: '.loading-mask, [class*="loading"]',
      type: 'container',
      waitFor: 'hidden',
    },
  },
  
  actions: {
    waitForPageLoad: 'input[placeholder*="商品标题"]',
    waitForComplete: '[class*="success"]',
    loadTimeout: 20000,
  },
}

export const taobaoOrderList: PageSelectors = {
  page: '订单列表页面',
  platform: 'taobao',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*sell\\.taobao\\.com.*order.*|.*trade\\.taobao\\.com.*',
  
  elements: {
    orderSearch: {
      selector: 'input[placeholder*="订单号"], input[name*="order"]',
      type: 'input',
      description: '订单搜索',
    },
    
    orderTable: {
      selector: 'table, [class*="order-table"]',
      type: 'table',
      description: '订单表格',
    },
    
    orderRow: {
      selector: 'table tbody tr',
      type: 'list',
      description: '订单行',
    },
    
    orderId: {
      selector: 'td a[href*="detail"], [class*="order-id"]',
      type: 'link',
      description: '订单号',
    },
    
    shipButton: {
      selector: 'button:has-text("发货"), .ship-btn',
      type: 'button',
      description: '发货按钮',
    },
    
    selectCheckbox: {
      selector: 'input[type="checkbox"]',
      type: 'checkbox',
      description: '选择框',
    },
    
    pagination: {
      selector: '.pagination, [class*="page"]',
      type: 'container',
      description: '分页',
    },
  },
  
  actions: {
    waitForPageLoad: 'table tbody tr',
    loadTimeout: 10000,
  },
}

export const taobaoSelectors = {
  platform: 'taobao' as const,
  config: PLATFORM_CONFIG.taobao,
  
  pages: {
    login: taobaoLogin,
    productCreate: taobaoProductCreate,
    orderList: taobaoOrderList,
  },
}
