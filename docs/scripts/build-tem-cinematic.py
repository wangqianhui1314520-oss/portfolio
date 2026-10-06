"""Tem v18: editable cinematic observatory + sculptural starport.
Executed by the project's allowlisted local MCP service. Authoring coordinates
are browser Y-up; B() converts them to Blender Z-up before glTF export.
"""
import bpy, bmesh, math, json, random
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blender/cinematic-v18';OUT.mkdir(parents=True,exist_ok=True)
MODELS=ROOT/'assets/models';MODELS.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name='01 — TEM / Observatory'
def B(p):return Vector((p[0],-p[2],p[1]))
def collection(name):
 c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
deck=collection('01. Continuous observatory deck — web asset')
display=collection('02. Optical display — web asset')
port=collection('03. Sculptural starport — web asset')
fleet=collection('04. Four distinct starships — web asset')
env=collection('05. Universe — editable lights, planets and nebula')
profile=collection('06. Profile staging — glass T, energy and typography')
rig=collection('07. Cameras and cinematic light rig')
refs=collection('08. Concept references — viewport only');refs.hide_render=True
def move(o,c):
 for old in list(o.users_collection):old.objects.unlink(o)
 c.objects.link(o)
def material(name,color,metal=0,rough=.3,coat=.0,emit=0,transmission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal
 p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=coat
 p.inputs['Coat Roughness'].default_value=.16
 p.inputs['Transmission Weight'].default_value=transmission;p.inputs['IOR'].default_value=1.46
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 m.diffuse_color=(*color,1);return m
pearl=material('PEARL_CERAMIC',(.48,.58,.67),.12,.29,.40)
titanium=material('TITANIUM_COLD',(.15,.20,.25),.84,.28,.22)
warm=material('TITANIUM_CHAMPAGNE',(.43,.30,.15),.88,.24,.22)
dark=material('DARK_PRESSURE',(.015,.029,.042),.35,.36,.18)
floor=material('FLOOR_OPTICAL',(.012,.028,.040),.38,.25,.38)
floor.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.24
glass=material('GLASS_DISPLAY',(.74,.90,.96),0,.045,.18,transmission=.965)
cyan=material('EMISSION_CYAN',(.25,.69,1.),0,.3,emit=2.8)
amber=material('EMISSION_AMBER',(1.,.59,.27),0,.3,emit=2.5)
violet=material('EMISSION_AMETHYST',(.56,.33,1.),0,.3,emit=2.8)
white=material('EMISSION_PEARL',(.81,.91,1.),0,.3,emit=1.6)
# Packed, deterministic microfinish. Kept as image nodes so web exports retain it.
random.seed(1717)
for mat,strength in [(floor,.055),(pearl,.035),(titanium,.07),(warm,.05)]:
 image=bpy.data.images.new(mat.name+'_MicroNormal',width=256,height=256,alpha=True)
 image.colorspace_settings.name='Non-Color'
 pixels=[]
 for i in range(256*256):
  t=(random.random()-.5)*strength;pixels.extend((.5+t,.5+t*.34,1.,1.))
 image.pixels.foreach_set(pixels);image.update();image.pack()
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;tex=nodes.new('ShaderNodeTexImage');tex.image=image
 tex.extension='REPEAT';mapping=nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(24,24,24)
 coord=nodes.new('ShaderNodeTexCoord');links.new(coord.outputs['UV'],mapping.inputs['Vector']);links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
 normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.28
 links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
exec(compile((ROOT/'scripts/tem-cinematic-bake.py').read_text(encoding='utf8'),'tem-cinematic-bake.py','exec'))
authored_finishes()

def mesh(name,verts,faces,mat,c):
 data=bpy.data.meshes.new(name);data.from_pydata([B(v) for v in verts],[],faces);data.update()
 o=bpy.data.objects.new(name,data);c.objects.link(o);o.data.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 for poly in data.polygons:poly.use_smooth=True
 uv=data.uv_layers.new(name='SurfaceUV')
 for poly in data.polygons:
  for li in poly.loop_indices:
   v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(v.x*.055,-v.y*.055+v.z*.055)
 return o
def box(name,p,size,mat,c,bevel=.06):
 bpy.ops.mesh.primitive_cube_add(size=1,location=B(p));o=bpy.context.object;o.name=name;move(o,c)
 o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Machined edge — editable bevel','BEVEL');mod.width=min(bevel,min(size)*.24);mod.segments=3
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def catmull(points,n=64,closed=False):
 pts=[Vector(p) for p in points];out=[];segments=len(pts) if closed else len(pts)-1
 for i in range(n+1):
  u=i/n*segments;k=min(segments-1,int(u));t=u-k
  get=lambda j:pts[j%len(pts)] if closed else pts[max(0,min(len(pts)-1,j))]
  a,b,c,d=[get(k+j) for j in [-1,0,1,2]]
  out.append((b*2+(c-a)*t+(a*2-b*5+c*4-d)*t*t+(-a+b*3-c*3+d)*t*t*t)*.5)
 return out
def sweep(name,points,width,height,mat,c,n=64,sides=12,taper=False,closed=False):
 path=catmull(points,n,closed);verts=[];faces=[]
 for i,p in enumerate(path):
  tangent=(path[min(n,i+1)]-path[max(0,i-1)]).normalized();up=Vector((0,1,0))
  if abs(tangent.dot(up))>.95:up=Vector((0,0,1))
  side=tangent.cross(up).normalized();vertical=side.cross(tangent).normalized()
  factor=(.16+.84*math.sin(i/n*math.pi)**.40) if taper else 1
  for j in range(sides):
   a=j/sides*math.tau;v=p+side*(math.cos(a)*width*factor)+vertical*(math.sin(a)*height*factor);verts.append(v)
 for i in range(n):
  for j in range(sides):
   a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
 if not closed:faces.extend([tuple(reversed(range(sides))),tuple(n*sides+j for j in range(sides))])
 return mesh(name,verts,faces,mat,c)
def lathe(name,rows,p,mat,c,n=96,sx=1,sz=1):
 verts=[];faces=[]
 for r,y in rows:
  for i in range(n):
   a=i/n*math.tau;verts.append((p[0]+math.cos(a)*r*sx,p[1]+y,p[2]+math.sin(a)*r*sz))
 for j in range(len(rows)-1):
  for i in range(n):
   k=j*n+i;l=j*n+(i+1)%n;faces.append((k,l,l+n,k+n))
 # Profiles supplied closed (first and last coincide), with welded seam after merge.
 return mesh(name,verts,faces,mat,c)
def ring(name,r,y,mat,c,p=(0,0,0),start=0,extent=math.tau,w=.02,h=None,n=128,sx=1,sz=1):
 points=[(p[0]+math.cos(start+i/n*extent)*r*sx,p[1]+y,p[2]+math.sin(start+i/n*extent)*r*sz) for i in range(n+1)]
 return sweep(name,points,w,h or w,mat,c,n=n,sides=8,closed=extent>=math.tau-.001)
def group(name,c):
 o=bpy.data.objects.new(name,None);c.objects.link(o);return o
worlddeck=group('AUTHOR_WORLD_DECK',deck)
# A single uninterrupted floor under all four chapters. No coplanar cloned slabs.
lathe('Optical floor — continuous shared ring',[(21,-5.32),(65,-5.32),(65,-5.72),(21,-5.72),(21,-5.32)],(0,0,0),floor,deck,n=256)
lathe('Pressure skirt',[(21,-5.77),(65,-5.77),(65,-7.0),(21,-7.0),(21,-5.77)],(0,0,0),dark,deck,n=192)
lathe('Porcelain inner lip',[(20.83,-5.47),(21.20,-5.37),(21.28,-5.64),(20.80,-5.70),(20.83,-5.47)],(0,0,0),pearl,deck,n=192)
ring('Inset inner champagne seal',21.5,-5.30,warm,deck,w=.045)
ring('Outer gallery seal',59,-5.30,titanium,deck,w=.038)
for i in range(4):
 a=i*math.pi/2
 ring('Interrupted optical wayfinding',22.1,-5.285,cyan,deck,start=a+.24,extent=.79,w=.018)
 ring('Warm service interval',22.1,-5.284,amber,deck,start=a+1.2,extent=.19,w=.018)
 ring('Curved nested optical inset',33,-5.298,titanium,deck,start=a+.13,extent=1.20,w=.022)
 # Wide open overhead structure has dark depth, ceramic shoulders, inset optics.
 base=[[-36,-5.1,19],[-37,8.0,15],[-31,17.0,12],[0,21.3,10],[31,17.0,12],[37,8,15],[36,-5.1,19]]
 def turn(p):x,y,z=p;return (math.cos(a)*x+math.sin(a)*z,y,-math.sin(a)*x+math.cos(a)*z)
 # Structural arches sit on the OUTER pressure perimeter, beyond the camera
 # rail. They no longer cross the visitor's path like four inner cages.
 perimeter=[(x*1.55,y+1.1,z*1.55) for x,y,z in base]
 sweep('Window pressure arch',list(map(turn,perimeter)),.29,.23,dark,deck,n=96)
 sweep('Window titanium reveal',list(map(turn,[(x,y-.26,z+.23) for x,y,z in perimeter])),.065,.08,titanium,deck,n=96)
 for j,sub in enumerate([base[:3],base[4:]]):
  sweep('Inset cyan window guide',list(map(turn,[(x*1.55,y+.75,z*1.55+.28) for x,y,z in sub])),.018,.018,cyan,deck,n=36)
 # Discontinuous seams and flush fasteners preserve the calm surface.
 for k in range(3):
  ang=a+.22+k*.43
  sweep('Radial expansion joint',[(math.cos(ang)*r,-5.299,math.sin(ang)*r) for r in [34,44,54,61]],.011,.007,dark,deck,n=16,sides=6)
 for x,z in [(-16,29),(20,31)]:
  px,py,pz=turn((x,-5.34,z))
  lathe('Flush maintenance socket',[(0,-.07),(.62,-.07),(.71,0),(.68,.06),(0,.06),(0,-.07)],(px,py,pz),titanium,deck,n=48)
  ring('Socket optical status',.50,.076,cyan,deck,p=(px,py,pz),w=.015,n=48)
for o in list(deck.objects):
 if o!=worlddeck:o.parent=worlddeck
# Rounded 13x11.2 display housing — matches the DOM projection surface exactly.
frame=group('AUTHOR_DISPLAY_FRAME',display);w,h=13,11.2;r=.60
outline=[]
for cx,cy,a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
 for j in range(13):
  theta=math.radians(a+j/12*90);x=cx+r*math.cos(theta);y=cy+r*math.sin(theta);outline.append((x,y,x*x*.006+y*y*.0005+.02))
sweep('Continuous ceramic glazing gasket',outline,.10,.075,pearl,display,n=160,closed=True)
sweep('Cold titanium inner edge',[(x*.988,y*.987,z+.045) for x,y,z in outline],.032,.032,titanium,display,n=160,closed=True)
for side in [-1,1]:
 sweep('Optical side conductor',[(side*6.40,y,(6.40**2)*.006+y*y*.0005+.09) for y in [-4.3,-2.2,0,2.4,4.2]],.015,.018,cyan,display,n=52)
 for y in [-4.60,4.60]:
  box('Ceramic hardware corner',(side*6.36,y,.29),(.34,.59,.23),pearl,display,.09)
  box('Titanium corner joint',(side*6.36,y,.40),(.18,.20,.05),warm,display,.03)
  box('Inset telemetry light',(side*6.34,y+.19,.43),(.13,.034,.015),cyan,display,.005)
 for y in [-3.7,-3.46,-3.22]:box('Fine recessed telemetry',(side*6.27,y,.38),(.026,.10,.018),amber if y==-3.46 else titanium,display,.002)
sweep('Sculpted reading mount',[[-5.65,-4.9,.19],[-5.88,-6.14,-.14],[-5.15,-6.73,-.49],[-2.20,-6.83,-.62]],.20,.11,pearl,display,n=64)
sweep('Reading mount inner channel',[[-5.7,-4.9,.08],[-5.92,-6.18,-.28],[-5.2,-6.84,-.63],[-2.2,-6.91,-.76]],.09,.09,dark,display,n=64)
for o in list(display.objects):
 if o!=frame:o.parent=frame
# The starport is a bowl with open layered skins, four rising S-shaped berths.
starport=group('AUTHOR_STARPORT',port)
lathe('Deep optical source well',[(3.3,-1.96),(5.0,-1.84),(6.5,-.90),(7.5,-.12),(7.65,.10),(6.82,.17),(5.60,-.50),(4.0,-1.24),(3.3,-1.32),(3.3,-1.96)],(0,0,0),dark,port,sx=1.08,sz=.78)
lathe('Continuous pearl basin rim',[(7.48,.12),(8.10,.47),(8.52,.40),(8.68,.13),(8.24,-.20),(7.48,-.15),(7.48,.12)],(0,0,0),pearl,port,sx=1.08,sz=.78)
for i,(rad,y) in enumerate([(7.82,.14),(6.26,-.78),(4.70,-1.42)]):
 ring('Basin machined seal',rad,y,warm,port,w=.039,sx=1.08,sz=.78)
 ring('Recessed source conductor',rad-.08,y+.025,cyan,port,w=.016,sx=1.08,sz=.78)
for a in [.13,2.36,4.55]:
 ring('Split outer porcelain shoulder',8.45,.17,pearl,port,start=a,extent=1.80,w=1.36,h=.48,sx=1.08,sz=.78)
 ring('Split lower champagne skin',8.67,-.57,titanium,port,start=a+.13,extent=1.5,w=.30,h=.14,sx=1.08,sz=.78)
spines=[
 [[-7,1.1,-2],[-5.2,2.2,-6],[-5.8,3.8,-10.2],[-9,4.9,-10.4],[-10,5.27,-8]],
 [[6,1.1,-2],[7.2,2.2,-4.5],[6.8,3.7,-9],[10.9,5.1,-11.4],[11.5,5.57,-10]],
 [[-10,.9,4.5],[-14,1.2,5.6],[-15.3,2.1,1],[-13,2.72,2.3]],
 [[11,.75,3],[16,1.2,3],[17.7,2.1,-1.2],[15,2.47,.4]]]
poses=[[-10,6.30,-8],[11.5,6.60,-10],[-13,3.75,2.3],[15,3.5,.4]];yaw=[.72,-.45,.86,-.68]
for i,points in enumerate(spines):
 sweep('Berth %d — continuous porcelain loft'%i,points,1.40,.42,pearl,port,n=88,sides=16,taper=True)
 sweep('Berth %d — machined lower spine'%i,[(x,y-.42,z) for x,y,z in points],.50,.19,titanium,port,n=88,taper=True)
 sweep('Berth %d — recessed warm reveal'%i,[(x-.42,y-.28,z) for x,y,z in points],.027,.018,warm,port,n=88,taper=True)
 sweep('Berth %d — optical edge'%i,[(x+.5,y+.10,z) for x,y,z in points],.026,.026,cyan,port,n=88,taper=True)
 p=poses[i];p=[p[0],p[1]-1.03,p[2]]
 lathe('Berth %d docking surface'%i,[(0,-.15),(1.55,-.15),(1.76,-.03),(1.70,.15),(0,.15),(0,-.15)],p,dark,port,n=64,sx=1.1,sz=.67)
 ring('Docking optical seal',1.57,.165,cyan,port,p=p,w=.018,n=64,sx=1.1,sz=.67)
 for j in range(3):box('Docking inset fastener',(p[0]+(j-1)*.55,p[1]+.17,p[2]+.65),(.10,.027,.15),warm,port,.005)
for i in range(18):
 a=.12+i*math.tau/18;p=(math.cos(a)*6.30*1.08,-.71,math.sin(a)*6.3*.78)
 box('Recessed basin service cassette',p,(.17,.12,.40),titanium,port,.025)
 box('Basin warm service indicator',(p[0],p[1]+.076,p[2]),(.028,.02,.24),amber,port,.004)
# Layered optical source is visible through the deep bowl. Multiple actual
# lenses and curved electrodes create refraction and a functional focal point.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=1.18,location=B((0,.66,0)))
o=bpy.context.object;o.name='Reactor — continuous glass pressure lens';move(o,port);o.data.materials.append(glass)
for face in o.data.polygons:face.use_smooth=True
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=.20,location=B((0,.66,0)))
o=bpy.context.object;o.name='Reactor — luminous photonic nucleus';move(o,port);o.data.materials.append(cyan)
for j in range(8):
 points=[]
 for k in range(56):
  t=k/55;theta=t*math.tau*1.25+j*math.tau/8;r=.55+.18*math.sin(t*math.pi)
  points.append((math.cos(theta)*r,.66+(t-.5)*1.62,math.sin(theta)*r))
 sweep('Reactor — internal field electrode',points,.012,.012,cyan if j%2 else violet,port,n=64,sides=6,taper=True)
for j in range(3):ring('Reactor concentric glass gasket',1.15+j*.32,-1.10+j*.18,warm,port,w=.038,n=64)
for o in list(port.objects):
 if o!=starport:o.parent=starport
# Four authored spacecraft; local origins and poses preserve the web picking rig.
ships=[]
for i in range(4):
 ship=group('AUTHOR_SHIP_%d'%i,fleet);before=set(fleet.objects)
 sweep('Ship %d — compound pressure hull'%i,[(0,0,-3.1),(0,.04,-2.4),(0,.12,-.7),(0,.20,1.7),(0,.12,3.05)],.63 if i!=2 else .49,.30,pearl,fleet,n=64,sides=16,taper=True)
 sweep('Ship %d — dorsal armature'%i,[(0,.22,-2.7),(0,.54,-.7),(0,.57,1.1),(0,.23,2.7)],.22,.14,titanium,fleet,n=52,taper=True)
 sweep('Ship %d — observation canopy'%i,[(0,.43,-.3),(0,.60,.2),(0,.59,.8),(0,.33,1.35)],.23,.14,glass,fleet,n=32,taper=True)
 for side in [-1,1]:
  points=[(side*.39,-.07,1.9),(side*1.40,-.13,.9),(side*(1.95 if i==0 else 1.62),-.12,-1.25),(side*.71,-.08,-2.1)]
  sweep('Ship %d — swept wing'%i,points,.29,.085,pearl,fleet,n=40,taper=True)
  sweep('Ship %d — wing reveal'%i,[(x,y+.07,z) for x,y,z in points],.019,.020,cyan,fleet,n=40,taper=True)
  sweep('Ship %d — engine pressure pod'%i,[(side*.78,-.13,-1.4),(side*.91,-.17,-2.15),(side*.82,-.18,-3.0)],.23,.21,titanium,fleet,n=32,taper=False)
  # Engine nozzles are actual layered radial sections, facing aft browser -Z.
  for j in range(3):
   o=ring('Ship ion engine ring',.19+j*.013,0,cyan if j==2 else dark,fleet,n=32,w=.028)
   o.rotation_euler.x=math.pi/2;o.location=B((side*.82,-.18,-3.03-j*.045))
  for j in range(5):box('Ship recessed heat exchanger',(side*.49,.33,-1.50+j*.12),(.20,.046,.035),dark,fleet,.006)
  if i in [0,3]:
   contour=[(side*.38,.08,1.95),(side*2.24,-.07,-.95),(side*1.36,-.11,-1.64),(side*.46,-.07,-.84)]
   verts=[(x,y+dy,z) for dy in [-.055,.055] for x,y,z in contour]
   faces=[(3,2,1,0),(4,5,6,7)]+[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)]
   wing=mesh('Ship — machined sweep wing',verts,faces,titanium if i==3 else pearl,fleet)
   for face in wing.data.polygons:face.use_smooth=False
   modifier=wing.modifiers.new('Fine wing edge radius','BEVEL');modifier.width=.03;modifier.segments=3
   sweep('Ship — wing optical blade',[(x,y+.066,z) for x,y,z in contour[:3]],.017,.013,cyan,fleet,n=40,sides=6)
  # Fine layering distinguishes the outer skin from the recessed service bay.
  for j in range(6):box('Ship — segmented radiator',(side*.68,-.03,-.71+j*.17),(.10,.16,.042),titanium,fleet,.01)
 if i==1:
  for start in [0,math.pi]:
   o=ring('Ship optical drive collar',1.48,0,warm,fleet,start=start,extent=math.pi*.92,w=.049,n=64);o.rotation_euler.x=math.pi/2;o.location=B((0,.2,-.5))
 if i==2:
  for side in [-1,1]:
   sweep('Narrative ship photonic sail',[(side*.3,.25,-1.4),(side*.75,1.6,-1.1),(side*1.5,2.5,-1.25),(side*1.85,.6,-.3)],.22,.045,glass,fleet,n=48,taper=True)
 if i==3:
  for side in [-1,1]:box('Research vessel modular bay',(side*.67,.0,.15),(.48,.54,1.40),dark,fleet,.10)
 for o in list(fleet.objects):
  if o not in before and o!=ship:o.parent=ship
 ships.append(ship)
# Merge each asset by material for bounded browser draw calls, retain full
# editable original objects in .blend. Exports use copies in a hidden collection.
exports=collection('09. Optimized website copies — generated');exports.hide_render=True
def export_asset(name,objects,semantic):
 bpy.ops.object.select_all(action='DESELECT');copies=[]
 for source in objects:
  if source.type!='MESH':continue
  o=source.copy();o.data=source.data.copy();exports.objects.link(o);o.parent=None;o.matrix_world=source.matrix_world.copy()
  o.hide_render=False;o.hide_viewport=False;copies.append(o)
 groups={}
 for o in copies:groups.setdefault(o.active_material.name,[]).append(o)
 merged=[]
 for mat,items in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0]
  for o in items:
   bpy.context.view_layer.objects.active=o
   for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=bpy.context.object;o.name=semantic+'_'+mat
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bmesh.ops.triangulate(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();merged.append(o)
 bakes=bake_finish(merged,semantic)
 parent=group(semantic,exports)
 for o in merged:o.parent=parent
 bpy.ops.object.select_all(action='DESELECT');parent.select_set(True)
 for o in merged:o.select_set(True)
 bpy.context.view_layer.objects.active=merged[0]
 bpy.ops.export_scene.gltf(filepath=str(MODELS/name),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_tangents=True,export_extras=True)
 tri=sum(len(o.data.polygons) for o in merged)
 for o in merged:o.hide_render=True;o.hide_set(True)
 parent.hide_set(True)
 return {'file':name,'triangles':tri,'drawGroups':len(merged),'bytes':(MODELS/name).stat().st_size,'bakes':bakes}
import io_scene_gltf2.blender.exp.material.encode_image as encoder
encoded=0
def flat_encode(image,file_format,settings):
 global encoded;encoded+=1;p=OUT/('export-texture-%03d.%s'%(encoded,{'PNG':'png','JPEG':'jpg','WEBP':'webp'}[file_format]))
 image.filepath_raw=str(p);image.file_format=file_format;image.save();return p.read_bytes()
encoder._encode_temp_image=flat_encode
report=[export_asset('tem-cinematic-deck.glb',list(deck.objects),'WORLD_DECK'),export_asset('tem-cinematic-display.glb',list(display.objects),'DISPLAY_FRAME'),export_asset('tem-cinematic-starport.glb',list(port.objects),'STARPORT')]
# Separate semantic roots for independent hover-driven ship animation.
fleet_copies=[]
for i,ship in enumerate(ships):
 bpy.ops.object.select_all(action='DESELECT');copyroot=group('SHIP_%d'%i,exports)
 for source in ship.children:
  o=source.copy();o.data=source.data.copy();exports.objects.link(o);o.parent=copyroot;o.matrix_world=source.matrix_world.copy();o.select_set(True);fleet_copies.append(o)
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 copyroot.select_set(True)
 # Bound the imported fleet to six material families per independently moving ship.
 groups={}
 for o in list(copyroot.children):groups.setdefault(o.active_material.name,[]).append(o)
 for material_name,items in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join()
  o=bpy.context.object;o.name='SHIP_%d_%s'%(i,material_name)
fleet_copies=[o for o in exports.objects if o.type=='MESH' and o.parent and o.parent.name.startswith('SHIP_')]
fleet_roots=[o for o in exports.objects if o.type=='EMPTY' and o.name.startswith('SHIP_')]
# Isolate local-coordinate ship assemblies for AO, then restore their roots.
for i,o in enumerate(fleet_roots):o.location=B((i*45,0,0))
bpy.context.view_layer.update();fleet_bakes=bake_finish(fleet_copies,'FLEET')
for o in fleet_roots:o.location=(0,0,0)
bpy.context.view_layer.update()
# Export all four local-coordinate copies once, retaining node grouping.
bpy.ops.object.select_all(action='DESELECT')
for o in fleet_copies:o.select_set(True);o.parent.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'tem-cinematic-fleet.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_extras=True)
for o in fleet_copies:o.data.calc_loop_triangles()
report.append({'file':'tem-cinematic-fleet.glb','triangles':sum(len(o.data.loop_triangles) for o in fleet_copies),'bytes':(MODELS/'tem-cinematic-fleet.glb').stat().st_size,'shipRoots':4,'bakes':fleet_bakes})
for o in fleet_copies:o.hide_set(True);o.hide_render=True
# Full editable scene staging uses the original model components.
frame.location=B((-8.3,1.45,25));frame.rotation_euler.z=.08
pane=box('Curved optical content surface',(-8.3,1.45,25),(12.70,10.95,.055),glass,profile,.10)
pane.rotation_euler.z=.08
def text(name,body,p,size,mat,c):
 data=bpy.data.curves.new(name,'FONT');data.body=body;data.size=size;data.extrude=.001;data.space_character=1.18
 o=bpy.data.objects.new(name,data);c.objects.link(o);o.location=B(p);o.rotation_euler=(math.pi/2,0,0);data.materials.append(mat);return o
text('Editable identity title','TEM',(-12.6,4.6,25.31),2.0,white,profile)
text('Editable creator subtitle','WANG QIANHUI',(-12.6,3.6,25.31),.28,white,profile)
text('Editable profile statement','Understand the past.\nLive the present.\nImagine the future.',(-12.6,1.45,25.31),.40,white,profile)
text('Editable navigation','EXPLORE MY UNIVERSE  /',(-12.6,-2.70,25.31),.31,cyan,profile)
if (MODELS/'tem-identity.glb').exists():
 old=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(MODELS/'tem-identity.glb'))
 imported=[o for o in scene.objects if o not in old];holder=group('TEM optical identity assembly',profile);holder.location=B((9.2,5.8,10));holder.scale=(2.85,2.85,2.85);holder.rotation_euler.z=.43
 for o in imported:
  move(o,profile)
  if o.parent not in imported:o.parent=holder
  if o.type=='MESH' and 'GLASS' in o.name.upper():
   medium=bpy.data.materials.new('Identity — live luminous inner medium');medium.use_nodes=True;nt=medium.node_tree;nt.nodes.clear()
   out=nt.nodes.new('ShaderNodeOutputMaterial');v=nt.nodes.new('ShaderNodeVolumePrincipled');v.inputs['Color'].default_value=(.17,.34,.68,1);v.inputs['Emission Color'].default_value=(.17,.40,.91,1)
   noise=nt.nodes.new('ShaderNodeTexNoise');noise.noise_dimensions='3D';noise.inputs['Scale'].default_value=5.;noise.inputs['Detail'].default_value=5.
   density=nt.nodes.new('ShaderNodeMath');density.operation='MULTIPLY';density.inputs[1].default_value=.055;nt.links.new(noise.outputs['Fac'],density.inputs[0]);nt.links.new(density.outputs[0],v.inputs['Density'])
   emission=nt.nodes.new('ShaderNodeMath');emission.operation='MULTIPLY';emission.inputs[1].default_value=.48;nt.links.new(noise.outputs['Fac'],emission.inputs[0]);nt.links.new(emission.outputs[0],v.inputs['Emission Strength']);nt.links.new(v.outputs['Volume'],out.inputs['Volume'])
   inner=o.copy();inner.data=o.data.copy();inner.data.materials.clear();inner.data.materials.append(medium);profile.objects.link(inner);inner.name='Identity — conforming volumetric energy';inner.scale*=.945
 # The medium is actual editable emissive geometry inside the transparent T.
 for j in range(7):
  points=[]
  for k in range(80):
   t=k/79;points.append((math.sin(t*math.tau*1.6+j)*.28,(t-.5)*5.10,math.cos(t*math.tau*1.3+j)*.21))
  o=sweep('Identity internal light filament',points,.013,.012,cyan if j%2 else violet,profile,n=96,sides=6);o.parent=holder
for j in range(4):
 points=[]
 for k in range(120):
  a=k/119*math.tau*1.6;points.append((9.2+math.cos(a)*(7+j*.38),5.8+math.sin(a*.62)*2.5+(k/119-.5)*3,10+math.sin(a)*4.8))
 sweep('Editable orbiting photonic ribbon',points,.017+j*.006,.012,cyan if j%2 else violet,profile,n=144,sides=6,taper=True)
# Planet textures packed in the engineering file; attribution kept in project.
def sphere(name,p,r,mat,c,segments=96):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=segments//2,radius=r,location=B(p));o=bpy.context.object;o.name=name;move(o,c);o.data.materials.append(mat)
 for face in o.data.polygons:face.use_smooth=True
 return o
planetmat=material('Planet — textured continents',(.16,.25,.38),0,.46)
earth=bpy.data.images.load(str(ROOT/'assets/images/planet/earth-daymap.jpg'));earth.pack();node=planetmat.node_tree.nodes.new('ShaderNodeTexImage');node.image=earth;planetmat.node_tree.links.new(node.outputs['Color'],planetmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
planet_center=(230,-405,-520)
sphere('Planetary horizon',planet_center,335,planetmat,env,128)
cloudmat=material('Planet — textured volumetric cloud shell',(.85,.9,1.),0,.64)
cloudimg=bpy.data.images.load(str(ROOT/'assets/images/planet/earth-clouds.jpg'));cloudimg.pack();node=cloudmat.node_tree.nodes.new('ShaderNodeTexImage');node.image=cloudimg
cloudmat.node_tree.links.new(node.outputs['Color'],cloudmat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'])
sphere('Planetary cloud layer',planet_center,336.4,cloudmat,env,128)
atmos=bpy.data.materials.new('Planet atmosphere — real scattering');atmos.use_nodes=True;nt=atmos.node_tree;nt.nodes.clear();output=nt.nodes.new('ShaderNodeOutputMaterial');vol=nt.nodes.new('ShaderNodeVolumeScatter');vol.inputs['Color'].default_value=(.12,.40,.83,1);vol.inputs['Density'].default_value=.0008;vol.inputs['Anisotropy'].default_value=.25;nt.links.new(vol.outputs['Volume'],output.inputs['Volume'])
sphere('Planetary atmosphere',planet_center,342,atmos,env,96)
world=bpy.data.worlds.new('Tem — distant galactic radiance');world.use_nodes=True
wn=world.node_tree.nodes;wl=world.node_tree.links;background=wn.get('Background');background.inputs['Strength'].default_value=.65
skyfile=ROOT/'assets/images/optical/tem-galactic-panorama.png'
if skyfile.exists():
 image=bpy.data.images.load(str(skyfile));image.pack();tex=wn.new('ShaderNodeTexEnvironment');tex.image=image
 # Use the same angular detail scale as the live panoramic sky. Rotating the
 # 2K panorama alone made the galaxy read as enlarged blurry stars in Cycles.
 coord=wn.new('ShaderNodeTexCoord');normalize=wn.new('ShaderNodeVectorMath');normalize.operation='NORMALIZE'
 wl.new(coord.outputs['Generated'],normalize.inputs[0]);separate=wn.new('ShaderNodeSeparateXYZ');wl.new(normalize.outputs['Vector'],separate.inputs[0])
 def sky_math(op,*values):
  n=wn.new('ShaderNodeMath');n.operation=op
  for i,value in enumerate(values):
   if isinstance(value,(int,float)):n.inputs[i].default_value=value
   else:wl.new(value,n.inputs[i])
  return n.outputs[0]
 azimuth=sky_math('MULTIPLY',sky_math('ARCTAN2',separate.outputs['Y'],separate.outputs['X']),3.)
 latitude=sky_math('MULTIPLY_ADD',sky_math('ARCSINE',separate.outputs['Z']),2.8,.18)
 latitude=sky_math('MINIMUM',sky_math('MAXIMUM',latitude,-1.46),1.46)
 vector=wn.new('ShaderNodeCombineXYZ')
 wl.new(sky_math('MULTIPLY',sky_math('COSINE',azimuth),sky_math('COSINE',latitude)),vector.inputs['X'])
 wl.new(sky_math('MULTIPLY',sky_math('SINE',azimuth),sky_math('COSINE',latitude)),vector.inputs['Y'])
 wl.new(sky_math('SINE',latitude),vector.inputs['Z']);wl.new(vector.outputs['Vector'],tex.inputs['Vector']);wl.new(tex.outputs['Color'],background.inputs['Color'])
else:background.inputs['Color'].default_value=(.005,.012,.028,1)
scene.world=world
# Sparse actual star meshes. Nebula volumes are editable noise-density nodes.
verts=[];faces=[];random.seed(417)
for i in range(2600):
 a=random.random()*math.tau;y=(random.random()*2-1)*.75;rad=900+random.random()*800;p=Vector((math.cos(a)*rad,y*rad,math.sin(a)*rad));size=.08+random.random()**9*1.10
 k=len(verts);verts.extend([p+Vector((size,0,0)),p+Vector((-size,0,0)),p+Vector((0,size,0)),p+Vector((0,-size,0)),p+Vector((0,0,size)),p+Vector((0,0,-size))]);faces.extend([(k,k+2,k+4),(k+2,k+1,k+4),(k+1,k+3,k+4),(k+3,k,k+4),(k+2,k,k+5),(k+1,k+2,k+5),(k+3,k+1,k+5),(k,k+3,k+5)])
mesh('2600 real three-dimensional stars',verts,faces,white,env)
for j,(p,size) in enumerate([((-165,150,-360),(140,65,130)),((150,115,-400),(170,95,170))]):
 mat=bpy.data.materials.new('Nebula %d — editable 3D density'%j);mat.use_nodes=True;nt=mat.node_tree;nt.nodes.clear();out=nt.nodes.new('ShaderNodeOutputMaterial');v=nt.nodes.new('ShaderNodeVolumePrincipled');v.inputs['Color'].default_value=(.19,.26,.51,1) if j==0 else (.18,.35,.57,1)
 v.inputs['Emission Color'].default_value=(.40,.13,.53,1) if j==0 else (.08,.38,.70,1);v.inputs['Emission Strength'].default_value=.025
 tex=nt.nodes.new('ShaderNodeTexNoise');tex.noise_dimensions='3D';tex.inputs['Scale'].default_value=4.2;tex.inputs['Detail'].default_value=5
 ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.42;ramp.color_ramp.elements[0].color=(0,0,0,1);ramp.color_ramp.elements[1].position=.76;ramp.color_ramp.elements[1].color=(.008,.008,.008,1)
 coords=nt.nodes.new('ShaderNodeTexCoord');center=nt.nodes.new('ShaderNodeVectorMath');center.operation='SUBTRACT';center.inputs[1].default_value=(.5,.5,.5);nt.links.new(coords.outputs['Generated'],center.inputs[0])
 radial=nt.nodes.new('ShaderNodeVectorMath');radial.operation='LENGTH';nt.links.new(center.outputs['Vector'],radial.inputs[0])
 envelope=nt.nodes.new('ShaderNodeMapRange');envelope.interpolation_type='SMOOTHSTEP';envelope.inputs['From Min'].default_value=.20;envelope.inputs['From Max'].default_value=.57;envelope.inputs['To Min'].default_value=1.;envelope.inputs['To Max'].default_value=0.;nt.links.new(radial.outputs['Value'],envelope.inputs['Value'])
 density=nt.nodes.new('ShaderNodeMath');density.operation='MULTIPLY';nt.links.new(ramp.outputs['Color'],density.inputs[0]);nt.links.new(envelope.outputs['Result'],density.inputs[1]);nt.links.new(density.outputs[0],v.inputs['Density'])
 emission=nt.nodes.new('ShaderNodeMath');emission.operation='MULTIPLY';emission.inputs[1].default_value=2.;nt.links.new(density.outputs[0],emission.inputs[0]);nt.links.new(emission.outputs[0],v.inputs['Emission Strength'])
 nt.links.new(tex.outputs['Fac'],ramp.inputs['Fac']);nt.links.new(v.outputs['Volume'],out.inputs['Volume']);box('Nebula density volume',p,size,mat,env,0)
def look(o,p):o.rotation_euler=(B(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,p,energy,color,size,target):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);rig.objects.link(o);o.location=B(p);look(o,target);return o
key_direction=Vector((-.58,.66,.47)).normalized();rim_direction=Vector((.72,.14,-.68)).normalized()
area('Warm physical key — same direction as website',tuple(key_direction*56+Vector((0,0,10))),8500,(1.,.74,.48),9,(0,0,10))
area('Cool optical rim — same direction as website',tuple(rim_direction*46+Vector((0,0,10))),6200,(.22,.58,.79),7,(0,0,10))
area('Soft glass face',(0,11,36),1200,(.51,.68,.82),12,(0,1,22))
area('Violet universe edge',(25,18,-13),2200,(.41,.23,.64),9,(9,5,10))
area('Reactor bounce',(6,-3,-8),180,(.16,.58,1.),3,(6,0,-8))
sun=bpy.data.lights.new('Distant physical sunlight','SUN');sun.energy=1.25;sun.color=(1.,.74,.48);sun.angle=.055
o=bpy.data.objects.new('Distant physical sunlight',sun);rig.objects.link(o);o.location=B(tuple(key_direction*120));look(o,(0,0,0))
def camera(name,p,target,lens=32):
 data=bpy.data.cameras.new(name);data.lens=lens;data.clip_end=6000;o=bpy.data.objects.new(name,data);rig.objects.link(o);o.location=B(p);look(o,target);return o
profilecam=camera('CAMERA_profile',(0,2.7,47),(0,2.0,22),24);scene.camera=profilecam
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8;scene.cycles.volume_bounces=2
scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
def compositor(s):
 nt=bpy.data.node_groups.new(s.name+' — Optical finish','CompositorNodeTree');s.compositing_node_group=nt
 nt.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
 layers=nt.nodes.new('CompositorNodeRLayers');layers.scene=s
 glare=nt.nodes.new('CompositorNodeGlare')
 if hasattr(glare,'glare_type'):glare.glare_type='FOG_GLOW'
 if hasattr(glare,'quality'):glare.quality='HIGH'
 if 'Type' in glare.inputs:glare.inputs['Type'].default_value='Fog Glow'
 if 'Threshold' in glare.inputs:glare.inputs['Threshold'].default_value=1.6
 if 'Strength' in glare.inputs:glare.inputs['Strength'].default_value=.12
 output=nt.nodes.new('NodeGroupOutput');nt.links.new(layers.outputs['Image'],glare.inputs['Image']);nt.links.new(glare.outputs['Image'],output.inputs['Image'])
compositor(scene)
# Atlas scene shares real environment and deck assets; staging is independent.
atlas=bpy.data.scenes.new('02 — TEM / Creation Atlas');atlas.world=world
for c in [deck,port,fleet,env,rig]:atlas.collection.children.link(c)
# Starport original authoring objects sit at the web atlas instrument coordinates.
starport.location=B((6,-5.7,-8));starport.scale=(1.25,1.25,1.25)
for i,ship in enumerate(ships):
 ship.location=B((poses[i][0]*1.25+6,poses[i][1]*1.25-5.7,poses[i][2]*1.25-8));ship.rotation_euler.z=-yaw[i];ship.scale=((1.25 if i==2 else 1.34 if i==3 else 1.55)*1.25,)*3
atlascam=camera('CAMERA_atlas',(-1,5.2,36),(6,-1.2,-8),34);atlas.camera=atlascam
for prop in ['resolution_x','resolution_y','resolution_percentage'] :setattr(atlas.render,prop,getattr(scene.render,prop))
atlas.render.engine='CYCLES';atlas.cycles.samples=64;atlas.cycles.use_denoising=True;atlas.cycles.max_bounces=10;atlas.cycles.transmission_bounces=8;atlas.cycles.volume_bounces=2;atlas.view_settings.view_transform='AgX';compositor(atlas)
# Port/fleet exist only in atlas; profile excludes both via its view layer.
for c in [port,fleet,exports]:scene.view_layers[0].layer_collection.children[c.name].exclude=True
for src in [ROOT/'blender/references-v18/identity-target.png',ROOT/'blender/references-v18/starport-target.png']:
 if src.exists():
  image=bpy.data.images.load(str(src));image.pack();o=bpy.data.objects.new('REFERENCE — '+src.stem,None);o.empty_display_type='IMAGE';o.data=image;refs.objects.link(o);o.hide_render=True;o.hide_set(True)
textdata=bpy.data.texts.new('START HERE — Scene engineering notes');textdata.write('TEM CINEMATIC v18\nTwo scenes: Observatory / Creation Atlas.\nOriginal editable curves, bevels, packed material textures, lights, cameras, real planet/cloud shells and procedural nebula volumes.\nCollection 09 holds generated optimized website copies with actual Cycles shader bevel normal, absolute roughness and geometry AO UV bakes. This is not a high-to-low sculpt projection.\nAuthoring browser Y-up converted by B(x,y,z)=(x,-z,y).\nWebsite assets use local coordinates without auto-centering.\nWarm key direction [-.58,.66,.47], cool rim [.72,.14,-.68], shared with live website.\nMCP service: scripts/blender-mcp/server.mjs.\nPlanet attribution: assets/images/planet/ATTRIBUTION.md.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tem-cinematic.blend'))
manifest={'generator':'Blender '+bpy.app.version_string,'transport':'Project-local MCP stdio','scenes':[scene.name,atlas.name],'coordinateSpace':'Three.js Y-up; archive world origin z=-27; starport local instrument coordinates','assets':report,'blend':str(OUT/'tem-cinematic.blend'),'concepts':['identity-target.png','starport-target.png'],'floor':'one WORLD_DECK shared by all chapters; no overlapping copies','baking':'Cycles shader bevel normal + absolute roughness + real geometry AO; 1024 UV atlas per asset','lighting':{'key':list(key_direction),'rim':list(rim_direction),'mainShadow':'physical Cycles sunlight'}}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');print('TEM_CINEMATIC_BUILD_COMPLETE '+json.dumps(manifest,ensure_ascii=False),flush=True)
