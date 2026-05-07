import { describe, it, expect } from 'bun:test'
import {
  PATHS,
  ensureDir,
  readJson,
  writeJson,
  formatDate,
  formatDateTime,
  getCurrentYearMonth,
  fileExists,
} from './utils'

describe('Ecommerce Utils', () => {
  describe('PATHS', () => {
    it('should have all required path properties', () => {
      expect(PATHS).toHaveProperty('root')
      expect(PATHS).toHaveProperty('profiles')
      expect(PATHS).toHaveProperty('selectors')
      expect(PATHS).toHaveProperty('records')
      expect(PATHS).toHaveProperty('logs')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/)
    })

    it('should use current date by default', () => {
      const formatted = formatDate()
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/)
    })
  })

  describe('formatDateTime', () => {
    it('should format datetime correctly', () => {
      const date = new Date('2024-01-15T10:30:00')
      const formatted = formatDateTime(date)
      expect(formatted).toContain('2024')
    })
  })

  describe('getCurrentYearMonth', () => {
    it('should return current year and month', () => {
      const { year, month } = getCurrentYearMonth()
      expect(year).toBeGreaterThanOrEqual(2024)
      expect(month).toBeGreaterThanOrEqual(1)
      expect(month).toBeLessThanOrEqual(12)
    })
  })

  describe('readJson / writeJson', () => {
    const testPath = '/tmp/ecommerce-test.json'

    it('should write and read JSON correctly', () => {
      const testData = { name: 'test', value: 123 }
      writeJson(testPath, testData)
      const readData = readJson(testPath, null)
      expect(readData).toEqual(testData)
    })

    it('should return default value for non-existent file', () => {
      const defaultVal = { fallback: true }
      const readData = readJson('/tmp/non-existent-file.json', defaultVal)
      expect(readData).toEqual(defaultVal)
    })
  })

  describe('fileExists', () => {
    it('should return false for non-existent file', () => {
      expect(fileExists('/tmp/non-existent-file-xyz.json')).toBe(false)
    })

    it('should return true for existing file', () => {
      const testPath = '/tmp/ecommerce-exists-test.json'
      writeJson(testPath, { test: true })
      expect(fileExists(testPath)).toBe(true)
    })
  })
})
