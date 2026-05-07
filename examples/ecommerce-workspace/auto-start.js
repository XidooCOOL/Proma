#!/usr/bin/env node

/**
 * 自动启动脚本
 * 
 * 自动检测并启动电商多任务系统
 * - 检测工作区是否存在
 * - 自动安装依赖
 * - 启动 MCP Server
 */

import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

// 配置
const PROMA_DIR = join(homedir(), '.proma')
const WORKSPACE_DIR = join(PROMA_DIR, 'agent-workspaces', 'ecommerce-demo')
const SOURCE_DIR = resolve(__dirname, '..')

// 日志
function log(...args) {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${timestamp}]`, ...args)
}

// 检测工作区是否存在
function checkWorkspace() {
  log('🔍 检查工作区...')
  
  if (!existsSync(WORKSPACE_DIR)) {
    log('⚙️ 工作区不存在，开始创建...')
    return false
  }

  log('✅ 工作区已存在')
  return true
}

// 创建工作区
function createWorkspace() {
  log('📁 创建工作区目录...')
  
  // 创建目录
  mkdirSync(WORKSPACE_DIR, { recursive: true })
  mkdirSync(join(WORKSPACE_DIR, 'skills'), { recursive: true })
  mkdirSync(join(WORKSPACE_DIR, 'browser-profile'), { recursive: true })
  
  // 复制配置文件
  const configFiles = [
    'package.json',
    'tsconfig.json',
    'mcp.playwright.json'
  ]
  
  for (const file of configFiles) {
    const src = join(SOURCE_DIR, file)
    const dest = join(WORKSPACE_DIR, file)
    if (existsSync(src)) {
      cpSync(src, dest, { force: true })
      log(`  ✅ 复制 ${file}`)
    }
  }
  
  // 复制 Skills
  const skillsDir = join(SOURCE_DIR, 'skills')
  if (existsSync(skillsDir)) {
    const skills = ['multi-task-orchestrator', 'add-store', 'product-listing', 'order-management']
    for (const skill of skills) {
      const src = join(skillsDir, skill)
      const dest = join(WORKSPACE_DIR, 'skills', skill)
      if (existsSync(src)) {
        cpSync(src, dest, { force: true })
        log(`  ✅ 安装 Skill: ${skill}`)
      }
    }
  }
  
  // 创建工作区配置
  const workspaceConfig = {
    id: 'ecommerce-demo',
    name: '电商运营助手',
    slug: 'ecommerce-demo',
    platform: 'ecommerce',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      autoLogin: true,
      browserType: 'chrome',
      maxConcurrentTasks: 10
    }
  }
  
  writeFileSync(
    join(WORKSPACE_DIR, 'workspace.json'),
    JSON.stringify(workspaceConfig, null, 2)
  )
  log('  ✅ 工作区配置已创建')
  
  log('✨ 工作区创建完成')
}

// 安装依赖
function installDependencies() {
  log('📦 检查依赖...')
  
  const nodeModules = join(WORKSPACE_DIR, 'node_modules')
  
  if (!existsSync(nodeModules)) {
    log('🔧 安装依赖中...')
    try {
      execSync('npm install', {
        cwd: WORKSPACE_DIR,
        stdio: 'inherit'
      })
      log('✅ 依赖安装完成')
    } catch (error) {
      log('❌ 依赖安装失败')
      throw error
    }
  } else {
    log('✅ 依赖已安装')
  }
}

// 构建项目
function buildProject() {
  log('🔨 检查构建...')
  
  const distDir = join(WORKSPACE_DIR, 'dist')
  
  if (!existsSync(distDir)) {
    log('🔧 构建项目中...')
    try {
      execSync('npm run build', {
        cwd: WORKSPACE_DIR,
        stdio: 'inherit'
      })
      log('✅ 构建完成')
    } catch (error) {
      log('❌ 构建失败')
      throw error
    }
  } else {
    log('✅ 项目已构建')
  }
}

// 检查 Playwright
function checkPlaywright() {
  log('🌐 检查 Playwright...')
  
  try {
    execSync('npx playwright --version', { stdio: 'ignore' })
    log('✅ Playwright 已安装')
  } catch {
    log('🔧 安装 Playwright...')
    try {
      execSync('npx playwright install chromium', {
        cwd: WORKSPACE_DIR,
        stdio: 'inherit'
      })
      log('✅ Playwright 安装完成')
    } catch (error) {
      log('⚠️ Playwright 安装失败（可选）')
    }
  }
}

// 启动 MCP Server
function startMCPServer() {
  log('🚀 启动 MCP Server...')
  
  // 设置环境变量
  const env = {
    ...process.env,
    WORKSPACE_DIR,
    PROMA_DIR
  }
  
  // 启动进程
  const child = spawn('npm', ['run', 'dev'], {
    cwd: WORKSPACE_DIR,
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
  // 处理输出
  child.stdout.on('data', (data) => {
    const output = data.toString().trim()
    if (output) {
      console.log(output)
    }
  })
  
  child.stderr.on('data', (data) => {
    const output = data.toString().trim()
    if (output && !output.includes('[MCP]')) {
      console.error(output)
    }
  })
  
  child.on('error', (error) => {
    log('❌ MCP Server 启动失败:', error.message)
    process.exit(1)
  })
  
  child.on('exit', (code) => {
    if (code !== 0) {
      log(`❌ MCP Server 退出，代码: ${code}`)
      process.exit(code)
    }
  })
  
  return child
}

// 主函数
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛒 电商多任务并行系统 - 自动启动                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
  
  try {
    // 1. 检测或创建工作区
    const workspaceExists = checkWorkspace()
    if (!workspaceExists) {
      createWorkspace()
    }
    
    // 2. 安装依赖
    installDependencies()
    
    // 3. 构建项目
    buildProject()
    
    // 4. 检查 Playwright
    checkPlaywright()
    
    // 5. 启动 MCP Server
    const serverProcess = startMCPServer()
    
    // 优雅退出
    process.on('SIGINT', () => {
      log('🛑 正在关闭...')
      serverProcess.kill()
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      log('🛑 正在关闭...')
      serverProcess.kill()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message)
    process.exit(1)
  }
}

// 运行
main()
