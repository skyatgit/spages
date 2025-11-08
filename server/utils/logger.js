import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LOGS_DIR = path.join(DATA_DIR, 'logs')

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

export class Logger {
  constructor(projectId) {
    this.projectId = projectId
    this.projectLogDir = path.join(LOGS_DIR, projectId)

    if (!fs.existsSync(this.projectLogDir)) {
      fs.mkdirSync(this.projectLogDir, { recursive: true })
    }
  }

  createLogFile() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
    const filename = `${timestamp}.log`
    this.currentLogFile = path.join(this.projectLogDir, filename)
    return this.currentLogFile
  }

  write(message) {
    if (!this.currentLogFile) {
      this.createLogFile()
    }

    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`

    fs.appendFileSync(this.currentLogFile, logEntry)
    console.log(logEntry.trim())
  }

  error(message) {
    this.write(`ERROR: ${message}`)
  }

  info(message) {
    this.write(`INFO: ${message}`)
  }

  success(message) {
    this.write(`SUCCESS: ${message}`)
  }
}
