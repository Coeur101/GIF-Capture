console.log('[DEBUG] Loading electron module...')
const electronModule = require('electron')
console.log('[DEBUG] electron type:', typeof electronModule)
console.log('[DEBUG] electron.app:', typeof electronModule.app)

const { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer, dialog } = electronModule
const path = require('path')
const { setupIpcHandlers } = require('./ipc/handlers')
const { registerShortcuts, unregisterShortcuts, setRecordingState } = require('./utils/shortcuts')

let mainWindow = null
let selectorWindow = null

const isDev = !app.isPackaged

function createMainWindow() {
  console.log('[Main] Creating main window, isDev:', isDev, 'isPackaged:', app.isPackaged)
  console.log('[Main] __dirname:', __dirname)

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false, // 等待 ready-to-show 事件再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1a1a1a', // 添加背景色，避免透明窗口在某些系统上显示问题
    title: 'GIF Capture'
  })

  if (isDev) {
    console.log('[Main] Loading development URL: http://localhost:5173/')
    mainWindow.loadURL('http://localhost:5173/')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：修正路径为 build/renderer
    const indexPath = path.join(__dirname, '../build/renderer/index.html')
    console.log('[Main] Loading production file from:', indexPath)
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[Main] Failed to load index.html:', err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Main window ready to show')
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => {
    console.log('[Main] Main window closed')
    mainWindow = null
  })
}

function createSelectorWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { bounds } = primaryDisplay

  console.log('[Main] Creating selector window')

  selectorWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    console.log('[Main] Loading selector dev URL')
    selectorWindow.loadURL('http://localhost:5173/#/selector')
  } else {
    // 生产环境：修正路径为 build/renderer
    const indexPath = path.join(__dirname, '../build/renderer/index.html')
    console.log('[Main] Loading selector from:', indexPath)
    selectorWindow.loadFile(indexPath, {
      hash: '/selector'
    }).catch(err => {
      console.error('[Main] Failed to load selector:', err)
    })
  }

  selectorWindow.on('closed', () => {
    console.log('[Main] Selector window closed')
    selectorWindow = null
  })
}

function showSelector() {
  if (selectorWindow) {
    selectorWindow.focus()
    return
  }
  createSelectorWindow()
}

function closeSelector() {
  if (selectorWindow) {
    selectorWindow.close()
    selectorWindow = null
  }
}

app.whenReady().then(() => {
  createMainWindow()
  setupIpcHandlers(ipcMain, { mainWindow, showSelector, closeSelector })
  registerShortcuts(globalShortcut, showSelector, mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  unregisterShortcuts(globalShortcut)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  unregisterShortcuts(globalShortcut)
})

// 获取屏幕源
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 0, height: 0 }
  })
  return sources.map(source => ({
    id: source.id,
    name: source.name
  }))
})

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled) {
    return null
  }
  return result.filePaths[0]
})

// 日志转发（从选择器窗口到主窗口）
ipcMain.on('forward-log', (_event, { level, tag, args }) => {
  // 也在主进程的终端输出
  console.log(`[Selector]${tag}`, ...args)

  // 转发到主窗口渲染进程
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('selector-log', { level, tag, args })
  }
})

// 隐藏选择器窗口（录制时）
ipcMain.on('hide-selector', () => {
  if (selectorWindow) {
    selectorWindow.hide()
  }
})

// 显示选择器窗口
ipcMain.on('show-selector-window', () => {
  if (selectorWindow) {
    selectorWindow.show()
  }
})

// 设置录制状态（用于快捷键切换）
ipcMain.on('set-recording-state', (_event, recording) => {
  setRecordingState(recording)
})
