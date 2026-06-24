# 本地測試工具

本目錄包含用於本地測試聚合功能的完整工具，可以無需部署到 Cloudflare 就驗證效果。

## 快速開始

### 方式一：使用 Wrangler 本地模式（推薦）

這是最真實的測試方式，體驗與生產環境完全一致。

1. **生成模擬資料 SQL**
   ```bash
   # 在專案根目錄
   node test/generate-sql.js
   ```

2. **初始化資料庫結構**
   （如果資料庫是空的，先啟動一次 dev 來自動建立表）
   ```bash
   # 在專案根目錄
   npm run dev
   # 訪問一次 http://localhost:8787 會自動初始化表結構
   # 然後按 Ctrl+C 停止
   ```

3. **匯入模擬資料**
   ```bash
   # 執行 SQL 匯入資料
   wrangler d1 execute server-monitor-db --file=test/mock-data.sql
   ```

4. **啟動本地開發伺服器**
   ```bash
   npm run dev
   ```

5. **訪問介面**
   - 首頁儀表盤: http://localhost:8787
   - 伺服器詳情頁: http://localhost:8787/?id=s550e8400-e29b-41d4-a716-446655440001
   - 後臺管理: http://localhost:8787/admin

## 模擬資料說明

### 伺服器配置

- **US-East-Fast** (`s550e8400-e29b-41d4-a716-446655440001`)
  - 位置: 美國東部
  - 上報間隔: 60 秒
  - 配置: 4 核 / 32G RAM

- **JP-Tokyo-Stable** (`550e8400-e29b-41d4-a716-446655440002`)
  - 位置: 日本東京
  - 上報間隔: 120 秒
  - 配置: 2 核 / 16G RAM

### 資料特點

- 72 小時完整歷史資料
- 指標帶有真實波動（白天負載高、晚上負載低）
- 包含完整的 CPU、RAM、網路、Ping 等指標
- 聚合表保持空，方便測試聚合邏輯

## 檔案說明

- `generate-sql.js` - 生成 SQL 格式模擬資料的指令碼
- `mock-data.sql` - 生成後的 SQL 檔案（執行指令碼後產生）
- `README.md` - 本文件

## 測試流程建議

1. **測試儀表盤顯示** - 訪問 http://localhost:8787 檢視是否正常顯示兩臺伺服器
2. **測試歷史圖表** - 點選伺服器檢視詳情頁，驗證歷史資料展示