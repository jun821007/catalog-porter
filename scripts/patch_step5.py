import pathlib
P = pathlib.Path("frontend/merchants.html")
s = P.read_text(encoding="utf-8")
OLD = """    document.getElementById('btnParseJson').onclick = () => {\n      const raw = document.getElementById('jsonPaste').value;\n      statusEl.textContent = '解析中…';\n      setTimeout(() => {\n        try {\n          const parsed = extractJsonObject(raw);\n          const mapped = mapWechatAlbumItems(parsed);\n          if (!mapped.length) {\n            alert('沒有可用項目（需有圖片網址）');\n            statusEl.textContent = '';\n            return;\n          }\n          items = mapped;\n          importSkipEnrich = true;\n          statusEl.textContent = 'JSON 已載入 ' + items.length + ' 筆（入庫沿用 API 圖片，不另開深化）';\n          renderGrid();\n          saveToStorage();\n          const jp = document.getElementById('jsonPanel');\n          if (jp && !jp.open) jp.open = true;\n        } catch (e) {\n          statusEl.textContent = '';\n          alert(e.message || '解析失敗');\n        }\n      }, 0);\n    };"""
NEW = """    document.getElementById('btnParseJson').onclick = () => {\n      statusEl.textContent = '解析中…';\n      setTimeout(() => {\n        try {\n          const mapped = mapFromJsonSegments(jsonStagingSegments, document.getElementById('jsonPaste').value);\n          if (!mapped.length) {\n            alert('沒有可用項目：請先「加入 JSON 此段」或貼上含 result.items 的內容');\n            statusEl.textContent = '';\n            return;\n          }\n          items = mapped;\n          importSkipEnrich = true;\n          statusEl.textContent = 'JSON 已載入 ' + items.length + ' 筆（入庫沿用 API 圖片，不另開深化）';\n          renderGrid();\n          saveToStorage();\n          const jp = document.getElementById('jsonPanel');\n          if (jp && !jp.open) jp.open = true;\n        } catch (e) {\n          statusEl.textContent = '';\n          alert(e.message || '解析失敗');\n        }\n      }, 0);\n    };"""
if OLD in s:
    s = s.replace(OLD, NEW, 1)
    print("parse ok")
s = s.replace(
    "edit.onclick = () => { startEditMerchant(m.id); };",
    "edit.onclick = () => { void startEditMerchant(m.id); };",
    1,
)
HOOK = """    document.getElementById('merchantFormSave').onclick = () => { void saveMerchantForm(); };\n    loadMerchantsForList().then(() => { renderMerchantList(); });"""
HOOK2 = """    document.getElementById('btnJsonStagingAdd').onclick = () => {\n      const raw = document.getElementById('jsonPaste').value.trim();\n      if (!raw) { alert('請先貼上 JSON'); return; }\n      try {\n        const parsed = extractJsonObject(raw);\n        const arr = getWechatAlbumItemsArray(parsed);\n        if (!arr || !arr.length) { alert('此段沒有 items 或 result.items'); return; }\n        jsonStagingSegments.push(raw);\n        document.getElementById('jsonPaste').value = '';\n        renderJsonStaging();\n      } catch (e) { alert(e.message || 'JSON 無效'); }\n    };\n    document.getElementById('btnJsonStagingClear').onclick = () => {\n      jsonStagingSegments = [];\n      renderJsonStaging();\n    };\n    document.getElementById('merchantFormSave').onclick = () => { void saveMerchantForm(); };\n    loadMerchantsForList().then(() => { renderMerchantList(); });"""
if "btnJsonStagingAdd" not in s and HOOK in s:
    s = s.replace(HOOK, HOOK2, 1)
    print("hooks ok")
P.write_text(s, encoding="utf-8")
