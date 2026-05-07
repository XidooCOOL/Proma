---
name: inventory-management
description: 电商平台库存和价格管理技能，支持批量更新
version: "2.0.0"
---

# 库存管理技能

## 功能概述
使用 `update_inventory` 工具批量更新商品库存和价格。

## 可用工具

### update_inventory
批量更新商品库存和价格。

**参数：**
```json
{
  "platform": "pinduoduo | douyin | taobao | jd",
  "items": [
    {
      "product_id": "商品ID",
      "stock": 100,
      "price": 89.00
    }
  ],
  "profile_id": "店铺Profile ID"
}
```

**示例调用：**
```
工具: update_inventory
参数: {
  "platform": "douyin",
  "items": [
    {
      "product_id": "prod_001",
      "stock": 50,
      "price": 79.00
    }
  ]
}
```

## 典型场景

### 场景1：批量更新库存
用户说："帮我把这些商品的库存都改成50件"

你应该：
1. 调用 `update_inventory` 工具
2. platform: 根据用户店铺确定
3. items: 包含所有商品ID和新库存

### 场景2：批量调整价格
用户说："把所有商品价格调低10元"

你应该：
1. 获取当前商品列表和价格
2. 计算新价格
3. 调用 `update_inventory` 批量更新

### 场景3：同时更新库存和价格
用户说："商品A库存改成100，价格改成59"

你应该：
1. 调用 `update_inventory` 工具
2. items: 包含 stock 和 price

## 支持的平台

| 平台 | platform 值 |
|------|-------------|
| 拼多多 | pinduoduo |
| 抖音 | douyin |
| 淘宝 | taobao |
| 京东 | jd |

## 注意事项

- 只更新传入的字段，不传的字段保持不变
- 多店铺时请使用对应的 profile_id
- 价格单位为元
