import pathlib
import re
ROOT = pathlib.Path('.')
P = ROOT / 'frontend' / 'merchants.html'
s = P.read_text(encoding='utf-8')
if 'jsonStagingSegments' not in s:
    s = s.replace(
        'let merchantStagingUrls = [];',
        'let merchantStagingUrls = [];\n    let jsonStagingSegments = [];\n    let merchantEditCatalogSnapshot = [];',
        1,
    )
OLD = """      <div class=\"mb-2\">\n        <span class=\"text-xs text-slate-600\">已加入 <span id=\"merchantStagingCount\">0</span> 個網址</span>\n        <div id=\"merchantStagingList\" class=\"mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]\"></div>\n      </div>\n      <div class=\"flex gap-2 justify-end mt-4 flex-wrap\">\n        <button type=\"button\" id=\"merchantFormSave\" class=\"px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium\">儲存</button>\n      </div>\n"""
INS = """      <div class=\"mb-2\">\n        <span class=\"text-xs text-slate-600\">已加入 <span id=\"merchantStagingCount\">0</span> 個網址</span>\n        <div id=\"merchantStagingList\" class=\"mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]\"></div>\n      </div>\n      <p class=\"text-xs text-slate-500 mb-2 mt-4\">多段 JSON：貼上後按「加入 JSON 此段」可累積數份，儲存時合併；編輯時新 JSON 會併入原有快照（自動去重）。</p>\n      <label class=\"block text-xs text-slate-600 mb-1\" for=\"jsonPaste\">微商相冊 JSON（result.items）</label>\n      <textarea id=\"jsonPaste\" class=\"field w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[120px]\" placeholder=\"{ &quot;result&quot;: { &quot;items&quot;: [...] } }\" spellcheck=\"false\"></textarea>\n      <div class=\"flex flex-wrap gap-2 mt-2 mb-2\">\n        <button type=\"button\" id=\"btnJsonStagingAdd\" class=\"px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-900 text-xs font-medium\">加入 JSON 此段</button>\n        <button type=\"button\" id=\"btnJsonStagingClear\" class=\"px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs bg-white\">清空 JSON 待加入</button>\n      </div>\n      <div class=\"mb-4\">\n        <span class=\"text-xs text-slate-600\">已加入 <span id=\"jsonStagingCount\">0</span> 段 JSON（儲存時合併）</span>\n        <div id=\"jsonStagingList\" class=\"mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]\"></div>\n      </div>\n      <div class=\"flex gap-2 justify-end mt-2 flex-wrap\">\n        <button type=\"button\" id=\"merchantFormSave\" class=\"px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium\">儲存</button>\n      </div>\n"""
if OLD in s:
    s = s.replace(OLD, INS, 1)
    print('html block ok')
else:
    print('html block skip')
P.write_text(s, encoding='utf-8')
