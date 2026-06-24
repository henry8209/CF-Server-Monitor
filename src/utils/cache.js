/**
 * 快取管理模組
 * 集中管理所有記憶體快取，包括：
 * - 伺服器列表快取
 * - 伺服器詳情快取（統一替代 SELECT 1/id/*）
 * - 最新指標快取
 * - 歷史指標快取
 * - 站點設定快取
 */

import { clearSiteSettingsCache } from './settings.js';

const SERVERS_LIST_TTL = 60 * 1000;
let serversListCache = null;

const SERVER_DETAIL_TTL = 5 * 60 * 1000;
const serverDetailCache = new Map();

const LATEST_ALL_TTL = 30 * 1000;
let latestAllCache = null;
let latestAllCacheTime = 0;

const metricsHistoryCache = new Map();

export function getCacheDuration(hours) {
  if (hours >= 120) {
    return 10 * 60 * 1000;
  } else if (hours >= 60) {
    return 5 * 60 * 1000;
  } else if (hours >= 30) {
    return 3 * 60 * 1000;
  } else {
    return 1 * 60 * 1000;
  }
}

export async function getAllServers(db, includeHidden = true) {
  const cacheKey = includeHidden ? 'all' : 'visible';
  const now = Date.now();
  
  if (serversListCache && serversListCache.cacheKey === cacheKey && now - serversListCache.time < SERVERS_LIST_TTL) {
    return serversListCache.data;
  }

  try {
    let query = 'SELECT * FROM servers ORDER BY sort_order ASC';
    if (!includeHidden) {
      query = "SELECT * FROM servers WHERE (is_hidden != '1' AND is_hidden != 1) ORDER BY sort_order ASC";
    }
    const { results } = await db.prepare(query).all();
    serversListCache = { data: results, time: now, cacheKey };
    return results;
  } catch (e) {
    console.error('獲取伺服器列表失敗:', e);
    return serversListCache && serversListCache.cacheKey === cacheKey ? serversListCache.data : [];
  }
}

export function clearServersListCache() {
  serversListCache = null;
}

/**
 * 獲取單個伺服器詳情（帶快取）
 * @param {object} db - 資料庫例項
 * @param {string} id - 伺服器 ID
 * @param {boolean} [includeHidden=false] - 是否包含隱藏伺服器
 * @returns {object|null} 伺服器物件，不存在返回 null
 */
export async function getServerDetail(db, id, includeHidden = false) {
  const now = Date.now();
  const cached = serverDetailCache.get(id);

  if (cached && now - cached.timestamp < SERVER_DETAIL_TTL) {
    const server = cached.data;
    if (!includeHidden && (server.is_hidden === '1' || server.is_hidden === 1)) {
      return null;
    }
    return server;
  }

  let query = 'SELECT * FROM servers WHERE id = ?';
  if (!includeHidden) {
    query += " AND (is_hidden != '1' AND is_hidden != 1)";
  }

  const server = await db.prepare(query).bind(id).first();

  if (server) {
    serverDetailCache.set(id, { data: server, timestamp: now });
  }

  return server;
}

/**
 * 檢查伺服器是否存在（複用伺服器詳情快取）
 * @param {object} db - 資料庫例項
 * @param {string} id - 伺服器 ID
 * @returns {boolean} 伺服器是否存在
 */
export async function checkServerExists(db, id) {
  const server = await getServerDetail(db, id, true);
  return !!server;
}

/**
 * 清除單個伺服器的詳情快取
 * @param {string} id - 伺服器 ID
 */
export function clearServerDetailCache(id) {
  serverDetailCache.delete(id);
}

/**
 * 獲取最新指標快取資訊
 * @returns {object} 包含 cache、time、ttl 欄位的物件
 */
export function getLatestMetricsCache() {
  return { cache: latestAllCache, time: latestAllCacheTime, ttl: LATEST_ALL_TTL };
}

export function setLatestMetricsCache(data) {
  latestAllCache = data;
  latestAllCacheTime = Date.now();
}

export function clearLatestMetricsCache() {
  latestAllCache = null;
  latestAllCacheTime = 0;
}

function getCacheKey(serverId, hours, columns) {
  const sortedColumns = columns.split(',').sort().join(',');
  return `${serverId}:${hours}:${sortedColumns}`;
}

export function getMetricsHistoryCache(serverId, hours, columns) {
  const key = getCacheKey(serverId, hours, columns);
  return metricsHistoryCache.get(key);
}

export function setMetricsHistoryCache(serverId, hours, columns, data) {
  const key = getCacheKey(serverId, hours, columns);
  metricsHistoryCache.set(key, { data, timestamp: Date.now() });
}

export function clearMetricsHistoryCache(serverId) {
  for (const key of metricsHistoryCache.keys()) {
    if (key.startsWith(`${serverId}:`)) {
      metricsHistoryCache.delete(key);
    }
  }
}

export function clearAllCaches() {
  clearServersListCache();
  serverDetailCache.clear();
  clearLatestMetricsCache();
  metricsHistoryCache.clear();
  clearSiteSettingsCache();
}
