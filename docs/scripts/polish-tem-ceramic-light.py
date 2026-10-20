"""Fixed incremental material/light pass; no geometry or camera rebuild.

Two native procedural ceramic coatings and a fractional stellar receiver are
shared numerically with WebGL. Only the matching GLB JSON materials change;
all binary geometry bytes, nodes, accessors and other materials are protected.
"""
import bpy,json,re,shutil,hashlib,struct,time,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'blender/cinematic-v21'
SOURCE=OUT/'tem-refined-optical-observatory.blend'
if Path(bpy.data.filepath).resolve()!=SOURCE.resolve():raise RuntimeError('Start with the saved accepted observatory')
match=re.search(r'export const surfaceLightProfile=Object\.freeze\((\{[^;]+\})\);',(ROOT/'assets/js/immersive-surface-look.js').read_text(encoding='utf8'))
if not match:raise RuntimeError('Missing canonical coating profile')
profile=json.loads(match.group(1))
if profile['revision']!='ceramic-light-01':raise RuntimeError('Unexpected material revision')
backup=OUT/'backup-ceramic-light-01';backup.mkdir(parents=True,exist_ok=True)
models=ROOT/'assets/models';glbs=[models/'tem-refined-observatory-v21.glb',models/'tem-refined-observatory-v21-lod.glb']
for file in [SOURCE,OUT/'polish-deliverable-hashes.json',OUT/'manifest.json',models/'tem-refined-observatory-v21.json',*glbs]:
    if not (backup/file.name).exists():shutil.copy2(file,backup/file.name)
scene=bpy.data.scenes['05 — TEM / Refined Optical Observatory'];bpy.context.window.scene=scene;scene.frame_set(1)
def fingerprints():
    result={}
    for obj in bpy.data.objects:
        if obj.name.startswith('CERAMIC01 fractional stellar key'):continue
        d=hashlib.sha256();d.update(obj.type.encode('ascii'));d.update(struct.pack('<16d',*[v for row in obj.matrix_world for v in row]))
        if obj.type=='MESH':
            for v in obj.data.vertices:d.update(struct.pack('<3f',*v.co))
            for p in obj.data.polygons:d.update(struct.pack('<I',len(p.vertices)));d.update(struct.pack('<%dI'%len(p.vertices),*p.vertices))
        result[obj.name]=d.hexdigest()
    return result
before=fingerprints();coatings=[];materials=[]
for spec in profile['materials']:
    matches=[m for m in bpy.data.materials if m.name.startswith(spec['prefix'])]
    if len(matches)!=1:raise RuntimeError('Expected exactly one saved coating '+spec['prefix'])
    mat=matches[0];nodes,links=mat.node_tree.nodes,mat.node_tree.links
    p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for n in list(nodes):
        if n.label.startswith('CERAMIC01 '):nodes.remove(n)
    for name,value in {'Base Color':(*spec['color'],1),'Metallic':spec['metalness'],'Roughness':spec['roughness'],'Coat Weight':spec['clearcoat'],'Coat Roughness':spec['clearcoatRoughness'],'Specular IOR Level':spec['specularFactor']/2}.items():
        socket=p.inputs[name]
        for link in list(socket.links):links.remove(link)
        socket.default_value=value
    coords=nodes.new('ShaderNodeTexCoord');coords.label='CERAMIC01 spatial finish coordinates';coords.location=(-800,-200)
    noise=nodes.new('ShaderNodeTexNoise');noise.label='CERAMIC01 fine three-dimensional satin finish';noise.inputs['Scale'].default_value=170;noise.inputs['Detail'].default_value=2;noise.inputs['Roughness'].default_value=.6;noise.location=(-600,-200);links.new(coords.outputs['Object'],noise.inputs['Vector'])
    remap=nodes.new('ShaderNodeMapRange');remap.label='CERAMIC01 bounded microscopic roughness';remap.inputs['From Min'].default_value=0;remap.inputs['From Max'].default_value=1;remap.inputs['To Min'].default_value=spec['roughness']-profile['finishVariation'];remap.inputs['To Max'].default_value=spec['roughness']+profile['finishVariation'];remap.clamp=True;remap.location=(-350,-200);links.new(noise.outputs['Fac'],remap.inputs['Value']);links.new(remap.outputs['Result'],p.inputs['Roughness'])
    mat['tem_surface_revision']=profile['revision'];mat['tem_image_dependency']=False;materials.append(mat)
    coatings.append({'material':mat.name,'profile':spec,'nativeRoughnessRange':[spec['roughness']-profile['finishVariation'],spec['roughness']+profile['finishVariation']],'imageNodes':sum(n.type=='TEX_IMAGE' for n in nodes)})
sun=bpy.data.objects['V21 shared distant sunlight'];original_energy=sun.data.energy;sun_matrix=sun.matrix_world.copy()
receivers=sun.light_linking.receiver_collection
if receivers is None:raise RuntimeError('Existing interior solar receiver collection is required')
if any(item.light_linking.link_state!='EXCLUDE' for item in receivers.collection_objects):raise RuntimeError('Unexpected existing solar receiver policy')
fraction=bpy.data.collections.get('CERAMIC01 fractional sun receivers')
if fraction is None:fraction=bpy.data.collections.new('CERAMIC01 fractional sun receivers')
ceramic_objects=[o for o in scene.objects if o.type=='MESH' and any(slot.material in materials for slot in o.material_slots)]
if not ceramic_objects:raise RuntimeError('No actual ceramic geometry found')
for obj in ceramic_objects:
    if obj.name not in receivers.objects:receivers.objects.link(obj)
    if obj.name not in fraction.objects:fraction.objects.link(obj)
for item in receivers.collection_objects:item.light_linking.link_state='EXCLUDE'
for item in fraction.collection_objects:item.light_linking.link_state='INCLUDE'
secondary=bpy.data.objects.get('CERAMIC01 fractional stellar key')
if secondary is None:
    secondary=sun.copy();secondary.data=sun.data.copy();secondary.name='CERAMIC01 fractional stellar key';scene.collection.objects.link(secondary)
secondary.matrix_world=sun_matrix;secondary.data.energy=original_energy*profile['sunVisibility'];secondary.light_linking.receiver_collection=fraction
secondary['tem_surface_revision']=profile['revision']
scene.frame_set(1);bpy.context.view_layer.update()
after=fingerprints()
if before!=after:raise RuntimeError('Original object geometry or transforms changed')
if sun.matrix_world!=sun_matrix or sun.data.energy!=original_energy:raise RuntimeError('External primary sun changed')

def patch(file):
    raw=file.read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);rest=raw[20+size:];original=copy.deepcopy(doc);indices=[]
    for i,mat in enumerate(doc['materials']):
        spec=next((s for s in profile['materials'] if mat.get('name','').startswith(s['prefix'])),None)
        if not spec:continue
        indices.append(i);pbr=mat.setdefault('pbrMetallicRoughness',{});pbr.update(baseColorFactor=[*spec['color'],1],metallicFactor=spec['metalness'],roughnessFactor=spec['roughness'])
        ext=mat.setdefault('extensions',{});ext['KHR_materials_clearcoat']={'clearcoatFactor':spec['clearcoat'],'clearcoatRoughnessFactor':spec['clearcoatRoughness']};ext['KHR_materials_specular']={'specularFactor':spec['specularFactor']}
        mat.setdefault('extras',{})['tem_surface_revision']=profile['revision']
    if len(indices)!=2:raise RuntimeError('Both GLB ceramic batches must be present')
    protected=copy.deepcopy(doc)
    for i in indices:protected['materials'][i]=original['materials'][i]
    if protected!=original:raise RuntimeError('An unrelated GLB field changed')
    encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=True).encode('utf8');encoded+=b' '*((-len(encoded))%4)
    output=struct.pack('<III',0x46546c67,2,20+len(encoded)+len(rest))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+rest
    file.write_bytes(output);new=file.read_bytes();new_size=struct.unpack_from('<I',new,12)[0]
    if new[20+new_size:]!=rest:raise RuntimeError('Binary geometry data changed')
    return {'file':str(file),'bytes':len(new),'materialIndices':indices,'protectedBinaryHash':hashlib.sha256(rest).hexdigest(),'otherJSONUnchanged':True,'images':len(doc.get('images',[]))}

assets=[patch(file) for file in glbs]
for file in [OUT/'manifest.json',models/'tem-refined-observatory-v21.json']:
    data=json.loads(file.read_text(encoding='utf8'));data['surfaceLighting']=profile
    for key,asset in zip(['full','lod'],assets):
        if key in data.get('assets',{}):data['assets'][key]['bytes']=asset['bytes']
    data.setdefault('materialGuide',{})['ceramic'].update(metalness=profile['materials'][0]['metalness'],roughness=profile['materials'][0]['roughness'],clearcoat=profile['materials'][0]['clearcoat'],specularFactor=profile['materials'][0]['specularFactor'])
    file.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding='utf8')
text=bpy.data.texts.get('TEM_SURFACE_LIGHT_PROFILE') or bpy.data.texts.new('TEM_SURFACE_LIGHT_PROFILE');text.clear();text.write(json.dumps(profile,indent=2)+'\nFractional cabin solar visibility preserves the primary exterior sun. Native spatial noise and browser analytic finish differ. All geometry and cameras protected.\n')
scene['tem_surface_revision']=profile['revision'];bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
report={'revision':'21.12','pass':profile['revision'],'source':str(SOURCE),'backup':str(backup),'protectedObjects':len(before),'geometryAndTransformsProtected':True,'primarySunUnchanged':True,'primarySunEnergy':original_energy,'fractionalSunEnergy':secondary.data.energy,'fractionalSunReceivers':len(ceramic_objects),'coatings':coatings,'assets':assets,'imagesIntroduced':0,'savedAt':time.time()}
(OUT/'polish-ceramic-light.json').write_text(json.dumps(report,indent=2),encoding='utf8');print('TEM_CERAMIC_LIGHT_POLISH_COMPLETE',flush=True)
