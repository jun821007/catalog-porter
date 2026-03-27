# -*- coding: utf-8 -*-
with open('backend/server.js', 'r', encoding='utf-8') as f:
    s = f.read()

# 1. Add fetch log before res.json
old1 = "    }\n    res.json({\n      ok: true,"
new1 = "    }\n    items.forEach((it, idx) => {\n      const n = (it.imageUrls && it.imageUrls.length) || 0;\n      console.log('[CP:fetch] returning item[' + idx + '] imageUrls.length=' + n + ' keys=' + Object.keys(it).join(','));\n    });\n    res.json({\n      ok: true,"
# Need to match the exact context - with hint = ''
old1 = "    } else if (kw && items.length > 0) {\n      hint = '';\n    }\n    res.json({\n      ok: true,"
new1 = "    } else if (kw && items.length > 0) {\n      hint = '';\n    }\n    items.forEach((it, idx) => {\n      const n = (it.imageUrls && it.imageUrls.length) || 0;\n      console.log('[CP:fetch] returning item[' + idx + '] imageUrls.length=' + n + ' keys=' + Object.keys(it).join(','));\n    });\n    res.json({\n      ok: true,"
if old1 in s:
    s = s.replace(old1, new1)
    print("Added fetch log")
else:
    print("Fetch log: old1 not found")

# 2. Enhance import log
old2 = "    console.log('[CP:import] received ' + items.length + ' items');\n    if (items.length > 0) {\n      const img = items[0].imageUrl || (items[0].imageUrls && items[0].imageUrls[0]);\n      console.log('[CP:import] item[0] imageUrl=' + (img || '(none)'));\n    }"
new2 = """    console.log('[CP:import] received ' + items.length + ' items');
    items.forEach((it, idx) => {
      const hasUrls = !!(it.imageUrls && Array.isArray(it.imageUrls));
      const n = hasUrls ? it.imageUrls.length : 0;
      const hasUrl = !!it.imageUrl;
      console.log('[CP:import] item[' + idx + '] imageUrls=' + (hasUrls ? n : 'MISSING') + ' imageUrl=' + (hasUrl ? 'yes' : 'no') + ' keys=' + Object.keys(it).join(','));
    });"""
if old2 in s:
    s = s.replace(old2, new2)
    print("Added import log")
else:
    print("Import log: old2 not found")

# 3. Add rawUrls log
old3 = "      const rawUrls = it.imageUrls && it.imageUrls.length ? it.imageUrls : [it.imageUrl || (it.imageUrls && it.imageUrls[0])];\n      const imageUrls = rawUrls.filter"
new3 = "      const rawUrls = it.imageUrls && it.imageUrls.length ? it.imageUrls : [it.imageUrl || (it.imageUrls && it.imageUrls[0])];\n      console.log('[CP:import] rawUrls.length=' + rawUrls.length + ' from=' + (it.imageUrls ? 'imageUrls' : 'imageUrl'));\n      const imageUrls = rawUrls.filter"
if old3 in s:
    s = s.replace(old3, new3)
    print("Added rawUrls log")
else:
    print("RawUrls log: old3 not found")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(s)
print("Done")
