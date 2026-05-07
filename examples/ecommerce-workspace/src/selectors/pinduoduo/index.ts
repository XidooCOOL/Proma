/**
 * 拼多多选择器库
 */

import { PageSelectors, PLATFORM_CONFIG } from '../types'

export const pinduoduoLogin: PageSelectors = {
  page: '登录页面',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*mms\\.pinduoduo\\.com.*login.*',
  
  elements: {
    usernameInput: {
      selector: 'input[name="username"], input[placeholder*="手机号"]',
      type: 'input',
      description: '用户名/手机号输入框',
      required: true,
    },
    passwordInput: {
      selector: 'input[name="password"], input[type="password"]',
      type: 'input',
      description: '密码输入框',
      required: true,
    },
    loginButton: {
      selector: 'button[type="submit"], button:has-text("登录"), button:has-text("确认")',
      type: 'button',
      description: '登录按钮',
      required: true,
    },
    qrCodeButton: {
      selector: 'button:has-text("扫码登录"), [class*="qrcode"]',
      type: 'button',
      description: '二维码登录切换按钮',
    },
    qrCodeContainer: {
      selector: '[class*="qrcode"], [class*="code"]',
      type: 'container',
      description: '二维码容器',
    },
    errorMessage: {
      selector: '.error-tip, [class*="error"], .tips',
      type: 'container',
      description: '错误提示',
    },
  },
  
  actions: {
    waitForPageLoad: 'input[name="username"]',
    loadTimeout: 10000,
  },
}

export const pinduoduoProductCreate: PageSelectors = {
  page: '新增商品页面',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*mms\\.pinduoduo\\.com.*goods.*create.*|.*goods.*detail.*',
  
  elements: {
    // ===== 商品基本信息 =====
    productTitleInput: {
      selector: 'input[name="goods_name"], input[placeholder*="商品名称"], input[placeholder*="标题"]',
      type: 'input',
      description: '商品标题输入框',
      required: true,
      timeout: 5000,
    },
    
    productDescription: {
      selector: 'textarea[name="description"], textarea[placeholder*="描述"], .editor-content',
      type: 'input',
      description: '商品描述输入框',
    },
    
    categorySelect: {
      selector: '[class*="category"]:not([class*="select"]), [class*="cascader"]',
      type: 'select',
      description: '商品类目选择器',
      required: true,
    },
    
    categoryOption: {
      selector: '[class*="option"]:not([class*="select-option"]), [class*="category-item"]',
      type: 'list',
      description: '类目选项',
    },
    
    // ===== 价格库存 =====
    priceInput: {
      selector: 'input[name="price"], input[placeholder*="价格"], input[name*="price"]',
      type: 'input',
      description: '商品价格输入框',
      required: true,
    },
    
    originalPriceInput: {
      selector: 'input[name*="original"], input[placeholder*="原价"]',
      type: 'input',
      description: '原价输入框',
    },
    
    stockInput: {
      selector: 'input[name="stock"], input[placeholder*="库存"], input[name*="quantity"]',
      type: 'input',
      description: '库存数量输入框',
    },
    
    skuTable: {
      selector: 'table.sku-table, [class*="sku"], [class*="spec"]',
      type: 'table',
      description: 'SKU 规格表格',
    },
    
    skuPriceInput: {
      selector: 'input[name*="sku_price"], input[placeholder*="规格价格"]',
      type: 'input',
      description: 'SKU 价格输入框',
    },
    
    skuStockInput: {
      selector: 'input[name*="sku_stock"], input[placeholder*="规格库存"]',
      type: 'input',
      description: 'SKU 库存输入框',
    },
    
    // ===== 图片上传 =====
    mainImageUpload: {
      selector: '[class*="main-image"] input[type="file"], [class*="cover"] input[type="file"]',
      type: 'file',
      description: '主图上传按钮',
      required: true,
    },
    
    detailImageUpload: {
      selector: '[class*="detail-image"] input[type="file"], [class*="description"] input[type="file"]',
      type: 'file',
      description: '详情图上传按钮',
    },
    
    imagePreviewContainer: {
      selector: '[class*="preview"], [class*="thumbnail"]',
      type: 'container',
      description: '图片预览容器',
    },
    
    uploadProgress: {
      selector: '[class*="progress"]:not([class*="bar"]), [class*="uploading"]',
      type: 'container',
      description: '上传进度指示器',
      waitFor: 'hidden',
    },
    
    // ===== 物流配送 =====
    freightSelect: {
      selector: '[class*="freight"] select, [class*="shipping"] select',
      type: 'select',
      description: '运费模板选择',
    },
    
    weightInput: {
      selector: 'input[name*="weight"], input[placeholder*="重量"]',
      type: 'input',
      description: '商品重量输入框',
    },
    
    // ===== 按钮操作 =====
    saveDraftButton: {
      selector: 'button:has-text("保存草稿"), button:has-text("存为草稿")',
      type: 'button',
      description: '保存草稿按钮',
    },
    
    submitButton: {
      selector: 'button[type="submit"], button:has-text("提交"), button:has-text("发布")',
      type: 'button',
      description: '提交/发布按钮',
      required: true,
    },
    
    previewButton: {
      selector: 'button:has-text("预览")',
      type: 'button',
      description: '预览按钮',
    },
    
    // ===== 确认弹窗 =====
    confirmDialog: {
      selector: '[class*="modal"], [class*="dialog"], [class*="confirm"]',
      type: 'dialog',
      description: '确认弹窗',
    },
    
    confirmDialogOk: {
      selector: '[class*="modal"] button:has-text("确定"), [class*="dialog"] button:has-text("确认")',
      type: 'button',
      description: '弹窗确认按钮',
    },
    
    confirmDialogCancel: {
      selector: '[class*="modal"] button:has-text("取消"), [class*="dialog"] button:has-text("关闭")',
      type: 'button',
      description: '弹窗取消按钮',
    },
    
    // ===== 状态提示 =====
    successToast: {
      selector: '[class*="toast"]:has-text("成功"), [class*="message"]:has-text("成功"), .tips.success',
      type: 'container',
      description: '成功提示',
      waitFor: 'visible',
    },
    
    errorToast: {
      selector: '[class*="toast"][class*="error"], [class*="message"][class*="error"], .error-tip',
      type: 'container',
      description: '错误提示',
      waitFor: 'visible',
    },
    
    loadingMask: {
      selector: '[class*="loading-mask"], [class*="page-loading"], .loading-overlay',
      type: 'container',
      description: '页面加载遮罩',
      waitFor: 'hidden',
    },
    
    // ===== 商品编辑特有 =====
    editProductTitle: {
      selector: 'input[name="goods_name"]',
      type: 'input',
      description: '编辑页商品标题',
    },
    
    editSaveButton: {
      selector: 'button:has-text("保存"), button:has-text("修改")',
      type: 'button',
      description: '保存修改按钮',
    },
  },
  
  actions: {
    waitForPageLoad: 'input[name="goods_name"]',
    waitForComplete: '[class*="toast"]:has-text("成功")',
    loadTimeout: 15000,
  },
}

export const pinduoduoProductList: PageSelectors = {
  page: '商品列表页面',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*mms\\.pinduoduo\\.com.*goods.*list.*|.*mms\\.pinduoduo\\.com.*goods.*',
  
  elements: {
    // ===== 搜索筛选 =====
    searchInput: {
      selector: 'input[placeholder*="搜索"], input[placeholder*="商品"]',
      type: 'input',
      description: '商品搜索输入框',
    },
    
    searchButton: {
      selector: 'button:has-text("搜索"), button:has-text("查询")',
      type: 'button',
      description: '搜索按钮',
    },
    
    statusFilter: {
      selector: '[class*="status"] select, [class*="filter"] select',
      type: 'select',
      description: '状态筛选下拉框',
    },
    
    // ===== 表格操作 =====
    productTable: {
      selector: 'table, [class*="table"]',
      type: 'table',
      description: '商品表格',
    },
    
    productRow: {
      selector: 'table tbody tr, [class*="table"] tbody tr',
      type: 'list',
      description: '商品行',
    },
    
    productNameCell: {
      selector: 'td:nth-child(2), [class*="name"], [class*="title"]',
      type: 'container',
      description: '商品名称单元格',
    },
    
    productStatusCell: {
      selector: 'td:nth-child(5), [class*="status"]',
      type: 'container',
      description: '商品状态单元格',
    },
    
    // ===== 批量操作 =====
    selectAllCheckbox: {
      selector: 'thead input[type="checkbox"], [class*="select-all"]',
      type: 'checkbox',
      description: '全选复选框',
    },
    
    selectRowCheckbox: {
      selector: 'tbody input[type="checkbox"]',
      type: 'checkbox',
      description: '行选择复选框',
    },
    
    batchActionButton: {
      selector: 'button:has-text("批量"), [class*="batch"] button',
      type: 'button',
      description: '批量操作按钮',
    },
    
    batchDeleteButton: {
      selector: 'button:has-text("删除"), button:has-text("下架")',
      type: 'button',
      description: '批量删除/下架按钮',
    },
    
    // ===== 分页 =====
    paginationContainer: {
      selector: '[class*="pagination"], .page, nav[role="navigation"]',
      type: 'container',
      description: '分页容器',
    },
    
    nextPageButton: {
      selector: 'button:has-text("下一页"), [class*="next"]',
      type: 'button',
      description: '下一页按钮',
    },
    
    prevPageButton: {
      selector: 'button:has-text("上一页"), [class*="prev"]',
      type: 'button',
      description: '上一页按钮',
    },
    
    currentPageInput: {
      selector: 'input[type="number"][class*="page"]',
      type: 'input',
      description: '当前页码输入框',
    },
    
    // ===== 操作按钮 =====
    addProductButton: {
      selector: 'button:has-text("新增商品"), button:has-text("添加商品"), a:has-text("新增")',
      type: 'button',
      description: '新增商品按钮',
    },
    
    editProductButton: {
      selector: 'a:has-text("编辑"), button:has-text("编辑"), [class*="edit"]',
      type: 'button',
      description: '编辑商品按钮',
    },
    
    viewProductButton: {
      selector: 'a:has-text("查看"), button:has-text("详情")',
      type: 'button',
      description: '查看商品按钮',
    },
  },
  
  actions: {
    waitForPageLoad: 'table tbody tr',
    loadTimeout: 10000,
  },
}

export const pinduoduoOrderList: PageSelectors = {
  page: '订单列表页面',
  platform: 'pinduoduo',
  version: '1.0.0',
  updatedAt: '2024-01-15',
  urlPattern: '.*mms\\.pinduoduo\\.com.*order.*',
  
  elements: {
    // ===== 搜索筛选 =====
    orderSearchInput: {
      selector: 'input[placeholder*="订单号"], input[placeholder*="订单"]',
      type: 'input',
      description: '订单号搜索框',
    },
    
    dateRangePicker: {
      selector: '[class*="date-picker"], [class*="daterange"]',
      type: 'container',
      description: '日期范围选择器',
    },
    
    orderStatusFilter: {
      selector: '[class*="status"] select, [class*="order-status"]',
      type: 'select',
      description: '订单状态筛选',
    },
    
    searchButton: {
      selector: 'button:has-text("搜索"), button:has-text("查询"), button:has-text("筛选")',
      type: 'button',
      description: '搜索按钮',
    },
    
    // ===== 订单表格 =====
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
    
    orderIdCell: {
      selector: 'td:nth-child(1) a, [class*="order-id"]',
      type: 'link',
      description: '订单号单元格',
    },
    
    orderStatusCell: {
      selector: 'td:nth-child(4), [class*="order-status"]',
      type: 'container',
      description: '订单状态单元格',
    },
    
    orderAmountCell: {
      selector: 'td:nth-child(5), [class*="amount"]',
      type: 'container',
      description: '订单金额单元格',
    },
    
    // ===== 批量发货 =====
    selectAllCheckbox: {
      selector: 'thead input[type="checkbox"]',
      type: 'checkbox',
      description: '全选复选框',
    },
    
    selectOrderCheckbox: {
      selector: 'tbody input[type="checkbox"]',
      type: 'checkbox',
      description: '订单选择复选框',
    },
    
    batchShipButton: {
      selector: 'button:has-text("批量发货"), button:has-text("发货")',
      type: 'button',
      description: '批量发货按钮',
    },
    
    shipDialog: {
      selector: '[class*="dialog"]:has-text("发货"), [class*="modal"]:has-text("发货")',
      type: 'dialog',
      description: '发货弹窗',
    },
    
    logisticsSelect: {
      selector: '[class*="logistics"] select, [class*="express"] select',
      type: 'select',
      description: '物流公司选择',
    },
    
    trackingInput: {
      selector: 'input[name*="tracking"], input[placeholder*="运单号"]',
      type: 'input',
      description: '运单号输入框',
    },
    
    shipConfirmButton: {
      selector: '[class*="dialog"] button:has-text("确认发货"), [class*="modal"] button:has-text("发货")',
      type: 'button',
      description: '确认发货按钮',
    },
    
    // ===== 退款处理 =====
    refundButton: {
      selector: 'button:has-text("退款"), button:has-text("售后")',
      type: 'button',
      description: '退款按钮',
    },
    
    // ===== 分页 =====
    paginationContainer: {
      selector: '[class*="pagination"]',
      type: 'container',
      description: '分页容器',
    },
  },
  
  actions: {
    waitForPageLoad: 'table tbody tr',
    loadTimeout: 10000,
  },
}

export const pinduoduoSelectors = {
  platform: 'pinduoduo' as const,
  config: PLATFORM_CONFIG.pinduoduo,
  
  pages: {
    login: pinduoduoLogin,
    productCreate: pinduoduoProductCreate,
    productList: pinduoduoProductList,
    orderList: pinduoduoOrderList,
  },
}
