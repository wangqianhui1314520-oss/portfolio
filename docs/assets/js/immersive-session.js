import { createJourney } from './immersive-journey.js?v=cinematic-v21.1';
export const journey = createJourney(window.PORTFOLIO_DATA?.works || []);
const listeners = new Set();let revision=0;
export const getRevision=()=>revision;
export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function navigate(action,value){if(!journey.dispatch(action,value))return false;revision++;for(const listener of listeners)listener(journey.state);return true;}

export function completeTransition(event){const next={boot:'ready',travel:'arrive',docking:'open'}[event.step];return Boolean(next&&event.revision===revision&&journey.state.step===event.step&&navigate(next));}






