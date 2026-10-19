"""Generate PWA icons (compass mark on a sky→violet→teal gradient). Usage: python scripts/make-icons.py"""
import math
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
STOPS = [(0.0, (14, 165, 233)), (0.55, (139, 92, 246)), (1.0, (20, 184, 166))]  # AZ-104, AZ-305, AI-103 accents


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_color(t):
    for (p0, c0), (p1, c1) in zip(STOPS, STOPS[1:]):
        if t <= p1:
            return lerp(c0, c1, (t - p0) / (p1 - p0))
    return STOPS[-1][1]


def draw_icon(size, full_bleed):
    s = size * 4  # supersample for smooth edges
    grad = Image.new("RGB", (s, s))
    px = grad.load()
    for y in range(s):
        for x in range(s):
            px[x, y] = gradient_color((x + y) / (2 * (s - 1)))

    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    mask = Image.new("L", (s, s), 0)
    if full_bleed:
        mask.paste(255, (0, 0, s, s))
    else:
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    cx = cy = s / 2
    scale = 0.62 if full_bleed else 0.78  # maskable icons keep content inside the safe zone
    r = s * 0.36 * scale
    ring = max(2, int(s * 0.045 * scale))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 255, 255, 255), width=ring)

    # Tick marks at N/E/S/W.
    for k in range(4):
        a = k * math.pi / 2
        x0, y0 = cx + math.cos(a) * (r - ring * 2.2), cy + math.sin(a) * (r - ring * 2.2)
        x1, y1 = cx + math.cos(a) * (r - ring * 0.6), cy + math.sin(a) * (r - ring * 0.6)
        d.line((x0, y0, x1, y1), fill=(255, 255, 255, 235), width=max(2, ring // 2))

    # Needle pointing north-east.
    ang = -math.pi / 4
    ln, wd = r * 0.78, r * 0.2
    ux, uy = math.cos(ang), math.sin(ang)
    vx, vy = -uy, ux
    tip = (cx + ux * ln, cy + uy * ln)
    tail = (cx - ux * ln, cy - uy * ln)
    left = (cx + vx * wd, cy + vy * wd)
    right = (cx - vx * wd, cy - vy * wd)
    d.polygon([tip, left, right], fill=(255, 255, 255, 255))
    d.polygon([tail, left, right], fill=(255, 255, 255, 140))
    hub = r * 0.09
    d.ellipse((cx - hub, cy - hub, cx + hub, cy + hub), fill=(15, 23, 42, 255))

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    draw_icon(192, False).save(os.path.join(OUT, "icon-192.png"))
    draw_icon(512, False).save(os.path.join(OUT, "icon-512.png"))
    draw_icon(512, True).save(os.path.join(OUT, "maskable-512.png"))
    draw_icon(180, True).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
    print("icons written to", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
