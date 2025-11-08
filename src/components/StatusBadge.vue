<template>
  <span class="status-badge" :class="`status-${status}`">
    {{ statusText }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'idle'
  }
})

const statusText = computed(() => {
  const statusMap = {
    idle: 'Idle',
    building: 'Building',
    deploying: 'Deploying',
    running: 'Running',
    failed: 'Failed',
    stopped: 'Stopped'
  }
  return statusMap[props.status] || 'Unknown'
})
</script>

<style scoped>
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-idle {
  background: #ecf0f1;
  color: #7f8c8d;
}

.status-building {
  background: #fff3cd;
  color: #856404;
}

.status-deploying {
  background: #d1ecf1;
  color: #0c5460;
}

.status-running {
  background: #d4edda;
  color: #155724;
}

.status-failed {
  background: #f8d7da;
  color: #721c24;
}

.status-stopped {
  background: #e2e3e5;
  color: #383d41;
}
</style>
