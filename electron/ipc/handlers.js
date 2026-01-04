const { shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { convertToGif } = require('../utils/ffmpeg')
const { getConfig, setConfig } = require('../utils/config')

let currentRegion = null
let windowRefs = null

function setupIpcHandlers(ipcMain, refs) {
  windowRefs = refs

  // 区域选择完成
  ipcMain.on('region-selected', (event, region) => {
    currentRegion = region
    if (windowRefs.mainWindow) {
      windowRefs.mainWindow.webContents.send('region-confirmed', region)
      windowRefs.mainWindow.focus()
    }
  })

  // 取消选择
  ipcMain.on('cancel-selection', () => {
    currentRegion = null
    if (windowRefs.closeSelector) {
      windowRefs.closeSelector()
    }
  })

  // 保存录制
  ipcMain.handle('save-recording', async (event, data) => {
    try {
      const { videoData, region } = data

      if (!videoData) {
        throw new Error('videoData is undefined')
      }

      const config = getConfig()
      let savePath = config.savePath

      // 如果没有配置保存路径,使用默认路径
      if (!savePath) {
        const { app } = require('electron')
        savePath = path.join(app.getPath('documents'), 'GIFRecorder')
      }

      // 确保目录存在
      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath, { recursive: true })
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const tempVideoPath = path.join(savePath, `temp_${timestamp}.webm`)
      const outputPath = path.join(savePath, `recording_${timestamp}.gif`)

      // 将 base64 转换为 Buffer 并保存临时视频文件
      const videoBuffer = Buffer.from(videoData, 'base64')
      fs.writeFileSync(tempVideoPath, videoBuffer)

      // 转换为 GIF
      await convertToGif(tempVideoPath, outputPath, region, config)

      // 删除临时文件
      fs.unlinkSync(tempVideoPath)

      return { success: true, path: outputPath }
    } catch (error) {
      console.error('Save recording error:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取配置
  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  // 设置配置
  ipcMain.handle('set-config', (event, newConfig) => {
    return setConfig(newConfig)
  })

  // 获取 GIF 列表
  ipcMain.handle('get-gif-list', () => {
    const config = getConfig()
    let savePath = config.savePath

    if (!savePath) {
      const { app } = require('electron')
      savePath = path.join(app.getPath('documents'), 'GIFRecorder')
    }

    if (!fs.existsSync(savePath)) {
      return []
    }

    const files = fs.readdirSync(savePath)
      .filter(file => file.endsWith('.gif'))
      .map(file => {
        const filePath = path.join(savePath, file)
        const stats = fs.statSync(filePath)
        return {
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime
        }
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return files
  })

  // 获取 GIF 文件数据（base64）
  ipcMain.handle('get-gif-data', (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath)
        const base64 = buffer.toString('base64')
        return { success: true, data: base64 }
      }
      return { success: false, error: 'File not found' }
    } catch (error) {
      console.error('Get GIF data error:', error)
      return { success: false, error: error.message }
    }
  })

  // 删除 GIF
  ipcMain.handle('delete-gif', (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return { success: true }
      }
      return { success: false, error: 'File not found' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 打开文件位置
  ipcMain.handle('open-gif-location', (event, filePath) => {
    shell.showItemInFolder(filePath)
    return { success: true }
  })
}

module.exports = { setupIpcHandlers }
