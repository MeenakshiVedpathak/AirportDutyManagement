#!/usr/bin/env python3
"""Generate Airport Duty Management app icons for iOS and Android."""
from PIL import Image, ImageDraw, ImageFilter
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IOS_APPICONSET = os.path.join(BASE_DIR, "ios/AirportDutyManagement/Images.xcassets/AppIcon.appiconset")
ANDROID_RES = os.path.join(BASE_DIR, "android/app/src/main/res")


def draw_airplane(draw, cx, cy, plane_height, color=(255, 255, 255)):
    """Draw a top-down airplane silhouette centered at (cx, cy)."""
    ph = plane_height
    h = ph / 2  # half height offset from center

    # --- Fuselage ---
    fuselage = [
        (cx,          cy - h * 0.97),   # nose tip
        (cx + ph * 0.055, cy - h * 0.55),   # right widens
        (cx + ph * 0.075, cy + h * 0.05),   # right max width
        (cx + ph * 0.060, cy + h * 0.50),   # right narrows
        (cx + ph * 0.030, cy + h * 0.80),   # right tail
        (cx,          cy + h * 0.97),   # tail tip
        (cx - ph * 0.030, cy + h * 0.80),   # left tail
        (cx - ph * 0.060, cy + h * 0.50),   # left narrows
        (cx - ph * 0.075, cy + h * 0.05),   # left max width
        (cx - ph * 0.055, cy - h * 0.55),   # left widens
    ]
    draw.polygon(fuselage, fill=color)

    # --- Main wings ---
    wings = [
        (cx + ph * 0.060, cy - h * 0.12),   # right root front
        (cx + ph * 0.440, cy + h * 0.07),   # right tip front
        (cx + ph * 0.400, cy + h * 0.18),   # right tip back
        (cx + ph * 0.070, cy + h * 0.08),   # right root back
        (cx - ph * 0.070, cy + h * 0.08),   # left root back
        (cx - ph * 0.400, cy + h * 0.18),   # left tip back
        (cx - ph * 0.440, cy + h * 0.07),   # left tip front
        (cx - ph * 0.060, cy - h * 0.12),   # left root front
    ]
    draw.polygon(wings, fill=color)

    # --- Horizontal tail stabilizer ---
    tail = [
        (cx + ph * 0.038, cy + h * 0.60),   # right root front
        (cx + ph * 0.175, cy + h * 0.73),   # right tip front
        (cx + ph * 0.155, cy + h * 0.82),   # right tip back
        (cx + ph * 0.038, cy + h * 0.75),   # right root back
        (cx - ph * 0.038, cy + h * 0.75),   # left root back
        (cx - ph * 0.155, cy + h * 0.82),   # left tip back
        (cx - ph * 0.175, cy + h * 0.73),   # left tip front
        (cx - ph * 0.038, cy + h * 0.60),   # left root front
    ]
    draw.polygon(tail, fill=color)


def create_master_icon():
    """Create the 1024x1024 master icon."""
    SIZE = 1024
    img = Image.new('RGB', (SIZE, SIZE))
    draw = ImageDraw.Draw(img)

    # Deep navy → rich blue gradient background
    top_color = (8, 18, 45)
    bot_color = (15, 55, 115)
    for y in range(SIZE):
        t = y / SIZE
        r = int(top_color[0] + t * (bot_color[0] - top_color[0]))
        g = int(top_color[1] + t * (bot_color[1] - top_color[1]))
        b = int(top_color[2] + t * (bot_color[2] - top_color[2]))
        draw.line([(0, y), (SIZE, y)], fill=(r, g, b))

    # Subtle radial glow in centre
    glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for radius in range(420, 0, -12):
        alpha = int((1 - radius / 420) * 38)
        gd.ellipse(
            [SIZE // 2 - radius, SIZE // 2 - radius,
             SIZE // 2 + radius, SIZE // 2 + radius],
            fill=(40, 100, 220, alpha)
        )
    glow = glow.filter(ImageFilter.GaussianBlur(24))
    img.paste(Image.new('RGB', (SIZE, SIZE)), (0, 0),
              mask=Image.new('L', (SIZE, SIZE), 0))  # no-op base
    img_rgba = img.convert('RGBA')
    img_rgba = Image.alpha_composite(img_rgba, glow)
    img = img_rgba.convert('RGB')
    draw = ImageDraw.Draw(img)

    # Draw white airplane, offset slightly upward for visual balance
    draw_airplane(draw, SIZE // 2, SIZE // 2 - 20, SIZE * 0.74)

    return img


def resize_icon(master, size):
    return master.resize((size, size), Image.LANCZOS)


def main():
    print("Generating master icon…")
    master = create_master_icon()

    # ── iOS ────────────────────────────────────────────────────────────────────
    ios_icons = [
        ("icon-40.png",   40),   # 20@2x
        ("icon-60.png",   60),   # 20@3x
        ("icon-58.png",   58),   # 29@2x
        ("icon-87.png",   87),   # 29@3x
        ("icon-80.png",   80),   # 40@2x
        ("icon-120.png", 120),   # 40@3x / 60@2x
        ("icon-180.png", 180),   # 60@3x
        ("icon-1024.png", 1024), # App Store marketing
    ]

    os.makedirs(IOS_APPICONSET, exist_ok=True)
    for filename, size in ios_icons:
        path = os.path.join(IOS_APPICONSET, filename)
        resize_icon(master, size).save(path)
        print(f"  iOS  {size:4d}×{size:<4d}  {filename}")

    # Update Contents.json
    contents = {
        "images": [
            {"idiom": "iphone", "scale": "2x", "size": "20x20",   "filename": "icon-40.png"},
            {"idiom": "iphone", "scale": "3x", "size": "20x20",   "filename": "icon-60.png"},
            {"idiom": "iphone", "scale": "2x", "size": "29x29",   "filename": "icon-58.png"},
            {"idiom": "iphone", "scale": "3x", "size": "29x29",   "filename": "icon-87.png"},
            {"idiom": "iphone", "scale": "2x", "size": "40x40",   "filename": "icon-80.png"},
            {"idiom": "iphone", "scale": "3x", "size": "40x40",   "filename": "icon-120.png"},
            {"idiom": "iphone", "scale": "2x", "size": "60x60",   "filename": "icon-120.png"},
            {"idiom": "iphone", "scale": "3x", "size": "60x60",   "filename": "icon-180.png"},
            {"idiom": "ios-marketing", "scale": "1x", "size": "1024x1024", "filename": "icon-1024.png"},
        ],
        "info": {"author": "xcode", "version": 1},
    }
    with open(os.path.join(IOS_APPICONSET, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)
    print("  Updated Contents.json")

    # ── Android ───────────────────────────────────────────────────────────────
    android_icons = [
        ("mipmap-mdpi",    48),
        ("mipmap-hdpi",    72),
        ("mipmap-xhdpi",   96),
        ("mipmap-xxhdpi",  144),
        ("mipmap-xxxhdpi", 192),
    ]

    for folder, size in android_icons:
        dir_path = os.path.join(ANDROID_RES, folder)
        icon = resize_icon(master, size)
        icon.save(os.path.join(dir_path, "ic_launcher.png"))
        icon.save(os.path.join(dir_path, "ic_launcher_round.png"))
        print(f"  Android {size:3d}×{size:<3d}  {folder}")

    print("\nDone — all icons generated.")


if __name__ == "__main__":
    main()