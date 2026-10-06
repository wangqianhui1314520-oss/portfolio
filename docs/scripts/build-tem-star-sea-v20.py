"""Build the editable v20 star-sea scene through the fixed project MCP.

The accepted v19 cabin, identity and display remain linked and unmodified.
This scene has no photographic environment, image plane or background video.
The web GLBs contain only external-world solid geometry. Volume boundaries,
offline stars, lights and animated energy paths stay editable in the .blend;
their matching world-space specification is exported as JSON for live shaders.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'blender/cinematic-v20'
MODELS = ROOT / 'assets/models'
OUT.mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('04 — TEM / Living Star Sea')
bpy.context.window.scene = scene

def B(p):
    return Vector((p[0], -p[2], p[1]))

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

for name in ['V19.01 — Manufactured observatory cabin',
             'V19.02 — Laminated optical identity',
             'V19.03 — Curved pressure display',
             'V19.06 — Editable typography and references']:
    c = bpy.data.collections.get(name)
    if c:
        scene.collection.children.link(c)

solids = collection('V20.01 — Editable orbital architecture')
asteroids = collection('V20.02 — Instanced sculpted asteroid belt')
planets_collection = collection('V20.03 — Procedural planetary bodies')
volumes = collection('V20.04 — Animated real nebula volumes')
energy = collection('V20.05 — Three-dimensional energy paths')
stars = collection('V20.06 — Real depth-distributed stellar field')
rig = collection('V20.07 — Shared sunlight and optical lighting')
exports = collection('V20.09 — Private optimized external-world web copies')

def mat(name, color, metal=0, rough=.35, coat=0, emit=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.clear()
    p = n.new('ShaderNodeBsdfPrincipled')
    p.name = 'Principled BSDF'
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .23
    if emit:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emit
    o = n.new('ShaderNodeOutputMaterial')
    l.new(p.outputs['BSDF'], o.inputs['Surface'])
    return m

ceramic = mat('V20_CERAMIC — lunar pearl', (.38, .48, .58), .16, .30, .28)
titanium = mat('V20_TITANIUM — cool orbital alloy', (.035, .065, .104), .74, .34, .17)
champagne = mat('V20_CHAMPAGNE — restrained warm machining', (.25, .17, .085), .78, .30, .13)
cyan = mat('V20_EMISSION — azure navigation', (.055, .33, .68), .12, .32, emit=2.7)
violet = mat('V20_EMISSION — violet photonic field', (.26, .10, .57), .08, .35, emit=2.3)
amber = mat('V20_EMISSION — occupied window light', (.98, .48, .15), .06, .37, emit=1.8)
rock_mats = []
for j, color in enumerate([(.085, .097, .13), (.13, .145, .18), (.06, .085, .11)]):
    m = mat('V20_BASALT_%d — procedural craters' % j, color, .08, .88)
    n, l = m.node_tree.nodes, m.node_tree.links
    noise = n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 8.0
    noise.inputs['Detail'].default_value = 4
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .31
    bump.inputs['Distance'].default_value = .17
    l.new(noise.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], n.get('Principled BSDF').inputs['Normal'])
    rock_mats.append(m)

def mesh(name, vertices, faces, material, c, smooth=True):
    d = bpy.data.meshes.new(name + ' editable mesh')
    d.from_pydata([B(v) for v in vertices], [], faces)
    d.materials.append(material)
    d.update()
    o = bpy.data.objects.new(name, d)
    c.objects.link(o)
    for p in d.polygons:
        p.use_smooth = smooth
    o['tem_coordinate_space'] = 'Three.js-Y-up:absolute'
    return o

def box(name, center, size, material, c, bevel=0):
    x, y, z = center
    a, b, d = [v / 2 for v in size]
    v = [(x+sx*a, y+sy*b, z+sz*d) for sx, sy, sz in
         [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
          (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    f = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    o = mesh(name, v, f, material, c, False)
    if bevel:
        m = o.modifiers.new('Manufactured edge highlights', 'BEVEL')
        m.width = bevel
        m.segments = 2
    return o

def tube(name, points, radius, material, c, sides=8, closed=False):
    vs, fs = [], []
    ps = [Vector(v) for v in points]
    for j, p in enumerate(ps):
        a = ps[(j-1) % len(ps)] if closed or j else ps[0]
        b = ps[(j+1) % len(ps)] if closed or j < len(ps)-1 else ps[-1]
        tangent = (b-a).normalized()
        axis = Vector((0,1,0)) if abs(tangent.y) < .94 else Vector((1,0,0))
        u = tangent.cross(axis).normalized()
        v = tangent.cross(u).normalized()
        for k in range(sides):
            q = p + radius * (u*math.cos(k/sides*math.tau)+v*math.sin(k/sides*math.tau))
            vs.append(tuple(q))
    for j in range(len(ps) if closed else len(ps)-1):
        for k in range(sides):
            a=j*sides+k; b=j*sides+(k+1)%sides
            d=((j+1)%len(ps))*sides+k; e=((j+1)%len(ps))*sides+(k+1)%sides
            fs.append((a,b,e,d))
    if not closed:
        fs += [tuple(reversed(range(sides))), tuple(range((len(ps)-1)*sides,len(ps)*sides))]
    return mesh(name,vs,fs,material,c)

def ring(name, center, radius, thickness, material, c, n=72):
    return tube(name, [(center[0]+math.cos(j/n*math.tau)*radius,
                       center[1], center[2]+math.sin(j/n*math.tau)*radius)
                      for j in range(n)], thickness, material, c, 8, True)

def sphere(name, center, radius, material, c, segments=48, bands=24):
    vs=[(center[0],center[1]+radius,center[2])];fs=[]
    for j in range(1,bands):
        a=j/bands*math.pi
        for k in range(segments):
            t=k/segments*math.tau
            vs.append((center[0]+radius*math.sin(a)*math.cos(t),
                       center[1]+radius*math.cos(a),
                       center[2]+radius*math.sin(a)*math.sin(t)))
    south=len(vs);vs.append((center[0],center[1]-radius,center[2]))
    for k in range(segments):fs.append((0,1+k,1+(k+1)%segments))
    for j in range(bands-2):
        for k in range(segments):
            a=1+j*segments+k;b=1+j*segments+(k+1)%segments
            fs.append((a,a+segments,b+segments,b))
    first=1+(bands-2)*segments
    for k in range(segments):fs.append((first+k,south,first+(k+1)%segments))
    return mesh(name,vs,[tuple(reversed(f)) for f in fs],material,c)

# Four habitable orbital complexes at genuinely different depths. Their
# sculpted lips, split rings, maintenance ribs and recessed windows are solid.
station_specs=[('Near watchpoint',[-142,-12,-290],31),
               ('Dawn research port',[202,-21,-430],45),
               ('Deep orbital city',[-360,35,-960],67),
               ('Far navigation crown',[680,70,-1080],88)]
rng=random.Random(200610)
for label, p, r in station_specs:
    ring(label+' outer ceramic pressure torus',p,r,r*.043,ceramic,solids)
    ring(label+' recessed titanium service torus',(p[0],p[1]-r*.055,p[2]),r*.93,r*.042,titanium,solids)
    ring(label+' thin guidance seam',(p[0],p[1]+r*.04,p[2]),r*.97,r*.005,cyan,solids)
    ring(label+' interior warm occupancy',(p[0],p[1]-r*.07,p[2]),r*.62,r*.012,amber,solids)
    for j in range(12):
        a=j/12*math.tau;x=p[0]+math.cos(a)*r*.79;z=p[2]+math.sin(a)*r*.79
        tip=(p[0]+math.cos(a)*r*.98,p[1],p[2]+math.sin(a)*r*.98)
        tube(label+' radial load-bearing rib',[(x,p[1]-r*.09,z),(x,p[1],z),tip],r*.013,titanium,solids,6)
        box(label+' occupied service room',(x,p[1]+r*.038,z),(r*.068,r*.047,r*.052),champagne,solids)
        box(label+' recessed room viewport',(x,p[1]+r*.04,z+r*.027),(r*.047,r*.016,r*.0025),amber,solids)
    for j in range(16):
        a=rng.uniform(0,math.tau);rr=rng.uniform(.10,.56)*r
        h=rng.uniform(.16,.82)*r if j<3 else rng.uniform(.08,.32)*r
        x=p[0]+math.cos(a)*rr;z=p[2]+math.sin(a)*rr;w=rng.uniform(.02,.08)*r
        box(label+' tapered inhabited tower',(x,p[1]+h/2,z),(w,h,w*.62),ceramic if j%3 else titanium,solids,r*.006)
        box(label+' tower luminous vertical slot',(x+w*.51,p[1]+h*.6,z),(r*.002,h*.48,w*.33),amber if j%4 else cyan,solids)
        tube(label+' antenna crown',[(x,p[1]+h,z),(x,p[1]+h+r*.08,z)],r*.0028,champagne,solids,5)
    # A continuous swooping orbital access bridge is real geometry.
    pts=[]
    for j in range(48):
        q=j/47;a=q*2.05-.90
        pts.append((p[0]+math.cos(a)*(r*1.13+q*r*.4),
                    p[1]+math.sin(q*math.pi)*r*.16-r*.08,
                    p[2]+math.sin(a)*(r*1.13+q*r*.4)))
    tube(label+' orbital access causeway',pts,r*.025,ceramic,solids,8)
    tube(label+' causeway photonic edge',[(x,y+r*.026,z) for x,y,z in pts],r*.0038,cyan,solids,6)

# Sculpted shared-mesh prototypes. Each authored rock is an actual instance;
# the web export joins copies by material to avoid hundreds of draw calls.
prototypes=[]
for j in range(3):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1)
    o=bpy.context.object
    for c in list(o.users_collection):c.objects.unlink(o)
    asteroids.objects.link(o);o.name='AUTHOR prototype basalt variant %d'%j
    o.data.materials.append(rock_mats[j])
    for v in o.data.vertices:
        q=v.co;f=1+.19*math.sin(q.x*8.3+j)*math.cos(q.y*5.2-j)+.09*math.sin(q.z*11.1)
        v.co*=f
    # Curved silhouettes stay sculpted, while export remains below its budget.
    mod=o.modifiers.new('Sculpted shared rock budget','DECIMATE');mod.ratio=.38
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    o.hide_render=True;o.hide_set(True);o['tem_export']=False
    prototypes.append(o)
belt_center=[-145,105,-950]
for j in range(430):
    a=rng.uniform(-2.35,1.75);rr=rng.uniform(340,620)
    x=belt_center[0]+math.cos(a)*rr
    z=belt_center[2]+math.sin(a)*rr*.77
    y=belt_center[1]+math.cos(a*1.38)*74+rng.gauss(0,21)
    scale=(rng.uniform(1.5,4.2) if j>34 else rng.uniform(5,11))
    src=prototypes[j%3];o=bpy.data.objects.new('Sculpted orbital asteroid %03d'%j,src.data)
    asteroids.objects.link(o);o.location=B((x,y,z));o.scale=(scale*rng.uniform(.65,1.3),scale*rng.uniform(.65,1.3),scale*rng.uniform(.65,1.3))
    o.rotation_euler=(rng.random()*6,rng.random()*6,rng.random()*6)
    o['tem_export']=True;o['tem_world_layer']='asteroid';o['tem_lod_rank']=j

planet_specs=[{'id':'PLANET_V20_DAWN','center':[440,-360,-1480],'radius':510,'color':[.04,.095,.19],'roughness':.69,'seed':20},
              {'id':'PLANET_V20_MOON','center':[-465,310,-1880],'radius':139,'color':[.09,.105,.15],'roughness':.82,'seed':37}]
for spec in planet_specs:
    m=mat('V20_PLANET — '+spec['id'],spec['color'],.03,spec['roughness'])
    n,l=m.node_tree.nodes,m.node_tree.links
    tc=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value=4.9;noise.inputs['Detail'].default_value=5.0;noise.inputs['Roughness'].default_value=.67
    l.new(tc.outputs['Generated'],noise.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.32;ramp.color_ramp.elements[0].color=(.014,.025,.055,1)
    ramp.color_ramp.elements[1].position=.71;ramp.color_ramp.elements[1].color=(.18,.27,.35,1)
    e=ramp.color_ramp.elements.new(.55);e.color=(.045,.08,.105,1)
    l.new(noise.outputs['Fac'],ramp.inputs['Fac']);l.new(ramp.outputs['Color'],n.get('Principled BSDF').inputs['Base Color'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=2.4
    l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])
    o=sphere(spec['id'],spec['center'],spec['radius'],m,planets_collection,64,32)
    o['tem_world_layer']='planet';o['tem_radius']=spec['radius'];o['tem_seed']=spec['seed']
    o['tem_center']=spec['center'];o['tem_procedural_material']=True
    # A real scattering shell supplies the thin blue limb in Cycles. It is
    # offline-only; the live world derives its shell from this planet metadata.
    am=bpy.data.materials.new('V20 PLANET ATMOSPHERE — '+spec['id']);am.use_nodes=True
    an,al=am.node_tree.nodes,am.node_tree.links;an.clear()
    scatter=an.new('ShaderNodeVolumeScatter');scatter.inputs['Color'].default_value=(.12,.39,.82,1)
    scatter.inputs['Density'].default_value=.000095;scatter.inputs['Anisotropy'].default_value=.55
    ao=an.new('ShaderNodeOutputMaterial');al.new(scatter.outputs['Volume'],ao.inputs['Volume'])
    shell=sphere('Offline atmosphere — '+spec['id'],spec['center'],spec['radius']*1.045,am,planets_collection,48,24)
    shell['tem_export']=False
    spec['atmosphere']={'width':.045,'color':[.12,.39,.82],'density':.000095}

volume_specs=[
 {'id':'Azure mid-depth cloud','center':[-340,220,-920],'radius':[760,310,440],'color':[.075,.26,.56],'density':.00135,'flow':[.8,.09,.25],'seed':11},
 {'id':'Lavender far stellar nursery','center':[640,230,-1150],'radius':[820,450,460],'color':[.26,.12,.43],'density':.00165,'flow':[-.45,.04,.65],'seed':27},
 {'id':'Near blue wisps','center':[-360,95,-390],'radius':[360,150,170],'color':[.08,.33,.62],'density':.0012,'flow':[.75,.09,-.2],'seed':33},
 {'id':'Low dawn cloud sea','center':[0,-55,-350],'radius':[650,42,450],'color':[.24,.34,.49],'density':.008,'flow':[.65,0,.22],'seed':19},
 {'id':'Starboard depth cloud','center':[680,150,180],'radius':[430,240,660],'color':[.15,.18,.43],'density':.00125,'flow':[-.3,.08,-.55],'seed':51},
 {'id':'Aft cosmic canopy','center':[-580,220,550],'radius':[850,330,500],'color':[.06,.22,.38],'density':.00155,'flow':[.4,.04,-.6],'seed':67},
]
for spec in volume_specs:
    spec['kind']='cloud-sea' if spec['id']=='Low dawn cloud sea' else 'nebula'

def volume_material(spec):
    m=bpy.data.materials.new('V20 VOLUME — '+spec['id']);m.use_nodes=True
    n,l=m.node_tree.nodes,m.node_tree.links;n.clear()
    coord=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.noise_dimensions='4D'
    noise.inputs['Scale'].default_value=9.5;noise.inputs['Detail'].default_value=5.0;noise.inputs['Roughness'].default_value=.64
    noise.inputs['W'].default_value=spec['seed']*.19;noise.inputs['W'].keyframe_insert('default_value',frame=1)
    noise.inputs['W'].default_value=spec['seed']*.19+2.4;noise.inputs['W'].keyframe_insert('default_value',frame=480)
    l.new(coord.outputs['Generated'],noise.inputs['Vector'])
    threshold=n.new('ShaderNodeValToRGB');threshold.color_ramp.elements[0].position=.36;threshold.color_ramp.elements[0].color=(0,0,0,1)
    threshold.color_ramp.elements[1].position=.66;threshold.color_ramp.elements[1].color=(1,1,1,1)
    l.new(noise.outputs['Fac'],threshold.inputs['Fac'])
    subtract=n.new('ShaderNodeVectorMath');subtract.operation='SUBTRACT';subtract.inputs[1].default_value=(.5,.5,.5)
    length=n.new('ShaderNodeVectorMath');length.operation='LENGTH'
    l.new(coord.outputs['Generated'],subtract.inputs[0]);l.new(subtract.outputs['Vector'],length.inputs[0])
    envelope=n.new('ShaderNodeMapRange');envelope.clamp=True;envelope.interpolation_type='SMOOTHSTEP'
    envelope.inputs['From Min'].default_value=.18;envelope.inputs['From Max'].default_value=.49
    envelope.inputs['To Min'].default_value=1;envelope.inputs['To Max'].default_value=0
    l.new(length.outputs['Value'],envelope.inputs['Value'])
    product=n.new('ShaderNodeMath');product.operation='MULTIPLY';l.new(threshold.outputs['Color'],product.inputs[0]);l.new(envelope.outputs['Result'],product.inputs[1])
    density=n.new('ShaderNodeMath');density.operation='MULTIPLY';density.inputs[1].default_value=spec['density']
    l.new(product.outputs['Value'],density.inputs[0])
    p=n.new('ShaderNodeVolumePrincipled');p.inputs['Color'].default_value=(*spec['color'],1);p.inputs['Anisotropy'].default_value=.34
    l.new(density.outputs['Value'],p.inputs['Density'])
    # Ionised dense pockets genuinely illuminate the volume. Their colour is
    # correlated with density, leaving dark dust lanes and blue-violet cores.
    ion=n.new('ShaderNodeValToRGB')
    ion.color_ramp.elements[0].position=.35;ion.color_ramp.elements[0].color=(*[v*.38 for v in spec['color']],1)
    ion.color_ramp.elements[1].position=.77;ion.color_ramp.elements[1].color=(.28,.45,.68,1)
    e=ion.color_ramp.elements.new(.58);e.color=(*spec['color'],1)
    l.new(noise.outputs['Fac'],ion.inputs['Fac']);l.new(ion.outputs['Color'],p.inputs['Emission Color'])
    emission=n.new('ShaderNodeMath');emission.operation='MULTIPLY';emission.inputs[1].default_value=.62 if spec['id']!='Low dawn cloud sea' else .055
    l.new(density.outputs['Value'],emission.inputs[0]);l.new(emission.outputs['Value'],p.inputs['Emission Strength'])
    out=n.new('ShaderNodeOutputMaterial');l.new(p.outputs['Volume'],out.inputs['Volume'])
    return m

for spec in volume_specs:
    o=sphere('VOLUME envelope — '+spec['id'],[0,0,0],1,volume_material(spec),volumes,32,16)
    o.location=B(spec['center']);o.scale=(spec['radius'][0],spec['radius'][2],spec['radius'][1])
    o['tem_export']=False;o['tem_runtime_spec']=spec['id'];o['tem_image_dependency']=False

flow_specs=[
 {'id':'Main cosmic river','points':[[-760,-15,160],[-470,28,-170],[-180,82,-490],[130,110,-700],[590,260,-1120],[1010,420,-1530]],'colors':[[.055,.39,.9],[.52,.20,.73]],'width':1.7,'rate':.045},
 {'id':'Warm sunrise relay','points':[[640,-80,-820],[440,-40,-550],[220,-9,-390],[-40,9,-330],[-310,60,-520],[-590,130,-850]],'colors':[[.55,.30,.15],[.10,.36,.73]],'width':.80,'rate':.036},
 {'id':'Starboard orbit ribbon','points':[[770,-15,490],[540,65,320],[420,180,-130],[510,230,-510],[770,330,-980]],'colors':[[.10,.40,.67],[.41,.19,.67]],'width':1.2,'rate':.04},
 {'id':'Aft stellar arch','points':[[-980,35,630],[-660,80,820],[-130,170,1000],[370,230,720],[750,340,230]],'colors':[[.16,.20,.57],[.07,.41,.58]],'width':1.4,'rate':.027},
 {'id':'Near watchpoint ingress','points':[[-410,30,-160],[-265,32,-235],[-142,23,-290],[18,34,-395],[202,38,-430]],'colors':[[.035,.35,.8],[.39,.16,.59]],'width':.55,'rate':.05},
]
for spec in flow_specs:
    spec['color']=spec['colors'][0]
    spec['emissionRate']=spec['rate']
    spec['rate']*=.1
    # Keep editable spline paths, rather than baking an image of a trail.
    d=bpy.data.curves.new(spec['id']+' editable 3D path','CURVE');d.dimensions='3D';d.resolution_u=24
    d.bevel_depth=spec['width']*.085;d.bevel_resolution=3
    spline=d.splines.new('BEZIER');spline.bezier_points.add(len(spec['points'])-1)
    for b,p in zip(spline.bezier_points,spec['points']):
        b.co=B(p);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    d.materials.append(cyan if 'Warm' not in spec['id'] else amber)
    o=bpy.data.objects.new(spec['id']+' luminous geometric spline',d);energy.objects.link(o);o['tem_export']=False
    for j in range(18):
        t=j/18*(len(spec['points'])-1);k=min(len(spec['points'])-2,int(t));q=t-k
        p=Vector(spec['points'][k]).lerp(Vector(spec['points'][k+1]),q)
        particle=sphere(spec['id']+' travelling photon %02d'%j,tuple(p),spec['width']*.29,cyan if j%4 else violet,energy,8,4)
        particle['tem_export']=False
        # Actual moving meshes demonstrate the temporal world in the project.
        particle.location=(0,0,0);particle.keyframe_insert('location',frame=1)
        end=Vector(spec['points'][(k+2)%len(spec['points'])])-p
        particle.location=B(end);particle.keyframe_insert('location',frame=240)

# Sparse near stars and a richer distant layer. All are solid emissive octahedra
# with world positions; no sprite atlas, plane, panorama or image texture.
star_count=6000
star_materials=[mat('V20_STARS — blue-white',(.51,.72,1),rough=.6,emit=12),
                mat('V20_STARS — warm-white',(.96,.77,.57),rough=.6,emit=9),
                mat('V20_STARS — violet-white',(.70,.53,1),rough=.6,emit=10)]
star_vs=[[],[],[]];star_fs=[[],[],[]]
for j in range(star_count):
    direction=Vector((rng.gauss(0,1),rng.gauss(0,1)*.62,rng.gauss(0,1))).normalized()
    r=rng.uniform(1500,5400);p=direction*r
    s=rng.uniform(1.1,3.0)*(1.6 if j<90 else 1);idx=j%3;offset=len(star_vs[idx])
    for a in [(s,0,0),(-s,0,0),(0,s,0),(0,-s,0),(0,0,s),(0,0,-s)]:star_vs[idx].append(tuple(p+Vector(a)))
    for f in [(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]:star_fs[idx].append(tuple(offset+k for k in f))
for j in range(3):
    o=mesh('Real stellar field layer %d'%j,star_vs[j],star_fs[j],star_materials[j],stars,False);o['tem_export']=False

# A truly procedural World: a constant deep-space fill. Nebula colour and
# depth come from the actual volumes, rather than from a world texture.
world=bpy.data.worlds.new('V20 — image-free deep-space illumination');world.use_nodes=True
n,l=world.node_tree.nodes,world.node_tree.links;n.clear();background=n.new('ShaderNodeBackground')
background.inputs['Color'].default_value=(.022,.038,.068,1);background.inputs['Strength'].default_value=.42
out=n.new('ShaderNodeOutputWorld');l.new(background.outputs['Background'],out.inputs['Surface']);scene.world=world

def look(o,p):o.rotation_euler=(B(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,p,target,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size;data.size_y=size*.24
    o=bpy.data.objects.new(name,data);rig.objects.link(o);o.location=B(p);look(o,target);return o
area('V20 broad warm optical key',(36,19,-44),(0,1,-10),2600,(1,.78,.60),16)
area('V20 diffuse azure cabin fill',(-23,14,18),(0,2,-8),3000,(.38,.62,1),19)
area('V20 soft glass face',(-2,16,27),(5,5,-15),1300,(.58,.72,1),13)
area('V20 controlled amethyst edge',(17,6,-34),(9,5,-17),620,(.49,.26,.76),5)
sun_direction=Vector((.48,.19,-.84)).normalized()
data=bpy.data.lights.new('V20 shared physical distant sunlight','SUN');data.energy=1.25;data.color=(1,.78,.62);data.angle=.045
sun=bpy.data.objects.new('V20 shared physical distant sunlight',data);rig.objects.link(sun)
sun.rotation_euler=(-B(sun_direction)).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('CAMERA_star_sea_v20');camera_data.type='PERSP';camera_data.sensor_fit='VERTICAL';camera_data.sensor_height=24
camera_data.lens=24/(2*math.tan(math.radians(49)/2));camera_data.clip_end=60000
camera=bpy.data.objects.new('CAMERA_star_sea_v20',camera_data);rig.objects.link(camera);camera.location=B((0,2.7,20));look(camera,(0,2,-5));scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.cycles.max_bounces=8;scene.cycles.transmission_bounces=6;scene.cycles.volume_bounces=2
scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.frame_start=1;scene.frame_end=480;scene.render.fps=24;scene.frame_set(1)
finish=bpy.data.node_groups.new('V20 — restrained optical finish','CompositorNodeTree');scene.compositing_node_group=finish
finish.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
rl=finish.nodes.new('CompositorNodeRLayers');rl.scene=scene
glow=finish.nodes.new('CompositorNodeGlare')
if hasattr(glow,'glare_type'):glow.glare_type='FOG_GLOW'
if hasattr(glow,'quality'):glow.quality='HIGH'
if 'Type' in glow.inputs:glow.inputs['Type'].default_value='Fog Glow'
if 'Threshold' in glow.inputs:glow.inputs['Threshold'].default_value=1.6
if 'Strength' in glow.inputs:glow.inputs['Strength'].default_value=.16
out=finish.nodes.new('NodeGroupOutput');finish.links.new(rl.outputs['Image'],glow.inputs['Image']);finish.links.new(glow.outputs['Image'],out.inputs['Image'])

def export_world(lod=False):
    bpy.ops.object.select_all(action='DESELECT')
    copies=[]
    for c in [solids,asteroids,planets_collection]:
        for src in list(c.objects):
            if src.type!='MESH' or not src.get('tem_export',True):continue
            if lod and c==asteroids and src.get('tem_lod_rank',0)>149:continue
            o=src.copy();o.data=src.data.copy();exports.objects.link(o);o.parent=None;o.matrix_world=src.matrix_world.copy();o.hide_render=False;o.hide_set(False)
            bpy.context.view_layer.objects.active=o
            for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
            if lod and len(o.data.polygons)>100:
                mod=o.modifiers.new('Same-world mobile mesh reduction','DECIMATE');mod.ratio=.45
                bpy.ops.object.modifier_apply(modifier=mod.name)
            copies.append(o)
    buckets={};joined=[];planet_sources=[]
    for o in copies:
        # Keep individual planets identifiable for matching real-time terrain.
        key=o.name.split('.')[0] if o.get('tem_world_layer')=='planet' else o.active_material.name
        buckets.setdefault(key,[]).append(o)
    for key,items in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        o=bpy.context.object
        if key.startswith('PLANET_V20'):
            original=bpy.data.objects.get(key)
            if original and original!=o:
                original.name=key+'_AUTHOR_HOLD';planet_sources.append((original,key))
            o.name=key
        else:o.name='STAR_SEA_V20_'+key
        joined.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in joined:o.select_set(True)
    name='tem-star-sea-v20-lod.glb' if lod else 'tem-star-sea-v20.glb'
    bpy.ops.export_scene.gltf(filepath=str(MODELS/name),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_extras=True,export_animations=False)
    triangles=0
    for o in joined:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
    result={'file':name,'bytes':(MODELS/name).stat().st_size,'triangles':triangles,'meshes':len(joined),'nodes':[o.name for o in joined]}
    for o in joined:bpy.data.objects.remove(o,do_unlink=True)
    for original,name in planet_sources:original.name=name
    return result

bpy.context.view_layer.update()
full=export_world(False);lod=export_world(True)
if full['triangles']>=100000:raise RuntimeError('Full external-world geometry exceeded 100k triangles')

def export_observatory_lod():
    """Reduce private copies of the accepted v19 asset, never its source."""
    roots=[];copies=[];materials={}
    bpy.context.view_layer.layer_collection.children[exports.name].exclude=False
    for name in ['CABIN_V19','T_IDENTITY_V19','SURFACE_FRAME_V19','EXTERIOR_V19']:
        source=bpy.data.objects.get(name)
        if not source:raise RuntimeError('Missing accepted v19 root '+name)
        root=bpy.data.objects.new(name+'_V20_LOD',None);exports.objects.link(root)
        root.matrix_world=source.matrix_world.copy()
        for key in source.keys():root[key]=source[key]
        root['tem_lod']='same-source-v19:compact';roots.append(root)
        for original in source.children:
            if original.type!='MESH' or 'CLOUD' in original.name:continue
            o=original.copy();o.data=original.data.copy();exports.objects.link(o);o.parent=None;o.matrix_world=original.matrix_world.copy()
            o.hide_render=False;o.hide_set(False);bpy.context.view_layer.objects.active=o
            for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
            dec=o.modifiers.new('Same-source compact geometric LOD','DECIMATE');dec.ratio=.25
            bpy.ops.object.modifier_apply(modifier=dec.name)
            for slot in o.material_slots:
                old=slot.material
                if old.name not in materials:
                    p=next((n for n in old.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if old.use_nodes else None
                    color=tuple(p.inputs['Base Color'].default_value[:3]) if p else tuple(old.diffuse_color[:3])
                    m=mat('V20_LOD_'+old.name,color,p.inputs['Metallic'].default_value if p else 0,
                          p.inputs['Roughness'].default_value if p else .35,p.inputs['Coat Weight'].default_value if p else 0)
                    np=m.node_tree.nodes.get('Principled BSDF')
                    if p:
                        for key in ['Transmission Weight','IOR','Emission Color','Emission Strength','Coat Roughness','Alpha']:
                            if key in p.inputs and key in np.inputs:np.inputs[key].default_value=p.inputs[key].default_value
                    materials[old.name]=m
                slot.material=materials[old.name]
            world=o.matrix_world.copy();o.parent=root;o.matrix_world=world;copies.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in roots+copies:o.select_set(True)
    # Export original semantic names in a private temporary root namespace.
    originals=[]
    for root,name in zip(roots,['CABIN_V19','T_IDENTITY_V19','SURFACE_FRAME_V19','EXTERIOR_V19']):
        old=bpy.data.objects.get(name);old.name=name+'_SOURCE_HOLD';originals.append((old,name));root.name=name
    name='tem-observatory-v20-lod.glb'
    bpy.ops.export_scene.gltf(filepath=str(MODELS/name),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_extras=True,export_animations=False)
    tris=0
    for o in copies:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    for o in copies+roots:bpy.data.objects.remove(o,do_unlink=True)
    for old,name in originals:old.name=name
    if tris>70000:raise RuntimeError('Accepted-cabin compact LOD exceeded 70k triangles')
    return {'file':'tem-observatory-v20-lod.glb','bytes':(MODELS/'tem-observatory-v20-lod.glb').stat().st_size,'triangles':tris,'meshes':len(copies),'roots':[x[1] for x in originals],'source':'tem-observatory-v19.glb','imageTextures':0}

observatory_lod=export_observatory_lod()
spec={'version':20,'generator':'Blender '+bpy.app.version_string,'coordinateSystem':'Three.js Y-up; Blender B=(x,-z,y)',
      'scene':scene.name,'camera':{'position':[0,2.7,20],'look':[0,2,-5],'fovVertical':49},'sunDirection':[.48,.19,-.84],
      'volumeRegions':volume_specs,'flowCurves':flow_specs,'starField':{'seed':200610,'count':6000,'radiusNear':1500,'radiusFar':5400},
      'planets':planet_specs,'asteroidBelt':{'seed':200610,'count':430,'center':belt_center,'radius':430,'thickness':42},
      'stations':[{'id':label,'center':p,'radius':r} for label,p,r in station_specs],
      'assets':{'full':full,'lod':lod,'observatoryLod':observatory_lod},'environmentImageDependencies':0,'geometryExcludesCabin':True,
      'runtimeNote':'Use volumes/flowCurves to render live world-space shaders; never render review PNG as a backdrop.'}
(MODELS/'tem-star-sea-v20.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'manifest.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
notes=bpy.data.texts.new('V20 — START HERE');notes.write('TEM Living Star Sea v20\nActive scene 04 has zero image nodes in World and newly authored external materials.\nAccepted v19 cabin, T and screen are linked without edits. Earlier scenes preserved.\nV20.01–03 are editable external geometry; asteroid instances use shared sculpted meshes.\nV20.04 contains actual noise-animated volumes; V20.05 actual editable geometric curves and moving photons.\nV20.06 contains 6000 solid emissive world-space stars.\nWeb full/LOD export excludes cabin, offline volumes, stars and paths. Matching world-space VFX schema: assets/models/tem-star-sea-v20.json.\nPlanet colour/roughness factors export; live shader adds procedural terrain, not a photograph.\nReference PNGs remain editor-only inherited v19 references; they are not environment assets.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tem-living-star-sea.blend'))
print('TEM_STAR_SEA_V20_COMPLETE '+json.dumps(spec,ensure_ascii=False),flush=True)
