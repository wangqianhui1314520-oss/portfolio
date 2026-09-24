export const sectors = [
  { id: 'forge', code: '01 / FORGE', name: '游戏构筑域', en: 'WORLDS TO PLAY', description: '规则、选择与不断演化的世界。', color: '#6ae5ee', position: [-14, 4, -36] },
  { id: 'echo', code: '02 / ECHO', name: '叙事回声域', en: 'STORIES TO ENTER', description: '沿着记忆与线索，抵达故事深处。', color: '#d894ff', position: [0, -1, -31] },
  { id: 'lumen', code: '03 / LUMEN', name: '光影视界', en: 'VISIONS TO FEEL', description: '光、影像与人工智能的想象。', color: '#ffa7bf', position: [14, 4, -36] }
];

export function sectorFor(work) {
  if (/影视|短剧|视频|影像/.test(`${work.type} ${work.subtitle}`)) return 'lumen';
  if (['ming', 'yuanmo', 'rebirth'].includes(work.id) || /策略|动作/.test(work.subtitle || '')) return 'forge';
  return 'echo';
}

// Only a decoded signal can be docked. Views never receive details before docking.
export function createJourney(allWorks) {
  const works = allWorks.filter(w => w.id && w.title && w.type !== '作品证书');
  const scanned = new Set(), visited = new Set();
  let state = { step: 'bridge', sector: null, work: null };
  const busy = new Set(['boot', 'travel', 'scanning', 'docking']);
  const signalWorks = () => works.filter(w => sectorFor(w) === state.sector);
  const dispatch = (action, value) => {
    const previous = state;
    switch (action) {
      case 'start': if (state.step === 'bridge') state = { ...state, step: 'boot' }; break;
      case 'ready': if (state.step === 'boot') state = { step: 'map', sector: null, work: null }; break;
      case 'navigate': if (state.step === 'map' && sectors.some(s => s.id === value)) state = { step: 'travel', sector: value, work: null }; break;
      case 'arrive': if (state.step === 'travel') state = { ...state, step: scanned.has(state.sector) ? 'signals' : 'arrival' }; break;
      case 'scan': if (state.step === 'arrival') state = { ...state, step: 'scanning' }; break;
      case 'decode': if (state.step === 'scanning') { scanned.add(state.sector); state = { ...state, step: 'signals' }; } break;
      case 'select': if (state.step === 'signals' && scanned.has(state.sector) && signalWorks().some(w => w.id === value)) state = { ...state, step: 'target', work: value }; break;
      case 'dock': if (state.step === 'target') state = { ...state, step: 'docking' }; break;
      case 'open': if (state.step === 'docking') { visited.add(state.work); state = { ...state, step: 'docked' }; } break;
      case 'map': if (!['bridge', 'boot'].includes(state.step)) state = { step: 'map', sector: null, work: null }; break;
      case 'captain': if (state.step === 'map') state = { step: 'captain', sector: null, work: null }; break;
      case 'back': {
        const step = { boot: 'bridge', map: 'bridge', travel: 'map', arrival: 'map', scanning: 'arrival', signals: 'map', target: 'signals', docking: 'target', docked: 'signals', captain: 'map' }[state.step];
        if (step) state = { step, sector: ['bridge','map','captain'].includes(step) ? null : state.sector, work: step === 'target' ? state.work : null };
        break;
      }
    }
    return state !== previous;
  };
  return {
    get state() { return { ...state }; }, get busy() { return busy.has(state.step); },
    get signals() { return scanned.has(state.sector) ? signalWorks() : []; },
    get signalCount() { return signalWorks().length; }, get visitedCount() { return visited.size; },
    get work() { return ['target','docking','docked'].includes(state.step) ? works.find(w => w.id === state.work) : undefined; },
    get detail() { return state.step === 'docked' ? works.find(w => w.id === state.work) : undefined; },
    get total() { return works.length; }, hasVisited: id => visited.has(id), dispatch
  };
}
