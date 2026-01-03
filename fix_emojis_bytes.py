import os

path = r"d:\source\svelt\dentistico\src\routes\doctor\patients\[id]\+page.svelte"

with open(path, "rb") as f:
    data = f.read()

# Replacements (Byte sequences)
# 1. Warning emoji
# c3a2 c29a c2a0 c3af c2b8 (and possibly 8f)
# We'll just replace the core part
data = data.replace(b"\xc3\xa2\xc2\x9a\xc2\xa0\xc3\xaf\xc2\xb8\xc2\x8f", "⚠️".encode("utf-8"))
data = data.replace(b"\xc3\xa2\xc2\x9a\xc2\xa0\xc3\xaf\xc2\xb8", "⚠️".encode("utf-8")) # partial match

# 2. Checkmark âœ“ (c3 a2 c2 9c c2 93)
data = data.replace(b"\xc3\xa2\xc2\x9c\xc2\x93", "✓".encode("utf-8"))

# 3. Pregnancy ðŸ¤° (c3 b0 c2 9f c2 a4 c2 b0)
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\xa4\xc2\xb0", "🤰".encode("utf-8"))

# 4. Sheet ðŸ“  / ðŸ“„
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\x93\xc2\x9d", "📄".encode("utf-8"))
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\x93\xc2\x84", "📄".encode("utf-8"))

# 5. Calendar ðŸ“…
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\x93\xc2\x85", "📅".encode("utf-8"))

# 6. Pill ðŸ’Š
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\x92\xc2\x8a", "💊".encode("utf-8"))

# 7. Money ðŸ’°
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\x92\xc2\xb0", "💰".encode("utf-8"))

# 8. Printer ðŸ–¨ï¸ 
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\x9e\xc2\xa8\xc3\xaf\xc2\xb8\xc2\x8f", "🖨️".encode("utf-8"))

# 9. Hospital ðŸ ¥
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\xa5\xc2\xb1", "🏥".encode("utf-8"))

with open(path, "wb") as f:
    f.write(data)
