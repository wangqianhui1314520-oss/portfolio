#!/usr/bin/env python3
"""Export the work page's dimmed galactic backdrop from the site's panorama.

Requires Pillow. Usage: python scripts/build-backdrop.py
"""
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'images' / 'optical' / 'tem-galactic-panorama.png'
# Desktop keeps the source width (no upscaling); the phone file matches the narrow layout.
OUTPUTS = (('work-backdrop-galaxy.webp', None), ('work-backdrop-galaxy-m.webp', 900))
# Dimmed in the file itself, so text above it keeps its contrast without a runtime filter.
BRIGHTNESS, SATURATION, QUALITY = 0.58, 0.92, 70


def main():
    source = Image.open(SOURCE).convert('RGB')
    for name, width in OUTPUTS:
        width = width or source.width
        frame = source.resize((width, round(source.height * width / source.width)), Image.LANCZOS)
        frame = ImageEnhance.Color(ImageEnhance.Brightness(frame).enhance(BRIGHTNESS)).enhance(SATURATION)
        target = ROOT / 'assets' / 'images' / name
        frame.save(target, 'WEBP', quality=QUALITY, method=6)
        print(f'{target.relative_to(ROOT).as_posix()}: {frame.width}x{frame.height}, {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
