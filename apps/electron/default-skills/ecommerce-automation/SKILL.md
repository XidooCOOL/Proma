---
name: ecommerce-automation
description: 电商自动化综合指南，集成商品上架、内容采集、订单管理、库存管理
version: "2.0.0"
---

# 电商自动化综合指南

## 架构说明

本系统采用 **Proma Agent 负责理解 + MCP Server 负责执行** 的架构：

```
用户输入 → Proma Agent (LLM理解意图) → 拆解任务 → 调用 MCP 工具
                                                           ↓
                                                    电商 MCP Server
                                                    (Browser自动化)
                                                           ↓
                                                    电商平台操作
```

## 工具一览

| 工具 | 功能 | 使用场景 |
|------|------|----------|
| list_product | 上架商品 | 用户要上架商品时 |
| collect_trends | 采集内容 | 用户要采集爆款文案时 |
| manage_orders | 订单管理 | 用户要处理订单时 |
| update_inventory | 库存管理 | 用户要更新库存价格时 |
| check_store_status | 检查登录 | 操作前确认店铺状态 |
| login_store | 店铺登录 | 店铺未登录时打开登录页 |

## 典型对话示例

### 示例1：批量上架 + 采集参考
**用户说：**
> "帮我上架10个女装商品到抖音和拼多多，先去小红书采集一些爆款标题参考"

**Agent 思维链：**
1. 用户想要两个操作：采集小红书爆款标题，然后上架商品
2. 先调用 `collect_trends` 采集小红书女装爆款
3. 根据采集结果生成商品标题
4. 并行调用 `list_product` 到抖音和拼多多

**执行：**
```
1. collect_trends(source="xiaohongshu", keywords=["女装"], count=20)
2. list_product(platform="douyin", products=[...])
3. list_product(platform="pinduoduo", products=[...])
```

### 示例2：多任务并行
**用户说：**
> "帮我上架这批新品到抖音，同时去采集竞品内容，库存也更新一下"

**Agent 思维链：**
1. 三个独立任务可以并行执行
2. 调用 `list_product` 上架新品
3. 调用 `collect_trends` 采集竞品
4. 调用 `update_inventory` 更新库存

**执行：**
```
并行执行：
1. list_product(platform="douyin", products=[...])
2. collect_trends(source="xiaohongshu", keywords=["竞品"], count=10)
3. update_inventory(platform="douyin", items=[...])
```

### 示例3：检查后执行
**用户说：**
> "帮我发货这些订单"

**Agent 思维链：**
1. 发货前先检查店铺登录状态
2. 如果已登录，执行发货
3. 如果未登录，引导用户登录

**执行：**
```
1. check_store_status(platform="douyin")
   - 如果 logged_in: true → manage_orders(action="ship", ...)
   - 如果 logged_in: false → login_store(platform="douyin")
```

## 工具使用优先级

1. **理解用户意图** - 这是 Proma Agent 的工作（使用 LLM）
2. **调用对应工具** - 根据意图调用相应的 MCP 工具
3. **返回执行结果** - 工具返回结构化结果
4. **解释给用户** - Agent 用自然语言解释结果

## 注意事项

- 所有平台参数使用英文值：pinduoduo, douyin, taobao, jd, kuaishou
- 店铺隔离通过 profile_id 实现
- 图片建议使用网络URL
- 订单和商品操作前检查店铺登录状态

## 错误处理

如果工具返回错误：
1. 检查错误信息
2. 常见问题：
   - "没有可用的运营 Worker" → 重试
   - "不支持的平台" → 确认平台参数
   - 店铺未登录 → 引导用户登录

## 完整工具列表

### list_product
上架商品到电商平台
- platform: pinduoduo | douyin | taobao | jd | kuaishou
- products: 商品数组
- profile_id: 可选，指定店铺

### collect_trends
采集社交平台热门内容
- source: xiaohongshu | douyin | weibo | bilibili
- keywords: 关键词数组
- count: 采集数量
- content_type: video | image | text

### manage_orders
订单管理
- platform: pinduoduo | douyin | taobao | jd
- action: list | ship | refund
- order_ids: 订单ID数组

### update_inventory
库存价格更新
- platform: pinduoduo | douyin | taobao | jd
- items: 商品更新数组
- profile_id: 可选，指定店铺

### check_store_status
检查店铺登录状态
- platform: pinduoduo | douyin | taobao | jd
- profile_id: 可选，指定店铺

### login_store
打开店铺登录页面
- platform: pinduoduo | douyin | taobao | jd
- profile_id: 可选，指定店铺
