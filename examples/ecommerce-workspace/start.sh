#!/bin/bash

# ============================================================================
# 电商多任务并行系统 - 一键启动
# ============================================================================

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
WORKSPACE_DIR="$HOME/.proma/agent-workspaces/ecommerce-demo"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🛒 电商多任务并行系统 - 启动器                         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. 创建工作区
echo -e "${YELLOW}➤ 检查工作区...${NC}"

if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "  创建工作区目录..."
    mkdir -p "$WORKSPACE_DIR"/{skills,browser-profile}
    
    # 复制配置
    cp "$SOURCE_DIR/package.json" "$WORKSPACE_DIR/"
    cp "$SOURCE_DIR/tsconfig.json" "$WORKSPACE_DIR/"
    cp "$SOURCE_DIR/mcp.playwright.json" "$WORKSPACE_DIR/mcp.json"
    
    # 复制 Skills
    mkdir -p "$WORKSPACE_DIR/skills"
    for skill in multi-task-orchestrator add-store product-listing order-management; do
        if [ -d "$SOURCE_DIR/skills/$skill" ]; then
            cp -r "$SOURCE_DIR/skills/$skill" "$WORKSPACE_DIR/skills/"
            echo "  ✅ 安装 Skill: $skill"
        fi
    done
    
    # 创建工作区配置
    cat > "$WORKSPACE_DIR/workspace.json" << 'EOF'
{
  "id": "ecommerce-demo",
  "name": "电商运营助手",
  "slug": "ecommerce-demo",
  "platform": "ecommerce",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
EOF
    
    echo -e "${GREEN}  ✅ 工作区创建完成${NC}"
else
    echo -e "${GREEN}  ✅ 工作区已存在${NC}"
fi

# 2. 安装依赖
echo -e "${YELLOW}➤ 检查依赖...${NC}"

if [ ! -d "$WORKSPACE_DIR/node_modules" ]; then
    echo "  安装依赖..."
    cd "$WORKSPACE_DIR"
    npm install
    echo -e "${GREEN}  ✅ 依赖安装完成${NC}"
else
    echo -e "${GREEN}  ✅ 依赖已安装${NC}"
fi

# 3. 构建项目
echo -e "${YELLOW}➤ 检查构建...${NC}"

if [ ! -d "$WORKSPACE_DIR/dist" ]; then
    echo "  构建项目..."
    cd "$WORKSPACE_DIR"
    npm run build
    echo -e "${GREEN}  ✅ 构建完成${NC}"
else
    echo -e "${GREEN}  ✅ 项目已构建${NC}"
fi

# 4. 启动
echo ""
echo -e "${GREEN}🚀 启动电商多任务系统...${NC}"
echo ""

cd "$WORKSPACE_DIR"
npm run dev
