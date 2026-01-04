/**
 * 安全地序列化参数，避免 IPC 克隆错误
 */
function serializeArgs(args) {
  return args.map(arg => {
    if (arg === null || arg === undefined) return arg
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') return arg

    try {
      // 尝试序列化对象
      return JSON.parse(JSON.stringify(arg))
    } catch (e) {
      // 如果序列化失败，返回字符串表示
      return String(arg)
    }
  })
}

/**
 * 创建一个日志记录器，将日志转发到主窗口控制台
 * @param {string} tag - 日志标签，如 '[RegionSelector]'
 * @returns {Object} 日志函数集合
 */
export function createLogger(tag) {
  function forwardLog(level, ...args) {

    // 序列化后再转发到主窗口，避免 IPC 克隆错误
    if (window.electronAPI && window.electronAPI.forwardLog) {
      try {
        const serializedArgs = serializeArgs(args)
        window.electronAPI.forwardLog(level, ` ${tag}`, ...serializedArgs)
      } catch (e) {
        // 如果转发失败，只在本地记录错误
        console.error('Failed to forward log:', e)
      }
    }
  }

  return {
    log: (...args) => forwardLog('log', ...args),
    info: (...args) => forwardLog('info', ...args),
    warn: (...args) => forwardLog('warn', ...args),
    error: (...args) => forwardLog('error', ...args)
  }
}
