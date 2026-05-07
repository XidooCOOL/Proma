---
name: order-management
description: 电商平台订单处理技能，支持批量发货、退款处理
version: "2.0.0"
---

# 订单管理技能

## 功能概述
使用 `manage_orders` 工具管理电商平台订单。支持：
- 查看订单列表
- 批量发货
- 处理退款

## 可用工具

### manage_orders
批量处理订单。

**参数：**
```json
{
  "platform": "pinduoduo | douyin | taobao | jd",
  "action": "list | ship | refund",
  "order_ids": ["订单ID1", "订单ID2"],
  "profile_id": "店铺Profile ID"
}
```

**action 说明：**
- `list`: 查看订单列表
- `ship`: 批量发货（需要 order_ids）
- `refund`: 处理退款（需要 order_ids）

**示例调用：**
```
工具: manage_orders
参数: {
  "platform": "douyin",
  "action": "list"
}
```

### check_store_status
检查店铺登录状态。

**参数：**
```json
{
  "platform": "pinduoduo | douyin | taobao | jd",
  "profile_id": "店铺Profile ID"
}
```

## 典型场景

### 场景1：查看今日订单
用户说："帮我看看今天有哪些新订单"

你应该：
1. 调用 `manage_orders` 工具
2. action: "list"
3. platform: 根据用户店铺确定

### 场景2：批量发货
用户说："帮我发货这些订单：order001, order002, order003"

你应该：
1. 调用 `check_store_status` 确认店铺已登录
2. 调用 `manage_orders` 工具
3. action: "ship"
4. order_ids: ["order001", "order002", "order003"]

### 场景3：处理退款
用户说："处理这些退款：order004, order005"

你应该：
1. 调用 `manage_orders` 工具
2. action: "refund"
3. order_ids: ["order004", "order005"]

### 场景4：检查登录状态
用户说："我的拼多多店铺还能用吗？"

你应该：
1. 调用 `check_store_status` 工具
2. platform: "pinduoduo"

## 返回数据格式

### list 订单列表
```json
{
  "success": true,
  "action": "list",
  "orders": [
    {
      "order_id": "order001",
      "status": "paid",
      "amount": 99.00,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 10
}
```

### ship 批量发货
```json
{
  "success": true,
  "action": "ship",
  "shipped": 3,
  "failed": 0
}
```

## 支持的平台

| 平台 | platform 值 |
|------|-------------|
| 拼多多 | pinduoduo |
| 抖音 | douyin |
| 淘宝 | taobao |
| 京东 | jd |

## 注意事项

- 发货前请先检查店铺登录状态
- order_ids 为空时会对所有待发货订单操作
- 多店铺时请使用对应的 profile_id
