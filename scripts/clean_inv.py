p = "frontend/inventory.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
dead = """    #invCard {
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
s = s.replace(dead, "")
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("css cleaned")
