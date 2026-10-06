"""Build the Tem optical identity instrument with Blender, in browser-local units.

Run: blender.exe --background --factory-startup --python scripts/build-tem-identity.py
GLB contains only the instrument; studio lights/camera belong to the .blend preview.
"""
from pathlib import Path
import json
import math
import sys
import tempfile
import time
import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "assets" / "models"
ARCHIVE_DIR = ROOT / "blender"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
# Keep glTF's generated PNG intermediates inside the writable project.
EXPORT_TEMP = (ARCHIVE_DIR / "identity-export-temp").resolve()
assert EXPORT_TEMP.is_relative_to(ROOT.resolve())
EXPORT_TEMP.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(EXPORT_TEMP)
GLB_PATH = MODEL_DIR / "tem-identity.glb"
BLEND_PATH = ARCHIVE_DIR / "tem-identity.blend"
MANIFEST_PATH = ARCHIVE_DIR / "tem-identity-manifest.json"
PREVIEW_PATH = ARCHIVE_DIR / "tem-identity-studio.png"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)
model = bpy.data.collections.new("TEM_IDENTITY_ASSET")
bpy.context.scene.collection.children.link(model)
studio = bpy.data.collections.new("PREVIEW_STUDIO_NOT_EXPORTED")
bpy.context.scene.collection.children.link(studio)

def browser_to_blender(p):
    x, y, z = p
    return (x, -z, y)

def put_in(obj, collection=model):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def material(name, color, roughness, metallic=0.0, transmission=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs['Base Color'].default_value = (*color, 1.0)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    p.inputs['IOR'].default_value = 1.46 if transmission else 1.48
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['Coat Weight'].default_value = 0.52 if not metallic else 0.16
    p.inputs['Coat Roughness'].default_value = 0.14
    if emission:
        p.inputs['Emission Color'].default_value = (*emission, 1.0)
        p.inputs['Emission Strength'].default_value = 1.6
    mat.diffuse_color = (*color, 1.0)
    return mat

glass_mat = material("TEM_OPTICAL_GLASS", (.64, .82, .92), .065, transmission=1.0)
pearl_mat = material("TEM_PEARL_CERAMIC", (.72, .79, .81), .275)
titanium_mat = material("TEM_SATIN_TITANIUM", (.33, .40, .44), .235, metallic=.83)
obsidian_mat = material("TEM_OBSIDIAN", (.012, .024, .037), .19, metallic=.17)
cyan_mat = material("TEM_CYAN_EMISSION", (.025, .22, .38), .22, metallic=.08, emission=(.12, .71, 1.0))
warm_mat = material("TEM_WARM_EMISSION", (.34, .22, .12), .25, emission=(1.0, .76, .49))

def rounded_contour(points, radius=.075, segments=8):
    result = []
    for index, values in enumerate(points):
        p = Vector(values)
        prev = Vector(points[(index-1) % len(points)])
        nxt = Vector(points[(index+1) % len(points)])
        distance = min(radius, (prev-p).length*.28, (nxt-p).length*.28)
        before = p + (prev-p).normalized()*distance
        after = p + (nxt-p).normalized()*distance
        for i in range(segments):
            t = i/segments
            q = before*(1-t)**2 + p*(2*t*(1-t)) + after*t*t
            x, y = q
            if y < 1.81 and abs(x) < .59:
                x += .014*math.sin((y+2.8)*1.25)
            if y > 2.70:
                y -= .013*(1-math.cos(x*.91))
            result.append(Vector((x, y)))
    return result

silhouette = [(-2.43,2.80),(2.43,2.80),(2.50,2.72),(2.50,1.93),
              (2.40,1.80),(.50,1.80),(.49,-2.64),(.35,-2.80),
              (-.35,-2.80),(-.49,-2.64),(-.50,1.80),(-2.40,1.80),
              (-2.50,1.93),(-2.50,2.72)]
boundary = rounded_contour(silhouette)
N = len(boundary)
inward = []
for i, p in enumerate(boundary):
    a = (p-boundary[(i-1) % N]).normalized()
    b = (boundary[(i+1) % N]-p).normalized()
    n = Vector((a.y, -a.x)) + Vector((b.y, -b.x))
    n.normalize()
    inward.append(n)

def optical_bulge(x, y):
    stem = max(0.0, 1-(x/.56)**2)*.064*(.89+.11*math.sin((y+2.8)*.63))
    bar = max(0.0, 1-((y-2.30)/.59)**2)*.072*(.86+.14*math.cos(x*.44))
    mix = max(0.0, min(1.0, (y-1.45)/.48))
    mix = mix*mix*(3-2*mix)
    return stem*(1-mix)+bar*mix

vertices, faces, lookup = [], [], {}
def vertex(x, y, z):
    values = browser_to_blender((x,y,z))
    key = tuple(round(v, 8) for v in values)
    if key not in lookup:
        lookup[key] = len(vertices)
        vertices.append(values)
    return lookup[key]

bevel_radius = .072
rings = []
for side in (-1,1):
    angles = [math.pi*.5*(1-i/5) for i in range(6)] if side < 0 else [math.pi*.5*i/5 for i in range(6)]
    for angle in angles:
        offset = bevel_radius*(1-math.cos(angle))
        ring = []
        for i, p in enumerate(boundary):
            q = p + inward[i]*offset
            depth = side*(.30+bevel_radius*math.sin(angle)+optical_bulge(q.x,q.y)*math.sin(angle)**3)
            ring.append(vertex(q.x,q.y,depth))
        rings.append(ring)
for a,b in zip(rings,rings[1:]):
    for i in range(N):
        j=(i+1) % N
        faces.append((a[i],a[j],b[j],b[i]))

inner = [boundary[i]+inward[i]*bevel_radius for i in range(N)]
triangles = tessellate_polygon([[Vector((p.x,p.y,0)) for p in inner]])
cap_face_start=len(faces)
def cap_triangle(a,b,c,side,depth=3):
    if depth:
        ab=(a+b)*.5;bc=(b+c)*.5;ca=(c+a)*.5
        cap_triangle(a,ab,ca,side,depth-1)
        cap_triangle(ab,b,bc,side,depth-1)
        cap_triangle(ca,bc,c,side,depth-1)
        cap_triangle(ab,bc,ca,side,depth-1)
        return
    indices=[]
    for p in (a,b,c):
        indices.append(vertex(p.x,p.y,side*(.30+bevel_radius+optical_bulge(p.x,p.y))))
    faces.append(tuple(indices if side > 0 else reversed(indices)))
for side in (-1,1):
    for tri in triangles:
        values=[Vector((inner[i].x,inner[i].y,0)) if isinstance(i,int) else i for i in tri]
        cap_triangle(*values,side)

mesh = bpy.data.meshes.new("TEM_GLASS_T_CURVED_SOLID")
mesh.from_pydata(vertices, [], faces)
mesh.update()
glass = bpy.data.objects.new("TEM_GLASS_T", mesh)
model.objects.link(glass)
glass.data.materials.append(glass_mat)
activate(glass)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
for polygon in glass.data.polygons:
    polygon.use_smooth=True
# Smooth shading preserves the closed solid's outward normals. The curved cap
# topology drives refraction without custom normals that can invert transmission.

def box(name, center, size, mat, bevel=.018, segments=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=browser_to_blender(center))
    obj=put_in(bpy.context.object)
    obj.name=name
    obj.scale=(size[0],size[2],size[1])
    activate(obj)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier=obj.modifiers.new("Machined continuous bevel",'BEVEL')
        modifier.width=bevel;modifier.segments=segments
        activate(obj);bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:face.use_smooth=True
    modifier=obj.modifiers.new("Area weighted production normals",'WEIGHTED_NORMAL')
    modifier.keep_sharp=True;modifier.weight=70
    activate(obj);bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj

def recess(obj, center, size):
    bpy.ops.mesh.primitive_cube_add(size=1, location=browser_to_blender(center))
    cutter=bpy.context.object
    cutter.scale=(size[0],size[2],size[1])
    activate(cutter);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    modifier=obj.modifiers.new("Recessed optical service port",'BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.object=cutter
    activate(obj);bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def rail(name, points, radius, mat):
    data=bpy.data.curves.new(name,'CURVE')
    data.dimensions='3D';data.resolution_u=14;data.bevel_depth=radius;data.bevel_resolution=3
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):
        p.co=browser_to_blender(co);p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);model.objects.link(obj);data.materials.append(mat)
    activate(obj);bpy.ops.object.convert(target='MESH')
    return obj

for side in (-1,1):
    cap=box(f"Pearl crossbar clamp {side}",(side*2.42,2.30,0),(.175,.99,.84),pearl_mat,.045,5)
    recess(cap,(side*2.42,2.30,.425),(.075,.53,.15))
    box(f"Crossbar dark socket {side}",(side*2.42,2.30,.351),(.069,.49,.029),obsidian_mat,.019,3)
    box(f"Crossbar recessed LED {side}",(side*2.42,2.30,.373),(.017,.365,.012),cyan_mat,.005,3)
    box(f"Crossbar floating titanium seam {side}",(side*2.31,2.30,.008),(.026,.87,.81),titanium_mat,.009,3)
    for y in (2.02,2.59):
        box(f"Clamp titanium latch {side} {y}",(side*2.42,y,.399),(.063,.031,.015),titanium_mat,.008,3)
    box(f"Stem pearl sleeve {side}",(side*.487,-2.39,0),(.067,.39,.80),pearl_mat,.022,4)
    box(f"Stem dark contact {side}",(side*.487,-2.39,.373),(.037,.24,.032),obsidian_mat,.012,3)
    box(f"Stem low energy contact {side}",(side*.487,-2.39,.397),(.011,.12,.009),cyan_mat,.003,2)
    rail(f"Stem interrupted titanium seam {side}",[(side*.475,-2.57,.38),(side*.488,-2.18,.403),(side*.493,-1.81,.396)],.012,titanium_mat)
    rail(f"Crossbar floating fine seam {side}",[(side*2.28,2.72,.354),(side*1.95,2.735,.385),(side*1.78,2.731,.377)],.009,titanium_mat)

toe=box("Pearl optical stem heel",(0,-2.70,0),(.88,.115,.86),pearl_mat,.030,5)
recess(toe,(0,-2.69,.421),(.34,.043,.13))
box("Stem heel dark service slot",(0,-2.69,.363),(.32,.032,.019),obsidian_mat,.009,3)
box("Stem warm diagnostic port",(0,-2.69,.379),(.214,.008,.007),warm_mat,.002,2)
for side in (-1,1):
    box(f"Stem heel titanium shoe {side}",(side*.39,-2.765,0),(.085,.045,.69),titanium_mat,.012,3)

# Joining by material produces six stable named GLTF meshes and six draw groups.
names={glass_mat:"TEM_GLASS_T",pearl_mat:"TEM_PEARL_CONNECTORS",titanium_mat:"TEM_TITANIUM_SEAMS",
       obsidian_mat:"TEM_OBSIDIAN_PORTS",cyan_mat:"TEM_EMISSIVE_PORTS",warm_mat:"TEM_WARM_DIAGNOSTIC"}
objects=[]
for mat,name in names.items():
    members=[o for o in model.objects if o.type=='MESH' and o.active_material==mat]
    if not members:continue
    activate(members[0])
    for obj in members:obj.select_set(True)
    if len(members)>1:bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    obj.data.materials.clear();obj.data.materials.append(mat)
    for polygon in obj.data.polygons:polygon.material_index=0
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj['tem_role']=name
    obj['coordinate_contract']='browser x/y/z; Blender x/-z/y; glTF Y-up'
    activate(obj)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.010)
    bpy.ops.object.mode_set(mode='OBJECT')
    triangulate=obj.modifiers.new('Export stable tangent topology','TRIANGULATE')
    triangulate.quad_method='BEAUTY';triangulate.ngon_method='BEAUTY'
    if hasattr(triangulate,'keep_custom_normals'):triangulate.keep_custom_normals=True
    bpy.ops.object.modifier_apply(modifier=triangulate.name)
    objects.append(obj)

# True Blender bake: micro-roughness and two restrained micro-normal maps.
# There are no baked nebulae/stars; runtime optical volume remains independent.
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=4
scene.cycles.device='CPU'
texture_report=[]
for obj in objects:
    mat=obj.active_material
    if mat in (cyan_mat,warm_mat):continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
    base=p.inputs['Roughness'].default_value
    uv=nodes.new('ShaderNodeTexCoord')
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=92.0;noise.inputs['Detail'].default_value=2.0;noise.inputs['Roughness'].default_value=.58
    links.new(uv.outputs['Generated'],noise.inputs['Vector'])
    ramp=nodes.new('ShaderNodeMapRange');ramp.inputs['From Min'].default_value=0.0;ramp.inputs['From Max'].default_value=1.0
    spread=.018 if mat!=glass_mat else .012
    ramp.inputs['To Min'].default_value=base-spread;ramp.inputs['To Max'].default_value=base+spread
    links.new(noise.outputs['Fac'],ramp.inputs['Value']);links.new(ramp.outputs['Result'],p.inputs['Roughness'])
    image=bpy.data.images.new(mat.name+'_Roughness_512',width=512,height=512,alpha=False)
    image.colorspace_settings.name='Non-Color'
    target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
    activate(obj);scene.render.bake.margin=8
    bpy.ops.object.bake(type='ROUGHNESS')
    links.new(target.outputs['Color'],p.inputs['Roughness'])
    image.pack();texture_report.append({'material':mat.name,'type':'roughness','size':[512,512]})
    if mat in (pearl_mat,titanium_mat):
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10 if mat==pearl_mat else .065;bump.inputs['Distance'].default_value=.0025
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
        normal_image=bpy.data.images.new(mat.name+'_MicroNormal_512',width=512,height=512,alpha=False)
        normal_image.colorspace_settings.name='Non-Color'
        normal_target=nodes.new('ShaderNodeTexImage');normal_target.image=normal_image;nodes.active=normal_target
        bpy.ops.object.bake(type='NORMAL')
        normal_map=nodes.new('ShaderNodeNormalMap');links.new(normal_target.outputs['Color'],normal_map.inputs['Color']);links.new(normal_map.outputs['Normal'],p.inputs['Normal'])
        normal_image.pack();texture_report.append({'material':mat.name,'type':'tangent normal','size':[512,512]})

for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=glass
# Blender's exporter normally stages channel-packed PNGs in mkdtemp(0700).
# This Windows managed execution profile cannot re-open those directories.
# Preserve the same image encoding, using explicit flat workspace PNG paths.
import io_scene_gltf2.blender.exp.material.encode_image as gltf_image_encoder
encoded_counter=0
def workspace_image_encode(image,file_format,export_settings):
    global encoded_counter
    encoded_counter+=1
    extension={'PNG':'png','JPEG':'jpg','WEBP':'webp'}[file_format]
    target_path=(ARCHIVE_DIR/f'identity-export-image-{encoded_counter:02d}.{extension}').resolve()
    assert target_path.is_relative_to(ROOT.resolve())
    image.filepath_raw=str(target_path)
    image.file_format=file_format
    if file_format in ('JPEG','WEBP'):
        image.save(quality=export_settings['gltf_image_quality'])
    else:
        image.save()
    return target_path.read_bytes()
gltf_image_encoder._encode_temp_image=workspace_image_encode
bpy.ops.export_scene.gltf(filepath=str(GLB_PATH),export_format='GLB',use_selection=True,
                         export_yup=True,export_apply=True,export_materials='EXPORT',
                         export_normals=True,export_tangents=True,export_extras=True)

def look_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name,position,energy,color,size,target=(0,0,.3)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=position;look_at(obj,target)
    return obj
area('Warm soft cinematic key',(-4,-3.8,6.5),850,(1.0,.84,.68),4.0)
area('Thin cool rim',(4.0,1.8,3.3),1250,(.35,.62,1.0),2.2)
area('Optical face card',(-.8,-5.0,1.3),180,(.60,.80,1.0),3.0)
area('Soft reverse fill',(-3,2,-1.8),500,(.45,.64,1.0),3.0)
world=bpy.data.worlds.new('Tem dark studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.011,.020,.034,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.38;scene.world=world
camera_data=bpy.data.cameras.new('Tem identity inspection camera');camera=bpy.data.objects.new('Tem identity inspection camera',camera_data);studio.objects.link(camera)
camera.location=(3.6,-10.7,3.1);look_at(camera,(0,0,.12));camera_data.type='PERSP';camera_data.lens=54;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PREVIEW_PATH)
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

depsgraph=bpy.context.evaluated_depsgraph_get()
triangles=0;bounds=[];mesh_report=[]
for obj in objects:
    evaluated=obj.evaluated_get(depsgraph);m=evaluated.to_mesh();m.calc_loop_triangles()
    count=len(m.loop_triangles);triangles+=count
    local_bounds=[]
    for v in m.vertices:
        x,z, y=(obj.matrix_world@v.co) # Blender(x,-browserZ,browserY)
        local_bounds.append((x,y,-z))
    bounds.extend(local_bounds)
    mesh_report.append({'name':obj.name,'triangles':count,'material':obj.active_material.name,'uv':len(m.uv_layers)})
    evaluated.to_mesh_clear()
minimum=[min(v[i] for v in bounds) for i in range(3)];maximum=[max(v[i] for v in bounds) for i in range(3)]
manifest={'generator':'Blender '+bpy.app.version_string,'coordinateSpace':'Three.js Y-up, origin center, no floor/base/root scale',
          'bounds':{'min':minimum,'max':maximum},'triangles':triangles,'meshes':mesh_report,
          'materialDrawGroups':len(objects),'textures':texture_report,'glbBytes':GLB_PATH.stat().st_size,
          'glb':str(GLB_PATH),'blend':str(BLEND_PATH),'preview':str(PREVIEW_PATH)}
MANIFEST_PATH.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('TEM_IDENTITY_ASSET '+json.dumps(manifest,ensure_ascii=False),flush=True)
if '--no-render' not in sys.argv:
    bpy.ops.render.render(write_still=True)
print('TEM_IDENTITY_BUILD_COMPLETE',flush=True)
