import {t} from './i18n.js';
export const transitionDurations = {boot:2200, travel:5800, scanning:2800, target:2600, docking:3400};

export const sectors = [
  { id:'forge', code:'01 / FORGE', name:'游戏与交互', en:'PLAYABLE WORLDS', description:'策略 · 解谜 · 互动叙事', color:'#96dbed', position:[-260,70,-570] },
  { id:'lumen', code:'02 / LUMEN', name:'AI 影像', en:'CINEMATIC VISIONS', description:'导演视角 · AI 生成影像', color:'#dbc2a4', position:[390,120,-1050] },
  { id:'echo', code:'03 / ECHO', name:'文学与世界观', en:'WRITTEN UNIVERSES', description:'原创诗歌 · 长篇小说 · 世界观', color:'#bca9e6', position:[-310,-70,-1450] },
  { id:'nexus', code:'04 / NEXUS', name:'技术实验', en:'ENGINEERING LAB', description:'物联网 · 仿真 · 实训工具', color:'#98d0b9', position:[370,-50,-1720] }
].map(sector => ({...sector,name:t(sector.name)}));

export function sectorFor(work) {
  if (sectors.some(sector => sector.id === work.sector)) return work.sector;
  if (/影视|短剧|视频|影像/.test(`${work.type} ${work.subtitle}`)) return 'lumen';
  if (/教学|实训|硬件|物联网|工具|平台/.test(work.type || '')) return 'nexus';
  if (/小说|文学|诗集|诗歌/.test(work.type || '')) return 'echo';
  return 'forge';
}

// Introduction → star map → flight → scan → signals → approach → docking.
export function isProject(work){return Boolean(work?.id&&work.title&&work.type!=='作品证书'&&work.type!=='Project certificate');}
export function createJourney(allWorks) {
  const works = allWorks.filter(isProject);
  const visited = new Set(), scanned = new Set(), focusBySector = new Map();
  let state = {step:'bridge', sector:null, work:null};
  let aboutReturn = {...state};
  const busy = new Set(['boot','travel','scanning','docking']);
  const sectorWorks = () => works.filter(w => sectorFor(w) === state.sector);
  const returnToSignals = () => ({step:'signals',sector:state.sector,work:focusBySector.get(state.sector)||sectorWorks()[0]?.id});
  const dispatch = (action,value) => {
    const previous=state;
    switch(action) {
      case 'start': if(['bridge','captain'].includes(state.step))state={step:'boot',sector:null,work:null};break;
      case 'ready': if(state.step==='boot')state={step:'map',sector:null,work:null};break;
      case 'navigate': if(state.step==='map'&&sectors.some(s=>s.id===value))state={step:'travel',sector:value,work:null};break;
      case 'arrive': if(state.step==='travel')state=scanned.has(state.sector)?returnToSignals():{...state,step:'arrival'};break;
      case 'scan': if(state.step==='arrival')state={...state,step:'scanning'};break;
      case 'decode': if(state.step==='scanning'){scanned.add(state.sector);state=returnToSignals();}break;
      case 'focus': if(state.step==='signals'&&sectorWorks().some(w=>w.id===value)&&state.work!==value){focusBySector.set(state.sector,value);state={...state,work:value};}break;
      case 'select': if(state.step==='signals'&&sectorWorks().some(w=>w.id===value)){focusBySector.set(state.sector,value);state={...state,step:'target',work:value};}break;
      case 'dock': if(state.step==='target')state={...state,step:'docking'};break;
      case 'open': if(state.step==='docking'){visited.add(state.work);state={...state,step:'docked'};}break;
      case 'map': if(!['bridge','boot','map'].includes(state.step))state={step:'map',sector:null,work:null};break;
      case 'captain': if(!busy.has(state.step)&&state.step!=='captain'){aboutReturn={...state};state={step:'captain',sector:null,work:null};}break;
      case 'home': if(state.step!=='bridge')state={step:'bridge',sector:null,work:null};break;
      case 'back':
        if(state.step==='captain')state={...aboutReturn};
        else if(['boot','map'].includes(state.step))state={step:'bridge',sector:null,work:null};
        else if(['travel','arrival','signals'].includes(state.step))state={step:'map',sector:null,work:null};
        else if(state.step==='scanning')state={...state,step:'arrival'};
        else if(state.step==='docking')state={...state,step:'target'};
        else if(['target','docked'].includes(state.step))state=returnToSignals();
        break;
    }
    return state!==previous;
  };
  return {
    get state(){return {...state};},get busy(){return busy.has(state.step);},
    get signals(){return scanned.has(state.sector)&&['signals','target','docking','docked'].includes(state.step)?sectorWorks():[];},
    get signalCount(){return sectorWorks().length;},get visitedCount(){return visited.size;},
    get work(){return ['signals','target','docking','docked'].includes(state.step)?works.find(w=>w.id===state.work):undefined;},
    get detail(){return state.step==='docked'?works.find(w=>w.id===state.work):undefined;},
    get total(){return works.length;},hasScanned:id=>scanned.has(id),hasVisited:id=>visited.has(id),dispatch,
    get progress(){return {visited:[...visited],scanned:[...scanned],focus:Object.fromEntries(focusBySector)};},
    restoreProgress(progress={}){
      for(const id of Array.isArray(progress.visited)?progress.visited:[])if(works.some(w=>w.id===id))visited.add(id);
      for(const id of Array.isArray(progress.scanned)?progress.scanned:[])if(sectors.some(s=>s.id===id))scanned.add(id);
      for(const [id,work]of Object.entries(progress.focus||{}))if(works.some(w=>w.id===work&&sectorFor(w)===id))focusBySector.set(id,work);
    }
  };
}
