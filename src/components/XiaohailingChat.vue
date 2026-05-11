<template>
  <div class="xiaohailing-chat">
    <!-- Sidebar overlay -->
    <div v-if="sidebarOpen" class="xh-sidebar-overlay" @click="closeSidebar" />

    <div class="xh-chat-layout">
      <!-- Sidebar -->
      <aside class="xh-sidebar" :class="{ open: sidebarOpen }">
        <div class="xh-sidebar-top">
          <button class="xh-new-chat-btn" @click="handleNewChat" :disabled="isStreaming">
            <i class="fa fa-plus" />
            <span>开启新对话</span>
          </button>
        </div>

        <div class="xh-conv-list">
          <div v-if="loadingConversations" class="xh-conv-loading">
            <i class="fa fa-spinner fa-spin" />
            <span>加载中...</span>
          </div>
          <div v-else-if="conversations.length === 0" class="xh-conv-empty">
            <div class="xh-conv-empty-icon">
              <i class="fa fa-comments" />
            </div>
            <p>暂无对话记录</p>
            <span>点击上方按钮开启新对话</span>
          </div>
          <template v-else>
            <div
              v-for="conv in conversations"
              :key="conv.sessionKey"
              class="xh-conv-item"
              :class="{ active: currentSessionKey === conv.sessionKey }"
              @click="handleSwitchConversation(conv.sessionKey)"
            >
              <div class="xh-conv-icon" :style="currentSessionKey !== conv.sessionKey ? { background: getConvColor(conv.sessionKey), color: 'transparent' } : {}">
                <span class="xh-conv-icon-letter">{{ getConvLetter(conv.name || '小海灵') }}</span>
              </div>
              <div class="xh-conv-meta">
                <div class="xh-conv-title">{{ conv.name || '未命名对话' }}</div>
                <div class="xh-conv-time">{{ formatConvTime(conv.updatedAt) }}</div>
              </div>
            </div>
          </template>
        </div>
      </aside>

      <!-- Main chat area -->
      <div class="xh-chat-main">
        <!-- Chat header -->
        <header class="xh-chat-header">
          <div class="xh-chat-header-left">
            <button class="xh-icon-btn xh-sidebar-toggle" @click="toggleSidebar" title="对话列表">
              <i class="fa fa-bars" />
            </button>
            <div class="xh-agent-info">
              <div class="xh-agent-avatar">
                <img src="/xiaohailing.png" alt="小海灵" />
                <span class="xh-agent-status-dot" :class="statusDotClass" />
              </div>
              <div class="xh-agent-meta">
                <span class="xh-agent-name">小海灵 · 海量数据智能助手</span>
                <span class="xh-agent-status" :class="statusColor">{{ statusText }}</span>
              </div>
            </div>
          </div>
          <div class="xh-chat-header-right">
            <button class="xh-header-btn" @click="handleNewChat" :disabled="isStreaming">
              <i class="fa fa-plus" />
              <span>新对话</span>
            </button>
          </div>
        </header>

        <!-- Messages -->
        <div ref="messagesContainerRef" class="xh-messages-area" @scroll="onMessagesScroll">
          <!-- Welcome screen -->
          <div v-if="messages.length === 0 && !isStreaming" class="xh-welcome-screen">
            <div class="xh-welcome-avatar">
              <img src="/xiaohailing.png" alt="小海灵" />
            </div>
            <h2 class="xh-welcome-title">你好，我是小海灵</h2>
            <p class="xh-welcome-desc">海量数据智能助手，随时为您解答数据库相关问题</p>
            <div class="xh-welcome-suggestions">
              <button
                v-for="s in suggestions"
                :key="s"
                class="xh-suggestion-chip"
                @click="useSuggestion(s)"
              >
                <i class="fa fa-comment-o" />
                {{ s }}
              </button>
            </div>
          </div>

          <!-- Message list -->
          <template v-else>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="xh-message-row"
              :class="msg.role"
            >
              <!-- User message -->
              <template v-if="msg.role === 'user'">
                <div class="xh-user-msg-wrap">
                  <div class="xh-user-bubble">
                    <div class="xh-markdown-content" v-html="renderContent(msg.content)" />
                  </div>
                  <div class="xh-user-avatar">
                    <img src="@/assets/images/用户.png" alt="用户" />
                  </div>
                </div>
              </template>

              <!-- Assistant message -->
              <template v-else>
                <!-- 纯工具调用消息（没有文本内容） -->
                <div v-if="msg.toolCall && !msg.content" class="xh-assistant-msg-wrap">
                  <img src="/xiaohailing.png" alt="小海灵" class="xh-assistant-avatar" />
                  <div class="xh-assistant-content">
                    <div class="xh-tool-card" :class="msg.toolCall.phase">
                      <div 
                        class="xh-tool-header-row" 
                        :class="{ clickable: msg.toolCall.result }"
                        @click="msg.toolCall.result && toggleToolResult(msg.toolCall.toolCallId)"
                      >
                        <div class="xh-tool-icon">🔧</div>
                        <div class="xh-tool-info">
                          <div class="xh-tool-name" :title="msg.toolCall.name">{{ msg.toolCall.name }}</div>
                          <div class="xh-tool-meta">
                            <span class="xh-tool-status-badge">
                              <span v-if="msg.toolCall.phase === 'running'" class="xh-tool-spinner"></span>
                              <span>{{ getToolStatusText(msg.toolCall.phase) }}</span>
                            </span>
                            <span v-if="getToolDuration(msg.toolCall)" class="xh-tool-duration">{{ getToolDuration(msg.toolCall) }}</span>
                          </div>
                        </div>
                        <button v-if="msg.toolCall.result" class="xh-tool-toggle-btn" @click.stop="toggleToolResult(msg.toolCall.toolCallId)">
                          <span class="xh-tool-toggle-icon" :class="{ expanded: expandedToolResults[msg.toolCall.toolCallId] }">▼</span>
                        </button>
                      </div>
                      <div v-show="expandedToolResults[msg.toolCall.toolCallId]" class="xh-tool-expanded">
                        <div class="xh-tool-command">
                          <div class="xh-tool-command-label">执行命令</div>
                          <div class="xh-tool-command-content">{{ msg.toolCall.name }}</div>
                        </div>
                        <div class="xh-tool-result">
                          <div class="xh-tool-result-label">执行结果</div>
                          <div class="xh-tool-result-content" v-html="renderContent(msg.toolCall.result || '')" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 带文本内容的助手消息 -->
                <div v-else class="xh-assistant-msg-wrap">
                  <img src="/xiaohailing.png" alt="小海灵" class="xh-assistant-avatar" />
                  <div class="xh-assistant-content">
                    <div class="xh-assistant-bubble">
                      <div class="xh-markdown-content" v-html="renderContent(msg.content)" />
                    </div>
                    <!-- Tool call card -->
                    <div v-if="msg.toolCall" class="xh-tool-card" :class="msg.toolCall.phase">
                      <div 
                        class="xh-tool-header"
                        :class="{ clickable: msg.toolCall.result }"
                        @click="msg.toolCall.result && toggleToolResult(msg.toolCall.toolCallId)"
                      >
                        <span class="xh-tool-icon">🔧</span>
                        <span class="xh-tool-name">{{ msg.toolCall.name }}</span>
                        <span class="xh-tool-status-badge">
                          <span v-if="msg.toolCall.phase === 'running'" class="xh-tool-spinner"></span>
                          <span>{{ getToolStatusText(msg.toolCall.phase) }}</span>
                        </span>
                        <span v-if="getToolDuration(msg.toolCall)" class="xh-tool-duration">{{ getToolDuration(msg.toolCall) }}</span>
                      </div>
                      <!-- 只有有结果时才显示展开/收起按钮 -->
                      <div v-if="msg.toolCall.result" class="xh-tool-result-toggle">
                        <button 
                          class="xh-tool-result-toggle-btn" 
                          @click.stop="toggleToolResult(msg.toolCall.toolCallId)"
                        >
                          <span>{{ expandedToolResults[msg.toolCall.toolCallId] ? '收起' : '展开' }} 执行结果</span>
                          <span class="xh-tool-result-toggle-icon" :class="{ expanded: expandedToolResults[msg.toolCall.toolCallId] }">▼</span>
                        </button>
                        <div v-show="expandedToolResults[msg.toolCall.toolCallId]" class="xh-tool-result">
                          <div class="xh-tool-result-label">执行结果</div>
                          <div class="xh-tool-result-content" v-html="renderContent(msg.toolCall.result || '')" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Streaming message -->
            <div v-if="isStreaming" class="xh-message-row xh-assistant">
              <div class="xh-assistant-msg-wrap">
                <img src="/xiaohailing.png" alt="小海灵" class="xh-assistant-avatar" />
                <div class="xh-assistant-content">
                  <div class="xh-assistant-bubble">
                    <div v-if="streamingText" class="xh-markdown-content" v-html="renderContent(streamingText)" />
                    <div v-else class="xh-typing-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Input area -->
        <button
          v-show="userScrolledUp && messages.length > 0"
          class="xh-scroll-to-bottom-btn"
          @click="scrollToBottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 19l-7-7h5V6h4v6h5l-7 7z" />
          </svg>
        </button>

        <!-- Input area -->
        <div class="xh-input-area">
          <div class="xh-input-row">
            <div class="xh-input-bottom-row">
              <!-- Service Switcher -->
              <div class="xh-input-switcher-wrapper">
                <ChatServiceSwitcher @change="handleServiceChange" />
              </div>
              <input
                ref="inputRef"
                v-model="inputText"
                type="text"
                placeholder="和小海灵聊天"
                class="xh-chat-input"
                @keypress.enter.exact="handleSend"
              />
              <button
                class="xh-send-btn"
                :class="{ active: inputText.trim() && !isStreaming, streaming: isStreaming }"
                :disabled="!isStreaming && !inputText.trim()"
                @click="isStreaming ? handleStop() : handleSend()"
              >
                <svg v-if="!isStreaming" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                <i v-else class="fa fa-stop" />
              </button>
            </div>
          </div>
          <div class="xh-input-footer">
            <div class="xh-input-hint">按 Enter 发送</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import type { ChatMessage } from '@/types'
import { generateId } from '@/utils'
import { wsClient } from '@/utils/xiaohailing'
import { getLocalMessages, saveMessage, saveSessionInfo, getLocalSessions, clearSessionMessages } from '@/utils/xiaohailing/message-db'
import ChatServiceSwitcher from '@/components/ChatServiceSwitcher.vue'

marked.setOptions({ breaks: false, gfm: true })

interface XiaohailingMessage extends ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCall?: {
    toolCallId: string
    name: string
    phase: 'running' | 'done' | 'error'
    result?: string
    startTime?: number
    endTime?: number
  }
}

interface Conversation {
  sessionKey: string
  name?: string
  updatedAt: number
  lastActivity: number
}

// 从环境变量获取配置
const host = import.meta.env.VITE_XIAOHAILING_HOST || 'http://localhost:3210'
const token = import.meta.env.VITE_XIAOHAILING_TOKEN || '123456'
let sessionKey = ref<string | null>(null)

const suggestions = [
  '如何优化数据库查询性能？',
  '海量数据迁移方案有哪些？',
  '数据仓库建设最佳实践',
  '如何处理大数据量下的并发问题？',
]

const messages = ref<XiaohailingMessage[]>([])
const inputText = ref('')
const inputRef = ref<HTMLInputElement>()
const messagesContainerRef = ref<HTMLDivElement>()
const isStreaming = ref(false)
const streamingText = ref('')
const abortController = ref<AbortController | null>(null)

// Sidebar state
const sidebarOpen = ref(false)
const conversations = ref<Conversation[]>([])
const loadingConversations = ref(false)
const currentSessionKey = ref<string | null>(null)

type StatusType = 'online' | 'thinking' | 'error' | 'loading'
const statusText = ref('在线')
const statusType = ref<StatusType>('online')

const statusColor = ref('')
const statusDotClass = ref('')

function updateStatusDisplay() {
  const map: Record<StatusType, { color: string; dot: string }> = {
    online: { color: 'xh-status-online', dot: 'xh-dot-online' },
    thinking: { color: 'xh-status-thinking', dot: 'xh-dot-thinking' },
    error: { color: 'xh-status-error', dot: 'xh-dot-error' },
    loading: { color: 'xh-status-thinking', dot: 'xh-dot-thinking' },
  }
  const info = map[statusType.value]
  statusColor.value = info.color
  statusDotClass.value = info.dot
}

function setStatus(text: string, type: StatusType) {
  statusText.value = text
  statusType.value = type
  updateStatusDisplay()
}

updateStatusDisplay()

const userScrolledUp = ref(false)
let resizeObserver: ResizeObserver | null = null

function onMessagesScroll() {
  const el = messagesContainerRef.value
  if (!el) return
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  userScrolledUp.value = !atBottom
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainerRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function scrollToBottomIfNeeded() {
  if (!userScrolledUp.value) scrollToBottom()
}

// 使用 ResizeObserver 监听容器高度变化，统一处理滚动逻辑
function initResizeObserver() {
  const el = messagesContainerRef.value
  if (!el || resizeObserver) return

  resizeObserver = new ResizeObserver(() => {
    // 容器高度变化时，自动滚动到底部
    scrollToBottom()
  })

  resizeObserver.observe(el)
}

function destroyResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

watch(messages, () => {
  scrollToBottom()
})

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderContent(content: string): string {
  if (!content) return ''
  try {
    const result = marked.parse(content) as string
    return result.trimEnd()
  } catch {
    return escapeHtml(content).trimEnd()
  }
}

function useSuggestion(text: string) {
  inputText.value = text
  handleSend()
}

function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
function closeSidebar() { sidebarOpen.value = false }

const CONV_COLORS = [
  '#fde8e8','#fde8f5','#ede8fd','#e8eafd','#e8f4fd',
  '#e8fdf4','#fdf6e8','#fde8e8','#e8fdfd','#f0fde8',
]
const convColorCache = new Map<string, string>()
function getConvColor(id: string): string {
  if (!convColorCache.has(id)) {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    convColorCache.set(id, CONV_COLORS[h % CONV_COLORS.length])
  }
  return convColorCache.get(id)!
}
function getConvLetter(title?: string): string {
  if (!title) return '?'
  const m = title.match(/[\u4e00-\u9fa5a-zA-Z0-9]/)
  return m ? m[0].toUpperCase() : title[0]
}

function formatConvTime(ts: string | number): string {
  if (!ts) return ''
  let ms: number
  const num = typeof ts === 'number' ? ts : Number(ts)
  if (!isNaN(num) && num < 1e12) {
    ms = num * 1000
  } else if (!isNaN(num)) {
    ms = num
  } else {
    ms = new Date(ts as string).getTime()
  }
  const date = new Date(ms)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

async function loadConversations() {
  loadingConversations.value = true
  try {
    const sessions = await getLocalSessions()
    conversations.value = sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (err) {
    console.error('[xiaohailing] loadConversations error:', err)
  } finally {
    loadingConversations.value = false
  }
}

async function handleNewChat() {
  if (sessionKey.value) {
    // 保存当前会话信息
    await saveSessionInfo({
      sessionKey: sessionKey.value,
      name: getConversationName(),
      updatedAt: Date.now(),
      lastActivity: Date.now()
    })
  }
  
  // 生成新的会话ID
  sessionKey.value = 'xh-' + generateId()
  currentSessionKey.value = sessionKey.value
  messages.value = []
  
  // 创建新会话记录
  await saveSessionInfo({
    sessionKey: sessionKey.value,
    updatedAt: Date.now(),
    lastActivity: Date.now()
  })
  
  await loadConversations()
}

function getConversationName(): string {
  if (messages.value.length === 0) return ''
  const firstUserMsg = messages.value.find(m => m.role === 'user')
  if (firstUserMsg) {
    return firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
  }
  return ''
}

async function handleSwitchConversation(sk: string) {
  if (currentSessionKey.value === sk) return
  
  // 保存当前会话
  if (sessionKey.value && messages.value.length > 0) {
    await saveSessionInfo({
      sessionKey: sessionKey.value,
      name: getConversationName(),
      updatedAt: Date.now(),
      lastActivity: Date.now()
    })
  }
  
  // 切换到新会话
  sessionKey.value = sk
  currentSessionKey.value = sk
  
  // 加载该会话的消息
  loadingConversations.value = true
  try {
    const localMessages = await getLocalMessages(sk)
    messages.value = localMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })) as XiaohailingMessage[]
  } catch (err) {
    console.error('[xiaohailing] load conversation error:', err)
    messages.value = []
  } finally {
    loadingConversations.value = false
  }
}

function handleServiceChange(service: 'dify' | 'xiaohailing') {
  if (service === 'dify') {
    window.location.href = '/chat'
  }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  // 检查是否已连接
  if (!wsClient.connected || !sessionKey.value) {
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: '请稍候，正在建立连接...',
      timestamp: Date.now(),
    })
    return
  }

  // 立即进入流式状态，让按钮变成停止按钮
  isStreaming.value = true

  // Add user message
  const userMessage: XiaohailingMessage = {
    id: generateId(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
  }
  messages.value.push(userMessage)

  // 滚动到底部
  scrollToBottom()

  // 保存消息到本地
  await saveMessage({
    id: userMessage.id,
    sessionKey: sessionKey.value,
    role: 'user',
    content: text,
    timestamp: userMessage.timestamp
  })
  
  // 更新会话信息
  await saveSessionInfo({
    sessionKey: sessionKey.value,
    name: getConversationName(),
    updatedAt: Date.now(),
    lastActivity: Date.now()
  })
  
  await loadConversations()

  inputText.value = ''
  setStatus('思考中...', 'thinking')
  streamingText.value = ''

  // Abort previous request if exists
  if (abortController.value) {
    abortController.value.abort()
  }
  abortController.value = new AbortController()

  try {
    await wsClient.chatSend(sessionKey.value, text)
  } catch (err) {
    if ((err as Error).message !== 'AbortError') {
      messages.value.push({
        id: generateId(),
        role: 'assistant',
        content: `抱歉，发生了错误：${(err as Error).message}`,
        timestamp: Date.now(),
      })
      setStatus('连接错误', 'error')
    }
  } finally {
    isStreaming.value = false
    streamingText.value = ''
    abortController.value = null
    if (statusType.value !== 'error') {
      setStatus('在线', 'online')
    }
  }
}

async function handleStop() {
  if (abortController.value) {
    abortController.value.abort()
  }
}

onMounted(() => {
  inputRef.value?.focus()
  initConnection()
  loadConversations()
  // 初始化 ResizeObserver 监听容器高度变化
  nextTick(() => {
    initResizeObserver()
  })
})

onUnmounted(() => {
  wsClient.disconnect()
  destroyResizeObserver()
})

async function initConnection() {
  setStatus('连接中...', 'loading')
  
  wsClient.onStatusChange((status, errorMsg) => {
    switch (status) {
      case 'connected':
        setStatus('在线', 'online')
        break
      case 'ready':
        setStatus('在线', 'online')
        break
      case 'disconnected':
        setStatus('已断开', 'error')
        break
      case 'reconnecting':
        setStatus('重连中...', 'loading')
        break
      case 'auth_failed':
        setStatus('认证失败', 'error')
        break
      case 'error':
        setStatus(errorMsg || '连接错误', 'error')
        break
      default:
        setStatus(status, 'loading')
    }
  })
  
  wsClient.onEvent((msg) => {
    console.log('[xiaohailing] 收到事件:', msg)
    handleServerEvent(msg)
  })
  
  wsClient.onReady((hello, key) => {
    if (key) {
      sessionKey.value = key
      currentSessionKey.value = key
      setStatus('在线', 'online')
      console.log('[xiaohailing] 连接成功，sessionKey:', key)
      
      // 检查是否有本地消息
      getLocalMessages(key).then(localMsgs => {
        if (localMsgs.length > 0) {
          messages.value = localMsgs.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })) as XiaohailingMessage[]
        }
      })
      
      // 保存会话信息
      saveSessionInfo({
        sessionKey: key,
        updatedAt: Date.now(),
        lastActivity: Date.now()
      })
      
      loadConversations()
    }
  })
  
  try {
    await wsClient.connect(host, token)
  } catch (err) {
    console.error('[xiaohailing] 连接失败:', err)
    setStatus('连接失败', 'error')
  }
}

const currentAiText = ref('')
const currentAiBubbleId = ref<string | null>(null)
const expandedToolResults = ref<Record<string, boolean>>({})

function toggleToolResult(toolCallId: string) {
  expandedToolResults.value[toolCallId] = !expandedToolResults.value[toolCallId]
}

function extractContent(message: unknown): { text: string } {
  if (!message || typeof message !== 'object') return { text: '' }
  const msg = message as Record<string, unknown>
  if (typeof msg.content === 'string') {
    return { text: msg.content }
  }
  if (typeof msg.text === 'string') {
    return { text: msg.text }
  }
  if (Array.isArray(msg.content)) {
    const texts: string[] = []
    for (const block of msg.content as unknown[]) {
      const b = block as Record<string, unknown>
      if (b.type === 'text' && typeof b.text === 'string') {
        texts.push(b.text)
      }
    }
    return { text: texts.join('\n') }
  }
  return { text: '' }
}

function handleServerEvent(msg: { event: string; payload?: unknown }) {
  console.log('[xiaohailing] handleServerEvent:', msg)
  
  const { event, payload } = msg
  
  if (event === 'chat') {
    handleChatEvent(payload)
  } else if (event === 'agent') {
    handleAgentEvent(payload)
  } else if (event === 'system.notify') {
    handleSystemNotify(payload)
  } else {
    console.log('[xiaohailing] 未知事件:', msg)
  }
}

function handleChatEvent(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  
  const data = payload as Record<string, unknown>
  const state = data.state as string
  
  const eventSessionKey = data.sessionKey as string
  console.log('[xiaohailing] handleChatEvent - eventSessionKey:', eventSessionKey, ', sessionKey.value:', sessionKey.value)
  
  // 只有当服务器返回了 sessionKey 且与当前会话不匹配时才忽略
  // 服务器返回的 sessionKey 可能带有前缀（如 agent:main:），所以用 includes 判断
  // 如果服务器没有返回 sessionKey，则认为是当前会话的消息
  if (eventSessionKey && sessionKey.value && !eventSessionKey.includes(sessionKey.value)) {
    console.log('[xiaohailing] 忽略不属于当前会话的消息')
    return
  }
  
  if (state === 'delta') {
    console.log('[xiaohailing] delta state - data.message:', data.message)
    const content = extractContent(data.message)
    console.log('[xiaohailing] delta content:', content)
    if (content.text && content.text.length > currentAiText.value.length) {
      isStreaming.value = true
      currentAiText.value = content.text
      streamingText.value = content.text
      console.log('[xiaohailing] 更新流式文本:', content.text)
      // 流式输出时滚动到底部
      scrollToBottom()
    }
    return
  }
  
  if (state === 'final') {
    console.log('[xiaohailing] final state - data.message:', data.message)
    const content = extractContent(data.message)
    console.log('[xiaohailing] final content:', content)
    const finalText = content.text
    
    if (finalText) {
      console.log('[xiaohailing] 添加助手消息:', finalText)
      const assistantMsg: XiaohailingMessage = {
        id: generateId(),
        role: 'assistant',
        content: finalText,
        timestamp: Date.now(),
      }
      messages.value.push(assistantMsg)
      console.log('[xiaohailing] messages 数组长度:', messages.value.length)

      // 保存到本地
      saveMessage({
        id: assistantMsg.id,
        sessionKey: sessionKey.value || '',
        role: 'assistant',
        content: finalText,
        timestamp: assistantMsg.timestamp
      })
      
      // 更新会话信息
      saveSessionInfo({
        sessionKey: sessionKey.value || '',
        name: getConversationName(),
        updatedAt: Date.now(),
        lastActivity: Date.now()
      })
      
      loadConversations()
    }
    
    isStreaming.value = false
    streamingText.value = ''
    currentAiText.value = ''
    currentAiBubbleId.value = null
    return
  }
  
  if (state === 'aborted') {
    if (currentAiText.value) {
      messages.value.push({
        id: generateId(),
        role: 'assistant',
        content: currentAiText.value,
        timestamp: Date.now(),
      })
    }
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: '对话已中止',
      timestamp: Date.now(),
    })
    isStreaming.value = false
    streamingText.value = ''
    currentAiText.value = ''
    currentAiBubbleId.value = null
    return
  }
  
  if (state === 'error') {
    const errMsg = (data.errorMessage as string) || '未知错误'
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: `错误：${errMsg}`,
      timestamp: Date.now(),
    })
    isStreaming.value = false
    streamingText.value = ''
    currentAiText.value = ''
    currentAiBubbleId.value = null
    return
  }
}

function handleAgentEvent(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  
  const data = payload as Record<string, unknown>
  const eventSessionKey = data.sessionKey as string
  
  // 只有当服务器返回了 sessionKey 且与当前会话不匹配时才忽略
  // 服务器返回的 sessionKey 可能带有前缀（如 agent:main:），所以用 includes 判断
  if (eventSessionKey && sessionKey.value && !eventSessionKey.includes(sessionKey.value)) {
    console.log('[xiaohailing] agent event - 忽略不属于当前会话的消息:', eventSessionKey, sessionKey.value)
    return
  }
  
  const stream = data.stream as string
  const agentData = data.data as Record<string, unknown>
  
  if (stream === 'lifecycle') {
    const phase = agentData?.phase as string
    if (phase === 'start') {
      isStreaming.value = true
    } else if (phase === 'end') {
    }
    return
  }
  
  if (stream === 'assistant') {
    const text = agentData?.text as string
    if (text && typeof text === 'string') {
      if (text.length > currentAiText.value.length) {
        isStreaming.value = true
        currentAiText.value = text
        streamingText.value = text
        // 流式输出时滚动到底部
        scrollToBottom()
      }
    }
    return
  }
  
  if (stream === 'item' && agentData?.kind === 'tool') {
    const toolCallId = (agentData?.toolCallId as string) || (agentData?.itemId as string)
    const name = agentData?.name as string || 'tool'
    const phase = agentData?.phase as string || ''
    const status = agentData?.status as string || ''
    const title = (agentData?.title as string) || (agentData?.meta as string) || name
    const result = (agentData?.result as string) || (agentData?.progressText as string)
    const startedAt = agentData?.startedAt as number
    const endedAt = agentData?.endedAt as number
    
    console.log('[xiaohailing] tool item event:', { toolCallId, name, phase, status, title, result })
    
    if (!toolCallId) {
      console.warn('[xiaohailing] tool item event missing toolCallId')
      return
    }
    
    let toolPhase: 'running' | 'done' | 'error' = 'running'
    if (phase === 'end' || status === 'completed') {
      toolPhase = 'done'
    } else if (status === 'failed' || status === 'error') {
      toolPhase = 'error'
    } else if (phase === 'start') {
      toolPhase = 'running'
    }
    
    const existingMsgIndex = messages.value.findIndex(
      (m) => m.id === toolCallId
    )
    
    console.log('[xiaohailing] tool item - existingMsgIndex:', existingMsgIndex, 'current messages count:', messages.value.length)
    
    if (existingMsgIndex >= 0) {
      const existingToolCall = messages.value[existingMsgIndex].toolCall
      messages.value[existingMsgIndex] = {
        ...messages.value[existingMsgIndex],
        toolCall: {
          toolCallId,
          name: title,
          phase: toolPhase,
          result: result || existingToolCall?.result,
          startTime: startedAt || existingToolCall?.startTime || Date.now(),
          endTime: endedAt || ((toolPhase === 'done' || toolPhase === 'error') ? Date.now() : existingToolCall?.endTime),
        },
        timestamp: Date.now(),
      }
      console.log('[xiaohailing] tool item - updated existing message, result:', result || existingToolCall?.result)
    } else {
      messages.value.push({
        id: toolCallId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        toolCall: {
          toolCallId,
          name: title,
          phase: toolPhase,
          result: result || undefined,
          startTime: startedAt || Date.now(),
          endTime: endedAt || ((toolPhase === 'done' || toolPhase === 'error') ? Date.now() : undefined),
        },
      })
      console.log('[xiaohailing] tool item - added new message with result:', result)
    }
    return
  }

  // 处理工具执行结果事件
  if (stream === 'command_output') {
    const toolCallId = (agentData?.toolCallId as string) || (agentData?.itemId as string)
    const output = agentData?.output as string
    const title = agentData?.title as string || 'command'
    
    console.log('[xiaohailing] command_output event:', { toolCallId, hasOutput: !!output })
    
    if (!toolCallId) {
      console.warn('[xiaohailing] command_output event missing toolCallId')
      return
    }
    
    const existingMsgIndex = messages.value.findIndex(
      (m) => m.id === toolCallId
    )
    
    if (existingMsgIndex >= 0) {
      const existingMsg = messages.value[existingMsgIndex]
      const existingToolCall = existingMsg.toolCall
      messages.value[existingMsgIndex] = {
        ...existingMsg,
        toolCall: {
          toolCallId: existingToolCall?.toolCallId || toolCallId,
          name: existingToolCall?.name || title,
          phase: existingToolCall?.phase || 'done',
          result: output || existingToolCall?.result,
          startTime: existingToolCall?.startTime,
          endTime: existingToolCall?.endTime || Date.now(),
        },
        timestamp: Date.now(),
      }
      console.log('[xiaohailing] command_output - updated message with output')
    } else {
      messages.value.push({
        id: toolCallId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        toolCall: {
          toolCallId,
          name: title,
          phase: 'done',
          result: output,
          startTime: Date.now(),
          endTime: Date.now(),
        },
      })
      console.log('[xiaohailing] command_output - added new message with output')
    }
    return
  }

  if (stream === 'item' && agentData?.kind === 'command') {
    const toolCallId = (agentData?.toolCallId as string) || (agentData?.itemId as string)
    const name = agentData?.name as string || 'command'
    const phase = agentData?.phase as string || ''
    const status = agentData?.status as string || ''
    const title = (agentData?.title as string) || (agentData?.meta as string) || name
    const result = (agentData?.result as string) || (agentData?.progressText as string)
    const startedAt = agentData?.startedAt as number
    const endedAt = agentData?.endedAt as number
    
    console.log('[xiaohailing] command item event:', { toolCallId, name, phase, status, title })
    
    if (!toolCallId) {
      console.warn('[xiaohailing] command item event missing toolCallId')
      return
    }
    
    let toolPhase: 'running' | 'done' | 'error' = 'running'
    if (phase === 'end' || status === 'completed') {
      toolPhase = 'done'
    } else if (status === 'failed' || status === 'error') {
      toolPhase = 'error'
    } else if (phase === 'start') {
      toolPhase = 'running'
    }
    
    const existingMsgIndex = messages.value.findIndex(
      (m) => m.id === toolCallId
    )
    
    if (existingMsgIndex >= 0) {
      const existingToolCall = messages.value[existingMsgIndex].toolCall
      messages.value[existingMsgIndex] = {
        ...messages.value[existingMsgIndex],
        toolCall: {
          toolCallId,
          name: title,
          phase: toolPhase,
          result: result || existingToolCall?.result,
          startTime: startedAt || existingToolCall?.startTime || Date.now(),
          endTime: endedAt || ((toolPhase === 'done' || toolPhase === 'error') ? Date.now() : existingToolCall?.endTime),
        },
        timestamp: Date.now(),
      }
    } else {
      messages.value.push({
        id: toolCallId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        toolCall: {
          toolCallId,
          name: title,
          phase: toolPhase,
          result: result || undefined,
          startTime: startedAt || Date.now(),
          endTime: endedAt || ((toolPhase === 'done' || toolPhase === 'error') ? Date.now() : undefined),
        },
      })
    }
    return
  }

  if (stream === 'tool') {
    const toolCallId = agentData?.toolCallId as string
    const name = agentData?.name as string || 'tool'
    const phase = agentData?.phase as string || ''
    const result = (agentData?.result as string) || (agentData?.progressText as string)
    
    console.log('[xiaohailing] tool event:', { toolCallId, name, phase })
    
    if (!toolCallId) {
      console.warn('[xiaohailing] tool event missing toolCallId')
      return
    }
    
    const existingMsgIndex = messages.value.findIndex(
      (m) => m.id === toolCallId
    )
    
    let toolPhase: 'running' | 'done' | 'error' = 'running'
    if (phase === 'result' || phase === 'end') {
      toolPhase = 'done'
    } else if (phase === 'error') {
      toolPhase = 'error'
    } else if (phase === 'start' || phase === 'update') {
      toolPhase = 'running'
    }
    
    if (existingMsgIndex >= 0) {
      const existingToolCall = messages.value[existingMsgIndex].toolCall
      messages.value[existingMsgIndex] = {
        ...messages.value[existingMsgIndex],
        toolCall: {
          toolCallId,
          name,
          phase: toolPhase,
          result: result || existingToolCall?.result,
          startTime: existingToolCall?.startTime || Date.now(),
          endTime: (toolPhase === 'done' || toolPhase === 'error') ? Date.now() : existingToolCall?.endTime,
        },
        timestamp: Date.now(),
      }
    } else {
      messages.value.push({
        id: toolCallId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        toolCall: {
          toolCallId,
          name,
          phase: toolPhase,
          result: result || undefined,
          startTime: Date.now(),
          endTime: (toolPhase === 'done' || toolPhase === 'error') ? Date.now() : undefined,
        },
      })
    }
    return
  }
}

function getToolStatusText(phase: string): string {
  const statusMap: Record<string, string> = {
    running: '执行中...',
    done: '执行完成',
    error: '执行失败',
    start: '开始执行',
    result: '执行完成',
    update: '执行中...',
  }
  return statusMap[phase] || phase
}

function getToolDuration(toolCall: { startTime?: number; endTime?: number }): string {
  if (!toolCall.startTime) return ''
  const endTime = toolCall.endTime || Date.now()
  const duration = endTime - toolCall.startTime
  
  if (duration < 1000) {
    return `${duration}ms`
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = ((duration % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }
}

const toolCalls = ref<Record<string, XiaohailingMessage['toolCall']>>({})

function handleSystemNotify(payload: unknown) {
  if (!payload || typeof payload !== 'object') return
  
  const data = payload as Record<string, unknown>
  const title = data.title as string || '系统通知'
  const body = (data.body as string) || (data.message as string) || (data.text as string) || ''
  
  if (body) {
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: `🔔 ${title}：${body}`,
      timestamp: Date.now(),
    })
  }
}
</script>

<style scoped>
.xiaohailing-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #F7F8FC;
}

.xh-chat-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.xh-sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: fixed;
  left: 0;
  top: 64px;
  bottom: 0;
  z-index: 40;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
}

.xh-sidebar.open {
  transform: translateX(0);
}

.xh-sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 35;
  display: block;
  backdrop-filter: blur(2px);
}

@media (min-width: 768px) {
  .xh-sidebar {
    position: relative;
    transform: none;
  }
  
  .xh-sidebar-overlay {
    display: none;
  }
}

.xh-sidebar-top {
  padding: 14px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.xh-new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.25);
}

.xh-new-chat-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: 0 6px 18px rgba(22, 93, 255, 0.35);
}

.xh-new-chat-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.xh-conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.xh-conv-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #86909C;
  font-size: 13px;
}

.xh-conv-empty {
  text-align: center;
  padding: 40px 16px;
  color: #86909C;
}

.xh-conv-empty-icon {
  width: 52px;
  height: 52px;
  background: #F2F3F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  font-size: 22px;
  color: #C9CDD4;
}

.xh-conv-empty p {
  font-size: 14px;
  font-weight: 500;
  color: #4E5969;
  margin: 0 0 4px;
}

.xh-conv-empty span {
  font-size: 12px;
  color: #86909C;
}

.xh-conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.15s;
}

.xh-conv-item:hover {
  background: #F7F8FC;
}

.xh-conv-item.active {
  background: rgba(22, 93, 255, 0.08);
}

.xh-conv-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f0f2f5;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.xh-conv-icon-letter {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  line-height: 1;
}

.xh-conv-item.active .xh-conv-icon {
  background: rgba(22, 93, 255, 0.12);
}

.xh-conv-item.active .xh-conv-icon-letter {
  color: #165DFF;
}

.xh-conv-meta {
  flex: 1;
  min-width: 0;
}

.xh-conv-title {
  font-size: 13px;
  font-weight: 500;
  color: #1D2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xh-conv-item.active .xh-conv-title {
  color: #165DFF;
}

.xh-conv-time {
  font-size: 11px;
  color: #86909C;
  margin-top: 2px;
}

/* Main chat area */
.xh-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

/* Header */
.xh-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.xh-chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.xh-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #4E5969;
  cursor: pointer;
  transition: background 0.2s;
}

.xh-icon-btn:hover {
  background: #F2F4F7;
}

.xh-sidebar-toggle {
  display: flex;
}

@media (min-width: 768px) {
  .xh-sidebar-toggle {
    display: none;
  }
}

.xh-agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.xh-agent-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
}

.xh-agent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.xh-agent-status-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.xh-dot-online { background: #00B42A; }
.xh-dot-thinking { background: #FF7D00; animation: pulse 1.5s infinite; }
.xh-dot-error { background: #F53F3F; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.xh-agent-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.xh-agent-name {
  font-size: 14px;
  font-weight: 600;
  color: #1D2129;
}

.xh-agent-status {
  font-size: 12px;
}

.xh-status-online { color: #00B42A; }
.xh-status-thinking { color: #FF7D00; }
.xh-status-error { color: #F53F3F; }

.xh-chat-header-right {
  display: flex;
  gap: 8px;
}

.xh-header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(22, 93, 255, 0.08);
  color: #165DFF;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.xh-header-btn:hover:not(:disabled) {
  background: rgba(22, 93, 255, 0.12);
}

.xh-header-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Messages area */
.xh-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #F7F8FC;
  position: relative;
}

/* Scroll to bottom button */
.xh-scroll-to-bottom-btn {
  position: absolute;
  right: 24px;
  bottom: 100px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #165DFF;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 100;
}

.xh-scroll-to-bottom-btn:hover {
  background: #0D47A1;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.xh-scroll-to-bottom-btn:active {
  transform: translateY(0);
}

/* Welcome screen */
.xh-welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.xh-welcome-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(22, 93, 255, 0.15);
  box-shadow: 0 8px 24px rgba(22, 93, 255, 0.15);
  margin-bottom: 16px;
}

.xh-welcome-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.xh-welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #1D2129;
  margin: 0 0 8px 0;
}

.xh-welcome-desc {
  font-size: 14px;
  color: #86909C;
  margin: 0 0 24px 0;
}

.xh-welcome-suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.xh-suggestion-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #EEF0F6;
  border-radius: 20px;
  font-size: 13px;
  color: #4E5969;
  cursor: pointer;
  transition: all 0.2s;
}

.xh-suggestion-chip:hover {
  background: rgba(22, 93, 255, 0.08);
  border-color: rgba(22, 93, 255, 0.2);
  color: #165DFF;
}

/* Message rows */
.xh-message-row {
  display: flex;
  margin-bottom: 12px;
}

.xh-message-row.user {
  justify-content: flex-end;
}

.xh-message-row.xh-assistant {
  justify-content: flex-start;
}

/* User message */
.xh-user-msg-wrap {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 70%;
}

.xh-user-bubble {
  padding: 12px 16px;
  background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%);
  border-radius: 16px 16px 4px 16px;
  color: white;
  box-shadow: 0 2px 8px rgba(22, 93, 255, 0.18);
}

.xh-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.xh-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Assistant message */
.xh-assistant-msg-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 70%;
}

.xh-assistant-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
}

.xh-assistant-content {
  flex: 1;
  min-width: 0;
  max-width: 100%;
}

.xh-assistant-bubble {
  padding: 12px 16px;
  background: white;
  border-radius: 4px 16px 16px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.xh-markdown-content {
  font-size: 14px;
  line-height: 1.6;
}

.xh-markdown-content :deep(p) {
  margin: 0 0 6px 0;
}

.xh-markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.xh-markdown-content :deep(strong) {
  font-weight: 600;
  color: #1D2129;
}

.xh-markdown-content :deep(ul),
.xh-markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.xh-markdown-content :deep(li) {
  margin: 4px 0;
}

/* Typing dots */
.xh-typing-dots {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.xh-typing-dots span {
  width: 6px;
  height: 6px;
  background: #C0C4CC;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.xh-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.xh-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* Input area */
.xh-input-area {
  padding: 14px 20px 16px;
  background: white;
  border-top: 1px solid rgba(0,0,0,0.06);
}

.xh-input-row {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1.5px solid rgba(0,0,0,0.1);
  border-radius: 16px;
  overflow: visible;
  transition: all 0.2s;
}

.xh-input-row:focus-within {
  border-color: rgba(0,0,0,0.15);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.xh-input-bottom-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
}

.xh-input-switcher-wrapper {
  flex-shrink: 0;
}

.xh-chat-input {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  background: transparent;
  min-width: 0;
}

.xh-chat-input:focus {
  background: #F7F8FC;
}

.xh-chat-input::placeholder {
  color: #86909C;
}

.xh-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: #F2F3F5;
  color: #86909C;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.xh-send-btn.active {
  background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(22, 93, 255, 0.22);
}

.xh-send-btn.streaming {
  background: linear-gradient(135deg, #FF4D4F 0%, #FF7875 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.22);
}

.xh-send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.xh-send-btn:disabled {
  cursor: not-allowed;
}

.xh-input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.xh-input-hint {
  font-size: 12px;
  color: #86909C;
}

/* Tool call card */
.xh-tool-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(22, 93, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(22, 93, 255, 0.15);
  font-size: 12px;
  max-width: 100%;
  box-sizing: border-box;
}

.xh-tool-card.running {
  border-color: rgba(22, 93, 255, 0.3);
}

.xh-tool-card.done {
  background: rgba(0, 180, 42, 0.06);
  border-color: rgba(0, 180, 42, 0.2);
}

.xh-tool-card.error {
  background: rgba(245, 63, 63, 0.06);
  border-color: rgba(245, 63, 63, 0.2);
}

.xh-tool-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.xh-tool-info {
  flex: 1;
  min-width: 0;
}

.xh-tool-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.xh-tool-header-row.clickable {
  cursor: pointer;
}

.xh-tool-header-row.clickable:hover {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.xh-tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.xh-tool-header.clickable {
  cursor: pointer;
}

.xh-tool-header.clickable:hover {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.xh-tool-name {
  font-size: 12px;
  font-weight: 500;
  color: #1D2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xh-tool-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.xh-tool-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #86909C;
}

.xh-tool-card.running .xh-tool-status-badge {
  color: #165DFF;
}

.xh-tool-card.done .xh-tool-status-badge {
  color: #00B42A;
}

.xh-tool-card.error .xh-tool-status-badge {
  color: #F53F3F;
}

.xh-tool-duration {
  font-size: 11px;
  color: #86909C;
}

.xh-tool-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(22, 93, 255, 0.2);
  border-top-color: #165DFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.xh-tool-toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.xh-tool-toggle-icon {
  font-size: 10px;
  color: #86909C;
  transition: transform 0.2s;
  display: inline-block;
}

.xh-tool-toggle-icon.expanded {
  transform: rotate(180deg);
}

.xh-tool-expanded {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.xh-tool-command {
  margin-bottom: 10px;
}

.xh-tool-command-label {
  font-size: 11px;
  color: #86909C;
  margin-bottom: 4px;
}

.xh-tool-command-content {
  font-size: 12px;
  color: #4E5969;
  white-space: pre-wrap;
  word-break: break-all;
}

.xh-tool-result {
  margin-top: 0;
  padding-top: 0;
}

.xh-tool-result-label {
  font-size: 11px;
  color: #86909C;
  margin-bottom: 6px;
}

.xh-tool-result-content {
  font-size: 12px;
  line-height: 1.5;
  color: #4E5969;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: 80%;
}
</style>