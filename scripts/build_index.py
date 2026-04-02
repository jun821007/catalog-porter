import pathlib
idx = pathlib.Path("frontend/index.html")
m = pathlib.Path("frontend/merchants.html")
html = idx.read_text(encoding="utf-8")
ms = m.read_text(encoding="utf-8")

# Extract merchant JS block from merchants (loadMerchantsForList through renderMerchantList inclusive)
a = ms.find("async function loadMerchantsForList()")
b = ms.find("    function proxy(u)", a)
merchant_js = ms[a:b]
# Patch saveMerchantForm success for index page
old_succ = """        resetMerchantForm();\n        await loadMerchantsForList();\n        renderMerchantList();\n        alert(wasEdit ? '已儲存' : '已新增');"""
new_succ = """        const savedMerchantId = j.merchant && j.merchant.id;\n        resetMerchantForm();\n        await loadMerchantsForList();\n        renderMerchantList();\n        alert(wasEdit ? '已儲存' : '已新增');\n        await refreshMerchantSelect(savedMerchantId);"""
if old_succ in merchant_js:
    merchant_js = merchant_js.replace(old_succ, new_succ, 1)

del_js = """        del.onclick = async () => {\n          if (!confirm('刪除此商家捷徑？')) return;\n          try {\n            const r = await fetch('/api/merchants/' + encodeURIComponent(m.id), { method: 'DELETE' });\n            const j = await r.json();\n            if (!j.ok) throw new Error(j.error || '刪除失敗');\n            await loadMerchantsForList();\n            renderMerchantList();\n          } catch (e) { alert(e.message || '刪除失敗'); }\n        };"""
del_js2 = """        del.onclick = async () => {\n          if (!confirm('刪除此商家捷徑？')) return;\n          try {\n            const r = await fetch('/api/merchants/' + encodeURIComponent(m.id), { method: 'DELETE' });\n            const j = await r.json();\n            if (!j.ok) throw new Error(j.error || '刪除失敗');\n            await loadMerchantsForList();\n            renderMerchantList();\n            await refreshMerchantSelect();\n          } catch (e) { alert(e.message || '刪除失敗'); }\n        };"""
merchant_js = merchant_js.replace(del_js, del_js2, 1)

INSERT_HTML = """
      <hr class=\"border-slate-200 my-4\" />
      <h3 class=\"text-sm font-medium text-slate-700 mb-2\">新增／編輯商家（與管理商家相同）</h3>
      <div id=\"merchantList\" class=\"text-sm space-y-2 mb-4 min-h-[2rem]\"></div>
      <h3 id=\"merchantFormHeading\" class=\"text-sm font-medium text-slate-700 mb-2\">新增商家</h3>
      <label class=\"block text-xs text-slate-600 mb-1\" for=\"newMerchantName\">名稱（全站唯一）</label>
      <input id=\"newMerchantName\" type=\"text\" class=\"field w-full border rounded-lg px-3 py-2 mb-2 text-sm\" autocomplete=\"off\" />
      <label class=\"block text-xs text-slate-600 mb-1\" for=\"merchantPasteInput\">貼上相冊網址或含連結的文字／JSON</label>
      <textarea id=\"merchantPasteInput\" class=\"field w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[88px]\" placeholder=\"https://... 或貼整段 JSON\" spellcheck=\"false\"></textarea>
      <div class=\"flex flex-wrap gap-2 mt-2 mb-2\">
        <button type=\"button\" id=\"btnMerchantPasteAdd\" class=\"px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium\">加入此段</button>
        <button type=\"button\" id=\"btnMerchantStagingClear\" class=\"px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs bg-white\">清空待加入</button>
        <button type=\"button\" id=\"btnMerchantNewMode\" class=\"px-3 py-1.5 rounded-lg border border-violet-300 text-violet-800 text-xs bg-violet-50 hidden\">改為新增商家</button>
      </div>
      <div class=\"mb-2\">
        <span class=\"text-xs text-slate-600\">已加入 <span id=\"merchantStagingCount\">0</span> 個網址</span>
        <div id=\"merchantStagingList\" class=\"mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]\"></div>
      </div>
      <p class=\"text-xs text-slate-500 mb-2 mt-4\">多段 JSON：貼上後按「加入 JSON 此段」可累積數份，儲存時合併；編輯時新 JSON 會併入原有快照（自動去重）。</p>
      <label class=\"block text-xs text-slate-600 mb-1\" for=\"jsonPaste\">微商相冊 JSON（result.items）</label>
      <textarea id=\"jsonPaste\" class=\"field w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[120px]\" placeholder=\"{ &quot;result&quot;: { &quot;items&quot;: [...] } }\" spellcheck=\"false\"></textarea>
      <div class=\"flex flex-wrap gap-2 mt-2 mb-2\">
        <button type=\"button\" id=\"btnJsonStagingAdd\" class=\"px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-900 text-xs font-medium\">加入 JSON 此段</button>
        <button type=\"button\" id=\"btnJsonStagingClear\" class=\"px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs bg-white\">清空 JSON 待加入</button>
      </div>
      <div class=\"mb-4\">
        <span class=\"text-xs text-slate-600\">已加入 <span id=\"jsonStagingCount\">0</span> 段 JSON（儲存時合併）</span>
        <div id=\"jsonStagingList\" class=\"mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]\"></div>
      </div>
      <div class=\"flex gap-2 justify-end mt-2 mb-4 flex-wrap\">
        <button type=\"button\" id=\"merchantFormSave\" class=\"px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium\">儲存</button>
      </div>
"""

needle = "        <p class=\"text-xs text-slate-500 mt-2\">選商家後只會載入「商品快照」，不會自動填網址（管理頁存的相冊連結可能是圖片直連，無法抓取）。若要線上抓取，請自行貼<strong>相冊頁</strong>網址到下方欄位。</p>\n      </div>\n      <label for=\"url\""
if needle in html and "merchantFormSave" not in html:
    html = html.replace(needle, "        <p class=\"text-xs text-slate-500 mt-2\">選商家後只會載入「商品快照」，不會自動填網址（管理頁存的相冊連結可能是圖片直連，無法抓取）。若要線上抓取，請自行貼<strong>相冊頁</strong>網址到下方欄位。</p>\n      </div>" + INSERT_HTML + "\n      <label for=\"url\"", 1)
    print("inserted merchant form html")

JSONP = """    <div class=\"flex gap-3 mb-4 flex-wrap items-center\">"""
JSONP2 = """    <details id=\"jsonPanel\" class=\"surface-card rounded-xl p-6 border mb-6\">\n      <summary class=\"cursor-pointer text-sm font-medium select-none\">預覽列表（解析並載入下方網格）</summary>\n      <p class=\"text-xs json-hint mt-2 mb-2 leading-relaxed\" style=\"color:#64748b\">與上方「已加入段數」相同邏輯：含待貼上框內容一併解析。</p>\n      <button type=\"button\" id=\"btnParseJson\" class=\"mt-2 px-4 py-2 rounded-lg text-sm font-medium\">解析並載入列表</button>\n    </details>\n    <div class=\"flex gap-3 mb-4 flex-wrap items-center\">"""
if JSONP in html and 'id="jsonPanel"' not in html:
    html = html.replace(JSONP, JSONP2, 1)
    print("inserted json panel")

html = html.replace(
    '<button type="button" id="floatImport" disabled title="入庫">入庫</button>\n  <script>',
    '<button type="button" id="floatImport" disabled title="入庫">入庫</button>\n  <script src="/merchant-json.js"></script>\n  <script>',
    1,
)

old_rs = """    let merchantsCache = [];\n    async function refreshMerchantSelect() {\n      const sel = document.getElementById('merchantSelect');\n      const cur = sel.value;\n      sel.innerHTML = '';\n      const o0 = document.createElement('option');\n      o0.value = '';\n      o0.textContent = '未選擇';\n      sel.appendChild(o0);\n      try {\n        const r = await fetch('/api/merchants?_=' + Date.now(), { cache: 'no-store' });\n        const j = await r.json();\n        merchantsCache = (j.ok && Array.isArray(j.merchants)) ? j.merchants : [];\n        for (const m of merchantsCache) {\n          const o = document.createElement('option');\n          o.value = m.id;\n          o.textContent = m.name;\n          sel.appendChild(o);\n        }\n      } catch (_) { merchantsCache = []; }\n      if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;\n      else sel.value = '';\n      const v = document.getElementById('merchantSelect').value;\n      if (v) void loadMerchantCatalog(v);\n    }"""

new_rs = """    let merchantsCache = [];\n    let merchantEditId = null;\n    let merchantStagingUrls = [];\n    let jsonStagingSegments = [];\n    let merchantEditCatalogSnapshot = [];\n""" + merchant_js + """\n    async function refreshMerchantSelect(preferredId) {\n      await loadMerchantsForList();\n      if (document.getElementById('merchantList')) renderMerchantList();\n      const sel = document.getElementById('merchantSelect');\n      let cur = preferredId != null ? preferredId : sel.value;\n      sel.innerHTML = '';\n      const o0 = document.createElement('option');\n      o0.value = '';\n      o0.textContent = '未選擇';\n      sel.appendChild(o0);\n      try {\n        const r = await fetch('/api/merchants?_=' + Date.now(), { cache: 'no-store' });\n        const j = await r.json();\n        merchantsCache = (j.ok && Array.isArray(j.merchants)) ? j.merchants : [];\n        for (const m of merchantsCache) {\n          const o = document.createElement('option');\n          o.value = m.id;\n          o.textContent = m.name;\n          sel.appendChild(o);\n        }\n      } catch (_) { merchantsCache = []; }\n      if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;\n      else sel.value = '';\n      const v = document.getElementById('merchantSelect').value;\n      if (v) void loadMerchantCatalog(v);\n    }"""

if old_rs in html:
    html = html.replace(old_rs, new_rs, 1)
    print("replaced refresh + injected merchant block")
else:
    print("WARN: old_rs not found")

# Wire merchant + json buttons + parse (from merchants tail)
tail = """
    document.getElementById('btnMerchantPasteAdd').onclick = () => { addPasteToStaging(); };
    document.getElementById('btnMerchantStagingClear').onclick = () => {
      merchantStagingUrls = [];
      renderMerchantStaging();
    };
    document.getElementById('btnMerchantNewMode').onclick = () => { resetMerchantForm(); };
    document.getElementById('btnJsonStagingAdd').onclick = () => {
      const raw = document.getElementById('jsonPaste').value.trim();
      if (!raw) { alert('請先貼上 JSON'); return; }
      try {
        const parsed = extractJsonObject(raw);
        const arr = getWechatAlbumItemsArray(parsed);
        if (!arr || !arr.length) { alert('此段沒有 items 或 result.items'); return; }
        jsonStagingSegments.push(raw);
        document.getElementById('jsonPaste').value = '';
        renderJsonStaging();
      } catch (e) { alert(e.message || 'JSON 無效'); }
    };
    document.getElementById('btnJsonStagingClear').onclick = () => {
      jsonStagingSegments = [];
      renderJsonStaging();
    };
    document.getElementById('merchantFormSave').onclick = () => { void saveMerchantForm(); };
    document.getElementById('btnParseJson').onclick = () => {
      statusEl.textContent = '解析中…';
      setTimeout(() => {
        try {
          const mapped = mapFromJsonSegments(jsonStagingSegments, document.getElementById('jsonPaste').value);
          if (!mapped.length) {
            alert('沒有可用項目：請先「加入 JSON 此段」或貼上含 result.items 的內容');
            statusEl.textContent = '';
            return;
          }
          items = mapped;
          importSkipEnrich = true;
          statusEl.textContent = 'JSON 已載入 ' + items.length + ' 筆（入庫沿用 API 圖片，不另開深化）';
          renderGrid();
          saveToStorage();
          const jp = document.getElementById('jsonPanel');
          if (jp && !jp.open) jp.open = true;
        } catch (e) {
          statusEl.textContent = '';
          alert(e.message || '解析失敗');
        }
      }, 0);
    };
"""

if "btnJsonStagingAdd" not in html and "refreshMerchantSelect();" in html:
    html = html.replace(
        "    refreshMerchantSelect();\n  </script>",
        tail + "    refreshMerchantSelect();\n  </script>",
        1,
    )
    print("wired tail")

idx.write_text(html, encoding="utf-8")
print("index done")
