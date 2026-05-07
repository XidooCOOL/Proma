/**
 * 工作流定义类型
 * 
 * 工作流由一系列步骤组成，每个步骤包含：
 * - 动作类型（goto, fill, click, upload 等）
 * - 目标选择器
 * - 数据绑定（从任务数据中取值）
 */

import { Platform, Selector } from '../selectors/types'

export type WorkflowAction = 
  | 'goto'           // 导航到页面
  | 'click'          // 点击元素
  | 'fill'           // 填充输入框
  | 'select'         // 下拉选择
  | 'check'          // 勾选复选框
  | 'uncheck'        // 取消勾选
  | 'upload'         // 上传文件
  | 'hover'          // 悬停
  | 'dblclick'      // 双击
  | 'wait'           // 等待
  | 'waitForSelector' // 等待选择器出现
  | 'waitForHidden'  // 等待元素消失
  | 'screenshot'     // 截图
  | 'evaluate'       // 执行 JS
  | 'switchFrame'    // 切换 iframe
  | 'dialog'         // 处理对话框
  | 'gotoEnd'        // 直接跳到最后一步（用于跳过中间步骤）

export interface DataBinding {
  /** 数据路径，如 'product.title', 'images[0]' */
  path: string
  
  /** 默认值 */
  defaultValue?: any
  
  /** 是否必需 */
  required?: boolean
  
  /** 值转换器 */
  transform?: (value: any) => any
}

export interface WorkflowStep {
  /** 步骤 ID */
  id: string
  
  /** 步骤名称 */
  name: string
  
  /** 动作类型 */
  action: WorkflowAction
  
  /** 目标选择器（某些动作不需要） */
  selector?: {
    /** 选择器引用，如 'productTitleInput' */
    ref: string
    /** 或者直接指定选择器 */
    value?: Selector
  }
  
  /** 数据绑定 */
  data?: DataBinding | string
  
  /** 额外参数 */
  params?: {
    /** 等待超时（毫秒） */
    timeout?: number
    /** 是否强制执行 */
    force?: boolean
    /** 是否等待可见 */
    waitForVisible?: boolean
    /** 是否等待启用 */
    waitForEnabled?: boolean
    /** 等待选择器条件 */
    waitForCondition?: 'visible' | 'hidden' | 'attached' | 'detached' | 'stable'
    /** 延迟（毫秒） */
    delay?: number
    /** 上传多个文件时是否顺序上传 */
    sequential?: boolean
    /** 截图名称 */
    screenshotName?: string
    /** JS 表达式 */
    expression?: string
  }
  
  /** 条件执行 */
  condition?: {
    /** 条件类型 */
    type: 'selector' | 'data'
    /** 条件表达式 */
    expression: string
    /** 为 false 时的行为 */
    ifFalse?: 'skip' | 'fail' | 'goto'
    /** 跳转到哪一步（ifFalse 为 goto 时） */
    gotoStep?: string
  }
  
  /** 失败重试 */
  retry?: {
    /** 最大重试次数 */
    maxRetries: number
    /** 重试延迟（毫秒） */
    delay: number
  }
  
  /** 步骤描述 */
  description?: string
}

export interface WorkflowDefinition {
  /** 工作流 ID */
  id: string
  
  /** 工作流名称 */
  name: string
  
  /** 所属平台 */
  platform: Platform
  
  /** 版本 */
  version: string
  
  /** 描述 */
  description?: string
  
  /** 依赖的其他工作流 */
  extends?: string[]
  
  /** 输入数据类型 */
  inputSchema?: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      required?: boolean
    }>
  }
  
  /** 步骤列表 */
  steps: WorkflowStep[]
  
  /** 完成后操作 */
  onComplete?: {
    /** 截图 */
    screenshot?: boolean
    /** 关闭页面 */
    closePage?: boolean
  }
  
  /** 元数据 */
  metadata?: {
    author?: string
    createdAt?: string
    updatedAt?: string
    tags?: string[]
  }
}

export interface WorkflowExecution {
  /** 执行 ID */
  id: string
  
  /** 工作流定义 */
  workflow: WorkflowDefinition
  
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  
  /** 当前步骤索引 */
  currentStepIndex: number
  
  /** 当前步骤 */
  currentStep?: WorkflowStep
  
  /** 执行上下文 */
  context: {
    /** 传入的数据 */
    inputData: any
    /** 步骤执行结果 */
    stepResults: Record<string, any>
    /** 页面实例 */
    page?: any
    /** 截图记录 */
    screenshots: string[]
  }
  
  /** 错误信息 */
  error?: {
    step?: string
    message: string
    stack?: string
  }
  
  /** 时间戳 */
  startedAt?: Date
  completedAt?: Date
}

export interface WorkflowEngine {
  /** 执行工作流 */
  execute(workflow: WorkflowDefinition, inputData: any): Promise<WorkflowExecution>
  
  /** 暂停执行 */
  pause(): Promise<void>
  
  /** 恢复执行 */
  resume(): Promise<void>
  
  /** 取消执行 */
  cancel(): Promise<void>
  
  /** 获取执行状态 */
  getStatus(): WorkflowExecution
}
