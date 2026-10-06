"""Editable v19 portrait rebuild. Run through the fixed local Blender MCP.

The previous two scenes remain intact; this adds a clean third scene and a
separate absolute-coordinate web asset. No old floor/frame/T is reused here.
"""
import bpy,bmesh,math,json,random
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blender/cinematic-v19';OUT.mkdir(parents=True,exist_ok=True)
MODELS=ROOT/'assets/models'
scene=bpy.data.scenes.new('03 — TEM / Dream Observatory')
bpy.context.window.scene=scene
def B(p):return Vector((p[0],-p[2],p[1]))
def collection(name):
 c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
cabin=collection('V19.01 — Manufactured observatory cabin')
identity=collection('V19.02 — Laminated optical identity')
screen=collection('V19.03 — Curved pressure display')
exterior=collection('V19.04 — Cloud sea and inhabited horizon')
rig=collection('V19.05 — Cinematic lighting and portrait camera')
staging=collection('V19.06 — Editable typography and references')
universe=collection('V19.07 — Render-only planets and three-dimensional stars')
exports=collection('V19.09 — Optimized absolute-coordinate web copies')
# Reuse established geometry primitives and the actual Cycles baking code.
# Material instances are new Blender datablocks, so v18 remains editable intact.
source=(ROOT/'scripts/build-tem-cinematic.py').read_text(encoding='utf8')
primitives=source[source.index('def move(o,c):'):source.index("worlddeck=group(")]
# Loaded desktop preferences may localize Blender's default node names. Give
# the authored shader an explicit stable name instead of depending on a label.
primitives=primitives.replace("p=m.node_tree.nodes.get('Principled BSDF')", "p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) or m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');p.name='Principled BSDF';out=next((n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL'),None) or m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(p.outputs['BSDF'],out.inputs['Surface'])")
exec(compile(primitives,
             'v19-shared-manufacturing-primitives','exec'))
pearl.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.62,.69,.75,1)
pearl.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.55
floor.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.019,.036,.063,1)
floor.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.46
floor.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.38
floor.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.34
floor.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.30
glass.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.025
glass.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.26
glass.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value=1.455
for mat,label in [(pearl,'V19_PEARL'),(floor,'FLOOR_V19'),(titanium,'V19_TITANIUM'),(warm,'V19_CHAMPAGNE'),(dark,'V19_PRESSURE'),(glass,'GLASS_V19')]:mat.name=label
def parent_all(c,root):
 for o in list(c.objects):
  if o!=root and o.parent is None:o.parent=root
def point_on_frame(x,y):return (x,y,x*x*.006+y*y*.0005+.02)
def rounded_outline(w,h,r=.68,steps=14):
 out=[]
 for cx,cy,a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
  for j in range(steps+1):
   q=math.radians(a+j/steps*90);out.append(point_on_frame(cx+r*math.cos(q),cy+r*math.sin(q)))
 return out

# An occupied solid viewing terrace, with a curved open window edge. The old
# annular void is deliberately absent from this portrait composition.
cabinroot=group('CABIN_V19',cabin)
nx,nz=56,40;verts=[];faces=[]
for j in range(nz+1):
 for i in range(nx+1):
  x=-47+i/nx*94;edge=-29+abs(x/47)**2*18
  z=edge+(49-edge)*j/nz;verts.append((x,-5.32,z))
for j in range(nz):
 for i in range(nx):
  a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
mesh('FLOOR_V19 — continuous polished viewing terrace',verts,faces,floor,cabin)
edge=[(-47+i/64*94,-5.34,-29+abs((-47+i/64*94)/47)**2*18) for i in range(65)]
sweep('Window sill — sculpted pressure lip',edge,.28,.39,dark,cabin,n=100,sides=12)
sweep('Window sill — champagne reveal',[(x,y+.17,z+.18) for x,y,z in edge],.046,.025,warm,cabin,n=100)
sweep('Window sill — inset optical guide',[(x,y+.32,z+.06) for x,y,z in edge],.024,.014,cyan,cabin,n=100)
sweep('Window sill — pale ceramic shoulder',[(x,y-.24,z-.16) for x,y,z in edge],.14,.19,pearl,cabin,n=100)
# Rounded structural members live at the composition's margins, instead of
# placing long black tubes in front of the world or through the visitor path.
arch=[(-33,-6,-11),(-34,5,-17),(-31,15,-22),(-21,22,-27),(0,24,-30),(21,22,-27),(31,15,-22),(34,5,-17),(33,-6,-11)]
sweep('Primary window arch — pressure structure',arch,.74,.47,dark,cabin,n=130,sides=12)
sweep('Arch outer ceramic lamination',[(x,y+.30,z-.32) for x,y,z in arch],.21,.18,pearl,cabin,n=130)
sweep('Arch machined inner reveal',[(x*.995,y-.48,z+.21) for x,y,z in arch],.079,.07,warm,cabin,n=130)
for side in [-1,1]:
 path=[(side*33,-4,-12),(side*33,6,-18),(side*29.4,15.5,-23),(side*21,21.2,-27)]
 sweep('Recessed cyan pressure seal',path,.023,.022,cyan,cabin,n=48)
 for j in range(7):
  q=catmull(path,48)[4+j*6]
  plate=box('Window maintenance joint',tuple(q),(.25,.49,.36),titanium,cabin,.055)
  box('Recessed warm telemetry',(q.x,q.y+.05,q.z+.21),(.038,.15,.022),amber,cabin,.006)
# Flush floor seams, curved seating and actual mechanical service optics.
for r in [25.5,34.2,44.5]:
 points=[(math.sin(a)*r,-5.314,16-math.cos(a)*r*.55) for a in [(-1.03+i/64*2.06) for i in range(65)]]
 sweep('Polished floor inlay',points,.027,.007,warm if r==25.5 else titanium,cabin,n=70,sides=6)
for side in [-1,1]:
 path=[(side*25,-4.63,7),(side*29,-4.38,3),(side*30,-4.32,-3),(side*29,-4.63,-9)]
 sweep('Ceramic lounge plinth',path,1.6,.53,dark,cabin,n=58,sides=16)
 sweep('Soft contoured lounge cushion',[(x,y+.51,z) for x,y,z in path],1.45,.37,material('V19 LOUNGE — midnight textile',(.038,.050,.070),rough=.76),cabin,n=58,sides=16)
 for z in [-6,6]:
  lathe('Flush service optic',[(0,-.03),(.42,-.03),(.55,.10),(.47,.19),(0,.19),(0,-.03)],(side*21,-5.30,z),titanium,cabin,n=40)
  ring('Service optic rim',.42,.20,cyan,cabin,p=(side*21,-5.30,z),w=.014,n=40)
parent_all(cabin,cabinroot)

# Continuous real laminated glass T with a subdivided, shallow convex face.
# Joined surface cells share vertices across the crossbar/stem junction.
troot=group('T_IDENTITY_V19',identity);troot.location=B((9.6,6.5,-17));troot.rotation_euler.z=-.28
troot['identityCenter']=[9.6,6.5,-17];troot['identityYaw']=-.28;troot['identityWidth']=14.2;troot['identityHeight']=15.3
xs=sorted(set([-7.1,-2.1,2.1,7.1]+[-7.1+i/28*14.2 for i in range(29)]))
ys=sorted(set([-7.65,4.65,7.65]+[-7.65+i/30*15.3 for i in range(31)]))
cells={(i,j) for j in range(len(ys)-1) for i in range(len(xs)-1) if (ys[j]+ys[j+1])*.5>=4.65 or abs((xs[i]+xs[i+1])*.5)<2.1}
vs=[];fs=[];vi={}
def tv(i,j,side):
 key=(i,j,side)
 if key not in vi:
  x,y=xs[i],ys[j];bulge=.24*math.cos(x/7.1*math.pi*.5)*math.cos(y/7.65*math.pi*.5)
  vi[key]=len(vs);vs.append((x,y,side*(.60+bulge)))
 return vi[key]
for i,j in cells:
 fs.append(tuple(tv(x,y,1) for x,y in [(i,j),(i+1,j),(i+1,j+1),(i,j+1)]))
 fs.append(tuple(tv(x,y,-1) for x,y in [(i,j+1),(i+1,j+1),(i+1,j),(i,j)]))
 for di,dj,a,b in [(-1,0,(i,j+1),(i,j)),(1,0,(i+1,j),(i+1,j+1)),(0,-1,(i,j),(i+1,j)),(0,1,(i+1,j+1),(i,j+1))]:
  if (i+di,j+dj) not in cells:fs.append((tv(*a,-1),tv(*b,-1),tv(*b,1),tv(*a,1)))
t=mesh('GLASS_V19 — closed curved laminated identity',vs,fs,glass,identity)
be=t.modifiers.new('Optical manufacturing radius — editable','BEVEL');be.width=.22;be.segments=7;be.limit_method='ANGLE';be.angle_limit=math.radians(35)
be=t.modifiers.new('Smooth optical normals','WEIGHTED_NORMAL');t.parent=troot
# Thin optical double lamination with its own optical depth, inside the shell.
innerglass=glass.copy();innerglass.name='GLASS_V19 — internal dichroic lamina';p=innerglass.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.62,.76,.91,1);p.inputs['Transmission Weight'].default_value=.985
lamina=t.copy();lamina.data=t.data.copy();identity.objects.link(lamina);lamina.name='GLASS_V19 — inner pressure lamina';lamina.data.materials.clear();lamina.data.materials.append(innerglass);lamina.scale=(.962,.977,.72);lamina.parent=troot
for y in [7.60,4.70]:
 path=[(-6.9,y,.20),(-3.6,y+.14,.34),(0,y+.23,.46),(3.6,y+.14,.34),(6.9,y,.20)]
 o=sweep('Identity crossbar machined champagne edge',path,.045,.042,warm,identity,n=62);o.parent=troot
 o=sweep('Identity crossbar internal photonic seal',[(x,yy-.045,z+.12) for x,yy,z in path],.015,.014,cyan,identity,n=62);o.parent=troot
for side in [-1,1]:
 path=[(side*2.06,-7.34,.19),(side*2.07,-3.7,.36),(side*2.08,.8,.40),(side*2.10,4.65,.24)]
 o=sweep('Identity stem tension edge',path,.040,.038,warm,identity,n=64);o.parent=troot
 o=sweep('Identity stem inner luminous seam',[(x-side*.06,y,z+.14) for x,y,z in path],.014,.014,violet,identity,n=64);o.parent=troot
for side in [-1,1]:
 o=box('Identity ceramic end shoe',(side*7.06,6.15,-.08),(.28,2.91,1.34),pearl,identity,.14);o.parent=troot
 o=box('Identity titanium end liner',(side*7.08,6.15,.54),(.12,2.18,.14),warm,identity,.045);o.parent=troot
 o=box('Identity cold status slit',(side*7.10,6.13,.65),(.038,1.42,.028),cyan,identity,.01);o.parent=troot
o=box('Identity floating foot collar',(0,-7.56,-.03),(4.26,.23,1.31),warm,identity,.10);o.parent=troot
# Actual inner luminous filaments also render in Cycles. The browser adds GPU
# energy travelling on these paths, rather than animating a background image.
for j in range(4):
 pts=[]
 for k in range(80):
  q=k/79;pts.append((math.sin(q*math.tau*1.42+j*.71)*(.37+j*.085),-7.24+q*14.45,math.cos(q*math.tau*1.17+j*.7)*.22))
 o=sweep('Identity internal optical filament',pts,.012,.011,cyan if j%3 else violet,identity,n=92,sides=6);o.parent=troot
for j in range(3):
 pts=[(-6.6+k/80*13.2,6.13+math.sin(k/80*math.tau*1.1+j)*.56,math.cos(k/80*math.tau+j)*.23) for k in range(81)]
 o=sweep('Identity crossbar field',pts,.010,.010,violet if j%2 else cyan,identity,n=92,sides=6);o.parent=troot

# Match the existing DOM projection exactly; hardware has a thick closed
# curved laminate and a sculpted support, rather than a square CSS border.
froot=group('SURFACE_FRAME_V19',screen);froot.location=B((-8.3,1.45,-2));froot.rotation_euler.z=.12;froot.rotation_euler.y=.045
froot['surfaceWidth']=12.22;froot['surfaceHeight']=10.528
ol=rounded_outline(13,11.2)
for name,dx,dy,dz,ww,hh,mat in [
 ('Display outer ceramic gasket',1,1,0,.11,.12,pearl),
 ('Display champagne lamination',.993,.993,.082,.041,.051,warm),
 ('Display inner pressure seal',.986,.984,.022,.045,.042,dark),
 ('Display cold photonic seam',.981,.980,.11,.012,.017,cyan)]:
 o=sweep(name,[(x*dx,y*dy,z+dz) for x,y,z in ol],ww,hh,mat,screen,n=180,closed=True);o.parent=froot
nx,ny=44,38;vs=[];fs=[]
for layer in [-1,1]:
 for j in range(ny+1):
  for i in range(nx+1):
   x=-6.32+i/nx*12.64;y=-5.44+j/ny*10.88;vs.append((x,y,x*x*.006+y*y*.0005+layer*.058))
stride=(nx+1)*(ny+1)
for j in range(ny):
 for i in range(nx):
  a=j*(nx+1)+i;fs.append((a,a+1,a+nx+2,a+nx+1));fs.append((a+stride,a+nx+1+stride,a+nx+2+stride,a+1+stride))
for j in range(ny):
 for a in [j*(nx+1),(j+1)*(nx+1)-1]:fs.append((a,a+nx+1,a+nx+1+stride,a+stride))
for i in range(nx):
 for a in [i,ny*(nx+1)+i]:fs.append((a,a+stride,a+1+stride,a+1))
pane=mesh('GLASS_V19 — closed curved reading laminate',vs,fs,glass,screen);pane.parent=froot
for side in [-1,1]:
 for y in [-4.69,4.67]:
  o=box('Pressure screen machined corner',(side*6.34,y,.37),(.27,.56,.22),pearl,screen,.08);o.parent=froot
  o=box('Corner service inset',(side*6.34,y+.04,.49),(.13,.23,.045),warm,screen,.022);o.parent=froot
  o=box('Corner telemetry',(side*6.34,y+.17,.525),(.11,.025,.015),cyan,screen,.004);o.parent=froot
o=sweep('Display lower curved mount',[(-6.2,-4.8,.27),(-6.0,-6.04,.02),(-4.6,-6.65,-.29),(-1.4,-6.72,-.55)],.22,.18,pearl,screen,n=72,sides=12);o.parent=froot
o=sweep('Display lower machined channel',[(-6.17,-4.9,.02),(-6.05,-6.12,-.24),(-4.6,-6.82,-.47),(-1.4,-6.91,-.66)],.073,.095,warm,screen,n=72);o.parent=froot

exec(compile((ROOT/'scripts/tem-observatory-world-v19.py').read_text(encoding='utf8'),'tem-observatory-world-v19.py','exec'))
eroot=group('EXTERIOR_V19',exterior)
exterior_objects=build_exterior_v19(exterior,{'pearl':pearl,'titanium':titanium,'warm':warm,'dark':dark,'cyan':cyan,'amber':amber})
parent_all(exterior,eroot)

# Offline review uses the same distant planetary horizon as the live world.
# Keep these environment objects out of the web GLB, which already has a
# textured Earth, real star particles and dynamic volumetric nebula passes.
for source_name in ['Planetary horizon','Planetary cloud layer','Planetary atmosphere','2600 real three-dimensional stars']:
 src=bpy.data.objects.get(source_name)
 if not src:continue
 o=src.copy();o.data=src.data.copy();universe.objects.link(o);o.name='V19 review — '+source_name;o['tem_export']=False
 if source_name.startswith('Planetary'):
  scale=13940/335;o.location=B((7400,-14300,-13900));o.scale*=scale
  if source_name=='Planetary atmosphere':
   m=o.active_material.copy();o.data.materials.clear();o.data.materials.append(m)
   scatter=next((n for n in m.node_tree.nodes if n.type=='VOLUME_SCATTER'),None)
   if scatter:scatter.inputs['Density'].default_value/=scale

# The offline camera uses the exact web portrait pose and vertical field of
# view. This makes composition review meaningful before runtime integration.
def look(o,p):o.rotation_euler=(B(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,p,target,power,color,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size;data.size_y=max(.6,size*.18)
 o=bpy.data.objects.new(name,data);rig.objects.link(o);o.location=B(p);look(o,target);return o
area('Sunrise warm broad reflection card',(36,19,-44),(0,1,-10),4500,(1,.77,.58),14)
area('Azure interior softbox',(-23,14,18),(0,2,-8),3300,(.38,.62,1),18)
area('Glass soft face',(-2,16,27),(5,5,-15),1500,(.58,.72,1),13)
area('Amethyst optical edge',(17,6,-34),(9,5,-17),650,(.49,.26,.76),5)
data=bpy.data.cameras.new('CAMERA_profile_v19');data.type='PERSP';data.sensor_fit='VERTICAL';data.sensor_height=24;data.lens=data.sensor_height/(2*math.tan(math.radians(49)/2));data.clip_end=60000
cam=bpy.data.objects.new('CAMERA_profile_v19',data);rig.objects.link(cam);cam.location=B((0,2.7,20));look(cam,(0,2,-5));scene.camera=cam
previous=bpy.data.scenes.get('01 — TEM / Observatory');scene.world=previous.world.copy() if previous and previous.world else bpy.data.worlds.new('V19 Galactic environment')
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.40
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8;scene.cycles.volume_bounces=2
scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
finish=bpy.data.node_groups.new('V19 — cinematic optical finish','CompositorNodeTree');scene.compositing_node_group=finish
finish.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
rl=finish.nodes.new('CompositorNodeRLayers');rl.scene=scene
glow=finish.nodes.new('CompositorNodeGlare')
if hasattr(glow,'glare_type'):glow.glare_type='FOG_GLOW'
if hasattr(glow,'quality'):glow.quality='HIGH'
if 'Type' in glow.inputs:glow.inputs['Type'].default_value='Fog Glow'
if 'Threshold' in glow.inputs:glow.inputs['Threshold'].default_value=1.6
if 'Strength' in glow.inputs:glow.inputs['Strength'].default_value=.14
out=finish.nodes.new('NodeGroupOutput');finish.links.new(rl.outputs['Image'],glow.inputs['Image']);finish.links.new(glow.outputs['Image'],out.inputs['Image'])
# Typography is editable in Blender and excluded from the runtime asset; the
# website retains accessible live content aligned to this physical screen.
fontpath=Path('C:/Windows/Fonts/simsun.ttc')
font=bpy.data.fonts.load(str(fontpath)) if fontpath.exists() else None
def text(body,p,size,mat):
 data=bpy.data.curves.new('Editable Tem typography','FONT');data.body=body;data.size=size;data.extrude=.001
 if font:data.font=font
 o=bpy.data.objects.new('Editable content — '+body[:18],data);staging.objects.link(o);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(mat);o.parent=froot;o.location=B(p);return o
text('TEM',(-5.0,2.68,.40),1.8,white)
text('王乾辉 / WANG QIANHUI',(-5.0,1.55,.38),.39,white)
text('理解过去，生活当下，畅想未来。',(-5.0,.08,.39),.50,white)
text('写诗，设计游戏，探索技术与未知。',(-5.0,-.82,.40),.34,white)
text('前往创作星图  ↗',(-5.0,-3.95,.35),.40,cyan)
# Render-only ribbons follow the exact live GPU cubic paths and identity yaw.
controls=[[[ -.018*14.2,-.42*15.3,.05],[-.028*14.2,-.15*15.3,.14],[.022*14.2,.07*15.3,.06],[0,.30*15.3,.12]],
 [[-.44*14.2,.355*15.3,.03],[-.18*14.2,.39*15.3,.12],[.19*14.2,.335*15.3,.12],[.44*14.2,.36*15.3,.02]],
 [[-.65*14.2,-.12*15.3,1.8],[.10*14.2,-.20*15.3,7.6],[.90*14.2,.12*15.3,1.7],[.56*14.2,.38*15.3,-4.5]],
 [[-.53*14.2,.35*15.3,-2.8],[-.30*14.2,.57*15.3,-4.4],[.72*14.2,.34*15.3,3.3],[.58*14.2,-.09*15.3,4.4]]]
for j,control in enumerate(controls):
 pts=[]
 for k in range(120):
  q=k/119;a,b,c,d=[Vector(v) for v in control];p=a*(1-q)**3+b*(3*q*(1-q)**2)+c*(3*q*q*(1-q))+d*q**3
  pts.append((p.x,p.y,p.z))
 for width,height,mat in [(.035,.020,cyan if j%2 else violet),(.11,.045,violet if j%2 else cyan)]:
  o=sweep('Render-only travelling optical ribbon',pts,width,height,mat,staging,n=128,sides=6,taper=True);o.parent=troot;o['tem_export']=False

# Editable originals and private optimized copies: join only within semantic
# roots and material families. Bake near manufacturing; keep cloud/world
# geometry physically lit and export it separately without a huge UV bake.
all_web=[];roots=[];bakes={}
bpy.context.view_layer.update()
for label,c in [('CABIN_V19',cabin),('T_IDENTITY_V19',identity),('SURFACE_FRAME_V19',screen),('EXTERIOR_V19',exterior)]:
 root=group(label+'_WEB',exports);roots.append(root)
 authored={'CABIN_V19':cabinroot,'T_IDENTITY_V19':troot,'SURFACE_FRAME_V19':froot,'EXTERIOR_V19':eroot}[label]
 authored.name='AUTHOR_'+label
 for key in authored.keys():root[key]=authored[key]
 copies=[]
 for src in list(c.objects):
  if src.type!='MESH' or not src.get('tem_export',True):continue
  o=src.copy();o.data=src.data.copy();exports.objects.link(o);o.parent=None;o.matrix_world=src.matrix_world.copy();o.hide_render=False;o.hide_set(False)
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  copies.append(o)
 buckets={}
 for o in copies:buckets.setdefault(o.active_material.name,[]).append(o)
 joined=[]
 for material_name,items in buckets.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0]
  if len(items)>1:bpy.ops.object.join()
  o=bpy.context.object
  o.name=label+'_'+material_name;o.parent=root;joined.append(o)
 if label in ['CABIN_V19','T_IDENTITY_V19','SURFACE_FRAME_V19']:bakes[label]=bake_finish(joined,label)
 root.name=label
 all_web.extend(joined)
 bpy.ops.object.select_all(action='DESELECT')
for o in all_web:o.select_set(True)
for root in roots:root.select_set(True)
exports.hide_render=False
bpy.ops.export_scene.gltf(filepath=str(MODELS/'tem-observatory-v19.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_extras=True)
triangles=0
for o in all_web:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles);o.hide_render=True;o.hide_set(True)
scene.view_layers[0].layer_collection.children[exports.name].exclude=True
ref=ROOT/'blender/references-v18/identity-target.png'
if ref.exists():
 image=bpy.data.images.load(str(ref));image.pack();o=bpy.data.objects.new('V19 concept reference — viewport only',None);staging.objects.link(o);o.empty_display_type='IMAGE';o.data=image;o.hide_render=True;o.hide_set(True)
notes=bpy.data.texts.new('V19 — START HERE');notes.write('TEM Dream Observatory v19\nNew third scene matches the real browser portrait camera.\nEditable glass identity, curved pressure screen, manufactured cabin, inhabited cloud horizon.\nOriginal meshes/modifiers in V19.01–06; private material-joined web copies in V19.09.\nNormal/roughness/AO baked from shader bevels and actual geometry; not high-poly sculpt projection.\nCloud volumes are offline-only; web uses actual meshes plus existing live world volumes.\nPrevious v18 two scenes are preserved.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tem-dream-observatory.blend'))
manifest={'generator':'Blender '+bpy.app.version_string,'transport':'Project-local MCP stdio','scene':scene.name,'blend':'tem-dream-observatory.blend','asset':'tem-observatory-v19.glb','bytes':(MODELS/'tem-observatory-v19.glb').stat().st_size,'triangles':triangles,'meshes':len(all_web),'roots':[r.name for r in roots],'camera':{'position':[0,2.7,20],'look':[0,2,-5],'fovVertical':49},'sunDirection':[.48,.19,-.84],'bakes':bakes,'reference':'identity-target.png','sceneryIsGeometry':True}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');print('TEM_OBSERVATORY_V19_COMPLETE '+json.dumps(manifest,ensure_ascii=False),flush=True)
