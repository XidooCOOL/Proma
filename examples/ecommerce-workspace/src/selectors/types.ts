/**
 * Selector 库 - 页面元素定义
 * 
 * 按平台和页面组织，便于：
 * 1. 页面改版时单独更新
 * 2. Playwright 调用
 * 3. 团队协作维护
 */

export type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'kuaishou'

export type ElementType = 'input' | 'button' | 'select' | 'checkbox' | 'radio' | 
  'file' | 'dialog' | 'link' | 'table' | 'list' | 'container' | 'iframe' | 'tab'

export type ActionType = 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 
  'upload' | 'hover' | 'dblclick' | 'wait' | 'screenshot' | 'evaluate'

export interface Selector {
  /** CSS 或 Playwright 定位器 */
  selector: string
  
  /** Playwright 内置定位器类型 */
  locator?: 'text' | 'role' | 'test-id' | 'label'
  
  /** 元素类型 */
  type: ElementType
  
  /** 元素描述 */
  description?: string
  
  /** 是否必需 */
  required?: boolean
  
  /** 超时时间（毫秒） */
  timeout?: number
  
  /** 等待条件 */
  waitFor?: 'visible' | 'hidden' | 'attached' | 'detached' | 'enabled' | 'disabled'
  
  /** 关联的选择器（如点击后弹出的对话框） */
  related?: string
}

export interface PageSelectors {
  /** 页面名称 */
  page: string
  
  /** 所属平台 */
  platform: Platform
  
  /** 选择器版本 */
  version: string
  
  /** 最后更新时间 */
  updatedAt: string
  
  /** 页面 URL（支持正则） */
  urlPattern?: string
  
  /** 页面标题（支持正则） */
  titlePattern?: string
  
  /** 所有页面元素 */
  elements: Record<string, Selector>
  
  /** 页面特定操作 */
  actions?: {
    /** 页面加载等待的选择器 */
    waitForPageLoad?: string
    /** 操作完成后等待的选择器 */
    waitForComplete?: string
    /** 加载超时（毫秒） */
    loadTimeout?: number
  }
  
  /** 条件元素（某些步骤是否执行根据此判断） */
  conditions?: Record<string, {
    selector: string
    operator: 'visible' | 'hidden' | 'checked' | 'unchecked' | 'equals'
    value?: string
  }>
  
  /** 变更日志 */
  changelog?: string[]
}

export interface SelectorSet {
  platform: Platform
  pages: Record<string, PageSelectors>
}

/**
 * 预定义的选择器模式
 */
export const COMMON_SELECTORS = {
  /** 通用的确认按钮 */
  confirmButton: {
    selector: 'button:has-text("确认"), button:has-text("确定"), button:has-text("提交")',
    type: 'button' as const,
    description: '通用确认/提交按钮',
    locator: 'text',
  },
  
  /** 通用的取消按钮 */
  cancelButton: {
    selector: 'button:has-text("取消"), button:has-text("关闭")',
    type: 'button' as const,
    description: '通用取消/关闭按钮',
    locator: 'text',
  },
  
  /** 通用的加载等待 */
  loadingIndicator: {
    selector: '.loading, .spinner, [class*="loading"], [class*="spinner"]',
    type: 'container' as const,
    description: '加载指示器',
    waitFor: 'hidden',
  },
  
  /** 通用成功提示 */
  successToast: {
    selector: '.toast.success, .message.success, [class*="success"]',
    type: 'container' as const,
    description: '成功提示',
    waitFor: 'visible',
  },
  
  /** 通用错误提示 */
  errorToast: {
    selector: '.toast.error, .message.error, [class*="error"]',
    type: 'container' as const,
    description: '错误提示',
    waitFor: 'visible',
  },
  
  /** 文件上传输入框 */
  fileInput: {
    selector: 'input[type="file"]',
    type: 'file' as const,
    description: '文件上传输入框',
  },
  
  /** 图片预览容器 */
  imagePreview: {
    selector: 'img[src], [class*="preview"]',
    type: 'container' as const,
    description: '图片预览',
  },
} as const

/**
 * 平台配置
 */
export const PLATFORM_CONFIG: Record<Platform, {
  name: string
  backendUrl: string
  loginUrl: string
  color: string
}> = {
  pinduoduo: {
    name: '拼多多',
    backendUrl: 'https://mms.pinduoduo.com',
    loginUrl: 'https://mms.pinduoduo.com',
    color: '#E60012',
  },
  douyin: {
    name: '抖音',
    backendUrl: 'https://creator.douyin.com',
    loginUrl: 'https://creator.douyin.com',
    color: '#161823',
  },
  taobao: {
    name: '淘宝',
    backendUrl: 'https://sell.taobao.com',
    loginUrl: 'https://login.taobao.com',
    color: '#FF5000',
  },
  jd: {
    name: '京东',
    backendUrl: 'https://passport.jd.com',
    loginUrl: 'https://passport.jd.com',
    color: '#E2231A',
  },
  kuaishou: {
    name: '快手',
    backendUrl: 'https://cp.kuaishou.com',
    loginUrl: 'https://cp.kuaishou.com',
    color: '#FF4906',
  },
}
