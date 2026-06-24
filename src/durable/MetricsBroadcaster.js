// Durable Object: 伺服器監控指標廣播中心
// 負責維護 WebSocket 連線並在收到新指標時向訂閱者即時推送
//
// - 連線通過 /api/ws?subscribe=<scope> 建立
//   scope = 'all'        -> 訂閱所有伺服器更新（首頁）
//   scope = <serverId>   -> 只訂閱某臺伺服器的更新（詳情頁）
//
// - 後端 /update 處理器在成功寫入 DB 後，呼叫 /__do_push/<id>
//   由本 DO 向所有訂閱者廣播剛收到的指標。
//
// - 心跳：每 25s 向客戶端傳送 ping，避免中間代理斷連。

function parseAllowedOrigins(corsAllowedOrigins) {
  if (!corsAllowedOrigins || corsAllowedOrigins.trim() === '') {
    return [];
  }
  return corsAllowedOrigins
    .split(',')
    .map(o => o.trim())
    .filter(o => o !== '');
}

export class MetricsBroadcaster {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // 儲存所有活躍 WebSocket：{ id: { ws, scope, createdAt } }
    this.sessions = new Map();
    this.nextSessionId = 0;

    // 心跳定時器
    this.heartbeatTimer = null;
    this._ensureHeartbeat();

    // 可選：某些執行時在 state 上暴露 blockConcurrencyWhile
    // 用於在例項首次啟動時序列完成必要初始化，例如從持久化儲存回放最新狀態
    if (this.state && typeof this.state.blockConcurrencyWhile === 'function') {
      this.state.blockConcurrencyWhile(async () => {
        // 預留：未來可在這裡做持久化的最新狀態回放
      });
    }
  }

  _ensureHeartbeat() {
    if (this.heartbeatTimer) return;
    // Workers 內的 setTimeout 最長 ~30s 可用；heartbeat 25s 比較穩
    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatTimer = null;
      if (this.sessions.size === 0) return;
      for (const { ws } of this.sessions.values()) {
        try {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
          }
        } catch (_) { /* ignore */ }
      }
      this._ensureHeartbeat();
    }, 25000);
  }

  // 根據 scope 判斷會話是否需要接收某臺伺服器的更新
  _shouldDeliver(sessionScope, serverId) {
    if (!sessionScope) return false;
    if (sessionScope === 'all') return true;
    return sessionScope === serverId;
  }

  _broadcast(serverId, payload) {
    if (this.sessions.size === 0) return;
    const message = JSON.stringify({
      type: 'update',
      serverId,
      ts: Date.now(),
      data: payload
    });

    for (const [sid, session] of this.sessions) {
      const { ws, scope } = session;
      if (ws.readyState !== 1) {
        this.sessions.delete(sid);
        continue;
      }
      if (!this._shouldDeliver(scope, serverId)) continue;
      try {
        ws.send(message);
      } catch (e) {
        try { ws.close(); } catch (_) {}
        this.sessions.delete(sid);
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 1) WebSocket 接入
    if (path === '/ws' || path.endsWith('/ws')) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade request', { status: 426 });
      }
      
      const origin = request.headers.get('Origin');
      const allowedOrigins = parseAllowedOrigins(this.env.CORS_ALLOWED_ORIGINS);
      
      const scope = (url.searchParams.get('subscribe') || 'all').toLowerCase();

      // @ts-ignore - Cloudflare Workers 執行時提供 WebSocketPair
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();

      const sid = ++this.nextSessionId;
      this.sessions.set(sid, { ws: server, scope, createdAt: Date.now() });

      const cleanup = () => {
        this.sessions.delete(sid);
        try { server.close(); } catch (_) {}
      };

      server.addEventListener('close', cleanup);
      server.addEventListener('error', cleanup);
      server.addEventListener('message', (event) => {
        // 簡單處理客戶端的 ping
        try {
          const msg = JSON.parse(event.data || '{}');
          if (msg && msg.type === 'pong') return;
          if (msg && msg.type === 'ping') {
            if (server.readyState === 1) {
              server.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
            }
          }
        } catch (_) {}
      });

      // 立即傳送一條 "hello" 讓客戶端確認連線成功
      try {
        server.send(JSON.stringify({
          type: 'hello',
          ts: Date.now(),
          subscribed: scope
        }));
      } catch (_) {}

      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', origin);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');

      return new Response(null, { status: 101, webSocket: client, headers: responseHeaders });
    }

    // 2) 內部廣播入口：/update 成功後由 Worker 內部轉發
    //    path: /push/<serverId>   body: { metrics } JSON
    if (method === 'POST' && (path.startsWith('/push/') || path.includes('/push/'))) {
      const parts = path.split('/push/');
      const serverId = decodeURIComponent((parts[1] || '').split('/')[0] || '');
      if (!serverId) {
        return new Response(JSON.stringify({ error: 'missing serverId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let payload = null;
      try {
        payload = await request.json();
      } catch (_) {
        return new Response(JSON.stringify({ error: 'invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this._broadcast(serverId, payload);
      return new Response(JSON.stringify({ ok: true, subscribers: this.sessions.size }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3) 健康檢查
    if (method === 'GET' && (path === '/health' || path.endsWith('/health'))) {
      return new Response(JSON.stringify({ ok: true, subscribers: this.sessions.size }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
}

export default MetricsBroadcaster;
