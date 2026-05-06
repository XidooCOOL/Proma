# 电商自动化工作区配置示例

这是一个基于 Proma + Playwright 的电商自动化工作区配置示例。

## 目录结构

```
.
├── mcp.json                      # MCP 服务器配置
├── config.json                   # 工作区配置
├── skills/
│   └── ecommerce-automation/
│       └── SKILL.md             # 电商自动化 Skill
├── browser-profile/             # 浏览器 Profile (运行时创建)
├── workspace-files/             # 工作区文件
└── screenshots/                 # 截图保存目录
```

## 快速开始

### 1. 创建工作区

在 Proma 中创建一个新的 Agent 工作区，命名为"拼多多店铺 A"。

### 2. 复制配置文件

将此目录下的文件复制到：
```
~/.proma/agent-workspaces/pdd-store-a/
```

### 3. 配置浏览器 Profile

1. 在 Proma 中打开工作区
2. 启动 Playwright MCP 服务器
3. 使用 Playwright 工具登录拼多多商家后台
4. 登录状态会自动保存到 `browser-profile/` 目录

### 4. 开始使用

使用自然语言指令：
- "帮我检查今天的订单"
- "把这个商品上架"
- "导出昨天的销售数据"

## Playwright MCP 工具说明

### 常用工具

- `playwright_navigate` - 导航到 URL
- `playwright_click` - 点击元素
- `playwright_fill` - 填写表单
- `playwright_select` - 选择下拉框
- `playwright_screenshot` - 截图
- `playwright_get_text` - 获取文本内容
- `playwright_evaluate` - 执行 JavaScript

## 安全建议

1. **加密存储**：不要在配置文件中存储密码
2. **权限控制**：使用 Proma 的权限控制功能
3. **操作审计**：所有操作都会记录日志
4. **Profile 备份**：定期备份浏览器 Profile

## 进阶用法

### 集成 LangChain (可选)

如果需要更强大的 AI 能力，可以额外配置 LangChain MCP 服务器：

```json
{
  "servers": {
    "playwright": {...},
    "langchain": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "your-langchain-mcp-server"],
      "enabled": true
    }
  }
}
```

## 故障排除

### MCP 服务器启动失败

确保已安装 Node.js 和 npm：
```bash
node --version
npm --version
```

### 浏览器无法启动

检查 Playwright 浏览器是否已安装：
```bash
npx playwright install chromium
```
