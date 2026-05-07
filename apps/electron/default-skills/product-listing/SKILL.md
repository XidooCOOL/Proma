---
name: product-listing
description: 电商平台商品上架技能，支持多平台批量上架商品
version: "2.0.0"
---

# 商品上架技能

## 功能概述
使用 `list_product` 工具上架商品到电商平台。支持：
- 单个或批量上架
- 多平台同时上架
- 多店铺隔离

## 可用工具

### list_product
上架商品到电商平台。

**参数：**
```json
{
  "platform": "pinduoduo | douyin | taobao | jd | kuaishou",
  "products": [
    {
      "title": "商品标题",
      "price": 99.00,
      "description": "商品描述",
      "images": ["图片URL"],
      "category": "类目",
      "stock": 100
    }
  ],
  "profile_id": "店铺Profile ID"
}
```

**示例调用：**
```
工具: list_product
参数: {
  "platform": "douyin",
  "products": [
    {
      "title": "2024新款女装连衣裙",
      "price": 99.00,
      "description": "韩版修身显瘦",
      "stock": 100
    }
  ]
}
```

## 典型场景

### 场景1：上架单个商品到抖音
用户说："帮我上架这个商品到抖音，标题是夏季短袖，价格59元"

你应该：
1. 调用 `list_product` 工具
2. platform: "douyin"
3. products: 包含用户提供的商品信息

### 场景2：批量上架到多个平台
用户说："帮我把这3个商品同时上架到拼多多和抖音"

你应该：
1. 调用 `list_product` 工具 (platform: "pinduoduo")
2. 调用 `list_product` 工具 (platform: "douyin")
3. 两个调用并行执行

### 场景3：指定店铺上架
用户说："上架到我的拼多多店铺A"

你应该：
1. 先确认店铺对应的 profile_id
2. 调用 `list_product` 时传入 profile_id

## 支持的平台

| 平台 | platform 值 | 说明 |
|------|-------------|------|
| 拼多多 | pinduoduo | 拼多多商家后台 |
| 抖音 | douyin | 抖音电商 creator 平台 |
| 淘宝 | taobao | 淘宝卖家中心 |
| 京东 | jd | 京东商家后台 |
| 快手 | kuaishou | 快手电商 |

## 错误处理

如果上架失败，检查：
1. 店铺是否已登录（使用 check_store_status）
2. 商品信息是否完整
3. 图片是否可用

## 注意事项

- price 必须是数字，单位为元
- 图片建议使用网络URL
- 部分平台需要审核才能上架
- 多店铺时请使用对应的 profile_id
