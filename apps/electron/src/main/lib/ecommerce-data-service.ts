import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { randomUUID } from 'crypto';

const ECOMMERCE_DIR = path.join(app.getPath('userData'), 'ecommerce');

const PATHS = {
  profiles: path.join(ECOMMERCE_DIR, 'profiles'),
  profilesIndex: path.join(ECOMMERCE_DIR, 'profiles.json'),
  selectors: path.join(ECOMMERCE_DIR, 'selectors'),
  records: path.join(ECOMMERCE_DIR, 'records'),
  logs: path.join(ECOMMERCE_DIR, 'logs'),
};

export interface StoreProfile {
  id: string;
  name: string;
  platform: string;
  createdAt: string;
  lastUsedAt: string;
  stats: {
    totalProducts: number;
    totalOrders: number;
    lastUploadAt?: string;
  };
}

export interface SelectorConfig {
  platform: string;
  page: string;
  version: number;
  elements: Record<string, string>;
  updatedAt: string;
}

export interface ListingRecord {
  id: string;
  profileId: string;
  folderName: string;
  title: string;
  price: number;
  images: string[];
  status: 'pending' | 'uploading' | 'success' | 'failed';
  uploadedAt: string;
  productUrl?: string;
  error?: string;
}

export interface TaskLog {
  id: string;
  type: 'listing' | 'update' | 'scrape';
  profileId?: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  items: {
    total: number;
    success: number;
    failed: number;
  };
  error?: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export class StoreProfileService {
  private profiles: StoreProfile[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    this.profiles = readJson(PATHS.profilesIndex, []);
  }

  private save(): void {
    writeJson(PATHS.profilesIndex, this.profiles);
  }

  getAll(): StoreProfile[] {
    return this.profiles;
  }

  getById(id: string): StoreProfile | undefined {
    return this.profiles.find(p => p.id === id);
  }

  getByPlatform(platform: string): StoreProfile[] {
    return this.profiles.filter(p => p.platform === platform);
  }

  create(data: Omit<StoreProfile, 'id' | 'createdAt' | 'lastUsedAt' | 'stats'>): StoreProfile {
    const profile: StoreProfile = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      stats: { totalProducts: 0, totalOrders: 0 },
    };
    this.profiles.push(profile);
    this.save();
    ensureDir(path.join(PATHS.profiles, profile.id));
    return profile;
  }

  update(id: string, updates: Partial<StoreProfile>): StoreProfile | undefined {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    this.profiles[index] = { ...this.profiles[index], ...updates };
    this.save();
    return this.profiles[index];
  }

  updateLastUsed(id: string): void {
    this.update(id, { lastUsedAt: new Date().toISOString() });
  }

  updateStats(id: string, stats: Partial<StoreProfile['stats']>): void {
    const profile = this.getById(id);
    if (profile) {
      this.update(id, { stats: { ...profile.stats, ...stats } });
    }
  }

  delete(id: string): boolean {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.profiles.splice(index, 1);
    this.save();
    const profileDir = path.join(PATHS.profiles, id);
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
    return true;
  }
}

export class SelectorConfigService {
  getPlatforms(): string[] {
    ensureDir(PATHS.selectors);
    return fs.readdirSync(PATHS.selectors).filter(f => {
      return fs.statSync(path.join(PATHS.selectors, f)).isDirectory();
    });
  }

  getPages(platform: string): string[] {
    const platformDir = path.join(PATHS.selectors, platform);
    if (!fs.existsSync(platformDir)) return [];
    return fs.readdirSync(platformDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  get(platform: string, page: string): SelectorConfig | undefined {
    const filePath = path.join(PATHS.selectors, platform, `${page}.json`);
    return readJson<SelectorConfig | undefined>(filePath, undefined);
  }

  getAll(platform: string): SelectorConfig[] {
    return this.getPages(platform).map(page => this.get(platform, page)!);
  }

  save(config: SelectorConfig): void {
    const platformDir = path.join(PATHS.selectors, config.platform);
    ensureDir(platformDir);
    const filePath = path.join(platformDir, `${config.page}.json`);
    const existing = this.get(config.platform, config.page);
    const newConfig: SelectorConfig = {
      ...config,
      version: existing ? existing.version + 1 : 1,
      updatedAt: new Date().toISOString(),
    };
    writeJson(filePath, newConfig);
  }

  delete(platform: string, page: string): boolean {
    const filePath = path.join(PATHS.selectors, platform, `${page}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

export class ListingRecordService {
  private records: Map<string, ListingRecord[]> = new Map();

  private getMonthFile(year: number, month: number): string {
    return path.join(PATHS.records, String(year), `${String(month).padStart(2, '0')}.jsonl`);
  }

  private loadMonth(year: number, month: number): ListingRecord[] {
    const filePath = this.getMonthFile(year, month);
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    return lines.map(line => JSON.parse(line));
  }

  private saveRecord(record: ListingRecord): void {
    const date = new Date(record.uploadedAt);
    const filePath = this.getMonthFile(date.getFullYear(), date.getMonth() + 1);
    ensureDir(path.dirname(filePath));
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8');
  }

  add(record: Omit<ListingRecord, 'id'>): ListingRecord {
    const newRecord: ListingRecord = { ...record, id: randomUUID() };
    this.saveRecord(newRecord);
    return newRecord;
  }

  update(id: string, updates: Partial<ListingRecord>): ListingRecord | undefined {
    const now = new Date();
    const records = this.loadMonth(now.getFullYear(), now.getMonth() + 1);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    records[index] = { ...records[index], ...updates };
    const filePath = this.getMonthFile(now.getFullYear(), now.getMonth() + 1);
    fs.writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
    return records[index];
  }

  getByProfile(profileId: string, year?: number, month?: number): ListingRecord[] {
    if (year && month) {
      return this.loadMonth(year, month).filter(r => r.profileId === profileId);
    }
    const now = new Date();
    const results: ListingRecord[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      results.push(...this.loadMonth(d.getFullYear(), d.getMonth() + 1)
        .filter(r => r.profileId === profileId));
    }
    return results;
  }

  getRecent(limit = 50): ListingRecord[] {
    const results: ListingRecord[] = [];
    const now = new Date();
    for (let i = 0; i < 3 && results.length < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const records = this.loadMonth(d.getFullYear(), d.getMonth() + 1);
      results.push(...records.slice(-limit));
    }
    return results.slice(0, limit);
  }
}

export class TaskLogService {
  private getDayFile(date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    return path.join(PATHS.logs, 'tasks', `${dateStr}.jsonl`);
  }

  add(log: Omit<TaskLog, 'id'>): TaskLog {
    const newLog: TaskLog = { ...log, id: randomUUID() };
    const filePath = this.getDayFile(new Date());
    ensureDir(path.dirname(filePath));
    fs.appendFileSync(filePath, JSON.stringify(newLog) + '\n', 'utf-8');
    return newLog;
  }

  update(id: string, updates: Partial<TaskLog>): TaskLog | undefined {
    const filePath = this.getDayFile(new Date());
    if (!fs.existsSync(filePath)) return undefined;
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const logs = lines.map(line => JSON.parse(line) as TaskLog);
    const index = logs.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    logs[index] = { ...logs[index], ...updates };
    fs.writeFileSync(filePath, logs.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf-8');
    return logs[index];
  }

  getRunning(): TaskLog[] {
    const filePath = this.getDayFile(new Date());
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
      .map(line => JSON.parse(line) as TaskLog)
      .filter(l => l.status === 'running');
  }

  getRecent(limit = 100): TaskLog[] {
    const results: TaskLog[] = [];
    const now = new Date();
    for (let i = 0; i < 7 && results.length < limit; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const filePath = this.getDayFile(d);
      if (fs.existsSync(filePath)) {
        const logs = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
          .map(line => JSON.parse(line) as TaskLog);
        results.push(...logs);
      }
    }
    return results.slice(-limit);
  }

  getByProfile(profileId: string, limit = 50): TaskLog[] {
    return this.getRecent(500)
      .filter(l => l.profileId === profileId)
      .slice(0, limit);
  }
}

let profilesService: StoreProfileService;
let selectorsService: SelectorConfigService;
let recordsService: ListingRecordService;
let logsService: TaskLogService;

export function initEcommerceDataService(): void {
  ensureDir(PATHS.profiles);
  ensureDir(PATHS.selectors);
  ensureDir(PATHS.records);
  ensureDir(path.join(PATHS.logs, 'tasks'));
  profilesService = new StoreProfileService();
  selectorsService = new SelectorConfigService();
  recordsService = new ListingRecordService();
  logsService = new TaskLogService();
}

export function getStoreProfileService(): StoreProfileService {
  return profilesService;
}

export function getSelectorConfigService(): SelectorConfigService {
  return selectorsService;
}

export function getListingRecordService(): ListingRecordService {
  return recordsService;
}

export function getTaskLogService(): TaskLogService {
  return logsService;
}
