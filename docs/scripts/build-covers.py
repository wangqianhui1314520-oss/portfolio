#!/usr/bin/env python3
"""Write the responsive WebP copies of every project cover.

Each JPEG cover named in assets/js/data.js gains 480 px and 960 px WebP copies,
plus one at its full width when that is wider, in assets/covers/r/. The site
builder reads assets/covers/r/manifest.json to write srcset lists; the JPEG
stays as the fallback. Requires Pillow. Usage: python scripts/build-covers.py
"""
from pathlib import Path
import json
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets' / 'covers' / 'r'
WIDTHS = (480, 960)
QUALITY = 76


def main():
    data = (ROOT / 'assets' / 'js' / 'data.js').read_text(encoding='utf-8')
    covers = sorted(set(re.findall(r'cover:\s*"(assets/covers/[^"]+\.jpg)"', data)))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for cover in covers:
        source = Image.open(ROOT / cover).convert('RGB')
        widths = [w for w in WIDTHS if w < source.width] + [source.width]
        variants = []
        for width in widths:
            height = round(source.height * width / source.width)
            frame = source if width == source.width else source.resize((width, height), Image.LANCZOS)
            target = OUTPUT / f'{Path(cover).stem}-{width}.webp'
            frame.save(target, 'WEBP', quality=QUALITY, method=6)
            variants.append({'src': target.relative_to(ROOT).as_posix(), 'width': width, 'bytes': target.stat().st_size})
        manifest[cover] = {'width': source.width, 'height': source.height, 'variants': variants}
        print(cover, ' '.join(f"{v['width']}w:{v['bytes'] // 1024}KB" for v in variants))
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
