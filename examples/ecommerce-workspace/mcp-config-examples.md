# Playwright MCP 配置示例

本目录包含多种 Playwright MCP 配置，适用于不同的电商场景。

## 目录

- [基础配置](#基础配置)
- [电商优化配置](#电商优化配置)
- [浏览器 Profile 配置](#浏览器-profile-配置)
- [无头模式配置](#无头模式配置)
- [全局默认配置](#全局默认配置)

---

## 基础配置

**文件**: `mcp.basic.json`

最简单的配置，适合快速测试：

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "enabled": true
    }
  }
}
```

---

## 电商优化配置

**文件**: `mcp.json` (当前推荐)

专为电商场景优化的配置：

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", 
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--no-sandbox"
      ],
      "enabled": true,
      "description": "Playwright 浏览器自动化，用于电商操作"
    }
  }
}
```

### 参数说明

- `--browser chrome`: 使用 Chrome 浏览器（兼容性最好）
- `--no-sandbox`: 禁用沙箱（避免部分系统的权限问题）

---

## 浏览器 Profile 配置

**文件**: `mcp.with-vars.json`（推荐）

保存登录状态，避免每次都重新登录：

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", 
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--no-sandbox"
      ],
      "enabled": true,
      "description": "Playwright 浏览器自动化，持久化登录状态",
      "env": {
        "PLAYWRIGHT_USER_DATA_DIR": "{{workspaceDir}}/browser-profile"
      }
    }
  }
}
```

### 支持的路径变量

Proma 支持在 MCP 配置中使用路径变量，这样你不需要写死绝对路径：

| 变量 | 说明 |
|------|------|
| `{{workspaceDir}}` | 当前工作区的绝对路径 |
| `{{workspaceSlug}}` | 当前工作区的唯一标识符 |

### 工作原理

每个工作区的 `mcp.json` 都会被 Proma 独立加载：
- 打开店铺 A → 加载 `~/.proma/agent-workspaces/pdd-store-a/mcp.json`
- `{{workspaceDir}}` 自动替换为 `~/.proma/agent-workspaces/pdd-store-a`
- `browser-profile` 目录就变成了 `~/.proma/agent-workspaces/pdd-store-a/browser-profile`
- 店铺 A 的登录状态只会保存在这个目录里

### 完全隔离

店铺 A 的 MCP 配置和浏览器 Profile：
```
~/.proma/agent-workspaces/pdd-store-a/
├── mcp.json          → 配置指向 {{workspaceDir}}/browser-profile
└── browser-profile/  → 店铺 A 的登录 Cookie
```

店铺 B 的 MCP 配置和浏览器 Profile：
```
~/.proma/agent-workspaces/pdd-store-b/
├── mcp.json          → 配置指向 {{workspaceDir}}/browser-profile
└── browser-profile/  → 店铺 B 的登录 Cookie
```

两个工作区互不干扰！

---

## 无头模式配置

**文件**: `mcp.headless.json`

后台运行，不显示浏览器窗口：

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", 
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--headless",
        "--no-sandbox"
      ],
      "enabled": true,
      "description": "Playwright 无头模式，适合自动化任务"
    }
  }
}
```

---

## 全局默认配置

**文件位置**: `~/.proma/default-mcp.json`

所有新建工作区默认使用的配置：

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", 
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--no-sandbox"
      ],
      "enabled": true,
      "description": "默认 Playwright 配置，适用于电商场景"
    }
  }
}
```

---

## Playwright MCP 常用参数

完整参数列表（运行 `npx @playwright/mcp --help` 查看）：

| 参数 | 说明 |
|------|------|
| `--browser <browser>` | 浏览器类型：chrome, firefox, webkit, msedge |
| `--headless` | 无头模式（不显示窗口） |
| `--device <device>` | 设备模拟，如 "iPhone 15" |
| `--caps <caps>` | 启用的功能：vision, pdf, tabs, history, wait, files, install |
| `--allowed-origins <origins>` | 允许的域名列表（分号分隔） |
| `--blocked-origins <origins>` | 阻止的域名列表 |
| `--no-sandbox` | 禁用沙箱（解决部分系统权限问题） |
| `--ignore-https-errors` | 忽略 HTTPS 错误 |

---

## 电商场景常用命令

### 首次使用

1. 安装 Playwright 浏览器：
```bash
npx playwright install chromium
```

2. 在 Proma 中测试配置是否正常

### 浏览器 Profile 设置

1. 首次使用时，在 Proma 中通过 Playwright 手动登录电商平台
2. 登录状态会自动保存（如果配置了 Profile）
3. 后续使用会保持登录状态

### 性能优化

对于多店铺批量操作，可以考虑：
- 使用无头模式 `--headless`
- 禁用不必要的功能 `--caps tabs,pdf`
- 合理设置超时时间

---

## 故障排除

### MCP 服务器启动失败

1. 确认已安装 Node.js：
```bash
node --version
```

2. 手动测试 Playwright MCP：
```bash
npx @playwright/mcp@latest --help
```

### 浏览器无法启动

1. 尝试安装浏览器：
```bash
npx playwright install chromium
```

2. 添加 `--no-sandbox` 参数

### 选择器找不到元素

1. 使用 Playwright 的代码生成功能：
```bash
npx playwright codegen
```

2. 先手动操作，观察生成的选择器
