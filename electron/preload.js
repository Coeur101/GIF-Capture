const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 屏幕源
  getSources: () => ipcRenderer.invoke('get-sources'),

  // 区域选择
  regionSelected: (region) => ipcRenderer.send('region-selected', region),
  cancelSelection: () => ipcRenderer.send('cancel-selection'),
  hideSelector: () => ipcRenderer.send('hide-selector'),
  showSelector: () => ipcRenderer.send('show-selector-window'),
  onStartSelection: (callback) => {
    ipcRenderer.on('start-selection', callback)
    return () => ipcRenderer.removeListener('start-selection', callback)
  },

  // 录制控制
  saveRecording: (data) => ipcRenderer.invoke('save-recording', data),
  onRecordingComplete: (callback) => {
    ipcRenderer.on('recording-complete', callback)
    return () => ipcRenderer.removeListener('recording-complete', callback)
  },
  onRecordingError: (callback) => {
    ipcRenderer.on('recording-error', callback)
    return () => ipcRenderer.removeListener('recording-error', callback)
  },

  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // GIF 文件管理
  getGifList: () => ipcRenderer.invoke('get-gif-list'),
  getGifData: (filePath) => ipcRenderer.invoke('get-gif-data', filePath),
  deleteGif: (filePath) => ipcRenderer.invoke('delete-gif', filePath),
  openGifLocation: (filePath) => ipcRenderer.invoke('open-gif-location', filePath),

  // 事件监听
  onRegionConfirmed: (callback) => {
    ipcRenderer.on('region-confirmed', callback)
    return () => ipcRenderer.removeListener('region-confirmed', callback)
  },
  onShowSelector: (callback) => {
    ipcRenderer.on('show-selector', callback)
    return () => ipcRenderer.removeListener('show-selector', callback)
  },

  // 日志转发（将选择器窗口的日志发送到主窗口）
  forwardLog: (level, tag, ...args) => ipcRenderer.send('forward-log', { level, tag, args }),

  // 监听选择器窗口的日志（主窗口接收）
  onSelectorLog: (callback) => {
    ipcRenderer.on('selector-log', (_event, data) => callback(data))
    return () => ipcRenderer.removeListener('selector-log', callback)
  },

  // 设置录制状态（用于快捷键判断）
  setRecordingState: (recording) => ipcRenderer.send('set-recording-state', recording),

  // 监听快捷键停止录制事件
  onStopRecordingShortcut: (callback) => {
    ipcRenderer.on('stop-recording-shortcut', callback)
    return () => ipcRenderer.removeListener('stop-recording-shortcut', callback)
  }
})
