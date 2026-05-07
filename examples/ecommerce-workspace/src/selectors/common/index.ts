/**
 * 通用选择器库
 * 
 * 这些选择器在多个平台间通用，可以复用
 */

import { PageSelectors, PLATFORM_CONFIG } from './types'

export const commonLogin: PageSelectors = {
  page: '通用登录页面',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  
  elements: {
    usernameInput: {
      selector: 'input[type="text"], input[type="tel"], input[placeholder*="手机"], input[placeholder*="账号"]',
      type: 'input',
      description: '用户名/手机号输入框',
      required: true,
    },
    
    passwordInput: {
      selector: 'input[type="password"]',
      type: 'input',
      description: '密码输入框',
      required: true,
    },
    
    loginButton: {
      selector: 'button[type="submit"], button:has-text("登录"), button:has-text("确认"), button:has-text("下一步")',
      type: 'button',
      description: '登录按钮',
      required: true,
    },
    
    qrCodeButton: {
      selector: 'button:has-text("扫码"), button:has-text("二维码"), [class*="qrcode"]',
      type: 'button',
      description: '二维码登录按钮',
    },
    
    qrCodeContainer: {
      selector: '[class*="qrcode"], [class*="code"], [class*="scan"]',
      type: 'container',
      description: '二维码容器',
    },
    
    errorMessage: {
      selector: '[class*="error"], [class*="wrong"], [class*="invalid"], .tips-error',
      type: 'container',
      description: '错误提示',
    },
    
    loadingIndicator: {
      selector: '[class*="loading"], [class*="spinner"], .loading-mask',
      type: 'container',
      waitFor: 'hidden',
    },
  },
  
  actions: {
    waitForPageLoad: 'input[type="text"], input[type="tel"], [class*="qrcode"]',
    loadTimeout: 10000,
  },
}

export const commonProductForm: PageSelectors = {
  page: '通用商品表单',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  
  elements: {
    // ===== 基本信息 =====
    titleInput: {
      selector: 'input[name*="title"], input[name*="name"], input[placeholder*="标题"], input[placeholder*="名称"]',
      type: 'input',
      description: '商品标题输入框',
      required: true,
    },
    
    descriptionTextarea: {
      selector: 'textarea[name*="desc"], textarea[placeholder*="描述"], textarea[placeholder*="详情"]',
      type: 'input',
      description: '商品描述文本框',
    },
    
    categoryTrigger: {
      selector: '[class*="category"], [class*="cascader"], [class*="select"]:has-text("类目")',
      type: 'container',
      description: '类目选择触发器',
    },
    
    categoryOption: {
      selector: '[class*="option"], [class*="item"], [class*="category"]:not([class*="select"])',
      type: 'list',
      description: '类目选项',
    },
    
    // ===== 价格库存 =====
    priceInput: {
      selector: 'input[name*="price"], input[placeholder*="价格"], input[placeholder*="¥"]',
      type: 'input',
      description: '价格输入框',
      required: true,
    },
    
    originalPriceInput: {
      selector: 'input[name*="original"], input[placeholder*="原价"], input[name*="market"]',
      type: 'input',
      description: '原价输入框',
    },
    
    stockInput: {
      selector: 'input[name*="stock"], input[name*="quantity"], input[name*="num"], input[placeholder*="库存"]',
      type: 'input',
      description: '库存输入框',
    },
    
    // ===== 图片上传 =====
    mainImageInput: {
      selector: 'input[type="file"][accept*="image"]:first-of-type, [class*="main"] input[type="file"]',
      type: 'file',
      description: '主图上传',
      required: true,
    },
    
    imageInput: {
      selector: 'input[type="file"][accept*="image"]',
      type: 'file',
      description: '图片上传',
    },
    
    imagePreview: {
      selector: '[class*="preview"] img, [class*="thumbnail"] img, [class*="picture"] img',
      type: 'container',
      description: '图片预览',
    },
    
    uploadProgress: {
      selector: '[class*="progress"]:not([class*="bar"]), [class*="uploading"], [class*="loading"]:has-text("上传")',
      type: 'container',
      waitFor: 'hidden',
    },
    
    removeImageButton: {
      selector: '[class*="remove"], [class*="delete"]:has(svg), [class*="close"]',
      type: 'button',
      description: '删除图片按钮',
    },
    
    // ===== 物流 =====
    freightSelect: {
      selector: 'select[name*="freight"], select[name*="shipping"], select[name*="delivery"]',
      type: 'select',
      description: '运费模板选择',
    },
    
    weightInput: {
      selector: 'input[name*="weight"], input[placeholder*="重量"]',
      type: 'input',
      description: '重量输入框',
    },
    
    // ===== 按钮 =====
    submitButton: {
      selector: 'button[type="submit"], button:has-text("提交"), button:has-text("发布"), button:has-text("确认")',
      type: 'button',
      description: '提交按钮',
      required: true,
    },
    
    saveDraftButton: {
      selector: 'button:has-text("草稿"), button:has-text("保存")',
      type: 'button',
      description: '保存草稿',
    },
    
    previewButton: {
      selector: 'button:has-text("预览")',
      type: 'button',
      description: '预览按钮',
    },
    
    // ===== 弹窗 =====
    dialog: {
      selector: '[class*="modal"], [class*="dialog"], [class*="popup"]',
      type: 'dialog',
      description: '弹窗',
    },
    
    dialogOk: {
      selector: '[class*="modal"] button:has-text("确定"), [class*="dialog"] button:has-text("确认"), .confirm-btn',
      type: 'button',
      description: '弹窗确认',
    },
    
    dialogCancel: {
      selector: '[class*="modal"] button:has-text("取消"), [class*="dialog"] button:has-text("关闭"), .cancel-btn',
      type: 'button',
      description: '弹窗取消',
    },
    
    // ===== 提示 =====
    successTip: {
      selector: '[class*="success"]:not([class*="button"]):not([class*="icon"]), [class*="toast"]:has-text("成功"), .message.success',
      type: 'container',
      description: '成功提示',
      waitFor: 'visible',
    },
    
    errorTip: {
      selector: '[class*="error"]:not([class*="button"]):not([class*="icon"]), [class*="toast"][class*="error"], .error-tip',
      type: 'container',
      description: '错误提示',
      waitFor: 'visible',
    },
    
    loadingMask: {
      selector: '[class*="loading-mask"], [class*="page-loading"], .loading-overlay',
      type: 'container',
      waitFor: 'hidden',
    },
    
    // ===== 通用表单元素 =====
    input: {
      selector: 'input[type="text"], input[type="number"], input:not([type])',
      type: 'input',
      description: '通用文本输入',
    },
    
    textarea: {
      selector: 'textarea',
      type: 'input',
      description: '通用文本域',
    },
    
    button: {
      selector: 'button:not([type="submit"])',
      type: 'button',
      description: '通用按钮',
    },
    
    checkbox: {
      selector: 'input[type="checkbox"]',
      type: 'checkbox',
      description: '复选框',
    },
    
    radio: {
      selector: 'input[type="radio"]',
      type: 'radio',
      description: '单选框',
    },
    
    select: {
      selector: 'select',
      type: 'select',
      description: '下拉选择',
    },
  },
  
  actions: {
    waitForPageLoad: 'input[name*="title"], input[placeholder*="标题"]',
    waitForComplete: '[class*="success"]',
    loadTimeout: 15000,
  },
}

export const commonTable: PageSelectors = {
  page: '通用表格',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  
  elements: {
    table: {
      selector: 'table, [class*="table"]',
      type: 'table',
      description: '数据表格',
    },
    
    tableHeader: {
      selector: 'thead, [class*="header"]',
      type: 'container',
      description: '表头',
    },
    
    tableBody: {
      selector: 'tbody, [class*="body"]',
      type: 'container',
      description: '表体',
    },
    
    tableRow: {
      selector: 'tbody tr, [class*="table"] tbody > *',
      type: 'list',
      description: '表格行',
    },
    
    tableCell: {
      selector: 'td, [class*="cell"]',
      type: 'container',
      description: '单元格',
    },
    
    selectAllCheckbox: {
      selector: 'thead input[type="checkbox"], th input[type="checkbox"]',
      type: 'checkbox',
      description: '全选复选框',
    },
    
    rowCheckbox: {
      selector: 'tbody input[type="checkbox"]',
      type: 'checkbox',
      description: '行复选框',
    },
    
    pagination: {
      selector: '[class*="pagination"], .page-nav, nav[role="navigation"]',
      type: 'container',
      description: '分页组件',
    },
    
    prevPageButton: {
      selector: 'button:has-text("上一页"), [class*="prev"], [aria-label*="previous"]',
      type: 'button',
      description: '上一页',
    },
    
    nextPageButton: {
      selector: 'button:has-text("下一页"), [class*="next"], [aria-label*="next"]',
      type: 'button',
      description: '下一页',
    },
    
    pageInput: {
      selector: 'input[type="number"][placeholder*="页"], input[class*="page"]',
      type: 'input',
      description: '页码输入框',
    },
    
    searchInput: {
      selector: 'input[type="search"], input[placeholder*="搜索"], input[placeholder*="查询"]',
      type: 'input',
      description: '搜索框',
    },
    
    searchButton: {
      selector: 'button:has-text("搜索"), button:has-text("查询"), button:has-text("筛选")',
      type: 'button',
      description: '搜索按钮',
    },
    
    filterSelect: {
      selector: 'select, [class*="filter"] select, [class*="dropdown"]',
      type: 'select',
      description: '筛选下拉框',
    },
    
    batchButton: {
      selector: 'button:has-text("批量"), [class*="batch"] button',
      type: 'button',
      description: '批量操作按钮',
    },
    
    emptyState: {
      selector: '[class*="empty"], [class*="no-data"], .null',
      type: 'container',
      description: '空状态提示',
    },
    
    loadingRows: {
      selector: '[class*="skeleton"], [class*="loading"] tr, [class*="placeholder"]',
      type: 'container',
      waitFor: 'hidden',
    },
  },
  
  actions: {
    waitForPageLoad: 'tbody tr, [class*="body"] > *',
    loadTimeout: 10000,
  },
}

export const commonSelectors = {
  platform: 'common' as const,
  
  pages: {
    login: commonLogin,
    productForm: commonProductForm,
    table: commonTable,
  },
}
