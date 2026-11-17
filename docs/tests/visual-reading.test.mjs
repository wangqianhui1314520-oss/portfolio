import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL('../assets/css/' + name, import.meta.url), 'utf8');
const hero = read('case-evidence.css'), story = read('case-story.css'), reading = read('reading-polish.css');
const screen = reading.slice(0, reading.indexOf('@media print'));

test('case hero gives the media a complete row instead of a small right-hand thumbnail', () => {
  assert.match(hero, /grid-template-areas:"intro actions" "media media"/);
  assert.match(hero, /font-size:clamp\(42px,5\.1vw,76px\)/);
  assert.match(hero, /aspect-ratio:16\/9/);
  assert.match(hero, /object-fit:contain/);
  assert.doesNotMatch(hero, /object-fit:cover/);
  assert.match(hero, /@media\(max-width:800px\)[\s\S]*grid-template-areas:"intro" "actions" "media"/);
});

test('case metadata and diagram instructions remain readable rather than tiny labels', () => {
  assert.match(hero, /case-summary-grid strong\{font-size:15px/);
  assert.match(hero, /case-summary-grid>div\{display:grid;grid-template-columns:72px minmax\(0,1fr\)/);
  assert.match(story, /case-story-number\{[^}]*font-size:36px/);
  assert.match(story, /case-story-steps p\{font-size:16px/);
  assert.match(story, /case-story-verify\{[^}]*background:transparent/);
});

test('reading pages preserve a much darker galactic backdrop and the mobile image budget', () => {
  assert.match(screen, /body\.reading-page\{--bg:#050c16/);
  assert.match(screen, /#050c16ed/);
  assert.match(screen, /url\('\.\.\/images\/work-backdrop-galaxy\.webp'\)/);
  assert.match(screen, /@media\(max-width:800px\)[\s\S]*work-backdrop-galaxy-m\.webp/);
  assert.doesNotMatch(screen, /background:(?:#fff\b|white\b)/);
  assert.match(screen, /wordmark\{font-size:32px;font-weight:600;letter-spacing:-\.065em;transform:none\}/);
  assert.match(screen, /site-nav\{min-height:84px\}/);
});

test('the case reading column, current section and next destination have a distinct hierarchy', () => {
  assert.match(reading, /case-layout\{grid-template-columns:176px minmax\(0,820px\)/);
  assert.match(reading, /case-section p,body\.case-page \.case-section li\{font-size:17px/);
  assert.match(reading, /case-index a\[aria-current=location\]/);
  assert.match(reading, /case-index a\{[^}]*min-height:44px/);
  assert.match(reading, /case-next-link h2\{[^}]*font-size:clamp\(34px,4\.5vw,62px\)/);
  assert.match(reading, /case-section\{[^}]*border-bottom:0/);
});

test('about and poetry use open layouts with safe narrow-screen columns', () => {
  assert.match(reading, /about-layout\{grid-template-columns:260px minmax\(0,780px\)/);
  assert.match(reading, /about-copy\{min-width:0\}/);
  assert.match(reading, /recognition-item\[data-featured\]\{[^}]*background:transparent/);
  assert.match(reading, /poem-article\{max-width:42em/);
  assert.match(reading, /poem-text\{font-size:21px;line-height:2\.1/);
  assert.match(reading, /@media\(max-width:560px\)[\s\S]*poem-list\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(reading, /overflow-wrap:anywhere/);
});

test('visual polish preserves media behavior and transition ownership, keyboard focus and reduced motion', () => {
  assert.doesNotMatch(hero + story + reading, /view-transition-name\s*:|autoplay|url\([^)]*\.mp4/);
  assert.match(reading, /a:focus-visible/);
  assert.match(reading, /prefers-reduced-motion:reduce/);
  assert.match(hero, /@media print[\s\S]*case-evidence-print-poster\{display:block/);
  for (const css of [hero, story, reading]) {
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'balanced stylesheet blocks');
  }
});
