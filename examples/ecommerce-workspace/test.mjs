#!/usr/bin/env node

/**
 * 快速测试脚本
 * 
 * 运行各种测试场景
 */

import { TaskOrchestrator } from './orchestrator.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3000'

async function testBasicListing() {
  console.log('\n========== 测试 1: 基础商品上架 ==========\n')
  
  const orchestrator = new TaskOrchestrator()
  
  orchestrator.on('task-progress', ({ taskId, progress, message }) => {
    console.log(`📊 ${taskId}: ${progress}% - ${message}`)
  })

  orchestrator.on('task-complete', ({ task }) => {
    console.log(`✅ 任务完成: ${task.id}`)
  })

  orchestrator.on('session-complete', ({ session }) => {
    console.log('\n🏁 会话完成！')
    const report = orchestrator.generateReport(session.id)
    console.log('\n📋 报告:')
    console.log(JSON.stringify(report, null, 2))
  })

  const session = await orchestrator.processUserRequest(
    '帮我上架商品到抖音：女装连衣裙，价格199元'
  )
  
  console.log('会话 ID:', session.id)
  
  // 等待完成
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  orchestrator.destroy()
}

async function testMultiPlatform() {
  console.log('\n========== 测试 2: 多平台上架 ==========\n')
  
  const orchestrator = new TaskOrchestrator()
  
  orchestrator.on('task-progress', ({ taskId, progress, message }) => {
    console.log(`📊 ${taskId}: ${progress}% - ${message}`)
  })

  orchestrator.on('session-complete', ({ session }) => {
    console.log('\n🏁 会话完成！')
    const report = orchestrator.generateReport(session.id)
    console.log('\n📋 报告:')
    console.log(JSON.stringify(report, null, 2))
  })

  const session = await orchestrator.processUserRequest(
    '帮我上架这2个商品到抖音和拼多多：商品A（女装，价格199）和商品B（运动鞋，价格299）'
  )
  
  console.log('会话 ID:', session.id)
  
  // 等待完成
  await new Promise(resolve => setTimeout(resolve, 15000))
  
  orchestrator.destroy()
}

async function testMixedTasks() {
  console.log('\n========== 测试 3: 混合任务 ==========\n')
  
  const orchestrator = new TaskOrchestrator()
  
  orchestrator.on('task-progress', ({ taskId, progress, message }) => {
    console.log(`📊 ${taskId}: ${progress}% - ${message}`)
  })

  orchestrator.on('session-complete', ({ session }) => {
    console.log('\n🏁 会话完成！')
    const report = orchestrator.generateReport(session.id)
    console.log('\n📋 报告:')
    console.log(JSON.stringify(report, null, 2))
  })

  const session = await orchestrator.processUserRequest(
    '帮我上架商品到抖音和拼多多，同时去小红书采集女装爆款文案'
  )
  
  console.log('会话 ID:', session.id)
  
  // 等待完成
  await new Promise(resolve => setTimeout(resolve, 20000))
  
  orchestrator.destroy()
}

async function main() {
  const args = process.argv.slice(2)
  const testName = args[0] || 'all'

  console.log('🚀 电商多任务并行系统测试')
  console.log('='.repeat(50))
  
  try {
    switch (testName) {
      case '1':
      case 'basic':
        await testBasicListing()
        break
      
      case '2':
      case 'multi':
        await testMultiPlatform()
        break
      
      case '3':
      case 'mixed':
        await testMixedTasks()
        break
      
      case 'all':
        await testBasicListing()
        await testMultiPlatform()
        await testMixedTasks()
        break
      
      default:
        console.log(`未知测试: ${testName}`)
        console.log('可用测试:')
        console.log('  1, basic  - 基础商品上架')
        console.log('  2, multi  - 多平台上架')
        console.log('  3, mixed  - 混合任务')
        console.log('  all       - 运行所有测试')
    }
  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }

  console.log('\n✅ 所有测试完成！')
}

main()
