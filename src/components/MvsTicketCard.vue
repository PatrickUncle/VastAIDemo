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

      <!-- 附件 -->
      <div v-if="allAttachments.length" class="ticket-section">
        <div class="section-title"><i class="fa fa-paperclip" /> 附件</div>
        <div class="attachment-list">
          <!-- 支持的附件 -->
          <template v-for="(item, i) in supportedAttachments" :key="'s-'+i">
            <a
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="attachment-item"
            >
              <i :class="item.icon" />
              <span>{{ item.name }}</span>
            </a>
          </template>
          <!-- 不支持的附件 -->
          <template v-for="(item, i) in unsupportedAttachments" :key="'u-'+i">
            <div class="attachment-item attachment-unsupported">
              <i class="fa fa-exclamation-triangle" />
              <span>{{ item.name }}</span>
              <span class="unsupported-hint">（{{ item.reason }}）</span>
            </div>
          </template>
        </div>
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

const attachments = computed<string[]>(() => props.ticket['问题信息']?.['附件'] || [])

// 支持的文档扩展名（与SupportChatPage.vue保持一致）
const SUPPORTED_DOC_EXTENSIONS = new Set([
  'txt', 'md', 'mdx', 'markdown', 'pdf', 'html', 'xlsx', 'xls',
  'doc', 'docx', 'csv', 'eml', 'msg', 'pptx', 'ppt', 'xml', 'epub'
])

// 支持的图片扩展名（与SupportChatPage.vue保持一致）
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])

// 最大附件数量
const MAX_ATTACHMENTS = 10

interface AttachmentItem {
  url: string
  name: string
  ext: string
  icon: string
  supported: boolean
  reason?: string
}

function getAttachmentItem(url: string): AttachmentItem {
  const name = attachmentName(url)
  const ext = (url.split('.').pop() || '').toLowerCase()
  
  let icon = 'fa fa-file-o'
  let supported = true
  let reason = ''
  
  if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
    icon = 'fa fa-file-image-o'
  } else if (SUPPORTED_DOC_EXTENSIONS.has(ext)) {
    if (ext === 'pdf') icon = 'fa fa-file-pdf-o'
    else if (['txt', 'md', 'markdown'].includes(ext)) icon = 'fa fa-file-text-o'
    else if (['doc', 'docx'].includes(ext)) icon = 'fa fa-file-word-o'
    else if (['xls', 'xlsx', 'csv'].includes(ext)) icon = 'fa fa-file-excel-o'
    else if (['ppt', 'pptx'].includes(ext)) icon = 'fa fa-file-powerpoint-o'
    else icon = 'fa fa-file-text-o'
  } else {
    // 不支持的文件类型
    supported = false
    icon = 'fa fa-file-o'
    if (ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar' || ext === 'gz') {
      reason = '不支持压缩包文件'
    } else if (ext === 'exe' || ext === 'dll' || ext === 'so' || ext === 'dylib') {
      reason = '不支持可执行文件'
    } else if (ext === 'mp4' || ext === 'avi' || ext === 'mov' || ext === 'mp3' || ext === 'wav') {
      reason = '不支持音视频文件'
    } else if (ext === 'log') {
      reason = '不支持日志文件'
    } else {
      reason = `不支持 .${ext} 文件类型`
    }
  }
  
  return { url, name, ext, icon, supported, reason }
}

const allAttachments = computed(() => {
  return attachments.value.map(url => getAttachmentItem(url))
})

const supportedAttachments = computed(() => {
  return allAttachments.value.filter(item => item.supported).slice(0, MAX_ATTACHMENTS)
})

const unsupportedAttachments = computed(() => {
  const supported = allAttachments.value.filter(item => item.supported)
  const unsupported = allAttachments.value.filter(item => !item.supported)
  
  // 如果支持的附件超过限制，多余的支持附件也显示为不支持
  if (supported.length > MAX_ATTACHMENTS) {
    const extraSupported = supported.slice(MAX_ATTACHMENTS).map(item => ({
      ...item,
      supported: false,
      reason: '附件数量超过限制（最多10个）'
    }))
    return [...unsupported, ...extraSupported]
  }
  
  return unsupported
})

function attachmentName(url: string): string {
  try { return decodeURIComponent(url.split('/').pop() || url) } catch { return url }
}

function attachmentIcon(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'fa fa-file-image-o'
  if (ext === 'pdf') return 'fa fa-file-pdf-o'
  if (['txt', 'md', 'markdown'].includes(ext)) return 'fa fa-file-text-o'
  if (['doc', 'docx'].includes(ext)) return 'fa fa-file-word-o'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'fa fa-file-excel-o'
  if (['ppt', 'pptx'].includes(ext)) return 'fa fa-file-powerpoint-o'
  return 'fa fa-file-o'
}

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

/* Attachments */
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attachment-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  background: #f7f8fc;
  border: 1px solid #e5e8ef;
  border-radius: 6px;
  color: #1890FF;
  font-size: 12px;
  text-decoration: none;
  word-break: break-all;
  transition: background 0.15s;
}

.attachment-item:hover {
  background: #e6f4ff;
}

.attachment-item i {
  flex-shrink: 0;
  font-size: 14px;
}

.attachment-unsupported {
  color: #86909C;
  cursor: not-allowed;
}

.attachment-unsupported:hover {
  background: #f7f8fc;
}

.attachment-unsupported .fa-exclamation-triangle {
  color: #FF7D00;
}

.unsupported-hint {
  color: #FF7D00;
  font-size: 11px;
  margin-left: 4px;
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
