# Catalog Porter

微商相冊抓取 → 批量入庫 → 我的庫存 → 生成分享連結給客人。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## Railway 部署

1. **New Project** → Deploy from GitHub（或上傳此目錄）。
2. **Build**：使用本專案 `Dockerfile`（`railway.json` 已指定）。
3. **持久儲存（必做，否則重部署會清空圖片與資料）**  
   - Service → **Volumes** → Add Volume  
   - **Mount Path** 填：`/data`  
4. **Variables**（可選，預設已寫在 Dockerfile）  
   - `DATA_DIR` = `/data`  
5. **Networking** → Generate Domain，取得公開網址。

客人連結格式：`https://你的網域/share/分享ID`

## 環境變數

| 變數 | 說明 |
|------|------|
| `PORT` | Railway 自動注入 |
| `DATA_DIR` | 資料目錄（含 `catalog.json` 與 `uploads/`），生產請掛 Volume 到 `/data` |
| `PUPPETEER_EXECUTABLE_PATH` | Docker 內已設為 `/usr/bin/chromium` |

## 專案結構

- `backend/server.js` — API、Puppeteer 抓取、圖片代理  
- `backend/db.js` — JSON 檔案資料庫（`catalog.json`）  
- `frontend/index.html` — 抓取入庫  
- `frontend/inventory.html` — 庫存與分享  
- `frontend/share.html` — 客戶檢視頁