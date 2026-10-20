"""Fixed project MCP pass: inspect or incrementally refine the authored Dawn.

Only the named planet and its optical shells may change; protected structures
are fingerprinted. No scene reconstruction or environment image is allowed.
"""
import bpy, json, sys, re, hashlib, struct, time, math, shutil, copy
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blender/cinematic-v21'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
inspect='--inspect' in args
source=ROOT/'assets/js/immersive-planetary-look.js'
match=re.search(r'export const planetaryHorizonProfile=Object\.freeze\((\{[^;]+\})\);',source.read_text(encoding='utf-8'))
if not match:raise RuntimeError('Canonical planetary profile is missing')
profile=json.loads(match.group(1))
if profile['revision']!='horizon-01':raise RuntimeError('Unsupported horizon pass')
projects=[ROOT/'blender/cinematic-v20/tem-living-star-sea.blend',OUT/'tem-refined-optical-observatory.blend',OUT/'tem-refined-fleet.blend']

def web(v):return [v.x,v.z,-v.y]
def native(v):return Vector((v[0],-v[2],v[1]))

def protected_geometry():
    result={}
    for obj in bpy.data.objects:
        if 'PLANET_V20_DAWN' in obj.name or obj.name.startswith('HORIZON01'):continue
        h=hashlib.sha256();h.update(obj.type.encode());h.update(struct.pack('<16f',*[v for row in obj.matrix_world for v in row]))
        if obj.type=='MESH':
            for v in obj.data.vertices:h.update(struct.pack('<3f',*v.co))
            for p in obj.data.polygons:h.update(struct.pack('<I',len(p.vertices))+struct.pack('<'+'I'*len(p.vertices),*p.vertices))
        result[obj.name]=h.hexdigest()
    return result

def sphere_data(name,radius):
    # Absolute Y-up metres are converted only once, at the native boundary.
    c=profile['center'];s=profile['segments'];b=profile['bands'];verts=[native([c[0],c[1]+radius,c[2]])];faces=[]
    for j in range(1,b):
        theta=math.pi*j/b
        for i in range(s):
            phi=2*math.pi*i/s;verts.append(native([c[0]+radius*math.sin(theta)*math.cos(phi),c[1]+radius*math.cos(theta),c[2]+radius*math.sin(theta)*math.sin(phi)]))
    bottom=len(verts);verts.append(native([c[0],c[1]-radius,c[2]]))
    for i in range(s):faces.append((0,1+(i+1)%s,1+i))
    for j in range(b-2):
        a=1+j*s;n=a+s
        for i in range(s):k=(i+1)%s;faces.append((a+i,a+k,n+k,n+i))
    for i in range(s):faces.append((bottom,1+(b-2)*s+i,1+(b-2)*s+(i+1)%s))
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    # The face winding above is checked, rather than assuming exporter normals.
    for p in data.polygons:
        if (p.center-native(c)).dot(p.normal)<0:
            data.flip_normals();break
    for p in data.polygons:p.use_smooth=True
    return data

def replace_sphere(obj,radius):
    material=list(obj.data.materials);old=obj.data;obj.data=sphere_data(obj.name+' — horizon01',radius)
    for m in material:obj.data.materials.append(m)
    if old.users==0:bpy.data.meshes.remove(old)
    obj['tem_center']=profile['center'];obj['tem_radius']=radius;obj['tem_horizon_revision']=profile['revision']

def optical_material(name,kind):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name);mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
    def node(t,name):n=nodes.new(t);n.label=name;n.name=name;return n
    def math_node(op,a,b=None,label=None):
        n=node('ShaderNodeMath',label or op);n.operation=op
        for i,x in enumerate([a,b]):
            if x is None:continue
            if isinstance(x,(int,float)):n.inputs[i].default_value=x
            else:links.new(x,n.inputs[i])
        return n.outputs[0]
    def ramp(value,entries,label):
        n=node('ShaderNodeValToRGB',label);links.new(value,n.inputs[0]);r=n.color_ramp
        r.elements.remove(r.elements[1]);r.elements[0].position=entries[0][0];r.elements[0].color=(*entries[0][1],1)
        for p,c in entries[1:]:e=r.elements.new(p);e.color=(*c,1)
        return n.outputs['Color']
    def noise(vector,scale,label,animated=False):
        n=node('ShaderNodeTexNoise',label);n.noise_dimensions='4D' if animated else '3D';n.inputs['Scale'].default_value=scale;n.inputs['Detail'].default_value=3.5;n.inputs['Roughness'].default_value=.48
        links.new(vector,n.inputs['Vector'])
        if animated:
            n.inputs['W'].default_value=0;n.inputs['W'].keyframe_insert('default_value',frame=1)
            n.inputs['W'].default_value=.65;n.inputs['W'].keyframe_insert('default_value',frame=480)
        return n.outputs['Fac']
    geom=node('ShaderNodeNewGeometry','Absolute native position');subtract=node('ShaderNodeVectorMath','Planet-centred coordinates');subtract.operation='SUBTRACT';subtract.inputs[1].default_value=native(profile['center']);links.new(geom.outputs['Position'],subtract.inputs[0])
    scale=node('ShaderNodeVectorMath','Unit planetary radius');scale.operation='SCALE';scale.inputs['Scale'].default_value=1/profile['radius'];links.new(subtract.outputs['Vector'],scale.inputs[0]);coords=scale.outputs['Vector']
    out=node('ShaderNodeOutputMaterial','Native light transport')
    if kind=='surface':
        terrain=noise(coords,4.7,'Continental shelves');detail=noise(coords,48,'Terrain micro relief')
        albedo=ramp(terrain,[(.32,(.008,.031,.058)),(.475,(.022,.077,.102)),(.501,(.063,.105,.086)),(.62,(.24,.21,.15)),(.76,(.37,.36,.32))],'Ocean / coast / terrain')
        roughness=ramp(terrain,[(.47,(.24,.24,.24)),(.505,(.68,.68,.68))],'Ocean gloss to terrestrial roughness')
        bsdf=node('ShaderNodeBsdfPrincipled','Layered planet surface');links.new(albedo,bsdf.inputs['Base Color']);links.new(roughness,bsdf.inputs['Roughness']);bsdf.inputs['Coat Weight'].default_value=.18;bsdf.inputs['Coat Roughness'].default_value=.28
        bump=node('ShaderNodeBump','Kilometre-scale relief');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=1.5;links.new(detail,bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal']);links.new(bsdf.outputs[0],out.inputs['Surface'])
    else:
        length=node('ShaderNodeVectorMath','Radial altitude');length.operation='LENGTH';links.new(coords,length.inputs[0])
        if kind=='cloud':
            h=math_node('DIVIDE',math_node('SUBTRACT',length.outputs['Value'],profile['cloudInner']),profile['cloudOuter']-profile['cloudInner'])
            envelope=ramp(h,[(0,(0,0,0)),(.24,(1,1,1)),(.63,(1,1,1)),(1,(0,0,0))],'Finite hollow weather layer')
            coverage=ramp(noise(coords,8.1,'Large-scale weather coverage'),[(.33,(0,0,0)),(.67,(1,1,1))],'Weather coverage mask')
            billows=ramp(noise(coords,58,'Advecting four-dimensional cloud billows',True),[(.45,(0,0,0)),(.65,(1,1,1))],'Cloud condensate')
            density=math_node('MULTIPLY',math_node('MULTIPLY',math_node('MULTIPLY',envelope,coverage),billows),profile['cloudOpticalDepth']/profile['radius'])
            color=(.78,.84,.91);g=profile['cloudAnisotropy']
        else:
            height=math_node('DIVIDE',math_node('SUBTRACT',length.outputs['Value'],1),profile['atmosphereOuter']-1)
            envelope=ramp(height,[(0,(1,1,1)),(.45,(.22,.22,.22)),(1,(0,0,0))],'Atmospheric density falloff')
            # Interior density is zero; the solid body bounds the optical shell.
            outside=math_node('GREATER_THAN',length.outputs['Value'],1)
            density=math_node('MULTIPLY',math_node('MULTIPLY',envelope,outside),.00024);color=(.12,.39,.82);g=.55
        scatter=node('ShaderNodeVolumeScatter','Physical scattering in metres');scatter.inputs['Color'].default_value=(*color,1);scatter.inputs['Anisotropy'].default_value=g;links.new(density,scatter.inputs['Density']);links.new(scatter.outputs[0],out.inputs['Volume'])
    for i,n in enumerate(nodes):n.location=((i%6)*235,-(i//6)*230)
    mat['tem_horizon_revision']=profile['revision'];mat['tem_image_dependencies']=0
    return mat

def read_glb(path):
    data=path.read_bytes();magic,version,total=struct.unpack_from('<III',data)
    if magic!=0x46546c67 or version!=2 or total!=len(data):raise RuntimeError('Invalid GLB '+str(path))
    pos=12;doc=None;binary=b''
    while pos<len(data):
        size,kind=struct.unpack_from('<II',data,pos);payload=data[pos+8:pos+8+size];pos+=8+size
        if kind==0x4e4f534a:doc=json.loads(payload)
        if kind==0x004e4942:binary=payload
    return doc,binary

def mesh_digest(doc,binary,mesh_index,include_material=True):
    h=hashlib.sha256()
    for p in doc['meshes'][mesh_index]['primitives']:
        for a in [p.get('indices'),*p.get('attributes',{}).values()]:
            if a is None:continue
            acc=doc['accessors'][a];view=doc['bufferViews'][acc['bufferView']];start=view.get('byteOffset',0);h.update(binary[start:start+view['byteLength']])
        h.update(json.dumps({k:v for k,v in p.items() if k not in (['indices','attributes'] if include_material else ['indices','attributes','material'])},sort_keys=True).encode())
    return h.hexdigest()

def patch_glb(path,export):
    doc,binary=read_glb(path);new,chunk=read_glb(export)
    target=next(n for n in doc['nodes'] if n.get('name')==profile['id']);mesh_index=target['mesh']
    prior={i:mesh_digest(doc,binary,i) for i in range(len(doc['meshes'])) if i!=mesh_index}
    old_nodes=copy.deepcopy(doc['nodes']);old_material=doc['meshes'][mesh_index]['primitives'][0].get('material')
    donor=next(n for n in new['nodes'] if n.get('name')==profile['id']);donor_mesh=copy.deepcopy(new['meshes'][donor['mesh']])
    if any(k in donor for k in ['matrix','translation','rotation','scale']):raise RuntimeError('Donor must use absolute exported coordinates')
    if target.get('extras',{}).get('tem_horizon_revision')==profile['revision']:
        # Reframing the same resolution replaces its private buffer ranges.
        # Repeated reviewed passes must not append duplicate geometry payloads.
        binary=bytearray(binary)
        for old_p,new_p in zip(doc['meshes'][mesh_index]['primitives'],donor_mesh['primitives'],strict=True):
            pairs=[(old_p['indices'],new_p['indices'])]+[(old_p['attributes'][k],v) for k,v in new_p['attributes'].items()]
            for old_i,new_i in pairs:
                old_a=doc['accessors'][old_i];new_a=new['accessors'][new_i];old_v=doc['bufferViews'][old_a['bufferView']];new_v=new['bufferViews'][new_a['bufferView']]
                if old_v['byteLength']!=new_v['byteLength'] or old_a['count']!=new_a['count']:raise RuntimeError('In-place refinement must retain exact topology')
                start=old_v.get('byteOffset',0);donor_start=new_v.get('byteOffset',0);binary[start:start+old_v['byteLength']]=chunk[donor_start:donor_start+new_v['byteLength']]
                for key in ['min','max']:
                    if key in new_a:old_a[key]=new_a[key]
        binary=bytes(binary)
    else:
        offset=len(binary);view_base=len(doc['bufferViews']);accessor_base=len(doc['accessors'])
        for view in new['bufferViews']:
            v=copy.deepcopy(view);v['buffer']=0;v['byteOffset']=v.get('byteOffset',0)+offset;doc['bufferViews'].append(v)
        for accessor in new['accessors']:
            a=copy.deepcopy(accessor);a['bufferView']+=view_base;doc['accessors'].append(a)
        for p in donor_mesh['primitives']:
            p['attributes']={k:v+accessor_base for k,v in p['attributes'].items()}
            if 'indices' in p:p['indices']+=accessor_base
            if old_material is not None:p['material']=old_material
        doc['meshes'][mesh_index]=donor_mesh;binary+=chunk
    target.setdefault('extras',{}).update(tem_center=profile['center'],tem_radius=profile['radius'],tem_horizon_revision=profile['revision'])
    doc['buffers'][0]['byteLength']=len(binary)
    for i,digest in prior.items():
        if mesh_digest(doc,binary,i)!=digest:raise RuntimeError('Protected GLB mesh changed')
    for i,n in enumerate(old_nodes):
        if n.get('name')!=profile['id'] and doc['nodes'][i]!=n:raise RuntimeError('Protected GLB node changed')
    payload=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();payload+=b' '*((-len(payload))%4);binary+=b'\0'*((-len(binary))%4)
    content=struct.pack('<III',0x46546c67,2,12+8+len(payload)+8+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(binary),0x004e4942)+binary
    path.write_bytes(content)
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    return {'file':str(path),'bytes':len(content),'triangles':triangles,'protectedMeshes':len(prior),'protectedNodes':len(old_nodes)-1,'sha256':hashlib.sha256(content).hexdigest()}

def apply():
    backup=OUT/'backup-horizon-01';backup.mkdir(exist_ok=True)
    paths=[*projects,ROOT/'assets/models/tem-star-sea-v20.glb',ROOT/'assets/models/tem-star-sea-v20-lod.glb',ROOT/'assets/models/tem-star-sea-v20.json',ROOT/'blender/cinematic-v20/manifest.json']
    for path in paths:
        saved=backup/path.name
        if not saved.exists():shutil.copy2(path,saved)
    reports=[];export=OUT/'horizon-01-export.glb'
    for index,path in enumerate(projects):
        bpy.ops.wm.open_mainfile(filepath=str(path));before=protected_geometry();planet=bpy.data.objects[profile['id']]
        replace_sphere(planet,profile['radius']);planet.data.materials.clear();planet.data.materials.append(optical_material('V20_PLANET — '+profile['id'],'surface'))
        atmosphere=bpy.data.objects['Offline atmosphere — '+profile['id']];replace_sphere(atmosphere,profile['radius']*profile['atmosphereOuter']);atmosphere.data.materials.clear();atmosphere.data.materials.append(optical_material('V20 PLANET ATMOSPHERE — '+profile['id'],'air'))
        cloud_name='HORIZON01 weather — '+profile['id'];cloud=bpy.data.objects.get(cloud_name)
        if not cloud:cloud=bpy.data.objects.new(cloud_name,sphere_data(cloud_name,profile['radius']*profile['cloudOuter']));planet.users_collection[0].objects.link(cloud)
        else:replace_sphere(cloud,profile['radius']*profile['cloudOuter'])
        cloud.data.materials.clear();cloud.data.materials.append(optical_material('HORIZON01 finite animated weather','cloud'));cloud['tem_export']=False;cloud['tem_horizon_revision']=profile['revision']
        receivers=bpy.data.collections.get('HORIZON01 isolated blue sky fill') or bpy.data.collections.new('HORIZON01 isolated blue sky fill')
        for obj in [planet,cloud,atmosphere]:
            if obj.name not in receivers.objects:receivers.objects.link(obj)
        light=bpy.data.objects.get('HORIZON01 blue sky fill')
        if not light:
            data=bpy.data.lights.new('HORIZON01 blue sky fill','SUN');light=bpy.data.objects.new(data.name,data);planet.users_collection[0].objects.link(light)
        light.data.energy=profile['fillStrength'];light.data.color=profile['fillColor'];light.data.angle=.18;light.rotation_euler=(-native(profile['fillDirection']).normalized()).to_track_quat('-Z','Y').to_euler();light.light_linking.receiver_collection=receivers;light['tem_art_direction']='Isolated cinematic planetary sky fill; primary stellar sun unchanged.'
        if protected_geometry()!=before:raise RuntimeError('Unrelated native geometry changed')
        text=bpy.data.texts.get('HORIZON01 — shared native / WebGL profile') or bpy.data.texts.new('HORIZON01 — shared native / WebGL profile');text.clear();text.write(json.dumps(profile,indent=2)+'\nNative Cycles and live WebGL use different noise and integration. Shared dimensions and art direction; no image dependency.\n')
        bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(path))
        reports.append({'file':str(path),'protectedObjects':len(before),'protectedGeometryUnchanged':True,'planetVertices':len(planet.data.vertices),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        if index==0:
            bpy.context.window.scene=next(s for s in bpy.data.scenes if planet.name in s.objects)
            bpy.ops.object.select_all(action='DESELECT');planet.select_set(True);bpy.context.view_layer.objects.active=planet
            bpy.ops.export_scene.gltf(filepath=str(export),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_materials='NONE',export_normals=True,export_extras=True,export_animations=False)
    assets=[patch_glb(ROOT/'assets/models'/name,export) for name in ['tem-star-sea-v20.glb','tem-star-sea-v20-lod.glb']]
    for path in [ROOT/'assets/models/tem-star-sea-v20.json',ROOT/'blender/cinematic-v20/manifest.json']:
        metadata=json.loads(path.read_text(encoding='utf-8-sig'));spec=next(p for p in metadata['planets'] if p['id']==profile['id']);spec.update(center=profile['center'],radius=profile['radius'],seed=profile['seed'],horizonRevision=profile['revision'],segments=profile['segments'],bands=profile['bands'])
        metadata['planetaryHorizon']=profile
        for asset in assets:
            for entry in metadata['assets'].values() if isinstance(metadata['assets'],dict) else metadata['assets']:
                if isinstance(entry,dict) and Path(str(entry.get('file',entry.get('path','')))).name==Path(asset['file']).name:entry.update(bytes=asset['bytes'],triangles=asset['triangles'])
        path.write_text(json.dumps(metadata,indent=2,ensure_ascii=False),encoding='utf-8')
    report={'revision':profile['revision'],'profile':profile,'projects':reports,'assets':assets,'environmentImageDependenciesAdded':0,'protectedGeometryUnchanged':True,'backup':str(backup)}
    (OUT/'polish-planetary-horizon.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8');print('TEM_PLANETARY_HORIZON_COMPLETE',flush=True)

def describe(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    items=[]
    for obj in bpy.data.objects:
        if 'PLANET_V20_DAWN' not in obj.name:continue
        corners=[obj.matrix_world@Vector(c) for c in obj.bound_box]
        low=Vector([min(v[k] for v in corners) for k in range(3)])
        high=Vector([max(v[k] for v in corners) for k in range(3)])
        items.append({'name':obj.name,'type':obj.type,'center':web((low+high)*.5),'dimensions':list(high-low),
                      'collections':[c.name for c in obj.users_collection], 'materials':[m.name for m in obj.data.materials] if obj.type=='MESH' else [],
                      'vertices':len(obj.data.vertices) if obj.type=='MESH' else 0,'matrix':[list(row) for row in obj.matrix_world],
                      'scenes':[s.name for s in bpy.data.scenes if obj.name in s.objects]})
    return {'file':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'planets':items,
            'scenes':[s.name for s in bpy.data.scenes]}

if inspect:
    result={'profile':profile,'projects':[describe(p) for p in projects],'readOnly':True}
    (OUT/'inspection-planetary-horizon.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('TEM_PLANETARY_INSPECTION_COMPLETE',flush=True)
else:
    apply()
