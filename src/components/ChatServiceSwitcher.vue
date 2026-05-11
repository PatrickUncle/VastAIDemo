<template>
  <div class="service-switcher">
    <div class="switcher-container">
      <button
        v-for="service in services"
        :key="service.id"
        class="switcher-btn"
        :class="{ active: currentService === service.id }"
        @click="selectService(service.id)"
      >
        <span class="switcher-icon">{{ service.icon }}</span>
        <span class="switcher-label">{{ service.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const emit = defineEmits<{
  (e: 'change', service: 'dify' | 'xiaohailing'): void
}>()

const services: Array<{ id: 'dify' | 'xiaohailing'; name: string; icon: string }> = [
  { id: 'dify', name: 'dify', icon: '🤖' },
  { id: 'xiaohailing', name: '小海灵', icon: '🐬' },
]

const STORAGE_KEY = 'vastai_chat_service'

const currentService = ref<'dify' | 'xiaohailing'>('dify')

function loadService() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'xiaohailing') {
    currentService.value = 'xiaohailing'
  } else {
    currentService.value = 'dify'
  }
}

function saveService(service: 'dify' | 'xiaohailing') {
  localStorage.setItem(STORAGE_KEY, service)
}

function selectService(service: 'dify' | 'xiaohailing') {
  if (currentService.value === service) return
  currentService.value = service
  saveService(service)
  emit('change', service)
}

watch(currentService, (newVal) => {
  saveService(newVal)
})

onMounted(() => {
  loadService()
  // 初始加载时不触发 change 事件，避免页面重载
})

defineExpose({
  currentService
})
</script>

<style scoped>
.service-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
}

.switcher-container {
  display: flex;
  background: #F2F4F7;
  border-radius: 8px;
  padding: 3px;
}

.switcher-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #4E5969;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.switcher-btn:hover:not(.active) {
  background: rgba(0, 0, 0, 0.04);
}

.switcher-btn.active {
  background: white;
  color: #165DFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.switcher-icon {
  font-size: 13px;
}

.switcher-label {
  letter-spacing: 0.3px;
}
</style>
