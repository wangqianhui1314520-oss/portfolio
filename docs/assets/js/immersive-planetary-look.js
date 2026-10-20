// Strict JSON is also read by the fixed Blender polish operation.
export const planetaryHorizonProfile=Object.freeze({
 "revision":"horizon-01",
 "id":"PLANET_V20_DAWN",
 "center":[1450,-1860,-3100],
 "radius":1650,
 "seed":20,
 "segments":96,
 "bands":64,
 "cloudInner":1.001,
 "cloudOuter":1.009,
 "atmosphereOuter":1.015294117647,
 "cloudOpticalDepth":150,
 "cloudAnisotropy":0.68,
 "fillDirection":[0.14,0.68,0.72],
 "fillColor":[0.34,0.49,0.74],
 "fillStrength":0.34
});

// The authored mesh has absolute metre coordinates. The orbital actor uses a
// radius-34 local coordinate system for its existing weather and flight poses.
// Copy once, without modifying the cached GLB or baking a camera transform.
export function localizeAuthoredPlanetGeometry(mesh,spec,baseRadius=34){
 if(!mesh?.isMesh||!mesh.geometry?.attributes?.position||!Array.isArray(spec?.center)||spec.center.length!==3||!spec.center.every(Number.isFinite)||!(spec.radius>0)||!Number.isFinite(spec.radius)||!(baseRadius>0)||!Number.isFinite(baseRadius))return null;
 mesh.updateWorldMatrix(true,false);
 const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
 geometry.translate(-spec.center[0],-spec.center[1],-spec.center[2]);
 geometry.scale(baseRadius/spec.radius,baseRadius/spec.radius,baseRadius/spec.radius);
 geometry.computeBoundingSphere();geometry.computeBoundingBox();
 if(!Number.isFinite(geometry.boundingSphere.radius)||!Number.isFinite(geometry.boundingSphere.center.length())||geometry.boundingSphere.center.length()>.1||Math.abs(geometry.boundingSphere.radius-baseRadius)>.1){geometry.dispose();return null;}
 return geometry;
}
