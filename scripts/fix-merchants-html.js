const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../frontend/merchants.html");
let s = fs.readFileSync(p, "utf8");

const broken = `    function saveToStorage() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          items,
          importSkipEnrich,
          checked: [...document.querySelectorAll(".pick:checked")].map(c => +c.dataset.i),
          status: statusEl.textContent
        }));
      } catch (_) {}
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
    });
          updateSel();
        }
      } catch (_) {}
    }`;

const fixed = `    function saveToStorage() {
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
    }`;

if (!s.includes(broken)) {
  console.error("broken block not found");
  process.exit(1);
}
s = s.replace(broken, fixed);
fs.writeFileSync(p, s, "utf8");
console.log("fixed storage");
