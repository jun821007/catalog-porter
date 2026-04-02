import pathlib
P = pathlib.Path("frontend/merchants.html")
s = P.read_text(encoding="utf-8")
INS = """    document.getElementById('btnJsonStagingAdd').onclick = () => {\n      const raw = document.getElementById('jsonPaste').value.trim();\n      if (!raw) { alert('請先貼上 JSON'); return; }\n      try {\n        const parsed = extractJsonObject(raw);\n        const arr = getWechatAlbumItemsArray(parsed);\n        if (!arr || !arr.length) { alert('此段沒有 items 或 result.items'); return; }\n        jsonStagingSegments.push(raw);\n        document.getElementById('jsonPaste').value = '';\n        renderJsonStaging();\n      } catch (e) { alert(e.message || 'JSON 無效'); }\n    };\n    document.getElementById('btnJsonStagingClear').onclick = () => {\n      jsonStagingSegments = [];\n      renderJsonStaging();\n    };\n"""
needle = "    document.getElementById('merchantFormSave').onclick = () => { void saveMerchantForm(); };"
if INS.strip() not in s and needle in s:
    s = s.replace(needle, INS + needle, 1)
    P.write_text(s, encoding="utf-8")
    print("inserted handlers")
else:
    print("skip handlers")
