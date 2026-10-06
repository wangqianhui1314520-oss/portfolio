// Facts, media and stable IDs stay in data.js; locale patches only change presentation.
export const supportedLocales = ['zh', 'en'];
export function normalizeLocale(value) { return /^en(?:-|$)/i.test(value || '') ? 'en' : 'zh'; }
export function currentLocale() {
  return normalizeLocale(typeof document !== 'undefined' ? document.documentElement.lang : 'zh');
}
function merge(base, patch) {
  if (patch === undefined) return base;
  if (Array.isArray(patch) || patch === null || typeof patch !== 'object') return patch;
  const result = {...base};
  for (const [key, value] of Object.entries(patch)) result[key] = merge(base?.[key], value);
  return result;
}
export function localizedData(data, locale) {
  locale = normalizeLocale(locale);
  if (locale === 'zh') return {...data, locale};
  const patch = data.locales?.en || {};
  const poems = data.poetry.poems.map(poem => ({...merge(poem, patch.poems?.[poem.id]),
    originalTitle: poem.title, originalParagraphs: poem.paragraphs, originalDateLabel: poem.dateLabel}));
  return {...data, locale, profile: merge(data.profile, patch.profile),
    poetry: {...merge(data.poetry, patch.poetry), poems, locale},
    works: data.works.map(work => ({...merge(work, patch.works?.[work.id]), originalTitle: work.title}))};
}
export function localePath(locale, suffix = '', basePath = '/') {
  const base = '/' + basePath.split('/').filter(Boolean).join('/');
  return (base === '/' ? '' : base) + '/' + normalizeLocale(locale) + '/' + suffix.replace(/^\//, '');
}
export function projectPath(locale, id, basePath = '/') { return localePath(locale, 'work/' + encodeURIComponent(id) + '/', basePath); }
// Static case studies, filters and poem anchors remain in the same context.
export function languageDestination(destination, currentURL) {
  const current = new URL(currentURL);
  const target = new URL(destination, current);
  target.search = current.search;
  target.hash = current.hash;
  return target.href;
}
