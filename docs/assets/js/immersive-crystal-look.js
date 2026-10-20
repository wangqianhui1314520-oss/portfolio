// Strict JSON also read by the fixed Blender material pass. Both renderers
// share the bounds and optical art direction; native noise/transport differ.
export const crystalMediumProfile=Object.freeze({
 "revision":"crystal-field-01",
 "chambers":[
  {"min":[-6.85,4.90,-1.04],"max":[6.85,7.40,1.04]},
  {"min":[-1.85,-7.40,-1.04],"max":[1.85,4.90,1.04]}
 ],
 "baseDensity":0.045,
 "bodyDensity":0.16,
 "filamentDensity":0.30,
 "secondaryDensity":0.14,
 "sparkDensity":2.8,
 "extinction":0.40,
 "baseEmission":1.0,
 "filamentEmission":2.1,
 "secondaryEmission":1.4,
 "sparkEmission":9.0,
 "cold":[0.12,0.42,1.05],
 "violet":[0.68,0.26,1.05],
 "warm":[1.15,0.75,0.40],
 "anisotropy":0.28,
 "drift":[0.019,-0.032,0.027]
});
