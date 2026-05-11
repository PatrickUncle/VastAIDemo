<template>
  <div class="chat-page">
    <AppHeader />

    <!-- Xiaohailing Chat View -->
    <div v-if="currentService === 'xiaohailing'" class="chat-container-xiaohailing">
      <XiaohailingChat />
    </div>

    <!-- Dify Chat View -->
    <div v-else class="dify-chat-container">
      <DifyChat />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import XiaohailingChat from '@/components/XiaohailingChat.vue'
import DifyChat from '@/components/DifyChat.vue'

const CHAT_SERVICE_KEY = 'vastai_chat_service'

const currentService = ref<'xiaohailing' | 'dify'>('dify')

function loadServicePreference() {
  const saved = localStorage.getItem(CHAT_SERVICE_KEY) as 'xiaohailing' | 'dify' | null
  if (saved) {
    currentService.value = saved
  }
}

function handleServiceChange(service: 'xiaohailing' | 'dify') {
  currentService.value = service
  localStorage.setItem(CHAT_SERVICE_KEY, service)
}

onMounted(() => {
  loadServicePreference()
  window.addEventListener('storage', loadServicePreference)
})

onUnmounted(() => {
  window.removeEventListener('storage', loadServicePreference)
})

defineExpose({ handleServiceChange })
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #F7F8FC;
}

.dify-chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-container-xiaohailing {
  flex: 1;
  height: calc(100vh - 64px);
}
</style>
