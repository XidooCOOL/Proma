/**
 * 抖音上架商品工作流
 */

import { WorkflowDefinition } from '../types'

export const douyinProductListingWorkflow: WorkflowDefinition = {
  id: 'douyin-product-listing',
  name: '抖音上架商品',
  platform: 'douyin',
  version: '1.0.0',
  description: '在抖音电商平台发布新商品',
  
  inputSchema: {
    type: 'object',
    properties: {
      product: { type: 'object', description: '商品信息', required: true },
      options: { type: 'object', description: '选项配置' },
    },
  },
  
  steps: [
    {
      id: 'goto-backend',
      name: '打开后台',
      action: 'goto',
      description: '打开抖音电商后台',
    },
    
    {
      id: 'wait-page-load',
      name: '等待页面加载',
      action: 'waitForSelector',
      selector: {
        ref: 'productTitleInput',
      },
      params: {
        timeout: 15000,
      },
      description: '等待页面加载',
    },
    
    {
      id: 'fill-title',
      name: '填写标题',
      action: 'fill',
      selector: {
        ref: 'productTitleInput',
      },
      data: {
        path: 'product.title',
        required: true,
      },
      description: '填写商品标题',
    },
    
    {
      id: 'select-category',
      name: '选择类目',
      action: 'click',
      selector: {
        ref: 'categorySelect',
      },
      data: {
        path: 'product.category',
      },
      description: '选择类目',
    },
    
    {
      id: 'fill-price',
      name: '填写价格',
      action: 'fill',
      selector: {
        ref: 'priceInput',
      },
      data: {
        path: 'product.price',
        required: true,
        transform: (value) => String(value),
      },
      description: '填写价格',
    },
    
    {
      id: 'fill-stock',
      name: '填写库存',
      action: 'fill',
      selector: {
        ref: 'stockInput',
      },
      data: {
        path: 'product.stock',
        defaultValue: 100,
        transform: (value) => String(value ?? 100),
      },
      description: '填写库存',
    },
    
    {
      id: 'upload-cover',
      name: '上传封面图',
      action: 'upload',
      selector: {
        ref: 'coverImageUpload',
      },
      data: {
        path: 'product.coverImage',
        required: true,
      },
      params: {
        timeout: 30000,
      },
      retry: {
        maxRetries: 3,
        delay: 2000,
      },
      description: '上传封面图',
    },
    
    {
      id: 'upload-images',
      name: '上传图片',
      action: 'upload',
      selector: {
        ref: 'detailImageUpload',
      },
      data: {
        path: 'product.images',
      },
      params: {
        timeout: 60000,
        sequential: true,
      },
      condition: {
        type: 'data',
        expression: 'product.images != null && product.images.length > 0',
        ifFalse: 'skip',
      },
      description: '上传商品图片',
    },
    
    {
      id: 'upload-video',
      name: '上传视频',
      action: 'upload',
      selector: {
        ref: 'videoUpload',
      },
      data: {
        path: 'product.video',
      },
      params: {
        timeout: 120000,
      },
      condition: {
        type: 'data',
        expression: 'product.video != null',
        ifFalse: 'skip',
      },
      retry: {
        maxRetries: 2,
        delay: 5000,
      },
      description: '上传商品视频',
    },
    
    {
      id: 'wait-upload',
      name: '等待上传完成',
      action: 'waitForHidden',
      selector: {
        ref: 'uploadProgress',
      },
      params: {
        timeout: 120000,
      },
      description: '等待上传完成',
    },
    
    {
      id: 'submit',
      name: '提交审核',
      action: 'click',
      selector: {
        ref: 'submitButton',
      },
      condition: {
        type: 'data',
        expression: 'options.saveDraft != true',
        ifFalse: 'skip',
      },
      description: '提交审核',
    },
    
    {
      id: 'save-draft',
      name: '保存草稿',
      action: 'click',
      selector: {
        ref: 'saveDraftButton',
      },
      condition: {
        type: 'data',
        expression: 'options.saveDraft == true',
        ifFalse: 'skip',
      },
      description: '保存草稿',
    },
    
    {
      id: 'screenshot',
      name: '截图',
      action: 'screenshot',
      params: {
        screenshotName: 'douyin-listing-result',
      },
      description: '保存结果截图',
    },
  ],
  
  onComplete: {
    screenshot: true,
  },
  
  metadata: {
    author: 'E-commerce Automation',
    createdAt: '2024-01-15',
    tags: ['douyin', 'product', 'listing'],
  },
}
