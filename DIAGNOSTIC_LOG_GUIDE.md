# 入庫只有一張圖 — 診斷 log 說明

## 已佈署的 log 位置

1. **`[CP:fetch] returning item[X]`** — `/fetch` 回傳前  
   - `imageUrls.length=N`：該筆回傳幾張圖  
   - `keys=...`：該筆 item 有哪些欄位  

2. **`[CP:import] item[X]`** — `/import` 收到時  
   - `imageUrls=MISSING` 或 `imageUrls=N`  
   - `imageUrl=yes/no`  
   - `keys=...`  

3. **`[CP:import] rawUrls.length=N from=...`** — 組 `rawUrls` 時  
   - `from=imageUrls`：從 `imageUrls` 陣列來  
   - `from=imageUrl`：從單一 `imageUrl` 來  

4. **`[CP:import] item image_paths count=N`** — 實際寫入 DB 的圖數量  

---

## 如何判斷問題出在哪一段

| 情境 | fetch log | import item log | rawUrls | 結論 |
|------|-----------|-----------------|---------|------|
| A | `imageUrls.length=1` | `imageUrls=1` | `rawUrls.length=1` | **抓取階段就只抓到 1 張**（list 頁縮圖） |
| B | `imageUrls.length=5` | `imageUrls=MISSING` | `rawUrls.length=1` | **前端未正確傳送 imageUrls**（sessionStorage 或請求 body） |
| C | `imageUrls.length=5` | `imageUrls=5` | `rawUrls.length=1` | **後端 rawUrls 組錯** |
| D | 全部正確 | `image_paths count=1` | - | **DB 寫入或 insertItem 邏輯有問題** |

---

## 最可能原因

### 1. 未勾選「深入相冊」(deepScrape)

商品列表頁每個格子通常只有一張縮圖，`getImgs(container)` 自然只會得到 1 張。  
要拿到多圖，必須勾選「深入相冊」，讓程式點進每個商品詳情頁再抓圖。

→ 若 fetch log 顯示 `imageUrls.length=1`，就是這種情況。

### 2. sessionStorage 容量限制

若商品多、每筆多圖，`catalog_porter_fetch` 資料可能很大，超過 sessionStorage 約 5MB 限制，導致存／取時被截斷或損壞。

→ 若 fetch 回傳多圖，但 import log 出現 `imageUrls=MISSING`，可考慮這點。

### 3. 詳情頁 DOM 結構不同

深入相冊時，若詳情頁的 gallery 結構與目前 selector 不符，`detailImgs` 會只抓到少數或 0 張圖，後面就會回退成單張。

---

## 操作建議

1. 勾選「深入相冊」後再抓一次  
2. 部署到 Railway，完整跑一次抓取＋入庫  
3. 到 Railway Logs 搜尋 `[CP:fetch]` 和 `[CP:import]`  
4. 依上面表格對照 log，判斷是 A / B / C / D 哪一種  

若要，我可以幫你把這段診斷邏輯做成簡單的 log 檢查腳本，或直接一起檢查你的 log 輸出。
