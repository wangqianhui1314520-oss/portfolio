# Tem web fonts

`Tem Interface` and `Tem Narrative` are renamed, subset derivatives of Noto Sans SC
and Noto Serif SC. They retain the source's variable weight ranges (100–900 for
Interface, 200–900 for Narrative) and original copyright/license metadata. The accompanying complete SIL Open Font
License 1.1 texts apply to the fonts. The original Noto family names are not used
as the derivative family names.

Each family has a Latin subset and a Chinese/symbol subset. `unicode-range` lets
the browser fetch the subsets needed for the current page. Emoji and a few UI
symbols absent from Noto's source fonts use the browser's symbol/emoji fallback;
the manifest records their codepoints. All current Han characters are covered.
No page content is drawn
as an image.

## Build and verify

Run from the project root with Python 3.14 or a compatible Python:

```text
python -m pip install --target .tools/python --only-binary=:all: fonttools==4.66.1 brotli==1.2.0
python scripts/build-fonts.py
python scripts/build-fonts.py --check
```

The default source fonts are the locally installed Windows fonts
`C:/Windows/Fonts/NotoSansSC-VF.ttf` and `NotoSerifSC-VF.ttf`. For another machine,
pass `--sans PATH --serif PATH` to the corresponding original fonts. Sources are
not copied into the site. The subset corpus includes current generated HTML,
templates, dynamic copy, and styles. Rebuild after adding new Chinese text.

`manifest.json` records source and output hashes, byte counts, supported
characters, and the exact source corpus. Verification checks current copy,
family names, preserved license records, weight range, and the 3.5 MB payload
limit. `.tools/python` contains build dependencies and is not a website asset.

Official license sources:

- https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE
- https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE
