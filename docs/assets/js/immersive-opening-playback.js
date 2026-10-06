// A loaded preview must never consume the voyage before its visitor boards.
export function createOpeningPlayback(duration=14){
 const state={active:true,ready:false,started:false,progress:0,age:0,duration};
 return {state,
  ready(){state.ready=true;},
  start(){if(!state.active)return false;state.started=true;return true;},
  reset(){state.active=true;state.started=false;state.progress=0;state.age=0;},
  advance(dt){
   if(!state.active)return 1;
   if(!state.ready||!state.started)return 0;
   state.age=Math.min(state.duration,state.age+(Number.isFinite(dt)?Math.max(0,dt):0));
   state.progress=state.age/state.duration;return state.progress;
  },
  finish(){state.active=false;state.started=false;state.age=state.duration;state.progress=1;}
 };
}
