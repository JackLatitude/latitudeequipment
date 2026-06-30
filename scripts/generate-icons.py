#!/usr/bin/env python3
"""Generate PWA icons and favicon from LATITUDE O.png."""
from PIL import Image
import os

SRC = "/Users/jdownes/Documents/Latitude/LATITUDE LOGO /4. Icon/LATITUDE O.png"
OUT = os.path.join(os.path.dirname(__file__), "../public")

img = Image.open(SRC).convert("RGBA")

# Square crop (it's already nearly square: 4855×4742)
size = min(img.size)
left = (img.width - size) // 2
top = (img.height - size) // 2
img = img.crop((left, top, left + size, top + size))

# PWA icons
for px in [192, 512]:
    resized = img.resize((px, px), Image.LANCZOS)
    resized.save(os.path.join(OUT, f"icon-{px}.png"), "PNG")
    print(f"  ✓ icon-{px}.png")

# Apple touch icon
apple = img.resize((180, 180), Image.LANCZOS)
apple.save(os.path.join(OUT, "apple-touch-icon.png"), "PNG")
print("  ✓ apple-touch-icon.png")

# favicon.ico (multi-size: 16, 32, 48)
sizes = [16, 32, 48]
ico_images = [img.resize((s, s), Image.LANCZOS) for s in sizes]
ico_images[0].save(
    os.path.join(OUT, "favicon.ico"),
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=ico_images[1:],
)
print("  ✓ favicon.ico")
print("Done.")
