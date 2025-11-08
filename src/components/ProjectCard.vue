<template>
  <div class="project-card" @click="handleClick">
    <div class="card-header">
      <h3 class="project-name">{{ project.name }}</h3>
      <StatusBadge :status="project.status" />
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">Repository:</span>
        <span class="value">{{ project.repository }}</span>
      </div>
      <div class="info-row">
        <span class="label">Branch:</span>
        <span class="value">{{ project.branch || 'main' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Port:</span>
        <span class="value">{{ project.port || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Last Deploy:</span>
        <span class="value">{{ formatDate(project.lastDeploy) }}</span>
      </div>
    </div>

    <div class="card-footer">
      <a v-if="project.url" :href="project.url" target="_blank" class="btn btn-small" @click.stop>
        Visit Site
      </a>
      <button class="btn btn-small btn-primary" @click.stop="$emit('deploy', project.id)">
        Deploy
      </button>
    </div>
  </div>
</template>

<script setup>
import StatusBadge from './StatusBadge.vue'

defineProps({
  project: {
    type: Object,
    required: true
  }
})

defineEmits(['click', 'deploy'])

const handleClick = () => {
  // Router navigation will be handled by parent
}

const formatDate = (date) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
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
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn:not(.btn-primary) {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn:not(.btn-primary):hover {
  background: #bdc3c7;
}
</style>
