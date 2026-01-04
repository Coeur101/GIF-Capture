<template>
  <div class="card gif-preview">
    <div class="card-header">
      <h2 class="card-title">GIF 预览</h2>
      <button class="btn btn-secondary btn-sm" @click="$emit('refresh')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
        刷新
      </button>
    </div>

    <div v-if="gifList.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
      <p>还没有录制的 GIF</p>
      <p class="hint">结束录制后，GIF 会显示在这里</p>
    </div>

    <div v-else class="gif-grid">
      <div
        v-for="gif in gifList"
        :key="gif.path"
        class="gif-item"
        @click="selectGif(gif)"
      >
        <div class="gif-thumbnail">
          <img :src="getGifUrl(gif.path)" :alt="gif.name" loading="lazy" />
        </div>
        <div class="gif-info">
          <span class="gif-name" :title="gif.name">{{ gif.name }}</span>
          <span class="gif-size">{{ formatSize(gif.size) }}</span>
        </div>
        <div class="gif-actions">
          <button
            class="action-btn"
            title="打开文件位置"
            @click.stop="$emit('open-location', gif.path)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </button>
          <button
            class="action-btn danger"
            title="删除"
            @click.stop="confirmDelete(gif)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="selectedGif" class="preview-modal" @click="selectedGif = null">
      <div class="preview-content" @click.stop>
        <img :src="getGifUrl(selectedGif.path)" :alt="selectedGif.name" />
        <div class="preview-info">
          <span>{{ selectedGif.name }}</span>
          <span>{{ formatSize(selectedGif.size) }}</span>
        </div>
        <button class="close-btn" @click="selectedGif = null">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { createLogger } from '../utils/logger'
const props = defineProps({
  gifList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['refresh', 'delete', 'open-location'])

const selectedGif = ref(null)
const gifDataUrls = reactive(new Map())
const logger = createLogger('[gif预览]')
// 监听 gifList 变化，加载 GIF 数据
watch(() => props.gifList, async (newList) => {
  for (const gif of newList) {
    if (!gifDataUrls.has(gif.path)) {
      await loadGifData(gif.path)
    }
  }
}, { immediate: true, deep: true })

// 加载 GIF 数据
async function loadGifData(filePath) {
  try {
    const result = await window.electronAPI.getGifData(filePath)
    if (result.success) {
      gifDataUrls.set(filePath, `data:image/gif;base64,${result.data}`)
    }
  } catch (error) {
    logger.error('Failed to load GIF:', filePath, error)
  }
}

// 获取 GIF URL
function getGifUrl(filePath) {
  return gifDataUrls.get(filePath) || ''
}

function selectGif(gif) {
  selectedGif.value = gif
}

function confirmDelete(gif) {
  if (confirm(`确定要删除 "${gif.name}" 吗？`)) {
    emit('delete', gif.path)
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.gif-preview {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header .card-title {
  margin-bottom: 0;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state svg {
  margin-bottom: 15px;
  opacity: 0.5;
}

.empty-state .hint {
  font-size: 13px;
  margin-top: 5px;
}

.gif-grid {
  display: flex;
  flex-flow: row wrap;
  gap: 15px;
  overflow-y: auto;
  padding-right: 5px;
}

.gif-item {
  background-color: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gif-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.gif-thumbnail {
  aspect-ratio: 16/9;
  overflow: hidden;
  background-color: #000;
}

.gif-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gif-info {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gif-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gif-size {
  font-size: 12px;
  color: var(--text-muted);
}

.gif-actions {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  padding: 0 10px 10px;
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: var(--border-color);
  color: var(--text-color);
}

.action-btn.danger:hover {
  background-color: var(--danger-color);
  border-color: var(--danger-color);
  color: white;
}

/* 预览弹窗 */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.preview-content img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  color: var(--text-color);
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  padding: 8px;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}
</style>
