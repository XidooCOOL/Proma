# Proma 电商自动化示例

本目录包含基于 Proma + Playwright 的电商自动化配置示例。

## 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| 桌面应用 | Proma | 本地优先，工作区隔离 |
| 浏览器自动化 | Playwright | 微软官方，稳定可靠 |
| MCP 协议 | Model Context Protocol | 标准化工具集成 |
| (可选) AI 编排 | LangChain | 复杂任务编排，RAG |

## 快速开始

### 1. 了解架构

- 每个电商店铺 = 一个 Proma 工作区
- 每个工作区有独立的浏览器 Profile
- 每个工作区配置独立的 MCP 服务器

### 2. 配置工作区

查看 [ecommerce-workspace/](./ecommerce-workspace/) 目录下的示例配置。

### 3. 配置步骤

1. 在 Proma 中创建新的 Agent 工作区
2. 复制示例配置到工作区目录
3. 配置浏览器 Profile（登录店铺）
4. 开始使用自然语言指令

## 为什么选择这个方案？

### Proma 的优势
- ✅ 本地优先，数据安全
- ✅ 工作区隔离，多店铺管理方便
- ✅ Skills 系统，能力沉淀
- ✅ MCP 协议，标准化集成

### Playwright 的优势
- ✅ 微软官方支持，稳定可靠
- ✅ 跨浏览器，生态完善
- ✅ 企业级应用验证
- ✅ 调试工具完善

## 方案对比

| 方案 | 稳定性 | 功能 | 成本 |
|------|--------|------|------|
| **Proma + Playwright** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 免费 |
| Proma + PagePilot | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 可能付费 |
| 实在Agent | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 商业产品 |
| Accio Work | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 商业产品 |

## 进阶配置

### 反爬虫增强

可以配合 `playwright-extra` 和 `puppeteer-extra-plugin-stealth` 使用。

### LangChain 集成

如需更强大的 AI 能力，可以添加 LangChain MCP 服务器。

## 目录说明

```
examples/
├── README.md                    # 本文档
└── ecommerce-workspace/        # 电商工作区示例
    ├── README.md               # 工作区使用说明
    ├── mcp.json                # MCP 配置
    ├── config.json             # 工作区配置
    └── skills/
        └── ecommerce-automation/
            └── SKILL.md        # 电商自动化 Skill
```

## 常见问题

### Q: Playwright 和 Puppeteer 怎么选？
A: 推荐 Playwright，API 更友好，跨浏览器支持更好，微软官方支持。

### Q: 需要学习代码吗？
A: 基础使用不需要，用自然语言指令即可。复杂定制需要写一些 Playwright 脚本。

### Q: 多店铺怎么管理？
A: 每个店铺一个 Proma 工作区，独立的浏览器 Profile。

## 相关链接

- [Proma 官方文档](../../README.md)
- [Playwright 文档](https://playwright.dev/)
- [MCP 协议](https://modelcontextprotocol.io/)
