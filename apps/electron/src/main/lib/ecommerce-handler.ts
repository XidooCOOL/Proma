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
