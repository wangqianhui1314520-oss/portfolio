"""Refine accepted observatory geometry, retaining the complete v20 project.

Fixed MCP build. Editable scene 05 is new; earlier scenes and exported assets
remain intact. The export is an absolute-coordinate four-root observatory,
with a single reflective floor and no copied external world or nebula proxy.
"""
import bpy, bmesh, ast, math, json, random
from mathutils import Vector
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blender/cinematic-v21';OUT.mkdir(parents=True,exist_ok=True)
MODELS=ROOT/'assets/models'
scene=bpy.data.scenes.new('05 — TEM / Refined Optical Observatory')
bpy.context.window.scene=scene
# Reuse only reviewed primitive function definitions, never the v20 builder's
# scene setup or export statements. This keeps old .blend scenes untouched.
tree=ast.parse((ROOT/'scripts/build-tem-star-sea-v20.py').read_text(encoding='utf8'))
names={'B','collection','mat','mesh','box','tube','ring','sphere'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'v21-reviewed-primitives','exec'))
cabin=collection('V21.01 — Sculpted viewing terrace and pressure canopy')
identity=collection('V21.02 — Solid optical crystal identity')
screen=collection('V21.03 — Fine laminated curved reading glass')
exterior=collection('V21.04 — Reserved compatibility exterior root')
rig=collection('V21.05 — Controlled cinematic illumination')
staging=collection('V21.06 — Editable typography')
volume_collection=collection('V21.07 — Private sparse stellar gas volumes')
exports=collection('V21.09 — Private merged web exports')

def group(name,c):
    o=bpy.data.objects.new(name,None);c.objects.link(o);return o
def parent(o,p):
    o.parent=p;return o
def catmull(points,n=100):
    ps=[Vector(p) for p in points];result=[]
    for i in range(n):
        t=i/(n-1)*(len(ps)-1);k=min(len(ps)-2,int(t));q=t-k
        a,b,c,d=ps[max(0,k-1)],ps[k],ps[k+1],ps[min(len(ps)-1,k+2)]
        result.append(tuple((2*b+(c-a)*q+(2*a-5*b+4*c-d)*q*q+(-a+3*b-3*c+d)*q*q*q)*.5))
    return result
def smooth_mesh(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
    for p in o.data.polygons:p.use_smooth=True
def soften(o,width=.10,segments=4):
    mod=o.modifiers.new('Optical manufacturing radius — editable','BEVEL');mod.width=width;mod.segments=segments;mod.limit_method='ANGLE';mod.angle_limit=math.radians(28)
    mod=o.modifiers.new('Area-weighted machining normals','WEIGHTED_NORMAL');mod.keep_sharp=True
    return o
def optical_shelf(name,points,width,height,material,c):
    ps=[Vector(p) for p in points];v=[];f=[];sides=12
    for j,p in enumerate(ps):
        tangent=(ps[min(len(ps)-1,j+1)]-ps[max(0,j-1)]).normalized()
        u=tangent.cross(Vector((0,1,0))).normalized();up=tangent.cross(u).normalized()
        for k in range(sides):
            a=k/sides*math.tau;q=p+u*(width*math.cos(a))+up*(height*math.sin(a));v.append(tuple(q))
    for j in range(len(ps)-1):
        for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;f.append((a,b,b+sides,a+sides))
    f.extend([tuple(reversed(range(sides))),tuple(range((len(ps)-1)*sides,len(ps)*sides))])
    o=mesh(name,v,f,material,c);smooth_mesh(o);return o
def physical(name,color,metal,rough,coat,transmission=0,ior=1.47,emission=0):
    m=mat(name,color,metal,rough,coat,emission);p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Transmission Weight'].default_value=transmission;p.inputs['IOR'].default_value=ior
    p.inputs['Coat Roughness'].default_value=.24 if not transmission else .13
    p.inputs['Specular IOR Level'].default_value=.30
    return m

pearl=physical('V21_PEARL_CERAMIC — translucent enamel',(.49,.57,.66),.14,.265,.34)
dark=physical('V21_DARK_PRESSURE — shadow ceramic',(.015,.029,.047),.22,.37,.13)
titanium=physical('V21_TITANIUM — cool precision alloy',(.072,.10,.13),.64,.33,.14)
warm=physical('V21_CHAMPAGNE — fine contact plating',(.25,.18,.11),.76,.29,.18)
floor=physical('FLOOR_V19 — V21 polished optical basalt',(.014,.025,.043),.30,.31,.17)
floor.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.23
cyan=physical('V21_EMISSION_CYAN — recessed photonic guide',(.09,.41,.68),.08,.31,.10,emission=1.30)
violet=physical('V21_EMISSION_VIOLET — internal photonic guide',(.31,.18,.61),.05,.34,.12,emission=1.15)
amber=physical('V21_EMISSION_AMBER — quiet inhabited light',(.9,.48,.21),.05,.36,.09,emission=.85)
white=physical('V21_EDITABLE_TEXT — lunar white',(.73,.83,.93),0,.72,0,emission=.15)
glass=physical('GLASS_V19 — V21 thick optical crystal',(.72,.88,.99),.008,.052,.20,.91,1.472)
inner=physical('GLASS_V19 — V21 internal dichroic lamina',(.81,.89,.99),.005,.085,.06,.995,1.438)
displayglass=physical('GLASS_V19 — V21 pressure display front',(.60,.77,.90),.004,.050,.13,.96,1.455)
displayinner=physical('GLASS_V19 — V21 internal display lamina',(.81,.90,.98),0,.085,.04,.995,1.439)
platformglass=physical('GLASS_V19 — V21 platform optical lens',(.10,.25,.39),.018,.075,.22,.86,1.463)
for material in [glass,displayglass,platformglass]:
    n,l=material.node_tree.nodes,material.node_tree.links
    absorb=n.new('ShaderNodeVolumeAbsorption');absorb.inputs['Color'].default_value=(.39,.66,.88,1);absorb.inputs['Density'].default_value=.035 if material==glass else .012
    l.new(absorb.outputs['Volume'],next(n for n in n if n.type=='OUTPUT_MATERIAL').inputs['Volume'])

# One continuous reflective surface. The outer contour has broad shoulders
# and a starboard cantilever, with vertical optical strata and actual support.
croot=group('AUTHOR_V21_CABIN',cabin)
def edge(x):return -29+abs(x/47)**2*18-4.8*math.exp(-((x-11)/15)**2)
nx,nz=64,42;verts=[];faces=[]
for y in [-5.32,-6.14]:
    for j in range(nz+1):
        for i in range(nx+1):
            x=-47+i/nx*94;z=edge(x)+(49-edge(x))*j/nz;verts.append((x,y,z))
stride=(nx+1)*(nz+1)
for j in range(nz):
    for i in range(nx):
        a=j*(nx+1)+i;faces.append((a,a+nx+1,a+nx+2,a+1));faces.append((a+stride,a+1+stride,a+nx+2+stride,a+nx+1+stride))
for i in range(nx):
    for a in [i,nz*(nx+1)+i]:faces.append((a,a+1,a+1+stride,a+stride))
for j in range(nz):
    for a in [j*(nx+1),j*(nx+1)+nx]:faces.append((a,a+stride,a+nx+1+stride,a+nx+1))
o=mesh('FLOOR_V19 — V21 continuous reflective pressure deck',verts,faces,floor,cabin,False);smooth_mesh(o);parent(o,croot)
o['tem_reflection_plane_y']=-5.32;o['tem_single_continuous_floor']=True
outline=[(-47+i/120*94,-5.30,edge(-47+i/120*94)) for i in range(121)]
for name,dy,dz,r,m in [('Sculpted ceramic front shoulder',-.38,-.16,.31,pearl),
                       ('Recessed pressure throat',-.43,.08,.16,dark),
                       ('Fine titanium optical reveal',-.08,.10,.042,titanium),
                       ('Thin champagne contact seam',.015,.055,.023,warm),
                       ('Inset cyan deck guide',.035,-.035,.014,cyan)]:
    parent(tube(name,[(x,y+dy,z+dz) for x,y,z in outline],r,m,cabin,10),croot)

# Asymmetrical bifurcating ceramic benches and cantilevered viewing islands.
# Their curves frame the world instead of occupying the screen's text plane.
branches=[[(25,-4.76,9),(21,-4.48,1),(18.5,-4.53,-10),(21,-4.72,-23),(13,-4.96,-29)],
          [(-29,-4.96,10),(-31,-4.77,-2),(-29,-4.68,-14),(-22,-4.91,-25),(-15,-5.12,-28)]]
for k,points in enumerate(branches):
    path=catmull(points,112)
    parent(optical_shelf('Thin wide cantilevered pearl optical crest %d'%k,path,1.12,.14,pearl,cabin),croot)
    parent(optical_shelf('Sculpted dark pressure underside %d'%k,[(x,y-.26,z) for x,y,z in path],1.05,.17,dark,cabin),croot)
    for name,dy,dz,width,m in [('Machined contact layer',-.17,.69,.024,warm),('Recessed flowing guide',.025,-.83,.012,cyan)]:
        parent(tube(name+' %d'%k,[(x,y+dy,z+dz) for x,y,z in path],width,m,cabin,8),croot)
    for j in range(6):
        p=path[12+j*15]
        brace=catmull([(p[0],p[1]-.55,p[2]),(p[0]*.96,-6.46,p[2]+.2),(p[0]*.88,-7.3,p[2]+.4)],22)
        parent(tube('Tapered load path under cantilever',brace,.15,titanium,cabin,8),croot)
        parent(box('Flush ceramic maintenance seam',(p[0],p[1]+.12,p[2]),(.052,.018,.69),titanium,cabin,.01),croot)

# The levitation plinth has real pressure depth and an opening optical dish.
plinth=(9.6,-5.07,-17.4)
for name,y,r,w,m in [('Pearl island pressure rim',-4.96,7.4,.26,pearl),
                    ('Recessed support torus',-5.56,7.22,.22,titanium),
                    ('Warm interior contact rim',-5.05,6.62,.034,warm),
                    ('Fine cyan inner lens seal',-4.93,6.72,.022,cyan)]:
    parent(ring(name,(plinth[0],y,plinth[2]),r,w,m,cabin,112),croot)
for j in range(12):
    a=j/12*math.tau
    parent(tube('Optical island underside radial rib',[(plinth[0]+math.cos(a)*6.4,-5.88,plinth[2]+math.sin(a)*6.4),
          (plinth[0]+math.cos(a)*7.24,-5.26,plinth[2]+math.sin(a)*7.24)],.075,dark,cabin,6),croot)
# A closed shallow convex disk gives the plinth a transparent optical surface.
nv=112;vs=[(plinth[0],-4.98,plinth[2]),(plinth[0],-5.17,plinth[2])];fs=[]
for y in [-5.01,-5.17]:
    for j in range(nv):a=j/nv*math.tau;vs.append((plinth[0]+math.cos(a)*6.50,y,plinth[2]+math.sin(a)*6.50))
for j in range(nv):
    k=(j+1)%nv;fs.extend([(0,2+j,2+k),(1,2+nv+k,2+nv+j),(2+j,2+nv+j,2+nv+k,2+k)])
o=mesh('V21 crystal levitation lens — closed solid',vs,fs,platformglass,cabin);smooth_mesh(o);parent(o,croot)

# The pressure canopy follows the view margin, with small ceramic panels,
# split structural strata, recessed optics and real manufacturing joints.
arch=catmull([(-33,-6,-11),(-34,5,-17),(-31,15,-22),(-21,22,-27),(0,24,-30),(21,22,-27),(31,15,-22),(34,5,-17),(33,-6,-11)],172)
for name,dy,dz,r,m in [('Dark continuous window pressure arch',0,0,.50,dark),
                       ('Pearl ceramic outer skin',.28,-.27,.20,pearl),
                       ('Machined inner pressure channel',-.36,.15,.046,titanium),
                       ('Warm optical contact line',-.41,.19,.019,warm),
                       ('Azure inset optical seal',-.25,.24,.012,cyan)]:
    parent(tube(name,[(x,y+dy,z+dz) for x,y,z in arch],r,m,cabin,12),croot)
for j in range(16):
    x,y,z=arch[6+j*10]
    parent(soften(box('Small ceramic pressure-arch joint',(x,y,z),(.19,.26,.36),pearl,cabin),.045,3),croot)
    parent(box('Recessed pressure telemetry slit',(x,y+.07,z+.22),(.026,.075,.015),amber,cabin),croot)
for r in [22.5,32.8,44.7]:
    p=[(math.sin(a)*r,-5.312,17-math.cos(a)*r*.55) for a in [(-1.12+i/104*2.24) for i in range(105)]]
    parent(tube('Flush deck precision inlay',p,.012,warm if r==22.5 else titanium,cabin,5),croot)

# A closed, filled crystal T. Its connected cells share faces across the
# crossbar/stem junction, with true bulk and rounded optical manufacturing.
troot=group('AUTHOR_V21_IDENTITY',identity);troot.location=B((9.6,6.5,-17));troot.rotation_euler.z=-.28
for key,value in {'identityCenter':[9.6,6.5,-17],'identityYaw':-.28,'identityWidth':14.2,'identityHeight':15.3,'tem_crystal_bulk':2.36,'tem_optical_version':21}.items():troot[key]=value
def t_body(name,material,depth=1.18,scale=1):
    xs=sorted(set([-7.1,-2.1,2.1,7.1]+[-7.1+i/34*14.2 for i in range(35)]))
    ys=sorted(set([-7.65,4.65,7.65]+[-7.65+i/38*15.3 for i in range(39)]))
    cells={(i,j) for j in range(len(ys)-1) for i in range(len(xs)-1) if (ys[j]+ys[j+1])*.5>=4.65 or abs((xs[i]+xs[i+1])*.5)<2.1}
    v=[];f=[];indices={}
    def vertex(i,j,side):
        key=(i,j,side)
        if key not in indices:
            x,y=xs[i]*scale,ys[j]*scale;bulge=.31*math.cos(x/7.1*math.pi*.5)*math.cos(y/7.65*math.pi*.5)
            indices[key]=len(v);v.append((x,y,side*(depth+bulge*scale)))
        return indices[key]
    for i,j in cells:
        f.append(tuple(vertex(x,y,1) for x,y in [(i,j),(i+1,j),(i+1,j+1),(i,j+1)]))
        f.append(tuple(vertex(x,y,-1) for x,y in [(i,j+1),(i+1,j+1),(i+1,j),(i,j)]))
        for di,dj,a,b in [(-1,0,(i,j+1),(i,j)),(1,0,(i+1,j),(i+1,j+1)),(0,-1,(i,j),(i+1,j)),(0,1,(i+1,j+1),(i,j+1))]:
            if (i+di,j+dj) not in cells:f.append((vertex(*a,-1),vertex(*b,-1),vertex(*b,1),vertex(*a,1)))
    o=mesh(name,v,f,material,identity);smooth_mesh(o);parent(o,troot);return o
t=soften(t_body('GLASS_V19 — V21 filled radiused crystal T',glass),.31,7)
t['tem_material_kind']='identity-crystal';t['tem_closed_optical_solid']=True
lamina=soften(t_body('GLASS_V19 — V21 dichroic internal pressure layer',inner,.14,.953),.14,4)
lamina['tem_material_kind']='identity-lamina'
for side in [-1,1]:
    # Small contacts, rather than a rectangular luminous perimeter frame.
    for y in [-7.51,6.13]:
        x=side*(2.09 if y<0 else 7.0)
        parent(soften(box('Small crystal ceramic contact shoe',(x,y,-.12),(.24,.63,1.96),pearl,identity),.095,5),troot)
        parent(soften(box('Crystal precise champagne contact',(x,y,.82),(.082,.40,.11),warm,identity),.025,3),troot)
        parent(box('Crystal embedded photonic contact',(x,y+.13,.91),(.028,.10,.018),cyan,identity),troot)
for j in range(5):
    points=[]
    for k in range(120):
        q=k/119;points.append((math.sin(q*math.tau*1.20+j*.85)*(.33+j*.074),-7.3+q*12.5,math.cos(q*math.tau*1.15+j*.68)*.27))
    parent(tube('V21 internal narrow stem energy channel',points,.010+j*.0015,cyan if j%3 else violet,identity,6),troot)
for side in [-1,1]:
    for j in range(3):
        path=catmull([(0,4.87,.09),(side*1.30,5.45+j*.16,.19),(side*3.80,6.57-j*.18,.16),(side*6.7,6.3+j*.18,.04)],100)
        parent(tube('V21 branched inner photonic crossbar',path,.012,cyan if j%2 else violet,identity,6),troot)
parent(sphere('V21 small warm crystal junction core',(0,4.90,.0),.075,amber,identity,16,8),troot)

# Curved pressure screen: exact existing DOM dimensions and world pose.
froot=group('AUTHOR_V21_DISPLAY',screen);froot.location=B((-8.3,1.45,-2));froot.rotation_euler.z=.12;froot.rotation_euler.y=.045
froot['surfaceWidth']=12.22;froot['surfaceHeight']=10.528;froot['tem_optical_version']=21
def outline(w,h,r=.67,n=18):
    p=[]
    for cx,cy,a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for j in range(n+1):
            q=math.radians(a+j/n*90);x=cx+r*math.cos(q);y=cy+r*math.sin(q);p.append((x,y,x*x*.0054+y*y*.0007))
    return p
for name,w,h,z,r,m in [('Fine ceramic pressure edge',12.91,11.13,-.035,.056,pearl),
                       ('Small titanium outer contact',12.99,11.19,-.056,.027,titanium),
                       ('Champagne front optical seam',12.83,11.05,.061,.019,warm),
                       ('Inset pressure gasket',12.77,11.01,.022,.029,dark),
                       ('Recessed cyan optical corner circuit',12.73,10.97,.071,.008,cyan)]:
    parent(tube(name,[(x,y,d+z) for x,y,d in outline(w,h)],r,m,screen,8,True),froot)
def display_body(name,material,z,depth):
    nx,ny=48,40;v=[];f=[]
    for side in [-1,1]:
        for j in range(ny+1):
            for i in range(nx+1):
                x=-6.31+i/nx*12.62;y=-5.43+j/ny*10.86;v.append((x,y,x*x*.0054+y*y*.0007+z+side*depth))
    stride=(nx+1)*(ny+1)
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;f.extend([(a,a+nx+1,a+nx+2,a+1),(a+stride,a+1+stride,a+nx+2+stride,a+nx+1+stride)])
    for j in range(ny):
        for a in [j*(nx+1),(j+1)*(nx+1)-1]:f.append((a,a+nx+1,a+nx+1+stride,a+stride))
    for i in range(nx):
        for a in [i,ny*(nx+1)+i]:f.append((a,a+stride,a+1+stride,a+1))
    o=mesh(name,v,f,material,screen);smooth_mesh(o);parent(o,froot);o['tem_closed_optical_solid']=True
display_body('GLASS_V19 — V21 curved front pressure laminate',displayglass,.018,.066)
display_body('GLASS_V19 — V21 internal screen pressure film',displayinner,-.075,.018)
for side in [-1,1]:
    for y in [-4.91,4.90]:
        x=side*6.36
        parent(soften(box('Small pearl laminated corner shoe',(x,y,.29),(.17,.38,.17),pearl,screen),.065,4),froot)
        parent(soften(box('Precise corner contact inset',(x,y+.02,.38),(.066,.15,.025),warm,screen),.018,3),froot)
for name,path,r,m in [('Curved small display support',[(-6.16,-4.93,.10),(-6.03,-5.97,-.10),(-5.15,-6.66,-.45),(-2.02,-6.71,-.69)],.14,pearl),
                     ('Display support recessed root',[(-6.12,-5.07,-.17),(-6.01,-6.02,-.36),(-5.11,-6.76,-.66),(-2.02,-6.88,-.88)],.056,titanium),
                     ('Display support inset light',[(-6.10,-5.01,.18),(-6.03,-5.92,-.04),(-5.05,-6.54,-.37),(-2.02,-6.62,-.57)],.011,cyan)]:
    parent(tube(name,catmull(path,68),r,m,screen,10),froot)
eroot=group('AUTHOR_V21_EXTERIOR_RESERVED',exterior)
eroot['tem_external_world_source']='tem-star-sea-v20.glb';eroot['tem_no_duplicate_world']=True

# The complete image-free star sea stays in the engineering scene, not in
# the observatory export. Keep its old authored objects/materials intact.
for name in ['V20.01 — Editable orbital architecture','V20.02 — Instanced sculpted asteroid belt',
             'V20.03 — Procedural planetary bodies','V20.05 — Three-dimensional energy paths',
             'V20.06 — Real depth-distributed stellar field']:
    c=bpy.data.collections.get(name)
    if c:scene.collection.children.link(c)
source_volume=bpy.data.collections.get('V20.04 — Animated real nebula volumes')
if source_volume:
    for src in source_volume.objects:
        o=src.copy();o.data=src.data.copy();volume_collection.objects.link(o);o.name='V21 sparse gas — '+src.name
        m=src.active_material.copy();m.name='V21 independent ionised gas — '+src.active_material.name
        o.data.materials.clear();o.data.materials.append(m)
        # Sparse brighter pockets avoid a broad grey daytime curtain.
        n=m.node_tree.nodes
        ramp=next((node for node in n if node.type=='VALTORGB' and node.color_ramp.elements[0].position<.4),None)
        if ramp:ramp.color_ramp.elements[0].position=.47;ramp.color_ramp.elements[-1].position=.69
        for node in n:
            if node.type=='VOLUME_PRINCIPLED':node.inputs['Anisotropy'].default_value=.22
        o['tem_export']=False
scene.world=bpy.data.worlds.new('V21 — image-free deep-space optical fill');scene.world.use_nodes=True
wn,wl=scene.world.node_tree.nodes,scene.world.node_tree.links;wn.clear()
bg=wn.new('ShaderNodeBackground');bg.inputs['Color'].default_value=(.013,.024,.045,1);bg.inputs['Strength'].default_value=.32
wo=wn.new('ShaderNodeOutputWorld');wl.new(bg.outputs['Background'],wo.inputs['Surface'])
def look(o,p):o.rotation_euler=(B(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,p,target,power,color,size,ratio=.21):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size;data.size_y=size*ratio
    o=bpy.data.objects.new(name,data);rig.objects.link(o);o.location=B(p);look(o,target)
    if hasattr(data,'specular_factor'):data.specular_factor=0
    # These broad sources provide illumination, while the actual stellar gas,
    # luminous seams and architecture provide the visible reflected world.
    # Camera-path emitter rectangles made the crystal look like a light box.
    if hasattr(o,'visible_glossy'):o.visible_glossy=False
    if hasattr(o,'visible_transmission'):o.visible_transmission=False
area('V21 controlled warm key',(36,19,-44),(0,1,-10),1400,(1,.77,.60),14,.17)
area('V21 broad azure cabin fill',(-23,14,18),(0,2,-8),2500,(.38,.61,1),19,.35)
area('V21 soft crystal face',(-2,16,27),(7,6,-15),900,(.57,.70,1),12,.23)
area('V21 amethyst optical edge',(17,6,-34),(9,5,-17),690,(.48,.25,.74),5,.26)
data=bpy.data.lights.new('V21 shared distant sunlight','SUN');data.energy=1.1;data.color=(1,.78,.62);data.angle=.045
sun=bpy.data.objects.new('V21 shared distant sunlight',data);rig.objects.link(sun);sun.rotation_euler=(-B((.48,.19,-.84))).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('CAMERA_refined_observatory_v21');camera_data.type='PERSP';camera_data.sensor_fit='VERTICAL';camera_data.sensor_height=24
camera_data.lens=24/(2*math.tan(math.radians(49)/2));camera_data.clip_end=60000
camera=bpy.data.objects.new('CAMERA_refined_observatory_v21',camera_data);rig.objects.link(camera);camera.location=B((0,2.7,20));look(camera,(0,2,-5));scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8;scene.cycles.volume_bounces=2
scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.frame_set(1)
finish=bpy.data.node_groups.new('V21 — restrained luminous finish','CompositorNodeTree');scene.compositing_node_group=finish
finish.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
rl=finish.nodes.new('CompositorNodeRLayers');rl.scene=scene;glow=finish.nodes.new('CompositorNodeGlare')
if hasattr(glow,'glare_type'):glow.glare_type='FOG_GLOW'
if 'Type' in glow.inputs:glow.inputs['Type'].default_value='Fog Glow'
if 'Threshold' in glow.inputs:glow.inputs['Threshold'].default_value=1.8
if 'Strength' in glow.inputs:glow.inputs['Strength'].default_value=.13
out=finish.nodes.new('NodeGroupOutput');finish.links.new(rl.outputs['Image'],glow.inputs['Image']);finish.links.new(glow.outputs['Image'],out.inputs['Image'])

latin_path=Path('C:/Windows/Fonts/segoeuil.ttf');chinese_path=Path('C:/Windows/Fonts/simsun.ttc')
latin=bpy.data.fonts.load(str(latin_path)) if latin_path.exists() else None
chinese=bpy.data.fonts.load(str(chinese_path)) if chinese_path.exists() else None
def text(body,p,size,material,font):
    d=bpy.data.curves.new('V21 editable typography','FONT');d.body=body;d.size=size;d.extrude=.0008
    if font:d.font=font
    o=bpy.data.objects.new('V21 live-content review — '+body[:18],d);staging.objects.link(o);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(material);o.parent=froot;o.location=B(p);o['tem_export']=False
text('T E M',(-5.03,2.90,.38),1.95,white,latin)
text('王乾辉',(-5.01,1.55,.36),.62,white,chinese)
text('理解过去，生活当下，畅想未来。',(-5.02,-.12,.37),.50,white,chinese)
text('写诗，设计游戏，探索技术与未知。',(-5.01,-.92,.37),.34,white,chinese)
text('前往创作星图  ↗',(-5.01,-3.95,.33),.42,cyan,chinese)

authored=[('CABIN_V19',cabin,croot),('T_IDENTITY_V19',identity,troot),('SURFACE_FRAME_V19',screen,froot),('EXTERIOR_V19',exterior,eroot)]
def export_asset(lod=False):
    copies=[];web_roots=[];holds=[];mesh_count=0
    bpy.context.view_layer.update()
    for label,c,author in authored:
        existing=bpy.data.objects.get(label)
        if existing:existing.name=label+'_V21_SOURCE_HOLD';holds.append((existing,label))
        root=group(label,exports);web_roots.append(root)
        for key in author.keys():root[key]=author[key]
        root['tem_optical_version']=21
        buckets={}
        for original in c.objects:
            if original.type!='MESH':continue
            o=original.copy();o.data=original.data.copy();exports.objects.link(o);o.parent=None;o.matrix_world=original.matrix_world.copy();o.hide_render=False;o.hide_set(False)
            bpy.context.view_layer.objects.active=o
            for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
            if lod and len(o.data.polygons)>48:
                m=o.modifiers.new('Same-source compact optical LOD','DECIMATE');m.ratio=.34
                bpy.ops.object.modifier_apply(modifier=m.name)
            buckets.setdefault(o.active_material.name,[]).append(o)
        for material_name,items in buckets.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in items:o.select_set(True)
            bpy.context.view_layer.objects.active=items[0]
            if len(items)>1:bpy.ops.object.join()
            o=bpy.context.object;o.name=label+'_'+material_name
            world=o.matrix_world.copy();o.parent=root;o.matrix_world=world;copies.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in web_roots+copies:o.select_set(True)
    name='tem-refined-observatory-v21-lod.glb' if lod else 'tem-refined-observatory-v21.glb'
    bpy.ops.export_scene.gltf(filepath=str(MODELS/name),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_extras=True,export_animations=False)
    triangles=0
    for o in copies:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
    info={'file':name,'bytes':(MODELS/name).stat().st_size,'triangles':triangles,'meshes':len(copies),'roots':[o.name for o in web_roots],'images':0}
    for o in copies+web_roots:bpy.data.objects.remove(o,do_unlink=True)
    for o,name in holds:o.name=name
    if len(copies)>36 or triangles>(70000 if lod else 250000):raise RuntimeError('Refined observatory exceeded export budget '+str(info))
    return info
full=export_asset();lod=export_asset(True)
spec={'version':21,'generator':'Blender '+bpy.app.version_string,'transport':'Project-local MCP stdio','scene':scene.name,
      'blend':'tem-refined-optical-observatory.blend','coordinateSystem':'Three.js Y-up; Blender B=(x,-z,y)',
      'camera':{'position':[0,2.7,20],'look':[0,2,-5],'fovVertical':49},'sunDirection':[.48,.19,-.84],
      'identity':{'center':[9.6,6.5,-17],'yaw':-.28,'width':14.2,'height':15.3,'solidThickness':2.36},
      'display':{'center':[-8.3,1.45,-2],'yaw':.12,'roll':-.045,'surfaceWidth':12.22,'surfaceHeight':10.528},
      'floor':{'y':-5.32,'count':1,'closed':True,'material':'FLOOR_V19 — V21 polished optical basalt'},
      'assets':{'full':full,'lod':lod},'geometryExcludesExternalWorld':True,'environmentImageDependencies':0,
      'materialGuide':{'crystal':{'transmission':.91,'roughness':.052,'ior':1.472,'attenuationColor':[.39,.66,.88],'attenuationDistance':5},
                       'floor':{'metalness':.30,'roughness':.31,'clearcoat':.17,'specularIntensity':.23},
                       'ceramic':{'metalness':.14,'roughness':.265,'clearcoat':.34}},
      'reviews':['User concept identity-target and creation-atlas target viewed directly','Actual v20 Cycles rendering reviewed before modelling'],
      'runtimeNote':'Four absolute-coordinate semantic roots preserve DOM/identity projection; only one deck floor. Existing v20 external world loads independently.'}
(MODELS/'tem-refined-observatory-v21.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'manifest.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
notes=bpy.data.texts.new('V21 — START HERE');notes.write('TEM Refined Optical Observatory v21\nScene05 is independent, earlier v18/v19/v20 scenes remain intact.\nV21.01: one closed reflective deck at y=-5.32, sculpted ceramic cantilevers, pressure strata and fine joints.\nV21.02: real filled radiused glass T of 2.36 thickness, lamina and internal branched photonic channels.\nV21.03: fine curved closed display lamination, exact live DOM pose and size, small ceramic supports.\nExternal v20 world is retained in .blend but excluded from observatory GLBs.\nFour semantic roots use absolute coordinates and identical identity/display extras. Full and same-source compact LOD have no image textures.\nActual Cycles review camera 0,2.7,20 / look0,2,-5 / vertical49degrees; website screenshot is a separate output.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tem-refined-optical-observatory.blend'))
print('TEM_REFINED_V21_COMPLETE '+json.dumps(spec,ensure_ascii=False),flush=True)
