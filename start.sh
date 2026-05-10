#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  EventHub 活动管理平台 - 启动脚本"
echo "=========================================="

# 1. 安装依赖（如果不存在）
if [ ! -d "node_modules" ]; then
    echo "[1/4] 正在安装依赖..."
    npm install
else
    echo "[1/4] 依赖已安装，跳过"
fi

# 2. 初始化数据库（如果不存在）
if [ ! -f "eventhub.db" ]; then
    echo "[2/4] 正在初始化数据库..."
    npx drizzle-kit push
    npx tsx db/seed.ts
else
    echo "[2/4] 数据库已存在，跳过"
fi

# 3. 构建生产版本
echo "[3/4] 正在构建..."
npm run build

# 4. 复制必要文件
cp eventhub.db dist/ 2>/dev/null || true
mkdir -p dist/public/uploads

# 5. 启动服务器
echo "[4/4] 启动服务器..."
echo ""
echo "=========================================="
echo "  服务已启动: http://localhost:3000"
echo ""
echo "  管理员密码: admin123"
echo "  访客密码:   guest"
echo "=========================================="
echo ""

NODE_ENV=production node dist/boot.js
