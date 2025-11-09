import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

console.log('🚀 开始构建 SPages 便携版本...\n')

// 1. 清理旧的构建文件
console.log('📦 步骤 1/3: 清理旧的构建文件...')
const distDir = path.join(projectRoot, 'dist')
const distReleaseDir = path.join(projectRoot, 'dist-release')

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
}
if (fs.existsSync(distReleaseDir)) {
  fs.rmSync(distReleaseDir, { recursive: true, force: true })
}
fs.mkdirSync(distReleaseDir, { recursive: true })
console.log('✅ 清理完成\n')

// 2. 构建前端
console.log('📦 步骤 2/3: 构建前端...')
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' })
  console.log('✅ 前端构建完成\n')
} catch (error) {
  console.error('❌ 前端构建失败:', error.message)
  process.exit(1)
}

// 复制目录工具函数
const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ 目录不存在: ${src}`)
    return
  }

  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// 复制应用代码
copyDir(path.join(projectRoot, 'server'), path.join(distReleaseDir, 'server'))
fs.cpSync(distDir, path.join(distReleaseDir, 'dist'), { recursive: true })

// 复制必要的配置文件
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'))
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: 'module',
  dependencies: packageJson.dependencies
}

fs.writeFileSync(
  path.join(distReleaseDir, 'package.json'),
  JSON.stringify(prodPackageJson, null, 2)
)

console.log('✅ 服务器文件复制完成\n')

// 创建智能启动脚本
console.log('📝 创建启动脚本...')

// Node.js 版本配置
const NODE_VERSION = '20.18.1'

// Linux/Mac 启动脚本
const unixStartScript = `#!/bin/bash

# SPages 智能启动脚本
# 自动检测系统并下载对应的 Node.js 运行时

set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
NODE_VERSION="${NODE_VERSION}"
RUNTIME_DIR="\$SCRIPT_DIR/.runtime"
NODE_DIR="\$RUNTIME_DIR/node"

# 颜色输出
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo "🚀 启动 SPages..."

# 检测系统架构
detect_platform() {
  OS=\$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=\$(uname -m)

  case "\$OS" in
    linux*)
      OS="linux"
      ;;
    darwin*)
      OS="darwin"
      ;;
    *)
      echo -e "\${RED}❌ 不支持的操作系统: \$OS\${NC}"
      exit 1
      ;;
  esac

  case "\$ARCH" in
    x86_64|amd64)
      ARCH="x64"
      ;;
    aarch64|arm64)
      ARCH="arm64"
      ;;
    *)
      echo -e "\${RED}❌ 不支持的架构: \$ARCH\${NC}"
      exit 1
      ;;
  esac

  PLATFORM="\${OS}-\${ARCH}"
  echo -e "\${GREEN}✓\${NC} 检测到系统: \$PLATFORM"
}

# 下载并安装 Node.js
install_nodejs() {
  if [ -f "\$NODE_DIR/bin/node" ]; then
    INSTALLED_VERSION=\$("\$NODE_DIR/bin/node" --version 2>/dev/null | sed 's/v//')
    if [ "\$INSTALLED_VERSION" = "\$NODE_VERSION" ]; then
      echo -e "\${GREEN}✓\${NC} Node.js \$NODE_VERSION 已安装"
      return
    else
      echo -e "\${YELLOW}⚠\${NC} 发现旧版本 Node.js (\$INSTALLED_VERSION)，正在更新..."
      rm -rf "\$RUNTIME_DIR"
    fi
  fi

  echo -e "\${YELLOW}⬇\${NC} 下载 Node.js \$NODE_VERSION for \$PLATFORM..."

  mkdir -p "\$RUNTIME_DIR"
  cd "\$RUNTIME_DIR"

  NODE_DIST="node-v\${NODE_VERSION}-\${PLATFORM}"
  NODE_URL="https://nodejs.org/dist/v\${NODE_VERSION}/\${NODE_DIST}.tar.gz"

  # 尝试使用 curl 或 wget 下载
  if command -v curl &> /dev/null; then
    curl -fSL "\$NODE_URL" -o node.tar.gz
  elif command -v wget &> /dev/null; then
    wget -q "\$NODE_URL" -O node.tar.gz
  else
    echo -e "\${RED}❌ 需要 curl 或 wget 来下载 Node.js\${NC}"
    exit 1
  fi

  echo -e "\${YELLOW}📦\${NC} 解压 Node.js..."
  tar -xzf node.tar.gz
  mv "\${NODE_DIST}" node
  rm node.tar.gz

  echo -e "\${GREEN}✓\${NC} Node.js 安装完成"
}

# 安装依赖
install_dependencies() {
  if [ -d "\$SCRIPT_DIR/node_modules" ]; then
    echo -e "\${GREEN}✓\${NC} 依赖已安装"
    return
  fi

  echo -e "\${YELLOW}📦\${NC} 安装项目依赖..."
  cd "\$SCRIPT_DIR"
  # 设置 PATH 让 npm 能找到 node
  export PATH="\$NODE_DIR/bin:\$PATH"
  "\$NODE_DIR/bin/npm" install --production --silent
  echo -e "\${GREEN}✓\${NC} 依赖安装完成"
}

# 启动应用
start_app() {
  echo -e "\${GREEN}✓\${NC} 启动 SPages 服务..."
  echo ""
  cd "\$SCRIPT_DIR"
  export PATH="\$NODE_DIR/bin:\$PATH"
  export NODE_ENV=production
  "\$NODE_DIR/bin/node" server/index.js
}

# 主流程
detect_platform
install_nodejs
install_dependencies
start_app
`

fs.writeFileSync(path.join(distReleaseDir, 'start.sh'), unixStartScript)
fs.chmodSync(path.join(distReleaseDir, 'start.sh'), '755')

// Windows 启动脚本
const windowsStartScript = `@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: SPages 智能启动脚本
:: 自动下载 Node.js 运行时并启动应用

set "SCRIPT_DIR=%~dp0"
set "NODE_VERSION=${NODE_VERSION}"
set "RUNTIME_DIR=%SCRIPT_DIR%.runtime"
set "NODE_DIR=%RUNTIME_DIR%\\node"

echo 🚀 启动 SPages...

:: 检测系统架构
set "ARCH=%PROCESSOR_ARCHITECTURE%"
if "%ARCH%"=="AMD64" (
  set "PLATFORM=win-x64"
) else if "%ARCH%"=="ARM64" (
  set "PLATFORM=win-arm64"
) else (
  echo ❌ 不支持的架构: %ARCH%
  pause
  exit /b 1
)

echo ✓ 检测到系统: %PLATFORM%

:: 检查 Node.js 是否已安装
if exist "%NODE_DIR%\\node.exe" (
  echo ✓ Node.js %NODE_VERSION% 已安装
  goto :install_deps
)

:: 下载 Node.js
echo ⬇ 下载 Node.js %NODE_VERSION% for %PLATFORM%...
if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"

set "NODE_DIST=node-v%NODE_VERSION%-%PLATFORM%"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_DIST%.zip"
set "NODE_ZIP=%RUNTIME_DIR%\\node.zip"

:: 使用 PowerShell 下载
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP%' -UseBasicParsing}"

if errorlevel 1 (
  echo ❌ 下载失败
  pause
  exit /b 1
)

:: 解压
echo 📦 解压 Node.js...
powershell -Command "& {Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%RUNTIME_DIR%' -Force}"
ren "%RUNTIME_DIR%\\%NODE_DIST%" node
del "%NODE_ZIP%"

echo ✓ Node.js 安装完成

:: 安装依赖
:install_deps
if exist "%SCRIPT_DIR%node_modules" (
  echo ✓ 依赖已安装
  goto :start_app
)

echo 📦 安装项目依赖...
cd /d "%SCRIPT_DIR%"
"%NODE_DIR%\\npm.cmd" install --production --silent
echo ✓ 依赖安装完成

:: 启动应用
:start_app
echo ✓ 启动 SPages 服务...
echo.
cd /d "%SCRIPT_DIR%"
set NODE_ENV=production
"%NODE_DIR%\\node.exe" server/index.js

pause
`

fs.writeFileSync(path.join(distReleaseDir, 'start.bat'), windowsStartScript)

// 停止脚本
const unixStopScript = `#!/bin/bash
pkill -f "server/index.js"
echo "✓ SPages 已停止"
`

fs.writeFileSync(path.join(distReleaseDir, 'stop.sh'), unixStopScript)
fs.chmodSync(path.join(distReleaseDir, 'stop.sh'), '755')

const windowsStopScript = `@echo off
chcp 65001 >nul
taskkill /F /FI "WINDOWTITLE eq SPages*" /T 2>nul
taskkill /F /FI "COMMANDLINE eq *server/index.js*" /T 2>nul
echo ✓ SPages 已停止
pause
`

fs.writeFileSync(path.join(distReleaseDir, 'stop.bat'), windowsStopScript)

console.log('✅ 启动脚本创建完成\n')

// 创建部署说明
const readme = `# SPages - 自托管部署平台

## ✨ 特性

- ✅ **零依赖安装** - 无需预装 Node.js 环境
- ✅ **跨平台支持** - 支持 Linux、macOS、Windows
- ✅ **自动下载运行时** - 首次启动自动下载对应系统的 Node.js
- ✅ **开箱即用** - 解压即可运行

## 🚀 快速开始

### Linux / macOS

\`\`\`bash
# 赋予执行权限
chmod +x start.sh stop.sh

# 启动服务
./start.sh

# 停止服务（另一个终端）
./stop.sh
\`\`\`

### Windows

\`\`\`cmd
:: 双击运行
start.bat

:: 或在命令行运行
start.bat

:: 停止服务
stop.bat
\`\`\`

## 📦 首次启动

首次运行时，启动脚本会自动：

1. 检测系统和架构
2. 下载对应的 Node.js ${NODE_VERSION} 运行时（约 30-50MB）
3. 安装项目依赖
4. 启动服务

所有文件都下载到 \`.runtime\` 目录，不会污染系统环境。

## 🌐 访问应用

默认地址: http://localhost:3000

## 📁 目录结构

\`\`\`
spages/
├── .runtime/          # 自动创建，包含 Node.js 运行时
│   └── node/
├── server/            # 服务器代码
├── dist/              # 前端构建文件
├── node_modules/      # 自动安装的依赖
├── data/              # 运行时创建，存储项目数据
├── start.sh           # Linux/Mac 启动脚本
├── start.bat          # Windows 启动脚本
├── stop.sh            # Linux/Mac 停止脚本
└── stop.bat           # Windows 停止脚本
\`\`\`

## 🔄 使用 PM2 管理（Linux/Mac 推荐）

如果你想让应用在后台运行并开机自启：

\`\`\`bash
# 首次运行 start.sh 后，会在 .runtime/node/bin 下有 npm 和 node

# 安装 PM2
./.runtime/node/bin/npm install -g pm2

# 创建启动配置
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'spages',
    script: './server/index.js',
    cwd: __dirname,
    interpreter: './.runtime/node/bin/node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# 启动
./.runtime/node/bin/pm2 start ecosystem.config.cjs

# 保存配置
./.runtime/node/bin/pm2 save

# 开机自启
./.runtime/node/bin/pm2 startup

# 常用命令
./.runtime/node/bin/pm2 list          # 查看状态
./.runtime/node/bin/pm2 logs spages   # 查看日志
./.runtime/node/bin/pm2 restart spages # 重启
./.runtime/node/bin/pm2 stop spages    # 停止
\`\`\`

## 🔧 systemd 服务（Linux）

创建 \`/etc/systemd/system/spages.service\`：

\`\`\`ini
[Unit]
Description=SPages Deployment Platform
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/spages
ExecStart=/path/to/spages/.runtime/node/bin/node server/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
\`\`\`

启动服务：

\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable spages
sudo systemctl start spages
sudo systemctl status spages
\`\`\`

## 📝 环境变量

创建 \`.env\` 文件（可选）：

\`\`\`env
PORT=3000
NODE_ENV=production
\`\`\`

## 🔐 数据备份

重要数据存储在 \`data/\` 目录，包括：
- 项目配置
- 部署历史
- 日志文件

定期备份此目录即可。

## 🆙 更新部署

1. 备份 \`data/\` 目录
2. 下载新版本覆盖所有文件（保留 \`data/\` 目录）
3. 重启服务

## ⚠️ 注意事项

- 首次启动需要网络连接来下载 Node.js 运行时
- \`.runtime\` 目录大约占用 100MB 空间
- Windows 需要管理员权限来安装某些 npm 包

## 🐛 故障排除

### 端口被占用

修改 \`.env\` 文件中的 \`PORT\` 变量

### 启动失败

1. 检查 3000 端口是否被占用
2. 确保有网络连接（首次启动）
3. 检查 \`data/\` 目录权限

### 删除运行时重新下载

\`\`\`bash
rm -rf .runtime node_modules
./start.sh
\`\`\`

## 📞 技术支持

- GitHub: https://github.com/your-repo/spages
- Issues: https://github.com/your-repo/spages/issues

## 📄 许可证

MIT License
`

fs.writeFileSync(path.join(distReleaseDir, 'README.md'), readme)

console.log('✅ 部署说明创建完成\n')

console.log('🎉 构建完成！')
console.log(`📁 发行版位置: ${distReleaseDir}`)
console.log('\n📦 发行版特性:')
console.log('- ✅ 跨平台支持（Linux/macOS/Windows）')
console.log('- ✅ 自动下载对应系统的 Node.js 运行时')
console.log('- ✅ 无需预装任何环境')
console.log('- ✅ 体积小巧（约 5-10MB，不含运行时）')
console.log('\n📋 使用方法:')
console.log('1. 将 dist-release 文件夹上传/复制到目标服务器')
console.log('2. Linux/Mac: chmod +x start.sh && ./start.sh')
console.log('3. Windows: 双击 start.bat')
console.log('\n📖 详细说明: dist-release/README.md')
