p = r"frontend/merchants.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
old = """    async function saveMerchantForm() {
      const name = document.getElementById("newMerchantName").value.trim();
      if (!name) { alert("請輸入商家名稱"); return; }
      if (!merchantStagingUrls.length) {
        alert("請至少加入一個網址（按「加入此段」累積）");
        return;
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      try {
        let r;
        if (merchantEditId) {
          r = await fetch("/api/merchants/" + encodeURIComponent(merchantEditId), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, sources }),
          });
        } else {
          r = await fetch("/api/merchants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, sources }),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || "儲存失敗");
        if (!j.ok) throw new Error(j.message || j.error || "儲存失敗");
        resetMerchantForm();
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? "已儲存" : "已新增");
      } catch (e) { alert(e.message || "儲存失敗"); }
    }"""
new = """    async function saveMerchantForm() {
      const name = document.getElementById("newMerchantName").value.trim();
      if (!name) { alert("請輸入商家名稱"); return; }
      let catalogItems = [];
      const jsonRaw = document.getElementById("jsonPaste").value.trim();
      if (jsonRaw) {
        try {
          const parsed = extractJsonObject(jsonRaw);
          catalogItems = mapWechatAlbumItems(parsed);
        } catch (e) {
          alert(e.message || "JSON 解析失敗");
          return;
        }
      }
      if (!merchantStagingUrls.length && !catalogItems.length) {
        alert("請至少加入一個相冊網址，或貼上含商品的 JSON（result.items）");
        return;
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      const body = { name, sources, catalogItems };
      try {
        let r;
        if (merchantEditId) {
          r = await fetch("/api/merchants/" + encodeURIComponent(merchantEditId), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          r = await fetch("/api/merchants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || "儲存失敗");
        if (!j.ok) throw new Error(j.message || j.error || "儲存失敗");
        resetMerchantForm();
        document.getElementById("jsonPaste").value = "";
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? "已儲存" : "已新增");
      } catch (e) { alert(e.message || "儲存失敗"); }
    }"""
if old not in s:
    raise SystemExit("old saveMerchantForm not found")
s = s.replace(old, new, 1)
old2 = """        const n = (m.sources && m.sources.length) ? m.sources.length : 0;
        row.innerHTML = '<span class="truncate font-medium text-slate-800">' + (m.name || '').replace(/</g, '&lt;') + '</span><span class="text-xs text-slate-500">' + n + ' 網址</span>';"""
new2 = """        const n = (m.sources && m.sources.length) ? m.sources.length : 0;
        const snap = typeof m.catalogItemCount === 'number' ? m.catalogItemCount : 0;
        row.innerHTML = '<span class="truncate font-medium text-slate-800">' + (m.name || '').replace(/</g, '&lt;') + '</span><span class="text-xs text-slate-500">' + n + ' 網址 · ' + snap + ' 筆快照</span>';"""
if old2 not in s:
    raise SystemExit("old row not found")
s = s.replace(old2, new2, 1)
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("save + row ok")
