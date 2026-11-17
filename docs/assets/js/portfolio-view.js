// Shared URL rules for the editorial shortlist, scan-friendly archive and optional ribbon.
export const archiveViews = ['featured', 'grid', 'list', 'ribbon'];
export function archiveView(params) {
  const explicit = params.get('view');
  if (archiveViews.includes(explicit)) return explicit;
  if (params.get('project')) return 'ribbon';
  return params.get('category') && params.get('category') !== 'all' ? 'grid' : 'featured';
}
export function projectVisible(project, category, view) {
  return (category === 'all' || project.category === category) && (view !== 'featured' || project.featured);
}
