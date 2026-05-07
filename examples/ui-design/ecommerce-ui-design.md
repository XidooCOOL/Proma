# 电商专用前端 UI 设计

本文档描述如何在 Proma 中添加电商专用的前端界面，展示多店铺管理和浏览器 Profile 隔离。

## 目录

- [现有 UI 结构](#现有-ui-结构)
- [新增电商设置页面](#新增电商设置页面)
- [左侧栏店铺切换器](#左侧栏店铺切换器)
- [店铺 Profile 状态展示](#店铺-profile-状态展示)

---

## 现有 UI 结构

Proma 现有的设置页面位于：
- `apps/electron/src/renderer/components/settings/AgentSettings.tsx`

现有的 Tab 结构：
1. **Skills** - Skill 管理
2. **MCP 服务器** - MCP 服务器配置
3. **内置工具** - 内置工具状态

---

## 方案 1：新增独立的"电商"设置 Tab

### 设计思路

在现有的 `AgentSettings.tsx` 中添加一个新的 Tab，专门展示电商相关设置。

### UI 布局

```
┌─────────────────────────────────────────────────────────────┐
│  Agent 设置                                            [X] │
├─────────────────────────────────────────────────────────────┤
│  [Skills] [MCP 服务器] [内置工具] [🏪 电商]                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏪 店铺管理                                                │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ 🏪 拼多多店铺A   │  │ 🏪 拼多多店铺B   │                 │
│  │                 │  │                 │                 │
│  │ ✅ 已登录       │  │ ⏳ 待登录       │                 │
│  │ Chrome #1       │  │ Chrome #2       │                 │
│  │                 │  │                 │                 │
│  │ [打开管理]       │  │ [立即登录]       │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ 🎵 抖音店铺A    │  │ 🎵 抖音店铺B    │                 │
│  │                 │  │                 │                 │
│  │ ✅ 已登录       │  │ ❌ 登录过期     │                 │
│  │ Chrome #3       │  │ Chrome #4       │                 │
│  │                 │  │                 │                 │
│  │ [打开管理]       │  │ [重新登录]       │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│  [+ 添加新店铺]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 方案 2：左侧栏店铺快速切换（推荐）

### 设计思路

在现有的左侧栏（LeftSidebar）添加店铺快速切换功能，类似于浏览器 Extension 的店铺切换器。

### UI 布局

```
┌────────────────────────────┐
│  Proma                     │
├────────────────────────────┤
│  💬 Chat                    │
│  🤖 Agent                   │
├────────────────────────────┤
│  🏪 店铺                    │  ← 新增
│  ├─ 🏪 拼多多-A [✅]       │
│  ├─ 🏪 拼多多-B [⏳]       │
│  ├─ 🎵 抖音-A [✅]         │
│  └─ 🎵 抖音-B [❌]         │
├────────────────────────────┤
│  ⚙️ 设置                    │
└────────────────────────────┘
```

### 点击店铺后的 Agent 页面

```
┌─────────────────────────────────────────────────────────────┐
│  🏪 拼多多店铺A                              [⚙️] [📋] [✕]   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐                                               │
│  │ Chat 🤖  │  ┌─────────────────────────────────────────┐ │
│  └──────────┘  │                                         │ │
│                 │  你好！我是拼多多店铺A的运营助手         │ │
│                 │                                         │ │
│                 │  可以帮你：                              │ │
│                 │  • 自动上架商品                         │ │
│                 │  • 处理订单                             │ │
│                 │  • 运营数据分析                         │ │
│                 │                                         │ │
│                 │  当前浏览器：Chrome (Profile: pdd-store-a)│ │
│                 │  登录状态：✅ 已登录                    │ │
│                 └─────────────────────────────────────────┘ │
│                 │ 请描述你想完成的操作...          [发送]  │ │
│                 └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 方案 3：店铺 Profile 状态卡片

### 设计思路

在工作区设置页面添加一个"店铺 Profile"区域，展示浏览器状态。

### UI 布局

```
┌─────────────────────────────────────────────────────────────┐
│  🏪 店铺 Profile                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  浏览器状态                                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  🖥️ Chrome #1                                         │ │
│  │  Profile: pdd-store-a                                 │ │
│  │  路径: ~/.proma/agent-workspaces/pdd-store-a/...      │ │
│  │                                                       │ │
│  │  登录状态: ✅ 已登录 (2024-01-15)                    │ │
│  │  Cookie 有效期: 剩余 25 天                          │ │
│  │                                                       │ │
│  │  [🔄 刷新登录状态]  [🗑️ 清除 Profile]                │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  MCP 服务器状态                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✅ playwright: 已连接                                 │ │
│  │    浏览器: Chromium 120.0.6099.109                    │ │
│  │    模式: 有头模式                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 实现步骤

### 步骤 1：创建电商设置组件

```tsx
// apps/electron/src/renderer/components/settings/EcommerceSettings.tsx

import * as React from 'react'
import { useAtomValue } from 'jotai'
import { 
  Store, 
  Plus, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Chrome,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { agentWorkspacesAtom } from '@/atoms/agent-atoms'

interface StoreProfile {
  id: string
  name: string
  platform: 'pinduoduo' | 'douyin' | 'taobao' | 'jd'
  loginStatus: 'logged_in' | 'pending' | 'expired'
  loginTime?: Date
  browserProfile: string
  mcpStatus: 'connected' | 'disconnected'
}

export function EcommerceSettings(): React.ReactElement {
  const workspaces = useAtomValue(agentWorkspacesAtom)
  
  // 模拟店铺数据（实际应该从工作区配置中读取）
  const storeProfiles: StoreProfile[] = [
    {
      id: 'pdd-store-a',
      name: '拼多多店铺A',
      platform: 'pinduoduo',
      loginStatus: 'logged_in',
      loginTime: new Date('2024-01-15'),
      browserProfile: 'pdd-store-a',
      mcpStatus: 'connected'
    },
    // ... 更多店铺
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">🏪 店铺管理</h2>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          添加新店铺
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storeProfiles.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  )
}

function StoreCard({ store }: { store: StoreProfile }) {
  const statusConfig = {
    logged_in: { icon: CheckCircle, color: 'text-green-500', label: '已登录' },
    pending: { icon: Clock, color: 'text-yellow-500', label: '待登录' },
    expired: { icon: AlertCircle, color: 'text-red-500', label: '登录过期' }
  }

  const StatusIcon = statusConfig[store.loginStatus].icon

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4" />
          {store.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusConfig[store.loginStatus].color}`} />
          <span className="text-sm">{statusConfig[store.loginStatus].label}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Chrome className="h-4 w-4" />
          <span>Chrome #{store.browserProfile}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Settings className="mr-1 h-3 w-3" />
            设置
          </Button>
          {store.loginStatus !== 'logged_in' && (
            <Button size="sm" className="flex-1">
              登录
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

### 步骤 2：在设置面板中注册新 Tab

修改 `AgentSettings.tsx`，添加新的 Tab：

```tsx
import { EcommerceSettings } from './EcommerceSettings'

// 在 Tabs 结构中添加
<Tabs defaultValue="skills" className="w-full">
  <TabsList>
    <TabsTrigger value="skills">Skills</TabsTrigger>
    <TabsTrigger value="mcp">MCP 服务器</TabsTrigger>
    <TabsTrigger value="builtin">内置工具</TabsTrigger>
    <TabsTrigger value="ecommerce">🏪 电商</TabsTrigger>  // 新增
  </TabsList>
  
  <TabsContent value="ecommerce">
    <EcommerceSettings />
  </TabsContent>
  // ... 其他 tabs
</Tabs>
```

---

### 步骤 3：添加工作区元数据读取

修改 `agent-workspace-manager.ts`，支持读取店铺类型：

```typescript
export interface AgentWorkspace {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  // 新增电商相关字段
  platform?: 'pinduoduo' | 'douyin' | 'taobao' | 'jd'
  storeName?: string
  storeId?: string
}
```

---

## 交互流程

### 1. 添加新店铺

```
用户点击"添加新店铺"
    ↓
选择平台（拼多多/抖音/淘宝/京东）
    ↓
输入店铺名称
    ↓
创建工作区（自动生成 slug）
    ↓
自动应用默认 MCP 配置
    ↓
提示用户登录电商后台
    ↓
保存登录状态到 browser-profile
```

### 2. 快速切换店铺

```
用户点击左侧栏店铺列表
    ↓
切换当前工作区
    ↓
自动切换浏览器 Profile
    ↓
MCP 服务器自动重启并加载新 Profile
    ↓
Agent 界面更新为新店铺
```

### 3. 查看店铺状态

```
用户点击"电商"设置 Tab
    ↓
显示所有店铺卡片
    ↓
每个卡片显示：
  - 登录状态
  - 浏览器 Profile
  - MCP 连接状态
  - 最后活动时间
```

---

## 数据结构

### 工作区配置（workspace.json）

```json
{
  "id": "uuid",
  "name": "拼多多店铺A",
  "slug": "pdd-store-a",
  "platform": "pinduoduo",
  "storeName": "我的拼多多店",
  "storeId": "123456789",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

### 店铺 Profile 状态（profile-status.json）

```json
{
  "workspaceSlug": "pdd-store-a",
  "platform": "pinduoduo",
  "browser": {
    "type": "chrome",
    "profile": "pdd-store-a",
    "profilePath": "/Users/you/.proma/agent-workspaces/pdd-store-a/browser-profile"
  },
  "login": {
    "status": "logged_in",
    "lastLoginTime": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-15T10:30:00Z",
    "cookieValid": true
  },
  "mcp": {
    "status": "connected",
    "lastChecked": "2024-01-20T15:00:00Z"
  }
}
```

---

## 技术实现要点

### 1. Profile 路径隔离

每个店铺的浏览器 Profile 完全隔离：
- `~/.proma/agent-workspaces/{店铺slug}/browser-profile/`
- 通过 `{{workspaceDir}}` 变量自动替换

### 2. 登录状态检测

定时检测 Cookie 有效期：
- 读取 `browser-profile/Default/Cookies` 等文件
- 解析 Cookie 过期时间
- 提前提醒用户重新登录

### 3. MCP 服务器动态切换

当切换店铺时：
1. 停止当前 Playwright MCP
2. 更新 `PLAYWRIGHT_USER_DATA_DIR` 环境变量
3. 重新启动 MCP 服务器
4. 验证新 Profile 是否可用

### 4. 性能优化

- 只在需要时启动浏览器
- 使用无头模式处理后台任务
- 定期清理过期 Profile
