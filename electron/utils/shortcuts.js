const { getConfig } = require('./config')

let registeredShortcut = null
let isRecording = false
let mainWindowRef = null

function registerShortcuts(globalShortcut, showSelectorCallback, mainWindow) {
  const config = getConfig()
  const shortcut = config.shortcut || 'Ctrl+Shift+G'
  mainWindowRef = mainWindow

  // 注销之前的快捷键
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut)
  }

  // 注册新快捷键
  const success = globalShortcut.register(shortcut, () => {
    if (isRecording) {
      // 如果正在录制，发送停止录制消息到主窗口
      if (mainWindowRef && mainWindowRef.webContents) {
        mainWindowRef.webContents.send('stop-recording-shortcut')
      }
    } else {
      // 否则打开选择器
      showSelectorCallback()
    }
  })

  if (success) {
    registeredShortcut = shortcut
    console.log(`Shortcut ${shortcut} registered successfully`)
  } else {
    console.error(`Failed to register shortcut ${shortcut}`)
  }

  return success
}

function setRecordingState(recording) {
  isRecording = recording
}

function unregisterShortcuts(globalShortcut) {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut)
    registeredShortcut = null
  }
  globalShortcut.unregisterAll()
}

function updateShortcut(globalShortcut, newShortcut, showSelectorCallback) {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut)
  }

  const success = globalShortcut.register(newShortcut, () => {
    showSelectorCallback()
  })

  if (success) {
    registeredShortcut = newShortcut
  }

  return success
}

module.exports = { registerShortcuts, unregisterShortcuts, updateShortcut, setRecordingState }
