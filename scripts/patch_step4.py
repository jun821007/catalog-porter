import pathlib
P = pathlib.Path("frontend/merchants.html")
s = P.read_text(encoding="utf-8")
a = "    function stripQuery(u) { return String(u || '').split('?')[0]; }"
b = "    function proxy(u) { return '/proxy?url=' + encodeURIComponent(u); }"
i = s.find(a)
j = s.find(b)
if i != -1 and j != -1 and j > i:
    s = s[:i] + s[j:]
    P.write_text(s, encoding="utf-8")
    print("removed dup", i, j)
else:
    print("skip", i, j)
