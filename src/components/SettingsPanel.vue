<template>
  <div class="card">
    <h2 class="card-title">设置</h2>

    <div class="setting-item">
      <label class="label">保存路径</label>
      <div class="path-input">
        <input
          type="text"
          class="input"
          :value="config.savePath || '默认: 文档/GIFRecorder'"
          readonly
        />
        <button class="btn btn-secondary" @click="selectPath">
          浏览
        </button>
      </div>
    </div>

    <div class="setting-item">
      <label class="label">快捷键</label>
      <input
        type="text"
        class="input"
        :value="config.shortcut"
        readonly
        placeholder="按下快捷键组合"
      />
      <p class="hint">默认: Ctrl+Shift+G</p>
    </div>

    <div class="setting-item">
      <label class="label">帧率 (FPS)</label>
      <select class="input" :value="config.fps" @change="updateFps">
        <option value="10">10 FPS</option>
        <option value="15">15 FPS</option>
        <option value="20">20 FPS</option>
        <option value="24">24 FPS</option>
        <option value="30">30 FPS</option>
        <option value="60">60 FPS</option>
      </select>
    </div>

    <div class="setting-info">
      <p>提示: 较低的帧率可以减小 GIF 文件大小，GIF 尺寸将与截取区域相同</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

async function selectPath() {
  const path = await window.electronAPI.selectDirectory()
  if (path) {
    emit('update', { savePath: path })
  }
}

function updateFps(e) {
  emit('update', { fps: parseInt(e.target.value) })
}
</script>

<style scoped>
.setting-item {
  margin-bottom: 20px;
}

.path-input {
  display: flex;
  gap: 10px;
}

.path-input .input {
  flex: 1;
}

.setting-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 5px;
}

.setting-info {
  padding: 12px;
  background-color: var(--bg-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

select.input {
  cursor: pointer;
}
</style>
