# [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor)

一個基於 Cloudflare Workers + D1 + Durable Objects 的多伺服器監控探針系統，支援即時監控、歷史資料檢視、延遲追蹤、地圖展示等功能。相容主流Linux系統，Alpine Linux，OpenWrt，Windows系統。**演示地址**：<https://tz.dashdeep.dpdns.org/>

**當前版本：V2.7.4**

<2.7.1 新增了功能，需要**升級安裝指令碼** 才能生效，否則無法獲取丟包率
```
# Linux
curl -sL https://你的專案.你的子域.workers.dev/install.sh | bash -s install
# Alpine
curl -sL https://你的專案.你的子域.workers.dev/install-alpine.sh | sh -s install
# OpenWrt
curl -sL https://你的專案.你的子域.workers.dev/install-openwrt.sh | sh -s install
```
<= 2.6.9 版本,使用方式一部署方式，需要在Workers & Pages頁面，點選 **Settings**，修改Build configuration的Deploy command為：`npx wrangler deploy --keep-vars`，否則會導致API\_SECRET丟失。舊key可用通過
```
# Linux
cat /etc/systemd/system/cf-probe.service
# OpenWrt,Alpine
cat /etc/init.d/cf-probe
# >2.6.9版本
cat /etc/config/cf-probe/config.conf
```
獲取，再重新設定環境變數API\_SECRET（注意是設定頂部的變數和金鑰），最後再同步資料。

<details>
<summary>更新記錄</summary>

- V2.7.4 新增允許跨域配置，為後續版本額外功能做鋪墊，前端加上跨域配置，修改成HASH模式，修改country為region，資料庫自動維護
- V2.7.3.3 壓縮定時任務4個為2個，避免超出免費額度
- V2.7.3.2 合併通知告警，其他程式碼邏輯最佳化
- V2.7.3.1 當request.cf返回`cf object not available`錯誤，導致國家/地區程式碼獲取失敗，使用request.headers獲取作為備選
- V2.7.3 新增伺服器到期提醒功能，調整後臺設定頁面佈局
- V2.7.2 新增支援多分割槽磁碟統計功能以及其他最佳化，增加[圖文教程](https://huilang.me/cf-server-monitor-setup/)
- V2.7.1 新增國內四線路丟包率監控與歷史圖表，新增GPU欄位與圖表展示（GPU暫未測試），後臺新增 Cloudflare D1/Workers 每日額度查詢功能；

- V2.7.0 將每日資料清理改為每月1號執行的表輪換任務, 刪除舊錶將不再扣除D1消耗,前端圖表支援檢視最長7天的歷史資料,最佳化指令碼一鍵升級功能
- V2.6.10 修復了方式一部署方式，同步後丟失API\_SECRET的問題
- V2.6.9 修復地圖顯示問題，重構OpenWrt安裝指令碼，新增OpenRC服務支援
- V2.6.8 修復網絡卡統計誤統計非目標網絡卡流量的問題,修復Alpine環境UDP連線數統計錯誤,本次更新需要重新安裝指令碼才能生效
- v2.6.7 增加了月流量統計校正功能，以及首頁流量統計展示
- v2.6.6 增加上報間隔，Ping方式，流量重置日入庫功能
- V2.6.5 修復了部分系統啟動時間獲取錯誤的問題，TCP/UDP上報格式錯誤導致失敗問題，新增詳情頁面即時網速展示
- V2.6.4 增加了 **月流量統計** 功能，升級後請在後臺手動點選 **升級資料庫** 來更新資料庫結構。不然會導致資料庫結構錯誤，影響正常執行。同時需要在後臺設定重置日期，並重新安裝指令碼。
- V2.6.3 應大家需求，增加自定義Ping設定
- V2.6.0 降低了 50% 的D1寫入消耗，強烈建議升級，升級後請在後臺手動點選 升級資料庫 或者 重建資料庫 。
- V2.5.0 增加客戶端上報資料後，在不佔用D1消耗的情況下，前端WebSocket即時重新整理資料
- V2.4.0 版本主要優化了D1讀寫佔用，使專案消耗大大降低，以及增加了防護避免被刷。
</details>

## ✨ 功能特點

- 📊 **即時監控**：CPU、GPU、記憶體、磁碟、網路、程序數、連線數、負載均衡
- 📈 **歷史圖表**：支援7天曆史資料檢視
- 🌍 **全球地圖**：視覺化展示伺服器分佈
- 🔔 **離線告警**：支援 Telegram 和企業微信通知
- 📱 **響應式**：支援桌面端和移動端
- 🔄 **自動部署**：GitHub Actions 一鍵部署
- 🗺️ **網路質量追蹤**：國內電信/聯通/移動/位元組延遲與丟包率監測
- 🔒 **伺服器隱藏**：可設定特定伺服器對非登入使用者隱藏
- ↕️ **拖拽排序**：後臺拖拽調整伺服器顯示順序
- 🌐 **雙語支援**：支援中文和英文介面自由切換
- 🧪 **本地測試**：支援本地模擬資料生成，方便開發和測試
- 🔐 **Turnstile 驗證**：整合 Cloudflare Turnstile 人機驗證，增強 API 安全性
- 🔑 **JWT 認證**：登入系統採用 JWT token 認證，支援自定義金鑰
- 📉 **額度查詢**：後臺可查詢 Cloudflare D1 當日讀寫行數與 Workers 請求量
- ⚡ **即時推送**：基於 Durable Objects + WebSocket，探針上報後頁面立即重新整理，無輪詢延遲

## 🚀 快速開始

### 前置要求

- [Cloudflare 賬戶](https://dash.cloudflare.com/)
- [GitHub 賬戶](https://github.com/)

<details>
<summary>方式一：Cloudflare Workers 連線GitHub倉庫（推薦使用，方便同步）圖文教程 -> https://huilang.me/cf-server-monitor-setup/</summary>

### 第一步：Fork 專案

點選右上角 **Fork** 按鈕，將專案 Fork 到你的 GitHub 賬戶。

### 第二步：新建 Cloudflare Workers

1. 登入 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 進入 **[Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)**
3. 點選 **Create application**
4. 選擇 Continue with GitHub（第一次使用需要連線 GitHub 賬戶），選擇本專案
5. Project Name填寫：`cf-server-monitor`
6. Build command 填寫：`npm run build:frontend`
7. Deploy command 填寫：`npx wrangler deploy --keep-vars`
8. 點選 **Deploy**，成功會在底部顯示`✨ Success! Build completed.`

### 第三步：配置環境變數

1. 在當前Workers & Pages頁面，點選 **Settings**
2. 在Variables and secrets找到API\_SECRET，點右側編輯，填寫密碼（建議使用隨機數,不要包含特殊字元比如%），點Deploy儲存部署，等待30秒左右部署完成

</details>

<details>
<summary>方式二：GitHub Action 自動部署</summary>

### 第一步：Fork 專案

點選右上角 **Fork** 按鈕，將專案 Fork 到你的 GitHub 賬戶。

### 第二步：建立 D1 資料庫

1. 登入 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 進入 **[Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)**  → **[D1 SQL Database](https://dash.cloudflare.com/?to=/:account/workers/d1)**
3. 點選 **Create database**
4. 資料庫名稱填寫：`server-monitor-db`
5. 點選 **Create**
6. 記錄下生成的 **Database ID**，稍後會用到

### 第三步：獲取 Cloudflare 配置

#### 獲取 Account ID

**方式一：從右側面板獲取**

1. 開啟 [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. 在右側面板找到 **Account ID**
3. 複製儲存

**方式二：從 URL 中獲取**

- 登入後訪問任意 Cloudflare 頁面，例如 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
- URL 中 `dash.cloudflare.com/` 之後的那串字元就是 Account ID

#### 獲取 API Token

1. 開啟 [API Tokens 頁面](https://dash.cloudflare.com/profile/api-tokens)
2. 點選 **Create Token/建立令牌**
3. 選擇（**Edit Cloudflare Workers/編輯 Cloudflare Workers**）模板
4. 在 **Account Resources/帳戶資源** 選擇你的賬戶
5. 點選 **Continue to summary/繼續以顯示摘要**→ **Create Token/建立令牌**
6. 複製生成的 Token（只顯示一次！）

### 第四步：配置 GitHub Secrets

1. 開啟你 Fork 的 GitHub 倉庫
2. 進入 **Settings** → **Secrets and variables** → **Actions**
3. 點選 **New repository secret**，依次新增以下 5 個金鑰：

| Secret 名稱        | 值                  | 說明                                     |
| ---------------- | ------------------ | -------------------------------------- |
| `CF_API_TOKEN`   | 第三步獲取的 Token       | Cloudflare API 令牌                      |
| `CF_ACCOUNT_ID`  | 第三步獲取的 ID          | Cloudflare 賬戶 ID                       |
| `API_USER_NAME`  | 自定義使用者名稱（非必填）        | 管理後臺使用者名稱 新版已移除，預設使用者名稱admin               |
| `API_SECRET`     | API 認證金鑰（必填）       | 探針認證金鑰 & 預設管理後臺密碼 建議使用隨機密碼,不要包含特殊字元比如% |
| `D1_DATABASE_ID` | 第二步獲取的 Database ID | D1 資料庫 ID                              |

### 第五步：部署

#### 方式一：自動部署

推送程式碼到 `main` 分支即可自動部署：

```bash
# 克隆你 Fork 的倉庫
git clone https://github.com/你的使用者名稱/CF-Server-Monitor.git
cd CF-Server-Monitor

# 可選：修改配置後提交
git add .
git commit -m "Initial setup"
git push origin main
```

推送後，GitHub Actions 會自動部署。在倉庫的 **Actions** 標籤頁可檢視部署進度。

#### 方式二：手動部署

也可以通過 GitHub Actions 手動觸發部署：

1. 進入你的 GitHub 倉庫頁面
2. 點選頂部的 **Actions** 標籤
3. 在左側工作流列表中選擇 **Deploy to Cloudflare Workers**
4. 點選右側的 **Run workflow** 按鈕
5. 選擇分支（預設選擇 `main`）
6. 點選 **Run workflow** 開始部署

部署進度可在 **Actions** 標籤頁中檢視。

</details>

<details>
<summary>方式三：一鍵部署（比較簡單，但不推薦，不方便更新）</summary>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/huilang-me/CF-Server-Monitor)

新使用者點選一鍵部署

修改`API_SECRET`，建議使用隨機密碼,不要包含特殊字元比如%，登入密碼在登入後修改，建議和API\_SECRET不同。

在build command中填入 `npm run build:frontend`，其他保持預設

點選部署即可

</details>

## 📊 使用說明

<details>
<summary>訪問管理後臺</summary>

部署成功後，訪問管理後臺：

```
https://你的專案名.你的子域.workers.dev/#admin
```

- 使用者名稱：預設admin，如果設定了環境變數 `API_USER_NAME`，則使用該值
- 密碼：你設定的 `API_SECRET`

**登入後務必修改使用者名稱和密碼，以確保安全。** 強烈建議登入密碼和探針認證金鑰不同。

> **提示**：專案名和子域可以在 Cloudflare Workers & Pages 頁面找到。建議繫結域名，避免國內無法訪問

</details>

<details>
<summary>新增伺服器監控</summary>

### 在管理後臺新增伺服器

1. 進入管理後臺 `/#/admin`
2. 在"伺服器名稱"輸入框填寫名稱
3. 點選 **+ 新增伺服器**
4. 點選新伺服器旁的 **📋** 按鈕複製安裝命令

### Linux系統

Ubuntu / Debian / CentOS / RHEL / Fedora / Rocky / AlmaLinux 系統

```bash
curl -sL https://你的專案.你的子域.workers.dev/install.sh | bash -s install -id=<SERVER_ID> -secret=<SECRET> -url=<WORKER_URL> [-interval=60] [-ping=http] [-ct=xxx] [-cu=xxx] [-cm=xxx] [-bd=xxx] [-reset_day=1] [-rx_correction=N] [-tx_correction=N]
```

Alpine 系統

```bash
curl -sL https://你的專案.你的子域.workers.dev/install-alpine.sh | sh -s install -id=<SERVER_ID> -secret=<SECRET> -url=<WORKER_URL> [-interval=60] [-ping=http] [-ct=xxx] [-cu=xxx] [-cm=xxx] [-bd=xxx] [-reset_day=1] [-rx_correction=N] [-tx_correction=N]
```

OpenWrt / LEDE / ImmortalWrt 系統

```bash
curl -sL https://你的專案.你的子域.workers.dev/install-openwrt.sh | sh -s install -id=<SERVER_ID> -secret=<SECRET> -url=<WORKER_URL> [-interval=60] [-ping=http] [-ct=xxx] [-cu=xxx] [-cm=xxx] [-bd=xxx] [-reset_day=1] [-rx_correction=N] [-tx_correction=N]
```

### Windows 系統安裝

對於 Windows 系統，使用 Python 指令碼安裝探針：

#### 安裝依賴

`pip install psutil pystray pillow`

#### 下載探針指令碼

[cf-server-monitor.pyw](public/cf-server-monitor.pyw)

#### 執行探針

雙擊`cf-server-monitor.pyw`檔案即可啟動探針。

**引數說明：**

| 引數               | 說明                      | 預設值    |
| ---------------- | ----------------------- | ------ |
| `-id`            | 伺服器唯一識別符號（必填）            | -      |
| `-secret`        | API 認證金鑰（必填）            | -      |
| `-url`           | Worker 上報地址（必填）         | -      |
| `-interval`      | 資料上報間隔（秒）               | `60`   |
| `-ping`          | Ping 檢測型別（`http`/`tcp`） | `http` |
| `-ct`            | 自定義CT測試節點               | 預設節點   |
| `-cu`            | 自定義CU測試節點               | 預設節點   |
| `-cm`            | 自定義CM測試節點               | 預設節點   |
| `-bd`            | 自定義BD測試節點               | 預設節點   |
| `-reset_day`     | 流量重置日（1-31）             | `1`    |
| `-rx_correction` | 下行流量校正（GB，直接設定當月下行資料）   | -      |
| `-tx_correction` | 上行流量校正（GB，直接設定當月上行資料）   | -      |

> **注意**：上報間隔越短，資料越即時，但會增加 API 呼叫和資料庫儲存。建議根據伺服器數量和網路狀況選擇合適的間隔。

</details>

<details>
<summary>升級 Cloudflare Workers</summary>

根據您使用的安裝方式，選擇對應的升級方法：

### 方式一：Cloudflare Workers 連線 GitHub 倉庫

由於 Cloudflare Workers 直接連線 GitHub 倉庫，升級非常簡單：

1. 進入您 Fork 的 GitHub 倉庫頁面
2. 點選 **Sync fork** → **Update branch** 同步上游更新
3. Cloudflare Workers 會自動檢測到程式碼變更並重新部署

或者使用命令行同步：

```bash
# 進入本地倉庫目錄
cd CF-Server-Monitor

# 新增上游倉庫（首次需要）
git remote add upstream https://github.com/huilang-me/CF-Server-Monitor.git

# 拉取上游更新
git fetch upstream

# 合併到本地 main 分支
git checkout main
git merge upstream/main

# 推送到您的倉庫
git push origin main
```

推送後 Cloudflare Workers 會自動部署最新版本。

### 方式二：GitHub Action 自動部署

與方式一類似，同步上游倉庫後推送即可：

1. 同步上游倉庫（參考方式一的步驟）
2. 推送程式碼後 GitHub Actions 會自動觸發部署
3. 在倉庫的 **Actions** 標籤頁檢視部署進度

也可以手動觸發部署：

1. 進入 GitHub 倉庫 → **Actions** → **Deploy to Cloudflare Workers**
2. 點選 **Run workflow** → 選擇分支 → **Run workflow**

### 方式三：一鍵部署

一鍵部署方式升級較為麻煩，建議重新部署：

1. 訪問 [一鍵部署頁面](https://deploy.workers.cloudflare.com/?url=https://github.com/huilang-me/CF-Server-Monitor)
2. 選擇已存在的專案進行更新
3. 在 build command 中填入 `npm run build:frontend`
4. 點選部署

> **注意**：一鍵部署方式不方便同步更新，建議遷移到方式一或方式二。

</details>

<details>
<summary>升級探針</summary>

當有新版本部署成功後，可以通過以下命令升級探針，升級過程會自動保留原有配置：

```bash
# Linux
curl -sL https://你的專案.你的子域.workers.dev/install.sh | bash -s install
# Alpine
curl -sL https://你的專案.你的子域.workers.dev/install-alpine.sh | sh -s install
# OpenWrt
curl -sL https://你的專案.你的子域.workers.dev/install-openwrt.sh | sh -s install
```
為了安全，沒有提供自動升級功能，如有需要自行將升級指令碼加入伺服器定時任務。

比如 crontab -e 中新增以下內容，每天凌晨 0 點執行升級：
```bash
# Linux
0 0 * * * curl -sL https://你的專案.你的子域.workers.dev/install.sh | bash -s install
```
</details>

<details>
<summary>解除安裝探針</summary>

```bash
# Linux
curl -sL https://你的專案.你的子域.workers.dev/install.sh | bash -s uninstall
# Alpine
curl -sL https://你的專案.你的子域.workers.dev/install-alpine.sh | sh -s uninstall
# OpenWrt
curl -sL https://你的專案.你的子域.workers.dev/install-openwrt.sh | sh -s uninstall
```

Windows 系統

啟動cf-server-monitor.pyw後，GUI中關閉自啟動（如已開啟）。點刪除，再刪除這個檔案即可

</details>

<details>
<summary>安全增強</summary>

### Turnstile 配置（可選）

如需啟用 Turnstile 人機驗證，可用基本攔截惡意攻擊避免額度超出，需在管理後臺配置：

1. 登入 [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. 建立站點，獲取 **Site Key** 和 **Secret Key**
3. 在管理後臺 → 全域性設定中啟用 Turnstile 並填入金鑰

### JWT 配置（可選）

如需自定義 JWT 金鑰：

1. 生成一個至少 32 位的隨機字串作為 JWT Secret
2. 在管理後臺 → 全域性設定 → 安全設定中填入 JWT Secret
3. 儲存後系統將使用自定義金鑰進行 token 簽名

### CORS 跨域配置（可選）

如需允許特定域名跨域訪問 Workers API，可配置允許的來源：

1. 在 Workers & Pages 頁面的 **Settings** → **Variables and secrets** 中新增 `CORS_ALLOWED_ORIGINS`
2. 值設定為允許跨域的域名，多個域名用逗號分隔，例如：`https://example.com,https://www.example.com`
3. 不設定此變數或留空時，預設僅允許同源請求

### Cloudflare 額度查詢（可選）

如需在後臺查詢 D1 當日讀寫額度和 Workers 請求量：

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/workers-and-pages)右下角複製當前賬戶的 **Account ID**
2. 在[API Tokens 頁面](https://dash.cloudflare.com/profile/api-tokens)建立具備 **Account Analytics Read** 許可權的 Cloudflare API Token
3. 在管理後臺 → 全域性設定 → Cloudflare 設定中填入 Account ID 和 API Token
4. 儲存後點擊 **查詢 D1 額度** 檢視 UTC 當日用量與下次重置時間

</details>

<details>
<summary>其他設定</summary>

### 前臺大盤

訪問 `https://你的專案.你的子域.workers.dev/` 檢視：

- **卡片檢視**：伺服器狀態概覽（含即時網速和本月流量）
- **表格檢視**：詳細資料列表
- **地圖檢視**：全球伺服器分佈
- **過濾器**：按國家篩選伺服器

### 伺服器詳情

點選任意伺服器卡片進入詳情頁：

- 即時 CPU/GPU/記憶體/磁碟/網路/負載
- 7天曆史趨勢圖
- 滑鼠懸停檢視具體時間點的數值
- 國內四線路延遲與丟包率追蹤

> **注意**：檢視1小時以上的歷史資料需要登入管理員賬戶。

### 主題切換

管理後臺支援自定義 CSS主題

### 拖拽排序

在管理後臺的伺服器列表中，可以通過拖拽調整伺服器的顯示順序

### 伺服器隱藏

可以將特定伺服器設定為對非登入使用者隱藏：

1. 進入管理後臺 `/#/admin`
2. 點選伺服器行右側的 **✏️ 編輯** 按鈕
3. 勾選 **Hide from Public** 選項
4. 點選 **儲存**

### 資料庫管理

管理後臺提供資料庫維護功能，可在 "Database Management" 標籤頁中找到：

1. **升級資料庫**：將資料庫結構升級到最新版本，適用於舊版本使用者升級
   - 點選「Upgrade Database」按鈕
   - 確認升級操作
   - 系統會自動執行資料庫升級指令碼
2. **重建資料庫**：清空並重建整個資料庫（⚠️ 危險操作）
   - 點選「Rebuild Database」按鈕
   - 確認重建操作（此操作將刪除所有資料）
   - 系統會清空並重新初始化資料庫

> **注意**：
>
> - 重建資料庫是不可逆操作，請確保已備份重要資料
> - 升級資料庫不會刪除現有資料，僅會更新表結構
> - 從舊版本升級到包含 GPU/丟包率監控的新版本後，需要先執行升級資料庫，再重新安裝或升級探針以採集新欄位

## 🔔 離線告警配置

在管理後臺 → 全域性設定中配置：

**Telegram 告警：**

1. 建立 Telegram Bot（通過 [@BotFather](https://t.me/BotFather)）
2. 獲取 Bot Token
3. 獲取 Chat ID（通過 [@userinfobot](https://t.me/userinfobot)）
4. 填入後臺設定並開啟

**企業微信告警：**

1. 建立群機器人，獲取 Webhook URL
2. 填入 Bot Token 欄位
3. Chat ID 留空

</details>

<details>
<summary>定時任務</summary>

系統包含以下定時任務（UTC 時區）：

| 任務   | 觸發時間          | 說明                                    |
| ---- | ------------- | ------------------------------------- |
| 離線檢測 | `*/1 * * * *` | 每分鐘檢測離線節點併發送告警 |
| 合併任務 | `0 * * * *`   | 每小時執行，根據日期判斷執行：每月1號資料輪換、每月8號清理舊錶、每天12:00伺服器到期檢測 |

</details>

## 📁 專案結構

<details>
<summary>專案結構</summary>

```
CF-Server-Monitor/
├── public/
│   ├── cf-server-monitor.pyw   # Windows 探針指令碼（.pyw 不顯示 CMD 視窗）
│   ├── install.sh              # 一鍵安裝指令碼 - systemd 系統 (Ubuntu/Debian/CentOS)
│   ├── install-alpine.sh       # 一鍵安裝指令碼 - OpenRC 系統 (Alpine Linux)
│   ├── install-openwrt.sh      # 一鍵安裝指令碼 - procd 系統 (OpenWrt/LEDE)
│   └── logo.svg                # Logo
├── src/
│   ├── index.js                # 後端主入口 - 路由分發 + Durable Object 匯出
│   ├── database/
│   │   ├── schema.js           # 資料庫初始化、歷史資料儲存
│   │   └── updateDatabase.js   # 資料庫升級處理
│   ├── durable/
│   │   └── MetricsBroadcaster.js  # Durable Object：WebSocket 即時推送廣播中心
│   ├── middleware/
│   │   └── auth.js             # 認證中介軟體
│   ├── handlers/
│   │   ├── admin.js            # 後臺管理 API
│   │   ├── dashboard.js        # 前臺大盤 API
│   │   ├── frontend.js         # 前端資源服務
│   │   └── update.js           # 資料上報處理 + 廣播到 DO
│   ├── services/
│   │   └── notification.js     # 通知服務
│   ├── utils/
│   │   ├── cache.js            # 快取工具
│   │   └── settings.js         # 設定管理
│   └── frontend/               # Vue 3 前端應用
│       ├── components/         # Vue 元件
│       │   ├── Footer.vue
│       │   ├── ServerCard.vue
│       │   └── TerminalHeader.vue
│       ├── views/              # 頁面檢視
│       │   ├── Admin.vue
│       │   ├── Dashboard.vue    # 首頁（接入 WebSocket 即時推送）
│       │   └── ServerDetail.vue # 詳情頁（接入 WebSocket 即時推送）
│       ├── router/
│       │   └── index.js        # Vue Router 配置
│       ├── utils/
│       │   ├── api.js          # API 請求封裝 + WebSocket 客戶端
│       │   └── i18n.js         # 國際化配置
│       ├── styles/             # 樣式檔案
│       │   ├── light.css
│       │   └── main.css
│       ├── App.vue             # 根元件
│       └── main.js             # 前端入口
├── scripts/
│   └── build.js                # 前端構建指令碼
├── test/
│   ├── README.md               # 測試工具說明
│   └── generate-sql.js         # 測試資料生成工具
│   ├── mock-sender.sh          # 模擬資料傳送指令碼（macOS）
├── index.html
├── jsconfig.json               # JS 配置
├── package.json
├── vite.config.js              # Vite 配置
├── wrangler.toml               # 本地測試 wrangler 配置
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions 自動部署
```

</details>

## ❓ 常見問題

<details>
<summary>常見問題</summary>

**Q: 部署後返回API\_SECRET is required**

如果是部署後丟失API\_SECRET，請在Workers & Pages頁面，點選 **Settings**，修改Build configuration的Deploy command為：`npx wrangler deploy --keep-vars`，重新設定API\_SECRET，下次部署會繼續保留。舊key可用通過`cat /etc/systemd/system/cf-probe.service`或者`cat /etc/init.d/cf-probe`獲取。

如果是GitHub Action 自動部署，確保在 GitHub Secrets 中設定了 API\_SECRET 金鑰。

如果是一鍵部署，確保在Cloudflare Workers & Pages 中設定了 API\_SECRET 金鑰。

**Q: 探針安裝後不顯示資料？**

檢查伺服器是否能訪問 Worker URL，檢視探針日誌：`journalctl -u cf-probe -f`

**Q: 如何更換 API\_SECRET？**

更新 Cloudflare Workers & Pages 中的 `API_SECRET`，重新部署，並在所有伺服器上重新安裝探針。如果是GitHub Action 自動部署，需要在 GitHub Secrets 中更新 `API_SECRET`。

**Q: D1 資料庫免費額度夠用嗎？**

Cloudflare D1 免費版提供 5GB 儲存和 5M 讀取行/日、100K 寫入行/日，足以支援伺服器監控。

寫入行：1臺伺服器一天佔用寫入行是2.88k，免費寫入額度是100k/天，理論上可用支援34臺伺服器的監控，如果修改上報頻率為120秒可用翻倍。

讀取行：1臺伺服器一天佔用讀行是8k左右，如果開啟站點相容，大概是1.6k，免費讀行是5M/天，非常充裕
主要是前端訪問消耗的次數，限制了非登入使用者1小時以上的檢視，只要不被暴力刷額度，絕對夠用，如果不放心，可用在後臺開啟Turnstile人機驗證，或者也可以選擇僅登入檢視

**Q: D1 資料庫免費額度超出扣費嗎？**

超出不扣費，只會限制訪問，第二天北京時間08:00重置

**Q: 遇到其他異常問題怎麼辦？**

可以嘗試在後臺數據庫管理中：

- 升級資料庫：嘗試修復資料庫結構問題
- 重置資料庫：清空並重建資料庫（⚠️ 注意：此操作將清除所有資料，請確保已備份重要資訊）

**Q: 忘記密碼？**

進入Cloudflare後臺，進入D1資料庫（server-monitor-db），點選右上角explore data，進入後點擊左側的`setting`表，雙擊`site_options`右側的value，可以看到`使用者名稱`和md5加密的`密碼`，password修改成`e10adc3949ba59abbe56e057f20f883e`，即預設密碼`123456`，右上角點Commit 1 change，彈出的確認框點確認即可。然後訪問後臺用預設密碼登入即可。

**Q: 地區並列顯示港澳臺和國家**

為了方便使用者檢視，前端並列顯示港澳臺和國家，但是旗幟都統一是中國國旗，後端返回的是region欄位，這裡是輸出國家和地區，而不是國家，地圖符合中華人民共和國自然資源部標準地圖製作（審圖號：GS(2023)2767 號）。

</details>

## 📸 介面預覽

<details>
<summary>介面預覽</summary>

![image](https://github.com/user-attachments/assets/0527f847-4631-47ad-8315-3f80ebba42d2)
![image](https://github.com/user-attachments/assets/a9c1aefd-42f7-4805-aa42-bbe9e58aed59)
![image](https://github.com/user-attachments/assets/527bcf04-3124-4f1c-b052-451bccae961d)
![image](https://github.com/user-attachments/assets/ac6f6fbb-b9fb-45cd-93e5-ca08bbad9ecb)
![image](https://github.com/user-attachments/assets/b5436816-54bd-4512-a65c-bf963fd4874c)
![image](https://github.com/user-attachments/assets/ba0d3605-ef64-4be1-884b-9506f20277a8)
![image](https://github.com/user-attachments/assets/197767cc-028b-4ec1-b41f-5cadc2b25629)

淺色風格
![image](https://github.com/user-attachments/assets/3a7f3204-0a68-4f59-9822-f7f1b5479822)
![image](https://github.com/user-attachments/assets/e100d984-3165-4f38-948a-625249b4600a)
![image](https://github.com/user-attachments/assets/7d266ff3-0db7-477b-8029-c76e42298002)

</details>

## 🛠️ 本地開發

<details>
<summary>本地開發步驟</summary>

### 環境要求

- Node.js 18+
- npm 或 pnpm

### 開發步驟

根目錄新建 `.env` 檔案，新增環境變數預設API\_SECRET：

```bash
API_SECRET = "123456"
```

然後執行以下命令進行本地開發：

```bash
# 安裝依賴
npm install

# 建立 D1 資料庫（首次）
npx wrangler d1 create server-monitor-db

# 前端開發模式（熱過載）
npm run dev

# 構建前端生產版本
npm run build:frontend

# 部署到 Cloudflare Workers
npm run deploy
```

定時任務

```
http://localhost:8787/cdn-cgi/handler/scheduled?cron=*/1+*+*+*+* // 每分鐘執行一次（離線檢測）
http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+*+*+*+* // 每小時執行一次（合併任務）
http://localhost:8787/cdn-cgi/handler/scheduled?cron=*+*+1+*+* // 每月一號執行一次（測試使用）
http://localhost:8787/cdn-cgi/handler/scheduled?cron=*+*+8+*+* // 每月8號執行一次（測試使用）
http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+12+*+*+* // 每天12點執行一次（測試使用）
```

### 本地測試資料

支援生成本地測試資料，方便在部署前進行功能測試：

1. 進入 `test` 目錄檢視詳細說明
2. 執行測試資料生成指令碼
3. 匯入生成的 SQL 資料到本地 D1 資料庫
4. 啟動本地開發伺服器進行測試

```
node test/generate-sql.js
wrangler d1 execute server-monitor-db --file=test/mock-data.sql
```

詳細步驟見 [test/README.md](test/README.md)

### API 介面測試

專案提供了 `api-check.js` 介面測試工具，用於驗證本地開發環境的 API 介面是否正常工作：

```bash
# 預設配置測試
node test/api-check.js

# 指定引數測試
node test/api-check.js --base-url=http://localhost:8787 --api-secret=123456

# 檢視幫助
node test/api-check.js --help
```

**測試覆蓋範圍：**

- 未登入介面：`/api/config`、`/api/servers`、`/api/server`、`/update` 等
- 登入流程：登入介面驗證
- 已登入介面：隱藏伺服器訪問、歷史資料查詢等
- 後臺管理：伺服器增刪改查、設定管理等

**選項引數：**

| 引數                 | 說明          | 預設值                     |
| ------------------ | ----------- | ----------------------- |
| `--base-url`       | 本地服務地址      | `http://localhost:8787` |
| `--api-secret`     | API\_SECRET | `123456`                |
| `--admin-user`     | 管理員使用者名稱      | `admin`                 |
| `--admin-password` | 管理員密碼       | 使用 API\_SECRET          |
| `--timeout`        | 請求超時時間(ms)  | `10000`                 |

</details>

## 📄 許可證

MIT License

## 🙏 致謝

- [CF-Server-Monitor-Pro](https://github.com/a63414262/CF-Server-Monitor-Pro) 最初借鑑該專案，進行深度二次開發
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Chart.js](https://www.chartjs.org/)
- [Leaflet](https://leafletjs.com/)
- 感謝 [LINUX DO](https://linux.do/) 社群的支援與推廣

