import { ref } from 'vue'
import { createLogger } from '../utils/logger'

const logger = createLogger('[useRecorder]')

export function useRecorder() {
  const isRecording = ref(false)
  const recordedBlob = ref(null)
  const videoResolution = ref(null)

  let mediaRecorder = null
  let recordedChunks = []
  let stream = null

  async function startRecording() {
    try {
      // 获取屏幕源
      const sources = await window.electronAPI.getSources()
      if (!sources || sources.length === 0) {
        throw new Error('No screen sources available')
      }

      // 获取屏幕流 - 使用屏幕的实际分辨率
      const screenWidth = window.screen.width
      const screenHeight = window.screen.height

      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id,
            minWidth: screenWidth,
            maxWidth: screenWidth,
            minHeight: screenHeight,
            maxHeight: screenHeight
          }
        }
      })

      // 获取视频轨道的实际分辨率
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      videoResolution.value = {
        width: settings.width,
        height: settings.height
      }

      // 创建 MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      }

      // 检查支持的 mimeType
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8'
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm'
      }

      mediaRecorder = new MediaRecorder(stream, options)
      recordedChunks = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' })
        recordedBlob.value = blob
      }

      mediaRecorder.onerror = (error) => {
        logger.error('MediaRecorder error:', error)
        stopRecording()
      }

      mediaRecorder.start(100) // 每 100ms 收集一次数据
      isRecording.value = true

      return true
    } catch (error) {
      logger.error('Start recording error:', error)
      return false
    }
  }

  async function stopRecording() {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        isRecording.value = false
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' })
        recordedBlob.value = blob
        isRecording.value = false

        // 停止所有轨道
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          stream = null
        }
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }

  function cleanup() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    mediaRecorder = null
    recordedChunks = []
  }

  return {
    isRecording,
    recordedBlob,
    videoResolution,
    startRecording,
    stopRecording,
    cleanup
  }
}
