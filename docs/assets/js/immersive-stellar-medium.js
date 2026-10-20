// Canonical numeric art direction. Blender reads the strict JSON object inside
// Object.freeze without executing JavaScript. Live, mirror and lighting rays
// use the same profile; their native noise implementations remain different.
export const stellarMediumProfile=Object.freeze({
 "revision":"filament-01",
 "bulkLow":0.455,
 "bulkHigh":0.70,
 "bulkPower":1.20,
 "strandPower":3.40,
 "strandStrength":0.19,
 "riverWidth":3.60,
 "branchWidth":5.20,
 "ambientDensity":0.008,
 "densityGain":3.10,
 "filamentEmission":2.40,
 "nurseryEmission":7.80,
 "dustAbsorption":0.78
});
