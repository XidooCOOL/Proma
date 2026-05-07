/**
 * 拼多多上架商品工作流
 * 
 * 完整的上架流程：
 * 1. 打开商品发布页面
 * 2. 填写商品标题
 * 3. 选择商品类目
 * 4. 填写价格
 * 5. 填写库存
 * 6. 上传主图
 * 7. 上传详情图
 * 8. 选择运费模板
 * 9. 提交审核
 */

import { WorkflowDefinition } from '../types'

export const pinduoduoProductListingWorkflow: WorkflowDefinition = {
  id: 'pinduoduo-product-listing',
  name: '拼多多上架商品',
  platform: 'pinduoduo',
  version: '1.0.0',
  description: '在拼多多商家后台发布新商品',
  
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
      params: {
        timeout: 30000,
      },
      description: '打开拼多多商家后台商品发布页面',
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
        waitForVisible: true,
      },
      description: '等待商品标题输入框出现',
    },
    
    {
      id: 'fill-title',
      name: '填写商品标题',
      action: 'fill',
      selector: {
        ref: 'productTitleInput',
      },
      data: {
        path: 'product.title',
        required: true,
      },
      params: {
        timeout: 5000,
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
      params: {
        timeout: 5000,
      },
      description: '点击类目选择器',
    },
    
    {
      id: 'select-category-option',
      name: '选择具体类目',
      action: 'click',
      selector: {
        ref: 'categoryOption',
      },
      params: {
        timeout: 5000,
      },
      condition: {
        type: 'data',
        expression: 'product.category != null',
        ifFalse: 'skip',
      },
      description: '选择类目选项',
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
      params: {
        timeout: 5000,
      },
      description: '填写商品价格',
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
      params: {
        timeout: 5000,
      },
      description: '填写商品库存',
    },
    
    {
      id: 'fill-description',
      name: '填写描述',
      action: 'fill',
      selector: {
        ref: 'productDescription',
      },
      data: {
        path: 'product.description',
      },
      params: {
        timeout: 5000,
      },
      condition: {
        type: 'data',
        expression: 'product.description != null',
        ifFalse: 'skip',
      },
      description: '填写商品描述',
    },
    
    {
      id: 'upload-main-image',
      name: '上传主图',
      action: 'upload',
      selector: {
        ref: 'mainImageUpload',
      },
      data: {
        path: 'product.images.0',
        required: true,
      },
      params: {
        timeout: 30000,
        waitForCondition: 'hidden',
      },
      retry: {
        maxRetries: 3,
        delay: 2000,
      },
      description: '上传商品主图',
    },
    
    {
      id: 'wait-upload-complete',
      name: '等待上传完成',
      action: 'waitForHidden',
      selector: {
        ref: 'uploadProgress',
      },
      params: {
        timeout: 30000,
      },
      description: '等待图片上传完成',
    },
    
    {
      id: 'upload-detail-images',
      name: '上传详情图',
      action: 'upload',
      selector: {
        ref: 'detailImageUpload',
      },
      data: {
        path: 'product.detailImages',
        transform: (value) => value || [],
      },
      params: {
        timeout: 60000,
        sequential: true,
      },
      condition: {
        type: 'data',
        expression: 'product.detailImages != null && product.detailImages.length > 0',
        ifFalse: 'skip',
      },
      retry: {
        maxRetries: 2,
        delay: 1000,
      },
      description: '上传商品详情图片',
    },
    
    {
      id: 'wait-detail-upload',
      name: '等待详情图上传',
      action: 'waitForHidden',
      selector: {
        ref: 'uploadProgress',
      },
      params: {
        timeout: 60000,
      },
      condition: {
        type: 'data',
        expression: 'product.detailImages != null && product.detailImages.length > 0',
        ifFalse: 'skip',
      },
      description: '等待详情图片上传完成',
    },
    
    {
      id: 'select-freight',
      name: '选择运费模板',
      action: 'select',
      selector: {
        ref: 'freightSelect',
      },
      params: {
        timeout: 5000,
      },
      description: '选择运费模板',
    },
    
    {
      id: 'preview-product',
      name: '预览商品',
      action: 'click',
      selector: {
        ref: 'previewButton',
      },
      params: {
        timeout: 5000,
      },
      condition: {
        type: 'data',
        expression: 'options.preview == true',
        ifFalse: 'skip',
      },
      description: '点击预览按钮',
    },
    
    {
      id: 'submit-product',
      name: '提交商品',
      action: 'click',
      selector: {
        ref: 'submitButton',
      },
      params: {
        timeout: 10000,
        waitForVisible: true,
      },
      condition: {
        type: 'data',
        expression: 'options.saveDraft != true',
        ifFalse: 'skip',
      },
      description: '点击提交按钮',
    },
    
    {
      id: 'save-draft',
      name: '保存草稿',
      action: 'click',
      selector: {
        ref: 'saveDraftButton',
      },
      params: {
        timeout: 5000,
      },
      condition: {
        type: 'data',
        expression: 'options.saveDraft == true',
        ifFalse: 'skip',
      },
      description: '点击保存草稿',
    },
    
    {
      id: 'handle-confirm-dialog',
      name: '处理确认弹窗',
      action: 'dialog',
      selector: {
        ref: 'confirmDialog',
      },
      params: {
        timeout: 5000,
      },
      condition: {
        type: 'selector',
        expression: 'confirmDialog',
        ifFalse: 'skip',
      },
      description: '如果有确认弹窗，点击确定',
    },
    
    {
      id: 'click-confirm-ok',
      name: '确认提交',
      action: 'click',
      selector: {
        ref: 'confirmDialogOk',
      },
      params: {
        timeout: 5000,
      },
      condition: {
        type: 'selector',
        expression: 'confirmDialogOk',
        ifFalse: 'skip',
      },
      description: '点击确认按钮',
    },
    
    {
      id: 'wait-success',
      name: '等待成功提示',
      action: 'waitForSelector',
      selector: {
        ref: 'successToast',
      },
      params: {
        timeout: 15000,
        waitForVisible: true,
      },
      description: '等待成功提示出现',
    },
    
    {
      id: 'screenshot-result',
      name: '截图结果',
      action: 'screenshot',
      params: {
        screenshotName: 'listing-result',
      },
      description: '保存结果截图',
    },
  ],
  
  onComplete: {
    screenshot: true,
    closePage: false,
  },
  
  metadata: {
    author: 'E-commerce Automation',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    tags: ['pinduoduo', 'product', 'listing'],
  },
}
