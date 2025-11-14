import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// 从 backend/server/utils/ 向上两级到 backend/，然后进入 data
const DATA_DIR = path.resolve(__dirname, '../..', 'data')

// 确保数据目录存在
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
export const githubAppConfig = new ConfigManager('github-app.json') // GitHub App 配置
