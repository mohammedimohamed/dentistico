import os

path = r"d:\source\svelt\dentistico\src\routes\doctor\patients\[id]\+page.svelte"

with open(path, "rb") as f:
    data = f.read()

# Warning emoji ⚠️
# Found: \xc3\xa2 \xc5\xa1 \xc2\xa0 \xc3\xaf \xc2\xb8 \xc2\x8f
data = data.replace(b"\xc3\xa2\xc5\xa1\xc2\xa0\xc3\xaf\xc2\xb8\xc2\x8f", "⚠️".encode("utf-8"))

# Checkmark ✓
data = data.replace(b"\xc3\xa2\xc2\x9c\xc2\x93", "✓".encode("utf-8"))

# Pregnancy 🤰
data = data.replace(b"\xc3\xb0\xc5\xb8\xc2\xa4\xc2\xb0", "🤰".encode("utf-8"))
data = data.replace(b"\xc3\xb0\xc2\x9f\xc2\xa4\xc2\xb0", "🤰".encode("utf-8"))

# Sheet 📄
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\x9d", "📄".encode("utf-8"))
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x9c\xe2\x80\x9e", "📄".encode("utf-8"))
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x9c ", "📄".encode("utf-8"))
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x9c", "📄".encode("utf-8")) # partial

# Calendar 📅
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x9c\xe2\x80\xa6", "📅".encode("utf-8"))

# Pill 💊
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x99\xc5\xa0", "💊".encode("utf-8"))

# Money 💰
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x99\xc2\xb0", "💰".encode("utf-8"))

# Printer 🖨️
data = data.replace(b"\xc3\xb0\xc5\xb8\xe2\x80\x9e\xc2\xa8\xc3\xaf\xc2\xb8\xc2\x8f", "🖨️".encode("utf-8"))

# Hospital 🏥
data = data.replace(b"\xc3\xb0\xc5\xb8\xc2\xa5\xc2\xb1", "🏥".encode("utf-8"))

with open(path, "wb") as f:
    f.write(data)
