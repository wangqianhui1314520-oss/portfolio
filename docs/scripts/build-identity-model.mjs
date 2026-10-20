// Extract the crystal T from the refined observatory so the work archive downloads only the identity.
// Usage: node scripts/build-identity-model.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(workspace, 'assets/models/tem-refined-observatory-v21-lod.glb');
const TARGET = resolve(workspace, 'assets/models/tem-identity-v21.glb');
const ROOT_NAME = 'T_IDENTITY_V19';

function readGLB(file) {
  const buffer = readFileSync(file);
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB file: ' + file);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  const binStart = 20 + jsonLength + 8;
  return {json, bin: buffer.subarray(binStart, binStart + buffer.readUInt32LE(20 + jsonLength))};
}

const pad4 = length => (length + 3) & ~3;
const {json: source, bin} = readGLB(SOURCE);
const rootIndex = source.nodes.findIndex(node => node.name === ROOT_NAME);
if (rootIndex === -1) throw new Error(ROOT_NAME + ' not found');

// Walk the identity subtree and remap every index it touches.
const nodeMap = new Map(), meshMap = new Map(), materialMap = new Map(), accessorMap = new Map(), viewMap = new Map();
const add = (map, index) => {if (!map.has(index)) map.set(index, map.size); return map.get(index);};
(function visit(index) {add(nodeMap, index); for (const child of source.nodes[index].children || []) visit(child);})(rootIndex);
for (const index of nodeMap.keys()) if (source.nodes[index].mesh !== undefined) add(meshMap, source.nodes[index].mesh);
for (const index of meshMap.keys()) for (const primitive of source.meshes[index].primitives) {
  if (primitive.targets?.length || Object.keys(primitive.extensions || {}).length) throw new Error('Unsupported primitive features in mesh ' + index);
  for (const accessor of [...Object.values(primitive.attributes), primitive.indices]) if (accessor !== undefined) add(accessorMap, accessor);
  if (primitive.material !== undefined) add(materialMap, primitive.material);
}
for (const index of materialMap.keys()) {
  if (JSON.stringify(source.materials[index]).includes('"index"')) throw new Error('Textured materials are not supported: ' + index);
}
for (const index of accessorMap.keys()) {
  const accessor = source.accessors[index];
  if (accessor.sparse) throw new Error('Sparse accessors are not supported: ' + index);
  add(viewMap, accessor.bufferView);
}

// One binary chunk holding only the referenced views, each kept 4-byte aligned.
const views = [], chunks = [];
let offset = 0;
for (const [index] of [...viewMap].sort((a, b) => a[1] - b[1])) {
  const view = source.bufferViews[index];
  const data = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  views.push({...view, buffer: 0, byteOffset: offset});
  chunks.push(data, Buffer.alloc(pad4(data.length) - data.length));
  offset += pad4(data.length);
}
const pick = (map, list, transform = value => value) => [...map].sort((a, b) => a[1] - b[1]).map(([index]) => transform(structuredClone(list[index])));
const nodes = pick(nodeMap, source.nodes, node => {
  if (node.children) node.children = node.children.map(child => nodeMap.get(child));
  if (node.mesh !== undefined) node.mesh = meshMap.get(node.mesh);
  if (node.skin !== undefined || node.camera !== undefined) throw new Error('Skins and cameras are not supported');
  return node;
});
const meshes = pick(meshMap, source.meshes, mesh => {
  for (const primitive of mesh.primitives) {
    for (const key of Object.keys(primitive.attributes)) primitive.attributes[key] = accessorMap.get(primitive.attributes[key]);
    if (primitive.indices !== undefined) primitive.indices = accessorMap.get(primitive.indices);
    if (primitive.material !== undefined) primitive.material = materialMap.get(primitive.material);
  }
  return mesh;
});
const accessors = pick(accessorMap, source.accessors, accessor => ({...accessor, bufferView: viewMap.get(accessor.bufferView)}));
const materials = pick(materialMap, source.materials);
const extensionsUsed = [...new Set(materials.flatMap(material => Object.keys(material.extensions || {})))].sort();

const gltf = {
  asset: {...source.asset, extras: {...source.asset.extras, source: 'tem-refined-observatory-v21-lod.glb', subtree: ROOT_NAME}},
  ...(extensionsUsed.length ? {extensionsUsed} : {}),
  scene: 0, scenes: [{name: 'TEM / Optical identity', nodes: [nodeMap.get(rootIndex)]}],
  nodes, meshes, materials, accessors, bufferViews: views, buffers: [{byteLength: offset}]
};
const jsonBuffer = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonChunk = Buffer.concat([jsonBuffer, Buffer.alloc(pad4(jsonBuffer.length) - jsonBuffer.length, 0x20)]);
const binChunk = Buffer.concat(chunks);
const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binHeader.writeUInt32LE(binChunk.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
writeFileSync(TARGET, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
console.log(`${TARGET.slice(workspace.length + 1).replaceAll('\\', '/')}: ${nodes.length} nodes, ${meshes.length} meshes, ${materials.length} materials, ${Math.round((12 + 16 + jsonChunk.length + binChunk.length) / 1024)} KB`);
