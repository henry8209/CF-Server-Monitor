export async function updateDatabase(db) {
  console.log('開始執行資料庫更新...');
  const results = [];
  
  try {
    const migrateLoad = await migrateLoadToLoadAvg(db);
    results.push({ name: 'metrics_history load -> load_avg 遷移', ...migrateLoad });
    
    const serversCols = await addServerColumns(db);
    results.push({ name: 'servers 表列更新', ...serversCols });
    
    const cleanupServers = await cleanupServerExtraColumns(db);
    results.push({ name: 'servers 表多餘欄位清理', ...cleanupServers });
    
    const historyCols = await addHistoryColumns(db);
    results.push({ name: 'metrics_history 表列更新', ...historyCols });

    // 無需清理metrics_history多餘欄位，消耗過大，不影響使用，每月執行monthlyCleanup的時候會自動清理

    const historyRowid = await optimizeMetricsHistoryRowid(db);
    results.push({ name: 'metrics_history 寫入最佳化', ...historyRowid });
    
    const staleCleanup = await cleanupStaleSettings(db);
    results.push({ name: '廢棄 settings key 清理', ...staleCleanup });
    
    const dropAggregated = await dropMetricsAggregatedTable(db);
    results.push({ name: '刪除棄用的 metrics_aggregated 表', ...dropAggregated });
    
    console.log('✅ 資料庫更新完成');
    
    return {
      success: true,
      message: 'databaseUpgradeSuccess',
      results
    };
  } catch (e) {
    console.error('❌ 資料庫更新失敗:', e);
    return {
      success: false,
      message: 'databaseUpgradeFailed',
      error: e.message,
      results
    };
  }
}

async function migrateLoadToLoadAvg(db) {
  try {
    const { results: columns } = await db.prepare(`PRAGMA table_info(metrics_history)`).all();
    const existingCols = columns.map(c => c.name);
    
    if (!existingCols.includes('load')) {
      return { success: true, migrated: 0, message: '無需遷移（沒有舊的 load 欄位）' };
    }
    
    let migrated = 0;
    
    if (!existingCols.includes('load_avg')) {
      await db.prepare(`ALTER TABLE metrics_history ADD COLUMN load_avg TEXT DEFAULT '0'`).run();
    }
    
    const { meta: updateResult } = await db.prepare(
      `UPDATE metrics_history SET load_avg = load WHERE load IS NOT NULL AND load_avg = '0'`
    ).run();
    migrated = updateResult.changes;
    
    await db.prepare(`ALTER TABLE metrics_history DROP COLUMN load`).run();
    console.log(`✅ 已遷移 ${migrated} 條記錄的 load -> load_avg`);
    
    return { success: true, migrated, message: `已遷移 ${migrated} 條記錄並刪除舊欄位` };
  } catch (e) {
    console.error('遷移 load -> load_avg 失敗:', e);
    return { success: false, error: e.message };
  }
}

async function addServerColumns(db) {
  try {
    const { results: columns } = await db.prepare(`PRAGMA table_info(servers)`).all();
    const existingCols = columns.map(c => c.name);
    
    const newCols = {
      is_hidden: "TEXT DEFAULT '0'",
      sort_order: "INTEGER DEFAULT 0",
      reset_day: "INTEGER DEFAULT 1",
      report_interval: "INTEGER DEFAULT 60",
      ping_mode: "TEXT DEFAULT 'http'",
      traffic_calc_type: "TEXT DEFAULT 'total'"
    };
    
    let added = 0;
    for (const [colName, colDef] of Object.entries(newCols)) {
      if (!existingCols.includes(colName)) {
        await db.prepare(`ALTER TABLE servers ADD COLUMN ${colName} ${colDef}`).run();
        added++;
      }
    }
    
    return { success: true, added };
  } catch (e) {
    console.error('新增 servers 表列失敗:', e);
    return { success: false, error: e.message };
  }
}

async function cleanupServerExtraColumns(db) {
  try {
    const { results: columns } = await db.prepare(`PRAGMA table_info(servers)`).all();
    const existingCols = columns.map(c => c.name);
    
    const extraCols = ['cpu', 'ram', 'disk', 'load_avg', 'uptime', 'last_updated', 'ram_total', 'net_rx', 'net_tx', 'net_in_speed', 'net_out_speed', 'os', 'cpu_info', 'cpu_cores' , 'arch' ,'boot_time', 'ram_used', 'swap_total', 'swap_used', 'disk_total', 'disk_used', 'processes', 'tcp_conn', 'udp_conn', 'country', 'ip_v4', 'ip_v6', 'ping_ct', 'ping_cu', 'ping_cm', 'ping_bd', 'monthly_rx', 'monthly_tx', 'last_rx', 'last_tx', 'reset_month'];
    const colsToDrop = extraCols.filter(col => existingCols.includes(col));
    
    if (colsToDrop.length === 0) {
      return { success: true, cleaned: 0, message: '無需清理（沒有多餘欄位）' };
    }
    
    for (const col of colsToDrop) {
      await db.prepare(`ALTER TABLE servers DROP COLUMN ${col}`).run();
      console.log(`✅ 已刪除 servers 表的 ${col} 欄位`);
    }
    
    return { success: true, cleaned: colsToDrop.length, message: `已刪除 ${colsToDrop.join(', ')} 欄位` };
  } catch (e) {
    console.error('清理 servers 表多餘欄位失敗:', e);
    return { success: false, error: e.message };
  }
}

export async function addHistoryColumns(db) {
  try {
    const { results: historyColumns } = await db.prepare(`PRAGMA table_info(metrics_history)`).all();
    const existingHistoryCols = historyColumns.map(c => c.name);
    
    const newHistoryCols = {
      cpu_cores: "INTEGER DEFAULT 0",
      cpu_info: "TEXT DEFAULT ''",
      gpu: "REAL DEFAULT NULL",
      gpu_info: "TEXT DEFAULT ''",
      arch: "TEXT DEFAULT ''",
      os: "TEXT DEFAULT ''",
      region: "TEXT DEFAULT ''",
      ip_v4: "TEXT DEFAULT '0'",
      ip_v6: "TEXT DEFAULT '0'",
      boot_time: "TEXT DEFAULT ''",
      net_rx_monthly: "REAL DEFAULT 0",
      net_tx_monthly: "REAL DEFAULT 0",
      loss_ct: "INTEGER DEFAULT NULL",
      loss_cu: "INTEGER DEFAULT NULL",
      loss_cm: "INTEGER DEFAULT NULL",
      loss_bd: "INTEGER DEFAULT NULL"
    };
    
    let added = 0;
    for (const [colName, colDef] of Object.entries(newHistoryCols)) {
      if (!existingHistoryCols.includes(colName)) {
        await db.prepare(`ALTER TABLE metrics_history ADD COLUMN ${colName} ${colDef}`).run();
        added++;
      }
    }
    
    return { success: true, added };
  } catch (e) {
    console.error('新增 metrics_history 表列失敗:', e);
    return { success: false, error: e.message };
  }
}

async function optimizeMetricsHistoryRowid(db) {
  try {
    const table = await db.prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'metrics_history'`
    ).first();

    if (!table || !table.sql) {
      return { success: true, optimized: 0, message: 'metrics_history 表不存在' };
    }

    if (!/AUTOINCREMENT/i.test(table.sql)) {
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_history_server_time
        ON metrics_history(server_id, timestamp)
      `).run();
      return { success: true, optimized: 0, message: '已是最佳化結構' };
    }

    const oldTable = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'metrics_history_old'`
    ).first();
    if (oldTable) {
      return { success: false, error: '檢測到上次遷移遺留的 metrics_history_old，請先人工確認後處理' };
    }

    await db.prepare(`DROP INDEX IF EXISTS idx_history_server_time`).run();
    await db.prepare(`DROP TABLE IF EXISTS metrics_history_new`).run();
    await db.prepare(`
      CREATE TABLE metrics_history_new (
        id INTEGER PRIMARY KEY,
        server_id TEXT NOT NULL,
        timestamp INTEGER DEFAULT 0,
        cpu REAL DEFAULT 0,
        load_avg TEXT DEFAULT '0',
        net_in_speed REAL DEFAULT 0,
        net_out_speed REAL DEFAULT 0,
        net_rx REAL DEFAULT 0,
        net_tx REAL DEFAULT 0,
        processes INTEGER DEFAULT 0,
        tcp_conn INTEGER DEFAULT 0,
        udp_conn INTEGER DEFAULT 0,
        ping_ct INTEGER DEFAULT 0,
        ping_cu INTEGER DEFAULT 0,
        ping_cm INTEGER DEFAULT 0,
        ping_bd INTEGER DEFAULT 0,
        loss_ct INTEGER DEFAULT NULL,
        loss_cu INTEGER DEFAULT NULL,
        loss_cm INTEGER DEFAULT NULL,
        loss_bd INTEGER DEFAULT NULL,
        ram_total REAL DEFAULT 0,
        ram_used REAL DEFAULT 0,
        swap_total REAL DEFAULT 0,
        swap_used REAL DEFAULT 0,
        disk_total REAL DEFAULT 0,
        disk_used REAL DEFAULT 0,
        cpu_cores INTEGER DEFAULT 0,
        cpu_info TEXT DEFAULT '',
        gpu REAL DEFAULT NULL,
        gpu_info TEXT DEFAULT '',
        arch TEXT DEFAULT '',
        os TEXT DEFAULT '',
        region TEXT DEFAULT '',
        ip_v4 TEXT DEFAULT '0',
        ip_v6 TEXT DEFAULT '0',
        boot_time TEXT DEFAULT '',
        net_rx_monthly REAL DEFAULT 0,
        net_tx_monthly REAL DEFAULT 0,
        FOREIGN KEY (server_id) REFERENCES servers(id)
      )
    `).run();

    const { results: historyColumns } = await db.prepare(`PRAGMA table_info(metrics_history)`).all();
    const existingHistoryCols = new Set(historyColumns.map(c => c.name));
    const historySelectExpr = (colName, fallback) => (
      existingHistoryCols.has(colName) ? `COALESCE(${colName}, ${fallback})` : fallback
    );

    await db.prepare(`
      INSERT INTO metrics_history_new (
        id, server_id, timestamp, cpu, load_avg,
        net_in_speed, net_out_speed, net_rx, net_tx,
        processes, tcp_conn, udp_conn,
        ping_ct, ping_cu, ping_cm, ping_bd,
        loss_ct, loss_cu, loss_cm, loss_bd,
        ram_total, ram_used, swap_total, swap_used,
        disk_total, disk_used,
        cpu_cores, cpu_info, gpu, gpu_info, arch, os, region, ip_v4, ip_v6, boot_time,
      net_rx_monthly, net_tx_monthly
    )
    SELECT
      id, server_id, timestamp, cpu, load_avg,
      net_in_speed, net_out_speed, net_rx, net_tx,
      processes, tcp_conn, udp_conn,
      ping_ct, ping_cu, ping_cm, ping_bd,
      ${historySelectExpr('loss_ct', 'NULL')}, ${historySelectExpr('loss_cu', 'NULL')}, ${historySelectExpr('loss_cm', 'NULL')}, ${historySelectExpr('loss_bd', 'NULL')},
      ram_total, ram_used, swap_total, swap_used,
      disk_total, disk_used,
      cpu_cores, cpu_info, ${historySelectExpr('gpu', 'NULL')}, ${historySelectExpr('gpu_info', "''")}, arch, os, ${historySelectExpr('region', "''")}, ip_v4, ip_v6, boot_time,
        ${historySelectExpr('net_rx_monthly', '0')}, ${historySelectExpr('net_tx_monthly', '0')}
      FROM metrics_history
    `).run();

    await db.prepare(`ALTER TABLE metrics_history RENAME TO metrics_history_old`).run();
    await db.prepare(`ALTER TABLE metrics_history_new RENAME TO metrics_history`).run();
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_history_server_time
      ON metrics_history(server_id, timestamp)
    `).run();
    await db.prepare(`DROP TABLE metrics_history_old`).run();

    return { success: true, optimized: 1, message: '已移除 AUTOINCREMENT，降低上報寫入放大' };
  } catch (e) {
    console.error('最佳化 metrics_history 寫入結構失敗:', e);
    return { success: false, error: e.message };
  }
}

async function dropMetricsAggregatedTable(db) {
  console.log('開始刪除棄用的 metrics_aggregated 表...');
  try {
    const { results: tables } = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='metrics_aggregated'`
    ).all();
    
    if (tables.length === 0) {
      return { success: true, dropped: 0, message: '無需刪除（表不存在）' };
    }
    
    await db.prepare(`DROP TABLE metrics_aggregated`).run();
    console.log('✅ 已刪除 metrics_aggregated 表');
    return { success: true, dropped: 1, message: '已刪除 metrics_aggregated 表' };
  } catch (e) {
    console.error('刪除 metrics_aggregated 表失敗:', e);
    return { success: false, error: e.message };
  }
}

export async function cleanupStaleSettings(db) {
  console.log('開始清理廢棄的 settings key...');
  try {
    const stalePrefixes = ['last_write_%'];
    const staleExact = [
      'theme',
      'custom_css',
      'auto_reset_traffic',
      'last_aggregated_to_120',
      'last_aggregated_to_240',
      'last_aggregated_to_480',
      'last_aggregated_to_960',
      'last_aggregated_to_1920',
      'site_title',
      'admin_title',
      'custom_head',
      'custom_script',
      'custom_bg',
      'is_public',
      'show_price',
      'show_expire',
      'show_bw',
      'show_tf',
      'show_long_history',
      'tg_notify',
      'tg_bot_token',
      'tg_chat_id',
      'last_aggregated_to',
      'last_cleanup',
      'expire_reminder'
    ];
    const staleKeysWhere = stalePrefixes.map(() => `key LIKE ?`).concat(staleExact.map(() => `key = ?`)).join(' OR ');
    const staleBindings = [...stalePrefixes, ...staleExact];
    const { meta: cleanupResult } = await db.prepare(
      `DELETE FROM settings WHERE ${staleKeysWhere}`
    ).bind(...staleBindings).run();
    if (cleanupResult.changes > 0) {
      console.log(`已清理 ${cleanupResult.changes} 個廢棄的 settings key`);
    }
    return { success: true, cleaned: cleanupResult.changes };
  } catch (e) {
    console.error('清理廢棄 settings key 失敗:', e);
    return { success: false, error: e.message };
  }
}