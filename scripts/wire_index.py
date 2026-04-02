import pathlib
p = pathlib.Path("frontend/index.html")
s = p.read_text(encoding="utf-8")
ins = """
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
if "btnJsonStagingAdd" not in s.split("getElementById('btnJsonStagingAdd')")[1][:80] if "getElementById('btnJsonStagingAdd')" in s else True:
    s = s.replace("    refreshMerchantSelect();\n  </script>", ins + "    refreshMerchantSelect();\n  </script>", 1)
    p.write_text(s, encoding="utf-8")
    print("wired index buttons")
else:
    print("skip")
