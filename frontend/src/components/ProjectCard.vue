<template>
  <div class="project-card" @click="handleClick">
    <div class="card-header">
      <h3 class="project-name">{{ project.name }}</h3>
      <StatusBadge :status="project.status" />
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">{{ $t('dashboard.repository') }}:</span>
        <span class="value">{{ project.repository }}</span>
      </div>
      <div class="info-row">
        <span class="label">{{ $t('dashboard.branch') }}:</span>
        <span class="value">{{ project.branch || 'main' }}</span>
      </div>
      <div class="info-row">
        <span class="label">{{ $t('dashboard.port') }}:</span>
        <span class="value">{{ project.port || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">{{ $t('dashboard.lastDeploy') }}:</span>
        <span class="value">{{ formatDate(project.lastDeploy) }}</span>
      </div>
    </div>

    <div class="card-footer">
      <a v-if="project.url" :href="project.url" target="_blank" class="btn btn-small btn-visit" @click.stop>
        🔗 {{ $t('dashboard.visitSite') }}
      </a>
      <button
        v-if="project.status === 'running'"
        class="btn btn-small btn-stop"
        @click.stop="$emit('stop', project.id)"
        :title="$t('dashboard.stopProject')"
      >
        ⏹️ {{ $t('dashboard.stop') }}
      </button>
      <button
        v-else-if="project.status === 'stopped'"
        class="btn btn-small btn-start"
        @click.stop="$emit('start', project.id)"
        :title="$t('dashboard.startProject')"
      >
        ▶️ {{ $t('dashboard.start') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import StatusBadge from './StatusBadge.vue'

const { t: $t } = useI18n()

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'start', 'stop'])

const handleClick = () => {
  emit('click', props.project.id)
}

const formatDate = (date) => {
  if (!date) return $t('dashboard.never')
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.project-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.project-name {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.card-body {
  margin-bottom: 15px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.info-row .label {
  color: #7f8c8d;
  font-weight: 500;
}

.info-row .value {
  color: #2c3e50;
  font-weight: 400;
}

.card-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-small {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn:not(.btn-primary) {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn:not(.btn-primary):hover {
  background: #bdc3c7;
}

.btn-visit {
  background: #3498db;
  color: white;
}

.btn-visit:hover {
  background: #2980b9;
}

.btn-stop {
  background: #e74c3c;
  color: white;
}

.btn-stop:hover {
  background: #c0392b;
}

.btn-start {
  background: #27ae60;
  color: white;
}

.btn-start:hover {
  background: #229954;
}
</style>
