import type { ChatMessage, Conversation } from '@/types'
import { formatDate } from './index'

// ── 内部辅助 ──────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 提取助手消息的纯回答文本，完全去除思考过程 */
function extractAnswerText(msg: ChatMessage): string {
  // 优先用 segments，只取 text 类型
  if (msg.segments && msg.segments.length) {
    return msg.segments
      .filter(s => s.type === 'text')
      .map(s => s.content.trim())
      .filter(Boolean)
      .join('\n\n')
  }
  // fallback：从 content 中去除 <think>...</think>
  let text = msg.content || ''
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  return text
}

function genReportId(conversationId?: string): string {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const datePart = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}`
  const suffix = conversationId
    ? conversationId.replace(/-/g, '').slice(0, 6).toUpperCase()
    : Math.random().toString(36).slice(2, 8).toUpperCase()
  return `VB-DIAG-${datePart}-${suffix}`
}

function inferTags(messages: ChatMessage[], ticketData?: Record<string, any>): string[] {
  const tags: string[] = ['Vastbase']
  const allText = messages.map(m => m.content).join(' ')

  const rules: [RegExp, string][] = [
    [/连接|超时|timeout|connection/i, '连接问题'],
    [/性能|慢|slow|cpu|内存|memory|io/i, '性能问题'],
    [/迁移|migrate|兼容|charset|字符集/i, '迁移兼容'],
    [/存储过程|procedure|function|函数/i, '存储过程'],
    [/备份|恢复|restore|backup/i, '备份恢复'],
    [/权限|permission|grant|role/i, '权限管理'],
    [/安装|install|部署|deploy/i, '安装部署'],
    [/报错|error|exception|异常/i, '错误排查'],
    [/索引|index|查询|query|sql/i, 'SQL优化'],
    [/主从|复制|replication|高可用|ha/i, '高可用'],
  ]
  for (const [re, tag] of rules) {
    if (re.test(allText)) tags.push(tag)
  }

  const version = ticketData?.['产品信息']?.['产品版本']
  if (version) tags.push(version)

  const module_ = ticketData?.['产品信息']?.['模块']
  if (module_) tags.push(module_)

  return [...new Set(tags)]
}

/** 提取用户描述，过滤掉工单消息和短确认句 */
function extractUserDescriptions(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    m =>
      m.role === 'user' &&
      !m.ticketData &&
      m.content.length > 10 &&
      !/^(好的|谢谢|明白|收到|ok|好|嗯|是的|对的|可以|没问题)\s*[。！？]?$/i.test(m.content.trim()),
  )
}

function detectResolution(messages: ChatMessage[]): { resolved: boolean; evidence: string } {
  const pattern = /解决了|好了|成功|可以了|正常了|谢谢|感谢|ok了|没问题了/i
  const lastUserMsgs = messages.filter(m => m.role === 'user').slice(-3)
  for (const m of lastUserMsgs) {
    if (pattern.test(m.content)) return { resolved: true, evidence: m.content.trim() }
  }
  return { resolved: false, evidence: '' }
}

// ── 主导出函数 ────────────────────────────────────────────────

export function exportConversationToMarkdown(
  messages: ChatMessage[],
  conversation?: Conversation,
): string {
  const now = new Date()
  const reportId = genReportId(conversation?.id)
  const reportDate = formatDate(now.getTime())

  const ticketMsg = messages.find(m => m.ticketData)
  const ticketData = ticketMsg?.ticketData ?? undefined
  const ticketInfo = ticketData?.['问题信息'] ?? {}
  const productInfo = ticketData?.['产品信息'] ?? {}
  const customerInfo = ticketData?.['客户信息'] ?? {}
  const commRecords: any[] = ticketData?.['沟通记录'] ?? []

  const tags = inferTags(messages, ticketData)
  const { resolved, evidence } = detectResolution(messages)
  const statusLabel = resolved ? '已解决' : '处理中'

  const assistantMsgs = messages.filter(m => m.role === 'assistant')
  const userDescMsgs = extractUserDescriptions(messages)

  // 收集所有工作流节点（去重）
  const allNodes = messages
    .filter(m => m.workflowNodes?.length)
    .flatMap(m => m.workflowNodes!)

  // ── YAML frontmatter ──
  let md = `---\n`
  md += `id: ${reportId}\n`
  md += `date: ${now.toISOString().slice(0, 10)}\n`
  md += `status: ${resolved ? 'resolved' : 'in-progress'}\n`
  md += `tags: [${tags.map(t => `"${t}"`).join(', ')}]\n`
  if (ticketInfo['工单编号']) md += `ticket_id: "${ticketInfo['工单编号']}"\n`
  if (conversation?.id) md += `conversation_id: "${conversation.id}"\n`
  md += `---\n\n`

  // ── 标题 ──
  const title = ticketInfo['问题概要'] || conversation?.title || '数据库问题诊断报告'
  md += `# ${title}\n\n`

  // ── 诊断单元信息 ──
  md += `## 诊断单元信息\n\n`
  md += `| 字段 | 内容 |\n|------|------|\n`
  md += `| 诊断单编号 | \`${reportId}\` |\n`
  md += `| 生成时间 | ${reportDate} |\n`
  md += `| 处理状态 | ${statusLabel} |\n`
  if (ticketInfo['工单编号']) md += `| 来源工单 | ${ticketInfo['工单编号']} |\n`
  md += `\n`

  // ── 环境信息 ──
  if (Object.keys(productInfo).length || Object.keys(customerInfo).length) {
    md += `## 环境信息\n\n`
    if (Object.keys(productInfo).length) {
      md += `### 产品信息\n\n`
      md += `| 字段 | 值 |\n|------|----|\n`
      for (const [k, v] of Object.entries(productInfo)) {
        md += `| ${k} | ${v} |\n`
      }
      md += `\n`
    }
    if (Object.keys(customerInfo).length) {
      md += `### 客户信息\n\n`
      md += `| 字段 | 值 |\n|------|----|\n`
      for (const [k, v] of Object.entries(customerInfo)) {
        md += `| ${k} | ${v} |\n`
      }
      md += `\n`
    }
  }

  // ── 问题现象 ──
  md += `## 问题现象\n\n`
  if (ticketInfo['问题描述']) {
    const desc = stripHtml(ticketInfo['问题描述'])
    if (desc) {
      md += `### 工单原始描述\n\n${desc}\n\n`
    }
  }
  if (ticketInfo['附件']?.length) {
    md += `### 附件\n\n`
    for (const url of ticketInfo['附件']) {
      const name = decodeURIComponent(String(url).split('/').pop() || url)
      md += `- [${name}](${url})\n`
    }
    md += `\n`
  }
  if (userDescMsgs.length) {
    md += `### 用户补充描述\n\n`
    for (const m of userDescMsgs) {
      md += `${m.content.trim()}\n\n`
    }
  }

  // ── 诊断过程 ──
  md += `## 诊断过程\n\n`

  if (allNodes.length) {
    md += `### 工作流执行链路\n\n`
    for (const node of allNodes) {
      const icon = node.status === 'succeeded' ? '✅' : node.status === 'failed' ? '❌' : '⏳'
      const meta: string[] = []
      if (node.elapsedTime) meta.push(`${node.elapsedTime}ms`)
      if (node.totalTokens) meta.push(`${node.totalTokens} tokens`)
      md += `- ${icon} **${node.title}** \`${node.nodeType}\``
      if (meta.length) md += ` — ${meta.join(' · ')}`
      md += `\n`
    }
    md += `\n`
  }

  // 诊断对话：只输出实质内容，跳过工单消息和短确认
  md += `### 诊断对话\n\n`
  let round = 0
  for (const msg of messages) {
    if (msg.role === 'user' && !msg.ticketData && msg.content.length > 10) {
      round++
      md += `**[Q${round}] ${msg.content.trim()}**\n\n`
    } else if (msg.role === 'assistant') {
      const answer = extractAnswerText(msg)
      if (answer) {
        md += `${answer}\n\n`
        md += `---\n\n`
      }
    }
  }

  // ── 历史沟通记录（来自工单）──
  if (commRecords.length) {
    md += `## 历史沟通记录\n\n`
    for (const r of commRecords) {
      const role = r['记录类型'] || '未知'
      const time = r['时间'] ? ` · ${r['时间']}` : ''
      const content = stripHtml(r['内容'] || '')
      if (!content) continue
      md += `**${role}**${time}\n\n${content}\n\n---\n\n`
    }
  }

  // ── 验证结果 ──
  md += `## 验证结果\n\n`
  if (resolved) {
    md += `状态：已由用户确认解决\n\n用户反馈：${evidence}\n\n`
  } else {
    md += `状态：对话结束时未明确确认解决，建议跟进验证\n\n`
  }

  // ── 知识标签 ──
  md += `## 知识标签\n\n`
  md += tags.map(t => `\`${t}\``).join(' · ')
  md += `\n\n`

  md += `---\n\n*本诊断单由 Vastbase 智能助手自动生成 · ${reportDate}*\n`

  return md
}

export function exportConversationToHTML(
  messages: ChatMessage[],
  conversation?: Conversation,
): string {
  const now = new Date()
  const reportId = genReportId(conversation?.id)
  const reportDate = formatDate(now.getTime())

  const ticketMsg = messages.find(m => m.ticketData)
  const ticketData = ticketMsg?.ticketData ?? undefined
  const ticketInfo = ticketData?.['问题信息'] ?? {}
  const productInfo = ticketData?.['产品信息'] ?? {}
  const customerInfo = ticketData?.['客户信息'] ?? {}
  const commRecords: any[] = ticketData?.['沟通记录'] ?? []

  const tags = inferTags(messages, ticketData)
  const { resolved, evidence } = detectResolution(messages)
  const statusLabel = resolved ? '已解决' : '处理中'

  const userDescMsgs = extractUserDescriptions(messages)

  // 收集所有工作流节点（去重）
  const allNodes = messages
    .filter(m => m.workflowNodes?.length)
    .flatMap(m => m.workflowNodes!)

  const title = ticketInfo['问题概要'] || conversation?.title || '数据库问题诊断报告'

  // 生成状态标签样式
  const statusClass = resolved ? 'status-resolved' : 'status-in-progress'
  const statusIcon = resolved ? '✓' : '⏳'

  // 生成标签HTML
  const tagsHtml = tags.map(t => `<span class="tag">${t}</span>`).join('')

  // 生成工作流节点HTML
  const workflowHtml = allNodes.length
    ? `
    <div class="section">
      <h3>工作流执行链路</h3>
      <div class="workflow-list">
        ${allNodes.map(node => {
          const icon = node.status === 'succeeded' ? '✅' : node.status === 'failed' ? '❌' : '⏳'
          const meta: string[] = []
          if (node.elapsedTime) meta.push(`${node.elapsedTime}ms`)
          if (node.totalTokens) meta.push(`${node.totalTokens} tokens`)
          return `
            <div class="workflow-item ${node.status}">
              <span class="workflow-icon">${icon}</span>
              <span class="workflow-title">${node.title}</span>
              <span class="workflow-type">${node.nodeType}</span>
              ${meta.length ? `<span class="workflow-meta">${meta.join(' · ')}</span>` : ''}
            </div>
          `
        }).join('')}
      </div>
    </div>
    `
    : ''

  // 生成诊断对话HTML
  let dialogueHtml = ''
  let round = 0
  for (const msg of messages) {
    if (msg.role === 'user' && !msg.ticketData && msg.content.length > 10) {
      round++
      dialogueHtml += `
        <div class="dialogue-item user-item">
          <div class="dialogue-header">
            <span class="dialogue-role">用户</span>
            <span class="dialogue-round">Q${round}</span>
          </div>
          <div class="dialogue-content">${escapeHtml(msg.content.trim())}</div>
        </div>
      `
    } else if (msg.role === 'assistant') {
      const answer = extractAnswerText(msg)
      if (answer) {
        dialogueHtml += `
          <div class="dialogue-item assistant-item">
            <div class="dialogue-header">
              <span class="dialogue-role">助手</span>
            </div>
            <div class="dialogue-content markdown-body">${renderMarkdownToHtml(answer)}</div>
          </div>
        `
      }
    }
  }

  // 生成历史沟通记录HTML
  const historyHtml = commRecords.length
    ? `
    <div class="section">
      <h3>历史沟通记录</h3>
      ${commRecords.map(r => {
        const role = r['记录类型'] || '未知'
        const time = r['时间'] ? `<span class="record-time">${r['时间']}</span>` : ''
        const content = stripHtml(r['内容'] || '')
        if (!content) return ''
        return `
          <div class="record-item">
            <div class="record-header">
              <span class="record-role">${role}</span>
              ${time}
            </div>
            <div class="record-content">${escapeHtml(content)}</div>
          </div>
        `
      }).join('')}
    </div>
    `
    : ''

  // 组装完整HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    .report-container {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
    }
    .report-header {
      border-bottom: 2px solid #e8e8e8;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .report-id {
      font-size: 12px;
      color: #999;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin: 0 0 16px 0;
    }
    .meta-info {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #666;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-resolved {
      background: #e6f7e6;
      color: #52c41a;
    }
    .status-in-progress {
      background: #fff7e6;
      color: #fa8c16;
    }
    .section {
      margin-bottom: 30px;
    }
    h2 {
      font-size: 20px;
      color: #1a1a1a;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    h3 {
      font-size: 16px;
      color: #333;
      margin: 20px 0 12px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 14px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border: 1px solid #e8e8e8;
    }
    th {
      background: #fafafa;
      font-weight: 600;
      color: #333;
    }
    .info-section {
      background: #fafafa;
      border-radius: 6px;
      padding: 16px;
      margin: 12px 0;
    }
    .info-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }
    .tag {
      background: #f0f0f0;
      color: #555;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .workflow-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .workflow-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #fafafa;
      border-radius: 6px;
      font-size: 14px;
    }
    .workflow-item.succeeded { border-left: 3px solid #52c41a; }
    .workflow-item.failed { border-left: 3px solid #ff4d4f; }
    .workflow-item.running { border-left: 3px solid #fa8c16; }
    .workflow-icon { font-size: 16px; }
    .workflow-title { font-weight: 500; color: #333; }
    .workflow-type {
      color: #999;
      font-size: 12px;
      font-family: monospace;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .workflow-meta {
      margin-left: auto;
      color: #999;
      font-size: 12px;
    }
    .dialogue-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dialogue-item {
      padding: 16px;
      border-radius: 8px;
    }
    .user-item {
      background: #f0f7ff;
      border-left: 4px solid #1890ff;
    }
    .assistant-item {
      background: #f6ffed;
      border-left: 4px solid #52c41a;
    }
    .dialogue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .dialogue-role {
      font-weight: 600;
      font-size: 13px;
      color: #666;
    }
    .dialogue-round {
      background: #1890ff;
      color: #fff;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
    }
    .dialogue-content {
      font-size: 14px;
      line-height: 1.8;
      color: #333;
    }
    .dialogue-content pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 13px;
    }
    .dialogue-content code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
    }
    .dialogue-content pre code {
      background: none;
      padding: 0;
    }
    .dialogue-content p { margin: 0 0 10px 0; }
    .dialogue-content p:last-child { margin-bottom: 0; }
    .dialogue-content ul, .dialogue-content ol {
      margin: 10px 0;
      padding-left: 24px;
    }
    .dialogue-content li { margin: 4px 0; }
    .dialogue-content blockquote {
      margin: 10px 0;
      padding: 10px 16px;
      border-left: 4px solid #ddd;
      background: #fafafa;
      color: #666;
    }
    .record-item {
      padding: 12px;
      background: #fafafa;
      border-radius: 6px;
      margin: 8px 0;
    }
    .record-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .record-role {
      font-weight: 600;
      color: #333;
    }
    .record-time {
      color: #999;
    }
    .record-content {
      font-size: 14px;
      color: #555;
      line-height: 1.6;
    }
    .result-box {
      padding: 16px;
      border-radius: 6px;
      margin: 12px 0;
    }
    .result-box.resolved {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
    }
    .result-box.unresolved {
      background: #fff7e6;
      border: 1px solid #ffd591;
    }
    .result-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .result-box.resolved .result-title { color: #52c41a; }
    .result-box.unresolved .result-title { color: #fa8c16; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    @media print {
      body { background: #fff; }
      .report-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="report-id">诊断单编号: ${reportId}</div>
      <h1>${title}</h1>
      <div class="meta-info">
        <div class="meta-item">
          <span>生成时间:</span>
          <span>${reportDate}</span>
        </div>
        <div class="meta-item">
          <span class="status-badge ${statusClass}">${statusIcon} ${statusLabel}</span>
        </div>
        ${ticketInfo['工单编号'] ? `
        <div class="meta-item">
          <span>来源工单:</span>
          <span>${ticketInfo['工单编号']}</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${Object.keys(productInfo).length || Object.keys(customerInfo).length ? `
    <div class="section">
      <h2>环境信息</h2>
      ${Object.keys(productInfo).length ? `
      <div class="info-section">
        <div class="info-title">产品信息</div>
        <table>
          <tbody>
            ${Object.entries(productInfo).map(([k, v]) => `
              <tr><th>${k}</th><td>${v}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      ${Object.keys(customerInfo).length ? `
      <div class="info-section">
        <div class="info-title">客户信息</div>
        <table>
          <tbody>
            ${Object.entries(customerInfo).map(([k, v]) => `
              <tr><th>${k}</th><td>${v}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <div class="section">
      <h2>问题现象</h2>
      ${ticketInfo['问题描述'] ? `
      <div class="info-section">
        <div class="info-title">工单原始描述</div>
        <div>${escapeHtml(stripHtml(ticketInfo['问题描述']))}</div>
      </div>
      ` : ''}
      ${ticketInfo['附件']?.length ? `
      <div class="info-section">
        <div class="info-title">附件</div>
        <ul>
          ${ticketInfo['附件'].map((url: string) => `
            <li><a href="${url}" target="_blank">${decodeURIComponent(String(url).split('/').pop() || url)}</a></li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      ${userDescMsgs.length ? `
      <div class="info-section">
        <div class="info-title">用户补充描述</div>
        ${userDescMsgs.map(m => `<p>${escapeHtml(m.content.trim())}</p>`).join('')}
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>诊断过程</h2>
      ${workflowHtml}
      <div class="dialogue-list">
        ${dialogueHtml}
      </div>
    </div>

    ${historyHtml}

    <div class="section">
      <h2>验证结果</h2>
      <div class="result-box ${resolved ? 'resolved' : 'unresolved'}">
        <div class="result-title">${resolved ? '✓ 已解决' : '⏳ 处理中'}</div>
        ${resolved ? `<p>用户反馈: ${escapeHtml(evidence)}</p>` : '<p>对话结束时未明确确认解决，建议跟进验证</p>'}
      </div>
    </div>

    <div class="section">
      <h2>知识标签</h2>
      <div class="tags">
        ${tagsHtml}
      </div>
    </div>

    <div class="footer">
      <p>本诊断单由 Vastbase 智能助手自动生成 · ${reportDate}</p>
    </div>
  </div>
</body>
</html>`

  return html
}

// 简单的HTML转义函数
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 简单的Markdown转HTML函数（用于对话内容）
function renderMarkdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown)

  // 代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // 斜体
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // 标题
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>')
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>')

  // 无序列表
  html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // 有序列表
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')

  // 引用
  html = html.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>')

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')

  // 段落（简单处理）
  const paragraphs = html.split('\n\n')
  html = paragraphs.map(p => {
    p = p.trim()
    if (!p) return ''
    if (p.startsWith('<')) return p
    return `<p>${p}</p>`
  }).join('\n')

  return html
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadMarkdownFile(content: string, filename: string = 'vastbase-diagnosis.md'): void {
  downloadFile(content, filename, 'text/markdown;charset=utf-8')
}

export function downloadHtmlFile(content: string, filename: string = 'vastbase-diagnosis.html'): void {
  downloadFile(content, filename, 'text/html;charset=utf-8')
}

export type ExportFormat = 'markdown' | 'html'

export function exportCurrentConversation(
  messages: ChatMessage[],
  conversation?: Conversation,
  format: ExportFormat = 'markdown',
): void {
  if (messages.length === 0) {
    alert('当前没有对话内容可导出')
    return
  }
  const reportId = genReportId(conversation?.id)

  if (format === 'html') {
    const html = exportConversationToHTML(messages, conversation)
    downloadHtmlFile(html, `${reportId}.html`)
  } else {
    const md = exportConversationToMarkdown(messages, conversation)
    downloadMarkdownFile(md, `${reportId}.md`)
  }
}
