import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export const ECOMMERCE_DIR = path.join(app.getPath('userData'), 'ecommerce')

export const PATHS = {
  root: ECOMMERCE_DIR,
  profiles: path.join(ECOMMERCE_DIR, 'profiles'),
  profilesIndex: path.join(ECOMMERCE_DIR, 'profiles.json'),
  selectors: path.join(ECOMMERCE_DIR, 'selectors'),
  records: path.join(ECOMMERCE_DIR, 'records'),
  logs: path.join(ECOMMERCE_DIR, 'logs'),
  tasks: path.join(ECOMMERCE_DIR, 'logs', 'tasks'),
  config: path.join(ECOMMERCE_DIR, 'config.json'),
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    }
  } catch {
    // ignore
  }
  return defaultValue
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return []
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as T)
}

export function appendJsonl(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, JSON.stringify(data) + '\n', 'utf-8')
}

export function writeJsonl(filePath: string, data: unknown[]): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, data.map(d => JSON.stringify(d)).join('\n') + '\n', 'utf-8')
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

export function deleteFile(filePath: string): boolean {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    return true
  }
  return false
}

export function deleteDir(dirPath: string): boolean {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
    return true
  }
  return false
}

export function getFileModifiedTime(filePath: string): Date | null {
  if (!fs.existsSync(filePath)) return null
  return new Date(fs.statSync(filePath).mtime)
}

export function listDirs(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return []
  return fs.readdirSync(dirPath).filter(f => {
    return fs.statSync(path.join(dirPath, f)).isDirectory()
  })
}

export function listFiles(dirPath: string, ext?: string): string[] {
  if (!fs.existsSync(dirPath)) return []
  return fs.readdirSync(dirPath).filter(f => {
    if (ext) return f.endsWith(ext)
    return fs.statSync(path.join(dirPath, f)).isFile()
  })
}

export function resolveImagePath(imagePath: string): string | null {
  try {
    const resolved = path.resolve(imagePath)
    if (fs.existsSync(resolved)) return resolved
  } catch {
    // ignore
  }
  return null
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString()
}

export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp)
}

export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('zh-CN')
}

export function formatDateTime(date: Date = new Date()): string {
  return date.toLocaleString('zh-CN')
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function getMonthFilePath(year: number, month: number): string {
  return path.join(PATHS.records, String(year), `${String(month).padStart(2, '0')}.jsonl`)
}

export function getDayFilePath(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]
  return path.join(PATHS.tasks, `${dateStr}.jsonl`)
}

export function getPlatformSelectorsPath(platform: string): string {
  return path.join(PATHS.selectors, `${platform}.json`)
}

export function getProfilePath(profileId: string): string {
  return path.join(PATHS.profiles, profileId)
}

export function getProfileCookiesPath(profileId: string): string {
  return path.join(getProfilePath(profileId), 'cookies.json')
}

export function getProfileConfigPath(profileId: string): string {
  return path.join(getProfilePath(profileId), 'config.json')
}
