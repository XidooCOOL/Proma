/**
 * 电商自动化 IPC 处理器
 * 
 * 处理前端的安装请求
 */

import { ipcMain, shell } from 'electron'
import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { getConfigDir } from './config-paths'

const PROMA_DIR = getConfigDir()
const WORKSPACE_DIR = join(PROMA_DIR, 'agent-workspaces', 'ecommerce-demo')

interface SetupProgress {
  step: string
  message: string
  progress: number
  error?: string
}

type ProgressCallback = (progress: SetupProgress) => void

/**
 * 注册电商自动化 IPC 处理器
 */
export function registerEcommerceHandlers() {
  // 检查电商功能是否已启用
  ipcMain.handle('ecommerce:check-status', async () => {
    try {
      const isEnabled = existsSync(join(WORKSPACE_DIR, 'node_modules'))
      const hasConfig = existsSync(join(WORKSPACE_DIR, 'mcp.json'))
      
      return {
        isEnabled,
        hasConfig,
        workspaceDir: WORKSPACE_DIR,
      }
    } catch (error) {
      console.error('[Ecommerce] 检查状态失败:', error)
      return {
        isEnabled: false,
        hasConfig: false,
        workspaceDir: WORKSPACE_DIR,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  })

  // 一键安装电商功能
  ipcMain.handle('ecommerce:setup', async (event) => {
    const sender = event.sender

    const sendProgress = (progress: SetupProgress) => {
      sender.send('ecommerce:progress', progress)
    }

    try {
      // Step 1: 检查环境
      sendProgress({ step: 'checking', message: '检查环境...', progress: 10 })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim()
      console.log(`[Ecommerce] Node.js: ${nodeVersion}`)

      // Step 2: 创建工作区
      sendProgress({ step: 'creating-workspace', message: '创建工作区...', progress: 20 })
      await createWorkspace()
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 3: 安装依赖
      sendProgress({ step: 'installing-deps', message: '安装依赖...', progress: 40 })
      await installDependencies(sendProgress)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 4: 构建项目
      sendProgress({ step: 'building', message: '构建项目...', progress: 60 })
      await buildProject(sendProgress)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 5: 配置 MCP
      sendProgress({ step: 'configuring-mcp', message: '配置 MCP...', progress: 70 })
      await configureMCP()
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 6: 安装 Skills
      sendProgress({ step: 'installing-skills', message: '安装 Skills...', progress: 80 })
      await installSkills()
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 7: 启动服务
      sendProgress({ step: 'starting-server', message: '启动服务...', progress: 90 })
      await startServer(sendProgress)

      // 完成
      sendProgress({ step: 'completed', message: '安装完成！', progress: 100 })

      return { success: true, workspaceDir: WORKSPACE_DIR }
    } catch (error) {
      console.error('[Ecommerce] 安装失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      sendProgress({ step: 'error', message: '安装失败', progress: 0, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  })

  // 启动电商服务
  ipcMain.handle('ecommerce:start-server', async () => {
    try {
      await startServer()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  })

  // 打开工作区目录
  ipcMain.handle('ecommerce:open-workspace', async () => {
    try {
      await shell.openPath(WORKSPACE_DIR)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  })

  console.log('[Ecommerce] IPC 处理器已注册')
}

// ===== 辅助函数 =====

async function createWorkspace(): Promise<void> {
  console.log('[Ecommerce] 创建工作区...')
  
  // 创建目录
  mkdirSync(WORKSPACE_DIR, { recursive: true })
  mkdirSync(join(WORKSPACE_DIR, 'skills'), { recursive: true })
  mkdirSync(join(WORKSPACE_DIR, 'browser-profile'), { recursive: true })

  // 获取源目录（安装包内的默认配置）
  const sourceDir = join(__dirname, '..', '..', '..', '..', 'examples', 'ecommerce-workspace')
  
  // 复制配置文件
  const configFiles = [
    'package.json',
    'tsconfig.json',
  ]
  
  for (const file of configFiles) {
    const src = join(sourceDir, file)
    const dest = join(WORKSPACE_DIR, file)
    if (existsSync(src)) {
      cpSync(src, dest, { force: true })
    }
  }

  // 复制 MCP 配置
  const mcpSrc = join(sourceDir, 'mcp.playwright.json')
  const mcpDest = join(WORKSPACE_DIR, 'mcp.json')
  if (existsSync(mcpSrc)) {
    cpSync(mcpSrc, mcpDest, { force: true })
  }

  // 创建工作区配置
  const workspaceConfig = {
    id: 'ecommerce-demo',
    name: '电商运营助手',
    slug: 'ecommerce-demo',
    platform: 'ecommerce',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(
    join(WORKSPACE_DIR, 'workspace.json'),
    JSON.stringify(workspaceConfig, null, 2)
  )

  console.log('[Ecommerce] 工作区创建完成')
}

async function installDependencies(sendProgress?: ProgressCallback): Promise<void> {
  console.log('[Ecommerce] 安装依赖...')
  
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd: WORKSPACE_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    child.stdout?.on('data', (data) => {
      console.log(`[npm] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      console.error(`[npm] ${data.toString().trim()}`)
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Ecommerce] 依赖安装完成')
        resolve()
      } else {
        reject(new Error(`npm install 失败，退出码: ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function buildProject(sendProgress?: ProgressCallback): Promise<void> {
  console.log('[Ecommerce] 构建项目...')
  
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      cwd: WORKSPACE_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    child.stdout?.on('data', (data) => {
      console.log(`[build] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      console.error(`[build] ${data.toString().trim()}`)
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Ecommerce] 项目构建完成')
        resolve()
      } else {
        reject(new Error(`构建失败，退出码: ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function configureMCP(): Promise<void> {
  console.log('[Ecommerce] 配置 MCP...')
  
  // MCP 配置已在 createWorkspace 中复制
  console.log('[Ecommerce] MCP 配置完成')
}

async function installSkills(): Promise<void> {
  console.log('[Ecommerce] 安装 Skills...')
  
  // 获取默认 Skills 目录
  const sourceDir = join(__dirname, '..', '..', '..', '..', 'default-skills')
  const targetDir = join(WORKSPACE_DIR, 'skills')
  
  // 电商相关的 skills
  const ecommerceSkills = [
    'product-listing',
    'content-collection',
    'order-management',
    'inventory-management',
    'ecommerce-automation',
  ]
  
  for (const skill of ecommerceSkills) {
    const src = join(sourceDir, skill)
    const dest = join(targetDir, skill)
    
    if (existsSync(src)) {
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
      console.log(`[Ecommerce] 已安装 Skill: ${skill}`)
    }
  }
  
  console.log('[Ecommerce] Skills 安装完成')
}

async function startServer(sendProgress?: ProgressCallback): Promise<void> {
  console.log('[Ecommerce] 启动服务...')
  
  // 这里可以启动 MCP 服务器
  // 由于 MCP 服务器需要通过 Proma 的工作区系统启动，这里先标记为完成
  
  console.log('[Ecommerce] 服务启动完成（需要通过工作区使用）')
}

// ===== Selector 管理处理器 =====

interface SelectorDef {
  id: string
  name: string
  selector: string
  type: string
  description: string
  required: boolean
  timeout?: number
  waitFor?: string
}

interface PageSelectors {
  page: string
  urlPattern?: string
  elements: Record<string, SelectorDef>
  version: string
  updatedAt: string
}

function getSelectorsDir(): string {
  return join(WORKSPACE_DIR, 'selectors')
}

function getPlatformSelectorsPath(platform: string): string {
  return join(getSelectorsDir(), platform)
}

/**
 * 获取平台的选择器配置
 */
function getPlatformSelectors(platform: string): Record<string, PageSelectors> {
  const platformDir = getPlatformSelectorsPath(platform)
  const result: Record<string, PageSelectors> = {}
  
  if (!existsSync(platformDir)) {
    // 返回默认选择器
    return getDefaultSelectors(platform)
  }
  
  try {
    const files = require('fs').readdirSync(platformDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const pageName = file.replace('.json', '')
        const filePath = join(platformDir, file)
        const content = readFileSync(filePath, 'utf-8')
        result[pageName] = JSON.parse(content)
      }
    }
  } catch (error) {
    console.error('[Selector] 读取选择器失败:', error)
  }
  
  return Object.keys(result).length > 0 ? result : getDefaultSelectors(platform)
}

/**
 * 获取默认选择器配置
 */
function getDefaultSelectors(platform: string): Record<string, PageSelectors> {
  const defaults: Record<string, Record<string, PageSelectors>> = {
    pinduoduo: {
      productCreate: {
        page: 'productCreate',
        urlPattern: '**.pinduoduo.com/**/goods/detail*',
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        elements: {
          title: { id: 'title', name: '商品标题', selector: 'input[placeholder*="商品标题"], [class*="title"] input', type: 'input', description: '商品标题输入框', required: true },
          price: { id: 'price', name: '商品价格', selector: 'input[placeholder*="价格"], [class*="price"] input', type: 'input', description: '商品价格输入框', required: true },
          stock: { id: 'stock', name: '库存数量', selector: 'input[placeholder*="库存"], [class*="stock"] input', type: 'input', description: '库存数量输入框', required: true },
          submitBtn: { id: 'submitBtn', name: '提交按钮', selector: 'button[type="submit"], [class*="submit"] button', type: 'button', description: '提交/发布按钮', required: true },
          uploadBtn: { id: 'uploadBtn', name: '图片上传', selector: '[class*="upload"], input[type="file"]', type: 'file', description: '图片上传按钮', required: false },
        },
      },
      orderList: {
        page: 'orderList',
        urlPattern: '**.pinduoduo.com/**/order/list*',
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        elements: {
          orderTable: { id: 'orderTable', name: '订单表格', selector: 'table, [class*="order"] table', type: 'table', description: '订单列表表格', required: true },
          shipBtn: { id: 'shipBtn', name: '发货按钮', selector: '[class*="ship"], [class*="deliver"]', type: 'button', description: '发货按钮', required: true },
          orderId: { id: 'orderId', name: '订单号', selector: '[class*="order-id"], [class*="orderId"]', type: 'container', description: '订单号显示', required: false },
        },
      },
    },
    douyin: {
      productCreate: {
        page: 'productCreate',
        urlPattern: '**.douyin.com/**/product/create*',
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        elements: {
          title: { id: 'title', name: '商品标题', selector: '[placeholder*="标题"], [class*="title"] input', type: 'input', description: '商品标题输入框', required: true },
          price: { id: 'price', name: '商品价格', selector: '[placeholder*="价格"], [class*="price"] input', type: 'input', description: '商品价格输入框', required: true },
          submitBtn: { id: 'submitBtn', name: '提交按钮', selector: 'button:has-text("发布"), [class*="submit"]', type: 'button', description: '提交/发布按钮', required: true },
        },
      },
    },
  }
  
  return defaults[platform] || {}
}

function savePageSelectors(platform: string, page: string, data: PageSelectors): void {
  const platformDir = getPlatformSelectorsPath(platform)
  mkdirSync(platformDir, { recursive: true })
  const filePath = join(platformDir, `${page}.json`)
  writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function updatePageSelector(platform: string, page: string, selectorId: string, selector: SelectorDef): void {
  const selectors = getPlatformSelectors(platform)
  if (!selectors[page]) {
    selectors[page] = {
      page,
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      elements: {},
    }
  }
  selectors[page].elements[selectorId] = selector
  selectors[page].updatedAt = new Date().toISOString()
  savePageSelectors(platform, page, selectors[page])
}

function addPageSelector(platform: string, page: string, selectorId: string, selector: SelectorDef): void {
  updatePageSelector(platform, page, selectorId, selector)
}

function deletePageSelector(platform: string, page: string, selectorId: string): void {
  const selectors = getPlatformSelectors(platform)
  if (selectors[page] && selectors[page].elements[selectorId]) {
    delete selectors[page].elements[selectorId]
    selectors[page].updatedAt = new Date().toISOString()
    savePageSelectors(platform, page, selectors[page])
  }
}

/**
 * 注册 Selector 管理 IPC 处理器
 */
export function registerSelectorHandlers() {
  // 获取平台选择器
  ipcMain.handle('selector:get-platform', async (_, platform: string) => {
    try {
      return getPlatformSelectors(platform)
    } catch (error) {
      console.error('[Selector] 获取失败:', error)
      return {}
    }
  })

  // 更新选择器
  ipcMain.handle('selector:update', async (_, platform: string, page: string, selectorId: string, selector: SelectorDef) => {
    try {
      updatePageSelector(platform, page, selectorId, selector)
      return { success: true }
    } catch (error) {
      console.error('[Selector] 更新失败:', error)
      throw error
    }
  })

  // 添加选择器
  ipcMain.handle('selector:add', async (_, platform: string, page: string, selectorId: string, selector: SelectorDef) => {
    try {
      addPageSelector(platform, page, selectorId, selector)
      return { success: true }
    } catch (error) {
      console.error('[Selector] 添加失败:', error)
      throw error
    }
  })

  // 删除选择器
  ipcMain.handle('selector:delete', async (_, platform: string, page: string, selectorId: string) => {
    try {
      deletePageSelector(platform, page, selectorId)
      return { success: true }
    } catch (error) {
      console.error('[Selector] 删除失败:', error)
      throw error
    }
  })

  // 导入选择器
  ipcMain.handle('selector:import', async (_, platform: string, data: any) => {
    try {
      if (data.pages) {
        for (const [page, pageData] of Object.entries(data.pages)) {
          savePageSelectors(platform, page, pageData as PageSelectors)
        }
      }
      return { success: true }
    } catch (error) {
      console.error('[Selector] 导入失败:', error)
      throw error
    }
  })

  // 调试选择器 - 检测页面可用元素
  ipcMain.handle('selector:debug', async (_, platform: string, page: string, url: string) => {
    try {
      const { chromium } = require('playwright')
      
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      })
      const pageObj = await context.newPage()
      
      await pageObj.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await pageObj.waitForTimeout(2000)
      
      const detected: Array<{ selector: string; count: number }> = []
      
      // 检测常用选择器
      const commonSelectors = [
        'input[type="text"]', 'input[type="number"]', 'input[type="password"]',
        'textarea', 'select', 'button', 'a[href]',
        'input[type="file"]', 'input[type="checkbox"]', 'input[type="radio"]',
        '[placeholder]', '[class*="input"]', '[class*="btn"]', '[class*="button"]',
        '[class*="search"]', '[class*="upload"]', '[class*="submit"]',
        '[class*="title"]', '[class*="price"]', '[class*="stock"]',
        '[class*="form"] input', '[class*="form"] button',
        '[class*="modal"] input', '[class*="modal"] button',
        '[class*="table"] input', '[class*="table"] button',
        'table th', 'table td',
      ]
      
      for (const selector of commonSelectors) {
        try {
          const count = await pageObj.locator(selector).count()
          if (count > 0 && count < 100) {
            detected.push({ selector, count })
          }
        } catch {
          // 忽略无效选择器
        }
      }
      
      detected.sort((a, b) => b.count - a.count)
      
      await browser.close()
      
      return detected.slice(0, 20)
    } catch (error) {
      console.error('[Selector] 调试失败:', error)
      throw error
    }
  })

  // 测试选择器
  ipcMain.handle('selector:test', async (_, platform: string, page: string, url: string) => {
    try {
      const selectors = getPlatformSelectors(platform)
      const pageSelectors = selectors[page]?.elements || {}
      const { chromium } = require('playwright')
      
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      })
      const pageObj = await context.newPage()
      
      await pageObj.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await pageObj.waitForTimeout(2000)
      
      const results: Record<string, { valid: boolean; count: number }> = {}
      
      for (const [name, def] of Object.entries(pageSelectors)) {
        try {
          const count = await pageObj.locator(def.selector).count()
          results[name] = { valid: count > 0, count }
        } catch {
          results[name] = { valid: false, count: 0 }
        }
      }
      
      await browser.close()
      
      return results
    } catch (error) {
      console.error('[Selector] 测试失败:', error)
      throw error
    }
  })

  // 检测失效选择器
  ipcMain.handle('selector:detect-broken', async (_, platform: string, pages: string[]) => {
    try {
      const selectors = getPlatformSelectors(platform)
      const broken: string[] = []
      
      for (const page of pages) {
        const pageData = selectors[page]
        if (!pageData || !pageData.urlPattern) continue
        
        try {
          const { chromium } = require('playwright')
          const browser = await chromium.launch({ headless: true })
          const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
          })
          const pageObj = await context.newPage()
          
          // 构造测试 URL（使用 URLPattern 替换通配符）
          const testUrl = pageData.urlPattern.replace(/\*\*/g, '').replace(/\*/g, '')
          
          await pageObj.goto(`https://${testUrl}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
          await pageObj.waitForTimeout(2000)
          
          for (const [name, def] of Object.entries(pageData.elements)) {
            try {
              const count = await pageObj.locator(def.selector).count()
              if (count === 0) {
                broken.push(`${page}.${name}`)
              }
            } catch {
              broken.push(`${page}.${name}`)
            }
          }
          
          await browser.close()
        } catch (error) {
          console.error(`[Selector] 检测页面 ${page} 失败:`, error)
        }
      }
      
      return broken
    } catch (error) {
      console.error('[Selector] 批量检测失败:', error)
      return []
    }
  })

  // ===== 店铺 Profile 管理 =====

interface StoreProfile {
  id: string
  name: string
  platform: string
  profilePath: string
  status: string
  loggedIn: boolean
  lastLogin?: string
}

function getProfilesDir(): string {
  return join(WORKSPACE_DIR, 'profiles')
}

function getProfilePath(profileId: string): string {
  return join(getProfilesDir(), profileId)
}

function loadProfiles(): StoreProfile[] {
  const profilesDir = getProfilesDir()
  if (!existsSync(profilesDir)) {
    return []
  }
  
  try {
    const content = readFileSync(join(profilesDir, 'profiles.json'), 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

function saveProfiles(profiles: StoreProfile[]): void {
  const profilesDir = getProfilesDir()
  mkdirSync(profilesDir, { recursive: true })
  writeFileSync(join(profilesDir, 'profiles.json'), JSON.stringify(profiles, null, 2))
}

function checkLoginStatus(profilePath: string): { loggedIn: boolean } {
  const cookiesFile = join(profilePath, 'cookies.json')
  if (!existsSync(cookiesFile)) {
    return { loggedIn: false }
  }
  try {
    const cookies = JSON.parse(readFileSync(cookiesFile, 'utf-8'))
    return { loggedIn: cookies.length > 0 }
  } catch {
    return { loggedIn: false }
  }
}

/**
 * 注册店铺 Profile IPC 处理器
 */
export function registerStoreHandlers() {
  // 获取店铺列表
  ipcMain.handle('store:get-profiles', async () => {
    try {
      const profiles = loadProfiles()
      return profiles.map(p => {
        const loginStatus = checkLoginStatus(p.profilePath)
        return {
          ...p,
          loggedIn: loginStatus.loggedIn,
          status: loginStatus.loggedIn ? 'logged_in' : 'not_logged_in',
        }
      })
    } catch (error) {
      console.error('[Store] 获取列表失败:', error)
      return []
    }
  })

  // 创建 Profile
  ipcMain.handle('store:create-profile', async (_, platform: string, name: string) => {
    try {
      const profiles = loadProfiles()
      const id = `profile_${Date.now()}`
      const profilePath = getProfilePath(id)
      
      mkdirSync(profilePath, { recursive: true })
      
      const newProfile: StoreProfile = {
        id,
        name,
        platform,
        profilePath,
        status: 'not_logged_in',
        loggedIn: false,
      }
      
      profiles.push(newProfile)
      saveProfiles(profiles)
      
      return { id, name }
    } catch (error) {
      console.error('[Store] 创建失败:', error)
      throw error
    }
  })

  // 删除 Profile
  ipcMain.handle('store:delete-profile', async (_, profileId: string) => {
    try {
      const profiles = loadProfiles()
      const filtered = profiles.filter(p => p.id !== profileId)
      saveProfiles(filtered)
      
      // 删除目录
      const profilePath = getProfilePath(profileId)
      if (existsSync(profilePath)) {
        require('fs').rmSync(profilePath, { recursive: true })
      }
    } catch (error) {
      console.error('[Store] 删除失败:', error)
      throw error
    }
  })

  // 检查登录状态
  ipcMain.handle('store:check-login', async (_, profileId: string) => {
    try {
      const profiles = loadProfiles()
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) {
        return { loggedIn: false }
      }
      return checkLoginStatus(profile.profilePath)
    } catch (error) {
      console.error('[Store] 检查登录失败:', error)
      return { loggedIn: false }
    }
  })

  // 登录店铺
  ipcMain.handle('store:login', async (_, profileId: string) => {
    try {
      const profiles = loadProfiles()
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) {
        throw new Error('Profile 不存在')
      }
      
      const { chromium } = require('playwright')
      
      // 打开登录页面
      const loginUrls: Record<string, string> = {
        pinduoduo: 'https://mobile.pinduoduo.com/login',
        douyin: 'https://creator.douyin.com/',
        taobao: 'https://login.taobao.com',
        jd: 'https://passport.jd.com',
        kuaishou: 'https://www.kuaishou.com/login',
      }
      
      const url = loginUrls[profile.platform] || 'https://www.baidu.com'
      
      // 启动带 Profile 的浏览器
      const browser = await chromium.launch({ headless: false })
      const context = await browser.newContext({
        userDataDir: profile.profilePath,
        viewport: { width: 1280, height: 720 },
      })
      
      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      
      // 等待用户扫码登录（最多等待 5 分钟）
      console.log('[Store] 等待用户登录...')
      
      // 监听登录成功（可以通过检测 cookies 或页面变化）
      await page.waitForTimeout(5 * 60 * 1000)
      
      // 保存 cookies
      const cookies = await context.cookies()
      const cookiesFile = join(profile.profilePath, 'cookies.json')
      writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2))
      
      // 更新状态
      profile.status = 'logged_in'
      profile.loggedIn = true
      profile.lastLogin = new Date().toISOString()
      saveProfiles(profiles)
      
      await browser.close()
      
      return { success: true }
    } catch (error) {
      console.error('[Store] 登录失败:', error)
      throw error
    }
  })

  // 使用 Profile 调试选择器
  ipcMain.handle('selector:debug-with-profile', async (_, platform: string, page: string, profileId: string, url?: string) => {
    try {
      const profiles = loadProfiles()
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) {
        throw new Error('Profile 不存在')
      }
      
      // 检查登录状态
      const loginStatus = checkLoginStatus(profile.profilePath)
      if (!loginStatus.loggedIn) {
        return { elements: [], loginRequired: true }
      }
      
      // 获取默认 URL
      const defaultUrls: Record<string, string> = {
        productCreate: 'https://mobile.pinduoduo.com/goods/detail',
        orderList: 'https://mms.pinduoduo.com/order/list',
        productList: 'https://mms.pinduoduo.com/goods/list',
      }
      const targetUrl = url || defaultUrls[page] || `https://mobile.pinduoduo.com/`
      
      const { chromium } = require('playwright')
      
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        userDataDir: profile.profilePath,
        viewport: { width: 1280, height: 720 },
      })
      
      const pageObj = await context.newPage()
      await pageObj.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await pageObj.waitForTimeout(2000)
      
      const detected: Array<{ selector: string; count: number }> = []
      
      const commonSelectors = [
        'input[type="text"]', 'input[type="number"]', 'input[type="password"]',
        'textarea', 'select', 'button', 'a[href]',
        'input[type="file"]', 'input[type="checkbox"]', 'input[type="radio"]',
        '[placeholder]', '[class*="input"]', '[class*="btn"]', '[class*="button"]',
        '[class*="search"]', '[class*="upload"]', '[class*="submit"]',
        '[class*="title"]', '[class*="price"]', '[class*="stock"]',
        '[class*="form"] input', '[class*="form"] button',
        '[class*="modal"] input', '[class*="modal"] button',
        '[class*="table"] input', '[class*="table"] button',
        'table th', 'table td',
      ]
      
      for (const selector of commonSelectors) {
        try {
          const count = await pageObj.locator(selector).count()
          if (count > 0 && count < 100) {
            detected.push({ selector, count })
          }
        } catch {
          // 忽略无效选择器
        }
      }
      
      detected.sort((a, b) => b.count - a.count)
      
      await browser.close()
      
      return { elements: detected.slice(0, 20) }
    } catch (error) {
      console.error('[Selector] Profile 调试失败:', error)
      throw error
    }
  })

  // 使用 Profile 测试选择器
  ipcMain.handle('selector:test-with-profile', async (_, platform: string, page: string, profileId: string) => {
    try {
      const profiles = loadProfiles()
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) {
        throw new Error('Profile 不存在')
      }
      
      const selectors = getPlatformSelectors(platform)
      const pageSelectors = selectors[page]?.elements || {}
      
      const { chromium } = require('playwright')
      
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        userDataDir: profile.profilePath,
        viewport: { width: 1280, height: 720 },
      })
      
      const pageObj = await context.newPage()
      
      // 获取测试 URL
      const urlPattern = selectors[page]?.urlPattern || ''
      const testUrl = urlPattern.replace(/\*\*/g, '').replace(/\*/g, '') || 'https://mobile.pinduoduo.com/'
      
      await pageObj.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await pageObj.waitForTimeout(2000)
      
      const results: Record<string, { valid: boolean; count: number }> = {}
      
      for (const [name, def] of Object.entries(pageSelectors)) {
        try {
          const count = await pageObj.locator(def.selector).count()
          results[name] = { valid: count > 0, count }
        } catch {
          results[name] = { valid: false, count: 0 }
        }
      }
      
      await browser.close()
      
      return results
    } catch (error) {
      console.error('[Selector] Profile 测试失败:', error)
      throw error
    }
  })

  console.log('[Store] IPC 处理器已注册')
}

// ===== 商品解析处理器 =====

/**
 * 注册商品解析 IPC 处理器
 */
// 导出商品解析处理器供外部调用
export function registerProductParserHandlers(): void {
  // 解析商品链接
  ipcMain.handle('product:parse-url', async (_, url: string) => {
    try {
      // 模拟解析
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 实际应该调用后端服务
      // const result = await parseProductFromUrl(url)
      
      // 模拟返回
      const mockProducts: Record<string, any> = {
        'taobao': {
          title: '淘宝商品示例',
          price: 99.00,
          description: '这是一款来自淘宝的优质商品',
          images: ['https://img.alicdn.com/bao/uploaded/xxx.jpg'],
        },
        'pinduoduo': {
          title: '拼多多商品示例',
          price: 59.00,
          description: '这是一款来自拼多多的优质商品',
          images: [],
        },
      }
      
      let platform = 'unknown'
      if (url.includes('taobao') || url.includes('tmall')) platform = 'taobao'
      else if (url.includes('pinduoduo')) platform = 'pinduoduo'
      else if (url.includes('douyin')) platform = 'douyin'
      else if (url.includes('jd')) platform = 'jd'
      
      return {
        success: true,
        product: mockProducts[platform] || {
          title: '商品',
          price: 0,
          description: '',
          images: [],
        },
      }
    } catch (error) {
      console.error('[ProductParser] 解析失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析失败',
      }
    }
  })

  // 从 Excel 导入商品
  ipcMain.handle('product:import-excel', async (_, filePath: string) => {
    try {
      // 实际应该调用后端服务
      // const products = await parseProductsFromExcel(filePath)
      
      // 模拟返回
      const mockProducts = [
        {
          id: `product-${Date.now()}-1`,
          title: 'Excel商品1',
          price: 99.00,
          description: '从Excel导入的商品',
          images: [],
          source: 'excel',
        },
        {
          id: `product-${Date.now()}-2`,
          title: 'Excel商品2',
          price: 79.00,
          description: '从Excel导入的商品',
          images: [],
          source: 'excel',
        },
      ]
      
      return {
        success: true,
        products: mockProducts,
      }
    } catch (error) {
      console.error('[ProductParser] Excel导入失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入失败',
      }
    }
  })

  console.log('[ProductParser] IPC 处理器已注册')
}

// ===== 图片文件夹选择 & Excel 读取 =====

/**
 * 注册文件选择 IPC 处理器
 */
function registerFileSelectorHandlers(): void {
  // 选择图片文件夹
  ipcMain.handle('file:select-image-folders', async (_, includeSubfolders: boolean = false) => {
    try {
      const { dialog } = require('electron')
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择图片文件夹',
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false }
      }

      const folderPath = result.filePaths[0]
      const fs = require('fs')
      const path = require('path')

      // 读取文件夹中的图片文件
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      let images: string[] = []

      const files = fs.readdirSync(folderPath)
      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (imageExtensions.includes(ext)) {
          images.push(path.join(folderPath, file))
        }
      }

      // 如果包含子目录
      if (includeSubfolders) {
        const subDirs = fs.readdirSync(folderPath, { withFileTypes: true })
        for (const dir of subDirs) {
          if (dir.isDirectory()) {
            const subPath = path.join(folderPath, dir.name)
            const subFiles = fs.readdirSync(subPath)
            for (const file of subFiles) {
              const ext = path.extname(file).toLowerCase()
              if (imageExtensions.includes(ext)) {
                images.push(path.join(subPath, file))
              }
            }
          }
        }
      }

      // 按文件名排序
      images.sort()

      // 返回单个主文件夹信息（包含所有图片）
      return {
        success: true,
        folders: [{
          path: folderPath,
          name: path.basename(folderPath),
          images,
          imageCount: images.length,
        }],
      }
    } catch (error) {
      console.error('[FileSelector] 选择文件夹失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  // 选择 Excel 文件
  ipcMain.handle('file:select-excel', async () => {
    try {
      const { dialog } = require('electron')
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: '选择 Excel 文件',
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx', 'xls', 'csv'] },
        ],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false }
      }

      return {
        success: true,
        filePath: result.filePaths[0],
      }
    } catch (error) {
      console.error('[FileSelector] 选择 Excel 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  // 读取 Excel 数据
  ipcMain.handle('file:read-excel', async (_, filePath: string) => {
    try {
      // 实际应该使用 xlsx 库解析
      // 这里简化处理，假设是 CSV 或简单格式
      const fs = require('fs')
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())

      const rows: string[][] = []
      for (const line of lines) {
        // 简单的 CSV 解析（逗号分隔）
        const row = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        rows.push(row)
      }

      return {
        success: true,
        rows,
        rowCount: rows.length,
      }
    } catch (error) {
      console.error('[FileSelector] 读取 Excel 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  console.log('[FileSelector] IPC 处理器已注册')
}

// ===== 商品文件夹扫描 =====

/**
 * 扫描商品文件夹
 * 每个子文件夹 = 一个商品
 * 子文件夹内包含 products.csv 和 skus.csv
 */
function registerProductScannerHandlers(): void {
  // 扫描商品文件夹
  ipcMain.handle('file:scan-product-folders', async (_, rootPath: string) => {
    try {
      const fs = require('fs')
      const path = require('path')

      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      const products: any[] = []

      // 读取根目录下的子文件夹
      const entries = fs.readdirSync(rootPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const folderPath = path.join(rootPath, entry.name)
        const folderName = entry.name

        // 读取图片
        const files = fs.readdirSync(folderPath)
        const images: string[] = []
        let hasProductsCsv = false
        let hasSkusCsv = false

        for (const file of files) {
          const ext = path.extname(file).toLowerCase()
          const fullPath = path.join(folderPath, file)

          if (imageExtensions.includes(ext)) {
            images.push(fullPath)
          } else if (file === 'products.csv' || file === 'products.xlsx') {
            hasProductsCsv = true
          } else if (file === 'skus.csv' || file === 'skus.xlsx') {
            hasSkusCsv = true
          }
        }

        // 按文件名排序图片
        images.sort()

        // 解析 products.csv
        let baseInfo: any = undefined
        if (hasProductsCsv) {
          try {
            const productsFile = path.join(folderPath, 'products.csv')
            if (fs.existsSync(productsFile)) {
              const content = fs.readFileSync(productsFile, 'utf-8')
              const lines = content.split('\n').filter(l => l.trim())
              if (lines.length >= 2) {
                // 解析表头
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
                
                // 解析第一行数据
                const values = lines[1].split(',').map(v => v.trim().replace(/^"|"$/g, ''))

                const rowData: Record<string, string> = {}
                headers.forEach((h, i) => {
                  rowData[h] = values[i] || ''
                })

                baseInfo = {
                  title: rowData['title'] || rowData['名称'] || folderName,
                  price: parseFloat(rowData['price'] || rowData['价格'] || '0') || 0,
                  origin: rowData['origin'] || rowData['产地'] || '',
                  description: rowData['description'] || rowData['描述'] || '',
                  freight: rowData['freight'] || rowData['运费'] || '',
                  weight: rowData['weight'] || rowData['重量'] || '',
                  brand: rowData['brand'] || rowData['品牌'] || '',
                  category: rowData['category'] || rowData['类目'] || '',
                }
              }
            } else {
              // 尝试 xlsx
              const productsXlsx = path.join(folderPath, 'products.xlsx')
              if (fs.existsSync(productsXlsx)) {
                hasProductsCsv = true
              }
            }
          } catch (e) {
            console.error('[Scanner] 读取 products.csv 失败:', e)
          }
        }

        // 解析 skus.csv
        let skus: any[] = []
        if (hasSkusCsv) {
          try {
            const skusFile = path.join(folderPath, 'skus.csv')
            if (fs.existsSync(skusFile)) {
              const content = fs.readFileSync(skusFile, 'utf-8')
              const lines = content.split('\n').filter(l => l.trim())
              
              if (lines.length >= 2) {
                // 解析表头
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())

                // 解析数据行
                for (let i = 1; i < lines.length; i++) {
                  const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
                  
                  const rowData: Record<string, string> = {}
                  headers.forEach((h, j) => {
                    rowData[h] = values[j] || ''
                  })

                  skus.push({
                    code: rowData['code'] || rowData['货号'] || rowData['sku'] || `SKU-${i}`,
                    stock: parseInt(rowData['stock'] || rowData['库存'] || '0') || 0,
                    price: parseFloat(rowData['price'] || rowData['价格'] || '0') || undefined,
                    color: rowData['color'] || rowData['颜色'] || '',
                    size: rowData['size'] || rowData['尺码'] || '',
                  })
                }
              }
            }
          } catch (e) {
            console.error('[Scanner] 读取 skus.csv 失败:', e)
          }
        }

        products.push({
          id: `product-${Date.now()}-${products.length}`,
          folderPath,
          folderName,
          images,
          imageCount: images.length,
          baseInfo,
          skus,
          hasProductsCsv,
          hasSkusCsv,
        })
      }

      return {
        success: true,
        products,
        totalFolders: products.length,
      }
    } catch (error) {
      console.error('[ProductScanner] 扫描失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '扫描失败',
        products: [],
      }
    }
  })

  console.log('[ProductScanner] IPC 处理器已注册')
}

// 注册商品扫描处理器
registerProductScannerHandlers()

console.log('[Selector] IPC 处理器已注册')
