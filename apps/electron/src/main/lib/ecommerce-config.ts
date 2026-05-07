import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import {
  type Platform,
  type StoreProfile,
  type ProfileStats,
  DEFAULT_TEST_URLS,
  DEFAULT_PRODUCT_DETAIL_URLS,
} from './ecommerce-types'
import { ecommerceLogger } from './ecommerce-error'

export interface EcommerceConfig {
  version: string
  updatedAt: string
  settings: EcommerceSettings
  platforms: PlatformConfig
}

export interface EcommerceSettings {
  maxConcurrentTasks: number
  taskTimeout: number
  retryAttempts: number
  retryDelay: number
  headlessBrowser: boolean
  browserViewport: { width: number; height: number }
  autoSaveInterval: number
  maxLogFiles: number
}

export interface PlatformConfig {
  pinduoduo: PlatformSettings
  douyin: PlatformSettings
  taobao: PlatformSettings
  jd: PlatformSettings
  kuaishou: PlatformSettings
}

export interface PlatformSettings {
  enabled: boolean
  testUrl: string
  productDetailUrl: string
  selectors: {
    autoDetect: boolean
    validateOnSave: boolean
  }
  upload: {
    imageTimeout: number
    maxImages: number
    supportedFormats: string[]
  }
}

const DEFAULT_SETTINGS: EcommerceSettings = {
  maxConcurrentTasks: 3,
  taskTimeout: 300000,
  retryAttempts: 3,
  retryDelay: 5000,
  headlessBrowser: true,
  browserViewport: { width: 1280, height: 720 },
  autoSaveInterval: 60000,
  maxLogFiles: 30,
}

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  pinduoduo: {
    enabled: true,
    testUrl: DEFAULT_TEST_URLS.pinduoduo,
    productDetailUrl: DEFAULT_PRODUCT_DETAIL_URLS.pinduoduo,
    selectors: { autoDetect: false, validateOnSave: true },
    upload: { imageTimeout: 30000, maxImages: 20, supportedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
  },
  douyin: {
    enabled: true,
    testUrl: DEFAULT_TEST_URLS.douyin,
    productDetailUrl: DEFAULT_PRODUCT_DETAIL_URLS.douyin,
    selectors: { autoDetect: false, validateOnSave: true },
    upload: { imageTimeout: 30000, maxImages: 20, supportedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
  },
  taobao: {
    enabled: true,
    testUrl: DEFAULT_TEST_URLS.taobao,
    productDetailUrl: DEFAULT_PRODUCT_DETAIL_URLS.taobao,
    selectors: { autoDetect: false, validateOnSave: true },
    upload: { imageTimeout: 30000, maxImages: 20, supportedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
  },
  jd: {
    enabled: true,
    testUrl: DEFAULT_TEST_URLS.jd,
    productDetailUrl: DEFAULT_PRODUCT_DETAIL_URLS.jd,
    selectors: { autoDetect: false, validateOnSave: true },
    upload: { imageTimeout: 30000, maxImages: 20, supportedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
  },
  kuaishou: {
    enabled: true,
    testUrl: DEFAULT_TEST_URLS.kuaishou,
    productDetailUrl: DEFAULT_PRODUCT_DETAIL_URLS.kuaishou,
    selectors: { autoDetect: false, validateOnSave: true },
    upload: { imageTimeout: 30000, maxImages: 20, supportedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
  },
}

export class EcommerceConfigManager {
  private static instance: EcommerceConfigManager
  private config: EcommerceConfig | null = null
  private configPath: string

  private constructor() {
    this.configPath = path.join(app.getPath('userData'), 'ecommerce', 'config.json')
  }

  static getInstance(): EcommerceConfigManager {
    if (!EcommerceConfigManager.instance) {
      EcommerceConfigManager.instance = new EcommerceConfigManager()
    }
    return EcommerceConfigManager.instance
  }

  load(): EcommerceConfig {
    if (this.config) return this.config

    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        this.config = JSON.parse(data)
        ecommerceLogger.info('ConfigManager', '配置已加载', { path: this.configPath })
      } else {
        this.config = this.createDefaultConfig()
        this.save()
        ecommerceLogger.info('ConfigManager', '使用默认配置', { path: this.configPath })
      }
    } catch (error) {
      ecommerceLogger.error('ConfigManager', '配置加载失败，使用默认配置', error)
      this.config = this.createDefaultConfig()
    }

    return this.config
  }

  save(): void {
    if (!this.config) return

    try {
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      this.config.updatedAt = new Date().toISOString()
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
      ecommerceLogger.debug('ConfigManager', '配置已保存')
    } catch (error) {
      ecommerceLogger.error('ConfigManager', '配置保存失败', error)
    }
  }

  get(): EcommerceConfig {
    return this.load()
  }

  getSettings(): EcommerceSettings {
    return this.load().settings
  }

  getPlatformSettings(platform: Platform): PlatformSettings {
    return this.load().platforms[platform]
  }

  updateSettings(updates: Partial<EcommerceSettings>): void {
    const config = this.load()
    config.settings = { ...config.settings, ...updates }
    this.save()
  }

  updatePlatformSettings(platform: Platform, updates: Partial<PlatformSettings>): void {
    const config = this.load()
    config.platforms[platform] = { ...config.platforms[platform], ...updates }
    this.save()
  }

  reset(): void {
    this.config = this.createDefaultConfig()
    this.save()
    ecommerceLogger.info('ConfigManager', '配置已重置')
  }

  private createDefaultConfig(): EcommerceConfig {
    return {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS },
      platforms: JSON.parse(JSON.stringify(DEFAULT_PLATFORM_CONFIG)),
    }
  }
}

export function getConfigManager(): EcommerceConfigManager {
  return EcommerceConfigManager.getInstance()
}

export function getEcommerceSettings(): EcommerceSettings {
  return getConfigManager().getSettings()
}

export function getPlatformSettings(platform: Platform): PlatformSettings {
  return getConfigManager().getPlatformSettings(platform)
}
