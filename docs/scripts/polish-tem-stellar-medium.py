"""Fixed MCP pass: reshape existing gas materials in two accepted projects.

No geometry is rebuilt and no image is introduced. The live GLSL and Blender
share a numeric medium profile and analytic river/envelope shaping. Blender's
4D noise and the browser's interpolated 3D noise are native implementations,
not an assertion that the two renderers produce identical pixels.
"""
import bpy, json, re, math, shutil, hashlib, struct, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blender/cinematic-v21'
PROFILE_SOURCE=ROOT/'assets/js/immersive-stellar-medium.js'
match=re.search(r'export const stellarMediumProfile=Object\.freeze\((\{[^;]+\})\);',PROFILE_SOURCE.read_text(encoding='utf8'))
if not match: raise RuntimeError('Canonical strict JSON profile is missing')
profile=json.loads(match.group(1))
if profile['revision']!='filament-01': raise RuntimeError('Unexpected medium profile')
metadata=json.loads((ROOT/'assets/models/tem-star-sea-v20.json').read_text(encoding='utf8'))
specs={s['id']:s for s in metadata['volumeRegions'] if s.get('kind')!='cloud-sea'}
projects=[(ROOT/'blender/cinematic-v20/tem-living-star-sea.blend','04 — TEM / Living Star Sea','V20.04 — Animated real nebula volumes'),
          (OUT/'tem-refined-optical-observatory.blend','05 — TEM / Refined Optical Observatory','V21.07 — Private sparse stellar gas volumes')]
if Path(bpy.data.filepath).resolve()!=projects[0][0].resolve(): raise RuntimeError('MCP must start with the saved star sea')
backup=OUT/'before-stellar-filament-01';backup.mkdir(parents=True,exist_ok=True)
for source,_,_ in projects:
    if not source.is_file(): raise RuntimeError('Saved engineering source is missing')
    if not (backup/source.name).exists(): shutil.copy2(source,backup/source.name)

def geometry_fingerprint():
    digest=hashlib.sha256()
    for obj in sorted(bpy.data.objects,key=lambda o:o.name):
        digest.update(obj.name.encode('utf8'));digest.update(obj.type.encode('ascii'))
        digest.update(struct.pack('<16d',*[v for row in obj.matrix_world for v in row]))
        if obj.type=='MESH':
            for vertex in obj.data.vertices: digest.update(struct.pack('<3f',*vertex.co))
            for polygon in obj.data.polygons: digest.update(struct.pack('<I',len(polygon.vertices)));digest.update(struct.pack('<%dI'%len(polygon.vertices),*polygon.vertices))
    return digest.hexdigest()

def sculpt_material(obj,spec):
    old=obj.active_material
    material=old.copy();material.name='TEM FILAMENT 01 — '+spec['id'];material.use_nodes=True
    nodes,links=material.node_tree.nodes,material.node_tree.links;nodes.clear()
    def value(input_socket,v):
        if hasattr(v,'node'): links.new(v,input_socket)
        else: input_socket.default_value=v
    def op(operation,*values,label=None):
        node=nodes.new('ShaderNodeMath');node.operation=operation;node.label=label or operation
        for socket,v in zip(node.inputs,values):value(socket,v)
        return node.outputs[0]
    def smooth(v,low,high,label):
        node=nodes.new('ShaderNodeMapRange');node.clamp=True;node.interpolation_type='SMOOTHSTEP';node.label=label
        value(node.inputs['Value'],v);node.inputs['From Min'].default_value=low;node.inputs['From Max'].default_value=high
        node.inputs['To Min'].default_value=0;node.inputs['To Max'].default_value=1
        return node.outputs['Result']
    def add(*values):
        result=values[0]
        for v in values[1:]:result=op('ADD',result,v)
        return result
    def mul(a,b):return op('MULTIPLY',a,b)
    def sub(a,b):return op('SUBTRACT',a,b)
    def gaussian(v):return op('EXPONENT',mul(mul(v,v),-1))
    tex=nodes.new('ShaderNodeTexCoord');tex.label='Existing ellipsoid: normalized object bounds'
    split=nodes.new('ShaderNodeSeparateXYZ');links.new(tex.outputs['Generated'],split.inputs[0])
    # Blender B=(x,-z,y), all three coordinates remain spatial.
    x=sub(mul(split.outputs['X'],2),1);y=sub(mul(split.outputs['Z'],2),1);z=sub(1,mul(split.outputs['Y'],2))
    combine=nodes.new('ShaderNodeCombineXYZ')
    for socket,v in zip(combine.inputs,[add(mul(x,.44),mul(y,.22),mul(z,-.25)),add(mul(y,.74),mul(x,-.38),mul(z,.12)),add(mul(z,.70),mul(x,.22))]):value(socket,v)
    noise=nodes.new('ShaderNodeTexNoise');noise.noise_dimensions='4D';noise.label='True animated three-dimensional gas / native 4D noise'
    links.new(combine.outputs[0],noise.inputs['Vector']);noise.inputs['Scale'].default_value=4.75;noise.inputs['Detail'].default_value=5;noise.inputs['Roughness'].default_value=.64
    noise.inputs['W'].default_value=spec['seed']*.19;noise.inputs['W'].keyframe_insert('default_value',frame=1)
    noise.inputs['W'].default_value=spec['seed']*.19+2.4;noise.inputs['W'].keyframe_insert('default_value',frame=480)
    fine=nodes.new('ShaderNodeTexNoise');fine.noise_dimensions='4D';fine.label='Fine ionized ridges'
    links.new(combine.outputs[0],fine.inputs['Vector']);fine.inputs['Scale'].default_value=10.5;fine.inputs['Detail'].default_value=3;fine.inputs['Roughness'].default_value=.62
    fine.inputs['W'].default_value=spec['seed']*.31;fine.inputs['W'].keyframe_insert('default_value',frame=1)
    fine.inputs['W'].default_value=spec['seed']*.31+3.2;fine.inputs['W'].keyframe_insert('default_value',frame=480)
    body=noise.outputs['Fac'];detail=fine.outputs['Fac']
    envelope=op('POWER',op('MAXIMUM',sub(1,add(mul(x,x),mul(y,y),mul(z,z))),0),1.5,label='Exact finite ellipsoid envelope')
    bulk=op('POWER',smooth(add(mul(body,.73),mul(detail,.27)),profile['bulkLow'],profile['bulkHigh'],'Shared bulk threshold'),profile['bulkPower'])
    ridge=sub(1,op('ABSOLUTE',sub(mul(detail,2),1)))
    strands=mul(mul(op('POWER',ridge,3*profile['strandPower']),smooth(body,.42,.67,'Filament occupancy')),profile['strandStrength'])
    wave=op('SINE',add(mul(x,1.9),spec['seed']*.31))
    river=gaussian(mul(add(y,mul(x,-.90),mul(z,.30),mul(wave,-.17)),profile['riverWidth']))
    branch=mul(gaussian(mul(add(y,mul(x,.54),mul(z,-.24),-.43),profile['branchWidth'])),.34)
    lane=add(profile['ambientDensity'],mul(op('MAXIMUM',river,branch),1-profile['ambientDensity']))
    cavity=smooth(detail,.54,.72,'Dark void erosion')
    density=mul(mul(mul(add(bulk,strands),sub(1,mul(cavity,.88))),lane),profile['densityGain'])
    nursery_profiles={27:(-.06,.15,-.25,1),11:(.26,.32,.16,.28),51:(-.08,.23,-.18,.48),67:(.15,.32,.09,.52)}
    center=nursery_profiles.get(spec['seed'],(0,0,0,0))
    core=[mul(sub(axis,origin),stretch) for axis,origin,stretch in zip([x,y,z],center,[1.7,2.4,1.3])]
    heart=mul(gaussian(op('SQRT',mul(add(*[mul(c,c) for c in core]),10))),center[3])
    density=mul(mul(add(density,mul(heart,.28)),envelope),spec['density'])
    dust=smooth(detail,.43,.68,'Absorbing fine dust')
    # Explicit channel interpolation avoids this installed Cycles build's
    # MixNode::is_linear_operation crash while optimizing a volume-only graph.
    # The algebra is the same linear interpolation; no shading is baked out.
    color=nodes.new('ShaderNodeCombineXYZ');color.label='Absorbing dust color / explicit channel interpolation'
    for socket,base,dark in zip(color.inputs,spec['color'],[.005,.009,.022]):value(socket,add(base,mul(mul(dust,profile['dustAbsorption']),dark-base)))
    volume=nodes.new('ShaderNodeVolumePrincipled');volume.label='Spatial extinction + local ionized emission';volume.inputs['Anisotropy'].default_value=.34
    value(volume.inputs['Density'],density);links.new(color.outputs[0],volume.inputs['Color'])
    ion=nodes.new('ShaderNodeCombineXYZ');ion.label='Ionized gas color / explicit channel interpolation'
    for socket,blue,violet in zip(ion.inputs,[.15,.42,.98],[.58,.25,.98]):value(socket,add(blue,mul(detail,violet-blue)))
    links.new(ion.outputs[0],volume.inputs['Emission Color'])
    emission=add(.62,mul(op('POWER',ridge,3*profile['strandPower']),profile['filamentEmission']),mul(heart,profile['nurseryEmission']))
    value(volume.inputs['Emission Strength'],mul(density,emission))
    output=nodes.new('ShaderNodeOutputMaterial');links.new(volume.outputs[0],output.inputs['Volume'])
    obj.active_material=material;material['tem_medium_revision']=profile['revision'];material['tem_image_dependency']=False
    obj['tem_medium_revision']=profile['revision']
    if old.get('tem_medium_revision')==profile['revision'] and old.users==0:bpy.data.materials.remove(old)
    # Pack for editable engineering: the graph is grouped by meaning rather
    # than a flat overlapping default pile. No nodes are baked to an image.
    for i,node in enumerate(nodes):node.location=((i//12)*260,(i%12)*-180)
    output.location=(nodes[-2].location.x+300,0)
    return {'object':obj.name,'region':spec['id'],'nodes':len(nodes),'imageNodes':sum(n.type=='TEX_IMAGE' for n in nodes),'animated3DNoiseNodes':2,'profile':profile['revision']}

results=[]
for index,(source,scene_name,collection_name) in enumerate(projects):
    if index:bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.data.scenes[scene_name];bpy.context.window.scene=scene;scene.frame_set(1)
    before=geometry_fingerprint();collection=bpy.data.collections[collection_name];changes=[]
    for obj in collection.objects:
        name=obj.get('tem_runtime_spec')
        if name in specs:changes.append(sculpt_material(obj,specs[name]))
    if len(changes)!=5:raise RuntimeError('All five existing stellar volumes must be polished')
    scene.frame_set(1)
    after=geometry_fingerprint()
    if before!=after:raise RuntimeError('Material polish unexpectedly moved or rebuilt geometry')
    scene['tem_stellar_medium_revision']=profile['revision']
    text=bpy.data.texts.get('TEM_STELLAR_MEDIUM_PROFILE') or bpy.data.texts.new('TEM_STELLAR_MEDIUM_PROFILE')
    text.clear();text.write(json.dumps(profile,indent=2)+'\nShared analytic bounds and density art direction. Native noise and light transport differ between Blender and WebGL. No image dependency. Geometry hash preserved.\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    results.append({'source':str(source),'scene':scene_name,'geometryBefore':before,'geometryAfter':after,'volumes':changes,'saved':True})
    print('TEM_STELLAR_MEDIUM_PROJECT_SAVED',str(source),flush=True)
report={'revision':'21.8','pass':profile['revision'],'profile':profile,'backup':str(backup),'projects':results,'environmentImagesIntroduced':0,'webGeometryRebuilt':False,'savedAt':time.time()}
(OUT/'polish-stellar-medium.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('TEM_STELLAR_MEDIUM_POLISH_COMPLETE',flush=True)
