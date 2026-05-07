/**
 * StoreSwitcher - 左侧栏店铺快速切换器
 * 
 * 功能：
 * - 显示所有店铺列表
 * - 显示登录状态
 * - 快速切换当前工作区
 */

import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  Store,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Settings,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  agentWorkspacesAtom,
  currentAgentWorkspaceIdAtom,
} from '@/atoms/agent-atoms'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AgentWorkspace } from '@proma/shared'

// ===== Types =====

type Platform = 'pinduoduo' | 'douyin' | 'taobao' | 'jd' | 'other'
type LoginStatus = 'logged_in' | 'pending' | 'expired' | 'never'

interface StoreItem {
  id: string
  name: string
  slug: string
  platform: Platform
  loginStatus: LoginStatus
  workspaceId?: string
}

// ===== Helpers =====

const platformEmoji: Record<Platform, string> = {
  pinduoduo: '🏪',
  douyin: '🎵',
  taobao: '🛒',
  jd: '📦',
  other: '🏬',
}

const statusIcon: Record<LoginStatus, React.ReactNode> = {
  logged_in: <CheckCircle className="h-3 w-3 text-green-500" />,
  pending: <Clock className="h-3 w-3 text-yellow-500" />,
  expired: <AlertCircle className="h-3 w-3 text-red-500" />,
  never: <AlertCircle className="h-3 w-3 text-gray-400" />,
}

// ===== Component =====

export function StoreSwitcher(): React.ReactElement {
  const workspaces = useAtomValue(agentWorkspacesAtom)
  const currentWorkspaceId = useAtomValue(currentAgentWorkspaceIdAtom)
  const setCurrentWorkspaceId = useSetAtom(currentAgentWorkspaceIdAtom)

  const [expanded, setExpanded] = React.useState(true)

  // 模拟店铺数据 - 实际应该从工作区配置中读取
  const [stores] = React.useState<StoreItem[]>([
    { id: '1', name: '拼多多店铺A', slug: 'pdd-store-a', platform: 'pinduoduo', loginStatus: 'logged_in', workspaceId: 'ws-1' },
    { id: '2', name: '拼多多店铺B', slug: 'pdd-store-b', platform: 'pinduoduo', loginStatus: 'pending', workspaceId: 'ws-2' },
    { id: '3', name: '抖音店铺A', slug: 'douyin-store-a', platform: 'douyin', loginStatus: 'logged_in', workspaceId: 'ws-3' },
    { id: '4', name: '抖音店铺B', slug: 'douyin-store-b', platform: 'douyin', loginStatus: 'expired', workspaceId: 'ws-4' },
  ])

  const handleSelectStore = React.useCallback((store: StoreItem) => {
    if (store.workspaceId) {
      setCurrentWorkspaceId(store.workspaceId)
    }
  }, [setCurrentWorkspaceId])

  return (
    <div className="space-y-1">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium",
          "hover:bg-accent hover:text-accent-foreground",
          "rounded-md transition-colors"
        )}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-90"
          )}
        />
        <Store className="h-4 w-4" />
        <span className="flex-1 text-left">店铺</span>
        <Badge variant="secondary" className="h-5 text-xs">
          {stores.length}
        </Badge>
      </button>

      {/* Store List */}
      {expanded && (
        <div className="space-y-0.5 ml-2">
          {stores.map((store) => {
            const isActive = store.workspaceId === currentWorkspaceId
            
            return (
              <div
                key={store.id}
                className={cn(
                  "group relative flex items-center gap-2 pl-3 pr-2 py-1.5",
                  "text-sm rounded-md cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleSelectStore(store)}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r" />
                )}

                {/* Platform Icon */}
                <span className="text-base">{platformEmoji[store.platform]}</span>

                {/* Store Name */}
                <span className="flex-1 truncate">{store.name}</span>

                {/* Status Icon */}
                {statusIcon[store.loginStatus]}

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem>
                      <Store className="mr-2 h-4 w-4" />
                      打开店铺
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      店铺设置
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除店铺
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}

          {/* Add Store Button */}
          <button
            className={cn(
              "w-full flex items-center gap-2 pl-3 pr-2 py-1.5",
              "text-sm text-muted-foreground",
              "hover:bg-accent hover:text-accent-foreground",
              "rounded-md transition-colors"
            )}
          >
            <Plus className="h-4 w-4" />
            <span>添加店铺</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ===== Compact Version =====

export function StoreSwitcherCompact(): React.ReactElement {
  const workspaces = useAtomValue(agentWorkspacesAtom)
  const currentWorkspaceId = useAtomValue(currentAgentWorkspaceIdAtom)
  const setCurrentWorkspaceId = useSetAtom(currentAgentWorkspaceIdAtom)

  // 模拟店铺数据
  const [stores] = React.useState<StoreItem[]>([
    { id: '1', name: '拼多多店铺A', slug: 'pdd-store-a', platform: 'pinduoduo', loginStatus: 'logged_in' },
    { id: '2', name: '拼多多店铺B', slug: 'pdd-store-b', platform: 'pinduoduo', loginStatus: 'pending' },
    { id: '3', name: '抖音店铺A', slug: 'douyin-store-a', platform: 'douyin', loginStatus: 'logged_in' },
  ])

  const currentStore = stores.find((s) => s.workspaceId === currentWorkspaceId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          {currentStore ? (
            <>
              <span>{platformEmoji[currentStore.platform]}</span>
              <span>{currentStore.name}</span>
              {statusIcon[currentStore.loginStatus]}
            </>
          ) : (
            <>
              <Store className="h-4 w-4" />
              <span>选择店铺</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => setCurrentWorkspaceId(store.workspaceId || '')}
            className={cn(
              "flex items-center gap-2",
              store.workspaceId === currentWorkspaceId && "bg-accent"
            )}
          >
            <span>{platformEmoji[store.platform]}</span>
            <span className="flex-1">{store.name}</span>
            {statusIcon[store.loginStatus]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="mr-2 h-4 w-4" />
          添加新店铺
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
