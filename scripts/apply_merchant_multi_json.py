# -*- coding: utf-8 -*-
"""Patch merchants.html for multi-segment JSON."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / "frontend" / "merchants.html"
s = P.read_text(encoding="utf-8")
# ... truncated - use run_terminal_cmd to create file
print(len(s))
