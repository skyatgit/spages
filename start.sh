#!/bin/bash

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/backend" && pwd)"
NODE_DIR="$BACKEND_DIR/runtime/node-versions"
NODE_VERSION="24.11.0"
NODE_BIN="$NODE_DIR/node-v$NODE_VERSION/bin/node"
NPM_BIN="$NODE_DIR/node-v$NODE_VERSION/bin/npm"

echo "=================================="
echo "  SPages 一键启动"
echo "=================================="
echo ""

# 检查并安装 Node.js
if [ -f "$NODE_BIN" ]; then
    echo "[✓] 检测到 Node.js v$NODE_VERSION"
else
    echo "[*] 下载 Node.js v$NODE_VERSION..."
    mkdir -p "$NODE_DIR/node-v$NODE_VERSION"
    wget -qO- --show-progress "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" | tar -xzf - -C "$NODE_DIR/node-v$NODE_VERSION" --strip-components=1
    echo "[✓] Node.js v$NODE_VERSION 安装完成"
fi

# 设置 PATH 环境变量（确保后续命令能找到 node 和 npm）
NODE_BIN_DIR=$(dirname "$NODE_BIN")
export PATH="$NODE_BIN_DIR:$PATH"

# 安装后端依赖
echo ""
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "[*] 安装后端依赖..."
    "$NPM_BIN" install
    echo "[✓] 后端依赖安装完成"
else
    echo "[✓] 后端依赖已存在"
fi

# 启动后端服务
echo ""
"$NPM_BIN" start
