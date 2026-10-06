// DOM interactions resolve to the same source-array indices as the 3D devices.
// Temporary pointer/focus responses never erase a chapter's expanded selection.
const defaults={overview:'identity',reading:'book',practice:'capability',records:'record'};
const keyOf=item=>`${item.kind}:${item.index}`;
const same=(a,b)=>Boolean(a&&b&&a.kind===b.kind&&a.index===b.index);

export function createArchiveDeviceInteraction({root,getChapter,isActive}){
 const states=new Map(),initialToggles=new WeakMap();let sequence=0,lastChapter=null;
 const stateFor=chapter=>{
  if(!states.has(chapter))states.set(chapter,{selected:null,opened:new Map(),pointer:null,focus:null});
  return states.get(chapter);
 };
 const descriptor=target=>{
  if(!isActive()||!target?.closest)return null;
  const row=target.closest('[data-device-kind][data-device-index]');
  if(row&&root.contains(row)){
   const chapter=getChapter(),kind=row.dataset.deviceKind,index=Number(row.dataset.deviceIndex);
   if(!(chapter in defaults)||!['identity','book','poetry','capability','record'].includes(kind)||!Number.isInteger(index)||index<0)return null;
   // Resolve a proof button through its real parent capability, not a work ID.
   const owner=row.closest('[data-archive-item]')||row;
   return {chapter,kind,index,owner};
  }
  // The optical chapter also exposes a projected poetry button beside its leaf.
  if(getChapter()==='reading'&&root.contains(target.closest('.optical-poetry-entry')))
   return {chapter:'reading',kind:'poetry',index:0,owner:target.closest('.optical-poetry-entry')};
  return null;
 };
 function emit(item,active,committed){
  const detail={chapter:item.chapter,kind:item.kind,index:item.index,active:Boolean(active),committed:Boolean(committed)};
  for(const [name,value] of Object.entries(detail))root.dataset['archiveDevice'+name[0].toUpperCase()+name.slice(1)]=String(value);
  if(item.chapter===getChapter()){
   const selected=committedFor(item.chapter);
   for(const row of root.querySelectorAll('#profilePanel [data-archive-item][data-device-kind]')){
    const matches=row.dataset.deviceKind===item.kind&&Number(row.dataset.deviceIndex)===item.index;
    const retained=selected&&row.dataset.deviceKind===selected.kind&&Number(row.dataset.deviceIndex)===selected.index;
    // Only semantic owners receive these attributes. Nested evidence buttons
    // carry source indices for events without duplicating the selected style.
    row.dataset.deviceActive=String(Boolean(active&&matches));
    row.dataset.deviceCommitted=String(Boolean(retained));
   }
  }
  dispatchEvent(new CustomEvent('tem:archive-device',{detail}));
 }
 const baseline=chapter=>({chapter,kind:defaults[chapter],index:0});
 function committedFor(chapter){
  const state=stateFor(chapter);
  if(state.selected)return state.selected;
  return [...state.opened.values()].sort((a,b)=>b.order-a.order)[0]?.item||null;
 }
 function publish(chapter){
  if(!isActive()||chapter!==getChapter())return;
  const state=stateFor(chapter),committed=committedFor(chapter);
  // Native modals freeze the world while retaining the corresponding device.
  const transient=document.querySelector('dialog[open]')?null:
   [state.pointer,state.focus].filter(Boolean).sort((a,b)=>b.order-a.order)[0]?.item;
  const current=transient||committed;
  if(current)emit(current,true,same(current,committed));
  else emit(baseline(chapter),false,false);
 }
 function release(type,item){
  if(!item)return;
  const state=stateFor(item.chapter),transient=state[type];
  if(!transient||!same(transient.item,item))return;
  state[type]=null;
  // Explicitly release the temporary device, then restore a committed/open one.
  emit(item,false,false);publish(item.chapter);
 }
 function enter(type,item){
  if(!item||document.querySelector('dialog[open]'))return;
  const state=stateFor(item.chapter),previous=state[type]?.item;
  if(previous&&same(previous,item))return;
  if(previous)emit(previous,false,false);
  state[type]={item,order:++sequence};publish(item.chapter);
 }
 function commit(item){
  if(!item)return;
  stateFor(item.chapter).selected=item;emit(item,true,true);
 }
 function scanOpened(chapter){
  const state=stateFor(chapter),found=new Map();
  for(const row of root.querySelectorAll('#profilePanel [data-archive-item][data-device-kind]')){
   const details=row.matches('details')?row:row.querySelector('details');
   if(!details?.open)continue;
   const item=descriptor(row);if(!item)continue;
   const key=keyOf(item);found.set(key,state.opened.get(key)||{item,order:++sequence});
  }
  state.opened=found;
  if(state.selected&&['identity','book','record'].includes(state.selected.kind)&&!found.has(keyOf(state.selected)))state.selected=null;
 }
 function restore(){
  if(!isActive())return;
  const chapter=getChapter();if(!(chapter in defaults))return;
  if(lastChapter!==chapter){
   if(lastChapter)clearTransient(lastChapter);
   lastChapter=chapter;
  }
  const state=stateFor(chapter);state.pointer=null;state.focus=null;
  // Recreated open details enqueue native toggle events. Their DOM order must
  // not replace the most recently selected item restored from chapter memory.
  for(const details of root.querySelectorAll('#profilePanel details'))initialToggles.set(details,details.open);
  scanOpened(chapter);publish(chapter);
 }
 function clearTransient(chapter){
  const state=stateFor(chapter);
  for(const entry of [state.pointer,state.focus])if(entry)emit(entry.item,false,false);
  const committed=committedFor(chapter);if(committed)emit(committed,false,false);
  state.pointer=null;state.focus=null;
 }
 function leave(){if(lastChapter)clearTransient(lastChapter);lastChapter=null;}

 root.addEventListener('pointerover',event=>enter('pointer',descriptor(event.target)));
 root.addEventListener('pointerout',event=>{
  const from=descriptor(event.target),to=descriptor(event.relatedTarget);
  if(from&&!same(from,to))release('pointer',from);
 });
 root.addEventListener('pointerleave',()=>{const chapter=getChapter();release('pointer',stateFor(chapter).pointer?.item);});
 root.addEventListener('focusin',event=>enter('focus',descriptor(event.target)));
 root.addEventListener('focusout',event=>{
  const from=descriptor(event.target),to=descriptor(event.relatedTarget);
  if(from&&!same(from,to))release('focus',from);
 });
 // Capture commits before poetry/evidence readers move focus into a modal.
 root.addEventListener('click',event=>{
  const item=descriptor(event.target);if(!item)return;
  if(event.target.closest('summary')&&item.owner.querySelector('details,summary'))return;
  if(event.target.closest('[data-read-poetry],[data-read-work],[data-device-select]'))commit(item);
 },true);
 root.addEventListener('toggle',event=>{
  const details=event.target;
  if(!details.matches('details')||!details.isConnected||!root.contains(details)||!isActive())return;
  if(initialToggles.has(details)){
   const initial=initialToggles.get(details);initialToggles.delete(details);
   if(initial===details.open)return;
  }
  const row=details.closest('[data-archive-item][data-device-kind]');
  const item=descriptor(row);
  // Certificate/recognition details inside a chapter aren't experience nodes.
  if(!item||(item.owner!==details&&item.owner.querySelector('details')!==details))return;
  const state=stateFor(item.chapter),key=keyOf(item);
  if(details.open){state.opened.set(key,{item,order:++sequence});state.selected=item;emit(item,true,true);}
  else{
   state.opened.delete(key);if(same(state.selected,item))state.selected=null;
   // Closing a focused summary should still retract its device immediately.
   if(same(state.pointer?.item,item))state.pointer=null;
   if(same(state.focus?.item,item))state.focus=null;
   emit(item,false,false);publish(item.chapter);
  }
 },true);
 addEventListener('tem:archive-device-request',restore);
 addEventListener('tem:scene-ready',restore);
 addEventListener('tem:surface',restore);
 return {restore,leave};
}
