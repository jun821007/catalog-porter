# Catalog Porter 運作邏輯流程圖

## 一、整體架構與檔案對應

```mermaid
flowchart TB
    subgraph 前端
        A[frontend/index.html 抓取／導入頁]
        B[frontend/inventory.html 我的庫存頁]
        C[frontend/share.html 客戶檢視頁]
    end

    subgraph 後端
        S[backend/server.js Express 主程式]
    end

    subgraph 資料與儲存
        DB[data 或 SQLite 商品與分享紀錄]
        IMG[uploads 圖片檔案]
    end

    A <-->|/fetch, /proxy, /import| S
    B <-->|/api/items, /api/share| S
    C <-->|/api/share/:id| S
    S --> DB
    S --> IMG
```

---

## 二、頁面一：抓取／導入（index.html）

```mermaid
flowchart LR
    subgraph 使用者
        U1[輸入 wecatalog URL]
        U2[輸入搜尋關鍵字]
        U3[勾選要入庫的項目]
        U4[點擊 批量入庫]
    end

    subgraph frontend/index.html
        F1[表單送出]
        F2[呼叫 /fetch]
        F3[以 /proxy 顯示圖片]
        F4[渲染 Grid 與 Checkbox]
        F5[呼叫 /import]
    end

    subgraph backend/server.js
        API1[GET 或 POST /fetch Puppeteer 抓取]
        API2[GET /proxy 圖片代理]
        API3[POST /import 批量入庫]
    end

    subgraph 儲存
        D1[uploads 存圖]
        D2[寫入 DB]
    end

    U1 --> U2 --> F1 --> F2 --> API1
    API1 --> F3 --> F4
    F3 --> API2
    U3 --> U4 --> F5 --> API3 --> D1 --> D2
```

**涉及檔案：** `frontend/index.html`、`backend/server.js`、`uploads/`、資料庫

---

## 三、頁面二：我的庫存（inventory.html）

```mermaid
flowchart LR
    subgraph 使用者
        V1[開啟 我的庫存]
        V2[搜尋或篩選]
        V3[勾選要分享的商品]
        V4[點擊 生成分享連結]
    end

    subgraph frontend/inventory.html
        G1[GET /api/items]
        G2[顯示列表與 Checkbox]
        G3[POST /api/share]
        G4[顯示或複製連結]
    end

    subgraph backend/server.js
        API4[GET /api/items]
        API5[POST /api/share]
    end

    subgraph 儲存
        D3[讀取 DB]
        D4[新增分享紀錄]
    end

    V1 --> G1 --> API4 --> D3 --> G2
    V2 --> G1
    V3 --> V4 --> G3 --> API5 --> D4 --> G4
```

**涉及檔案：** `frontend/inventory.html`、`backend/server.js`、資料庫

---

## 四、頁面三：客戶檢視（share.html）

```mermaid
flowchart LR
    subgraph 客人
        K1[點開分享連結 /share/abc123]
    end

    subgraph 後端
        R1[GET /share/:id 回傳 share.html]
        R2[GET /api/share/:id 回傳該連結商品]
    end

    subgraph frontend/share.html
        H1[帶 shareId 請求]
        H2[GET /api/share/:id]
        H3[圖片經 /proxy 顯示]
        H4[唯讀 Grid 展示]
    end

    subgraph backend/server.js
        API6[GET /share/:id]
        API7[GET /api/share/:id]
    end

    subgraph 儲存
        D5[讀取分享紀錄與商品]
    end

    K1 --> R1 --> API6
    R1 --> H1 --> H2 --> API7 --> D5
    D5 --> H3 --> H4
```

**涉及檔案：** `frontend/share.html`、`backend/server.js`、資料庫

---

## 五、後端 API 總覽（server.js）

```mermaid
flowchart TB
    subgraph backend/server.js
        M1["/fetch: url, keyword，Puppeteer 抓 wecatalog"]
        M2["/proxy: url，串流回傳圖片"]
        M3["/import: 選中項目，存圖並寫 DB"]
        M4["/api/items: 搜尋參數，回傳庫存列表"]
        M5["/api/share POST: 選中 id，建立分享，回傳 shareId"]
        M6["/share/:id GET: 回傳 share.html"]
        M7["/api/share/:id GET: 回傳該分享的商品"]
    end
```

---

## 六、檔案一覽

| 檔案或目錄 | 用途 |
|------------|------|
| backend/server.js | Express、所有 API、Puppeteer 抓取、靜態檔 |
| frontend/index.html | 抓取／導入頁：URL、關鍵字、勾選、批量入庫 |
| frontend/inventory.html | 我的庫存頁：搜尋、勾選、生成分享連結 |
| frontend/share.html | 客戶檢視頁：依 shareId 唯讀顯示 |
| uploads/ | 入庫圖片存放目錄 |
| data/ 或 SQLite | 商品表、分享表 |
| package.json | 依賴 express, puppeteer, axios, cors 等 |

---

確認邏輯沒問題後，再依此開始寫代碼。
