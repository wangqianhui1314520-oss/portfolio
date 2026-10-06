"""Refine the four editable Blender vessels, preserving the original project.

The project MCP invokes this fixed operation against the v20 .blend. No
reference image is exported as scenery. Meshes are grouped per vessel/material.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'blender/cinematic-v21'
MODELS = ROOT / 'assets/models'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('06 — TEM / Refined Fleet')
bpy.context.window.scene = scene
author = bpy.data.collections.new('V21.Fleet — editable four distinct craft')
scene.collection.children.link(author)
exports = bpy.data.collections.new('V21.Fleet — web material batches')
scene.collection.children.link(exports)

def B(p): return Vector((p[0], -p[2], p[1]))

def move(o, collection):
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o)

def mat(name, color, metal=0, rough=.3, emission=0, transmission=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    # Defaults are localized in this installation. Build a single active graph
    # so Cycles and glTF cannot select an untouched localized output node.
    m.node_tree.nodes.clear()
    p = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output=m.node_tree.nodes.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(p.outputs['BSDF'],output.inputs['Surface'])
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = .25
    p.inputs['Coat Roughness'].default_value = .22
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = 1.46
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emission
    m.diffuse_color = (*color, 1)
    return m

pearl = mat('V21_FLEET_PEARL — multilayer lunar ceramic', (.35,.45,.58), .12, .27)
titanium = mat('V21_FLEET_TITANIUM — restrained cold machining', (.13,.18,.24), .72,.30)
dark = mat('V21_FLEET_PRESSURE — recessed engine chamber', (.009,.019,.032), .22,.43)
glass = mat('V21_FLEET_GLASS — sapphire pressure canopy', (.26,.55,.74), 0,.068, transmission=.87)
warm = mat('V21_FLEET_CHAMPAGNE — precision fittings', (.32,.23,.14),.68,.30)
accents = [mat('V21_FLEET_EMISSION_'+str(i), c, rough=.32, emission=1.65)
           for i,c in enumerate([(.18,.50,.94),(.48,.29,.88),(.54,.38,.79),(.15,.63,.72)])]

def mesh(name, verts, faces, material, parent):
    data = bpy.data.meshes.new(name)
    data.from_pydata([B(v) for v in verts], [], faces)
    data.update()
    bm = bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data); bm.free()
    for face in data.polygons: face.use_smooth=True
    o = bpy.data.objects.new(name, data); author.objects.link(o)
    o.data.materials.append(material); o.parent=parent
    return o

def box(name, p, size, material, parent, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=B(p))
    o=bpy.context.object; o.name=name;move(o, author)
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material);o.parent=parent
    mod=o.modifiers.new('Manufactured soft bevel','BEVEL');mod.width=bevel;mod.segments=3
    normal=o.modifiers.new('Stable panel normals','WEIGHTED_NORMAL');normal.keep_sharp=True
    return o

def ring(name, center, radius, width, material, parent):
    n=36; k=8; verts=[]; faces=[]
    for j in range(n):
        a=j/n*math.tau
        for l in range(k):
            b=l/k*math.tau;r=radius+width*math.cos(b)
            verts.append((center[0]+r*math.cos(a),center[1]+r*math.sin(a),center[2]+width*math.sin(b)))
    for j in range(n):
        for l in range(k):faces.append((j*k+l,((j+1)%n)*k+l,((j+1)%n)*k+(l+1)%k,j*k+(l+1)%k))
    return mesh(name,verts,faces,material,parent)

def tube(name, points, radius, material, parent):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=16
    curve.bevel_depth=radius;curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for bp,p in zip(spline.bezier_points,points):bp.co=B(p);bp.handle_left_type=bp.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);author.objects.link(obj);obj.parent=parent;obj.data.materials.append(material)
    return obj

roots=[]
material_clones={}
for i in range(4):
    source=bpy.data.objects.get('SHIP_'+str(i))
    if not source:raise RuntimeError('Missing preserved SHIP_'+str(i))
    source.update_tag();bpy.context.view_layer.update()
    source.name='V18_STORED_SHIP_'+str(i)
    root=bpy.data.objects.new('AUTHOR_REFINED_SHIP_'+str(i),None);author.objects.link(root);roots.append(root)
    root['category']=['game-and-interaction','AI-film','literature-and-worlds','technology-lab'][i]
    root['forwardAxis']='+Z';root['source']='Blender authored fleet v18 refined v21'
    for child in list(source.children_recursive):
        if child.type!='MESH':continue
        copy=child.copy();copy.data=child.data.copy();author.objects.link(copy)
        copy.hide_set(False);copy.hide_render=False
        copy.parent=root;copy.matrix_world=child.matrix_world.copy()
        for slot in copy.material_slots:
            old=slot.material
            if not old:continue
            label=old.name.upper()
            slot.material=glass if 'GLASS' in label else accents[i] if 'EMISSION' in label else dark if 'DARK' in label else warm if 'CHAMPAGNE' in label else titanium if 'TITANIUM' in label else pearl
    # Recessed engine geometry supplies a rim, chamber and blades, rather than
    # a lit disc pasted on the back of the hull.
    for side in [-1,1]:
        center=(side*.82,-.18,-3.03)
        ring('Manufactured outer nozzle',center,.242,.026,titanium,root)
        ring('Recessed sapphire drive',(center[0],center[1],center[2]+.026),.182,.016,accents[i],root)
        ring('Turbine shadow chamber',(center[0],center[1],center[2]+.073),.155,.026,dark,root)
        for j in range(10):
            a=j/10*math.tau
            rib=box('Radial turbine blade',(center[0]+math.cos(a)*.185,center[1]+math.sin(a)*.185,center[2]-.02),(.035,.060,.11),titanium,root,.006)
            rib.rotation_euler.y=-a
        tube('Recessed wing energy channel',[(side*.28,.35,-1.9),(side*.51,.31,-.7),(side*.87,.18,.50),(side*1.40,.15,1.31)],.012,accents[i],root)
        tube('Ceramic wing panel joint',[(side*.30,.29,-1.5),(side*.62,.22,-.20),(side*1.23,.08,.96)],.009,dark,root)
        for j in range(4):box('Inset radiator slat',(side*.57,.305,-1.48+j*.14),(.22,.035,.062),dark,root,.007)
    # A small explicit material change makes four categories recognisable.
    if i==0:
        for side in [-1,1]:tube('Interceptor swept pressure spine',[(side*.21,.21,-2.6),(side*.42,.34,-1),(side*.52,.22,1.8)],.053,pearl,root)
    elif i==1:
        for j in range(3):
            loop=ring('Optical drive stabilizer',(0,.19,-.52+j*.14),1.02+j*.09,.020,warm if j==1 else titanium,root)
            loop.rotation_euler.x=math.pi/2
    elif i==2:
        for side in [-1,1]:tube('Narrative sail light path',[(side*.32,.31,-1.4),(side*.76,1.48,-1.08),(side*1.47,2.36,-1.22),(side*1.79,.66,-.36)],.013,accents[i],root)
    else:
        for side in [-1,1]:
            for j in range(3):box('Research modular ceramic hatch',(side*.70,.27,-.18+j*.39),(.30,.072,.30),pearl,root,.025)
    tube('Observation canopy seal',[(-.20,.49,-.15),(-.26,.64,.33),(-.17,.60,.92),(0,.35,1.37),(.17,.60,.92),(.26,.64,.33),(.20,.49,-.15)],.013,titanium,root)

def web_copy(lod=False):
    webroots=[]; webmeshes=[]
    for i,source in enumerate(roots):
        name='SHIP_'+str(i)
        existing=bpy.data.objects.get(name)
        if existing:existing.name='V21_PREVIOUS_EXPORT_'+name
        target=bpy.data.objects.new(name,None);exports.objects.link(target);target['category']=source['category'];webroots.append(target)
        buckets={}
        for child in list(source.children):
            if child.type not in ['MESH','CURVE']:continue
            copy=child.copy();copy.data=child.data.copy();exports.objects.link(copy)
            copy.parent=target;copy.matrix_world=child.matrix_world.copy();copy.hide_set(False);copy.hide_render=False
            bpy.ops.object.select_all(action='DESELECT');copy.select_set(True);bpy.context.view_layer.objects.active=copy
            if copy.type=='CURVE':bpy.ops.object.convert(target='MESH');copy=bpy.context.object
            for mod in list(copy.modifiers):
                try:bpy.ops.object.modifier_apply(modifier=mod.name)
                except RuntimeError:pass
            if lod:
                mod=copy.modifiers.new('Same authored craft LOD','DECIMATE');mod.ratio=.48
                bpy.ops.object.modifier_apply(modifier=mod.name)
            # Keep winding coherent through all transforms.
            bm=bmesh.new();bm.from_mesh(copy.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(copy.data);bm.free()
            buckets.setdefault(copy.data.materials[0].name,[]).append(copy)
        for name,parts in buckets.items():
            bpy.ops.object.select_all(action='DESELECT')
            for part in parts:part.select_set(True)
            bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
            joined=bpy.context.object;joined.name='SHIP_'+str(i)+'_'+name;joined.parent=target
            # Deduplicate repeated identical material slots introduced by join.
            mat0=joined.data.materials[0]
            joined.data.materials.clear();joined.data.materials.append(mat0)
            for poly in joined.data.polygons:poly.material_index=0
            webmeshes.append(joined)
    bpy.ops.object.select_all(action='DESELECT')
    for root in webroots:root.select_set(True)
    for obj in webmeshes:obj.select_set(True);obj.data.calc_loop_triangles()
    file=MODELS/('tem-refined-fleet-v21-lod.glb' if lod else 'tem-refined-fleet-v21.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_extras=True)
    info={'file':file.name,'bytes':file.stat().st_size,'triangles':sum(len(o.data.loop_triangles) for o in webmeshes),'meshes':len(webmeshes),'shipRoots':4}
    for obj in [*webmeshes,*webroots]:obj.hide_set(True);obj.hide_render=True
    return info

manifest={'version':21,'source':'v20 preserved Blender project','assets':[web_copy(),web_copy(True)]}
exports.hide_render=True
rig=bpy.data.collections.new('V21.Fleet — photographic review rig');scene.collection.children.link(rig)
for i,root in enumerate(roots):root.location=B(((i-1.5)*7.2,0,0));root.rotation_euler.z=-.40
world=bpy.data.worlds.new('V21_Fleet — analytic midnight');world.use_nodes=True;scene.world=world
world.node_tree.nodes.clear()
background=world.node_tree.nodes.new('ShaderNodeBackground')
worldoutput=world.node_tree.nodes.new('ShaderNodeOutputWorld')
world.node_tree.links.new(background.outputs['Background'],worldoutput.inputs['Surface'])
background.inputs['Color'].default_value=(.009,.014,.024,1)
background.inputs['Strength'].default_value=.24
def area(name,p,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);rig.objects.link(obj);obj.location=B(p)
    obj.rotation_euler=(B((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Shared soft stellar key',(2,12,8),2100,(1,.78,.58),14)
area('Blue-violet atmosphere rim',(-5,6,-12),1700,(.34,.46,1),13)
data=bpy.data.cameras.new('Fleet review camera');cam=bpy.data.objects.new('CAMERA_fleet_v21',data);rig.objects.link(cam)
cam.location=B((15,16,28));cam.rotation_euler=(B((0,.5,0))-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=45;scene.camera=cam
scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.engine='CYCLES';scene.cycles.samples=48
notes=bpy.data.texts.new('V21.FLEET — START HERE');notes.write('Editable four-category fleet. Original project scenes are preserved. Web copies keep each SHIP_0..3 local origin; photographic staging only moves authoring roots. No environmental photograph or render is a web background.')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tem-refined-fleet.blend'))
(OUT/'manifest-fleet.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('TEM_REFINED_FLEET_COMPLETE',json.dumps(manifest),flush=True)
