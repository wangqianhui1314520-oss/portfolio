import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('lightweight entrance uses the existing crystal image with no new model request',()=>{
 const html=read('templates/universe.html'),css=read('assets/css/landing-polish.css');
 assert.match(html,/landing-polish\.css\?v=\{\{ASSET_VERSION\}\}/);
 assert.match(html,/<img class="launch-crystal"[^>]*tem-crystal\.webp[^>]*alt=""/);
 assert.match(html,/class="launch-orbits"/);
 assert.match(html,/class="launch-author"/);
 assert.doesNotMatch(html,/<video[^>]*autoplay/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^\n]*animation:none/);
 assert.match(css,/max-width:700px/);
 assert.match(css,/\.opening-launch:before\{[^}]*pointer-events:none/);
});
test('the composited entrance preserves both direct browsing and visitor-driven live experience',()=>{
 const html=read('templates/universe.html');
 assert.match(html,/class="launch-browse"[^>]*href="\{\{WORK\}\}"/);
 assert.match(html,/id="startOpening"/);
 assert.match(html,/id="launchReadiness"[^>]*role="status"/);
 assert.doesNotMatch(read('assets/js/international-boot.js'),/queueMicrotask\(requestGraphics\)/);
 assert.match(read('assets/js/i18n.js'),/'王乾辉 \/ TEM': 'WANG QIANHUI \/ TEM'/);
});
