import { saveMetricsHistory } from '../database/schema.js';
import { checkServerExists } from '../utils/cache.js';
import { mergeMetricsIntoServer } from '../utils/metrics.js';
import { createErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '../utils/errors.js';

// 將最新一次上報打包成前端可直接消費的 "當前狀態" 物件
// 與 /api/server 和 /api/servers 返回的欄位保持一致，便於頁面直接合並
function buildPayloadForBroadcast(id, metrics, extra = {}) {
  const payload = {};
  mergeMetricsIntoServer(payload, metrics);
  payload.id = id;
  payload.region = extra.region || '';
  payload.last_updated = metrics.timestamp || Date.now();
  payload.timestamp = payload.last_updated;
  return payload;
}

// 內部輔助：向 Durable Object 傳送廣播
async function broadcastToDO(env, serverId, payload) {
  if (!env || !env.METRICS_BROADCASTER) return false;
  try {
    const id = env.METRICS_BROADCASTER.idFromName('global');
    const stub = env.METRICS_BROADCASTER.get(id);
    // 內部呼叫，不需要鑑權；即使失敗也不影響 /update 返回
    await stub.fetch(`http://internal/push/${encodeURIComponent(serverId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (e) {
    // 廣播失敗不應該讓客戶端收到錯誤
    console.warn('[broadcast] DO push failed:', e.message || e);
    return false;
  }
}

export async function handleUpdate(request, env, ctx) {
  try {
    const data = await request.json();
    const { id, secret, metrics } = data;

    if (secret !== env.API_SECRET) {
      return createUnauthorizedResponse('Invalid secret');
    }

    let regionCode = request.cf?.country || request.headers?.get('cf-ipcountry') || '';

    const serverExists = await checkServerExists(env.DB, id);

    if (!serverExists) {
      return createNotFoundResponse('Server not found');
    }

    await saveMetricsHistory(env.DB, id, metrics, regionCode);

    const payload = buildPayloadForBroadcast(id, metrics || {}, { region: regionCode });
    ctx.waitUntil(broadcastToDO(env, id, payload));

    return new Response('OK', { status: 200 });
  } catch (e) {
    return createErrorResponse(e);
  }
}

// 暴露給 index.js 路由使用的 WebSocket 接入函式
export async function handleWebSocketUpgrade(request, env) {
  if (!env || !env.METRICS_BROADCASTER) {
    return new Response(JSON.stringify({ error: 'WebSocket not enabled', code: 503 }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const qs = url.search || '';
  try {
    const id = env.METRICS_BROADCASTER.idFromName('global');
    const stub = env.METRICS_BROADCASTER.get(id);
    // 使用原始 request 構造新的內部請求，保留 WebSocket 升級語義
    return await stub.fetch(new Request(`http://internal/ws${qs}`, request));
  } catch (e) {
    console.error('[ws] DO upgrade failed:', e);
    return new Response(JSON.stringify({ error: 'WebSocket error', code: 500 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
