import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(process.cwd(), 'data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

export class ConfigManager {
  constructor(filename) {
    this.filePath = path.join(DATA_DIR, filename)
    this.ensureFile()
  }

  ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2))
    }
  }

  read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading config:', error)
      return {}
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2))
      return true
    } catch (error) {
      console.error('Error writing config:', error)
      return false
    }
  }

  update(key, value) {
    const data = this.read()
    data[key] = value
    return this.write(data)
  }

  delete(key) {
    const data = this.read()
    delete data[key]
    return this.write(data)
  }
}

export const mainConfig = new ConfigManager('config.json')
export const projectsConfig = new ConfigManager('projects.json')
export const githubAccountsConfig = new ConfigManager('github-accounts.json')
export const githubAppConfig = new ConfigManager('github-app.json') // 共享 GitHub App 配置
