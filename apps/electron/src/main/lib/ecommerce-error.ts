import { createEcommerceError, type EcommerceError } from './ecommerce-types'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (process.env.NODE_ENV === 'production' ? 'info' : 'debug') as LogLevel

function formatMessage(level: LogLevel, module: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`
  if (data !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(data)}`
  }
  return `${prefix} ${message}`
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export const ecommerceLogger = {
  debug(module: string, message: string, data?: unknown): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', module, message, data))
    }
  },

  info(module: string, message: string, data?: unknown): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', module, message, data))
    }
  },

  warn(module: string, message: string, data?: unknown): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', module, message, data))
    }
  },

  error(module: string, message: string, error?: unknown): void {
    if (shouldLog('error')) {
      const errorData = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error
      console.error(formatMessage('error', module, message, errorData))
    }
  },
}

export class EcommerceErrorHandler {
  private static instance: EcommerceErrorHandler

  static getInstance(): EcommerceErrorHandler {
    if (!EcommerceErrorHandler.instance) {
      EcommerceErrorHandler.instance = new EcommerceErrorHandler()
    }
    return EcommerceErrorHandler.instance
  }

  handleError(error: unknown, context: string): EcommerceError {
    if (isEcommerceError(error)) {
      ecommerceLogger.error('ErrorHandler', `Handled error in ${context}`, error)
      return error
    }

    if (error instanceof Error) {
      const mapped = this.mapError(error, context)
      ecommerceLogger.error('ErrorHandler', `Mapped error in ${context}`, { original: error.message })
      return mapped
    }

    const unknown = createEcommerceError('UNKNOWN_ERROR', `未知错误: ${String(error)}`, { context })
    ecommerceLogger.error('ErrorHandler', `Unknown error in ${context}`, error)
    return unknown
  }

  private mapError(error: Error, context: string): EcommerceError {
    const message = error.message.toLowerCase()

    if (message.includes('profile') || message.includes('店铺')) {
      return createEcommerceError('PROFILE_NOT_FOUND', `店铺未找到: ${context}`, { original: error.message })
    }

    if (message.includes('login') || message.includes('登录')) {
      return createEcommerceError('PROFILE_NOT_LOGGED_IN', `请先登录店铺: ${context}`, { original: error.message })
    }

    if (message.includes('selector')) {
      return createEcommerceError('SELECTOR_NOT_CONFIGURED', `选择器未配置: ${context}`, { original: error.message })
    }

    if (message.includes('browser') || message.includes('chromium')) {
      return createEcommerceError('BROWSER_LAUNCH_FAILED', `浏览器启动失败: ${context}`, { original: error.message })
    }

    if (message.includes('timeout') || message.includes('load')) {
      return createEcommerceError('PAGE_LOAD_FAILED', `页面加载失败: ${context}`, { original: error.message })
    }

    if (message.includes('cancelled') || message.includes('取消')) {
      return createEcommerceError('TASK_CANCELLED', `任务已取消: ${context}`)
    }

    return createEcommerceError('UNKNOWN_ERROR', error.message, { context })
  }

  wrapAsync<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    return fn().catch((error) => {
      throw this.handleError(error, context)
    })
  }

  wrapSync<T>(
    fn: () => T,
    context: string
  ): T {
    try {
      return fn()
    } catch (error) {
      throw this.handleError(error, context)
    }
  }
}

export function getErrorHandler(): EcommerceErrorHandler {
  return EcommerceErrorHandler.getInstance()
}

export function withErrorContext(
  context: string,
  fn: () => Promise<void>
): Promise<void> {
  return fn().catch((error) => {
    const handler = getErrorHandler()
    throw handler.handleError(error, context)
  })
}
