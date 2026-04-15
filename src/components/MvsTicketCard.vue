<template>
  <div class="ticket-card">
    <!-- 工单头部 -->
    <div class="ticket-header">
      <div class="ticket-badge">
        <i class="fa fa-ticket" />
        <span>工单</span>
      </div>
      <div class="ticket-id">{{ ticket['问题信息']?.['工单编号'] || '—' }}</div>
      <div class="ticket-summary">{{ ticket['问题信息']?.['问题概要'] || '' }}</div>
    </div>

    <!-- 分模块展示 -->
    <div class="ticket-sections">
      <!-- 产品信息 -->
      <div v-if="ticket['产品信息']" class="ticket-section">
        <div class="section-title"><i class="fa fa-cube" /> 产品信息</div>
        <div class="tag-grid">
          <span v-for="(v, k) in ticket['产品信息']" :key="k" class="info-tag">
            <span class="tag-key">{{ k }}</span>
            <span class="tag-val">{{ v }}</span>
          </span>
        </div>
      </div>

      <!-- 客户信息 -->
      <div v-if="ticket['客户信息']" class="ticket-section">
        <div class="section-title"><i class="fa fa-building" /> 客户信息</div>
        <div class="tag-grid">
          <span v-for="(v, k) in ticket['客户信息']" :key="k" class="info-tag">
            <span class="tag-key">{{ k }}</span>
            <span class="tag-val">{{ v }}</span>
          </span>
        </div>
      </div>

      <!-- 问题描述 -->
      <div v-if="problemDesc" class="ticket-section">
        <div class="section-title"><i class="fa fa-exclamation-circle" /> 问题描述</div>
        <div class="desc-content" v-html="problemDesc" />
      </div>

      <!-- 沟通记录 -->
      <div v-if="records.length" class="ticket-section">
        <div class="section-title">
          <i class="fa fa-comments" /> 沟通记录
          <span class="record-count">{{ records.length }} 条</span>
        </div>
        <div class="timeline">
          <div v-for="(r, i) in records" :key="i" class="timeline-item" :class="r['记录类型']?.includes('工程师') ? 'engineer' : 'user'">
            <div class="timeline-dot" />
            <div class="timeline-body">
              <div class="timeline-meta">
                <span class="timeline-role">{{ r['记录类型'] || '' }}</span>
                <span v-if="r['流程标识']" class="timeline-tag">{{ r['流程标识'] }}</span>
                <span class="timeline-time">{{ r['时间'] || '' }}</span>
              </div>
              <div class="timeline-content" v-html="cleanHtml(r['内容'] || '')" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ ticket: Record<string, any> }>()

const problemDesc = computed(() => cleanHtml(props.ticket['问题信息']?.['问题描述'] || ''))

const records = computed(() => props.ticket['沟通记录'] || [])

function cleanHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/<span[^>]*display:none[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span[^>]*><\/span>/gi, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .trim()
}
</script>

<style scoped>
.ticket-card {
  background: #fff;
  border: 1px solid #e5e8ef;
  border-radius: 12px;
  overflow: hidden;
  font-size: 13px;
  max-width: 680px;
}

.ticket-header {
  background: linear-gradient(135deg, #1890FF 0%, #69C0FF 100%);
  padding: 14px 18px;
  color: #fff;
}

.ticket-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
}

.ticket-id {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 4px;
}

.ticket-summary {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.ticket-sections {
  padding: 0 4px 4px;
}

.ticket-section {
  padding: 12px 14px;
  border-bottom: 1px solid #f0f1f5;
}

.ticket-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #4E5969;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title i {
  color: #1890FF;
}

.record-count {
  margin-left: auto;
  background: #f2f3f5;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 11px;
  color: #86909C;
  font-weight: 400;
}

/* Tag grid */
.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.info-tag {
  display: inline-flex;
  align-items: center;
  background: #f7f8fc;
  border: 1px solid #e5e8ef;
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
}

.tag-key {
  background: #eef0f6;
  color: #4E5969;
  padding: 3px 8px;
  font-weight: 500;
}

.tag-val {
  color: #1D2129;
  padding: 3px 8px;
}

/* Description */
.desc-content {
  color: #1D2129;
  line-height: 1.7;
  font-size: 13px;
}

.desc-content :deep(p) {
  margin: 0 0 6px;
}

.desc-content :deep(pre),
.desc-content :deep(code) {
  background: #f4f5f9;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  display: block;
  margin: 6px 0;
  font-family: 'Fira Code', monospace;
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed #f0f1f5;
  position: relative;
}

.timeline-item:last-child {
  border-bottom: none;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #C9CDD4;
  flex-shrink: 0;
  margin-top: 5px;
}

.timeline-item.engineer .timeline-dot {
  background: #1890FF;
}

.timeline-item.user .timeline-dot {
  background: #00B42A;
}

.timeline-body {
  flex: 1;
  min-width: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.timeline-role {
  font-size: 12px;
  font-weight: 600;
  color: #1D2129;
}

.timeline-tag {
  font-size: 11px;
  background: #E6F4FF;
  color: #1890FF;
  border-radius: 4px;
  padding: 1px 6px;
}

.timeline-time {
  font-size: 11px;
  color: #86909C;
  margin-left: auto;
}

.timeline-content {
  color: #4E5969;
  line-height: 1.65;
  font-size: 12.5px;
}

.timeline-content :deep(p) {
  margin: 0 0 4px;
}

.timeline-content :deep(img) {
  max-width: 240px;
  border-radius: 6px;
  margin-top: 6px;
}

.timeline-content :deep(a) {
  color: #1890FF;
  text-decoration: none;
}
</style>
