p = r"frontend/merchants.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
a = s.index("    function saveToStorage()")
b = s.index("async function refreshImportCategorySelect")
good = """    function saveToStorage() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          items,
          importSkipEnrich,
          checked: [...document.querySelectorAll(".pick:checked")].map(c => +c.dataset.i),
          status: statusEl.textContent
        }));
      } catch (_) {}
    }
    function restoreFromStorage() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data.items || !data.items.length) return;
        items = data.items;
        importSkipEnrich = !!data.importSkipEnrich;
        statusEl.textContent = data.status || "";
        renderGrid();
        if (Array.isArray(data.checked) && data.checked.length) {
          data.checked.forEach(i => {
            const cb = grid.querySelector('.pick[data-i="' + i + '"]');
            if (cb) cb.checked = true;
          });
          updateSel();
        }
      } catch (_) {}
    }

"""
s = s[:a] + good + s[b:]
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("storage fixed", a, b)
