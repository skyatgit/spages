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
          <span class="log-message" v-html="ansiToHtml(log.message)"></span>
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

// ANSI 到 HTML 转换
const ansiToHtml = (text) => {
  if (!text) return ''
  
  // HTML 转义（保留换行符）
  let html = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')  // 统一换行符
    .replace(/\r/g, '\n')    // CR 转为 LF
  
  // ANSI 颜色映射
  const colors = {
    '30': '#000', '31': '#e74c3c', '32': '#2ecc71', '33': '#f1c40f',
    '34': '#3498db', '35': '#9b59b6', '36': '#1abc9c', '37': '#ecf0f1',
    '90': '#7f8c8d', '91': '#ff6b6b', '92': '#51cf66', '93': '#ffd43b',
    '94': '#4dabf7', '95': '#b197fc', '96': '#63e6be', '97': '#f8f9fa'
  }
  
  // 替换所有 ANSI 序列
  html = html.replace(/\u001b\[([0-9;]+)m/g, (match, codes) => {
    const codeList = codes.split(';')
    let result = ''
    
    for (const code of codeList) {
      if (code === '0') result += '</span>'  // 重置
      else if (code === '1') result += '<span style="font-weight:600">'  // 粗体
      else if (code === '2') result += '<span style="opacity:0.6">'  // 暗淡
      else if (code === '22') result += '</span>'  // 非粗体/非暗淡
      else if (code === '39') result += '</span>'  // 默认前景色
      else if (colors[code]) result += `<span style="color:${colors[code]}">`
    }
    
    return result
  })
  
  // 转换换行符为 <br>
  html = html.replace(/\n/g, '<br>')
  
  return html
}

const isScrollAtBottom = () => {
  if (!logContainer.value) return false
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value
  return scrollHeight - scrollTop - clientHeight < 5
}

watch(() => props.logs, async () => {
  const shouldScroll = isScrollAtBottom()
  await nextTick()
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
  color: #ffffff;
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