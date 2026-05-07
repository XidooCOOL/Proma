/**
 * 电商多任务并行系统 - 使用示例
 * 
 * 展示如何使用任务编排器
 */

import { TaskOrchestrator } from './orchestrator'

async function main() {
  // 1. 创建编排器
  const orchestrator = new TaskOrchestrator()

  // 2. 监听事件
  orchestrator.on('session-start', ({ sessionId, intent }) => {
    console.log(`🚀 会话开始: ${sessionId}`)
    console.log('意图:', JSON.stringify(intent, null, 2))
  })

  orchestrator.on('task-start', ({ task }) => {
    console.log(`▶️ 任务开始: ${task.id} (${task.action})`)
  })

  orchestrator.on('task-progress', ({ taskId, progress, message }) => {
    console.log(`📊 进度: ${taskId} - ${progress}% - ${message}`)
  })

  orchestrator.on('task-complete', ({ task }) => {
    console.log(`✅ 任务完成: ${task.id}`)
    if (task.result?.data) {
      console.log('结果:', task.result.data)
    }
  })

  orchestrator.on('group-complete', ({ group }) => {
    console.log(`🎉 任务组完成: ${group.name}`)
  })

  orchestrator.on('session-complete', ({ session }) => {
    console.log(`🏁 会话完成: ${session.id}`)
    
    // 生成报告
    const report = orchestrator.generateReport(session.id)
    console.log('\n========== 最终报告 ==========')
    console.log(JSON.stringify(report, null, 2))
  })

  orchestrator.on('error', (error) => {
    console.error('❌ 错误:', error)
  })

  // 3. 处理用户请求
  console.log('\n========== 测试场景1: 商品上架 ==========')
  const session1 = await orchestrator.processUserRequest(
    '帮我上架这2个商品到抖音和拼多多：商品1（价格99）、商品2（价格199）'
  )
  console.log('会话1 ID:', session1.id)

  // 等待完成
  await new Promise(resolve => setTimeout(resolve, 5000))

  console.log('\n========== 测试场景2: 商品上架 + 文案采集 ==========')
  const session2 = await orchestrator.processUserRequest(
    '帮我上架这个商品到抖音和拼多多，同时去小红书采集最近爆款的女装文案'
  )
  console.log('会话2 ID:', session2.id)

  // 4. 获取会话状态
  const allSessions = orchestrator.getAllSessions()
  console.log('\n========== 所有会话 ==========')
  console.log('会话数量:', allSessions.length)

  // 5. 获取报告
  const report2 = orchestrator.generateReport(session2.id)
  console.log('\n========== 会话2报告 ==========')
  console.log(JSON.stringify(report2, null, 2))

  // 6. 清理
  orchestrator.destroy()
}

// 运行示例
main().catch(console.error)
