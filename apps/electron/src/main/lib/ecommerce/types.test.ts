import { describe, it, expect } from 'bun:test'
import {
  ERROR_CODES,
  createEcommerceError,
  isEcommerceError,
  STATUS_LABELS,
  EXTRACT_MODE_LABELS,
  PLATFORM_CONFIG,
  CATEGORY_CONFIG,
} from './types'

describe('Ecommerce Types', () => {
  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES).toHaveProperty('PROFILE_NOT_FOUND')
      expect(ERROR_CODES).toHaveProperty('PROFILE_NOT_LOGGED_IN')
      expect(ERROR_CODES).toHaveProperty('SELECTOR_NOT_CONFIGURED')
      expect(ERROR_CODES).toHaveProperty('BROWSER_LAUNCH_FAILED')
      expect(ERROR_CODES).toHaveProperty('PAGE_LOAD_FAILED')
      expect(ERROR_CODES).toHaveProperty('TASK_CANCELLED')
      expect(ERROR_CODES).toHaveProperty('UNKNOWN_ERROR')
    })
  })

  describe('createEcommerceError', () => {
    it('should create error with correct structure', () => {
      const error = createEcommerceError('PROFILE_NOT_FOUND', 'Profile not found')
      expect(error.code).toBe('E001')
      expect(error.message).toBe('Profile not found')
      expect(error.details).toBeUndefined()
    })

    it('should include details when provided', () => {
      const details = { profileId: '123' }
      const error = createEcommerceError('PROFILE_NOT_FOUND', 'Profile not found', details)
      expect(error.details).toEqual(details)
    })
  })

  describe('isEcommerceError', () => {
    it('should return true for ecommerce error', () => {
      const error = createEcommerceError('PROFILE_NOT_FOUND', 'Test')
      expect(isEcommerceError(error)).toBe(true)
    })

    it('should return false for regular error', () => {
      expect(isEcommerceError(new Error('test'))).toBe(false)
    })

    it('should return false for null', () => {
      expect(isEcommerceError(null)).toBe(false)
    })

    it('should return false for plain object without code', () => {
      expect(isEcommerceError({ message: 'test' })).toBe(false)
    })
  })

  describe('STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(STATUS_LABELS.pending).toBeDefined()
      expect(STATUS_LABELS.running).toBeDefined()
      expect(STATUS_LABELS.completed).toBeDefined()
      expect(STATUS_LABELS.failed).toBeDefined()
      expect(STATUS_LABELS.cancelled).toBeDefined()
      expect(STATUS_LABELS.success).toBeDefined()
    })
  })

  describe('EXTRACT_MODE_LABELS', () => {
    it('should have labels for all extract modes', () => {
      expect(EXTRACT_MODE_LABELS.element).toBeDefined()
      expect(EXTRACT_MODE_LABELS.text).toBeDefined()
      expect(EXTRACT_MODE_LABELS.value).toBeDefined()
      expect(EXTRACT_MODE_LABELS.href).toBeDefined()
      expect(EXTRACT_MODE_LABELS.src).toBeDefined()
      expect(EXTRACT_MODE_LABELS['data-id']).toBeDefined()
      expect(EXTRACT_MODE_LABELS.innerHTML).toBeDefined()
    })
  })

  describe('PLATFORM_CONFIG', () => {
    it('should have all platforms', () => {
      expect(PLATFORM_CONFIG.pinduoduo).toBeDefined()
      expect(PLATFORM_CONFIG.douyin).toBeDefined()
      expect(PLATFORM_CONFIG.taobao).toBeDefined()
      expect(PLATFORM_CONFIG.jd).toBeDefined()
      expect(PLATFORM_CONFIG.kuaishou).toBeDefined()
    })

    it('should have correct labels', () => {
      expect(PLATFORM_CONFIG.pinduoduo.label).toBe('拼多多')
      expect(PLATFORM_CONFIG.douyin.label).toBe('抖音')
      expect(PLATFORM_CONFIG.taobao.label).toBe('淘宝')
      expect(PLATFORM_CONFIG.jd.label).toBe('京东')
      expect(PLATFORM_CONFIG.kuaishou.label).toBe('快手')
    })
  })

  describe('CATEGORY_CONFIG', () => {
    it('should have all categories', () => {
      expect(CATEGORY_CONFIG.product_info).toBeDefined()
      expect(CATEGORY_CONFIG.form_input).toBeDefined()
      expect(CATEGORY_CONFIG.action).toBeDefined()
      expect(CATEGORY_CONFIG.upload).toBeDefined()
      expect(CATEGORY_CONFIG.result).toBeDefined()
    })

    it('should have correct labels', () => {
      expect(CATEGORY_CONFIG.product_info.labelZh).toBe('商品信息')
      expect(CATEGORY_CONFIG.form_input.labelZh).toBe('表单输入')
      expect(CATEGORY_CONFIG.action.labelZh).toBe('操作按钮')
      expect(CATEGORY_CONFIG.upload.labelZh).toBe('上传区域')
      expect(CATEGORY_CONFIG.result.labelZh).toBe('结果反馈')
    })
  })
})
