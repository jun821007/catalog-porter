import pathlib
P = pathlib.Path("frontend/merchants.html")
s = P.read_text(encoding="utf-8")
OLD = """    <details id=\"jsonPanel\" class=\"surface-card rounded-xl p-6 border mb-6\">\n      <summary class=\"cursor-pointer text-sm font-medium select-none\">&#36028;&#19978;&#24494;&#21830;&#30456;&#20874; JSON&#65288;result.items&#65289;</summary>\n      <p class=\"text-xs json-hint mt-2 mb-2 leading-relaxed\">&#36028;&#19978;&#23436;&#25972; JSON&#65292;&#25110;&#20677;&#21547; <code class=\"px-1 rounded\" style=\"background:#f1f5f9;color:#334155\">result.items</code> &#30340;&#29255;&#27573;&#12290;&#35299;&#26512;&#24460;&#33287;&#32178;&#22336;&#25235;&#21462;&#30456;&#21516;&#21015;&#34920;&#65292;&#21487;&#21246;&#36984;&#24460;&#20837;&#24235;&#65288;&#20351;&#29992; imgsSrc &#20840;&#37096;&#22294;&#29255;&#65292;&#20837;&#24235;&#26178;&#19981;&#21478;&#38283;&#27983;&#35261;&#22120;&#28145;&#21270;&#65289;&#12290;</p>\n      <textarea id=\"jsonPaste\" class=\"w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[140px]\" placeholder=\"{ &quot;result&quot;: { &quot;items&quot;: [...] } }\" spellcheck=\"false\"></textarea>\n      <button type=\"button\" id=\"btnParseJson\" class=\"mt-3 px-4 py-2 rounded-lg text-sm font-medium\">&#35299;&#26512;&#20006;&#36617;&#20837;&#21015;&#34920;</button>\n    </details>"""
NEW = """    <details id=\"jsonPanel\" class=\"surface-card rounded-xl p-6 border mb-6\">\n      <summary class=\"cursor-pointer text-sm font-medium select-none\">預覽列表（解析並載入下方網格）</summary>\n      <p class=\"text-xs json-hint mt-2 mb-2 leading-relaxed\">與上方「已加入段數」相同邏輯：含待貼上框內容一併解析。可勾選後入庫（使用 imgsSrc 全部圖片，入庫時不另開瀏覽器深化）。</p>\n      <button type=\"button\" id=\"btnParseJson\" class=\"mt-2 px-4 py-2 rounded-lg text-sm font-medium\">解析並載入列表</button>\n    </details>"""
if OLD in s:
    s = s.replace(OLD, NEW, 1)
    print("jsonPanel ok")
else:
    print("jsonPanel skip")
P.write_text(s, encoding="utf-8")
