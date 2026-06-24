#!/usr/bin/env node
// node --check test/api-check.js
// node test/api-check.js --help

const DEFAULT_BASE_URL = 'http://localhost:8787';
const MOCK_PUBLIC_SERVER_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_HIDDEN_SERVER_ID = '550e8400-e29b-41d4-a716-446655440002';

const args = new Set(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(getArgValue('--base-url') || process.env.BASE_URL || DEFAULT_BASE_URL);
const apiSecret = getArgValue('--api-secret') || process.env.API_SECRET || '123456';
const adminUsername = getArgValue('--admin-user') || process.env.ADMIN_USER || process.env.API_USER_NAME || 'admin';
const adminPassword = getArgValue('--admin-password') || process.env.ADMIN_PASSWORD || apiSecret || '123456';
const includeWrite = !args.has('--skip-write') && process.env.INCLUDE_WRITE !== 'false';
const timeoutMs = Number(getArgValue('--timeout') || process.env.TIMEOUT_MS || 10000);

const state = {
  token: '',
  cookieAuth: false,
  createdServerId: '',
  results: []
};

function getArgValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find(item => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function jsonBody(body) {
  return JSON.stringify(body ?? {});
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

function isExpectedStatus(status, expected) {
  if (Array.isArray(expected)) return expected.includes(status);
  return status === expected;
}

function expectedText(expected) {
  return Array.isArray(expected) ? expected.join('/') : String(expected);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: 'manual',
      ...options,
      headers: {
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text;
    }

    return {
      ok: true,
      status: response.status,
      headers: response.headers,
      data,
      text
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.name === 'AbortError' ? `請求超時：${timeoutMs}ms` : error.message
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runCase(testCase) {
  if (typeof testCase.skip === 'function') {
    const reason = testCase.skip();
    if (reason) {
      record('skip', testCase.name, '-', reason);
      return;
    }
  }

  const result = await testCase.run();
  const expected = testCase.expectedStatus;
  const pass = result.ok && isExpectedStatus(result.status, expected);

  if (pass) {
    record('pass', testCase.name, result.status, testCase.note || '');
  } else {
    const detail = result.ok
      ? `期望 ${expectedText(expected)}，實際 ${result.status}${result.text ? `，響應：${truncate(result.text)}` : ''}`
      : result.error;
    record('fail', testCase.name, result.status || '-', detail);
  }

  if (typeof testCase.after === 'function') {
    await testCase.after(result);
  }
}

function record(status, name, code, detail) {
  state.results.push({ status, name, code, detail });
  const label = status.toUpperCase().padEnd(4);
  const codeText = String(code).padEnd(3);
  console.log(`[${label}] ${codeText} ${name}${detail ? ` - ${detail}` : ''}`);
}

function truncate(text, max = 180) {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function printUsage() {
  console.log(`本地介面測試工具\n\n用法：\n  node test/api-check.js [選項]\n\n選項：\n  --base-url=http://localhost:8787       本地服務地址，預設 ${DEFAULT_BASE_URL}\n  --api-secret=xxx                       API_SECRET，用於登入和可選寫入測試\n  --admin-user=admin                     管理員使用者名稱，預設 admin\n  --admin-password=xxx                   管理員密碼，預設使用 API_SECRET\n  --server-id=uuid                       指定伺服器 ID\n  --timeout=10000                        單個請求超時時間\n\n環境變數同名可用：BASE_URL、API_SECRET、ADMIN_USER、ADMIN_PASSWORD、SERVER_ID、INCLUDE_WRITE、TIMEOUT_MS\n\n說明：\n  預設只執行安全或只讀檢查；重建資料庫、清理歷史、刪除伺服器等破壞性介面不會執行。\n  Cloudflare Turnstile 開啟時，只驗證未攜帶 token 會失敗，不嘗試繞過人機驗證。`);
}

async function bootstrap() {
  if (args.has('--help') || args.has('-h')) {
    printUsage();
    process.exit(0);
  }

  console.log(`介面測試目標：${baseUrl}`);
  console.log(`寫入測試：${includeWrite ? '開啟' : '關閉'}`);
  console.log('');

  // ============================================================
  // 定義測試用例
  // ============================================================

  // 未登入測試用例
  const unauthenticatedCases = [
    { name: 'GET /api/config', method: 'GET', path: '/api/config', expectedStatus: 200 },
    { name: 'GET /api/servers', method: 'GET', path: '/api/servers', expectedStatus: 200 },
    { name: 'GET /api/server 缺少 ID', method: 'GET', path: '/api/server', expectedStatus: 400 },
    { name: 'GET /api/history/all 缺少 ID', method: 'GET', path: '/api/history/all', expectedStatus: 400 },
    { name: 'GET /api/ws', method: 'GET', path: '/api/ws', expectedStatus: 426, note: 'WebSocket 僅做 HTTP 探測' },
    { name: 'POST /updateDatabase', method: 'POST', path: '/updateDatabase', expectedStatus: 401 },
    { name: 'POST /rebuild', method: 'POST', path: '/rebuild', expectedStatus: 401 },
    { name: 'GET /__do/health', method: 'GET', path: '/__do/health', expectedStatus: 200 },
    { name: 'POST /update 無效 secret', method: 'POST', path: '/update', expectedStatus: 401, body: { id: MOCK_PUBLIC_SERVER_ID, secret: '__invalid__', metrics: {} } },
    { name: 'POST /update 公開伺服器上報成功', method: 'POST', path: '/update', expectedStatus: 200, body: { id: MOCK_PUBLIC_SERVER_ID, secret: apiSecret, metrics: buildMockMetrics() } },
    { name: 'POST /update 隱藏伺服器上報成功', method: 'POST', path: '/update', expectedStatus: 200, body: { id: MOCK_HIDDEN_SERVER_ID, secret: apiSecret, metrics: buildMockMetrics() } },
    { name: 'GET /api/server 公開伺服器（未登入）', method: 'GET', path: `/api/server?id=${encodeURIComponent(MOCK_PUBLIC_SERVER_ID)}`, expectedStatus: 200 },
    { name: 'GET /api/server 隱藏伺服器（未登入）', method: 'GET', path: `/api/server?id=${encodeURIComponent(MOCK_HIDDEN_SERVER_ID)}`, expectedStatus: 404 },
    { name: 'GET 不存在路徑', method: 'GET', path: '/__api_check_not_found__', expectedStatus: 200, note: 'Worker 未命中 API 路由時會回退前端' }
  ];

  // 登入測試用例
  const loginCases = [
    { name: 'POST /admin/api login 缺少密碼', method: 'POST', path: '/admin/api', expectedStatus: 400, body: { action: 'login', username: adminUsername } },
    { name: 'POST /admin/api login 無效密碼', method: 'POST', path: '/admin/api', expectedStatus: 401, body: { action: 'login', username: adminUsername, password: '__invalid__' } },
    { name: 'POST /admin/api login 成功', method: 'POST', path: '/admin/api', expectedStatus: 200, body: { action: 'login', username: adminUsername, password: adminPassword } }
  ];

  // 已登入測試用例
  const authenticatedCases = [
    { name: 'GET /api/server 公開伺服器（已登入）', method: 'GET', path: `/api/server?id=${encodeURIComponent(MOCK_PUBLIC_SERVER_ID)}`, expectedStatus: 200 },
    { name: 'GET /api/server 隱藏伺服器（已登入）', method: 'GET', path: `/api/server?id=${encodeURIComponent(MOCK_HIDDEN_SERVER_ID)}`, expectedStatus: 200 },
    { name: 'GET /api/history/all 公開伺服器（已登入）', method: 'GET', path: `/api/history/all?id=${encodeURIComponent(MOCK_PUBLIC_SERVER_ID)}&hours=1`, expectedStatus: 200 },
    { name: 'GET /api/history/all 隱藏伺服器（已登入）', method: 'GET', path: `/api/history/all?id=${encodeURIComponent(MOCK_HIDDEN_SERVER_ID)}&hours=1`, expectedStatus: 200 }
  ];

  // 後臺管理測試用例
  const adminCases = [
    { name: 'POST /admin/api get_settings', method: 'POST', path: '/admin/api', expectedStatus: 200, body: { action: 'get_settings' } },
    { name: 'POST /admin/api list', method: 'POST', path: '/admin/api', expectedStatus: 200, body: { action: 'list' } },
    { name: 'POST /admin/api 未知 action', method: 'POST', path: '/admin/api', expectedStatus: 400, body: { action: '__unknown__' } },
    { name: 'POST /admin/api edit 引數校驗', method: 'POST', path: '/admin/api', expectedStatus: 400, body: { action: 'edit', id: 'invalid-id' } },
    { name: 'POST /admin/api delete 引數校驗', method: 'POST', path: '/admin/api', expectedStatus: 400, body: { action: 'delete', id: 'invalid-id' } },
    { name: 'POST /admin/api batch_delete 引數校驗', method: 'POST', path: '/admin/api', expectedStatus: 400, body: { action: 'batch_delete', ids: [] } },
    { name: 'POST /admin/api save_order 引數校驗', method: 'POST', path: '/admin/api', expectedStatus: 400, body: { action: 'save_order', orders: [] } },
    { name: 'POST /admin/api add 成功', method: 'POST', path: '/admin/api', expectedStatus: 200, body: { action: 'add', name: 'test-server-' + Date.now(), secret: 'test-secret-' + Date.now(), group_id: 0, location: 'Test Location', ip: '127.0.0.1', ssh_port: 22, ssh_user: 'root', ssh_password: '', note: 'API test server' }, write: true },
    { name: 'POST /admin/api delete 成功', method: 'POST', path: '/admin/api', expectedStatus: 200, body: () => ({ action: 'delete', id: state.createdServerId }), write: true, dependsOn: 'POST /admin/api add 成功' }
  ];

  // ============================================================
  // 執行測試
  // ============================================================

  console.log('\n━━━ [未登入] 測試 ━━━\n');

  for (const c of unauthenticatedCases) {
    await runCase({
      name: c.name,
      expectedStatus: c.expectedStatus,
      note: c.note,
      run: () => request(c.path, {
        method: c.method,
        headers: { 'Content-Type': 'application/json' },
        body: c.body ? jsonBody(c.body) : undefined
      }),
      after: c.name === 'GET /api/config' ? async result => {
        const data = result.data && result.data.data ? result.data.data : result.data;
        state.cookieAuth = data && data.verified === true;
      } : undefined
    });
  }

  console.log('\n━━━ [登入流程] ━━━\n');

  for (const c of loginCases) {
    await runCase({
      name: c.name,
      expectedStatus: c.expectedStatus,
      run: () => request(c.path, {
        method: c.method,
        headers: { 'Content-Type': 'application/json' },
        body: c.body ? jsonBody(c.body) : undefined
      }),
      after: c.name === 'POST /admin/api login 成功' ? async result => {
        if (result.status === 200 && result.data && result.data.token) {
          state.token = result.data.token;
        }
      } : undefined
    });
  }

  if (!state.token) {
    record('skip', '已登入介面測試', '-', '未登入成功，跳過需要 Bearer Token 的介面');
  } else {
    console.log('\n━━━ [已登入] 測試 ━━━\n');

    const headers = { 'Content-Type': 'application/json', ...authHeaders() };

    for (const c of authenticatedCases) {
      await runCase({
        name: c.name,
        expectedStatus: c.expectedStatus,
        run: () => request(c.path, { method: c.method, headers })
      });
    }

    console.log('\n━━━ [後臺管理] 測試 ━━━\n');

    for (const c of adminCases) {
      if (c.write && !includeWrite) {
        record('skip', c.name, '-', '寫入測試已關閉');
        continue;
      }
      if (c.dependsOn && !state.createdServerId) {
        record('skip', c.name, '-', '依賴於 ' + c.dependsOn + '，但該測試未成功');
        continue;
      }
      const body = typeof c.body === 'function' ? c.body() : c.body;
      await runCase({
        name: c.name,
        expectedStatus: c.expectedStatus,
        run: () => request(c.path, {
          method: c.method,
          headers,
          body: body ? jsonBody(body) : undefined
        }),
        after: c.name === 'POST /admin/api add 成功' ? async result => {
          if (result.status === 200 && result.data && result.data.id) {
            state.createdServerId = result.data.id;
            console.log('add 成功，伺服器 ID:', state.createdServerId);
          }
        } : undefined
      });
    }
  }

  printSummary();
}

function buildMockMetrics() {
  return {
    cpu: 12.3,
    ram: 45.6,
    disk: 37.8,
    load_avg: '0.12 0.20 0.18',
    net_in_speed: 1024,
    net_out_speed: 2048,
    net_rx: 123456789,
    net_tx: 987654321,
    processes: 128,
    tcp_conn: 32,
    udp_conn: 8,
    ping_ct: 30,
    ping_cu: 40,
    ping_cm: 50,
    ping_bd: 60,
    ram_total: 8192,
    ram_used: 3735,
    swap_total: 1024,
    swap_used: 64,
    disk_total: 102400,
    disk_used: 38707,
    cpu_cores: 2,
    cpu_info: 'Local API Check CPU',
    arch: process.arch,
    os: process.platform,
    ip_v4: '127.0.0.1',
    ip_v6: '::1',
    boot_time: new Date(Date.now() - 3600000).toISOString()
  };
}

function printSummary() {
  const counts = state.results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  console.log('');
  console.log(`彙總：通過 ${counts.pass || 0}，失敗 ${counts.fail || 0}，跳過 ${counts.skip || 0}`);

  if (counts.fail > 0) {
    process.exitCode = 1;
  }
}

bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
