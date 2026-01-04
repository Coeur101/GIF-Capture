<template>
  <div class="app">
    <!-- 区域选择器模式 -->
    <RegionSelector v-if="isSelector" :isProcessing="isProcessing" @select="onRegionSelect" @cancel="onCancel" />

    <!-- 主界面 -->
    <div v-else class="main-view">
      <header class="header">
        <h1 class="title">GIF Recorder</h1>
      </header>

      <main class="content">
        <div class="grid grid-2">
          <div class="left-panel">
            <RecordingControl
              :isRecording="isRecording"
              :duration="duration"
              :shortcut="config.shortcut"
              :region="currentRegion"
              :isProcessing="isProcessing"
              @start-recording="handleDirectStartRecording"
              @stop-recording="stopRecording"
              @select-region="handleSelectRegionClick"
              @clear-region="handleClearRegion"
            />
            <SettingsPanel :config="config" @update="updateConfig" />
          </div>

          <div class="right-panel">
            <GifPreview :gif-list="gifList" @refresh="loadGifList" @delete="deleteGif"
              @open-location="openGifLocation" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import RegionSelector from './components/RegionSelector.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import GifPreview from './components/GifPreview.vue'
import RecordingControl from './components/RecordingControl.vue'
import { useRecorder } from './composables/useRecorder'
import { createLogger } from './utils/logger'

const logger = createLogger('[主进程]')

// 判断是否是选择器模式
const isSelector = computed(() => window.location.hash === '#/selector')

// 状态
const currentRegion = ref(null)
const isProcessing = ref(false)
const config = ref({
  savePath: '',
  shortcut: 'Ctrl+Shift+G',
  fps: 30
})
const gifList = ref([])

// 录制器
const { isRecording, startRecording: start, stopRecording: stop, recordedBlob, videoResolution } = useRecorder()

// 录制时长
const duration = ref(0)
let durationTimer = null

onMounted(async () => {
  // 加载配置
  await loadConfig()
  // 加载 GIF 列表
  await loadGifList()

  // 监听选择器窗口的日志（仅在主窗口模式）
  if (!isSelector.value && window.electronAPI && window.electronAPI.onSelectorLog) {
    window.electronAPI.onSelectorLog(({ level, tag, args }) => {
      logger[level](`[Selector]`, ...args)
    })
  }

  // 监听快捷键停止录制（仅在主窗口模式）
  if (!isSelector.value && window.electronAPI && window.electronAPI.onStopRecordingShortcut) {
    window.electronAPI.onStopRecordingShortcut(() => {
      if (isRecording.value) {
        logger.log('停止录制')
        stopRecording()
      }
    })
  }

  // 监听区域确认事件（仅在主窗口模式）
  if (!isSelector.value && window.electronAPI && window.electronAPI.onRegionConfirmed) {
    window.electronAPI.onRegionConfirmed((_event, region) => {
      logger.log('区域确认后:', region)
      currentRegion.value = region
    })
  }
})

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
})

// 加载配置
async function loadConfig() {
  const cfg = await window.electronAPI.getConfig()
  config.value = { ...config.value, ...cfg }
}

// 更新配置
async function updateConfig(newConfig) {
  config.value = await window.electronAPI.setConfig(newConfig)
}

// 加载 GIF 列表
async function loadGifList() {
  gifList.value = await window.electronAPI.getGifList()
}

// 删除 GIF
async function deleteGif(filePath) {
  const result = await window.electronAPI.deleteGif(filePath)
  if (result.success) {
    await loadGifList()
  }
}

// 打开文件位置
async function openGifLocation(filePath) {
  await window.electronAPI.openGifLocation(filePath)
}

// 打开区域选择器
function handleSelectRegionClick() {
  if (window.electronAPI && window.electronAPI.showSelector) {
    window.electronAPI.showSelector()
  }
}

// 清空选择区域
function handleClearRegion() {
  currentRegion.value = null
  logger.log('Region cleared')
}

// 直接开始录制（使用已选择的区域）
function handleDirectStartRecording() {
  if (currentRegion.value) {
    startRecording(currentRegion.value)
  }
}

// 区域选择完成（在选择器窗口中调用）
function onRegionSelect(region) {
  // 通过 IPC 发送到主进程，主进程会转发给主窗口
  window.electronAPI.regionSelected(region)
  onCancel()
}

// 取消选择
function onCancel() {
  window.electronAPI.cancelSelection()
}

// 开始录制
async function startRecording(region) {
  if (!region) {
    alert('请先选择录制区域')
    return
  }
  logger.log('选择的区域:', region)
  logger.log('屏幕尺寸:', {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight
  })
  currentRegion.value = region

  // 关闭选择器窗口，这样录制时不会被遮挡
  onCancel()

  // 等待窗口关闭后再开始录制
  setTimeout(async () => {
    await start()
    // 通知主进程录制已开始
    if (window.electronAPI && window.electronAPI.setRecordingState) {
      window.electronAPI.setRecordingState(true)
    }
    // 启动计时器
    duration.value = 0
    durationTimer = setInterval(() => {
      duration.value++
    }, 1000)
  }, 200)
}

// 停止录制
async function stopRecording() {
  // 通知主进程录制已停止
  if (window.electronAPI && window.electronAPI.setRecordingState) {
    window.electronAPI.setRecordingState(false)
  }

  // 停止计时器
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }

  const blob = await stop()
  if (blob) {
    isProcessing.value = true
    try {
      // 将 Blob 转换为 base64
      const reader = new FileReader()
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result

          if (!result || typeof result !== 'string') {
            reject(new Error('FileReader did not return a string'))
            return
          }

          const base64 = result.split(',')[1] // 去掉 data:video/webm;base64, 前缀
          resolve(base64)
        }
        reader.onerror = (error) => {
          logger.error('FileReader error:', error)
          reject(error)
        }
        reader.readAsDataURL(blob)
      })

      // 计算实际的裁剪区域
      let finalRegion = currentRegion.value
      // 如果视频分辨率与屏幕分辨率不同，需要调整坐标
      if (videoResolution.value) {
        const scaleX = videoResolution.value.width / window.screen.width
        const scaleY = videoResolution.value.height / window.screen.height

        logger.log('计算得出的缩放系数', { x: scaleX, y: scaleY })

        finalRegion = {
          x: Math.round(currentRegion.value.x * scaleX),
          y: Math.round(currentRegion.value.y * scaleY),
          width: Math.round(currentRegion.value.width * scaleX),
          height: Math.round(currentRegion.value.height * scaleY)
        }

        logger.log('调整分辨率后的区域:', finalRegion)
      } else {
        logger.warn('视频分辨率与屏幕分辨率相同')
      }
      // 传输纯数据对象并等待保存完成
      const result = await window.electronAPI.saveRecording({
        videoData: base64Data,
        region: finalRegion
      })

      if (result.success) {
        logger.log('GIF保存至:', result.path)
        // 刷新 GIF 列表
        await loadGifList()
      } else {
        throw new Error(result.error || 'Save failed')
      }
    } catch (error) {
      logger.error('保存失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      onCancel()
      isProcessing.value = false
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.main-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-color);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.title {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.shortcut-hint {
  padding: 6px 12px;
  background-color: var(--bg-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.content {
  flex: 1;
  padding: 20px;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
