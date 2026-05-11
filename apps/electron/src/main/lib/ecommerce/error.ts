export class EcommerceLogger {
  private prefix: string

  constructor(prefix: string = 'Ecommerce') {
    this.prefix = prefix
  }

  debug(scope: string, message: string, data?: any) {
    console.debug(`[${this.prefix}:${scope}]`, message, data)
  }

  info(scope: string, message: string, data?: any) {
    console.info(`[${this.prefix}:${scope}]`, message, data)
  }

  warn(scope: string, message: string, data?: any) {
    console.warn(`[${this.prefix}:${scope}]`, message, data)
  }

  error(scope: string, message: string, data?: any) {
    console.error(`[${this.prefix}:${scope}]`, message, data)
  }
}

export const ecommerceLogger = new EcommerceLogger()
