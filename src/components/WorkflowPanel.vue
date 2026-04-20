<template>
  <div class="workflow-panel">
    <button class="workflow-header" @click="expanded = !expanded">
      <i class="fa fa-snowflake header-icon" />
      <span class="workflow-label">工作流</span>
      <i class="fa chevron" :class="expanded ? 'fa-chevron-down' : 'fa-chevron-right'" />
    </button>
    <transition name="wf-expand">
      <div v-if="expanded" class="workflow-nodes">
        <div v-for="(node, idx) in nodes" :key="node.nodeId" class="workflow-node">
          <i class="fa chevron-right" :class="'fa-chevron-right'" />
          <div class="node-icon-wrap" :class="nodeIconClass(node.nodeType)">
            <i class="fa" :class="nodeIcon(node.nodeType)" />
          </div>
          <div class="node-info">
            <span class="node-title">{{ node.title }}</span>
          </div>
          <div class="node-right">
            <span class="node-time" v-if="node.elapsedTime">{{ formatTime(node.elapsedTime) }}</span>
            <span class="node-status-text" v-if="node.status === 'running'">Running</span>
            <div class="node-status" :class="node.status">
              <i v-if="node.status === 'running'" class="fa fa-spinner fa-spin" />
              <i v-else-if="node.status === 'succeeded'" class="fa fa-check" />
              <i v-else class="fa fa-times" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WorkflowNode } from '@/types'

defineProps<{ nodes: WorkflowNode[]; running: boolean }>()
const expanded = ref(true)

function nodeIcon(type: string) {
  const map: Record<string, string> = {
    start: 'fa-home', agent: 'fa-android', answer: 'fa-comment',
    llm: 'fa-bolt', tool: 'fa-wrench', filter: 'fa-filter',
    code: 'fa-code', variable_assigner: 'fa-equals', if_else: 'fa-share-alt',
    knowledge_retrieval: 'fa-book', http_request: 'fa-globe',
  }
  return map[type] || 'fa-circle'
}

function nodeIconClass(type: string) {
  const map: Record<string, string> = {
    start: 'ni-start', agent: 'ni-agent', answer: 'ni-answer', llm: 'ni-llm',
    filter: 'ni-filter', code: 'ni-code', variable_assigner: 'ni-var',
    if_else: 'ni-branch', knowledge_retrieval: 'ni-knowledge',
  }
  return map[type] || 'ni-default'
}

function formatTime(s: number) {
  if (s < 0.001) return `${(s * 1000000).toFixed(0)}μs`
  if (s < 1) return `${(s * 1000).toFixed(3)} ms`
  return `${s.toFixed(2)}s`
}
</script>

<style scoped>
.workflow-panel {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.workflow-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  background: none;
  border: none;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.header-icon {
  font-size: 12px;
  color: #9ca3af;
}

.workflow-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  flex: 1;
}

.chevron {
  font-size: 11px;
  color: #9ca3af;
}

.workflow-nodes {
  display: flex;
  flex-direction: column;
}

.workflow-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}
.workflow-node:last-child {
  border-bottom: none;
}
.workflow-node:hover {
  background: #f9fafb;
}

.chevron-right {
  font-size: 10px;
  color: #d1d5db;
  flex-shrink: 0;
}

.node-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.ni-start    { background: #dbeafe; color: #2563eb; }
.ni-agent    { background: #ede9fe; color: #7c3aed; }
.ni-answer   { background: #fef3c7; color: #d97706; }
.ni-llm      { background: #fce7f3; color: #db2777; }
.ni-filter   { background: #d1fae5; color: #059669; }
.ni-code     { background: #e0f2fe; color: #0284c7; }
.ni-var      { background: #f0fdf4; color: #16a34a; }
.ni-branch   { background: #fef9c3; color: #ca8a04; }
.ni-knowledge{ background: #f5f3ff; color: #7c3aed; }
.ni-default  { background: #f3f4f6; color: #6b7280; }

.node-info {
  flex: 1;
  min-width: 0;
}

.node-title {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.node-time {
  font-size: 12px;
  color: #9ca3af;
}

.node-status-text {
  font-size: 12px;
  font-weight: 500;
  color: #3b82f6;
}

.node-status {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.node-status.succeeded { background: #d1fae5; color: #10b981; }
.node-status.failed    { background: #fee2e2; color: #ef4444; }
.node-status.running   { background: #dbeafe; color: #3b82f6; }

/* Transition */
.wf-expand-enter-active,
.wf-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.wf-expand-enter-from,
.wf-expand-leave-to { max-height: 0; opacity: 0; }
.wf-expand-enter-to,
.wf-expand-leave-from { max-height: 1200px; opacity: 1; }
</style>
