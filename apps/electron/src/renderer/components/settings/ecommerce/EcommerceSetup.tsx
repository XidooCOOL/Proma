/**
 * EcommerceSetup - 电商功能一键开启组件
 * 
 * 提供一键安装和配置电商功能
 */

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import {
  ShoppingBag,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Play,
  Settings,
  Store,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ===== Types =====

type SetupStep = 
  | 'idle'
  | 'checking'
  | 'creating-workspace'
  | 'installing-deps'
  | 'building'
  | 'configuring-mcp'
  | 'installing-skills'
  | 'starting-server'
  | 'completed'
  | 'error'

interface SetupProgress {
  step: SetupStep
  message: string
  progress: number
  error?: string
}

interface SetupState {
  isEnabled: boolean
  isFirstTime: boolean
  setupProgress?: SetupProgress
  lastSetupTime?: number
}

// ===== Helpers =====

const stepConfig: Record<SetupStep, { label: string; progress: number }> = {
  idle: { label: '准备中', progress: 0 },
  checking: { label: '检查环境', progress: 10 },
  'creating-workspace': { label: '创建工作区', progress: 20 },
  'installing-deps': { label: '安装依赖', progress: 40 },
  building: { label: '构建项目', progress: 60 },
  'configuring-mcp': { label: '配置 MCP', progress: 70 },
  'installing-skills': { label: '安装 Skills', progress: 80 },
  'starting-server': { label: '启动服务', progress: 90 },
  completed: { label: '完成', progress: 100 },
  error: { label: '失败', progress: 0 },
}

const features = [
  {
    icon: <Store className="h-5 w-5" />,
    title: '多店铺管理',
    description: '同时管理拼多多、抖音、淘宝等多个平台店铺',
  },
  {
    icon: <ShoppingBag className="h-5 w-5" />,
    title: '商品上架',
    description: '自动上架商品到多个平台，支持批量操作',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: '多任务并行',
    description: '同时执行多个任务，大幅提升效率',
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: '内容采集',
    description: '自动采集小红书、抖音等平台的爆款内容',
  },
]

// ===== Component =====

export function EcommerceSetup(): React.ReactElement {
  const [state, setState] = useState<SetupState>({
    isEnabled: false,
    isFirstTime: true,
  })

  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  // 初始化时检查电商功能状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.checkEcommerceStatus()
        if (status.isEnabled) {
          setState({
            isEnabled: true,
            isFirstTime: false,
            lastSetupTime: Date.now(),
          })
        }
      } catch (error) {
        console.error('[EcommerceSetup] 检查状态失败:', error)
      }
    }
    checkStatus()

    // 订阅进度事件
    const unsubscribe = window.electronAPI.onEcommerceProgress((progress) => {
      setSetupProgress({
        step: progress.step as SetupStep,
        message: progress.message,
        progress: progress.progress,
        error: progress.error,
      })

      // 如果完成，更新状态
      if (progress.step === 'completed') {
        setState({
          isEnabled: true,
          isFirstTime: false,
          setupProgress: {
            step: 'completed',
            message: '设置完成！',
            progress: 100,
          },
          lastSetupTime: Date.now(),
        })
      }

      // 如果出错
      if (progress.step === 'error') {
        setSetupProgress({
          step: 'error',
          message: progress.message,
          progress: 0,
          error: progress.error,
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleSetup = useCallback(async () => {
    setShowSetupDialog(true)
    await runSetup()
  }, [])

  const runSetup = async () => {
    const steps: SetupStep[] = [
      'checking',
      'creating-workspace',
      'installing-deps',
      'building',
      'configuring-mcp',
      'installing-skills',
      'starting-server',
    ]

    for (const step of steps) {
      const progress: SetupProgress = {
        step,
        message: stepConfig[step].label,
        progress: stepConfig[step].progress,
      }
      
      setSetupProgress(progress)

      try {
        await simulateStep(step)
      } catch (error) {
        setSetupProgress({
          step: 'error',
          message: '设置失败',
          progress: 0,
          error: error instanceof Error ? error.message : '未知错误',
        })
        return
      }

      // 每个步骤之间的延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // 完成
    setSetupProgress({
      step: 'completed',
      message: '设置完成！',
      progress: 100,
    })

    setState({
      isEnabled: true,
      isFirstTime: false,
      setupProgress: {
        step: 'completed',
        message: '设置完成！',
        progress: 100,
      },
      lastSetupTime: Date.now(),
    })
  }

  const simulateStep = async (step: SetupStep): Promise<void> => {
    // 实际调用后端 API 进行安装
    switch (step) {
      case 'checking':
        console.log('[EcommerceSetup] 检查环境...')
        // 检查环境是否满足
        const status = await window.electronAPI.checkEcommerceStatus()
        if (!status.isEnabled) {
          console.log('[EcommerceSetup] 开始安装电商功能...')
          await window.electronAPI.setupEcommerce()
        }
        break
      case 'creating-workspace':
        console.log('[EcommerceSetup] 创建工作区...')
        // 工作区已创建
        break
      case 'installing-deps':
        console.log('[EcommerceSetup] 安装依赖...')
        // 依赖已在 setupEcommerce 中安装
        break
      case 'building':
        console.log('[EcommerceSetup] 构建项目...')
        // 项目已在 setupEcommerce 中构建
        break
      case 'configuring-mcp':
        console.log('[EcommerceSetup] 配置 MCP...')
        // MCP 已在 setupEcommerce 中配置
        break
      case 'installing-skills':
        console.log('[EcommerceSetup] 安装 Skills...')
        // Skills 已在 setupEcommerce 中安装
        break
      case 'starting-server':
        console.log('[EcommerceSetup] 启动服务...')
        // 服务已在 setupEcommerce 中启动
        break
    }
  }

  // 如果已启用，显示已启用状态
  if (state.isEnabled) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">电商功能已开启</CardTitle>
            </div>
            <Badge variant="default" className="bg-green-600">
              已启用
            </Badge>
          </div>
          <CardDescription className="text-green-700">
            您已成功开启电商自动化功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              管理店铺
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              重新配置
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 如果是首次且未启用，显示开启按钮
  if (state.isFirstTime) {
    return (
      <>
        <Card className="border-2 border-dashed border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">开启电商自动化</CardTitle>
                <CardDescription>
                  一键配置，立即开始多平台电商运营
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 功能特点 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="p-1.5 bg-background rounded-md text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 一键开启按钮 */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleSetup}
            >
              <Zap className="mr-2 h-5 w-5" />
              一键开启电商功能
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              需要几分钟时间安装和配置，请保持网络连接
            </p>
          </CardContent>
        </Card>

        {/* 设置对话框 */}
        <SetupDialog
          open={showSetupDialog}
          onOpenChange={setShowSetupDialog}
          progress={setupProgress}
        />
      </>
    )
  }

  // 默认状态
  return (
    <Card>
      <CardHeader>
        <CardTitle>电商自动化</CardTitle>
        <CardDescription>
          开启电商自动化功能，支持多平台店铺管理
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSetup}>
          <Zap className="mr-2 h-4 w-4" />
          开启电商功能
        </Button>
      </CardContent>
    </Card>
  )
}

// ===== Setup Dialog =====

interface SetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  progress?: SetupProgress | null
}

function SetupDialog({ open, onOpenChange, progress }: SetupDialogProps) {
  const isCompleted = progress?.step === 'completed'
  const isError = progress?.step === 'error'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompleted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>设置完成！</span>
              </>
            ) : isError ? (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span>设置失败</span>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>正在配置...</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {progress?.message || '准备中...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 进度条 */}
          <Progress value={progress?.progress || 0} className="h-2" />

          {/* 步骤列表 */}
          <div className="space-y-2">
            {Object.entries(stepConfig)
              .filter(([key]) => key !== 'idle' && key !== 'error')
              .map(([key, config]) => {
                const step = key as SetupStep
                const isActive = progress?.step === step
                const isPast = (progress?.progress || 0) > config.progress
                const isCurrent = isActive

                return (
                  <div
                    key={step}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg transition-colors',
                      isCurrent && 'bg-primary/10',
                      isPast && 'opacity-60'
                    )}
                  >
                    {isPast || isCurrent ? (
                      isCurrent && !isCompleted ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        isCurrent && 'font-medium',
                        isPast && 'text-muted-foreground'
                      )}
                    >
                      {config.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {progress?.progress}%
                      </span>
                    )}
                  </div>
                )
              })}
          </div>

          {/* 错误信息 */}
          {isError && progress?.error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">{progress.error}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isCompleted ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              开始使用
            </Button>
          ) : isError ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={() => {}}>
                重试
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled>
              正在配置，请稍候...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
