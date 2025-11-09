<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ $t('dashboard.stoppingProject') }}</h3>
      </div>

      <div class="modal-body">
        <div class="progress-steps">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="step"
            :class="{
              'active': currentStep === index,
              'completed': currentStep > index,
              'error': hasError && currentStep === index
            }"
          >
            <div class="step-icon">
              <span v-if="currentStep > index && !hasError">✓</span>
              <span v-else-if="hasError && currentStep === index">✗</span>
              <div v-else-if="currentStep === index" class="spinner-small"></div>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-text">
              <div class="step-title">{{ step.title }}</div>
              <div v-if="currentStep === index" class="step-description">{{ step.description }}</div>
            </div>
          </div>
        </div>

        <div v-if="hasError" class="error-message">
          <p>{{ errorMessage }}</p>
        </div>
      </div>

      <div v-if="hasError" class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          {{ $t('common.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'complete'])

const steps = ref([
  {
    title: t('dashboard.stopStep1'),
    description: t('dashboard.stopStep1Desc')
  },
  {
    title: t('dashboard.stopStep2'),
    description: t('dashboard.stopStep2Desc')
  }
])

const currentStep = ref(0)
const hasError = ref(false)
const errorMessage = ref('')

const setStep = (step) => {
  currentStep.value = step
}

const setError = (message) => {
  hasError.value = true
  errorMessage.value = message
}

const reset = () => {
  currentStep.value = 0
  hasError.value = false
  errorMessage.value = ''
}

defineExpose({
  setStep,
  setError,
  reset
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  min-width: 450px;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
  margin-bottom: 20px;
}

.modal-body {
  margin-bottom: 20px;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.step.active {
  background: #fff3e0;
  border: 1px solid #ff9800;
}

.step.completed {
  background: #e8f5e9;
  border: 1px solid #4caf50;
}

.step.error {
  background: #ffebee;
  border: 1px solid #f44336;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  background: white;
  border: 2px solid #ddd;
}

.step.active .step-icon {
  border-color: #ff9800;
  color: #ff9800;
}

.step.completed .step-icon {
  border-color: #4caf50;
  background: #4caf50;
  color: white;
}

.step.error .step-icon {
  border-color: #f44336;
  background: #f44336;
  color: white;
}

.step-text {
  flex: 1;
}

.step-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.step-description {
  font-size: 13px;
  color: #7f8c8d;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #ff9800;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  margin-top: 20px;
  padding: 15px;
  background: #ffebee;
  border-left: 4px solid #f44336;
  border-radius: 4px;
}

.error-message p {
  margin: 0;
  color: #c62828;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background: #bdc3c7;
}
</style>
