import fs from 'fs'
import path from 'path'

/**
 * 框架检测服务
 * 自动识别项目使用的框架和构建工具
 */

/**
 * 检测项目框架类型
 */
export function detectFramework(projectPath) {
  console.log('[FrameworkDetector] Detecting framework for:', projectPath)

  const packageJsonPath = path.join(projectPath, 'package.json')

  // 检查是否有 package.json
  if (!fs.existsSync(packageJsonPath)) {
    console.log('[FrameworkDetector] No package.json found')
    return detectStaticProject(projectPath)
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

    // 检测框架
    const framework = identifyFramework(packageJson, projectPath)
    console.log('[FrameworkDetector] Detected framework:', framework.name)

    return framework
  } catch (error) {
    console.error('[FrameworkDetector] Error reading package.json:', error)
    return detectStaticProject(projectPath)
  }
}

/**
 * 识别框架类型
 */
function identifyFramework(packageJson, projectPath) {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }

  const scripts = packageJson.scripts || {}

  // Vue 3 + Vite
  if (dependencies['vue'] && dependencies['vite']) {
    return {
      name: 'Vue 3 (Vite)',
      type: 'vue-vite',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null, // 静态文件
      outputDir: detectOutputDir(projectPath, ['dist', 'build']),
      needsBuild: true,
      installDeps: true,
      framework: 'vue',
      buildTool: 'vite'
    }
  }

  // Vue 2 + Vue CLI
  if (dependencies['vue'] && (dependencies['@vue/cli-service'] || dependencies['vue-cli'])) {
    return {
      name: 'Vue 2 (Vue CLI)',
      type: 'vue-cli',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['dist', 'build']),
      needsBuild: true,
      installDeps: true,
      framework: 'vue',
      buildTool: 'webpack'
    }
  }

  // React + Vite
  if (dependencies['react'] && dependencies['vite']) {
    return {
      name: 'React (Vite)',
      type: 'react-vite',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['dist', 'build']),
      needsBuild: true,
      installDeps: true,
      framework: 'react',
      buildTool: 'vite'
    }
  }

  // React + Create React App
  if (dependencies['react'] && dependencies['react-scripts']) {
    return {
      name: 'React (Create React App)',
      type: 'create-react-app',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['build', 'dist']),
      needsBuild: true,
      installDeps: true,
      framework: 'react',
      buildTool: 'webpack'
    }
  }

  // Next.js
  if (dependencies['next']) {
    return {
      name: 'Next.js',
      type: 'nextjs',
      buildCommand: scripts.build || 'npm run build',
      startCommand: scripts.start || 'npm start',
      outputDir: '.next',
      needsBuild: true,
      installDeps: true,
      framework: 'react',
      buildTool: 'webpack',
      isSSR: true
    }
  }

  // Nuxt.js
  if (dependencies['nuxt']) {
    return {
      name: 'Nuxt.js',
      type: 'nuxtjs',
      buildCommand: scripts.build || 'npm run build',
      startCommand: scripts.start || 'npm start',
      outputDir: '.nuxt',
      needsBuild: true,
      installDeps: true,
      framework: 'vue',
      buildTool: 'webpack',
      isSSR: true
    }
  }

  // Svelte + Vite
  if (dependencies['svelte'] && dependencies['vite']) {
    return {
      name: 'Svelte (Vite)',
      type: 'svelte-vite',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['dist', 'build', 'public/build']),
      needsBuild: true,
      installDeps: true,
      framework: 'svelte',
      buildTool: 'vite'
    }
  }

  // Angular
  if (dependencies['@angular/core']) {
    return {
      name: 'Angular',
      type: 'angular',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['dist', 'dist/browser']),
      needsBuild: true,
      installDeps: true,
      framework: 'angular',
      buildTool: 'angular-cli'
    }
  }

  // 纯 Vite 项目
  if (dependencies['vite']) {
    return {
      name: 'Vite',
      type: 'vite',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['dist', 'build']),
      needsBuild: true,
      installDeps: true,
      framework: 'vanilla',
      buildTool: 'vite'
    }
  }

  // 纯 Webpack 项目
  if (dependencies['webpack']) {
    return {
      name: 'Webpack',
      type: 'webpack',
      buildCommand: scripts.build || 'npm run build',
      startCommand: null,
      outputDir: detectOutputDir(projectPath, ['dist', 'build']),
      needsBuild: true,
      installDeps: true,
      framework: 'vanilla',
      buildTool: 'webpack'
    }
  }

  // 有 package.json 但没有识别到框架
  // 检查是否有构建脚本
  if (scripts.build) {
    return {
      name: 'Custom Build',
      type: 'custom',
      buildCommand: scripts.build,
      startCommand: scripts.start || null,
      outputDir: detectOutputDir(projectPath, ['dist', 'build', 'public', 'out']),
      needsBuild: true,
      installDeps: true,
      framework: 'unknown',
      buildTool: 'custom'
    }
  }

  // 纯 Node.js 项目（无构建）
  return {
    name: 'Node.js Project',
    type: 'nodejs',
    buildCommand: null,
    startCommand: scripts.start || 'node index.js',
    outputDir: '.',
    needsBuild: false,
    installDeps: true,
    framework: 'nodejs',
    buildTool: null
  }
}

/**
 * 检测静态项目（无 package.json）
 */
function detectStaticProject(projectPath) {
  console.log('[FrameworkDetector] Detecting static project')

  // 检查是否有常见的静态文件
  const hasIndexHtml = fs.existsSync(path.join(projectPath, 'index.html'))
  const hasIndexHtm = fs.existsSync(path.join(projectPath, 'index.htm'))

  if (hasIndexHtml || hasIndexHtm) {
    // 纯静态 HTML 项目
    return {
      name: 'Static HTML',
      type: 'static-html',
      buildCommand: null,
      startCommand: null,
      outputDir: '.', // 直接使用根目录
      needsBuild: false,
      installDeps: false,
      framework: 'static',
      buildTool: null
    }
  }

  // 检查是否有 public 目录
  const publicDir = path.join(projectPath, 'public')
  if (fs.existsSync(publicDir)) {
    const hasPublicIndex = fs.existsSync(path.join(publicDir, 'index.html'))
    if (hasPublicIndex) {
      return {
        name: 'Static HTML (public)',
        type: 'static-html',
        buildCommand: null,
        startCommand: null,
        outputDir: 'public',
        needsBuild: false,
        installDeps: false,
        framework: 'static',
        buildTool: null
      }
    }
  }

  // 无法识别
  return {
    name: 'Unknown',
    type: 'unknown',
    buildCommand: null,
    startCommand: null,
    outputDir: '.',
    needsBuild: false,
    installDeps: false,
    framework: 'unknown',
    buildTool: null
  }
}

/**
 * 检测输出目录
 */
function detectOutputDir(projectPath, possibleDirs) {
  // 优先检查 vite.config 或 webpack.config
  const viteConfig = findConfigFile(projectPath, ['vite.config.js', 'vite.config.ts'])
  if (viteConfig) {
    const outputDir = parseViteConfig(viteConfig)
    if (outputDir) return outputDir
  }

  // 检查可能的输出目录
  for (const dir of possibleDirs) {
    const fullPath = path.join(projectPath, dir)
    if (fs.existsSync(fullPath)) {
      return dir
    }
  }

  // 默认返回第一个
  return possibleDirs[0]
}

/**
 * 查找配置文件
 */
function findConfigFile(projectPath, configFiles) {
  for (const file of configFiles) {
    const configPath = path.join(projectPath, file)
    if (fs.existsSync(configPath)) {
      return configPath
    }
  }
  return null
}

/**
 * 解析 Vite 配置
 */
function parseViteConfig(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    // 简单的正则匹配 outDir
    const match = content.match(/outDir:\s*['"]([^'"]+)['"]/)
    if (match) {
      return match[1]
    }
  } catch (error) {
    console.error('[FrameworkDetector] Error parsing vite config:', error)
  }
  return null
}

/**
 * 获取框架显示名称
 */
export function getFrameworkDisplayName(framework) {
  return framework.name || 'Unknown'
}

/**
 * 检查是否需要构建
 */
export function needsBuild(framework) {
  return framework.needsBuild === true
}

/**
 * 检查是否需要安装依赖
 */
export function needsInstallDeps(framework) {
  return framework.installDeps === true
}
