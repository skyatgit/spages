/**
 * 迁移脚本：将旧的项目结构迁移到新的 V3 结构
 *
 * 旧结构:
 * - data/projects.json (所有项目配置)
 * - data/logs/*.log (所有日志混在一起)
 * - projects/{projectName}/ (源码直接放在项目文件夹)
 *
 * 新结构:
 * - data/projects-index.json (项目索引)
 * - projects/{projectName}/.spages/config.json (项目配置)
 * - projects/{projectName}/.spages/deployments.json (部署历史)
 * - projects/{projectName}/.spages/env.json (环境变量)
 * - projects/{projectName}/.spages/logs/*.log (项目日志)
 * - projects/{projectName}/source/ (源码)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects')
const OLD_LOGS_DIR = path.join(DATA_DIR, 'logs')

console.log('🚀 Starting migration to V3 structure...\n')

// Read old projects.json
const oldProjectsPath = path.join(DATA_DIR, 'projects.json')
if (!fs.existsSync(oldProjectsPath)) {
  console.log('✅ No old projects.json found, nothing to migrate')
  process.exit(0)
}

const oldProjects = JSON.parse(fs.readFileSync(oldProjectsPath, 'utf-8'))
const projectIds = Object.keys(oldProjects)

if (projectIds.length === 0) {
  console.log('✅ No projects to migrate')
  process.exit(0)
}

console.log(`Found ${projectIds.length} projects to migrate:\n`)

const newIndex = {}

for (const projectId of projectIds) {
  const project = oldProjects[projectId]
  console.log(`📦 Migrating: ${project.name} (${projectId})`)

  try {
    const oldProjectPath = path.join(PROJECTS_DIR, project.name)
    const newProjectPath = path.join(PROJECTS_DIR, project.name)
    const spagesDir = path.join(newProjectPath, '.spages')
    const sourceDir = path.join(newProjectPath, 'source')
    const logsDir = path.join(spagesDir, 'logs')

    // Step 1: Create .spages directory structure
    if (!fs.existsSync(spagesDir)) {
      fs.mkdirSync(spagesDir, { recursive: true })
      console.log('  ✓ Created .spages/ directory')
    }

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
      console.log('  ✓ Created .spages/logs/ directory')
    }

    // Step 2: Move source code to source/ directory if it exists
    if (fs.existsSync(oldProjectPath)) {
      const files = fs.readdirSync(oldProjectPath)
      const hasSourceCode = files.some(f => !f.startsWith('.spages'))

      if (hasSourceCode && !fs.existsSync(sourceDir)) {
        // Create temporary directory
        const tempDir = path.join(PROJECTS_DIR, `${project.name}_temp`)
        fs.mkdirSync(tempDir, { recursive: true })

        // Move all files except .spages to temp
        for (const file of files) {
          if (file !== '.spages') {
            const oldPath = path.join(oldProjectPath, file)
            const tempPath = path.join(tempDir, file)
            fs.renameSync(oldPath, tempPath)
          }
        }

        // Rename temp to source
        fs.renameSync(tempDir, sourceDir)
        console.log('  ✓ Moved source code to source/ directory')
      }
    } else {
      // Create empty source directory
      fs.mkdirSync(sourceDir, { recursive: true })
      console.log('  ✓ Created empty source/ directory')
    }

    // Step 3: Create config.json
    const configPath = path.join(spagesDir, 'config.json')
    const config = {
      id: project.id,
      name: project.name,
      accountId: project.accountId,
      repository: project.repository,
      owner: project.owner,
      repo: project.repo,
      branch: project.branch,
      port: project.port,
      buildCommand: project.buildCommand || 'npm run build',
      outputDir: project.outputDir || 'dist',
      status: project.status || 'stopped',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt || new Date().toISOString(),
      lastDeploy: project.lastDeploy || null,
      url: project.url || null,
      nodeVersion: project.nodeVersion || null
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('  ✓ Created config.json')

    // Step 4: Create deployments.json (empty history for now)
    const deploymentsPath = path.join(spagesDir, 'deployments.json')
    const deployments = {
      current: null,
      history: []
    }

    // Try to extract deployment info from old logs
    if (fs.existsSync(OLD_LOGS_DIR)) {
      const oldLogFiles = fs.readdirSync(OLD_LOGS_DIR)
        .filter(f => f.startsWith(projectId) && f.endsWith('.log'))
        .sort()
        .reverse()

      for (const logFile of oldLogFiles) {
        const timestamp = logFile.match(/\d+/)
        if (timestamp) {
          const deploymentId = `deploy_${timestamp[0]}`
          deployments.history.push({
            id: deploymentId,
            timestamp: new Date(parseInt(timestamp[0])).toISOString(),
            status: project.status === 'running' ? 'success' : 'failed',
            commit: null,
            branch: project.branch,
            logFile: `${deploymentId}.log`,
            duration: null
          })

          // Copy log file to new location
          const oldLogPath = path.join(OLD_LOGS_DIR, logFile)
          const newLogPath = path.join(logsDir, `${deploymentId}.log`)
          fs.copyFileSync(oldLogPath, newLogPath)
        }
      }

      if (deployments.history.length > 0) {
        deployments.current = deployments.history[0].id
        console.log(`  ✓ Migrated ${deployments.history.length} deployment logs`)
      }
    }

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2))
    console.log('  ✓ Created deployments.json')

    // Step 5: Create env.json (empty for now)
    const envPath = path.join(spagesDir, 'env.json')
    fs.writeFileSync(envPath, JSON.stringify({}, null, 2))
    console.log('  ✓ Created env.json')

    // Step 6: Add to new index
    newIndex[projectId] = {
      name: project.name,
      path: `projects/${project.name}`,
      port: project.port,
      status: project.status || 'stopped',
      lastDeploy: project.lastDeploy || null,
      repository: project.repository,
      branch: project.branch,
      url: project.url || null,
      updatedAt: new Date().toISOString()
    }

    console.log(`✅ Successfully migrated: ${project.name}\n`)
  } catch (error) {
    console.error(`❌ Failed to migrate ${project.name}:`, error.message)
    console.error(error)
  }
}

// Write new index file
const indexPath = path.join(DATA_DIR, 'projects-index.json')
fs.writeFileSync(indexPath, JSON.stringify(newIndex, null, 2))
console.log(`📝 Created projects-index.json with ${Object.keys(newIndex).length} projects`)

// Backup old projects.json
const backupPath = path.join(DATA_DIR, 'projects.json.backup')
fs.copyFileSync(oldProjectsPath, backupPath)
console.log(`💾 Backed up old projects.json to projects.json.backup`)

console.log('\n✅ Migration completed!')
console.log('\n📋 Next steps:')
console.log('   1. Review the migrated projects in the projects/ directory')
console.log('   2. Restart the server to use the new V3 structure')
console.log('   3. If everything works, you can delete:')
console.log('      - data/projects.json.backup')
console.log('      - data/logs/ (old logs have been copied to each project)')
