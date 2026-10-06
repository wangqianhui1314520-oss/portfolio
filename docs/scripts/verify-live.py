"""Verify the live site after release: every resource the main site loads must answer 200."""

import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = r'D:\Vibe coding\作品集\docs'
# The custom-domain certificate is still untrusted, so verify over plain HTTP.
ORIGIN = 'http://wqh-tempest.cn'


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as handle:
        return handle.read()


def head(path):
    request = urllib.request.Request(ORIGIN + path, method='GET', headers={'User-Agent': 'tem-verify'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response.read(2048)
            return response.status
    except Exception as error:                                   # noqa: BLE001
        return getattr(error, 'code', str(error))


def main():
    targets = ['/', '/immersive.html', '/zh/', '/zh/work/', '/en/about/', '/poetry.html',
               '/resume.html', '/sitemap.xml', '/robots.txt']

    html = read('immersive.html')
    for match in re.findall(r'(?:href|src)="(/[^"]+)"', html):
        targets.append(match.split('?')[0])

    loader = read('assets/js/immersive-blender-assets.js')
    table = re.search(r'const assets=Object\.freeze\(\{([^}]+)\}\)', loader)
    for match in re.findall(r"'([^']+\.glb)'", table.group(1)):
        targets.append('/assets/models/' + match)

    # data.js is a browser script; scan it for asset paths instead of executing it.
    for match in re.findall(r'"(assets/(?:covers|videos|poems|certificates)/[^"]+)"', read('assets/js/data.js')):
        targets.append('/' + match)

    for name in sorted(os.listdir(os.path.join(ROOT, 'assets', 'audio', 'sfx'))):
        targets.append('/assets/audio/sfx/' + name)
    for name in sorted(os.listdir(os.path.join(ROOT, 'assets', 'audio', 'music'))):
        targets.append('/assets/audio/music/' + name)

    seen, ordered = set(), []
    for item in targets:
        if item not in seen:
            seen.add(item)
            ordered.append(item)

    failures = []
    for path in ordered:
        status = head(path)
        mark = 'OK ' if status == 200 else 'BAD'
        print('%-4s %-6s %s' % (mark, status, path), flush=True)
        if status != 200:
            failures.append((path, status))
    print('\n%d checked, %d failed' % (len(ordered), len(failures)))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
