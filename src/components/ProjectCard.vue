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
      <button class="btn btn-small btn-delete" @click.stop="$emit('delete', project.id)" title="删除项目">
        🗑️
      </button>
      <button class="btn btn-small btn-edit" @click.stop="$emit('edit', project)" title="编辑配置">
        ⚙️
      </button>
      <button class="btn btn-small btn-logs" @click.stop="handleClick" title="查看详情和日志">
        📋
      </button>
      <a v-if="project.url" :href="project.url" target="_blank" class="btn btn-small" @click.stop>
        {{ $t('dashboard.visitSite') }}
      </a>
      <button class="btn btn-small btn-primary" @click.stop="$emit('deploy', project.id)">
        {{ $t('dashboard.deploy') }}
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

const emit = defineEmits(['click', 'deploy', 'edit', 'delete'])

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

.btn-edit {
  background: #f39c12;
  color: white;
  font-size: 16px;
  padding: 6px 10px;
}

.btn-edit:hover {
  background: #e67e22;
  transform: scale(1.1);
}

.btn-delete {
  background: #e74c3c;
  color: white;
  font-size: 16px;
  padding: 6px 10px;
}

.btn-delete:hover {
  background: #c0392b;
  transform: scale(1.1);
}

.btn-logs {
  background: #3498db;
  color: white;
  font-size: 16px;
  padding: 6px 10px;
}

.btn-logs:hover {
  background: #2980b9;
  transform: scale(1.1);
}
</style>
