#!/usr/bin/env node

/**
 * 一键安装脚本
 * 
 * 自动化完成所有配置，用户只需运行此脚本即可
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

// 配置
const PROMA_DIR = join(homedir(), '.proma')
const WORKSPACE_DIR = join(PROMA_DIR, 'agent-workspaces', 'ecommerce-demo')
const SOURCE_DIR = resolve(__dirname, '..')

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function step(message) {
  console.log(`\n${colors.cyan}➤ ${message}${colors.reset}`)
}

function success(message) {
  log(`  ✅ ${message}`, 'green')
}

function error(message) {
  log(`  ❌ ${message}`, 'red')
}

function info(message) {
  log(`  ℹ️  ${message}`, 'blue')
}

// 检查命令是否存在
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// 执行命令
function run(command, options = {}) {
  try {
    log(`    $ ${command}`, 'yellow')
    execSync(command, {
      stdio: 'inherit',
      cwd: options.cwd || SOURCE_DIR,
      ...options
    })
    return true
  } catch (e) {
    error(`命令执行失败: ${command}`)
    return false
  }
}

// 主安装流程
async function main() {
  console.log(`
${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛒 电商多任务并行系统 - 一键安装                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}
  `)

  // 1. 检查环境
  step('检查运行环境')
  
  const checks = [
    { name: 'Node.js', cmd: 'node --version', required: true },
    { name: 'npm', cmd: 'npm --version', required: true },
    { name: 'Git', cmd: 'git --version', required: false },
  ]

  let allChecksPassed = true
  for (const check of checks) {
    try {
      const version = execSync(check.cmd, { encoding: 'utf-8' }).trim()
      success(`${check.name}: ${version}`)
    } catch {
      if (check.required) {
        error(`${check.name} 未安装，请先安装`)
        allChecksPassed = false
      } else {
        info(`${check.name} 未安装（可选）`)
      }
    }
  }

  if (!allChecksPassed) {
    console.log(`\n${colors.red}请先安装缺失的依赖${colors.reset}`)
    process.exit(1)
  }

  // 2. 创建目录
  step('创建工作区目录')
  
  if (!existsSync(PROMA_DIR)) {
    info(`创建目录: ${PROMA_DIR}`)
    mkdirSync(PROMA_DIR, { recursive: true })
    success('Proma 配置目录已创建')
  } else {
    success('Proma 配置目录已存在')
  }

  if (!existsSync(WORKSPACE_DIR)) {
    info(`创建目录: ${WORKSPACE_DIR}`)
    mkdirSync(WORKSPACE_DIR, { recursive: true })
    success('电商工作区目录已创建')
  } else {
    info('工作区目录已存在，将更新配置')
  }

  // 3. 复制项目文件
  step('复制项目文件')

  const filesToCopy = [
    'package.json',
    'tsconfig.json',
    'mcp.playwright.json',
  ]

  for (const file of filesToCopy) {
    const src = join(SOURCE_DIR, file)
    const dest = join(WORKSPACE_DIR, file)
    if (existsSync(src)) {
      cpSync(src, dest, { force: true })
      success(`已复制: ${file}`)
    }
  }

  // 4. 创建 skills 目录并复制
  step('安装 Skills')

  const skillsDir = join(WORKSPACE_DIR, 'skills')
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true })
  }

  const skillsToCopy = [
    'multi-task-orchestrator',
    'add-store',
    'product-listing',
    'order-management',
  ]

  const sourceSkillsDir = join(SOURCE_DIR, 'skills')
  for (const skill of skillsToCopy) {
    const src = join(sourceSkillsDir, skill)
    const dest = join(skillsDir, skill)
    if (existsSync(src)) {
      cpSync(src, dest, { force: true })
      success(`已安装 Skill: ${skill}`)
    }
  }

  // 5. 创建工作区配置
  step('创建工作区配置')

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
  success('工作区配置文件已创建')

  // 6. 安装依赖
  step('安装项目依赖')
  
  if (run('npm install', { cwd: WORKSPACE_DIR })) {
    success('依赖安装完成')
  } else {
    error('依赖安装失败，请手动执行: npm install')
  }

  // 7. 构建项目
  step('构建项目')
  
  if (run('npm run build', { cwd: WORKSPACE_DIR })) {
    success('项目构建完成')
  } else {
    info('构建失败，可以稍后手动执行: npm run build')
  }

  // 8. 创建启动脚本
  step('创建启动脚本')

  const startScript = `#!/bin/bash
# 自动启动脚本 - 电商多任务并行系统

WORKSPACE_DIR="${WORKSPACE_DIR}"
cd "$WORKSPACE_DIR"

echo "🚀 启动电商多任务并行系统..."
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 启动 MCP Server
echo "🔧 启动 MCP Server..."
npm run dev
`

  writeFileSync(join(WORKSPACE_DIR, 'start.sh'), startScript)
  execSync('chmod +x', { cwd: WORKSPACE_DIR })
  success('启动脚本已创建: start.sh')

  // 9. 安装 Playwright 浏览器
  step('安装 Playwright 浏览器')
  
  info('这可能需要几分钟时间...')
  if (run('npx playwright install chromium', { cwd: WORKSPACE_DIR })) {
    success('Playwright 浏览器安装完成')
  } else {
    info('浏览器安装可选，稍后可手动安装')
  }

  // 完成
  console.log(`
${colors.green}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✅ 安装完成！                                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}

${colors.cyan}使用方式:${colors.reset}

  1. 启动系统:
     cd ${WORKSPACE_DIR}
     ./start.sh
     
     或
     
     npm run dev

  2. 在 Proma 中选择工作区: ${colors.yellow}电商运营助手${colors.reset}

  3. 开始使用:
     ${colors.yellow}帮我上架商品到抖音和拼多多${colors.reset}
     ${colors.yellow}帮我采集小红书女装爆款文案${colors.reset}

${colors.cyan}详细文档:${colors.reset}
  - 集成指南: INTEGRATION.md
  - 项目结构: PROJECT_STRUCTURE.md
  
${colors.cyan}工作区位置:${colors.reset}
  ${colors.yellow}${WORKSPACE_DIR}${colors.reset}
`)

  // 询问是否立即启动
  console.log(`${colors.yellow}是否立即启动系统？ (y/n)${colors.reset}`)
  
  // 注意：由于是非交互模式，这里跳过询问
  // 用户可以手动启动
  
  process.exit(0)
}

// 运行
main().catch((error) => {
  console.error(`${colors.red}安装失败:${colors.reset}`, error)
  process.exit(1)
})
