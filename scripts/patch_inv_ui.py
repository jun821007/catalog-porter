inv = "frontend/inventory.html"
with open(inv, encoding="utf-8") as f:
    s = f.read()

# Backdrop + cancel — CSS after descEditModal.show
insert = """
    #descEditBackdrop { background: rgba(51, 65, 85, 0.38) !important; }
    #descEditCancel {
      background: #ffffff !important;
      color: #334155 !important;
      border: 1px solid #cbd5e1 !important;
    }
    #descEditCancel:hover { background: #f8fafc !important; color: #0f172a !important; }
    #invCard {
      background: #ffffff !important;
      border-color: #e2e8f0 !important;
    }
    #invCard .inv-thumb { background: #f1f5f9 !important; }
    #invCard .inv-descbox {
      background: #f8fafc !important;
      border-color: #e2e8f0 !important;
      color: #334155 !important;
    }
"""
if "#descEditBackdrop { background: rgba(51" not in s:
    s = s.replace("#descEditModal.show { display: flex; }", "#descEditModal.show { display: flex; }" + insert)

# Modal panel HTML
s = s.replace(
    '<div id="descEditPanel" class="bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-4">',
    '<div id="descEditPanel" class="bg-white border border-slate-200 rounded-lg shadow-xl p-4">',
)
s = s.replace(
    '<div id="descEditTitle" class="text-sm text-slate-300 mb-2">編輯描述與分類</div>',
    '<div id="descEditTitle" class="text-sm font-medium text-slate-800 mb-2">編輯描述與分類</div>',
)
s = s.replace(
    '<select id="descEditCat" class="w-full mb-2 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-sm"></select>',
    '<select id="descEditCat" class="w-full mb-2 bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800 text-sm"></select>',
)
s = s.replace(
    '<textarea id="descEditTa" class="w-full min-h-[220px] bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 text-sm" autocomplete="off"></textarea>',
    '<textarea id="descEditTa" class="w-full min-h-[220px] bg-white border border-slate-300 rounded p-2 text-slate-800 text-sm" autocomplete="off"></textarea>',
)
s = s.replace(
    '<button type="button" id="descEditCancel" class="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm">',
    '<button type="button" id="descEditCancel" class="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-sm hover:bg-slate-50">',
)

# Grid card — replace className and inner template classes
old_card = 'card.className = "bg-slate-900 border border-slate-800 rounded-lg overflow-hidden";'
new_card = 'card.className = "rounded-lg overflow-hidden border border-slate-200 shadow-sm"; card.id = "invCard";'
# id on every card would duplicate — use class instead
new_card = 'card.className = "inv-card rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white";'

if old_card not in s:
    raise SystemExit("card line not found")
s = s.replace(old_card, new_card)

old_inner = """card.innerHTML = '<div class="aspect-square bg-slate-800 cursor-pointer img-preview relative" data-id="' + it.id + '"><img class="w-full h-full object-cover" src="' + imgSrc + '" alt="" /></div><div class="p-2"><div class="descPreview text-xs bg-slate-800 border border-slate-700 rounded p-2 text-slate-300 min-h-[3rem] max-h-24 overflow-y-auto whitespace-pre-wrap cursor-pointer hover:border-slate-500" tabindex="0" data-id="' + it.id + '" title="&#40670;&#25802;&#20462;&#25913;"></div>"""

new_inner = """card.innerHTML = '<div class="aspect-square bg-slate-100 cursor-pointer img-preview relative" data-id="' + it.id + '"><img class="w-full h-full object-cover" src="' + imgSrc + '" alt="" /></div><div class="p-2 bg-white"><div class="descPreview text-xs bg-slate-50 border border-slate-200 rounded p-2 text-slate-700 min-h-[3rem] max-h-24 overflow-y-auto whitespace-pre-wrap cursor-pointer hover:border-slate-400" tabindex="0" data-id="' + it.id + '" title="&#40670;&#25802;&#20462;&#25913;"></div>"""

if old_inner not in s:
    raise SystemExit("inner not found")
s = s.replace(old_inner, new_inner)

# debug pre
s = s.replace('class="mt-2 p-3 bg-slate-900 rounded', 'class="mt-2 p-3 bg-slate-100 rounded border border-slate-200 text-slate-800')

with open(inv, "w", encoding="utf-8") as f:
    f.write(s)
print("inventory ok")
