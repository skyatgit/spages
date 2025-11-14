import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NODE_VERSIONS_DIR = path.join(process.cwd(), 'runtime', 'node-versions')

// 确保运行时目录存在
if (!fs.existsSync(NODE_VERSIONS_DIR)) {
  fs.mkdirSync(NODE_VERSIONS_DIR, { recursive: true })
}

/**
 * 检测项目需要的 Node 版本
 */
export async function detectRequiredNodeVersion(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    console.log('No package.json found, using system Node version')
    return 'system'
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

    // 检查 engines.node
    if (packageJson.engines && packageJson.engines.node) {
      const nodeVersion = packageJson.engines.node
      console.log(`Found Node version requirement: ${nodeVersion}`)
      return nodeVersion
    }

    // 检查 .nvmrc 文件
    const nvmrcPath = path.join(projectPath, '.nvmrc')
    if (fs.existsSync(nvmrcPath)) {
      const nvmrcVersion = fs.readFileSync(nvmrcPath, 'utf-8').trim()
      console.log(`Found .nvmrc with version: ${nvmrcVersion}`)
      return nvmrcVersion
    }
  } catch (error) {
    console.error('Error detecting Node version:', error)
  }

  return 'system'
}

/**
 * 获取可用的 Node 版本列表
 */
export function getInstalledNodeVersions() {
  if (!fs.existsSync(NODE_VERSIONS_DIR)) {
    return []
  }

  return fs.readdirSync(NODE_VERSIONS_DIR)
    .filter(name => name.startsWith('node-v'))
    .map(name => name.replace('node-v', ''))
}

/**
 * 检查指定版本是否已安装
 */
export function isNodeVersionInstalled(version) {
  const versionDir = path.join(NODE_VERSIONS_DIR, `node-v${version}`)
  return fs.existsSync(versionDir)
}

/**
 * 获取 Node 版本的可执行文件路径
 */
export function getNodeExecutablePath(version) {
  if (version === 'system') {
    return 'node'
  }

  const versionDir = path.join(NODE_VERSIONS_DIR, `node-v${version}`)
  const isWindows = process.platform === 'win32'

  if (isWindows) {
    return path.join(versionDir, 'node.exe')
  } else {
    return path.join(versionDir, 'bin', 'node')
  }
}

/**
 * 获取 npm 可执行文件路径
 */
export function getNpmExecutablePath(version) {
  if (version === 'system') {
    return 'npm'
  }

  const versionDir = path.join(NODE_VERSIONS_DIR, `node-v${version}`)
  const isWindows = process.platform === 'win32'

  if (isWindows) {
    return path.join(versionDir, 'npm.cmd')
  } else {
    return path.join(versionDir, 'bin', 'npm')
  }
}

/**
 * 解析版本范围，获取最新的匹配版本
 * 例如: "^20.19.0 || >=22.12.0" -> "22.12.0" (取最新的)
 */
function parseVersionRange(versionRange) {
  // 简化处理：提取所有数字版本
  const matches = versionRange.match(/\d+\.\d+\.\d+/g)
  if (!matches || matches.length === 0) {
    // 如果没有匹配到具体版本，提取主版本号
    const majorMatch = versionRange.match(/\d+/)
    if (majorMatch) {
      return `${majorMatch[0]}.0.0`
    }
    return null
  }

  // 返回最高版本
  return matches.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number)

    if (aMajor !== bMajor) return bMajor - aMajor
    if (aMinor !== bMinor) return bMinor - aMinor
    return bPatch - aPatch
  })[0]
}

/**
 * 下载并安装指定版本的 Node.js
 */
export async function installNodeVersion(versionRange, onProgress) {
  console.log(`[installNodeVersion] Installing Node.js for version range: ${versionRange}`)

  // 解析版本范围，获取具体版本
  const version = parseVersionRange(versionRange)
  if (!version) {
    throw new Error(`Cannot parse version from: ${versionRange}`)
  }

  console.log(`[installNodeVersion] Resolved to version: ${version}`)
  onProgress?.(`Downloading Node.js v${version}...`)

  const versionDir = path.join(NODE_VERSIONS_DIR, `node-v${version}`)

  // 如果已经安装，跳过
  if (fs.existsSync(versionDir)) {
    console.log(`[installNodeVersion] Version ${version} already installed`)
    onProgress?.(`Node.js v${version} already installed`)
    return version
  }

  const isWindows = process.platform === 'win32'
  const platform = isWindows ? 'win' : process.platform
  const arch = process.arch === 'x64' ? 'x64' : 'x86'

  // Node.js 下载 URL
  const fileName = isWindows
    ? `node-v${version}-${platform}-${arch}.zip`
    : `node-v${version}-${platform}-${arch}.tar.gz`

  const downloadUrl = `https://nodejs.org/dist/v${version}/${fileName}`
  const tempFile = path.join(NODE_VERSIONS_DIR, fileName)

  console.log(`[installNodeVersion] Download URL: ${downloadUrl}`)
  onProgress?.(`Downloading from ${downloadUrl}...`)

  try {
    // 下载文件
    await downloadFile(downloadUrl, tempFile, (progress) => {
      onProgress?.(`Downloading: ${progress}%`)
    })

    onProgress?.(`Extracting Node.js v${version}...`)
    console.log(`[installNodeVersion] Extracting to ${versionDir}`)

    // 解压文件
    if (isWindows) {
      await extractZip(tempFile, versionDir)
    } else {
      await extractTarGz(tempFile, versionDir)
    }

    // 删除临时文件
    fs.unlinkSync(tempFile)

    console.log(`[installNodeVersion] Successfully installed Node.js v${version}`)
    onProgress?.(`Node.js v${version} installed successfully`)

    return version
  } catch (error) {
    console.error(`[installNodeVersion] Failed to install Node.js v${version}:`, error)

    // 清理失败的安装
    if (fs.existsSync(versionDir)) {
      fs.rmSync(versionDir, { recursive: true, force: true })
    }
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile)
    }

    throw error
  }
}

/**
 * 下载文件
 */
function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        return downloadFile(response.headers.location, dest, onProgress)
          .then(resolve)
          .catch(reject)
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      const totalSize = parseInt(response.headers['content-length'], 10)
      let downloadedSize = 0

      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        const progress = Math.round((downloadedSize / totalSize) * 100)
        onProgress?.(progress)
      })

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })

      file.on('error', (err) => {
        fs.unlinkSync(dest)
        reject(err)
      })
    }).on('error', reject)
  })
}

/**
 * 解压 ZIP 文件 (Windows)
 */
async function extractZip(zipFile, targetDir) {
  const AdmZip = await import('adm-zip').then(m => m.default)
  const zip = new AdmZip(zipFile)
  zip.extractAllTo(targetDir, true)

  // 移动文件到正确位置（node 解压后会有一层目录）
  const extractedDir = fs.readdirSync(targetDir)[0]
  const extractedPath = path.join(targetDir, extractedDir)

  if (fs.existsSync(extractedPath) && fs.statSync(extractedPath).isDirectory()) {
    const files = fs.readdirSync(extractedPath)
    for (const file of files) {
      fs.renameSync(
        path.join(extractedPath, file),
        path.join(targetDir, file)
      )
    }
    fs.rmdirSync(extractedPath)
  }
}

/**
 * 解压 tar.gz 文件 (Linux/Mac)
 */
async function extractTarGz(tarFile, targetDir) {
  return new Promise((resolve, reject) => {
    exec(`tar -xzf "${tarFile}" -C "${targetDir}" --strip-components=1`, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 使用指定 Node 版本执行命令
 */
export async function execWithNodeVersion(command, version, cwd, onOutput) {
  const nodePath = getNodeExecutablePath(version)
  const npmPath = getNpmExecutablePath(version)

  // 替换命令中的 node 和 npm
  const modifiedCommand = command
    .replace(/^node\s/, `"${nodePath}" `)
    .replace(/^npm\s/, `"${npmPath}" `)

  console.log(`[execWithNodeVersion] Working directory: ${cwd}`)
  console.log(`[execWithNodeVersion] Node version: ${version}`)
  console.log(`[execWithNodeVersion] Command: ${modifiedCommand}`)

  // 检查工作目录是否存在
  if (!fs.existsSync(cwd)) {
    const error = new Error(`Working directory does not exist: ${cwd}`)
    console.error('[execWithNodeVersion]', error.message)
    throw error
  }

  return new Promise((resolve, reject) => {
    const options = {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      shell: true // 确保在 shell 中执行
    }

    const child = exec(modifiedCommand, options)

    let output = ''

    child.stdout?.on('data', (data) => {
      const text = data.toString()
      output += text
      onOutput?.(text, 'stdout')
    })

    child.stderr?.on('data', (data) => {
      const text = data.toString()
      output += text
      onOutput?.(text, 'stderr')
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (err) => {
      console.error('[execWithNodeVersion] Error:', err)
      reject(err)
    })
  })
}

/**
 * 获取系统 Node 版本
 */
export async function getSystemNodeVersion() {
  try {
    const { stdout } = await execAsync('node --version')
    return stdout.trim().replace('v', '')
  } catch (error) {
    throw new Error('Node.js not found in system PATH')
  }
}
