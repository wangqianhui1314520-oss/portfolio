#!/usr/bin/env python3
"""Build or check the site's locally hosted, renamed Noto SC font subsets.

The CJK characters are cut into slices of about 160 characters, each with its
own unicode-range, so a page downloads only the slices its text uses. Slices
follow the pages in order of importance: the work archive's characters come
first, ordered by how many pages share them; each later page adds only what is
still missing. Requires fonttools==4.66.1 and brotli==1.2.0. The optional local
dependency directory is .tools/python; no global Python installation is changed.
Usage: python scripts/build-fonts.py [--check] [--sans SOURCE] [--serif SOURCE]
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'python'))
from fontTools import subset
from fontTools.ttLib import TTFont

OUTPUT = ROOT / 'assets' / 'fonts'
MANIFEST = OUTPUT / 'manifest.json'
FONT_SPEC = (
    ('interface', 'Tem Interface', 'Noto Sans SC', 'NotoSansSC', 'LICENSE-Sans.txt'),
    ('narrative', 'Tem Narrative', 'Noto Serif SC', 'NotoSerifSC', 'LICENSE-Serif.txt'),
)


SLICE = 160
# Generated pages in order of importance; their characters get slices of their own.
PRIORITY = ('zh/work/index.html', 'index.html', 'zh/about/index.html', 'zh/poetry/index.html',
            'en/work/index.html', 'en/index.html', 'en/about/index.html', 'en/poetry/index.html')
# Text a page's script writes at run time (announcements, hints) counts as part of that page.
COMPANIONS = {'zh/work/index.html': 'assets/js/international-static.js', 'en/work/index.html': 'assets/js/international-static.js'}
# Serif display text on the work archive: the introduction, every project title and the contact lead.
DISPLAY = re.compile(r'data-title="([^"]*)"|(?:class="(?:ribbon-intro-role|ribbon-about-lead|ribbon-row-title)">|class="ribbon-intro-track"><small>[^<]*</small>)([^<]*)<')


def display_text(documents_root=ROOT):
    """Characters the archive sets in the serif face first; they share one slice of their own."""
    text = ''
    for page in ('zh/work/index.html', 'en/work/index.html'):
        file = documents_root / page
        if file.exists():
            text += ''.join(a + b for a, b in DISPLAY.findall(file.read_text(encoding='utf-8')))
    return {ord(c) for c in html.unescape(text) if ord(c) > 0x024F and not c.isspace()}


def corpus():
    """Include generated pages and dynamic copy, excluding third-party code."""
    sources = set(ROOT.glob('*.html'))
    for folder in ('templates', 'assets/js', 'assets/css', 'zh', 'en'):
        for file in (ROOT / folder).rglob('*'):
            if file.is_file() and file.suffix in ('.js', '.css', '.html', '.json'):
                if file.name != 'fonts.css':
                    sources.add(file)
    chars = set(range(0x20, 0x7F))
    documents = {}
    for file in sorted(sources):
        text = file.read_text(encoding='utf-8-sig')
        # Keep escaped Unicode used by JavaScript and HTML entities too.
        text += ''.join(chr(int(m.group(1), 16)) for m in re.finditer(r'\\u([0-9A-Fa-f]{4})', text))
        text += ''.join(chr(int(m.group(1), 16)) for m in re.finditer(r'&#x([0-9A-Fa-f]+);', text))
        text += ''.join(chr(int(m.group(1))) for m in re.finditer(r'&#([0-9]+);', text))
        used = {ord(c) for c in text if ord(c) >= 0x20 and not c.isspace()}
        documents[str(file.relative_to(ROOT)).replace('\\', '/')] = used
        chars.update(used)
    return chars, sorted(documents), documents


def slices(codes, documents, first=frozenset()):
    """Cut the CJK set into slices: an optional leading set, each important page's new characters, then a shared pool."""
    # Pages also show the ellipsis the browser draws for clamped lines.
    documents = {name: used | documents.get(COMPANIONS.get(name), set()) | ({0x2026} if name.endswith('.html') else set())
                 for name, used in documents.items()}
    pages = [name for name in documents if name.endswith('.html')]
    shared = {code: sum(code in documents[name] for name in pages) for code in codes}

    def rank(name):
        if name in PRIORITY:
            return (0, PRIORITY.index(name), name)
        if name.startswith(('zh/', 'en/')):
            return (1, 0, name)
        # Dynamic copy and legacy pages share pooled slices, the universe's own text first.
        return (2, 0 if name == 'assets/js/data.js' else 1 if name == 'assets/js/i18n.js' else 2, name)

    def cut(ordered):
        pieces = [ordered[i:i + SLICE] for i in range(0, len(ordered), SLICE)]
        # A short tail joins the slice before it instead of costing its own request.
        if len(pieces) > 1 and len(pieces[-1]) < SLICE // 3:
            pieces[-2].extend(pieces.pop())
        return pieces

    remaining, result, pool = set(codes), [], []
    if first & remaining:
        lead = sorted(first & remaining, key=lambda code: (-shared[code], code))
        remaining -= set(lead)
        result.extend(cut(lead))
    for name in sorted(documents, key=rank):
        fresh = sorted(remaining & documents[name], key=lambda code: (-shared[code], code))
        if not fresh:
            continue
        remaining -= set(fresh)
        if rank(name)[0] < 2 and len(fresh) >= SLICE // 3:
            result.extend(cut(fresh))
        else:
            pool.extend(fresh)
    return result + cut(pool + sorted(remaining))


def is_han(code):
    return 0x3400 <= code <= 0x9FFF or 0x20000 <= code <= 0x323AF or 0xF900 <= code <= 0xFAFF


def unicode_range(codes):
    ordered = sorted(codes)
    spans = []
    start = end = ordered[0]
    for code in ordered[1:]:
        if code == end + 1:
            end = code
        else:
            spans.append((start, end))
            start = end = code
    spans.append((start, end))
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in spans)


def rename(font, family, original_family, original_postscript):
    names = font['name']
    postscript = family.replace(' ', '')
    # License and copyright records remain unchanged. Instance/style names and
    # STAT records keep their style suffix while losing the reserved family name.
    for record in names.names:
        if record.nameID in (0, 7, 8, 9, 11, 13, 14):
            continue
        value = record.toUnicode()
        value = value.replace(original_family, family).replace(original_postscript, postscript)
        if value != record.toUnicode():
            record.string = value.encode(record.getEncoding(), errors='replace')
    for platform, encoding, language in ((3, 1, 0x409), (1, 0, 0)):
        for identifier, value in {
            1: family, 3: f'{postscript}-subset-v1', 4: family,
            6: postscript, 16: family,
        }.items():
            names.setName(value, identifier, platform, encoding, language)


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def verify(chars):
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    css = (ROOT / 'assets' / 'css' / 'fonts.css').read_text(encoding='utf-8')
    issues = []
    total = 0
    for record in manifest['families']:
        coverage = set()
        for asset in record['subsets']:
            file = OUTPUT / asset['file']
            declaration = (f"font-family:'{record['family']}';src:url('../fonts/{asset['file']}?v={asset['sha256'][:8]}') format('woff2');"
                           f"font-style:normal;font-weight:{record['weightRange'][0]:g} {record['weightRange'][1]:g};"
                           f"font-display:swap;unicode-range:{asset['unicodeRange']}")
            if declaration not in css:
                issues.append(f"font CSS differs from the verified subset: {file.name}")
            font = TTFont(file)
            coverage.update(font.getBestCmap())
            if font['name'].getDebugName(1) != record['family']:
                issues.append(f"incorrect derivative family: {file.name}")
            if not font['name'].getDebugName(0) or not font['name'].getDebugName(13):
                issues.append(f"missing copyright or license metadata: {file.name}")
            if digest(file) != asset['sha256']:
                issues.append(f"font hash changed: {file.name}")
            axis = next(a for a in font['fvar'].axes if a.axisTag == 'wght')
            if [axis.minValue, axis.maxValue] != record['weightRange']:
                issues.append(f"variable weight range changed: {file.name}")
            total += file.stat().st_size
            font.close()
        allowed = set(record['sourceUnsupportedCodepoints'])
        absent = chars - coverage - allowed
        if absent:
            issues.append(record['family'] + ' missing characters: ' + ', '.join(f'U+{c:04X}' for c in sorted(absent)))
        license_text = (OUTPUT / record['license']).read_text(encoding='utf-8')
        if 'SIL OPEN FONT LICENSE Version 1.1' not in license_text:
            issues.append('invalid OFL text: ' + record['license'])
    if total > 3_500_000:
        issues.append(f'font payload exceeds 3.5 MB: {total}')
    if issues:
        raise SystemExit('\n'.join(issues))
    print(json.dumps({'verified': True, 'requestedCharacters': len(chars), 'woff2Bytes': total,
                      'families': [r['family'] for r in manifest['families']]}, ensure_ascii=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--sans', type=Path, default=Path('C:/Windows/Fonts/NotoSansSC-VF.ttf'))
    parser.add_argument('--serif', type=Path, default=Path('C:/Windows/Fonts/NotoSerifSC-VF.ttf'))
    args = parser.parse_args()
    chars, sources, documents = corpus()
    if args.check:
        verify(chars)
        return
    OUTPUT.mkdir(parents=True, exist_ok=True)
    css = ['/* Generated by scripts/build-fonts.py. Derivatives of Noto SC, SIL OFL 1.1. */',
           "/* English takes the fonts' proportional quotes and apostrophes; Chinese keeps full-width punctuation. */",
           ':lang(en){font-variant-east-asian:proportional-width}',
           ':lang(zh){font-variant-east-asian:normal}']
    for old in OUTPUT.glob('tem-*-v1.woff2'):
        old.unlink()
    manifest = {'version': 1, 'generator': 'fonttools 4.66.1 / brotli 1.2.0',
                'requestedCharacters': len(chars), 'corpusFiles': sources, 'families': []}
    for spec, source in zip(FONT_SPEC, (args.sans, args.serif)):
        slug, family, original, original_postscript, license_file = spec
        if not (OUTPUT / license_file).exists():
            raise SystemExit(f'Missing OFL license: assets/fonts/{license_file}')
        original_font = TTFont(source)
        supported = set(original_font.getBestCmap())
        original_axis = next(a for a in original_font['fvar'].axes if a.axisTag == 'wght')
        weight_range = [original_axis.minValue, original_axis.maxValue]
        copyright_notice = original_font['name'].getDebugName(0)
        original_font.close()
        missing = chars - supported
        missing_han = sorted(c for c in missing if is_han(c))
        if missing_han:
            raise SystemExit(f'{original}: unsupported Han characters {missing_han}')
        record = {'family': family, 'originalFamily': original,
                  'sourceSha256': digest(source), 'sourceBytes': source.stat().st_size,
                  'license': license_file, 'copyright': copyright_notice, 'weightRange': weight_range,
                  'sourceUnsupportedCodepoints': sorted(missing), 'subsets': []}
        selected = chars & supported
        groups = {'latin': {c for c in selected if c <= 0x024F}}
        # The serif face is mostly titles: on the archive they all come from one leading slice.
        lead = display_text() if slug == 'narrative' else frozenset()
        for number, codes in enumerate(slices({c for c in selected if c > 0x024F}, documents, lead), 1):
            groups[f'cjk{number:02d}'] = set(codes)
        for group, codes in groups.items():
            font = TTFont(source, recalcTimestamp=False)
            options = subset.Options()
            options.flavor = 'woff2'
            options.layout_features = ['*']
            options.name_IDs = ['*']
            options.name_languages = ['*']
            options.name_legacy = True
            options.notdef_glyph = True
            options.notdef_outline = True
            options.recommended_glyphs = True
            options.recalc_timestamp = False
            subsetter = subset.Subsetter(options=options)
            subsetter.populate(unicodes=codes)
            subsetter.subset(font)
            rename(font, family, original, original_postscript)
            font.flavor = 'woff2'
            filename = f'tem-{slug}-{group}-v1.woff2'
            target = OUTPUT / filename
            font.save(target, reorderTables=True)
            cmap = font.getBestCmap()
            record['subsets'].append({'file': filename, 'bytes': target.stat().st_size,
                'sha256': digest(target), 'characters': len(cmap), 'unicodeRange': unicode_range(cmap)})
            css.append(f"@font-face{{font-family:'{family}';src:url('../fonts/{filename}?v={digest(target)[:8]}') format('woff2');"
                       f"font-style:normal;font-weight:{weight_range[0]:g} {weight_range[1]:g};font-display:swap;unicode-range:{unicode_range(cmap)}}}")
            print(f'{filename}: {target.stat().st_size:,} bytes / {len(cmap)} characters', flush=True)
            font.close()
        manifest['families'].append(record)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'assets' / 'css' / 'fonts.css').write_text('\n'.join(css) + '\n', encoding='utf-8')
    verify(chars)


if __name__ == '__main__':
    main()
