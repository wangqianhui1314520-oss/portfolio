const chapters = ['overview','reading','practice','records'];
const sectorIds = ['forge','lumen','echo','nexus'];
export function viewFromURL(url) {
  const params = new URL(url, 'https://portfolio.invalid').searchParams;
  return {view:params.get('view'),work:params.get('work'),sector:params.get('sector'),chapter:params.get('chapter')};
}
// Use the existing state machine, including its revision/cancellation protections.
export function restoreView(navigate, works, view) {
  const work = works.find(w => w.id === view.work && sectorIds.includes(w.sector));
  if (view.view === 'captain') {navigate('home');navigate('captain');return {restored:true,chapter:chapters.includes(view.chapter)?view.chapter:'overview'};}
  const sector = work?.sector || (sectorIds.includes(view.sector) ? view.sector : null);
  if (!work && !sector && view.view !== 'map') return {restored:false};
  navigate('home');navigate('start');navigate('ready');
  if (sector) {navigate('navigate',sector);navigate('arrive');}
  if (view.view==='arrival') return {restored:true};
  if (sector) {navigate('scan');navigate('decode');}
  if (work) {
    if(view.view==='signals')navigate('focus',work.id);
    else {navigate('select',work.id);if(view.view!=='target'){navigate('dock');navigate('open');}}
  }
  return {restored:true};
}
export function viewSearch(state, chapter = 'overview') {
  const params = new URLSearchParams();
  if (state.step === 'captain') {params.set('view','captain');params.set('chapter',chapters.includes(chapter)?chapter:'overview');}
  else if (state.step==='docked'&&state.work) params.set('work',state.work);
  else if (state.sector) {
    params.set('view',['travel','arrival','scanning'].includes(state.step)?'arrival':['target','docking'].includes(state.step)?'target':'signals');
    params.set('sector',state.sector);if(state.work)params.set('work',state.work);
  }
  else if (state.step !== 'bridge') params.set('view','map');
  return params.size ? '?' + params : '';
}
