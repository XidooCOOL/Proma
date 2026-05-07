import { randomUUID } from 'crypto'
import {
  type StoreProfile,
  type ListingRecord,
  type TaskLog,
  type ProfileStats,
  type Platform,
} from './types'
import {
  PATHS,
  readJson,
  writeJson,
  readJsonl,
  appendJsonl,
  writeJsonl,
  ensureDir,
  deleteDir,
  getProfilePath,
  getProfileCookiesPath,
  getMonthFilePath,
  getDayFilePath,
} from './utils'
import { ecommerceLogger } from './error'

export class StoreProfileService {
  private profiles: StoreProfile[] = []

  constructor() {
    this.load()
  }

  private load(): void {
    this.profiles = readJson(PATHS.profilesIndex, [])
    ecommerceLogger.debug('StoreProfileService', `已加载 ${this.profiles.length} 个店铺`)
  }

  private save(): void {
    writeJson(PATHS.profilesIndex, this.profiles)
  }

  getAll(): StoreProfile[] {
    return this.profiles
  }

  getById(id: string): StoreProfile | undefined {
    return this.profiles.find(p => p.id === id)
  }

  getByPlatform(platform: Platform): StoreProfile[] {
    return this.profiles.filter(p => p.platform === platform)
  }

  create(data: { name: string; platform: Platform }): StoreProfile {
    const profile: StoreProfile = {
      id: randomUUID(),
      name: data.name,
      platform: data.platform,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      stats: { totalProducts: 0, totalOrders: 0 },
    }
    this.profiles.push(profile)
    this.save()
    ensureDir(getProfilePath(profile.id))
    ecommerceLogger.info('StoreProfileService', `创建店铺: ${profile.name}`, { id: profile.id, platform: profile.platform })
    return profile
  }

  update(id: string, updates: Partial<StoreProfile>): StoreProfile | undefined {
    const idx = this.profiles.findIndex(p => p.id === id)
    if (idx === -1) return undefined
    this.profiles[idx] = { ...this.profiles[idx], ...updates }
    this.save()
    return this.profiles[idx]
  }

  updateLastUsed(id: string): void {
    this.update(id, { lastUsedAt: new Date().toISOString() })
  }

  updateStats(id: string, stats: Partial<ProfileStats>): void {
    const profile = this.getById(id)
    if (profile) {
      this.update(id, { stats: { ...profile.stats, ...stats } })
    }
  }

  delete(id: string): boolean {
    const idx = this.profiles.findIndex(p => p.id === id)
    if (idx === -1) return false
    this.profiles.splice(idx, 1)
    this.save()
    deleteDir(getProfilePath(id))
    ecommerceLogger.info('StoreProfileService', `删除店铺: ${id}`)
    return true
  }

  isLoggedIn(id: string): boolean {
    return readJson(getProfileCookiesPath(id), null) !== null
  }
}

export class ListingRecordService {
  private cache: Map<string, ListingRecord[]> = new Map()

  add(record: Omit<ListingRecord, 'id'>): ListingRecord {
    const newRecord: ListingRecord = {
      ...record,
      id: randomUUID(),
    }
    const monthPath = getMonthFilePath(
      new Date(record.uploadedAt).getFullYear(),
      new Date(record.uploadedAt).getMonth() + 1
    )
    appendJsonl(monthPath, newRecord)
    this.cache.clear()
    ecommerceLogger.info('ListingRecordService', `添加记录: ${newRecord.title}`, { id: newRecord.id })
    return newRecord
  }

  update(id: string, updates: Partial<ListingRecord>): ListingRecord | undefined {
    const now = new Date()
    const monthPath = getMonthFilePath(now.getFullYear(), now.getMonth() + 1)
    const records = readJsonl<ListingRecord>(monthPath)
    const idx = records.findIndex(r => r.id === id)
    if (idx === -1) return undefined
    records[idx] = { ...records[idx], ...updates }
    writeJsonl(monthPath, records)
    this.cache.clear()
    return records[idx]
  }

  getByProfile(profileId: string, year?: number, month?: number): ListingRecord[] {
    if (year && month) {
      return readJsonl<ListingRecord>(getMonthFilePath(year, month))
        .filter(r => r.profileId === profileId)
    }
    const records: ListingRecord[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      records.push(...readJsonl<ListingRecord>(getMonthFilePath(d.getFullYear(), d.getMonth() + 1))
        .filter(r => r.profileId === profileId))
    }
    return records
  }

  getRecent(limit = 50): ListingRecord[] {
    const records: ListingRecord[] = []
    const now = new Date()
    for (let i = 0; i < 3 && records.length < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      records.push(...readJsonl<ListingRecord>(getMonthFilePath(d.getFullYear(), d.getMonth() + 1)))
    }
    return records.slice(-limit)
  }

  getById(id: string): ListingRecord | undefined {
    const records = this.getRecent(1000)
    return records.find(r => r.id === id)
  }

  getStats(profileId?: string): { total: number; success: number; failed: number } {
    const records = profileId ? this.getByProfile(profileId) : this.getRecent(10000)
    return {
      total: records.length,
      success: records.filter(r => r.status === 'success').length,
      failed: records.filter(r => r.status === 'failed').length,
    }
  }
}

export class TaskLogService {
  add(log: Omit<TaskLog, 'id'>): TaskLog {
    const newLog: TaskLog = { ...log, id: randomUUID() }
    appendJsonl(getDayFilePath(new Date()), newLog)
    ecommerceLogger.info('TaskLogService', `添加任务日志: ${newLog.type}`, { id: newLog.id })
    return newLog
  }

  update(id: string, updates: Partial<TaskLog>): TaskLog | undefined {
    const dayPath = getDayFilePath(new Date())
    const logs = readJsonl<TaskLog>(dayPath)
    const idx = logs.findIndex(l => l.id === id)
    if (idx === -1) return undefined
    logs[idx] = { ...logs[idx], ...updates }
    writeJsonl(dayPath, logs)
    return logs[idx]
  }

  getRunning(): TaskLog[] {
    const dayPath = getDayFilePath(new Date())
    return readJsonl<TaskLog>(dayPath).filter(l => l.status === 'running')
  }

  getRecent(limit = 100): TaskLog[] {
    const logs: TaskLog[] = []
    const now = new Date()
    for (let i = 0; i < 7 && logs.length < limit; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      logs.push(...readJsonl<TaskLog>(getDayFilePath(d)))
    }
    return logs.slice(-limit)
  }

  getByProfile(profileId: string, limit = 50): TaskLog[] {
    return this.getRecent(500).filter(l => l.profileId === profileId).slice(0, limit)
  }

  getById(id: string): TaskLog | undefined {
    const logs = this.getRecent(1000)
    return logs.find(l => l.id === id)
  }
}

let profilesService: StoreProfileService
let recordsService: ListingRecordService
let logsService: TaskLogService

export function initDataServices(): void {
  ensureDir(PATHS.profiles)
  ensureDir(PATHS.selectors)
  ensureDir(PATHS.records)
  ensureDir(PATHS.tasks)
  profilesService = new StoreProfileService()
  recordsService = new ListingRecordService()
  logsService = new TaskLogService()
  ecommerceLogger.info('DataServices', '数据服务初始化完成')
}

export function getStoreProfileService(): StoreProfileService {
  return profilesService
}

export function getListingRecordService(): ListingRecordService {
  return recordsService
}

export function getTaskLogService(): TaskLogService {
  return logsService
}
