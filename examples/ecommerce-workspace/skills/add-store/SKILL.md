---
name: add-store
description: 添加新的电商店铺
version: "1.0.0"
---

# 添加新店铺

## 功能
- 创建新的工作区
- 配置 Playwright MCP
- 初始化浏览器 Profile
- 引导用户完成登录

## 使用方法

### 添加拼多多店铺
```
请帮我添加一个拼多多店铺，名称是"我的拼多多店"
```

### 添加抖音店铺
```
请帮我添加一个抖音店铺，名称是"我的抖音店"
```

## 执行步骤

1. 调用 `create_workspace` 创建工作区
2. 配置 `mcp.json` 应用 Playwright MCP
3. 调用 Playwright MCP 打开登录页面
4. 等待用户完成登录
5. 验证登录状态
6. 保存登录信息

## 注意事项
- 不同平台需要不同的登录 URL
- 登录后需要等待 Cookie 保存完成
