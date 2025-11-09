import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

console.log('🧹 开始清理项目...\n')

// 要删除的文件列表
const filesToDelete = [
  'server/routes/deploy.js',
  'server/routes/projects.js',
  'server/services/deployment.js',
  'server/services/deployment-v2.js'
]

// 要删除的目录列表
const dirsToDelete = [
  'dist',
  'dist-release',
  'temp-build'
]

// 删除文件
console.log('📄 删除废弃的文件...')
for (const file of filesToDelete) {
  const filePath = path.join(projectRoot, file)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    console.log(`✓ 已删除: ${file}`)
  } else {
    console.log(`⊘ 不存在: ${file}`)
  }
}

// 删除目录
console.log('\n📁 删除构建产物...')
for (const dir of dirsToDelete) {
  const dirPath = path.join(projectRoot, dir)
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`✓ 已删除: ${dir}`)
  } else {
    console.log(`⊘ 不存在: ${dir}`)
  }
}

// 清理 data 目录下的日志文件
console.log('\n📋 清理日志文件...')
const logsDir = path.join(projectRoot, 'data', 'logs')
if (fs.existsSync(logsDir)) {
  const logFiles = fs.readdirSync(logsDir)
  for (const file of logFiles) {
    if (file.endsWith('.log')) {
      fs.unlinkSync(path.join(logsDir, file))
      console.log(`✓ 已删除日志: ${file}`)
    }
  }
}

console.log('\n🎉 清理完成！')
