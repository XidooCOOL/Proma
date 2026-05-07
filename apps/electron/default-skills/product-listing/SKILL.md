---
name: product-listing
description: 电商平台商品上架自动化，支持拼多多、抖音等平台
version: "1.0.0"
---

# 商品上架助手

## 功能
- 自动填写商品信息
- 上传商品图片
- 选择商品分类
- 填写商品描述
- 批量上架多个商品

## 支持平台
- 拼多多商家后台
- 抖音电商后台
- 淘宝卖家中心
- 京东商家后台

## 使用方法

### 简单上架
```
请帮我上架这个商品：
- 标题：2024新款女装连衣裙
- 价格：99元
- 库存：100件
- 图片：/Users/you/products/dress.jpg
```

### 批量上架
```
请帮我批量上架 /Users/you/products/ 目录下的所有商品
```

## 执行流程

### Step 1: 准备工作
- 检查登录状态
- 打开商品发布页面

### Step 2: 填写基本信息
- 商品标题（必填）
- 商品价格（必填）
- 商品库存（必填）

### Step 3: 上传图片
- 主图（必填）
- 详情图（可选）

### Step 4: 选择分类
- 一级分类
- 二级分类
- 三级分类

### Step 5: 填写详情
- 商品描述
- 规格参数
- 售后服务

### Step 6: 提交发布
- 检查必填项
- 提交审核
- 确认成功

## 平台特定 URL

| 平台 | 发布商品 URL |
|------|-------------|
| 拼多多 | https://mms.pinduoduo.com/goods/add |
| 抖音 | https://partner.douyin.com/goods/add |
| 淘宝 | https://upload.taobao.com/auction/publish |
| 京东 | https://seller.jd.com/product/add |

## 注意事项
- 不同平台字段名称可能不同
- 图片尺寸要求可能不同
- 部分平台需要审核
