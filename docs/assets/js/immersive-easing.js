// Polynomial rounding near 1 can exceed the curve's valid [0, 1] interval.
export function cinematicEase(progress){
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:1));
 return Math.max(0,Math.min(1,p*p*p*(10+p*(-15+p*6))));
}
