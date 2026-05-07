/**
 * 工作流库入口
 */

export * from './types'
export { EcommerceWorkflowEngine, createWorkflowEngine } from './engine'
export type { WorkflowEngineConfig } from './engine'

export { pinduoduoProductListingWorkflow } from './pinduoduo/product-listing'
export { douyinProductListingWorkflow } from './douyin/product-listing'

import { pinduoduoProductListingWorkflow } from './pinduoduo/product-listing'
import { douyinProductListingWorkflow } from './douyin/product-listing'
import type { WorkflowDefinition } from './types'

export const WORKFLOWS: Record<string, WorkflowDefinition> = {
  'pinduoduo-product-listing': pinduoduoProductListingWorkflow,
  'douyin-product-listing': douyinProductListingWorkflow,
}

export function getWorkflow(platform: string, workflowName: string): WorkflowDefinition | undefined {
  const key = `${platform}-${workflowName}`
  return WORKFLOWS[key]
}

export function getWorkflowsByPlatform(platform: string): WorkflowDefinition[] {
  return Object.values(WORKFLOWS).filter(w => w.platform === platform)
}
