# CF-Server-Monitor 後端 API 文件

> 面向 CF-Server-Monitor 後端（Cloudflare Workers + D1 + Durable Objects）的完整 REST / WebSocket API 參考。
> 本文件覆蓋所有公開端點、內部端點、鑑權機制、錯誤碼、資料結構與 WebSocket 即時推送協議。
>
> **Base URL**：`https://<your-worker-domain>`（部署後由 Cloudflare Workers 提供）
>
> **統一響應頭**：
>
> - `Content-Type: application/json; charset=utf-8`（除特別說明外）
> - CORS：當 `CORS_ALLOWED_ORIGINS` 環境變數配置了允許的源時，會附帶 `Access-Control-Allow-Origin / Allow-Credentials / Vary: Origin`。
> - `X-Cache: HIT | MISS`：僅出現在 `/api/history/all` 響應中。

***

## 目錄

- [0. 通用規範](#0-通用規範)
  - [0.1 鑑權機制](#01-鑑權機制)
  - [0.2 Turnstile 人機驗證](#02-turnstile-人機驗證)
  - [0.3 統一響應格式](#03-統一響應格式)
  - [0.4 統一錯誤碼](#04-統一錯誤碼)
  - [0.5 限流與配額](#05-限流與配額)
  - [0.6 CORS](#06-cors)
- [1. 探針上報介面](#1-探針上報介面)
  - [1.1](#11-post-update---指標上報agent-入口) [`POST /update`](#11-post-update---指標上報agent-入口) [- 指標上報（Agent 入口）](#11-post-update---指標上報agent-入口)
- [2. 公開 API（前端/管理端共用）](#2-公開-api前端管理端共用)
  - [2.1](#21-get-apiconfig---獲取站點配置) [`GET /api/config`](#21-get-apiconfig---獲取站點配置) [- 獲取站點配置](#21-get-apiconfig---獲取站點配置)
  - [2.2](#22-get-apiservers---獲取伺服器列表首頁) [`GET /api/servers`](#22-get-apiservers---獲取伺服器列表首頁) [- 獲取伺服器列表（首頁）](#22-get-apiservers---獲取伺服器列表首頁)
  - [2.3](#23-get-apiserver---獲取單臺伺服器詳情) [`GET /api/server`](#23-get-apiserver---獲取單臺伺服器詳情) [- 獲取單臺伺服器詳情](#23-get-apiserver---獲取單臺伺服器詳情)
  - [2.4](#24-get-apihistoryall---獲取歷史指標) [`GET /api/history/all`](#24-get-apihistoryall---獲取歷史指標) [- 獲取歷史指標](#24-get-apihistoryall---獲取歷史指標)
  - [2.5](#25-get-apiws---websocket-即時推送) [`GET /api/ws`](#25-get-apiws---websocket-即時推送) [- WebSocket 即時推送](#25-get-apiws---websocket-即時推送)
- [3. 管理端 API（鑑權）](#3-管理端-api鑑權)
  - [3.1](#31-post-adminapi---管理操作入口) [`POST /admin/api`](#31-post-adminapi---管理操作入口) [- 管理操作入口](#31-post-adminapi---管理操作入口)
  - [3.2](#32-action-login---登入) [`action: login`](#32-action-login---登入) [- 登入](#32-action-login---登入)
  - [3.3](#33-action-get_settings---讀取全部設定) [`action: get_settings`](#33-action-get_settings---讀取全部設定) [- 讀取全部設定](#33-action-get_settings---讀取全部設定)
  - [3.4](#34-action-list---列出全部伺服器含線上統計) [`action: list`](#34-action-list---列出全部伺服器含線上統計) [- 列出全部伺服器（含線上/統計）](#34-action-list---列出全部伺服器含線上統計)
  - [3.5](#35-action-d1_usage---d1--workers-用量) [`action: d1_usage`](#35-action-d1_usage---d1--workers-用量) [- D1 / Workers 用量](#35-action-d1_usage---d1--workers-用量)
  - [3.6](#36-action-save_settings---儲存設定) [`action: save_settings`](#36-action-save_settings---儲存設定) [- 儲存設定](#36-action-save_settings---儲存設定)
  - [3.7](#37-action-add---新增伺服器) [`action: add`](#37-action-add---新增伺服器) [- 新增伺服器](#37-action-add---新增伺服器)
  - [3.8](#38-action-edit---修改伺服器資訊) [`action: edit`](#38-action-edit---修改伺服器資訊) [- 修改伺服器資訊](#38-action-edit---修改伺服器資訊)
  - [3.9](#39-action-delete---刪除伺服器) [`action: delete`](#39-action-delete---刪除伺服器) [- 刪除伺服器](#39-action-delete---刪除伺服器)
  - [3.10](#310-action-batch_delete---批次刪除) [`action: batch_delete`](#310-action-batch_delete---批次刪除) [- 批次刪除](#310-action-batch_delete---批次刪除)
  - [3.11](#311-action-save_order---儲存伺服器排序) [`action: save_order`](#311-action-save_order---儲存伺服器排序) [- 儲存伺服器排序](#311-action-save_order---儲存伺服器排序)
- [4. 系統維護端點](#4-系統維護端點)
  - [4.1](#41-post-updatedatabase---資料庫遷移) [`POST /updateDatabase`](#41-post-updatedatabase---資料庫遷移) [- 資料庫遷移](#41-post-updatedatabase---資料庫遷移)
  - [4.2](#42-post-rebuild---資料庫重建) [`POST /rebuild`](#42-post-rebuild---資料庫重建) [- 資料庫重建](#42-post-rebuild---資料庫重建)
  - [4.3](#43-get-__dohealth---durable-object-健康檢查) [`GET /__do/health`](#43-get-__dohealth---durable-object-健康檢查) [- Durable Object 健康檢查](#43-get-__dohealth---durable-object-健康檢查)
- [5. 資料結構](#5-資料結構)
  - [5.1 Server 物件](#51-server-物件)
  - [5.2 Metrics 物件（探針上報 payload）](#52-metrics-物件探針上報-payload)
  - [5.3 History Row 物件](#53-history-row-物件)
  - [5.4 Settings 物件](#54-settings-物件)
  - [5.5 WebSocket 訊息](#55-websocket-訊息)
- [6. 定時任務 (Cron)](#6-定時任務-cron)
- [7. 錯誤碼速查表](#7-錯誤碼速查表)
- [8. 完整 cURL 示例](#8-完整-curl-示例)
- [9. 版本與變更說明](#9-版本與變更說明)

***

## 0. 通用規範

### 0.1 鑑權機制

專案使用 **三套並行的鑑權機制**，按介面範圍區分使用。

#### A. 探針 Secret（Agent → Worker）

- **使用位置**：`POST /update`
- **方式**：請求體欄位 `secret`
- **值**：必須等於 Worker 環境變數 `API_SECRET`
- **失敗返回**：`401 { "error": "Invalid secret", "code": 401 }`

#### B. Basic Auth（管理登入 → JWT）

- **使用位置**：`POST /admin/api` 的 `action: login`
- **方式**：請求體欄位 `username` / `password`（後端內部組裝 `Basic base64(user:pass)` 進行校驗）
- **校驗順序**：
  1. 若 `site_options.password` 已設定 → 與其 MD5 比對
  2. 否則 → 與 `API_SECRET` 直接比對
  3. 使用者名稱：若 `site_options.username` 已設定則用之，否則使用 `API_USER_NAME` 環境變數，最終回退為 `admin`
- **失敗返回**：`401 { "error": "Invalid username or password", "code": 401 }`

#### C. JWT Bearer（管理操作 → 後續管理請求）

- **使用位置**：所有非 `login` 的 `POST /admin/api`、`POST /updateDatabase`、`POST /rebuild`
- **方式**：`Authorization: Bearer <token>` Header
- **Token 簽發**：`HS256` JWT，預設有效期 **604800 秒（7 天）**
- **簽名金鑰**（優先順序）：
  1. `site_options.jwt_secret`（長度 ≥ 32）
  2. `API_SECRET`（不夠 32 字元時 `padEnd` 補 `'x'` 後取前 64 位）
  3. 回退常量：`'default_jwt_secret_for_server_monitor'`
- **Payload 欄位**：
  ```json
  { "sub": "admin", "iat": <unix>, "exp": <unix + 604800> }
  ```
- **失敗返回**：`401 { "error": "Unauthorized", "code": 401 }`

> **快取提示**：管理端登入成功後，前端應將 `token` 存於 `localStorage`，並對所有非登入的 `admin/api` 請求自動加上 `Authorization: Bearer <token>` Header。

### 0.2 Turnstile 人機驗證

當 `site_options.turnstile_enabled === 'true'` 時，**所有** **`/api/*`** **與** **`/admin/api`** **公共介面**（除了下方 bypass 列表）都需要先驗證 Cloudflare Turnstile Token。

**Bypass 列表**（無需 Turnstile）：

- `/admin/api`（`/admin/api` 走另一套 Turnstile：見 `action: login`）
- `/api/ws`（WebSocket 升級）
- `/api/config` 在 **不攜帶** `X-Turnstile-Token` 與 `X-Turnstile-Verified` 時（用於初始化判斷是否需要驗證）

**驗證流程**：

1. **首次訪問**：客戶端從 `/api/config` 拿到 `turnstile_site_key`。
2. **前端渲染** Turnstile 元件 → 拿到一次性 `token`。
3. **後續請求**在 Header 增加：
   ```
   X-Turnstile-Token: <token from cloudflare>
   ```
4. Worker 用 `site_options.turnstile_secret_key` 呼叫 `https://challenges.cloudflare.com/turnstile/v0/siteverify` 驗證。
5. **驗證成功後**，Worker 通過 `X-Turnstile-Verified` 這個 **加密 Header** 給客戶端發"已驗證憑證"（AES-GCM 加密、`API_SECRET`/`TURNSTILE_SECRET_KEY` 派生金鑰、有效期 **3600 秒**），後續可省略 `X-Turnstile-Token`。
6. 客戶端也可以把 `X-Turnstile-Verified` 再次帶回，Worker 會優先驗證該 Header（驗證有效期）。

**相關請求/響應 Header**：

| Header                 | 方向              | 含義                                                                                 |
| ---------------------- | --------------- | ---------------------------------------------------------------------------------- |
| `X-Turnstile-Token`    | Client → Server | 當次 Turnstile token（明文）                                                             |
| `X-Turnstile-Verified` | 雙向              | AES-GCM 加密的 `{ expires: <unix+3600>, verified: true, timestamp: <ms> }`，base64 字串 |

**失敗返回**：`403 { "error": "Turnstile verification failed", "code": 403 }`

### 0.3 統一響應格式

**成功響應**：

```json
{
  // 業務欄位，結構因介面而異
  "success": true,
  ...
}
```

> 注：專案裡"成功響應"是直接 `JSON.stringify` 業務物件，**沒有固定的** **`code`** **欄位**。HTTP 狀態碼始終為 `200`。

**成功響應特例**：

- `POST /update` → 純文本 `OK`（`Content-Type: text/plain`）
- WebSocket 升級 → `101 Switching Protocols`

**錯誤響應**：

```json
{
  "error": "human readable message",
  "code": 400
}
```

> `code` 欄位是 HTTP 狀態碼的映象，便於前端無需讀取 status 即可分流。

### 0.4 統一錯誤碼

| code | 含義                    | 常見場景                                               |
| ---- | --------------------- | -------------------------------------------------- |
| 400  | Bad Request           | 引數缺失/型別錯/UUID 不合法/未知 action                        |
| 401  | Unauthorized          | 缺/錯 token、賬號密碼錯、站點非公開且未登入                          |
| 403  | Forbidden             | Turnstile 驗證失敗                                     |
| 404  | Not Found             | 伺服器 ID 不存在                                         |
| 409  | Conflict              | `DATABASE_UPGRADE_REQUIRED`，需先呼叫 `/updateDatabase` |
| 500  | Internal Server Error | DB 異常等未捕獲錯誤                                        |
| 503  | Service Unavailable   | WebSocket 不可用（未繫結 DO）                              |

### 0.5 限流與配額

- Cloudflare Workers / D1 的硬性限額由 Cloudflare 平臺強制（**D1：500 萬行讀 / 10 萬行寫 / 日；Workers：10 萬次請求 / 日**）。
- `/admin/api?action=d1_usage` 可查詢當前賬戶當日用量與近 24h 用量。

### 0.6 CORS

環境變數 `CORS_ALLOWED_ORIGINS`，**逗號分隔**的源白名單，例如：

```
CORS_ALLOWED_ORIGINS=https://status.example.com,https://admin.example.com
```

- 當請求 `Origin` 命中白名單 → 響應帶 `Access-Control-Allow-Origin: <origin>`、`Access-Control-Allow-Credentials: true`、`Vary: Origin`。
- 預檢請求 `OPTIONS` → 直接返回 `204`，並回顯 `Access-Control-Request-Method` / `Access-Control-Request-Headers`，快取 86400 秒。
- 未配置或未命中 → 不會下發 CORS Header，瀏覽器側會被同源策略攔截。

***

## 1. 探針上報介面

### 1.1 `POST /update` - 指標上報（Agent 入口）

> **呼叫方**：伺服器側探針（[Bash install.sh](../public/install.sh) / [Windows cf-server-monitor.pyw](../public/cf-server-monitor.pyw)）。
> **鑑權**：`secret` 欄位 == `env.API_SECRET`
> **Turnstile**：不參與

**Request**

- Method：`POST`
- Path：`/update`
- Headers：
  ```
  Content-Type: application/json
  ```
- Body（JSON）：
  ```json
  {
    "id": "9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f",
    "secret": "<API_SECRET>",
    "metrics": {
      "cpu": "12.34",
      "ram_total": "8192",
      "ram_used": "3700",
      "swap_total": "2048",
      "swap_used": "100",
      "disk_total": "102400",
      "disk_used": "32000",
      "load_avg": "0.10 0.20 0.30",
      "boot_time": "1700000000000",
      "net_rx": "12345678",
      "net_tx": "87654321",
      "net_rx_monthly": "1073741824",
      "net_tx_monthly": "536870912",
      "net_in_speed": "1024",
      "net_out_speed": "512",
      "os": "Ubuntu 22.04",
      "arch": "x86_64",
      "cpu_info": "Intel(R) Xeon(R) CPU",
      "cpu_cores": "4",
      "gpu": 12.5,
      "gpu_info": "NVIDIA GeForce RTX 3060",
      "processes": "256",
      "tcp_conn": "32",
      "udp_conn": "4",
      "ip_v4": "1",
      "ip_v6": "1",
      "ping_ct": "23",
      "ping_cu": "25",
      "ping_cm": "30",
      "ping_bd": "40",
      "loss_ct": "0",
      "loss_cu": "0",
      "loss_cm": "0",
      "loss_bd": "0"
    }
  }
  ```

**欄位說明（metrics）**：

| 欄位               | 型別           | 單位  | 必填 | 說明                                          |
| ---------------- | ------------ | --- | -- | ------------------------------------------- |
| `cpu`            | string       | %   | 是  | CPU 佔用率，保留 2 位小數                            |
| `ram_total`      | string       | MB  | 是  | 記憶體總容量                                       |
| `ram_used`       | string       | MB  | 是  | 記憶體已用                                        |
| `swap_total`     | string       | MB  | 是  | Swap 總容量                                    |
| `swap_used`      | string       | MB  | 是  | Swap 已用                                     |
| `disk_total`     | string       | MB  | 是  | 磁碟總容量                                       |
| `disk_used`      | string       | MB  | 是  | 磁碟已用                                        |
| `load_avg`       | string       | -   | 是  | 三個浮點，空格分隔                                   |
| `boot_time`      | string       | 毫秒  | 是  | 系統啟動時間（Unix ms）                             |
| `net_rx`         | string       | 位元組  | 是  | 累計接收位元組                                      |
| `net_tx`         | string       | 位元組  | 是  | 累計傳送位元組                                      |
| `net_rx_monthly` | string       | 位元組  | 是  | 當月累計下行                                      |
| `net_tx_monthly` | string       | 位元組  | 是  | 當月累計上行                                      |
| `net_in_speed`   | string       | B/s | 是  | 即時下行速度                                      |
| `net_out_speed`  | string       | B/s | 是  | 即時上行速度                                      |
| `os`             | string       | -   | 是  | 作業系統                                        |
| `arch`           | string       | -   | 是  | 系統架構                                        |
| `cpu_info`       | string       | -   | 是  | CPU 型號                                      |
| `cpu_cores`      | string       | -   | 是  | 邏輯核心數                                       |
| `gpu`            | number\|null | %   | 否  | GPU 佔用（Linux 探針可從 nvidia-smi / rocm-smi 讀取） |
| `gpu_info`       | string\|null | -   | 否  | GPU 型號                                      |
| `processes`      | string       | -   | 是  | 程序數                                         |
| `tcp_conn`       | string       | -   | 是  | TCP 活躍連線數                                   |
| `udp_conn`       | string       | -   | 是  | UDP 套接字數                                    |
| `ip_v4`          | string       | -   | 是  | `1`/`0`，IPv4 可達性                            |
| `ip_v6`          | string       | -   | 是  | `1`/`0`，IPv6 可達性                            |
| `ping_ct`        | string       | ms  | 否  | CF 節點延時，**空字串表示未取到**                        |
| `ping_cu`        | string       | ms  | 否  | GO 節點延時                                      |
| `ping_cm`        | string       | ms  | 否  | OP 節點延時                                      |
| `ping_bd`        | string       | ms  | 否  | Q9 節點延時                                      |
| `loss_ct`        | string       | %   | 否  | CF 丟包率                                       |
| `loss_cu`        | string       | %   | 否  | GO 丟包率                                       |
| `loss_cm`        | string       | %   | 否  | OP 丟包率                                       |
| `loss_bd`        | string       | %   | 否  | Q9 丟包率                                       |

**Response**

- 成功 `200 OK`：
  ```
  OK
  ```
  （`Content-Type: text/plain`）
- 失敗：
  ```json
  { "error": "Invalid secret", "code": 401 }
  { "error": "Server not found", "code": 404 }
  ```

**副作用**

1. 插入一行到 `metrics_history`。
2. 觸發 Durable Object `MetricsBroadcaster` 內部廣播，WebSocket 訂閱者將立即收到 `{type:"update", serverId, ts, data}` 訊息。
3. 寫入 `request.cf.country`（或 `cf-ipcountry` Header）作為該條記錄的 `region` 欄位（統一轉大寫）。

***

## 2. 公開 API（前端/管理端共用）

> 以下介面除 `/api/ws` 外，若 `site_options.is_public !== 'true'` 則**必須**攜帶 JWT（`Authorization: Bearer <token>`）才能訪問。
> 命中 Turnstile 時需帶 `X-Turnstile-Token` 或 `X-Turnstile-Verified`。

### 2.1 `GET /api/config` - 獲取站點配置

**Request**

- Method：`GET`
- Path：`/api/config`
- Headers（可選）：
  ```
  X-Turnstile-Token: <token>   # 當攜帶時，驗證後會回寫 X-Turnstile-Verified
  X-Turnstile-Verified: <encrypted>
  ```

**Response** `200 OK`

```json
{
  "turnstile_enabled": true,
  "turnstile_site_key": "1x00000000000000000000AA",
  "verified": false,
  "turnstile_verified": "BASE64_AES_GCM_ENCRYPTED_STRING_OR_NULL",
  "show_long_history": true
}
```

| 欄位                   | 型別           | 說明                                     |
| -------------------- | ------------ | -------------------------------------- |
| `turnstile_enabled`  | boolean      | 站點是否啟用人機驗證                             |
| `turnstile_site_key` | string       | Turnstile 前端公鑰；前端拿到後渲染 widget          |
| `verified`           | boolean      | 當前請求是否攜帶了有效的 `X-Turnstile-Verified`    |
| `turnstile_verified` | string\|null | 當次驗證成功後回寫給客戶端的"已驗證憑證"，客戶端應回存並在 1 小時內複用 |
| `show_long_history`  | boolean      | 是否允許檢視超過 1 小時的歷史曲線（未登入使用者**強制** 1 小時上限） |

> `X-Turnstile-Token` 攜帶且驗證成功時，響應頭會同步設定 `X-Turnstile-Verified`（加密串）。

***

### 2.2 `GET /api/servers` - 獲取伺服器列表（首頁）

**Request**

- Method：`GET`
- Path：`/api/servers`
- Headers（按需）：`Authorization: Bearer <jwt>`、`X-Turnstile-Token` 或 `X-Turnstile-Verified`

**Response** `200 OK`

```json
{
  "servers": [ /* Server[]，見 5.1 */ ],
  "stats": {
    "total": 10,
    "online": 8,
    "offline": 2,
    "globalSpeedIn": 1234.5,
    "globalSpeedOut": 567.8,
    "globalNetTx": 1234567890,
    "globalNetRx": 9876543210
  },
  "regionStats": { "US": 3, "JP": 2, "CN": 5 },
  "sysConfig": {
    "show_price": true,
    "show_expire": true,
    "show_bw": true,
    "show_tf": true,
    "site_title": "My Server Monitor"
  }
}
```

| 欄位             | 說明                                                                    |
| -------------- | --------------------------------------------------------------------- |
| `servers`      | 已合併最新指標的伺服器列表（按 `sort_order ASC`），未登入使用者**自動過濾** **`is_hidden = '1'`** |
| `stats`        | 聚合統計：線上閾值 300 秒（5 分鐘無上報視為離線）                                          |
| `regionStats` | 按 ISO 區域碼（大寫）統計的伺服器數                                                  |
| `sysConfig`    | 當前站點開關，前端據此顯示對應 UI                                                    |

***

### 2.3 `GET /api/server` - 獲取單臺伺服器詳情

**Request**

- Method：`GET`
- Path：`/api/server`
- Query：
  - `id`（**必填**）：伺服器 UUID
- Headers（按需）：同 `/api/servers`

**Response** `200 OK`

```json
{
  "id": "9b2c...",
  "name": "HK-01",
  "server_group": "HK",
  "price": "￥30/月",
  "expire_date": "2026-12-31",
  "bandwidth": "1Gbps",
  "traffic_limit": "1TB",
  "traffic_calc_type": "total",
  "reset_day": 1,
  "report_interval": 60,
  "ping_mode": "http",
  "is_hidden": "0",
  "sort_order": 0,
  "cpu": 12.34,
  "ram": 45.67,
  "disk": 32.0,
  "load_avg": "0.10 0.20 0.30",
  "net_in_speed": 1024,
  "net_out_speed": 512,
  "net_rx": 12345678,
  "net_tx": 87654321,
  "net_rx_monthly": 1073741824,
  "net_tx_monthly": 536870912,
  "processes": 256,
  "tcp_conn": 32,
  "udp_conn": 4,
  "ping_ct": 23,
  "ping_cu": 25,
  "ping_cm": 30,
  "ping_bd": 40,
  "loss_ct": 0,
  "loss_cu": 0,
  "loss_cm": 0,
  "loss_bd": 0,
  "ram_total": 8192,
  "ram_used": 3700,
  "swap_total": 2048,
  "swap_used": 100,
  "disk_total": 102400,
  "disk_used": 32000,
  "cpu_cores": 4,
  "cpu_info": "Intel(R) Xeon(R) CPU",
  "gpu": 12.5,
  "gpu_info": "NVIDIA GeForce RTX 3060",
  "arch": "x86_64",
  "os": "Ubuntu 22.04",
  "region": "HK",
  "ip_v4": "1",
  "ip_v6": "1",
  "boot_time": "1700000000000",
  "last_updated": 1737638400000,
  "timestamp": 1737638400000,
  "sysConfig": { "show_long_history": true }
}
```

**失敗返回**：

- `400 { "error": "Missing ID" }` 缺少 `id`
- `404 { "error": "Server not found" }` 不存在 / 被隱藏（未登入訪問時）

***

### 2.4 `GET /api/history/all` - 獲取歷史指標

**Request**

- Method：`GET`
- Path：`/api/history/all`
- Query：
  - `id`（**必填**）：伺服器 UUID
  - `hours`（可選，預設 24）：浮點，**最大 168（7 天）**
- Headers（按需）：同 `/api/servers`

**Response** `200 OK`

```json
{
  "columns": ["timestamp", "cpu", "ram", "disk", "gpu", "gpu_info", "..."],
  "rows": [
    { "timestamp": 1737600000000, "cpu": 12.3, "ram": 45.0, "disk": 32.0, ... },
    { "timestamp": 1737600600000, "cpu": 13.1, "ram": 45.2, "disk": 32.0, ... }
  ]
}
```

**取樣間隔（自動）**

| hours 範圍  | 取樣點間隔                  |
| --------- | ---------------------- |
| > 168     | 實際取 168h（7 天），步長 80 分鐘 |
| 96 \~ 168 | 60 分鐘                  |
| 48 \~ 96  | 40 分鐘                  |
| 24 \~ 48  | 15 分鐘                  |
| 12 \~ 24  | 10 分鐘                  |
| 6 \~ 12   | 5 分鐘                   |
| 1 \~ 6    | 1 分鐘                   |
| ≤ 1       | 10 秒                   |

> 歷史查詢使用 `ROW_NUMBER() OVER (PARTITION BY ts/interval ORDER BY ts)` 取每個取樣視窗的第一條。

**跨月查詢**：當 `cutoff` 早於當月 1 號且存在 `metrics_history_old` 表時，自動 `UNION ALL` 兩張表。

**快取**：命中記憶體快取時返回 `X-Cache: HIT`，反之 `MISS`。TTL 取決於 `hours`：

| hours | TTL   |
| ----- | ----- |
| ≥ 120 | 10 分鐘 |
| ≥ 60  | 5 分鐘  |
| ≥ 30  | 3 分鐘  |
| < 30  | 1 分鐘  |

**未登入限制**：`hours > 1` 時強制 `401`。

**資料庫升級提示**：當 D1 缺少新欄位時返回：

```json
HTTP 409
{ "code": "DATABASE_UPGRADE_REQUIRED" }
```

此時應先呼叫 [`POST /updateDatabase`](#41-post-updatedatabase---資料庫遷移)。

***

### 2.5 `GET /api/ws` - WebSocket 即時推送

**Request**

- Method：`GET`（**必須**帶 `Upgrade: websocket` Header）
- Path：`/api/ws`
- Query：
  - `subscribe`（可選，預設 `all`）：
    - `all` → 訂閱所有伺服器的最新指標
    - `<serverId>` → 只訂閱指定伺服器

**Response** `101 Switching Protocols`（WebSocket 握手）

**握手 Header 要求**：

```
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: <base64>
Sec-WebSocket-Version: 13
```

**服務端 → 客戶端訊息**：

1. 連線成功（Hello）
   ```json
   { "type": "hello", "ts": 1737638400000, "subscribed": "all" }
   ```
2. 心跳
   ```json
   { "type": "ping", "ts": 1737638400000 }
   ```
3. 指標更新（`/update` 寫入後立即廣播）
   ```json
   {
     "type": "update",
     "serverId": "9b2c...",
     "ts": 1737638400000,
     "data": { /* 見 Server 物件(已 merge metrics) */ }
   }
   ```
   - 當 `subscribe=all` → 接收所有伺服器
   - 當 `subscribe=<serverId>` → 只接收該伺服器

**客戶端 → 服務端訊息**（可選）：

```json
{ "type": "ping" }   // → 服務端回 { "type": "pong", "ts": ... }
{ "type": "pong" }   // 靜默忽略
```

**失敗返回**：

- `503 { "error": "WebSocket not enabled", "code": 503 }` —— 未繫結 `METRICS_BROADCASTER` Durable Object
- `426 Expected WebSocket upgrade request` —— 缺少 `Upgrade: websocket` 頭

**前端使用示例**：

```js
const ws = new WebSocket('wss://status.example.com/api/ws?subscribe=all');
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'update') {
    // 更新對應 serverId 的卡片
  }
};
```

***

## 3. 管理端 API（鑑權）

### 3.1 `POST /admin/api` - 管理操作入口

> 所有管理操作都通過這一個端點 + `action` 欄位路由。

**Request**

- Method：`POST`
- Path：`/admin/api`
- Headers（除 `login` 外必填）：
  ```
  Content-Type: application/json
  Authorization: Bearer <jwt>
  ```
- Body（JSON）：
  ```json
  { "action": "<one of: login|get_settings|list|d1_usage|save_settings|add|delete|batch_delete|edit|save_order>", ...payload }
  ```

**Turnstile**：

- 僅 `action: login` 啟用 Turnstile 驗證（請求頭 `X-Turnstile-Token`）
- 其他 action：**不**走 Turnstile 流程（白名單 bypass）

**Response**：統一 `200 OK`，`Content-Type: application/json`，具體結構見下文各小節。

***

### 3.2 `action: login` - 登入

**Request**

```json
{
  "action": "login",
  "username": "admin",
  "password": "<plain text>"
}
```

Header：`X-Turnstile-Token: <token>`（當 `site_options.turnstile_enabled === 'true'` 時**必填**）

**Response 200**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTczNzYzODQwMCwiZXhwIjoxNzM4MjQzMjAwfQ.signature",
  "message": "loginSuccessful"
}
```

**Response 失敗**

- `400 { "error": "Missing username or password" }`
- `401 { "error": "Invalid username or password" }`
- `403 { "error": "Turnstile verification failed" }`

***

### 3.3 `action: get_settings` - 讀取全部設定

**Request**

```json
{ "action": "get_settings" }
```

**Response 200**

```json
{
  "success": true,
  "settings": { /* Settings 物件，見 5.4 */ },
  "api_secret": "<env.API_SECRET>"
}
```

> `api_secret` 僅在 `get_settings` 中返回，方便前端展示/複製。

***

### 3.4 `action: list` - 列出全部伺服器（含線上/統計）

**Request**

```json
{ "action": "list" }
```

**Response 200**

```json
{
  "success": true,
  "servers": [ /* Server[]，包含 is_hidden、is_online 等所有欄位 */ ],
  "stats": {
    "total": 10,
    "online": 8,
    "offline": 2,
    "total_cpu": 96.3,
    "total_ram": 360.5,
    "total_disk": 280.1,
    "total_net_in": 12345.6,
    "total_net_out": 7890.1,
    "avg_cpu": "12.04",
    "avg_ram": "45.06",
    "avg_disk": "35.01"
  }
}
```

| 欄位             | 說明                      |
| -------------- | ----------------------- |
| `is_online`    | `true` = 最近 5 分鐘內有上報    |
| `last_updated` | 最近一次上報時間戳（毫秒）           |
| `stats.avg_*`  | 僅按線上伺服器平均，保留 2 位小數（字串） |

> 注意：本介面**包含** `is_hidden=1` 的伺服器（與 `/api/servers` 不同）。

***

### 3.5 `action: d1_usage` - D1 / Workers 用量

**Request**

```json
{ "action": "d1_usage" }
```

**前置條件**：`site_options.cloudflare_token` 與 `site_options.cloudflare_account_id` 必須已配置。

**Response 200**

```json
{
  "success": true,
  "usage": {
    "today": {
      "date": "2025-12-31",
      "rowsRead": 12345,
      "rowsWritten": 678,
      "readLimit": 5000000,
      "writeLimit": 100000,
      "readRemaining": 4987655,
      "writeRemaining": 99322,
      "workersRequests": 1234,
      "workersRequestLimit": 100000,
      "workersRequestRemaining": 98766,
      "databaseCount": 1,
      "accountId": "<cloudflare_account_id>"
    },
    "last24Hours": {
      "date": "2025-12-30 ~ 2025-12-31",
      "rowsRead": 23456,
      "rowsWritten": 789,
      "readLimit": 5000000,
      "writeLimit": 100000,
      "workersRequests": 2345,
      "workersRequestLimit": 100000,
      "databaseCount": 1,
      "accountId": "<cloudflare_account_id>"
    }
  }
}
```

**Response 失敗**

- `400 { "error": "請先配置 Cloudflare Token" }` / `400 { "error": "請先配置 Cloudflare 使用者 ID / Account ID" }`
- `400 { "error": "<Cloudflare GraphQL 錯誤資訊>" }`

> 通過 Cloudflare GraphQL API（`https://api.cloudflare.com/client/v4/graphql`）查詢：
>
> - `d1AnalyticsAdaptiveGroups`（`rowsRead` / `rowsWritten`）
> - `workersInvocationsAdaptive`（`requests`）

***

### 3.6 `action: save_settings` - 儲存設定

**Request**

```json
{
  "action": "save_settings",
  "settings": {
    "site_title": "My Server Monitor",
    "custom_bg": "https://...",
    "custom_head": "<style>...</style>",
    "custom_script": "console.log('hi');",
    "is_public": "true",
    "show_price": "true",
    "show_expire": "true",
    "show_bw": "true",
    "show_tf": "true",
    "show_long_history": "true",
    "tg_notify": "false",
    "tg_bot_token": "",
    "tg_chat_id": "",
    "turnstile_enabled": "false",
    "turnstile_site_key": "",
    "turnstile_secret_key": "",
    "jwt_secret": "",
    "username": "admin",
    "password": "<plain text, will be MD5-hashed before save>",
    "cloudflare_account_id": "",
    "cloudflare_token": "",
    "custom_ct": "1.1.1.1",
    "custom_cu": "8.8.8.8",
    "custom_cm": "208.67.222.222",
    "custom_bd": "9.9.9.9",
    "cleanup_skip_count": "0",
    "expire_reminder": "false"
  }
}
```

**欄位分類**：

- `APPEARANCE_FIELDS`（寫入 `appearance_options` JSON）：`site_title`、`custom_bg`、`custom_head`、`custom_script`
- `SITE_FIELDS`（寫入 `site_options` JSON）：上表除 appearance 之外的全部
- 任何未列出的欄位會被忽略

**特殊處理**：

- `password`：以**明文**傳入；後端用 `crypto.subtle.digest('MD5', ...)` 計算後儲存；如傳空字串則**不更新**密碼

**Response 200**

```json
{ "success": true, "message": "updateSuccess" }
```

> 副作用：清空 `site_options` 記憶體快取，下一次請求會從 DB 重新載入。

***

### 3.7 `action: add` - 新增伺服器

**Request**

```json
{ "action": "add", "name": "New Server", "server_group": "Default" }
```

**Response 200**

```json
{
  "success": true,
  "id": "<newly generated UUID v4>",
  "message": "serverAdded"
}
```

**約束**：

- `name`：1 \~ 100 字元，否則 `400 { "error": "伺服器名稱無效" }`
- `server_group`：預設 `Default`
- `sort_order`：自動 = `MAX(sort_order) + 1`

***

### 3.8 `action: edit` - 修改伺服器資訊

**Request**

```json
{
  "action": "edit",
  "id": "<server UUID>",
  "name": "HK-01",                   // 可選，1~100 字元
  "server_group": "HK",               // 預設 "Default"
  "price": "￥30/月",                  // 字串
  "expire_date": "2026-12-31",
  "bandwidth": "1Gbps",
  "traffic_limit": "1TB",
  "traffic_calc_type": "total",       // total | ...
  "reset_day": 1,                     // 1 ~ 31
  "report_interval": 60,              // 秒
  "ping_mode": "http",                // http | tcp
  "is_hidden": "0"                    // "0" | "1"
}
```

**Response 200**

```json
{ "success": true, "message": "serverUpdated" }
```

**Response 失敗**

- `400 { "error": "伺服器 ID 無效" }` —— UUID 格式錯
- `500 { "error": "Update failed. Please go to Database Management and click \"Upgrade Database\" to migrate the new field." }` —— DB 缺欄位，請先 `/updateDatabase`

***

### 3.9 `action: delete` - 刪除伺服器

**Request**

```json
{ "action": "delete", "id": "<server UUID>" }
```

**副作用**：級聯刪除該 server 的全部 `metrics_history` 記錄。

**Response 200**

```json
{ "success": true, "message": "serverDeleted" }
```

***

### 3.10 `action: batch_delete` - 批次刪除

**Request**

```json
{ "action": "batch_delete", "ids": ["<uuid1>", "<uuid2>", "<uuid3>"] }
```

**Response 200**

```json
{ "success": true, "message": "batchDeleted" }
```

***

### 3.11 `action: save_order` - 儲存伺服器排序

**Request**

```json
{ "action": "save_order", "orders": ["<uuid1>", "<uuid2>", "<uuid3>"] }
```

**說明**：

- `orders[i]` 表示該 UUID 排序後應為第 `i` 位（`sort_order = i`）
- 服務端會逐條 `UPDATE sort_order = ? WHERE id = ?`

**Response 200**

```json
{ "success": true, "message": "sortOrderSaved" }
```

***

## 4. 系統維護端點

> 以下端點需 JWT 鑑權（`Authorization: Bearer <token>`），不參與 Turnstile。

### 4.1 `POST /updateDatabase` - 資料庫遷移

> 用於老版本升級時補齊 `metrics_history` 與 `servers` 表的欄位、並清理廢棄 settings。

**Request**

- Method：`POST`
- Path：`/updateDatabase`
- Headers：`Authorization: Bearer <jwt>`

**Response 200**

```json
{
  "success": true,
  "message": "databaseUpgradeSuccess",
  "results": [
    { "name": "metrics_history load -> load_avg 遷移", "success": true, "migrated": 1234, "message": "..." },
    { "name": "servers 表列更新", "success": true, "added": 5 },
    { "name": "servers 表多餘欄位清理", "success": true, "cleaned": 30, "message": "..." },
    { "name": "metrics_history 表列更新", "success": true, "added": 14 },
    { "name": "metrics_history 寫入最佳化", "success": true, "optimized": 0, "message": "..." },
    { "name": "廢棄 settings key 清理", "success": true, "cleaned": 0 },
    { "name": "刪除棄用的 metrics_aggregated 表", "success": true, "dropped": 0, "message": "..." }
  ]
}
```

**失敗返回**：`500` + `error` 欄位（任一步驟拋錯時整體失敗）。

***

### 4.2 `POST /rebuild` - 資料庫重建

> **危險操作**：會刪除 `servers` / `metrics_history` / `metrics_history_old` / `settings` 全部資料後重建。

**Request**

- Method：`POST`
- Path：`/rebuild`
- Headers：`Authorization: Bearer <jwt>`

**Response 200**

```json
{ "success": true, "message": "databaseRebuiltSuccess" }
```

***

### 4.3 `GET /__do/health` - Durable Object 健康檢查

**Request**

- Method：`GET`
- Path：`/__do/health`
- Headers：無需鑑權

**Response 200**

```json
{ "ok": true, "subscribers": 3 }
```

或

```json
{ "ok": false, "reason": "DO not bound" }
{ "ok": false, "reason": "<error message>" }
```

***

## 5. 資料結構

### 5.1 Server 物件

| 欄位                                            | 型別                 | 說明                        |
| --------------------------------------------- | ------------------ | ------------------------- |
| `id`                                          | string (UUID)      | 主鍵                        |
| `name`                                        | string             | 顯示名                       |
| `server_group`                                | string             | 分組                        |
| `price`                                       | string             | 價格文本（自由格式）                |
| `expire_date`                                 | string             | 到期日 `YYYY-MM-DD`          |
| `bandwidth`                                   | string             | 頻寬文本                      |
| `traffic_limit`                               | string             | 流量上限文本                    |
| `traffic_calc_type`                           | string             | `total` / 其他              |
| `reset_day`                                   | number             | 流量重置日 1\~31               |
| `report_interval`                             | number             | 上報間隔（秒）                   |
| `ping_mode`                                   | string             | `http` / `tcp`            |
| `is_hidden`                                   | string `"0"`/`"1"` | 是否在前臺隱藏                   |
| `sort_order`                                  | number             | 排序值（越小越靠前）                |
| `cpu`                                         | number             | 最新 CPU%（來自最新指標）           |
| `ram`                                         | number             | 最新 RAM%                   |
| `disk`                                        | number             | 最新 DISK%                  |
| `load_avg`                                    | string             | `"x x x"`                 |
| `net_in_speed`                                | number             | B/s                       |
| `net_out_speed`                               | number             | B/s                       |
| `net_rx`                                      | number             | 累計下行位元組                    |
| `net_tx`                                      | number             | 累計上行位元組                    |
| `net_rx_monthly`                              | number             | 當月累計下行位元組                  |
| `net_tx_monthly`                              | number             | 當月累計上行位元組                  |
| `processes`                                   | number             | 程序數                       |
| `tcp_conn`                                    | number             | TCP 連線數                   |
| `udp_conn`                                    | number             | UDP 套接字數                  |
| `ping_ct` / `ping_cu` / `ping_cm` / `ping_bd` | number\|null       | 各運營商延時 (ms)               |
| `loss_ct` / `loss_cu` / `loss_cm` / `loss_bd` | number\|null       | 各運營商丟包率 (%)               |
| `ram_total` / `ram_used`                      | number             | MB                        |
| `swap_total` / `swap_used`                    | number             | MB                        |
| `disk_total` / `disk_used`                    | number             | MB                        |
| `cpu_cores`                                   | number             | 邏輯核心數                     |
| `cpu_info`                                    | string             | CPU 型號                    |
| `gpu`                                         | number\|null       | GPU 佔用%                   |
| `gpu_info`                                    | string             | GPU 型號                    |
| `arch`                                        | string             | 架構                        |
| `os`                                          | string             | OS 名稱                     |
| `region`                                      | string             | 區域程式碼（大寫，相容 ISO 國家碼）         |
| `ip_v4`                                       | string `"0"`/`"1"` | IPv4 可達性                  |
| `ip_v6`                                       | string `"0"`/`"1"` | IPv6 可達性                  |
| `boot_time`                                   | string             | 啟動時間（毫秒）                  |
| `last_updated` / `timestamp`                  | number             | 上報時間戳（毫秒）                 |
| `is_online`                                   | boolean            | 5 分鐘內是否有上報（僅 `list` 介面計算） |
| `sysConfig`                                   | object             | 站點級開關（僅部分介面附帶）            |

### 5.2 Metrics 物件（探針上報 payload）

> 見 [§1.1 metrics 欄位表](#11-post-update---指標上報agent-入口)。所有數值欄位都是**字串**（除了 `gpu`），方便 Bash 探針組裝 JSON。

### 5.3 History Row 物件

| 欄位          | 型別             | 說明                                                                                                                                                                                                                                               |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp` | number (ms)    | 取樣時間                                                                                                                                                                                                                                             |
| 其餘欄位        | 視查詢 columns 而定 | 當前 `/api/history/all` 固定返回：`cpu, gpu, gpu_info, ram, disk_total, disk_used, processes, net_in_speed, net_out_speed, tcp_conn, udp_conn, ping_ct, ping_cu, ping_cm, ping_bd, loss_ct, loss_cu, loss_cm, loss_bd, swap_total, swap_used, load_avg` |

### 5.4 Settings 物件

> `get_settings` 直接返回 `site_options` JSON 的**全部欄位**（包括 `jwt_secret`、`cloudflare_token` 等敏感欄位！請妥善儲存並通過 HTTPS 呼叫）。

```ts
{
  site_title: string,
  custom_bg: string,
  custom_head: string,           // 注入到 </head> 之前
  custom_script: string,         // 注入到 </body> 之前
  is_public: 'true' | 'false',
  show_price: 'true' | 'false',
  show_expire: 'true' | 'false',
  show_bw: 'true' | 'false',
  show_tf: 'true' | 'false',
  show_long_history: 'true' | 'false',
  tg_notify: 'true' | 'false',
  tg_bot_token: string,
  tg_chat_id: string,
  turnstile_enabled: 'true' | 'false',
  turnstile_site_key: string,
  turnstile_secret_key: string,
  jwt_secret: string,            // 長度 ≥ 32 才會被用於籤 JWT
  username: string,
  password: string,              // MD5 雜湊值
  cloudflare_account_id: string,
  cloudflare_token: string,
  custom_ct: string,             // CF 測試節點域名
  custom_cu: string,             // GO
  custom_cm: string,             // OP
  custom_bd: string,             // Q9
  cleanup_skip_count: string,
  expire_reminder: 'true' | 'false'
}
```

### 5.5 WebSocket 訊息

| `type`   | 方向    | Payload                                            |
| -------- | ----- | -------------------------------------------------- |
| `hello`  | S → C | `{ ts: number, subscribed: string }`               |
| `ping`   | S → C | `{ ts: number }`                                   |
| `pong`   | 雙向    | `{ ts: number }`                                   |
| `update` | S → C | `{ serverId: string, ts: number, data: <Server> }` |

***

## 6. 定時任務 (Cron)

Worker 同時註冊了 cron 觸發器（`scheduled` handler），可在 `wrangler.toml` 配置：

| Cron          | 行為              | 備註                                                             |
| ------------- | --------------- | -------------------------------------------------------------- |
| `*/1 * * * *` | 每分鐘：檢測離線節點      | `checkOfflineNodes`（通知）                                        |
| `0 * * * *`   | 每小時：根據 UTC 日期分支 | 見下表                                                            |
|               | 每月 1 號 0 點：表輪換  | `monthlyCleanup`（重新命名 metrics\_history → metrics\_history\_old） |
|               | 每月 8 號 0 點：刪除舊錶 | `dropMetricsHistoryOld`                                        |
|               | 每天 12 點：伺服器到期檢測 | `checkExpiringServers`                                         |

DEBUG 模式（`env.DEBUG=1`）下額外提供：

- `* * 1 * *` → monthlyCleanup
- `* * 8 * *` → dropMetricsHistoryOld
- `0 12 * * *` → checkExpiringServers

***

## 7. 錯誤碼速查表

| code | 名稱                    | 觸發條件                                        |
| ---- | --------------------- | ------------------------------------------- |
| 400  | Bad Request           | 缺引數 / 非法 UUID / 未知 action / 缺 Cloudflare 配置 |
| 401  | Unauthorized          | JWT 失敗 / Basic 失敗 / 站點非公開未登入 / 探針 secret 錯  |
| 403  | Forbidden             | Turnstile 失敗                                |
| 404  | Not Found             | 伺服器不存在 / WebSocket DO 未繫結                   |
| 409  | Conflict              | `DATABASE_UPGRADE_REQUIRED`（D1 缺欄位）         |
| 500  | Internal Server Error | 未捕獲異常 / DB 拋錯                               |
| 503  | Service Unavailable   | WebSocket 未啟用                               |

***

## 8. 完整 cURL 示例

> 假設部署在 `https://status.example.com`，`API_SECRET=abc123`，伺服器 ID 為 `9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f`。

### 8.1 探針上報

```bash
curl -X POST https://status.example.com/update \
  -H "Content-Type: application/json" \
  -d '{
    "id":"9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f",
    "secret":"abc123",
    "metrics":{
      "cpu":"12.34","ram_total":"8192","ram_used":"3700",
      "swap_total":"2048","swap_used":"100",
      "disk_total":"102400","disk_used":"32000",
      "load_avg":"0.10 0.20 0.30","boot_time":"1700000000000",
      "net_rx":"12345678","net_tx":"87654321",
      "net_rx_monthly":"1073741824","net_tx_monthly":"536870912",
      "net_in_speed":"1024","net_out_speed":"512",
      "os":"Ubuntu 22.04","arch":"x86_64","cpu_info":"Intel Xeon","cpu_cores":"4",
      "processes":"256","tcp_conn":"32","udp_conn":"4",
      "ip_v4":"1","ip_v6":"1",
      "ping_ct":"23","ping_cu":"25","ping_cm":"30","ping_bd":"40"
    }
  }'
```

### 8.2 公共：獲取配置

```bash
curl https://status.example.com/api/config
```

### 8.3 公共：首頁伺服器列表

```bash
curl https://status.example.com/api/servers
```

### 8.4 公共：單臺詳情

```bash
curl "https://status.example.com/api/server?id=9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f"
```

### 8.5 公共：24h 歷史

```bash
curl "https://status.example.com/api/history/all?id=9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f&hours=24"
```

### 8.6 管理：登入

```bash
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "X-Turnstile-Token: <token>" \
  -d '{"action":"login","username":"admin","password":"abc123"}'
```

### 8.7 管理：列表（需 JWT）

```bash
TOKEN="eyJhbGc..."
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"list"}'
```

### 8.8 管理：新增伺服器

```bash
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"add","name":"HK-02","server_group":"HK"}'
```

### 8.9 管理：編輯

```bash
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"edit","id":"9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f","price":"￥35/月","expire_date":"2027-01-01"}'
```

### 8.10 管理：刪除

```bash
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"delete","id":"9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f"}'
```

### 8.11 管理：儲存設定

```bash
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action":"save_settings",
    "settings":{
      "site_title":"My Status",
      "is_public":"true",
      "show_long_history":"true",
      "turnstile_enabled":"true",
      "turnstile_site_key":"1x00000000000000000000AA",
      "turnstile_secret_key":"1x0000000000000000000000000000000AA"
    }
  }'
```

### 8.12 管理：D1 用量

```bash
curl -X POST https://status.example.com/admin/api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"d1_usage"}'
```

### 8.13 系統：資料庫遷移

```bash
curl -X POST https://status.example.com/updateDatabase \
  -H "Authorization: Bearer $TOKEN"
```

### 8.14 健康檢查

```bash
curl https://status.example.com/__do/health
```

### 8.15 WebSocket（使用 wscat / websocat）

```bash
# 訂閱所有伺服器
wscat -c "wss://status.example.com/api/ws?subscribe=all"

# 訂閱指定伺服器
wscat -c "wss://status.example.com/api/ws?subscribe=9b2c4d3e-1a2b-4c5d-9e8f-7a6b5c4d3e2f"
```

***

## 9. 版本與變更說明

- **v1.x**：當前文件對應 `src/index.js`、`src/handlers/*`、`src/database/schema.js` 主線實現。
- **Breaking change**：`/admin/api` 由 `GET?action=...` 改為 `POST {action:...}` 模式，Token 校驗與 Turnstile 走 Header 通道。
- **CORS**：通過 `CORS_ALLOWED_ORIGINS` 環境變數開啟；不配置時所有跨域請求會失敗。
- **JWT**：`jwt_secret` 推薦配置為 ≥ 32 位的隨機字串；未配置時回退到 `API_SECRET` 派生，**部署後強烈建議**顯式配置。
- **資料庫升級**：升級到新欄位（如 `loss_*`、`net_rx_monthly`、`reset_day` 等）後請呼叫 `POST /updateDatabase`；否則歷史介面可能返回 `409 DATABASE_UPGRADE_REQUIRED`。

***

> 文件同步：與原始碼 `src/index.js`、`src/handlers/{admin,dashboard,frontend,update}.js`、`src/durable/MetricsBroadcaster.js`、`src/utils/{auth,settings,errors,cors,cache,metrics,common}.js`、`src/database/{schema,updateDatabase}.js` 一一對應；後續修改任一檔案時，請同步更新本檔案。

