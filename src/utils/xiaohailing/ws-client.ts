/**
 * SSE + HTTP POST 客户端 - 对接 ClawApp 代理服务端
 *
 * 架构：手机 ←SSE+POST→ 代理服务端 ←WS→ OpenClaw Gateway
 * - POST /api/connect   建立会话
 * - GET  /api/events    SSE 事件流
 * - POST /api/send      RPC 转发
 * - POST /api/disconnect 断开会话
 */

export function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const REQUEST_TIMEOUT = 30000
const MAX_RECONNECT_DELAY = 30000

interface HelloData {
  agentId?: string
  agentName?: string
  gatewayVersion?: string
}

interface SnapshotData {
  sessionDefaults?: {
    mainSessionKey?: string
  }
}

interface WsEvent {
  event: string
  payload?: unknown
  seq?: number
}

/**
 * 智能推断 baseUrl 协议：
 * - 已带 http:// 或 https:// → 直接使用
 * - IP 地址 / localhost → http
 * - 域名 → https
 */
function resolveBaseUrl(host: string): string {
  if (/^https?:\/\//i.test(host)) return host.replace(/\/+$/, '')
  const hostOnly = host.split(':')[0]
  const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostOnly)
  const isLocal = hostOnly === 'localhost' || hostOnly === '127.0.0.1'
  const protocol = (isIP || isLocal) ? 'http' : 'https'
  return `${protocol}://${host}`
}

export class WsClient {
  private _host = ''
  private _token = ''
  private _baseUrl = ''
  private _sid: string | null = null
  private _es: EventSource | null = null
  private _connected = false
  private _gatewayReady = false
  private _intentionalClose = false
  private _onStatusChange: ((status: string, errorMsg?: string) => void) | null = null
  private _snapshot: SnapshotData | null = null
  private _hello: HelloData | null = null
  private _sessionKey: string | null = null
  private _readyCallbacks: Array<(hello: HelloData | null, sessionKey: string | null, meta?: { error?: boolean; message?: string }) => void> = []
  private _eventListeners: Array<(msg: WsEvent) => void> = []
  private _reconnectAttempts = 0
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _esId = 0
  private _lastSseEventId = 0
  private _recentEventHashes = new Map<string, number>()
  private _sessionRecoverPromise: Promise<void> | null = null

  get connected(): boolean { return this._connected }
  get gatewayReady(): boolean { return this._gatewayReady }
  get snapshot(): SnapshotData | null { return this._snapshot }
  get hello(): HelloData | null { return this._hello }
  get sessionKey(): string | null { return this._sessionKey }

  onStatusChange(fn: (status: string, errorMsg?: string) => void): void {
    this._onStatusChange = fn
  }

  onReady(fn: (hello: HelloData | null, sessionKey: string | null, meta?: { error?: boolean; message?: string }) => void): () => void {
    this._readyCallbacks.push(fn)
    return () => { this._readyCallbacks = this._readyCallbacks.filter(cb => cb !== fn) }
  }

  onEvent(callback: (msg: WsEvent) => void): () => void {
    this._eventListeners.push(callback)
    return () => { this._eventListeners = this._eventListeners.filter(fn => fn !== callback) }
  }

  /** 连接到代理服务端 */
  async connect(host: string, token: string): Promise<void> {
    this._host = host
    this._token = token
    // 开发环境下使用代理路径，避免 CORS 问题
    // 正确提取主机名（处理带协议的情况，如 http://localhost:3210）
    let hostOnly = host
    if (host.startsWith('http://') || host.startsWith('https://')) {
      const url = new URL(host)
      hostOnly = url.hostname
    } else {
      hostOnly = host.split(':')[0]
    }
    const isLocal = hostOnly === 'localhost' || hostOnly === '127.0.0.1'
    this._baseUrl = isLocal ? '/xh-api' : resolveBaseUrl(host)
    this._intentionalClose = false
    this._setConnected(false, 'connecting')

    try {
      // 1. POST /api/connect 建立会话
      const res = await fetch(`${this._baseUrl}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      // 容错：CF Tunnel 502 等情况会返回 HTML 而非 JSON
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`服务暂时不可用 (${res.status})`)
      }
      const data = await res.json()

      if (!data.ok) {
        const msg = data.error || '连接失败'
        if (res.status === 401) {
          this._setConnected(false, 'auth_failed', msg)
          this._readyCallbacks.forEach(fn => {
            try { fn(null, null, { error: true, message: msg }) } catch (e) {}
          })
          return
        }
        if (res.status === 502) {
          // Gateway 不可用，不自动重连，需要用户处理
          this._setConnected(false, 'error', msg)
          return
        }
        throw new Error(msg)
      }

      this._sid = data.sid
      this._hello = data.hello
      this._snapshot = data.snapshot
      this._sessionKey = data.sessionKey
      this._lastSseEventId = 0
      this._recentEventHashes.clear()

      // 2. 开启 SSE 事件流
      this._setupEventSource()

      // 3. 标记就绪
      this._gatewayReady = true
      this._connected = true
      this._reconnectAttempts = 0
      this._setConnected(true, 'ready')
      this._readyCallbacks.forEach(fn => {
        try { fn(this._hello, this._sessionKey) } catch (e) {}
      })
    } catch (e) {
      console.error('[xiaohailing] connect error:', e)
      this._setConnected(false, 'error', (e as Error).message)
      if (!this._intentionalClose) this._scheduleReconnect()
    }
  }

  /** 建立 SSE 事件流 */
  private _setupEventSource(): void {
    this._closeEventSource()
    const esId = ++this._esId
    const url = `${this._baseUrl}/api/events?sid=${encodeURIComponent(this._sid || '')}`
    const es = new EventSource(url)
    this._es = es

    // 通用事件（Gateway 推送的消息）
    es.addEventListener('message', (evt) => {
      if (esId !== this._esId) return

      // 去重：优先使用 SSE id，处理重连补发/重复投递
      const idNum = Number(evt.lastEventId || 0)
      if (Number.isFinite(idNum) && idNum > 0) {
        if (idNum <= this._lastSseEventId) return
        this._lastSseEventId = idNum
      } else if (typeof evt.data === 'string' && evt.data) {
        // 兜底：无 id 时用短时哈希防抖（避免同帧重复分发）
        const now = Date.now()
        const key = evt.data.length > 512 ? evt.data.slice(0, 512) : evt.data
        const lastSeen = this._recentEventHashes.get(key)
        if (lastSeen && now - lastSeen < 2000) return
        this._recentEventHashes.set(key, now)
        if (this._recentEventHashes.size > 200) {
          for (const [k, ts] of this._recentEventHashes) {
            if (now - ts > 10000) this._recentEventHashes.delete(k)
          }
        }
      }

      let msg: WsEvent
      try { msg = JSON.parse(evt.data) } catch { return }
      this._eventListeners.forEach(fn => {
        try { fn(msg) } catch (e) { console.error('[xiaohailing] handler error:', e) }
      })
    })

    // proxy.ready（SSE 重连后的确认）
    es.addEventListener('proxy.ready', () => {
      if (esId !== this._esId) return
      if (!this._gatewayReady) {
        this._gatewayReady = true
        this._setConnected(true, 'ready')
      }
    })

    // proxy.disconnect（Gateway 断开）
    es.addEventListener('proxy.disconnect', () => {
      if (esId !== this._esId) return
      this._gatewayReady = false
      this._setConnected(false, 'disconnected')
      this._closeEventSource()
      if (!this._intentionalClose) this._scheduleReconnect()
    })

    es.onerror = () => {
      if (esId !== this._esId) return
      // EventSource 会自动重连，但如果会话已失效需要完整重连
      if (this._gatewayReady) {
        console.log('[xiaohailing] SSE 断开，等待自动重连...')
      }
    }
  }

  /** 断开连接 */
  disconnect(): void {
    this._intentionalClose = true
    this._clearReconnectTimer()
    this._closeEventSource()
    if (this._sid && this._baseUrl) {
      fetch(`${this._baseUrl}/api/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: this._sid }),
      }).catch(() => {})
    }
    this._sid = null
    this._gatewayReady = false
    this._setConnected(false)
  }

  /** 手动触发重连 */
  reconnect(): void {
    if (!this._host || !this._token) return
    this._intentionalClose = false
    this._reconnectAttempts = 0
    this._clearReconnectTimer()
    this._closeEventSource()
    this._sid = null
    this._gatewayReady = false
    this.connect(this._host, this._token)
  }

  private _waitReady(timeoutMs = 15000): Promise<{ hello: HelloData | null; sessionKey: string | null }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub()
        reject(new Error('等待重连超时'))
      }, timeoutMs)

      const unsub = this.onReady((hello, sessionKey, meta) => {
        clearTimeout(timer)
        unsub()
        if (meta?.error) {
          reject(new Error(meta.message || '连接失败'))
          return
        }
        resolve({ hello, sessionKey })
      })
    })
  }

  private _recoverSession(): Promise<void> {
    if (this._sessionRecoverPromise) return this._sessionRecoverPromise
    if (!this._host || !this._token) return Promise.reject(new Error('未连接'))

    this._sessionRecoverPromise = (async () => {
      this.reconnect()
      await this._waitReady(15000)
    })().finally(() => {
      this._sessionRecoverPromise = null
    })

    return this._sessionRecoverPromise
  }

  /** 发送 RPC 请求 */
  async request(method: string, params: Record<string, unknown> = {}, hasRetriedAfterSessionMissing = false): Promise<unknown> {
    if (!this._sid || !this._gatewayReady) {
      // 等待重连就绪后重试
      if (!this._intentionalClose && this._reconnectAttempts > 0) {
        return new Promise((resolve, reject) => {
          const waitTimeout = setTimeout(() => {
            unsub()
            reject(new Error('等待重连超时'))
          }, 15000)
          const unsub = this.onReady(() => {
            clearTimeout(waitTimeout)
            unsub()
            this.request(method, params).then(resolve, reject)
          })
        })
      }
      throw new Error('未连接')
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const res = await fetch(`${this._baseUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: this._sid, method, params }),
        signal: controller.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (!data.ok) {
        const message = data.error || '请求失败'
        const isSessionMissing = res.status === 404 && /会话不存在|session\s+not\s+found/i.test(message)
        if (
          isSessionMissing &&
          !hasRetriedAfterSessionMissing &&
          !this._intentionalClose &&
          this._host &&
          this._token
        ) {
          console.warn('[xiaohailing] 会话不存在，尝试自动重连并重试请求:', method)
          await this._recoverSession()
          return this.request(method, params, true)
        }
        throw new Error(message)
      }
      return data.payload
    } catch (e) {
      clearTimeout(timer)
      if ((e as Error).name === 'AbortError') throw new Error('请求超时')
      throw e
    }
  }

  // ==================== 业务方法 ====================

  chatSend(sessionKey: string, message: string, attachments?: unknown[]): Promise<unknown> {
    const params: Record<string, unknown> = { sessionKey, message, deliver: false, idempotencyKey: uuid() }
    if (attachments?.length) params.attachments = attachments
    return this.request('chat.send', params)
  }

  chatHistory(sessionKey: string, limit = 200): Promise<unknown> {
    return this.request('chat.history', { sessionKey, limit })
  }

  async notifyHistory(): Promise<unknown[]> {
    if (!this._baseUrl || !this._sid) return []
    try {
      const res = await fetch(`${this._baseUrl}/api/notify-history?sid=${encodeURIComponent(this._sid)}`)
      const data = await res.json()
      return data.ok ? (data.items || []) : []
    } catch { return [] }
  }

  chatAbort(sessionKey: string, runId?: string): Promise<unknown> {
    const params: Record<string, unknown> = { sessionKey }
    if (runId) params.runId = runId
    return this.request('chat.abort', params)
  }

  sessionsList(limit = 50, channel?: string): Promise<unknown> {
    const params: Record<string, unknown> = { limit }
    if (channel) params.channel = channel
    return this.request('sessions.list', params)
  }

  sessionsDelete(key: string): Promise<unknown> {
    return this.request('sessions.delete', { key })
  }

  sessionsReset(key: string): Promise<unknown> {
    return this.request('sessions.reset', { key })
  }

  async getSessionProgress(sessionKey: string, options: { preferSessionKey?: boolean } = {}): Promise<unknown> {
    if (!this._baseUrl) throw new Error('未连接')
    const preferSessionKey = !!options.preferSessionKey
    const query = new URLSearchParams()
    if (sessionKey) query.set('sessionKey', sessionKey)
    if (this._sid && !preferSessionKey) query.set('sid', this._sid)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
    try {
      const res = await fetch(`${this._baseUrl}/api/progress?${query.toString()}`, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || '获取进度失败')
      return data
    } catch (e) {
      clearTimeout(timer)
      if ((e as Error).name === 'AbortError') throw new Error('查询进度超时')
      throw e
    }
  }

  // ==================== 内部辅助 ====================

  private _setConnected(val: boolean, status?: string, errorMsg?: string): void {
    this._connected = val
    this._onStatusChange?.(status || (val ? 'connected' : 'disconnected'), errorMsg)
  }

  private _closeEventSource(): void {
    if (this._es) {
      const old = this._es
      this._es = null
      this._esId++
      try { old.close() } catch {}
    }
  }

  private _clearReconnectTimer(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }

  private _scheduleReconnect(): void {
    this._clearReconnectTimer()
    const delay = this._reconnectAttempts < 3
      ? 1000
      : Math.min(1000 * Math.pow(2, this._reconnectAttempts - 2), MAX_RECONNECT_DELAY)
    this._reconnectAttempts++
    this._setConnected(false, 'reconnecting')
    this._reconnectTimer = setTimeout(() => this.connect(this._host, this._token), delay)
  }
}

export const wsClient = new WsClient()
