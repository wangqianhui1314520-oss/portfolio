import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('camera completion rejects a cancelled flight even when the same sector is selected again',async()=>{
 const scope={window:{}};
 runInNewContext(readFileSync(new URL('../assets/js/data.js',import.meta.url),'utf8'),scope);
 globalThis.window=scope.window;
 const {journey,navigate,getRevision,completeTransition}=await import('../assets/js/immersive-session.js');
 delete globalThis.window;
 navigate('start');const boot=getRevision();
 assert.equal(completeTransition({step:'boot',revision:boot}),true);
 navigate('navigate','forge');const cancelled=getRevision();
 navigate('back');navigate('navigate','forge');
 assert.equal(completeTransition({step:'travel',revision:cancelled}),false);
 assert.equal(journey.state.step,'travel');
 assert.equal(completeTransition({step:'travel',revision:getRevision()}),true);
 assert.equal(journey.state.step,'arrival');
 navigate('scan');navigate('decode');navigate('select','ming');navigate('dock');
 const docking=getRevision();navigate('back');navigate('dock');
 assert.equal(completeTransition({step:'docking',revision:docking}),false);
 assert.equal(journey.detail,undefined);
 assert.equal(completeTransition({step:'docking',revision:getRevision()}),true);
 assert.equal(journey.detail.id,'ming');
 assert.equal(completeTransition({step:'docking',revision:getRevision()}),false);
});
