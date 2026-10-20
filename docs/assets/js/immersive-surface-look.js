// Numeric coating/light-receiver profile shared with the fixed Blender pass.
// Texture functions are native to each renderer; no surface is image-baked.
export const surfaceLightProfile=Object.freeze({
 "revision":"ceramic-light-01",
 "sunVisibility":0.18,
 "finishVariation":0.015,
 "materials":[
  {"prefix":"V21_PEARL_CERAMIC","color":[0.58,0.66,0.73],"metalness":0.035,"roughness":0.30,"clearcoat":0.28,"clearcoatRoughness":0.23,"specularFactor":0.50},
  {"prefix":"V21_PLINTH_PEARL","color":[0.62,0.69,0.76],"metalness":0.035,"roughness":0.31,"clearcoat":0.32,"clearcoatRoughness":0.23,"specularFactor":0.48}
 ]
});
