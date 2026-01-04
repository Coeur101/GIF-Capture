const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// 获取 FFmpeg 路径
function getFfmpegPath() {
  try {
    // 在开发环境中，直接使用 ffmpeg-static
    if (!require('electron').app.isPackaged) {
      const ffmpegPath = require('ffmpeg-static')
      console.log('[FFmpeg] Development Path:', ffmpegPath)
      return ffmpegPath
    }

    // 在生产环境中，需要从 app.asar.unpacked 中获取
    const { app } = require('electron')
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..')

    // 构建 ffmpeg 二进制文件的路径
    const platform = process.platform
    const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    const ffmpegPath = path.join(
      resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'ffmpeg-static',
      ffmpegName
    )

    console.log('[FFmpeg] Production Path:', ffmpegPath)
    console.log('[FFmpeg] Resources Path:', resourcesPath)

    if (!fs.existsSync(ffmpegPath)) {
      console.error('[FFmpeg] File not found at:', ffmpegPath)
      console.error('[FFmpeg] Directory contents:')
      const dir = path.dirname(ffmpegPath)
      if (fs.existsSync(dir)) {
        console.error(fs.readdirSync(dir))
      }
      throw new Error(`FFmpeg not found at ${ffmpegPath}`)
    }

    return ffmpegPath
  } catch (error) {
    console.error('[FFmpeg] Error getting ffmpeg path:', error)
    throw error
  }
}

const ffmpegPath = getFfmpegPath()

function convertToGif(inputPath, outputPath, region, config) {
  return new Promise((resolve, reject) => {
    const fps = config.fps || 15
    const maxWidth = config.maxWidth || 0 // 0 表示不限制

    console.log('[FFmpeg] convertToGif called with:', {
      inputPath,
      outputPath,
      region,
      config,
      maxWidth
    })

    // 构建滤镜
    let filters = []

    // 如果有区域裁剪
    if (region && region.width && region.height) {
      const cropFilter = `crop=${region.width}:${region.height}:${region.x}:${region.y}`
      console.log('[FFmpeg] Adding crop filter:', cropFilter)
      filters.push(cropFilter)
    }

    // 设置帧率
    filters.push(`fps=${fps}`)

    // 只有设置了有效的最大宽度才进行缩放
    if (maxWidth > 0) {
      const scaleFilter = `scale='min(${maxWidth},iw)':-1:flags=lanczos`
      console.log('[FFmpeg] Adding scale filter:', scaleFilter)
      filters.push(scaleFilter)
    } else {
      console.log('[FFmpeg] No scaling applied (maxWidth is 0 or not set)')
    }

    // 分割滤镜用于调色板生成
    filters.push('split[s0][s1]')

    const filterComplex = filters.join(',') + ';[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5'

    // 构建 ffmpeg 命令参数
    const args = [
      '-i', inputPath,
      '-filter_complex', filterComplex,
      '-y', // 覆盖输出文件
      outputPath
    ]

    console.log('FFmpeg command:', ffmpegPath, args.join(' '))

    // 执行 ffmpeg
    const process = spawn(ffmpegPath, args)

    let stderr = ''

    process.stderr.on('data', (data) => {
      stderr += data.toString()
      // 可以解析进度信息
      const progressMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/)
      if (progressMatch) {
        console.log('Processing:', progressMatch[1])
      }
    })

    process.on('close', (code) => {
      if (code === 0) {
        console.log('GIF conversion completed:', outputPath)
        resolve(outputPath)
      } else {
        console.error('FFmpeg error:', stderr)
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`))
      }
    })

    process.on('error', (err) => {
      console.error('FFmpeg spawn error:', err)
      reject(err)
    })
  })
}

module.exports = { convertToGif }
