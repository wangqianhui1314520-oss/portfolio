"""Fixed MCP pass: editable animated volume inside the accepted solid T.

All existing geometry and transforms are protected. The two bounded chambers
are native volume domains, excluded from GLB export. WebGL integrates the same
numeric profile through the existing optical body's refracted view rays.
"""
import bpy, json, re, math, hashlib, struct, shutil, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blender/cinematic-v21'
SOURCE=OUT/'tem-refined-optical-observatory.blend'
if Path(bpy.data.filepath).resolve()!=SOURCE.resolve():raise RuntimeError('Open the accepted refined observatory first')
match=re.search(r'export const crystalMediumProfile=Object\.freeze\((\{[^;]+\})\);',(ROOT/'assets/js/immersive-crystal-look.js').read_text(encoding='utf8'))
if not match:raise RuntimeError('Canonical strict JSON crystal profile missing')
profile=json.loads(match.group(1))
if profile['revision']!='crystal-field-01':raise RuntimeError('Unexpected profile revision')
backup=OUT/'backup-crystal-field-01';backup.mkdir(parents=True,exist_ok=True)
for source in [SOURCE,OUT/'polish-deliverable-hashes.json']:
    if not (backup/source.name).exists():shutil.copy2(source,backup/source.name)
scene=bpy.data.scenes['05 — TEM / Refined Optical Observatory'];bpy.context.window.scene=scene;scene.frame_set(1)
root=bpy.data.objects['AUTHOR_V21_IDENTITY']
prefix='CRYSTAL01 chamber — '

def fingerprints():
    result={}
    for obj in bpy.data.objects:
        if obj.name.startswith(prefix):continue
        digest=hashlib.sha256();digest.update(obj.type.encode('ascii'));digest.update(struct.pack('<16d',*[v for row in obj.matrix_world for v in row]))
        if obj.type=='MESH':
            for v in obj.data.vertices:digest.update(struct.pack('<3f',*v.co))
            for p in obj.data.polygons:digest.update(struct.pack('<I',len(p.vertices)));digest.update(struct.pack('<%dI'%len(p.vertices),*p.vertices))
        result[obj.name]=digest.hexdigest()
    return result

before=fingerprints()
glbs=[ROOT/'assets/models'/n for n in ['tem-refined-observatory-v21.glb','tem-refined-observatory-v21-lod.glb']]
glb_before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in glbs}
collection=bpy.data.collections.get('V21.11 — Bounded identity crystal medium')
if collection is None:
    collection=bpy.data.collections.new('V21.11 — Bounded identity crystal medium');scene.collection.children.link(collection)

def material(index,bounds):
    mat=bpy.data.materials.new('TEM CRYSTAL FIELD 01 — '+str(index));mat.use_nodes=True
    nodes,links=mat.node_tree.nodes,mat.node_tree.links;nodes.clear()
    def value(socket,v):
        if hasattr(v,'node'):links.new(v,socket)
        else:socket.default_value=v
    def op(operation,*values,label=None):
        n=nodes.new('ShaderNodeMath');n.operation=operation;n.label=label or operation
        for socket,v in zip(n.inputs,values):value(socket,v)
        return n.outputs[0]
    def add(*values):
        result=values[0]
        for v in values[1:]:result=op('ADD',result,v)
        return result
    def mul(a,b):return op('MULTIPLY',a,b)
    def sub(a,b):return op('SUBTRACT',a,b)
    def smooth(v,lo,hi,label):
        n=nodes.new('ShaderNodeMapRange');n.clamp=True;n.interpolation_type='SMOOTHSTEP';n.label=label
        value(n.inputs['Value'],v);n.inputs['From Min'].default_value=lo;n.inputs['From Max'].default_value=hi
        n.inputs['To Min'].default_value=0;n.inputs['To Max'].default_value=1
        return n.outputs['Result']
    def combine(values,label):
        n=nodes.new('ShaderNodeCombineXYZ');n.label=label
        for socket,v in zip(n.inputs,values):value(socket,v)
        return n.outputs[0]
    coords=nodes.new('ShaderNodeTexCoord');coords.object=root;coords.label='True root-local coordinates / anchor follows the crystal'
    split=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['Object'],split.inputs[0])
    # Native B=(x,-z,y); restore the same local coordinate system as WebGL.
    x,y,z=split.outputs['X'],split.outputs['Z'],mul(split.outputs['Y'],-1)
    clock=nodes.new('ShaderNodeValue');clock.label='Seconds / editable animated field';clock.outputs[0].default_value=0
    clock.outputs[0].keyframe_insert('default_value',frame=1);clock.outputs[0].default_value=479/24;clock.outputs[0].keyframe_insert('default_value',frame=480)
    t=clock.outputs[0];drift=[mul(t,d) for d in profile['drift']]
    bodyvec=combine([mul(add(mul(p,s),d),1/8) for p,s,d in zip([x,y,z],[.32,.28,.62],drift)],'Slow three-dimensional body advection')
    finevec=combine([mul(add(mul(p,.92),mul(d,-.71),offset),1/16) for p,d,offset in zip([x,y,z],drift,[4.7,9.1,2.8])],'Independent detail advection')
    noise=nodes.new('ShaderNodeTexNoise');noise.label='Spatial optical body / no image';noise.inputs['Scale'].default_value=8;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.6;links.new(bodyvec,noise.inputs['Vector'])
    fine=nodes.new('ShaderNodeTexNoise');fine.label='True 3D internal detail';fine.inputs['Scale'].default_value=16;fine.inputs['Detail'].default_value=2;links.new(finevec,fine.inputs['Vector'])
    body,detail=noise.outputs['Fac'],fine.outputs['Fac']
    phase=add(mul(y,.72),mul(x,.31),mul(op('SINE',add(mul(z,2.3),mul(t,.14))),.58),mul(body,1.7))
    filament=op('POWER',op('MAXIMUM',sub(1,op('ABSOLUTE',op('SINE',phase))),0),10,label='Primary curved optical filament')
    phase2=add(mul(y,.39),mul(x,-.44),mul(z,1.9),mul(body,.7),mul(t,.11))
    secondary=op('POWER',op('MAXIMUM',sub(1,op('ABSOLUTE',op('SINE',phase2))),0),18,label='Fine crossing filament / moving in depth')
    dust=nodes.new('ShaderNodeTexNoise');dust.label='Sparse volumetric glints / native noise';dust.inputs['Scale'].default_value=7;dust.inputs['Detail'].default_value=1
    links.new(combine([add(p,mul(d,.27)) for p,d in zip([x,y,z],drift)],'Dust drift'),dust.inputs['Vector'])
    spark=op('POWER',smooth(dust.outputs['Fac'],.73,.91,'Sparse warm glint occupancy'),3)
    lo,hi=bounds['min'],bounds['max']
    wallx=op('MINIMUM',sub(x,lo[0]),sub(hi[0],x));wallz=op('MINIMUM',sub(z,lo[2]),sub(hi[2],z))
    if index==0:
        under=add(100,mul(smooth(op('ABSOLUTE',x),1.67,1.85,'Continuous bar/stem joint'),sub(sub(y,lo[1]),100)))
        wally=op('MINIMUM',sub(hi[1],y),under)
    else:wally=sub(y,lo[1])
    inside=smooth(op('MINIMUM',op('MINIMUM',wallx,wally),wallz),0,.18,'Feather only the optical outer walls')
    density=mul(mul(inside,add(profile['baseDensity'],mul(mul(body,detail),profile['bodyDensity']),mul(filament,profile['filamentDensity']),mul(secondary,profile['secondaryDensity']),mul(spark,profile['sparkDensity']))),profile['extinction'])
    blend=smooth(body,.24,.82,'Blue to violet optical depth')
    channels=[]
    for cold,violet,warm in zip(profile['cold'],profile['violet'],profile['warm']):
        base=add(cold,mul(blend,violet-cold));channels.append(add(base,mul(mul(spark,.34),sub(warm,base))))
    color=combine(channels,'Explicit spectral interpolation / preserves native volume stability')
    volume=nodes.new('ShaderNodeVolumePrincipled');volume.label='Bounded real scattering + emissive filaments';volume.inputs['Anisotropy'].default_value=profile['anisotropy']
    value(volume.inputs['Density'],density);links.new(color,volume.inputs['Color']);links.new(color,volume.inputs['Emission Color'])
    strength=mul(density,add(profile['baseEmission'],mul(filament,profile['filamentEmission']),mul(secondary,profile['secondaryEmission']),mul(spark,profile['sparkEmission'])))
    value(volume.inputs['Emission Strength'],strength)
    output=nodes.new('ShaderNodeOutputMaterial');links.new(volume.outputs[0],output.inputs['Volume'])
    for i,n in enumerate(nodes):n.location=((i//12)*250,(i%12)*-160)
    output.location=(volume.location.x+300,volume.location.y)
    mat['tem_medium_revision']=profile['revision'];mat['tem_image_dependency']=False
    return mat

changes=[]
for index,bounds in enumerate(profile['chambers']):
    name=prefix+str(index);obj=bpy.data.objects.get(name)
    if obj is None:
        lo,hi=bounds['min'],bounds['max']
        vertices=[(x,-z,y) for x,y,z in [(lo[0],lo[1],lo[2]),(hi[0],lo[1],lo[2]),(hi[0],hi[1],lo[2]),(lo[0],hi[1],lo[2]),(lo[0],lo[1],hi[2]),(hi[0],lo[1],hi[2]),(hi[0],hi[1],hi[2]),(lo[0],hi[1],hi[2])]]
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]);mesh.update()
        obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj);obj.parent=root
    obj['tem_export']=False;obj['tem_medium_revision']=profile['revision'];obj['tem_local_bounds']=json.dumps(bounds);obj.display_type='WIRE'
    previous=obj.active_material;mat=material(index,bounds);obj.data.materials.clear();obj.data.materials.append(mat)
    if previous and previous.get('tem_medium_revision')==profile['revision'] and previous.users==0:bpy.data.materials.remove(previous)
    changes.append({'object':obj.name,'parent':obj.parent.name,'bounds':bounds,'nodes':len(mat.node_tree.nodes),'imageNodes':sum(n.type=='TEX_IMAGE' for n in mat.node_tree.nodes),'animatedNode':True,'webExport':False})
scene.frame_set(1);bpy.context.view_layer.update()
after=fingerprints()
if before!=after:raise RuntimeError('Existing scene geometry or transforms changed')
if glb_before!={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in glbs}:raise RuntimeError('Web geometry unexpectedly changed')
text=bpy.data.texts.get('TEM_CRYSTAL_MEDIUM_PROFILE') or bpy.data.texts.new('TEM_CRYSTAL_MEDIUM_PROFILE');text.clear();text.write(json.dumps(profile,indent=2)+'\nNative volume inside existing closed crystal. Runtime integrates the same profile through refracted rays. Native noise/transport differ; no assertion of pixel equivalence.\n')
scene['tem_crystal_medium_revision']=profile['revision']
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
report={'revision':'21.11','pass':profile['revision'],'source':str(SOURCE),'backup':str(backup),'protectedObjects':len(before),'geometryProtected':True,'glbHashesUnchanged':glb_before,'volumes':changes,'profile':profile,'imagesIntroduced':0,'savedAt':time.time()}
(OUT/'polish-crystal-medium.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('TEM_CRYSTAL_MEDIUM_POLISH_COMPLETE',flush=True)
