<template>
  <div class="log-viewer">
    <div class="log-header">
      <h3>{{ title }}</h3>
      <div class="log-actions">
        <button class="btn-icon" @click="clearLogs" :title="$t('projectDetail.clearLogs')">
          🗑️
        </button>
        <button class="btn-icon" @click="downloadLogs" :title="$t('projectDetail.downloadLogs')">
          ⬇️
        </button>
      </div>
    </div>

    <div class="log-content" ref="logContainer">
      <div v-if="logs.length === 0" class="no-logs">
        {{ $t('projectDetail.noLogs') }}
      </div>
      <div v-else>
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-line"
          :class="`log-${log.type}`"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: 'Logs'
  },
  autoScroll: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['clear', 'download'])

const logContainer = ref(null)

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

const clearLogs = () => {
  emit('clear')
}

const downloadLogs = () => {
  emit('download')
}

// 检查滚动条是否在底部（容差5px）
const isScrollAtBottom = () => {
  if (!logContainer.value) return false
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value
  return scrollHeight - scrollTop - clientHeight < 5
}

// Auto-scroll to bottom when new logs arrive
watch(() => props.logs, async () => {
  // 在日志更新前，检查滚动条是否在底部
  const shouldScroll = isScrollAtBottom()

  await nextTick()

  // 只有当之前滚动条在底部时，才自动滚动到底部
  if (shouldScroll && logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}, { deep: true })
</script>

<style scoped>
.log-viewer {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.log-header h3 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.log-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.log-content {
  height: 400px;
  overflow-y: auto;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.no-logs {
  color: #888;
  text-align: center;
  padding: 40px 20px;
}

.log-line {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  padding: 4px 8px;
  border-radius: 4px;
}

.log-time {
  color: #888;
  flex-shrink: 0;
  font-size: 11px;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-info {
  color: #ffffff;
}

.log-success {
  color: #4ade80;
}

.log-warning {
  color: #fbbf24;
}

.log-error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.log-content::-webkit-scrollbar {
  width: 8px;
}

.log-content::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.log-content::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>
