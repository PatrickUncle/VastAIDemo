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

export function downloadMarkdownFile(content: string, filename: string = 'vastbase-diagnosis.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportCurrentConversation(
  messages: ChatMessage[],
  conversation?: Conversation,
): void {
  if (messages.length === 0) {
    alert('当前没有对话内容可导出')
    return
  }
  const md = exportConversationToMarkdown(messages, conversation)
  const reportId = genReportId(conversation?.id)
  downloadMarkdownFile(md, `${reportId}.md`)
}
