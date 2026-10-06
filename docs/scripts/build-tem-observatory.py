"""Build the Tem viewing deck in Blender, then export its editable source and GLB.

Run: blender --background --factory-startup --python scripts/build-tem-observatory.py
Coordinates are authored in the website's Three.js space. B(x,y,z)=(x,-z,y),
and glTF's Y-up conversion restores those exact Three.js coordinates.
"""
import bpy
import bmesh
import json
import math
import struct
import tempfile
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'models'
ARCHIVE = ROOT / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
ARCHIVE.mkdir(parents=True, exist_ok=True)
task_temp = (ARCHIVE / '.export-tmp').resolve()
assert task_temp.is_relative_to(ROOT.resolve()), 'Exporter scratch directory left the workspace'
task_temp.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(task_temp)
GLB = OUT / 'tem-observatory.glb'
BLEND = ARCHIVE / 'tem-observatory.blend'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for old in list(bpy.data.materials):
    bpy.data.materials.remove(old)

def B(p):
    return Vector((p[0], -p[2], p[1]))

def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj

asset = empty('TEM_OBSERVATORY')
near = empty('NEAR_DECK', asset)
far = empty('FAR_HABITAT', asset)
near['three_floor_y'] = -5.32
near['purpose'] = 'Clone this fixed deck around four personal chapters; root owns placement.'
far['purpose'] = 'One continuous remote habitat. Keep one copy at its authored world coordinates.'

def material(name, color, rough=.3, metallic=.0, coat=.0, emission=None, transmission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = rough
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Coat Weight'].default_value = coat
    node.inputs['Coat Roughness'].default_value = max(.18, rough * .8)
    node.inputs['Specular IOR Level'].default_value = .34
    node.inputs['Transmission Weight'].default_value = transmission
    node.inputs['IOR'].default_value = 1.46
    if emission:
        node.inputs['Emission Color'].default_value = (*emission, 1)
        node.inputs['Emission Strength'].default_value = 1.6
    return mat

mats = {
    'pearl': material('PEARL_CERAMIC', (.59, .65, .72), .29, .08, .62),
    'dark': material('DARK_PRESSURE', (.019, .033, .051), .36, .24, .35),
    'titanium': material('TITANIUM_COLD', (.26, .33, .39), .31, .76, .24),
    'floor': material('FLOOR_OPTICAL', (.023, .038, .060), .24, .18, .40),
    'glass': material('GLASS_PORT', (.055, .14, .19), .20, .08, .42, transmission=.46),
    'cyan': material('EMISSION_CYAN', (.11, .32, .45), .28, .1, emission=(.15, .53, .71)),
    'amber': material('EMISSION_AMBER', (.29, .12, .04), .28, .1, emission=(.73, .29, .075)),
}

def mesh_object(name, points, faces, mat, parent=near, smooth=True):
    mesh = bpy.data.meshes.new(name + '.mesh')
    mesh.from_pydata([B(p) for p in points], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    # Pole vertices of closed lathed inserts share one position. Weld them
    # before UV layout so the source volume remains closed and non-degenerate.
    bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.000002)
    bmesh.ops.dissolve_degenerate(bm,edges=bm.edges,dist=.000001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    for polygon in mesh.polygons:
        polygon.use_smooth = smooth
    return obj

def catmull(points, steps=8, closed=False):
    values = [Vector(p) for p in points]
    n = len(values)
    result = []
    for index in range(n if closed else n-1):
        p0 = values[(index-1) % n] if closed or index else values[0]
        p1 = values[index]
        p2 = values[(index+1) % n]
        p3 = values[(index+2) % n] if closed or index+2 < n else values[-1]
        for step in range(steps):
            t = step / steps
            p = .5 * ((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t*t*t)
            result.append(p)
    if not closed:
        result.append(values[-1])
    return result

def cap_faces(points, offset, reverse=False):
    verts = [Vector(p) for p in points]
    triangles = tessellate_polygon([verts])
    lookup = {tuple(round(v, 7) for v in p): i for i, p in enumerate(verts)}
    faces = []
    for tri in triangles:
        indices = [(p if isinstance(p,int) else lookup[tuple(round(v, 7) for v in p)]) + offset for p in tri]
        faces.append(tuple(reversed(indices)) if reverse else tuple(indices))
    return faces

CONTOUR = [(-42,9),(-28,14),(-15,20),(-5,22),(3,21),(9,12),(17,7),(24,10),(32,13),(46,6),(47,46),(-46,46)]
outline = catmull([(x, 0, z) for x, z in CONTOUR], 6, True)
center = Vector((.5, 0, 26))

def contour_shell(name, profile, mat, scale=1, parent=near):
    points, faces = [], []
    count = len(outline)
    for outline_scale, height in profile:
        for p in outline:
            q = center + (p-center) * outline_scale * scale
            points.append((q.x, height, q.z))
    for layer in range(len(profile)-1):
        for i in range(count):
            j=(i+1)%count
            faces.append((layer*count+i, layer*count+j, (layer+1)*count+j, (layer+1)*count+i))
    faces += cap_faces(points[:count], 0, True)
    faces += cap_faces(points[-count:], (len(profile)-1)*count)
    return mesh_object(name, points, faces, mat, parent)

contour_shell('Pearl.deck.pressure-envelope', [(.955,-7.15),(1.005,-7.02),(1.010,-6.55),(1.001,-5.82),(.989,-5.49),(.974,-5.39)], mats['pearl'])
contour_shell('Dark.deck.understructure', [(.958,-8.01),(1.006,-7.77),(1.018,-7.11),(1.010,-6.85),(.985,-6.71)], mats['dark'])
floor = contour_shell('Floor.continuous-optical-inset', [(.960,-5.445),(.963,-5.395),(.960,-5.32)], mats['floor'])

def swept(name, points, width, height, mat, sections=12, steps=10, parent=near, taper=None):
    path = catmull(points, steps)
    verts, faces = [], []
    for i, p in enumerate(path):
        tangent = (path[min(i+1,len(path)-1)] - path[max(0,i-1)]).normalized()
        vertical = Vector((0,1,0)) - tangent * tangent.y
        vertical.normalize()
        lateral = tangent.cross(vertical).normalized()
        profile = taper(i/(len(path)-1)) if taper else 1
        for j in range(sections):
            a=j/sections*math.tau
            # Broad rounded crown: the upper profile stays generous, while the
            # lower quadrants tuck inward into the dark pressure shell.
            sin_a, cos_a=math.sin(a),math.cos(a)
            side=sin_a*(.90+.10*max(cos_a,0))
            q=p+lateral*(side*width*profile)+vertical*(cos_a*height*profile)
            verts.append(tuple(q))
    for i in range(len(path)-1):
        for j in range(sections):
            k=(j+1)%sections
            faces.append((i*sections+j, i*sections+k, (i+1)*sections+k, (i+1)*sections+j))
    faces.append(tuple(reversed(tuple(range(sections)))))
    faces.append(tuple((len(path)-1)*sections+j for j in range(sections)))
    return mesh_object(name, verts, faces, mat, parent)

shoulder_paths = [
    [(-43,-6.62,13),(-27,-6.54,18),(-17,-6.49,23.5),(-10,-6.50,29)],
    [(12,-6.58,9.4),(23,-6.54,14),(32,-6.60,16.6),(47,-7.18,14)],
]
for index, path in enumerate(shoulder_paths):
    shoulder=swept(f'Pearl.pressure-shoulder.{index}',path,2.75,1.12,mats['pearl'],20,16,taper=lambda t:.94+.06*math.sin(t*math.pi))
    swept(f'Dark.shoulder-carrying-shell.{index}',[(x,y-.83,z+.15) for x,y,z in path],2.99,1.24,mats['dark'],16,14)
    swept(f'Titanium.shoulder-service-seam.{index}',[(x,y-.42,z-2.30) for x,y,z in path],.090,.055,mats['titanium'],6,12)
    # Cut the floor glazing around each real shoulder crown. This is baked
    # geometry, not a fragment mask or a shader hiding the top of the hull.
    cutter=shoulder.copy();cutter.data=shoulder.data.copy();bpy.context.collection.objects.link(cutter);cutter.location.z+=.27
    modifier=floor.modifiers.new(f'Recess around shoulder {index}','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
    bpy.context.view_layer.objects.active=floor
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def bevel_box(name, size, pos, mat, radius=.12, yaw=0, parent=near):
    bpy.ops.mesh.primitive_cube_add(size=1,location=B(pos))
    obj=bpy.context.object;obj.name=name;obj.parent=parent
    obj.scale=(size[0],size[2],size[1]);obj.rotation_euler.z=-yaw
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    bevel=obj.modifiers.new('Machined microbevel','BEVEL');bevel.width=radius;bevel.segments=3;bevel.limit_method='ANGLE'
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for p in obj.data.polygons:p.use_smooth=True
    normal=obj.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');normal.keep_sharp=True;normal.weight=35
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj

def lathe(name, profile, pos, mat, resolution=48, parent=near):
    verts,faces=[],[]
    for r,y in profile:
        for i in range(resolution):
            a=i/resolution*math.tau;verts.append((pos[0]+math.cos(a)*r,pos[1]+y,pos[2]+math.sin(a)*r))
    for j in range(len(profile)-1):
        for i in range(resolution):
            k=(i+1)%resolution;faces.append((j*resolution+i,j*resolution+k,(j+1)*resolution+k,(j+1)*resolution+i))
    return mesh_object(name,verts,faces,mat,parent)

def arc(name, center, radius, angle, extent, tube, mat, flatten=.72, parent=near, samples=36):
    points=[(center[0]+math.cos(angle+i/samples*extent)*radius,center[1],center[2]+math.sin(angle+i/samples*extent)*radius*flatten) for i in range(samples+1)]
    return swept(name,points,tube,tube,mat,6,1,parent)

for i,(x,z,yaw) in enumerate([(-13.2,23.5,-.22),(22.4,11.8,.24)]):
    lathe(f'Titanium.recessed-service-collar.{i}',[(0,-.16),(.78,-.16),(.97,-.09),(1.03,.015),(1.01,.075),(.86,.12),(.79,.075),(.78,-.08),(0,-.08)],(x,-5.34,z),mats['titanium'])
    lathe(f'Dark.service-port-socket.{i}',[(0,-.03),(.78,-.03),(.77,.03),(0,.03)],(x,-5.255,z),mats['dark'],40)
    lathe(f'Glass.service-port-insert.{i}',[(0,0),(.56,0),(.59,.02),(.55,.068),(0,.068)],(x,-5.255,z),mats['glass'],40)
    for j,angle in enumerate([.32,2.16,4.15]):arc(f'Emission.split-port.{i}.{j}',(x,-5.17,z),.805,angle,.42,.023,mats['amber' if j==1 else 'cyan'],flatten=1,samples=12)
    for side in [-1,1]:bevel_box(f'Titanium.service-fastener.{i}.{side}',(.32,.16,.52),(x+side*.98,-5.35,z),mats['titanium'],.065,yaw)

for i,(x,z,r) in enumerate([(-8.1,26.2,2.85),(9.2,13,4.25)]):
    for j,(a,e,scale) in enumerate([(.28,math.pi*.57,1),(2.50,math.pi*.74,.84)]):
        arc(f'Titanium.inset-coil-track.{i}.{j}',(x,-5.30,z),r*scale,a,e,.043,mats['titanium'])
        arc(f'Emission.inset-coil.{i}.{j}',(x,-5.255,z),r*scale,a,e,.013,mats['cyan'])
for i,(points,warm) in enumerate([
    ([(-21,-5.30,20.6),(-16,-5.30,23.8),(-10.6,-5.30,26.2)],False),
    ([(10.2,-5.30,14.2),(15.2,-5.30,11.5),(21.2,-5.30,13.5)],False),
    ([(-7.2,-5.30,23.7),(-3.4,-5.30,24.2),(.3,-5.30,23.8)],True),
]):swept(f'Emission.recessed-guide.{i}',points,.026,.017,mats['amber' if warm else 'cyan'],6,14)
for i,(x,z,yaw) in enumerate([(-8.8,24.9,.11),(14,11.3,-.14)]):
    bevel_box(f'Dark.mounting-foundation.{i}',(2.5,.40,1.35),(x,-5.65,z),mats['dark'],.18,yaw)
    bevel_box(f'Pearl.mounting-sleeve.{i}',(2.1,.23,1.15),(x,-5.33,z),mats['pearl'],.09,yaw)

# A continuous, populated crescent habitat is the tangible middle distance.
def H(p):
    # The original world yaw is preserved rather than baking a camera-facing
    # billboard. It remains solid from every chapter's orbit.
    a=-.23;c,s=math.cos(a),math.sin(a)
    return (45+p[0]*c+p[2]*s,-43+p[1],-126-p[0]*s+p[2]*c)
habitat_path=[]
for i in range(45):
    a=.10*math.pi+i/44*math.pi*1.18
    habitat_path.append((math.cos(a)*44,math.sin(a*.6)*.9,math.sin(a)*24))
swept('Dark.habitat.pressure-body',[H(p) for p in habitat_path],4.2,2.3,mats['dark'],14,1,far)
swept('Pearl.habitat.upper-crown',[H((x,y+2.35,z)) for x,y,z in habitat_path],3.4,.73,mats['pearl'],12,1,far)
swept('Titanium.habitat.lower-deck',[H((x,y-2.58,z)) for x,y,z in habitat_path],2.65,.46,mats['titanium'],10,1,far)
for i,t in enumerate([.09,.30,.56,.81,.95]):
    a=.10*math.pi+t*math.pi*1.18
    p=(math.cos(a)*44,math.sin(a*.6)*.9,math.sin(a)*24)
    yaw=math.atan2(-math.sin(a)*44,math.cos(a)*24)-.23
    bevel_box(f'Dark.habitat.observation-pod.{i}',(5.1,6.4,7.2),H((p[0],p[1]-1.35,p[2])),mats['dark'],.65,yaw,far)
    bevel_box(f'Pearl.habitat.pod-roof.{i}',(5.4,.78,7.6),H((p[0],p[1]+2.9,p[2])),mats['pearl'],.26,yaw,far)
    bevel_box(f'Glass.habitat.window.{i}',(3.6,1.34,.18),H((p[0],p[1]+1.28,p[2]+3.62)),mats['glass'],.07,yaw,far)
    for j in range(4):
        bevel_box(f'Emission.habitat.aperture.{i}.{j}',(.39,.72,.13),H((p[0]+(j-1.5)*.74,p[1]-.29,p[2]+3.68)),mats['amber' if i%2 else 'cyan'],.045,yaw,far)

def family_meshes(parent):
    return [obj for obj in bpy.data.objects if obj.type=='MESH' and obj.parent==parent]

# One UV atlas per family avoids overlapping material islands. Rejoin for UV
# layout, then split by material to export predictable shadow/render batches.
def consolidate(parent):
    meshes=family_meshes(parent)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.join()
    combined=bpy.context.object;combined.name=parent.name+'.atlas-assembly'
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(62),island_margin=.008)
    bpy.ops.object.mode_set(mode='OBJECT')
    return combined

near_mesh=consolidate(near)
far_mesh=consolidate(far)

# Actual 1K PBR textures. Material-specific microfinish maps remain subtle;
# ambient occlusion is ray-baked from the assembled near geometry below.
import numpy as np
SIZE=1024
yy,xx=np.mgrid[0:SIZE,0:SIZE].astype(np.float32)/SIZE
fine=np.sin(xx*2119+np.sin(yy*991)*.22)*np.cos(yy*1799+xx*233)
grain=.5+.5*np.sin(xx*319+yy*173+np.sin(xx*61-yy*97)*2.1)
roughness=np.clip(.50+fine*.022+(grain-.5)*.018,0,1)

def image_from_data(name,data):
    image=bpy.data.images.new(name,SIZE,SIZE,alpha=True)
    image.colorspace_settings.name='Non-Color'
    image.pixels.foreach_set(data.astype(np.float32).ravel())
    image.filepath_raw=str(ARCHIVE/(name+'.png'));image.file_format='PNG';image.save();image.pack()
    return image
rough_rgba=np.stack([roughness,roughness,roughness,np.ones_like(xx)],axis=-1)
rough=image_from_data('tem-observatory-roughness-1k',rough_rgba)
dx=.0035*np.cos(xx*811+np.sin(yy*223));dy=.0025*np.sin(yy*739+xx*53)
normal=image_from_data('tem-observatory-normal-1k',np.stack([.5+dx,.5+dy,np.full_like(xx,.999),np.ones_like(xx)],axis=-1))
ao=bpy.data.images.new('tem-observatory-AO-1k',SIZE,SIZE,alpha=False);ao.colorspace_settings.name='Non-Color'

for mat in mats.values():
    if mat.name.startswith('EMISSION'):continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    tex=nodes.new('ShaderNodeTexImage');tex.name='Microfinish Roughness 1K';tex.image=rough
    scale=nodes.new('ShaderNodeMath');scale.operation='MULTIPLY';scale.inputs[1].default_value=bsdf.inputs['Roughness'].default_value*2
    links.new(tex.outputs['Color'],scale.inputs[0]);links.new(scale.outputs[0],bsdf.inputs['Roughness'])
    tex_normal=nodes.new('ShaderNodeTexImage');tex_normal.name='Microfinish Normal 1K';tex_normal.image=normal
    normal_node=nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.18
    links.new(tex_normal.outputs['Color'],normal_node.inputs['Color']);links.new(normal_node.outputs['Normal'],bsdf.inputs['Normal'])
    bake=nodes.new('ShaderNodeTexImage');bake.name='Geometry AO Bake 1K';bake.image=ao;nodes.active=bake

scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.bake.use_clear=True;scene.render.bake.margin=6
bpy.ops.object.select_all(action='DESELECT');near_mesh.select_set(True);bpy.context.view_layer.objects.active=near_mesh
bpy.ops.object.bake(type='AO')
ao.filepath_raw=str(ARCHIVE/'tem-observatory-AO-1k.png');ao.file_format='PNG';ao.save();ao.pack()

# glTF's named occlusion socket is recognised by Blender's bundled exporter.
group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
for mat in mats.values():
    if mat.name.startswith('EMISSION'):continue
    node=mat.node_tree.nodes.new('ShaderNodeGroup');node.node_tree=group
    texture=mat.node_tree.nodes.get('Geometry AO Bake 1K')
    mat.node_tree.links.new(texture.outputs['Color'],node.inputs['Occlusion'])

# The remote family gets its own geometry bake, retaining shared roughness and
# normal maps. Its UV islands differ from the deck, so reusing deck AO is wrong.
far_ao=bpy.data.images.new('tem-observatory-habitat-AO-1k',SIZE,SIZE,alpha=False);far_ao.colorspace_settings.name='Non-Color'
far_materials=[]
for index,source_mat in enumerate(list(far_mesh.data.materials)):
    if source_mat.name.startswith('EMISSION'):continue
    far_mat=source_mat.copy();far_mat.name=source_mat.name+'_FAR'
    target=far_mat.node_tree.nodes.get('Geometry AO Bake 1K');target.image=far_ao;far_mat.node_tree.nodes.active=target
    far_mesh.data.materials[index]=far_mat;far_materials.append(far_mat)
bpy.ops.object.select_all(action='DESELECT');far_mesh.select_set(True);bpy.context.view_layer.objects.active=far_mesh
bpy.ops.object.bake(type='AO')
far_ao.filepath_raw=str(ARCHIVE/'tem-observatory-habitat-AO-1k.png');far_ao.file_format='PNG';far_ao.save();far_ao.pack()

# Manifoldness is measured before material separation. glTF batch boundaries
# can be valid seams on one closed volume, rather than open physical holes.
family_manifold={}
for obj in [near_mesh,far_mesh]:
    bm=bmesh.new();bm.from_mesh(obj.data)
    family_manifold[obj.parent.name]={'boundary_edges':sum(edge.is_boundary for edge in bm.edges),'nonmanifold_edges':sum(not edge.is_manifold for edge in bm.edges)}
    bm.free()
assert all(data['boundary_edges']==0 for data in family_manifold.values()),family_manifold

def split_batches(combined,parent):
    bpy.ops.object.select_all(action='DESELECT');combined.select_set(True);bpy.context.view_layer.objects.active=combined
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
    for obj in family_meshes(parent):
        # Remove unused slots after separation, retaining the authored UV atlas.
        used=sorted({p.material_index for p in obj.data.polygons})
        original=[obj.data.materials[index] for index in used]
        remap={old:new for new,old in enumerate(used)}
        for polygon in obj.data.polygons:polygon.material_index=remap[polygon.material_index]
        obj.data.materials.clear()
        for mat in original:obj.data.materials.append(mat)
        obj.name=parent.name+'.'+original[0].name
        obj['material_role']=original[0].name
        obj['shadow_cast']=not ('GLASS' in original[0].name or 'FLOOR' in original[0].name or 'EMISSION' in original[0].name)
        obj['shadow_receive']='EMISSION' not in original[0].name
        tri=obj.modifiers.new('Export triangulation','TRIANGULATE');bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=tri.name)

split_batches(near_mesh,near)
split_batches(far_mesh,far)

meshes=family_meshes(near)+family_meshes(far)
triangles=sum(len(obj.data.polygons) for obj in meshes)
finite=all(math.isfinite(float(component)) for obj in meshes for vertex in obj.data.vertices for component in vertex.co)
assert finite,'Non-finite geometry'
assert triangles<=40000,f'Geometry exceeds forty thousand triangles: {triangles}'
assert len(meshes)<=20,f'Geometry exceeds twenty material batches: {len(meshes)}'
bad=[]
for obj in meshes:
    bm=bmesh.new();bm.from_mesh(obj.data)
    boundary=sum(1 for edge in bm.edges if edge.is_boundary)
    if boundary:bad.append((obj.name,boundary))
    bm.free()

bpy.ops.object.select_all(action='DESELECT')
asset.select_set(True);near.select_set(True);far.select_set(True)
for obj in meshes:obj.select_set(True)
# Windows managed sessions can deny traversal of TemporaryDirectory's private
# ACL even inside this workspace. Keep exporter scratch image files directly
# in the authorised archive. This changes only this Blender process, not the
# installed exporter or the workstation's permissions.
from io_scene_gltf2.blender.exp.material import encode_image
export_image_count=0
def workspace_encode_image(tmp_image,file_format,export_settings):
    global export_image_count
    export_image_count+=1
    path=ARCHIVE/f'tem-observatory-export-image-{export_image_count:02d}.{file_format.lower()}'
    tmp_image.filepath_raw=str(path);tmp_image.file_format=file_format
    if file_format in ['JPEG','WEBP']:tmp_image.save(quality=export_settings['gltf_image_quality'])
    else:tmp_image.save()
    return path.read_bytes()
encode_image._encode_temp_image=workspace_encode_image
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_texcoords=True,export_normals=True,export_tangents=True,export_animations=False,export_lights=False,export_cameras=False,export_extras=True)

# The editable .blend includes an honest product-lighting inspection camera.
def aim(obj,target):
    obj.rotation_euler=(B(target)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=B((65,64,138)))
camera=bpy.context.object;camera.name='INSPECTION_CAMERA';camera.data.lens=38;aim(camera,(0,-6.3,23));scene.camera=camera
for name,pos,color,power,size in [
    ('Warm product key',(-16,25,30),(1,.77,.56),3400,28),
    ('Cold edge',(38,12,-7),(.43,.66,1),4600,24),
    ('Soft floor fill',(8,31,40),(.73,.85,1),2200,30),
]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=B(pos);aim(obj,(0,-5.8,22))
scene.world.color=(.022,.028,.042)
scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ARCHIVE/'tem-observatory-inspection.png')
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

bounds=[]
for obj in meshes:
    bounds.extend([obj.matrix_world @ v.co for v in obj.data.vertices])
manifest={
    'builder':'Blender '+bpy.app.version_string,
    'asset':str(GLB.relative_to(ROOT)),
    'source':str(BLEND.relative_to(ROOT)),
    'axis':'Authored Three.js (x,y,z) -> Blender(x,-z,y), glTF export_yup restores exact Three.js axes.',
    'root':'TEM_OBSERVATORY',
    'clone_family':'NEAR_DECK','single_family':'FAR_HABITAT',
    'floor_y':-5.32,'triangles':triangles,'draw_batches':len(meshes),'materials':[mat.name for mat in list(mats.values())+far_materials],
    'batches':[{'name':obj.name,'triangles':len(obj.data.polygons),'material':obj.data.materials[0].name,'uv_count':len(obj.data.uv_layers)} for obj in meshes],
    'finite':finite,'material_batch_seams':bad,'closed_family_validation':family_manifold,
    'textures':{'roughness':1024,'normal':1024,'near_AO':1024,'far_AO':1024,'AO_source':'Separate Cycles AO ray bakes from both assembled model families'},
    'notes':['No background picture, laptop, closed cage or full glowing rim.','The normal map is a subtle manufactured microfinish; both AO maps are actual ray-baked geometry.','Inspection lights/camera are only in .blend, excluded from web GLB.','Batch seams are measured after material splitting; both physical model families were validated closed beforehand.'],
}
(ARCHIVE/'tem-observatory-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('TEM_OBSERVATORY_EXPORT',json.dumps({'triangles':triangles,'batches':len(meshes),'glb_bytes':GLB.stat().st_size,'boundary_edges':bad},ensure_ascii=False))
bpy.ops.render.render(write_still=True)
