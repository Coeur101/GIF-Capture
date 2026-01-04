<template>
  <div class="recording-control-panel">
    <h2 class="panel-title">录制控制</h2>

    <!-- 录制区域 -->
    <div class="info-section">
      <div class="label-with-action">
        <label class="label">录制区域</label>
        <button
          v-if="hasRegion && !isRecording"
          class="btn-clear"
          @click="handleClearRegion"
          title="清空选择区域"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          清空
        </button>
      </div>
      <div class="info-value" :class="{ 'no-region': !hasRegion }">
        <div v-if="hasRegion" class="region-info">
          <div class="region-row">
            <span class="region-label">位置:</span>
            <span class="region-data">({{ region.x }}, {{ region.y }})</span>
          </div>
          <div class="region-row">
            <span class="region-label">尺寸:</span>
            <span class="region-data">{{ region.width }} × {{ region.height }}</span>
          </div>
        </div>
        <span v-else>未选择区域</span>
      </div>
    </div>

    <!-- 状态 -->
    <div class="info-section">
      <label class="label">状态</label>
      <div class="status-badge" :class="statusClass">
        {{ statusText }}
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="control-buttons">
      <button
        v-if="!isRecording"
        class="btn btn-primary btn-large"
        @click="handleStartRecording"
        :disabled="!hasRegion || isProcessing"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
        开始录制
      </button>

      <button
        v-else
        class="btn btn-danger btn-large"
        @click="handleStopRecording"
        :disabled="isProcessing"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        停止录制
      </button>
    </div>

    <!-- 录制时长显示 -->
    <div v-if="isRecording" class="duration-display">
      <div class="recording-indicator">
        <span class="recording-dot"></span>
        <span class="recording-text">录制中</span>
      </div>
      <div class="duration-time">{{ formattedDuration }}</div>
    </div>

    <!-- 处理中显示 -->
    <div v-if="isProcessing" class="processing-display">
      <div class="processing-indicator">
        <span class="processing-spinner"></span>
        <span class="processing-text">正在生成 GIF...</span>
      </div>
      <p class="processing-hint">请稍候，这可能需要几秒钟</p>
    </div>

    <!-- 提示信息 -->
    <div class="hint-section">
      <p class="hint-text">
        提示：按 <kbd>{{ shortcut }}</kbd> {{ isRecording ? '停止录制' : '或点击"选择区域"开始' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isRecording: {
    type: Boolean,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  shortcut: {
    type: String,
    required: true
  },
  region: {
    type: Object,
    default: null
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['start-recording', 'stop-recording', 'select-region', 'clear-region'])

const hasRegion = computed(() => {
  return props.region && props.region.width > 0 && props.region.height > 0
})

const statusText = computed(() => {
  if (props.isProcessing) {
    return '处理中'
  }
  if (props.isRecording) {
    return '录制中'
  }
  return '空闲'
})

const statusClass = computed(() => {
  if (props.isProcessing) {
    return 'status-processing'
  }
  return props.isRecording ? 'status-recording' : 'status-idle'
})

const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60)
  const secs = props.duration % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

function handleStartRecording() {
  emit('start-recording')
}

function handleStopRecording() {
  emit('stop-recording')
}

function handleSelectRegion() {
  emit('select-region')
}

function handleClearRegion() {
  emit('clear-region')
}
</script>

<style scoped>
.recording-control-panel {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-color);
}

.panel-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-color);
}

.info-section {
  margin-bottom: 20px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.info-value {
  padding: 10px 14px;
  background-color: var(--bg-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.status-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-idle {
  background-color: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

.status-recording {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-processing {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.btn-large {
  width: 100%;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-large:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.duration-display {
  margin-top: 20px;
  padding: 16px;
  background-color: rgba(239, 68, 68, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.recording-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.recording-text {
  font-size: 13px;
  font-weight: 500;
  color: #ef4444;
}

.duration-time {
  font-size: 28px;
  font-weight: 700;
  font-family: monospace;
  color: #ef4444;
  text-align: center;
}

.processing-display {
  margin-top: 20px;
  padding: 16px;
  background-color: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.processing-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.processing-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.processing-text {
  font-size: 14px;
  font-weight: 500;
  color: #3b82f6;
}

.processing-hint {
  font-size: 12px;
  color: rgba(59, 130, 246, 0.7);
  text-align: center;
  margin: 0;
}

.hint-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.hint-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  color: var(--text-color);
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.btn-clear svg {
  stroke: currentColor;
}

.region-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.region-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.region-label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.region-data {
  font-size: 13px;
  color: var(--text-color);
  font-family: monospace;
  font-weight: 600;
}

.info-value.no-region {
  color: var(--text-muted);
  font-style: italic;
}
</style>
