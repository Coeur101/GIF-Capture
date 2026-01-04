const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const defaultConfig = {
  savePath: '',
  shortcut: 'Ctrl+Shift+G',
  fps: 30
}

let configPath
let currentConfig = { ...defaultConfig }

function initConfig() {
  if (!configPath) {
    const userDataPath = app.getPath('userData')
    configPath = path.join(userDataPath, 'config.json')
  }

  // 如果配置文件存在，读取它
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8')
      currentConfig = { ...defaultConfig, ...JSON.parse(data) }
    } catch (error) {
      console.error('Failed to read config:', error)
      currentConfig = { ...defaultConfig }
    }
  } else {
    // 创建默认配置文件
    saveConfigToFile()
  }
}

function saveConfigToFile() {
  try {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

function getConfig() {
  if (!configPath) {
    initConfig()
  }
  return { ...currentConfig }
}

function setConfig(config) {
  if (!configPath) {
    initConfig()
  }

  if (config.savePath !== undefined) {
    currentConfig.savePath = config.savePath
  }
  if (config.shortcut !== undefined) {
    currentConfig.shortcut = config.shortcut
  }
  if (config.fps !== undefined) {
    currentConfig.fps = config.fps
  }

  saveConfigToFile()
  return getConfig()
}

module.exports = { getConfig, setConfig }
