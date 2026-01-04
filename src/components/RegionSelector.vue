<template>
  <div class="selector-overlay" @mousedown="startSelection" @mousemove="updateSelection" @mouseup="endSelection"
    @keydown.esc="cancel" tabindex="0" ref="overlay">
    <!-- 灰色遮罩层 -->
    <div v-if="hasSelection" class="mask-overlay">
      <!-- 顶部遮罩 -->
      <div class="mask-top" :style="maskTopStyle"></div>
      <!-- 底部遮罩 -->
      <div class="mask-bottom" :style="maskBottomStyle"></div>
      <!-- 左侧遮罩 -->
      <div class="mask-left" :style="maskLeftStyle"></div>
      <!-- 右侧遮罩 -->
      <div class="mask-right" :style="maskRightStyle"></div>
    </div>

    <!-- 选择提示 -->
    <div v-if="!isSelecting && !hasSelection && !isProcessing" class="hint">
      <p>拖拽鼠标选择录制区域</p>
      <p class="hint-sub">按 ESC 取消</p>
    </div>

    <!-- 处理中遮罩 -->
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-content">
        <div class="spinner"></div>
        <p class="processing-text">正在生成 GIF...</p>
        <p class="processing-hint">请稍候，这可能需要几秒钟</p>
      </div>
    </div>

    <!-- 选择区域 - 包含选择中和已选择状态 -->
    <div v-if="selection && !isProcessing" class="selection-box" :style="selectionStyle" :class="{ 'selecting': isSelecting }">
      <div v-if="!isSelecting" class="selection-info">
        位置: ({{ selection.screenX }}, {{ selection.screenY }})<br>
        尺寸: {{ selection.screenWidth }} x {{ selection.screenHeight }}
      </div>
    </div>

    <!-- 确认按钮 -->
    <div v-if="hasSelection && !isSelecting && !isProcessing" class="confirm-panel">
      <button class="btn btn-primary" @click="confirmSelection">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        确认选择
      </button>
      <button class="btn btn-secondary" @click="reset">重新选择</button>
      <button class="btn btn-secondary" @click="cancel">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { createLogger } from '../utils/logger'

const logger = createLogger('[RegionSelector]')
const log = logger.log

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'cancel'])

const overlay = ref(null)
const isSelecting = ref(false)
const startPoint = ref(null)
const endPoint = ref(null)

const selection = computed(() => {
  if (!startPoint.value || !endPoint.value) return null

  // 计算屏幕坐标（用于录制）
  const screenX = Math.min(startPoint.value.screenX, endPoint.value.screenX)
  const screenY = Math.min(startPoint.value.screenY, endPoint.value.screenY)
  const screenWidth = Math.abs(endPoint.value.screenX - startPoint.value.screenX)
  const screenHeight = Math.abs(endPoint.value.screenY - startPoint.value.screenY)

  // 计算客户端坐标（用于显示）
  const clientX = Math.min(startPoint.value.clientX, endPoint.value.clientX)
  const clientY = Math.min(startPoint.value.clientY, endPoint.value.clientY)
  const clientWidth = Math.abs(endPoint.value.clientX - startPoint.value.clientX)
  const clientHeight = Math.abs(endPoint.value.clientY - startPoint.value.clientY)

  const result = {
    // 屏幕坐标（用于录制）
    screenX,
    screenY,
    screenWidth,
    screenHeight,
    // 客户端坐标（用于CSS显示）
    clientX,
    clientY,
    clientWidth,
    clientHeight
  }
  return result
})

const hasSelection = computed(() => {
  return selection.value && selection.value.screenWidth > 10 && selection.value.screenHeight > 10
})

const selectionStyle = computed(() => {
  if (!selection.value) return {}

  // 使用客户端坐标进行CSS定位
  return {
    left: `${selection.value.clientX}px`,
    top: `${selection.value.clientY}px`,
    width: `${selection.value.clientWidth}px`,
    height: `${selection.value.clientHeight}px`
  }
})

// 遮罩样式计算（使用客户端坐标）
const maskTopStyle = computed(() => {
  if (!selection.value) return {}
  return {
    height: `${selection.value.clientY}px`
  }
})

const maskBottomStyle = computed(() => {
  if (!selection.value) return {}
  return {
    top: `${selection.value.clientY + selection.value.clientHeight}px`,
    height: `calc(100vh - ${selection.value.clientY + selection.value.clientHeight}px)`
  }
})

const maskLeftStyle = computed(() => {
  if (!selection.value) return {}
  return {
    top: `${selection.value.clientY}px`,
    width: `${selection.value.clientX}px`,
    height: `${selection.value.clientHeight}px`
  }
})

const maskRightStyle = computed(() => {
  if (!selection.value) return {}
  return {
    top: `${selection.value.clientY}px`,
    left: `${selection.value.clientX + selection.value.clientWidth}px`,
    width: `calc(100vw - ${selection.value.clientX + selection.value.clientWidth}px)`,
    height: `${selection.value.clientHeight}px`
  }
})

onMounted(() => {
  overlay.value?.focus()
})

function startSelection(e) {
  if (e.target.closest('.confirm-panel') || props.isProcessing) return
  overlay.value.style.backgroundColor = 'rgba(0, 0, 0, 0)'
  isSelecting.value = true

  log('Mouse down:', {
    clientX: e.clientX,
    clientY: e.clientY,
    screenX: e.screenX,
    screenY: e.screenY,
    offsetX: e.offsetX,
    offsetY: e.offsetY,
    pageX: e.pageX,
    pageY: e.pageY,
    windowScreenX: window.screenX,
    windowScreenY: window.screenY,
    windowInnerWidth: window.innerWidth,
    windowInnerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height
  })

  // 存储屏幕坐标（用于录制）和客户端坐标（用于显示）
  startPoint.value = {
    screenX: e.screenX,
    screenY: e.screenY,
    clientX: e.clientX,
    clientY: e.clientY
  }
  endPoint.value = {
    screenX: e.screenX,
    screenY: e.screenY,
    clientX: e.clientX,
    clientY: e.clientY
  }
}

function updateSelection(e) {
  if (!isSelecting.value) return
  endPoint.value = {
    screenX: e.screenX,
    screenY: e.screenY,
    clientX: e.clientX,
    clientY: e.clientY
  }
}

function endSelection(e) {
  isSelecting.value = false
}

function reset() {
  startPoint.value = null
  endPoint.value = null
  overlay.value?.focus()
  overlay.value.style.backgroundColor = 'rgba(100, 100, 100, 0.7)'
}

function cancel() {
  emit('cancel')
}

function confirmSelection() {
  if (hasSelection.value) {
    // 使用屏幕坐标传递给父组件
    const region = {
      x: selection.value.screenX + 3,
      y: selection.value.screenY + 3,
      width: selection.value.screenWidth - 4,
      height: selection.value.screenHeight - 4
    }
    emit('select', region)
  }
}
</script>

<style scoped>
.selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  cursor: crosshair;
  background-color: rgba(100, 100, 100, 0.7);
  z-index: 9999;
  outline: none;
}

.mask-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.mask-top,
.mask-bottom,
.mask-left,
.mask-right {
  position: absolute;
  background-color: rgba(100, 100, 100, 0.7);
  pointer-events: none;
}

.mask-top {
  top: 0;
  left: 0;
  width: 100%;
}

.mask-bottom {
  left: 0;
  width: 100%;
}

.mask-left {
  left: 0;
}

.mask-right {
  right: 0;
}

.hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background-color: rgba(0, 0, 0, 0);
  color: white;
  font-size: 24px;
  pointer-events: none;
}

.hint-sub {
  font-size: 14px;
  opacity: 0.7;
  margin-top: 10px;
}

.selection-box {
  position: absolute;
  border: 2px solid #4a90d9;
  background-color: rgba(74, 144, 217, 0.1);
  pointer-events: none;
}

.selection-box.selecting {
  border: 2px dashed #4a90d9;
  background-color: rgba(74, 144, 217, 0.05);
}

.selection-info {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.confirm-panel {
  position: fixed;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  background-color: rgba(0, 0, 0, 0.9);
  border-radius: 10px;
  z-index: 10000;
}

.processing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.processing-content {
  text-align: center;
  color: white;
}

.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 20px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.processing-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
}

.processing-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
