import sys
import os

path = r"d:\source\svelt\dentistico\src\routes\doctor\patients\[id]\+page.svelte"

with open(path, "rb") as f:
    content = f.read().decode("utf-8")

replacements = {
    "âš\xa0ï¸ ": "⚠️",
    "âœ“": "✓",
    "ðŸ¤°": "🤰",
    "ðŸ ¥": "🏥",
    "ðŸ“ ": "📄",
    "ðŸ“„": "📄",
    "ðŸ“…": "📅",
    "ðŸ’Š": "💊",
    "ðŸ’°": "💰",
    "ðŸ–¨ï¸ ": "🖨️"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(path, "wb") as f:
    f.write(content.encode("utf-8"))
