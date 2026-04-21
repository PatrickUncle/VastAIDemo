<template>
  <div class="workflow-panel">
    <button class="workflow-header" @click="expanded = !expanded">
      <span v-if="allSucceeded" class="header-check-circle">
        <svg viewBox="0 0 20 20" width="18" height="18">
          <circle cx="10" cy="10" r="10" fill="#10b981" />
          <path d="M6 10.5l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
      <i v-else-if="running" class="fa fa-spinner fa-spin header-running" />
      <i v-else class="fa fa-snowflake header-icon" />
      <span class="workflow-label">工作流</span>
      <i class="fa chevron" :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </button>
    <transition name="wf-expand">
      <div v-if="expanded" class="workflow-nodes">
        <div v-for="node in nodes" :key="node.nodeId" class="workflow-node">
          <i class="fa fa-chevron-right chevron-right" />
          <div class="node-icon-wrap">
            <component :is="getNodeIconSvg(node.nodeType)" />
          </div>
          <div class="node-info">
            <span class="node-title">{{ node.title }}</span>
          </div>
          <div class="node-right">
            <span class="node-stats" v-if="node.totalTokens || node.elapsedTime">
              <span v-if="node.totalTokens" class="node-tokens">{{ node.totalTokens }} tokens</span>
              <span v-if="node.totalTokens && node.elapsedTime" class="node-sep">·</span>
              <span v-if="node.elapsedTime" class="node-time">{{ formatTime(node.elapsedTime) }}</span>
            </span>
            <div class="node-status" :class="node.status">
              <i v-if="node.status === 'running'" class="fa fa-spinner fa-spin" />
              <template v-else-if="node.status === 'succeeded'">
                <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                  <circle cx="9" cy="9" r="9" fill="#10b981"/>
                  <path d="M5 9.5l3 3 5-5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </template>
              <i v-else class="fa fa-times-circle" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineComponent, h } from 'vue'
import type { WorkflowNode } from '@/types'

const props = defineProps<{
  nodes: WorkflowNode[]
  running: boolean
  done?: boolean
}>()

const expanded = ref(!props.done)

const allSucceeded = computed(() =>
  props.nodes.length > 0 && props.nodes.every(n => n.status === 'succeeded')
)

watch(
  () => props.running,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      setTimeout(() => { expanded.value = false }, 300)
    }
  }
)

// ── Inline SVG icon components matching Dify's node logos ──────────────────

// LLM: purple gradient circle with lightning
const IconLLM = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#llm-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'llm-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#9b59f5' }),
    h('stop', { offset: '100%', 'stop-color': '#6c3ce1' }),
  ])]),
  h('path', { d: 'M15.5 7l-5 8h4.5l-2 6 6-9h-4.5z', fill: '#fff', 'fill-rule': 'evenodd' }),
]) })

// 知识检索: green gradient with book/lines
const IconKnowledge = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#kn-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'kn-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#2ecc71' }),
    h('stop', { offset: '100%', 'stop-color': '#27ae60' }),
  ])]),
  h('rect', { x: 8, y: 8, width: 12, height: 14, rx: 2, fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }),
  h('line', { x1: 10, y1: 12, x2: 18, y2: 12, stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
  h('line', { x1: 10, y1: 15, x2: 18, y2: 15, stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
  h('line', { x1: 10, y1: 18, x2: 15, y2: 18, stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
]) })

// 直接回复 / answer: orange gradient with chat bubble
const IconAnswer = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#ans-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'ans-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#ff9f43' }),
    h('stop', { offset: '100%', 'stop-color': '#e67e22' }),
  ])]),
  h('path', { d: 'M7 9a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2h-5l-4 3v-3H9a2 2 0 01-2-2V9z', fill: '#fff' }),
]) })

// Agent: purple spiral/gear
const IconAgent = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#ag-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'ag-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#a78bfa' }),
    h('stop', { offset: '100%', 'stop-color': '#7c3aed' }),
  ])]),
  h('circle', { cx: 14, cy: 14, r: 4, fill: 'none', stroke: '#fff', 'stroke-width': 1.8 }),
  h('path', { d: 'M14 7v2M14 19v2M7 14h2M19 14h2M9.1 9.1l1.4 1.4M17.5 17.5l1.4 1.4M9.1 18.9l1.4-1.4M17.5 10.5l1.4-1.4', stroke: '#fff', 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
]) })

// 问题分类器: green with bars
const IconClassifier = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#cl-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'cl-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#1abc9c' }),
    h('stop', { offset: '100%', 'stop-color': '#16a085' }),
  ])]),
  h('rect', { x: 8, y: 10, width: 3, height: 10, rx: 1, fill: '#fff' }),
  h('rect', { x: 12.5, y: 7, width: 3, height: 13, rx: 1, fill: '#fff' }),
  h('rect', { x: 17, y: 12, width: 3, height: 8, rx: 1, fill: '#fff' }),
]) })

// 条件分支 if_else: teal with fork arrows
const IconIfElse = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#ie-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'ie-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#26d0ce' }),
    h('stop', { offset: '100%', 'stop-color': '#1a9e9c' }),
  ])]),
  h('path', { d: 'M14 8v4M14 12l-4 4v3M14 12l4 4v3', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
]) })

// 人工介入: teal with person
const IconHuman = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#hm-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'hm-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#26d0ce' }),
    h('stop', { offset: '100%', 'stop-color': '#1a9e9c' }),
  ])]),
  h('circle', { cx: 14, cy: 10, r: 3, fill: '#fff' }),
  h('path', { d: 'M8 22c0-3.3 2.7-6 6-6s6 2.7 6 6', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', fill: 'none' }),
]) })

// 迭代: teal with cycle arrows
const IconIteration = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#it-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'it-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#26d0ce' }),
    h('stop', { offset: '100%', 'stop-color': '#1a9e9c' }),
  ])]),
  h('path', { d: 'M9 14a5 5 0 019.9-1M19 14a5 5 0 01-9.9 1', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', fill: 'none' }),
  h('path', { d: 'M18 10l1 3 3-1', stroke: '#fff', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
]) })

// 循环 loop: teal with infinity
const IconLoop = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#lp-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'lp-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#26d0ce' }),
    h('stop', { offset: '100%', 'stop-color': '#1a9e9c' }),
  ])]),
  h('path', { d: 'M8 14c0-2 1.5-3.5 3.5-3.5S15 12 16.5 14 18.5 17.5 20 17.5 22 16 22 14', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', fill: 'none' }),
  h('path', { d: 'M6 14c0 2 1.5 3.5 3.5 3.5', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', fill: 'none' }),
]) })

// 代码执行: blue with </>
const IconCode = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#cd-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'cd-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#4facfe' }),
    h('stop', { offset: '100%', 'stop-color': '#2563eb' }),
  ])]),
  h('path', { d: 'M11 10l-4 4 4 4M17 10l4 4-4 4', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
]) })

// 模板转换: blue with grid
const IconTemplate = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#tp-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'tp-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#4facfe' }),
    h('stop', { offset: '100%', 'stop-color': '#2563eb' }),
  ])]),
  h('rect', { x: 7, y: 7, width: 6, height: 6, rx: 1.5, fill: '#fff' }),
  h('rect', { x: 15, y: 7, width: 6, height: 6, rx: 1.5, fill: '#fff', opacity: 0.7 }),
  h('rect', { x: 7, y: 15, width: 6, height: 6, rx: 1.5, fill: '#fff', opacity: 0.7 }),
  h('rect', { x: 15, y: 15, width: 6, height: 6, rx: 1.5, fill: '#fff', opacity: 0.5 }),
]) })

// 变量聚合器 / variable_assigner: blue with [x]
const IconVariable = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#vr-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'vr-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#4facfe' }),
    h('stop', { offset: '100%', 'stop-color': '#2563eb' }),
  ])]),
  h('rect', { x: 7, y: 9, width: 14, height: 10, rx: 2, fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }),
  h('path', { d: 'M11 13l2 2-2 2M15 17h2', stroke: '#fff', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
]) })

// 开始节点: blue home
const IconStart = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#st-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'st-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#4facfe' }),
    h('stop', { offset: '100%', 'stop-color': '#2563eb' }),
  ])]),
  h('path', { d: 'M14 7l7 6v9h-4v-5h-6v5H7v-9z', fill: '#fff' }),
]) })

// 结束节点: green flag
const IconEnd = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#en-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'en-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#2ecc71' }),
    h('stop', { offset: '100%', 'stop-color': '#27ae60' }),
  ])]),
  h('path', { d: 'M10 7v14M10 7l8 4-8 4', fill: '#fff' }),
]) })

// HTTP请求: blue globe
const IconHttp = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#ht-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'ht-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#4facfe' }),
    h('stop', { offset: '100%', 'stop-color': '#2563eb' }),
  ])]),
  h('circle', { cx: 14, cy: 14, r: 6, fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }),
  h('path', { d: 'M14 8c-2 2-2 8 0 12M14 8c2 2 2 8 0 12M8 14h12', stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round', fill: 'none' }),
]) })

// 工具节点: orange wrench
const IconTool = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: 'url(#tl-g)' }),
  h('defs', {}, [h('linearGradient', { id: 'tl-g', x1: '0', y1: '0', x2: '1', y2: '1' }, [
    h('stop', { offset: '0%', 'stop-color': '#ff9f43' }),
    h('stop', { offset: '100%', 'stop-color': '#e67e22' }),
  ])]),
  h('path', { d: 'M18.5 8a3.5 3.5 0 00-3.4 4.2L9 18.3a1.2 1.2 0 001.7 1.7l6.1-6.1A3.5 3.5 0 0018.5 8z', fill: '#fff' }),
]) })

// 默认: grey circle
const IconDefault = defineComponent({ render: () => h('svg', { viewBox: '0 0 28 28', width: 28, height: 28 }, [
  h('rect', { width: 28, height: 28, rx: 7, fill: '#e5e7eb' }),
  h('circle', { cx: 14, cy: 14, r: 5, fill: '#9ca3af' }),
]) })

const NODE_ICON_MAP: Record<string, ReturnType<typeof defineComponent>> = {
  start: IconStart,
  end: IconEnd,
  llm: IconLLM,
  knowledge_retrieval: IconKnowledge,
  'knowledge-retrieval': IconKnowledge,
  answer: IconAnswer,
  'direct-answer': IconAnswer,
  agent: IconAgent,
  question_classifier: IconClassifier,
  'question-classifier': IconClassifier,
  if_else: IconIfElse,
  'if-else': IconIfElse,
  human_intervention: IconHuman,
  'human-intervention': IconHuman,
  iteration: IconIteration,
  loop: IconLoop,
  code: IconCode,
  template_transform: IconTemplate,
  'template-transform': IconTemplate,
  variable_assigner: IconVariable,
  'variable-assigner': IconVariable,
  variable_aggregator: IconVariable,
  'variable-aggregator': IconVariable,
  http_request: IconHttp,
  'http-request': IconHttp,
  tool: IconTool,
}

function getNodeIconSvg(type: string) {
  return NODE_ICON_MAP[type] || IconDefault
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

.header-icon { font-size: 12px; color: #9ca3af; }
.header-running { font-size: 13px; color: #3b82f6; }
.header-check-circle { display: flex; align-items: center; flex-shrink: 0; }

.workflow-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  flex: 1;
}

.chevron { font-size: 11px; color: #9ca3af; }

.workflow-nodes { display: flex; flex-direction: column; }

.workflow-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}
.workflow-node:last-child { border-bottom: none; }
.workflow-node:hover { background: #f9fafb; }

.chevron-right { font-size: 10px; color: #d1d5db; flex-shrink: 0; }

.node-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.node-info { flex: 1; min-width: 0; }

.node-title {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.node-stats { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #9ca3af; }
.node-tokens { color: #6b7280; }
.node-sep    { color: #d1d5db; }
.node-time   { color: #9ca3af; }

.node-status {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.node-status.running { color: #3b82f6; }
.node-status.failed  { color: #ef4444; }

.wf-expand-enter-active,
.wf-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.wf-expand-enter-from,
.wf-expand-leave-to { max-height: 0; opacity: 0; }
.wf-expand-enter-to,
.wf-expand-leave-from { max-height: 1200px; opacity: 1; }
</style>
