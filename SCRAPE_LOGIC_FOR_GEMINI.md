# Catalog Porter 抓取邏輯 — 深入相冊完整流程

## 技術棧
- **Puppeteer** headless browser
- 目標：微商相冊 wecatalog.cn / weshop 小程式 H5
- User-Agent：iPhone Safari 模擬

---

## 整體流程

```
1. page.goto(使用者輸入的 URL)  [timeout: 120000ms]
2. 若有關鍵字 → 搜尋（goto 搜尋頁 或 點輸入框輸入）
3. autoScroll 列表頁（捲動載入懶加載圖）
4. page.evaluate 抽取 raw 列表（每筆：imageUrls, imageUrl, description, goodsUrl）
5. 若勾選「深入相冊」且 raw.length 1~200：
   - 逐筆處理每個 raw[i]
   - 進入該筆詳情頁（goto goodsUrl 或 點擊第 i 個 grid item）
   - 在詳情頁滾動、抽 detailImgs
   - 用 detailImgs 覆寫 raw[i].imageUrls、raw[i].imageUrl
   - 回到列表頁，處理下一筆
6. 回傳 raw 給前端
```

---

## 超時設定（全部）

| 步驟 | 程式位置 | timeout | 說明 |
|------|----------|---------|------|
| 初次進入 URL | `page.goto(url)` | 120000ms (2 分鐘) | 首次載入 |
| 關鍵字搜尋頁 | `page.goto(searchUrl)` | 120000ms | 搜尋結果頁 |
| 單個商品詳情 | `page.goto(goodsUrl)` | 15000ms | 每個商品進入詳情 |
| 返回列表 | `page.goto(listUrl)` | 15000ms | 每筆處理完回列表 |
| HTTP /fetch 請求 | `res.setTimeout` | 600000ms (10 分鐘) | 整個 /fetch 最長等待 |
| 前端 AbortController | index.html | 480000ms (8 分鐘) | 前端 fetch 逾時 |

**問題**：UI 寫「深入相冊約 2–5 分鐘」，但初次 `page.goto` 只有 2 分鐘，慢網或慢站容易在進列表前就 timeout。

---

## 列表頁抽取邏輯 (page.evaluate)

### 容器 selector
```js
'.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]'
```

### getImgs(container)
- 在 container 內 `querySelectorAll('img')`
- 取 `data-src` / `data-original` / `data-lazy-src` / `src`
- 過濾：排除 `data:`、avatar/logo/icon 等
- 去重：用 `src.split('?')[0]` 當 key
- **結果**：列表每個格子通常只有 1 張縮圖

### getGoodsUrl(container)
依序檢查：
- container 本身是 `<a href*="goods">`
- `container.closest('a[href*="goods"]')`
- `a[href*="weshop/goods"]`、`a[href*="/goods/"]`、`a[href*="goods"]`
- `a[href*="/p/"]`、`a[href*="detail"]`、`a[href*="/item/"]`
- 其他 `a[href^="/"]` 或 `a[href^="http"]`

### 輸出格式
```js
{ imageUrls: [url1, url2, ...], imageUrl: url1, description: "...", goodsUrl: "..." | undefined }
```

---

## 深入相冊（多圖）邏輯

### 情境 A：直接貼單一商品 URL
- 條件：`raw.length === 1` 且 `listUrl.includes('/goods/')`
- 行為：不導航，直接在當前詳情頁 `page.evaluate` 抽 detailImgs

### 情境 B：列表多筆，逐筆進詳情
- 若有 `goodsUrl`：`page.goto(goodsUrl)` 進入
- 若無 `goodsUrl`：`page.evaluate` 點擊第 i 個 `.van-grid-item,...` 開啟詳情
- 進入後：`window.scrollBy(0,400)` 共 15 次，再 `scrollTo(0,0)`
- 等待 500ms
- 抽 detailImgs
- 回列表：有 goodsUrl 就 `page.goto(listUrl)`，否則 `page.keyboard.press('Escape')`

### detailImgs 抽取 (page.evaluate)

**優先 selector：**
```js
'.van-swipe__track img', '.swiper-wrapper img', '.swiper-slide img', '[class*="swiper"] img',
'[class*="gallery"] img', '[class*="preview"] img', '.van-image__img', '[class*="detail"] img',
'[class*="modal"] img', '[class*="popup"] img', '[class*="thumb"] img', '[class*="Thumb"] img'
```

**備援**：`document.querySelectorAll('img')`，過濾 `naturalWidth/height > 100`

**去重**：`src.split('?')[0]` 不重複

**過濾**：avatar/logo/icon/1x1/blank/placeholder/wx.qlogo/headimg

---

## autoScroll 邏輯

1. 捲動 `.van-tab__pane, [class*="scroll"], [class*="list"], [style*="overflow"]` 內層
2. 主頁面 `window.scrollBy(0, 400)` 最多 35 次，直到 scrollHeight 3 次不變
3. 再 `scrollBy(0, 400)` 25 次
4. 總耗時約 20–30 秒

---

## 已知問題

1. **timeout 不一致（會直接噴錯）**：初次 `page.goto` 僅 120000ms (2 分鐘)，但 UI 寫「深入相冊約 2–5 分鐘」。實測錯誤：`Navigation timeout of 120000 ms exceeded`，在進列表或搜尋頁時就超時。
2. **相冊 vs 商品**：微商相冊可能是「一本一本相冊」，每個相冊內多張圖；目前邏輯是針對「商品詳情頁」的 swiper/gallery，若相冊 DOM 結構不同，可能只抓到 1 張。
2. **相冊 vs 商品**：微商相冊可能是「一本一本相冊」，每個相冊內多張圖；目前邏輯是針對「商品詳情頁」的 swiper/gallery，若相冊 DOM 結構不同，可能只抓到 1 張。
3. **goodsUrl 遺失**：若列表結構沒有上述 `getGoodsUrl` 的連結，會改用「點擊第 i 個」；若 grid 順序與 raw 不一致，可能點錯或點不到。

---

## 關鍵程式檔
- `backend/server.js`：scrapePage、deepScrape、page.goto、timeout
- `frontend/index.html`：抓取按鈕、deepScrape checkbox、fetch timeout
