import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import {
  type StoreProfile,
  type ListingRecord,
  type TaskLog,
  type TaskItems,
  type ListingTask,
  type ListingResult,
  type TaskProgress,
  type Platform,
  type ExtractMode,
  type SelectorCategory,
  type SelectorDefinition,
  type SelectorConfig as PlatformSelectorConfig,
  type PlatformSelectors,
  type EcommerceError,
  ERROR_CODES,
  createEcommerceError,
  isEcommerceError,
} from './ecommerce-types'

const ECOMMERCE_DIR = path.join(app.getPath('userData'), 'ecommerce')

const PATHS = {
  profiles: path.join(ECOMMERCE_DIR, 'profiles'),
  profilesIndex: path.join(ECOMMERCE_DIR, 'profiles.json'),
  selectors: path.join(ECOMMERCE_DIR, 'selectors'),
  records: path.join(ECOMMERCE_DIR, 'records'),
  logs: path.join(ECOMMERCE_DIR, 'logs'),
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch { }
  return defaultValue
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export class StoreProfileService {
  private profiles: StoreProfile[] = []
  constructor() { this.load() }
  private load(): void { this.profiles = readJson(PATHS.profilesIndex, []) }
  private save(): void { writeJson(PATHS.profilesIndex, this.profiles) }
  getAll(): StoreProfile[] { return this.profiles }
  getById(id: string): StoreProfile | undefined { return this.profiles.find(p => p.id === id) }
  getByPlatform(platform: string): StoreProfile[] { return this.profiles.filter(p => p.platform === platform) }
  create(data: Omit<StoreProfile, 'id' | 'createdAt' | 'lastUsedAt' | 'stats'>): StoreProfile {
    const profile: StoreProfile = { ...data, id: randomUUID(), createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), stats: { totalProducts: 0, totalOrders: 0 } }
    this.profiles.push(profile)
    this.save()
    ensureDir(path.join(PATHS.profiles, profile.id))
    return profile
  }
  update(id: string, updates: Partial<StoreProfile>): StoreProfile | undefined {
    const idx = this.profiles.findIndex(p => p.id === id)
    if (idx === -1) return undefined
    this.profiles[idx] = { ...this.profiles[idx], ...updates }
    this.save()
    return this.profiles[idx]
  }
  updateStats(id: string, stats: Partial<StoreProfile['stats']>): void {
    const profile = this.getById(id)
    if (profile) this.update(id, { stats: { ...profile.stats, ...stats } })
  }
  delete(id: string): boolean {
    const idx = this.profiles.findIndex(p => p.id === id)
    if (idx === -1) return false
    this.profiles.splice(idx, 1)
    this.save()
    const dir = path.join(PATHS.profiles, id)
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    return true
  }
}

export class SelectorConfigService {
  getPlatforms(): string[] {
    ensureDir(PATHS.selectors)
    return fs.readdirSync(PATHS.selectors).filter(f => fs.statSync(path.join(PATHS.selectors, f)).isDirectory())
  }
  getPages(platform: string): string[] {
    const dir = path.join(PATHS.selectors, platform)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  }
  get(platform: string, page: string): SelectorConfig | undefined {
    const filePath = path.join(PATHS.selectors, platform, `${page}.json`)
    return readJson<SelectorConfig | undefined>(filePath, undefined)
  }
  getAll(platform: string): SelectorConfig[] {
    return this.getPages(platform).map(page => this.get(platform, page)!).filter(Boolean)
  }
  save(config: SelectorConfig): void {
    const dir = path.join(PATHS.selectors, config.platform)
    ensureDir(dir)
    const filePath = path.join(dir, `${config.page}.json`)
    const existing = this.get(config.platform, config.page)
    writeJson(filePath, { ...config, version: existing ? existing.version + 1 : 1, updatedAt: new Date().toISOString() })
  }
  delete(platform: string, page: string): boolean {
    const filePath = path.join(PATHS.selectors, platform, `${page}.json`)
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); return true }
    return false
  }
}

export class ListingRecordService {
  private getMonthFile(year: number, month: number): string {
    return path.join(PATHS.records, String(year), `${String(month).padStart(2, '0')}.jsonl`)
  }
  private loadMonth(year: number, month: number): ListingRecord[] {
    const filePath = this.getMonthFile(year, month)
    if (!fs.existsSync(filePath)) return []
    return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean).map(line => JSON.parse(line))
  }
  private saveRecord(record: ListingRecord): void {
    const date = new Date(record.uploadedAt)
    const filePath = this.getMonthFile(date.getFullYear(), date.getMonth() + 1)
    ensureDir(path.dirname(filePath))
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8')
  }
  add(record: Omit<ListingRecord, 'id'>): ListingRecord {
    const newRecord: ListingRecord = { ...record, id: randomUUID() }
    this.saveRecord(newRecord)
    return newRecord
  }
  update(id: string, updates: Partial<ListingRecord>): ListingRecord | undefined {
    const now = new Date()
    const records = this.loadMonth(now.getFullYear(), now.getMonth() + 1)
    const idx = records.findIndex(r => r.id === id)
    if (idx === -1) return undefined
    records[idx] = { ...records[idx], ...updates }
    const filePath = this.getMonthFile(now.getFullYear(), now.getMonth() + 1)
    fs.writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8')
    return records[idx]
  }
  getByProfile(profileId: string, year?: number, month?: number): ListingRecord[] {
    if (year && month) return this.loadMonth(year, month).filter(r => r.profileId === profileId)
    const now = new Date()
    const results: ListingRecord[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      results.push(...this.loadMonth(d.getFullYear(), d.getMonth() + 1).filter(r => r.profileId === profileId))
    }
    return results
  }
  getRecent(limit = 50): ListingRecord[] {
    const results: ListingRecord[] = []
    const now = new Date()
    for (let i = 0; i < 3 && results.length < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      results.push(...this.loadMonth(d.getFullYear(), d.getMonth() + 1).slice(-limit))
    }
    return results.slice(0, limit)
  }
}

export class TaskLogService {
  private getDayFile(date: Date): string {
    return path.join(PATHS.logs, 'tasks', `${date.toISOString().split('T')[0]}.jsonl`)
  }
  add(log: Omit<TaskLog, 'id'>): TaskLog {
    const newLog: TaskLog = { ...log, id: randomUUID() }
    const filePath = this.getDayFile(new Date())
    ensureDir(path.dirname(filePath))
    fs.appendFileSync(filePath, JSON.stringify(newLog) + '\n', 'utf-8')
    return newLog
  }
  update(id: string, updates: Partial<TaskLog>): TaskLog | undefined {
    const filePath = this.getDayFile(new Date())
    if (!fs.existsSync(filePath)) return undefined
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
    const logs = lines.map(line => JSON.parse(line) as TaskLog)
    const idx = logs.findIndex(l => l.id === id)
    if (idx === -1) return undefined
    logs[idx] = { ...logs[idx], ...updates }
    fs.writeFileSync(filePath, logs.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf-8')
    return logs[idx]
  }
  getRunning(): TaskLog[] {
    const filePath = this.getDayFile(new Date())
    if (!fs.existsSync(filePath)) return []
    return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean).map(line => JSON.parse(line) as TaskLog).filter(l => l.status === 'running')
  }
  getRecent(limit = 100): TaskLog[] {
    const results: TaskLog[] = []
    const now = new Date()
    for (let i = 0; i < 7 && results.length < limit; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const fp = this.getDayFile(d)
      if (fs.existsSync(fp)) results.push(...fs.readFileSync(fp, 'utf-8').split('\n').filter(Boolean).map(line => JSON.parse(line) as TaskLog))
    }
    return results.slice(-limit)
  }
  getByProfile(profileId: string, limit = 50): TaskLog[] {
    return this.getRecent(500).filter(l => l.profileId === profileId).slice(0, limit)
  }
}

let profilesService: StoreProfileService
let selectorsService: SelectorConfigService
let recordsService: ListingRecordService
let logsService: TaskLogService

export function initEcommerceDataService(): void {
  ensureDir(PATHS.profiles)
  ensureDir(path.join(PATHS.selectors))
  ensureDir(PATHS.records)
  ensureDir(path.join(PATHS.logs, 'tasks'))
  profilesService = new StoreProfileService()
  selectorsService = new SelectorConfigService()
  recordsService = new ListingRecordService()
  logsService = new TaskLogService()
}

export function getStoreProfileService(): StoreProfileService { return profilesService }
export function getSelectorConfigService(): SelectorConfigService { return selectorsService }
export function getListingRecordService(): ListingRecordService { return recordsService }
export function getTaskLogService(): TaskLogService { return logsService }

import {
  PREDEFINED_SELECTORS,
  CATEGORIES,
  PLATFORM_LIST,
  DEFAULT_TEST_URLS,
  getSelectorById,
  getSelectorsByCategory,
  getCategoryLabel,
  createEmptyPlatformSelectors,
  type SelectorDefinition,
  type SelectorConfig as PlatformSelectorConfig,
  type PlatformSelectors,
  type ExtractMode,
  EXTRACT_MODE,
} from './ecommerce-elements'

export {
  PREDEFINED_SELECTORS,
  CATEGORIES,
  PLATFORM_LIST,
  DEFAULT_TEST_URLS,
  getSelectorById,
  getSelectorsByCategory,
  getCategoryLabel,
  createEmptyPlatformSelectors,
  EXTRACT_MODE,
}

import { ipcMain, dialog, shell } from 'electron'

function getSelectorsFilePath(platform: string): string {
  return path.join(app.getPath('userData'), 'ecommerce', 'selectors', `${platform}.json`)
}

function loadPlatformSelectors(platform: string): PlatformSelectors {
  const filePath = getSelectorsFilePath(platform)
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  return createEmptyPlatformSelectors(platform)
}

function savePlatformSelectors(platform: string, data: PlatformSelectors): void {
  const dir = path.join(app.getPath('userData'), 'ecommerce', 'selectors')
  ensureDir(dir)
  const filePath = path.join(dir, `${platform}.json`)
  data.updatedAt = new Date().toISOString()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function getDefaultProductListUrl(platform: string): string {
  return DEFAULT_TEST_URLS[platform] || 'https://www.baidu.com'
}

export function registerEcommerceHandlers(): void {
  initEcommerceDataService()

  ipcMain.handle('ecommerce:get-predefined-selectors', async () => {
    const grouped: Record<string, any[]> = {}
    for (const s of PREDEFINED_SELECTORS) {
      if (!grouped[s.category]) grouped[s.category] = []
      grouped[s.category].push({ ...s, categoryLabel: getCategoryLabel(s.category) })
    }
    return { selectors: PREDEFINED_SELECTORS, grouped, categories: CATEGORIES }
  })

  ipcMain.handle('ecommerce:get-selector-definition', async (_, id: string) => {
    return getSelectorById(id)
  })

  ipcMain.handle('ecommerce:get-platform-list', async () => {
    return PLATFORM_LIST
  })

  ipcMain.handle('ecommerce:get-platform-selectors', async (_, platform: string) => {
    return loadPlatformSelectors(platform)
  })

  ipcMain.handle('ecommerce:save-platform-selectors', async (_, platform: string, data: PlatformSelectors) => {
    savePlatformSelectors(platform, data)
    return { success: true }
  })

  ipcMain.handle('ecommerce:update-selector-config', async (_, platform: string, selectorId: string, config: Partial<PlatformSelectorConfig>) => {
    const data = loadPlatformSelectors(platform)
    const definition = getSelectorById(selectorId)
    if (!data.selectors[selectorId]) {
      data.selectors[selectorId] = {
        id: selectorId,
        selector: '',
        extractMode: definition?.extractMode || 'text',
        enabled: false,
      }
    }
    if (config.selector !== undefined) data.selectors[selectorId].selector = config.selector
    if (config.enabled !== undefined) data.selectors[selectorId].enabled = config.enabled
    if (config.lastTested !== undefined) data.selectors[selectorId].lastTested = config.lastTested
    savePlatformSelectors(platform, data)
    return data.selectors[selectorId]
  })

  ipcMain.handle('ecommerce:extract-values', async (_, platform: string, profileId: string, selectorIds: string[], pageUrl?: string) => {
    const profile = getStoreProfileService().getById(profileId)
    if (!profile) return { success: false, error: 'Profile 不存在' }

    const { chromium } = require('playwright')
    const browser = await chromium.launch({ headless: true })
    const profilePath = path.join(PATHS.profiles, profileId)
    const cookiesFile = path.join(profilePath, 'cookies.json')

    if (!fs.existsSync(cookiesFile)) {
      await browser.close()
      return { success: false, error: '请先登录店铺' }
    }

    const context = await browser.newContext({ userDataDir: profilePath, viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()

    const targetUrl = pageUrl || getDefaultProductListUrl(platform)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const platformSelectors = loadPlatformSelectors(platform)
    const results: Record<string, any> = {}

    for (const selectorId of selectorIds) {
      const selectorConfig = platformSelectors.selectors[selectorId]
      if (!selectorConfig?.enabled || !selectorConfig.selector) continue

      const definition = getSelectorById(selectorId)
      if (!definition) continue

      try {
        const count = await page.locator(selectorConfig.selector).count()
        if (count > 0) {
          let value: any = null

          switch (selectorConfig.extractMode) {
            case 'element':
              value = { count }
              break
            case 'data-id':
              const attrs = selectorConfig.attributes || definition.attributes || []
              for (const attr of attrs) {
                const attrValue = await page.locator(selectorConfig.selector).first().getAttribute(attr)
                if (attrValue) { value = attrValue; break }
              }
              break
            case 'href':
              value = await page.locator(selectorConfig.selector).first().getAttribute('href')
              break
            case 'src':
              value = await page.locator(selectorConfig.selector).first().getAttribute('src')
              break
            case 'value':
              value = await page.locator(selectorConfig.selector).first().inputValue().catch(() => null)
              break
            case 'innerHTML':
              value = await page.locator(selectorConfig.selector).first().innerHTML().catch(() => null)
              break
            default:
              value = await page.locator(selectorConfig.selector).first().textContent()
          }
          results[selectorId] = { value, selector: selectorConfig.selector, count, found: true }
        } else {
          results[selectorId] = { found: false, value: null }
        }
      } catch {
        results[selectorId] = { found: false, value: null }
      }
    }

    await browser.close()
    return { success: true, results }
  })

  ipcMain.handle('ecommerce:test-selector', async (_, platform: string, profileId: string, selectorId: string, selector: string, pageUrl?: string) => {
    const profile = getStoreProfileService().getById(profileId)
    if (!profile) return { success: false, error: 'Profile 不存在' }

    const profilePath = path.join(PATHS.profiles, profileId)
    const cookiesFile = path.join(profilePath, 'cookies.json')
    if (!fs.existsSync(cookiesFile)) return { success: false, error: '请先登录店铺' }

    const definition = getSelectorById(selectorId)

    const { chromium } = require('playwright')
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ userDataDir: profilePath, viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()

    const targetUrl = pageUrl || getDefaultProductListUrl(platform)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const results: any[] = []

    try {
      const count = await page.locator(selector).count()
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const loc = page.locator(selector).nth(i)
          const text = await loc.textContent().catch(() => '')
          const tagName = await loc.evaluate((el: Element) => el.tagName)
          const attrs: Record<string, string> = {}
          for (const attr of ['class', 'id', 'placeholder', 'data-id', 'data-product-id', 'href', 'src']) {
            const val = await loc.getAttribute(attr)
            if (val) attrs[attr] = val
          }
          results.push({ index: i, tagName, text: text?.trim().slice(0, 100), attributes: attrs })
        }
      }
      await browser.close()
      return { success: true, count, results, definition }
    } catch (error) {
      await browser.close()
      return { success: false, error: error instanceof Error ? error.message : '选择器无效' }
    }
  })

  ipcMain.handle('ecommerce:get-profiles', async () => getStoreProfileService().getAll())
  ipcMain.handle('ecommerce:get-profile', async (_, id: string) => getStoreProfileService().getById(id))
  ipcMain.handle('ecommerce:get-profiles-by-platform', async (_, platform: string) => getStoreProfileService().getByPlatform(platform))

  ipcMain.handle('ecommerce:create-profile', async (_, data: { name: string; platform: string }) => {
    return getStoreProfileService().create(data)
  })

  ipcMain.handle('ecommerce:update-profile', async (_, id: string, updates: Partial<StoreProfile>) => {
    return getStoreProfileService().update(id, updates)
  })

  ipcMain.handle('ecommerce:delete-profile', async (_, id: string) => {
    return getStoreProfileService().delete(id)
  })

  ipcMain.handle('ecommerce:update-profile-stats', async (_, id: string, stats: Partial<StoreProfile['stats']>) => {
    getStoreProfileService().updateStats(id, stats)
    return { success: true }
  })

  ipcMain.handle('ecommerce:add-listing-record', async (_, record: Omit<ListingRecord, 'id'>) => {
    return getListingRecordService().add(record)
  })

  ipcMain.handle('ecommerce:update-listing-record', async (_, id: string, updates: Partial<ListingRecord>) => {
    return getListingRecordService().update(id, updates)
  })

  ipcMain.handle('ecommerce:get-records-by-profile', async (_, profileId: string, year?: number, month?: number) => {
    return getListingRecordService().getByProfile(profileId, year, month)
  })

  ipcMain.handle('ecommerce:get-recent-records', async (_, limit?: number) => {
    return getListingRecordService().getRecent(limit)
  })

  ipcMain.handle('ecommerce:add-task-log', async (_, log: Omit<TaskLog, 'id'>) => {
    return getTaskLogService().add(log)
  })

  ipcMain.handle('ecommerce:update-task-log', async (_, id: string, updates: Partial<TaskLog>) => {
    return getTaskLogService().update(id, updates)
  })

  ipcMain.handle('ecommerce:get-running-tasks', async () => getTaskLogService().getRunning())
  ipcMain.handle('ecommerce:get-recent-task-logs', async (_, limit?: number) => getTaskLogService().getRecent(limit))
  ipcMain.handle('ecommerce:get-task-logs-by-profile', async (_, profileId: string, limit?: number) => getTaskLogService().getByProfile(profileId, limit))

  // ===== 商品上架执行 =====
  ipcMain.handle('ecommerce:execute-listing', async (event, task: {
    profileId: string
    platform: string
    folderPath: string
    folderName: string
    title: string
    price: number
    description?: string
    images: string[]
    skus?: Array<{ code: string; stock: number; color?: string; size?: string }>
  }) => {
    const { getProductListingService, ListingTask } = require('./ecommerce-listing-service')
    const service = getProductListingService()

    const listingTask: ListingTask = {
      id: randomUUID(),
      ...task,
    }

    const result = await service.executeListing(listingTask)

    getListingRecordService().add({
      profileId: task.profileId,
      folderName: task.folderName,
      title: task.title,
      price: task.price,
      images: task.images,
      status: result.success ? 'success' : 'failed',
      uploadedAt: new Date().toISOString(),
      productUrl: result.productUrl,
      productId: result.productId,
      error: result.error,
    })

    return result
  })

  ipcMain.handle('ecommerce:execute-batch-listing', async (event, tasks: Array<{
    profileId: string
    platform: string
    folderPath: string
    folderName: string
    title: string
    price: number
    description?: string
    images: string[]
    skus?: Array<{ code: string; stock: number; color?: string; size?: string }>
  }>) => {
    const { getProductListingService, ListingTask } = require('./ecommerce-listing-service')
    const service = getProductListingService()

    const listingTasks: ListingTask[] = tasks.map(t => ({
      id: randomUUID(),
      ...t,
    }))

    const results = await service.executeBatchListing(listingTasks)

    const resultArray: Array<{ taskId: string; success: boolean; productId?: string; productUrl?: string; error?: string }> = []
    results.forEach((value, key) => {
      resultArray.push({ taskId: key, ...value })
    })

    return { success: true, results: resultArray }
  })

  ipcMain.handle('ecommerce:cancel-task', async (_, taskId: string) => {
    const { getProductListingService } = require('./ecommerce-listing-service')
    const service = getProductListingService()
    service.cancelTask(taskId)
    return { success: true }
  })

  ipcMain.handle('ecommerce:get-active-tasks', async () => {
    const { getProductListingService } = require('./ecommerce-listing-service')
    const service = getProductListingService()
    return []
  })

  console.log('[Ecommerce] IPC handlers registered')
}

export function registerEcommerceIpcHandlers(): void {
  registerEcommerceHandlers()
}
