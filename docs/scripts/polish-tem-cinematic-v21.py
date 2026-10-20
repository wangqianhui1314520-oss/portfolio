"""Polish the saved v21 projects in place through fixed project MCP operations.

This is an incremental pass over the accepted engineering files. All historical
scenes, web roots, object origins and live typography projection are preserved.
New seam geometry is merged with existing materials for the web exports.
"""
import ast, bpy, bmesh, json, math, sys, shutil, time
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'blender/cinematic-v21'
MODELS = ROOT / 'assets/models'
BACKUP = OUT / 'pre-polish-20261008-lightshape'
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
target = args[args.index('--target') + 1] if '--target' in args else 'observatory'
if target not in ('observatory', 'fleet'):
    raise ValueError('Only the two saved v21 engineering projects are allowed')
if target == 'observatory':
    BACKUP = OUT / 'before-plinth-layer-04'
source = OUT / ('tem-refined-optical-observatory.blend' if target == 'observatory' else 'tem-refined-fleet.blend')
if Path(bpy.data.filepath).resolve() != source.resolve():
    raise RuntimeError('Polish must run against the saved selected v21 project')
BACKUP.mkdir(parents=True, exist_ok=True)
backup_files = [source, OUT / ('manifest.json' if target == 'observatory' else 'manifest-fleet.json')]
backup_files += list(MODELS.glob('tem-refined-' + target + '-v21*'))
for path in backup_files:
    if path.is_file() and not (BACKUP / path.name).exists():
        shutil.copy2(path, BACKUP / path.name)

def functions(script, names):
    tree = ast.parse((ROOT / 'scripts' / script).read_text(encoding='utf8'))
    wanted = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
    if len(wanted) != len(names):
        raise RuntimeError('Missing reviewed helpers')
    exec(compile(ast.Module(body=wanted, type_ignores=[]), script, 'exec'), globals())

def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def surface(m, color=None, **params):
    p = principled(m)
    if color:
        p.inputs['Base Color'].default_value = (*color, 1)
        m.diffuse_color = (*color, 1)
    for name, value in params.items():
        p.inputs[name.replace('_', ' ')].default_value = value

def find_material(prefix):
    return next(m for m in bpy.data.materials if m.name.startswith(prefix))

def rounded_path(corners, radius=.18, segments=10):
    result = []
    points = [Vector(p) for p in corners]
    for i, p in enumerate(points):
        a, b = points[i-1], points[(i+1) % len(points)]
        before = p + (a-p).normalized() * min(radius, (a-p).length*.25)
        after = p + (b-p).normalized() * min(radius, (b-p).length*.25)
        for j in range(segments+1):
            q = j/segments
            result.append(tuple((1-q)**2 * before + 2*(1-q)*q*p + q*q*after))
    return result

def configure_cycles(scene):
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = .012
    scene.cycles.max_bounces = 12
    scene.cycles.transmission_bounces = 10
    scene.cycles.glossy_bounces = 6
    scene.cycles.volume_bounces = 2
    scene.cycles.sample_clamp_indirect = 8
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 6
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = .38
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_depth = '16'

def remove_old_polish(scene):
    # Only our additive objects are replaced on re-run; original objects stay.
    for obj in list(scene.objects):
        if obj.get('tem_polish_revision') == '21.2':
            bpy.data.objects.remove(obj, do_unlink=True)

def mark(obj):
    obj['tem_polish_revision'] = '21.2'
    return obj

def volume_metadata(material, thickness):
    # The official exporter ignores Volume Absorption without this named
    # Thickness socket. It is metadata only: Cycles follows the real solid.
    # See installed io_scene_gltf2/.../extensions/volume.py, export_volume().
    group=bpy.data.node_groups.get('glTF Material Output')
    if group is None:group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
    if not any(s.name=='Thickness' and s.in_out=='INPUT' for s in group.interface.items_tree):
        socket=group.interface.new_socket(name='Thickness',in_out='INPUT',socket_type='NodeSocketFloat')
        socket.default_value=0;socket.min_value=0
    node=next((n for n in material.node_tree.nodes if n.type=='GROUP' and n.node_tree==group),None)
    if node is None:node=material.node_tree.nodes.new('ShaderNodeGroup');node.node_tree=group
    node.label='Physical closed-solid thickness for glTF';node.inputs['Thickness'].default_value=thickness

def optical_reflection_fill(world):
    # Keep the actual camera and diffuse world unchanged. A cool, non-image
    # interior reflection fill reveals curved glass without rectangular cards
    # appearing inside the crystal or inventing a second external sun.
    for node in list(world.node_tree.nodes):
        if node.get('tem_optics_source_03'):world.node_tree.nodes.remove(node)
    n=world.node_tree.nodes;l=world.node_tree.links
    base=next(node for node in n if node.type=='BACKGROUND')
    out=next(node for node in n if node.type=='OUTPUT_WORLD')
    pathnode=n.new('ShaderNodeLightPath');mix=n.new('ShaderNodeMixShader')
    multiply=n.new('ShaderNodeMath');multiply.operation='MULTIPLY'
    fill=n.new('ShaderNodeBackground');fill.inputs['Color'].default_value=(.30,.46,.66,1);fill.inputs['Strength'].default_value=.70
    for node in (pathnode,mix,multiply,fill):node['tem_optics_source_03']=True
    fill.label='Interior cool reflection fill — not an external star'
    l.new(pathnode.outputs['Is Glossy Ray'],multiply.inputs[0]);l.new(pathnode.outputs['Is Reflection Ray'],multiply.inputs[1]);l.new(multiply.outputs[0],mix.inputs[0]);l.new(base.outputs[0],mix.inputs[1]);l.new(fill.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs['Surface'])

def diagnose_observatory():
    """Fixed, read-only light/material ablations of the saved optical scene.

    A project-local request enables this reviewed diagnostic operation through
    the existing fixed MCP entry point. No scene, material or GLB is saved.
    All test renders run sequentially in this single Blender process.
    """
    request = OUT/'optics-diagnostic-request.json'
    if target != 'observatory' or not request.exists(): return
    settings=json.loads(request.read_text(encoding='utf8'))
    if settings.get('run') is not True or settings.get('pass') not in ('optics-source-03','optics-correction-03') or set(settings)!={'run','pass'}:
        raise ValueError('Unsupported optical diagnostic request')
    diagnostic_pass=settings['pass']
    if (OUT/('diagnostic-'+diagnostic_pass+'.json')).exists():
        raise RuntimeError('Accepted diagnostic evidence already exists; do not overwrite it from a different master state')
    request.replace(OUT/'optics-diagnostic-request-consumed.json')
    scene=bpy.data.scenes['05 — TEM / Refined Optical Observatory']
    bpy.context.window.scene=scene
    report={'pass':diagnostic_pass,'source':str(source),'engineeringSaved':False,
            'geometryChanged':False,'lights':[],'materials':[],'renders':[]}
    for obj in scene.objects:
        if obj.type!='LIGHT':continue
        d=obj.data
        report['lights'].append({'name':obj.name,'type':d.type,'energy':d.energy,
            'color':list(d.color),'positionBlender':list(obj.location),
            'diffuseFactor':getattr(d,'diffuse_factor',None),
            'specularFactor':getattr(d,'specular_factor',None),
            'visibleGlossy':getattr(obj,'visible_glossy',None),
            'visibleTransmission':getattr(obj,'visible_transmission',None),
            'hidden':obj.hide_render,'collections':[c.name for c in obj.users_collection]})
    for prefix in ('GLASS_V19 — V21 thick optical crystal','GLASS_V19 — V21 internal dichroic lamina','FLOOR_V19 — V21 polished optical basalt'):
        material=find_material(prefix);p=principled(material);inputs={}
        for socket in p.inputs:
            if not hasattr(socket,'default_value'):continue
            value=socket.default_value
            inputs[socket.name]=list(value) if hasattr(value,'__len__') else value
        report['materials'].append({'name':material.name,'principled':inputs,
            'links':[(l.from_node.type,l.from_socket.name,l.to_node.type,l.to_socket.name) for l in material.node_tree.links],
            'volumes':[{'type':n.type,'density':n.inputs['Density'].default_value,'color':list(n.inputs['Color'].default_value)} for n in material.node_tree.nodes if n.type=='VOLUME_ABSORPTION']})
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.cycles.adaptive_threshold=.03;scene.render.threads_mode='FIXED';scene.render.threads=6
    scene.render.resolution_x=800;scene.render.resolution_y=450;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_depth='16'
    scene.render.use_border=False;scene.frame_set(1)
    lights=[(o,o.data.energy) for o in scene.objects if o.type=='LIGHT']
    sun=next(o for o,_ in lights if o.data.type=='SUN')
    sun_rotation=sun.rotation_euler.copy();sun_receivers=sun.light_linking.receiver_collection
    test_receivers=None
    inner_obj=next(o for o in scene.objects if 'V21 dichroic internal pressure layer' in o.name)
    inner_hidden=inner_obj.hide_render
    world=scene.world;worldout=next(n for n in world.node_tree.nodes if n.type=='OUTPUT_WORLD')
    original_world=next(l.from_socket for l in world.node_tree.links if l.to_node==worldout and l.to_socket.name=='Surface')
    added=[]
    regions={'rightDeck':[.78,.99,.03,.17],'tStem':[.634,.687,.47,.73],
             'tCrossbar':[.57,.75,.79,.86],'plinth':[.54,.81,.20,.34]}
    def metrics(file):
        img=bpy.data.images.load(str(file),check_existing=False)
        w,h=img.size;pixels=list(img.pixels);stats={}
        for name,(x0,x1,y0,y1) in regions.items():
            values=[]
            for y in range(int(y0*h),int(y1*h)):
                for x in range(int(x0*w),int(x1*w)):
                    k=(y*w+x)*4;values.append(.2126*pixels[k]+.7152*pixels[k+1]+.0722*pixels[k+2])
            values.sort();stats[name]={'meanLinear':sum(values)/len(values),'p95Linear':values[int((len(values)-1)*.95)],'above075Fraction':sum(v>.75 for v in values)/len(values)}
        bpy.data.images.remove(img);return stats
    try:
        cases=('baseline','no-sun','no-warm-area','no-inner-lamina','glossy-world-fill') if diagnostic_pass=='optics-source-03' else ('sun-27deg','sun-40deg','linked-deck-fill')
        for case in cases:
            for obj,energy in lights:obj.data.energy=energy
            sun.rotation_euler=sun_rotation;sun.light_linking.receiver_collection=sun_receivers
            inner_obj.hide_render=inner_hidden
            for node in added:world.node_tree.nodes.remove(node)
            added=[];world.node_tree.links.new(original_world,worldout.inputs['Surface'])
            if case=='no-sun':
                for obj,_ in lights:
                    if obj.data.type=='SUN':obj.data.energy=0
            elif case=='no-warm-area':
                for obj,_ in lights:
                    if obj.data.type=='AREA' and ('warm key' in obj.name or 'Warm contact shoulder' in obj.name):obj.data.energy=0
            elif case=='no-inner-lamina':inner_obj.hide_render=True
            elif case in ('sun-27deg','sun-40deg'):
                direction=Vector((.48,.84,.50 if case=='sun-27deg' else .80))
                sun.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
            if case=='linked-deck-fill':
                test_receivers=bpy.data.collections.new('V21.3 — direct sun / deck diagnostic exclusion')
                deck=next(o for o in scene.objects if 'V21 continuous reflective pressure deck' in o.name)
                test_receivers.objects.link(deck)
                test_receivers.collection_objects[0].light_linking.link_state='EXCLUDE'
                sun.light_linking.receiver_collection=test_receivers
            if case in ('glossy-world-fill','linked-deck-fill'):
                n=world.node_tree.nodes;l=world.node_tree.links
                pathnode=n.new('ShaderNodeLightPath');mix=n.new('ShaderNodeMixShader')
                multiply=n.new('ShaderNodeMath');multiply.operation='MULTIPLY'
                fill=n.new('ShaderNodeBackground');fill.inputs['Color'].default_value=(.30,.46,.66,1);fill.inputs['Strength'].default_value=.70
                l.new(pathnode.outputs['Is Glossy Ray'],multiply.inputs[0]);l.new(pathnode.outputs['Is Reflection Ray'],multiply.inputs[1]);l.new(multiply.outputs[0],mix.inputs[0]);l.new(original_world,mix.inputs[1]);l.new(fill.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],worldout.inputs['Surface'])
                added=[pathnode,mix,multiply,fill]
            file=OUT/('diagnostic-'+diagnostic_pass+'-'+case+'.png')
            scene.render.filepath=str(file);started=time.time()
            bpy.ops.render.render(write_still=True)
            report['renders'].append({'case':case,'file':str(file),'samples':16,'size':[800,450],
                'seconds':round(time.time()-started,2),'regions':metrics(file)})
            (OUT/('diagnostic-'+diagnostic_pass+'.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
            print('TEM_OPTICAL_ABLATION_COMPLETE',case,json.dumps(report['renders'][-1]),flush=True)
    finally:
        for obj,energy in lights:obj.data.energy=energy
        sun.rotation_euler=sun_rotation;sun.light_linking.receiver_collection=sun_receivers
        if test_receivers:bpy.data.collections.remove(test_receivers)
        inner_obj.hide_render=inner_hidden
        for node in added:world.node_tree.nodes.remove(node)
        world.node_tree.links.new(original_world,worldout.inputs['Surface'])
    print('TEM_V21_OPTICS_DIAGNOSTIC_COMPLETE — no engineering or GLB saved',flush=True)
    raise SystemExit(0)

diagnose_observatory()

if target == 'observatory':
    scene = bpy.data.scenes['05 — TEM / Refined Optical Observatory']
    bpy.context.window.scene = scene
    remove_old_polish(scene)
    functions('build-tem-star-sea-v20.py', {'B', 'mesh', 'box', 'tube', 'ring', 'sphere'})
    functions('build-tem-refined-observatory-v21.py', {'group', 'parent', 'catmull', 'smooth_mesh', 'soften', 'export_asset'})
    cabin = bpy.data.collections['V21.01 — Sculpted viewing terrace and pressure canopy']
    identity = bpy.data.collections['V21.02 — Solid optical crystal identity']
    screen = bpy.data.collections['V21.03 — Fine laminated curved reading glass']
    exterior = bpy.data.collections['V21.04 — Reserved compatibility exterior root']
    exports = bpy.data.collections['V21.09 — Private merged web exports']
    rig = bpy.data.collections['V21.05 — Controlled cinematic illumination']
    croot = bpy.data.objects['AUTHOR_V21_CABIN']
    troot = bpy.data.objects['AUTHOR_V21_IDENTITY']
    froot = bpy.data.objects['AUTHOR_V21_DISPLAY']
    eroot = bpy.data.objects['AUTHOR_V21_EXTERIOR_RESERVED']
    pearl = find_material('V21_PEARL_CERAMIC')
    titanium = find_material('V21_TITANIUM')
    warm = find_material('V21_CHAMPAGNE')
    dark = find_material('V21_DARK_PRESSURE')
    cyan = find_material('V21_EMISSION_CYAN')
    violet = find_material('V21_EMISSION_VIOLET')
    floor = find_material('FLOOR_V19 — V21 polished optical basalt')
    glass = find_material('GLASS_V19 — V21 thick optical crystal')
    inner = find_material('GLASS_V19 — V21 internal dichroic lamina')
    displayglass = find_material('GLASS_V19 — V21 pressure display front')
    displayinner = find_material('GLASS_V19 — V21 internal display lamina')

    surface(pearl, (.60,.66,.73), Roughness=.23, Metallic=.12, Coat_Weight=.40, Coat_Roughness=.16, Specular_IOR_Level=.42)
    surface(titanium, (.10,.15,.21), Roughness=.28, Metallic=.68, Coat_Weight=.20)
    surface(warm, (.38,.27,.15), Roughness=.24, Metallic=.78, Coat_Weight=.20)
    surface(floor, (.025,.042,.070), Roughness=.31, Metallic=.24, Coat_Weight=.16, Coat_Roughness=.25, Specular_IOR_Level=.32)
    surface(glass, (.86,.93,.99), Roughness=.043, Transmission_Weight=.94, IOR=1.468, Coat_Weight=.22, Coat_Roughness=.09, Specular_IOR_Level=.50)
    surface(inner, (.88,.94,1), Roughness=.035, Transmission_Weight=1.0, IOR=1.035, Coat_Weight=.035, Specular_IOR_Level=.20)
    surface(displayglass, (.87,.95,1), Roughness=.037, Transmission_Weight=.975, IOR=1.457, Coat_Weight=.18, Coat_Roughness=.08, Specular_IOR_Level=.44)
    surface(displayinner, (.96,.98,1), Roughness=.023, Transmission_Weight=1.0, IOR=1.018, Coat_Weight=0, Specular_IOR_Level=.16)
    for m in (glass, displayglass):
        for n in m.node_tree.nodes:
            if n.type == 'VOLUME_ABSORPTION':
                n.inputs['Color'].default_value = (.67,.83,.99,1)
                n.inputs['Density'].default_value = .008 if m == glass else .004
    for material,thickness in ((glass,2.98),(inner,.87086),(displayglass,.192),(displayinner,.036),(find_material('GLASS_V19 — V21 platform optical lens'),.19)):
        volume_metadata(material,thickness)
    for m in (cyan, violet):
        principled(m).inputs['Emission Strength'].default_value = 2.05 if m == cyan else 1.85

    contact = bpy.data.materials.get('V21_CONTACT_TITANIUM — bead-blasted optical shoe')
    if contact is None:
        contact = bpy.data.materials.new('V21_CONTACT_TITANIUM — bead-blasted optical shoe')
        contact.use_nodes = True
    surface(contact, (.16,.20,.26), Roughness=.31, Metallic=.55,
            Coat_Weight=.14, Coat_Roughness=.22, Specular_IOR_Level=.28)
    # Retain each original pressure shoe as a real closed, depth-bearing clamp.
    # Rescale its unmodified base mesh about its own center (Blender X/depth/Z),
    # so repeated polishing does not shrink it or move the accepted T origin.
    for obj in identity.objects:
        if obj.name.startswith('Small crystal ceramic contact shoe'):
            lo = Vector(tuple(min(v.co[k] for v in obj.data.vertices) for k in range(3)))
            hi = Vector(tuple(max(v.co[k] for v in obj.data.vertices) for k in range(3)))
            center = (lo+hi)*.5
            dimensions = (.18,1.90,.48)
            for v in obj.data.vertices:
                for k in range(3):
                    v.co[k] = center[k]+(v.co[k]-center[k])*dimensions[k]/(hi[k]-lo[k])
            obj.data.update()
            for modifier in obj.modifiers:
                if modifier.type == 'BEVEL': modifier.width=.055;modifier.segments=5
            obj.data.materials.clear(); obj.data.materials.append(contact)
            obj['tem_contact_pass']='contact-shoulder-02'
    for side in (-1, 1):
        for y in (-7.51, 6.13):
            x = side * (2.09 if y < 0 else 7.0)
            mark(parent(soften(box('V21.2 Flush ceramic pressure-shoe face',
                (x,y,.846),(.10,.22,.050),pearl,identity),.018,4),troot))

    # Fine warm contact rails follow the real T silhouette, not a bounding box.
    t_outline = [(-7.00,4.77,1.20),(-1.98,4.77,1.20),(-1.98,-7.49,1.20),
                 (1.98,-7.49,1.20),(1.98,4.77,1.20),(7.00,4.77,1.20),
                 (7.00,7.49,1.20),(-7.00,7.49,1.20)]
    for z, radius, material, label in [(1.20,.038,warm,'Front precision crystal contact'),(-1.19,.052,titanium,'Back pressure crystal contact')]:
        path = rounded_path([(x,y,z) for x,y,_ in t_outline],.18,10)
        mark(parent(tube('V21.2 '+label,path,radius,material,identity,8,True),troot))
    for side in (-1,1):
        for y in (-7.18,6.35):
            x = side * (2.06 if y < 0 else 6.92)
            mark(parent(soften(box('V21.2 Flush optical pressure bridge',(x,y,0),(.11,.22,2.35),warm,identity),.025,4),troot))
    # The actual screen is thicker on its side edge without moving its front.
    for obj in screen.objects:
        if 'curved front pressure laminate' in obj.name:
            if not obj.get('tem_thickness_polished'):
                for v in obj.data.vertices:
                    # B(x,y,z)=(x,-z,y). Move only the rear half 0.06 backward.
                    x,y = v.co.x, v.co.z
                    front = -(x*x*.0054+y*y*.0007+.018+.066)
                    if v.co.y > front+.08: v.co.y += .060
                obj.data.update()
                obj['tem_thickness_polished'] = True
                smooth_mesh(obj)
    for side in (-1,1):
        for y in (-4.78,4.78):
            x = side*6.33
            mark(parent(soften(box('V21.2 Precision ceramic pressure bracket',(x,y,.08),(.125,.36,.25),pearl,screen),.041,4),froot))
            mark(parent(soften(box('V21.2 Recessed bracket fastening',(x,y,.245),(.055,.12,.022),titanium,screen),.012,3),froot))

    # Additional pressure strata on the accepted plinth, exact deck unchanged.
    for r,y,w,m in [(7.16,-5.28,.070,warm),(6.95,-5.45,.080,dark),(6.78,-5.16,.030,titanium)]:
        mark(parent(ring('V21.2 Plinth fine floating contact layer',(9.6,y,-17.4),r,w,m,cabin,128),croot))
    for j in range(18):
        a=j/18*math.tau
        p=(9.6+math.cos(a)*6.95,-5.21,-17.4+math.sin(a)*6.95)
        mark(parent(soften(box('V21.2 Plinth flush pressure microjoint',p,(.08,.07,.15),titanium,cabin),.018,3),croot))
    # A closed ceramic shoulder joins the existing torus to its load-bearing
    # underside. Its curved section catches a travelling light gradient,
    # giving the accepted platform a manufactured body rather than a wire rim.
    profile=[(7.20,-5.55),(7.48,-5.61),(7.78,-5.60),(8.06,-5.50),
             (8.27,-5.35),(8.39,-5.16),(8.38,-5.02),(8.29,-4.90),
             (8.15,-4.83),(7.96,-4.82),(7.78,-4.87),(7.64,-4.98),
             (7.55,-5.12),(7.40,-5.25),(7.28,-5.31),(7.20,-5.34)]
    plinth_pearl=bpy.data.materials.get('V21_PLINTH_PEARL — satin electroceramic')
    if plinth_pearl is None:plinth_pearl=bpy.data.materials.new('V21_PLINTH_PEARL — satin electroceramic');plinth_pearl.use_nodes=True
    surface(plinth_pearl,(.62,.69,.76),Roughness=.275,Metallic=.035,
            Coat_Weight=.35,Coat_Roughness=.20,Specular_IOR_Level=.36)
    # The old shoulder's majority sat below the deck (-5.32). Keep its radial
    # envelope and replace only that added shoulder with a real sectional
    # assembly above the deck. The accepted optical lens and T remain fixed.
    upper_profile=[(7.20,-5.00),(7.70,-5.02),(8.10,-5.02),(8.34,-5.00),
        (8.38,-4.86),(8.29,-4.70),(8.15,-4.60),(7.96,-4.58),
        (7.78,-4.63),(7.64,-4.74),(7.55,-4.88),(7.40,-4.98)]
    lower_profile=[(7.24,-5.52),(7.65,-5.54),(8.08,-5.40),(8.27,-5.28),
        (8.35,-5.17),(8.10,-5.17),(7.80,-5.20),(7.56,-5.27),(7.24,-5.31)]
    def plinth_section(name,section,a0,a1,steps,material,closed=False,bevel=0):
        vertices=[];faces=[];count=len(section);rings=steps if closed else steps+1
        for j in range(rings):
            a=a0+(a1-a0)*j/steps;wave=.12*math.sin(a*2+.35)
            for radius,y in section:vertices.append((9.6+math.cos(a)*(radius+wave),y,-17.4+math.sin(a)*(radius+wave)))
        for j in range(steps):
            nxt=(j+1)%rings
            for k in range(count):faces.append((j*count+k,nxt*count+k,nxt*count+(k+1)%count,j*count+(k+1)%count))
        if not closed:faces.extend([tuple(reversed(range(count))),tuple((rings-1)*count+k for k in range(count))])
        obj=mesh(name,vertices,faces,material,cabin);smooth_mesh(obj)
        if bevel:soften(obj,bevel,3)
        obj['tem_plinth_part']=name;return mark(parent(obj,croot))
    for j in range(8):
        a0=j/8*math.tau+.010;a1=(j+1)/8*math.tau-.010
        plinth_section('V21.7 Plinth upper ceramic sector %02d'%j,upper_profile,a0,a1,22,plinth_pearl,bevel=.012)
        plinth_section('V21.7 Plinth lower load-bearing ceramic sector %02d'%j,lower_profile,a0,a1,22,plinth_pearl,bevel=.012)
    plinth_section('V21.7 Plinth continuous recessed pressure carrier',
        [(7.95,-5.23),(8.15,-5.23),(8.15,-4.99),(7.95,-4.99)],0,math.tau,176,dark,True)
    plinth_section('V21.7 Plinth solid optical light-guide interlayer',
        [(8.10,-5.19),(8.35,-5.19),(8.35,-5.00),(8.10,-5.00)],0,math.tau,176,
        find_material('GLASS_V19 — V21 platform optical lens'),True)
    for j in range(4):
        a=j/4*math.tau+.12;wave=.12*math.sin(a*2+.35);radius=8.19+wave
        support=soften(box('V21.7 Plinth real ceramic compression key %02d'%j,
            (9.6+math.cos(a)*radius,-5.115,-17.4+math.sin(a)*radius),
            (.30,.29,.16),plinth_pearl,cabin),.025,4)
        # Geometry is authored around the actual radial center. Rotate its
        # vertices, not the object origin, to retain absolute web coordinates.
        center=B((9.6+math.cos(a)*radius,-5.115,-17.4+math.sin(a)*radius))
        for v in support.data.vertices:
            dx=v.co.x-center.x;dz=-(v.co.y-center.y)
            v.co.x=center.x+math.cos(a)*dx-math.sin(a)*dz
            v.co.y=center.y-(math.sin(a)*dx+math.cos(a)*dz)
        support['tem_plinth_part']='compression-key';mark(parent(support,croot))
        points=[]
        for k in range(32):
            angle=a-.19+k/31*.38;r=8.155+.12*math.sin(angle*2+.35)
            points.append((9.6+math.cos(angle)*r,-5.10,-17.4+math.sin(angle)*r))
        emitter=tube('V21.7 Plinth embedded light-guide source %02d'%j,points,.0125,cyan,cabin,8)
        emitter['tem_plinth_part']='embedded-guide-source';mark(parent(emitter,croot))
    # Broad fill plus narrow real reflected sources establish curvature.
    for obj in rig.objects:
        if obj.type != 'LIGHT': continue
        if obj.data.type == 'AREA':
            if 'warm key' in obj.name: obj.data.energy=1800
            if 'azure cabin' in obj.name: obj.data.energy=2800
            if 'soft crystal' in obj.name: obj.data.energy=1100
            if 'amethyst' in obj.name: obj.data.energy=1050
        if obj.data.type == 'SUN':
            obj.data.energy=.72;obj.data.angle=.065
            # Keep the external sun coherent with the planet/star-sea world.
            # Actual ablations proved its low grazing footprint caused the
            # broad floor glare. Use an explicit cabin receiver control,
            # rather than a specular_factor tweak Cycles did not respect.
            obj.rotation_euler=(-B((.48,.19,-.84))).to_track_quat('-Z','Y').to_euler()
            if hasattr(obj.data,'diffuse_factor'):obj.data.diffuse_factor=1.0
            if hasattr(obj.data,'specular_factor'):obj.data.specular_factor=1.0
            receivers=bpy.data.collections.get('V21.3 — interior deck solar receiver control')
            if receivers is None:receivers=bpy.data.collections.new('V21.3 — interior deck solar receiver control')
            deck=next(o for o in cabin.objects if 'V21 continuous reflective pressure deck' in o.name)
            if deck.name not in receivers.objects:receivers.objects.link(deck)
            receivers.collection_objects[0].light_linking.link_state='EXCLUDE'
            obj.light_linking.receiver_collection=receivers
    def strip(name,p,to,power,color,size,ratio):
        d=bpy.data.lights.new('V21.2 '+name,'AREA');d.energy=power;d.color=color;d.shape='RECTANGLE';d.size=size;d.size_y=size*ratio
        o=bpy.data.objects.new('V21.2 '+name,d);rig.objects.link(o);o.location=B(p)
        o.rotation_euler=(B(to)-o.location).to_track_quat('-Z','Y').to_euler()
        if hasattr(d,'diffuse_factor'):d.diffuse_factor=.6
        if hasattr(d,'specular_factor'):d.specular_factor=.8
        # Emitters illuminate the surfaces; their rectangular camera-path
        # silhouettes must not masquerade as solid components inside glass.
        if hasattr(o,'visible_glossy'):o.visible_glossy=False
        if hasattr(o,'visible_transmission'):o.visible_transmission=False
        mark(o);return o
    strip('Cold crystal knife edge',(-3,11,6),(9.6,6,-17),750,(.55,.78,1),11,.025)
    strip('Warm contact shoulder',(20,14,-8),(9.6,5,-17),600,(1,.80,.57),9,.025)
    strip('Front laminated reading edge',(-15,10,8),(-8.3,1.45,-2),300,(.61,.84,1),9,.018)
    strip('Deck soft horizon glint',(2,1,-28),(8,-5,-10),520,(.52,.67,1),18,.018)
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    bg.inputs['Strength'].default_value=.48
    optical_reflection_fill(scene.world)
    configure_cycles(scene)
    authored=[('CABIN_V19',cabin,croot),('T_IDENTITY_V19',identity,troot),('SURFACE_FRAME_V19',screen,froot),('EXTERIOR_V19',exterior,eroot)]
    full=export_asset();lod=export_asset(True)
    spec=json.loads((MODELS/'tem-refined-observatory-v21.json').read_text(encoding='utf8'))
    spec['revision']='21.7';spec['assets']={'full':full,'lod':lod}
    spec['materialGuide']['crystal'].update(transmission=.94,roughness=.043,ior=1.468,attenuationColor=[.67,.83,.99],attenuationDistance=125,thickness=2.98,edgeThickness=2.36)
    spec['materialGuide']['floor'].update(metalness=.24,roughness=.31,clearcoat=.16,specularIntensity=.32)
    spec['materialGuide']['ceramic'].update(metalness=.12,roughness=.23,clearcoat=.40)
    spec['polish']={'source':'accepted saved v21 engineering project','pass':'optics-source-03','previousPass':'contact-shoulder-02','displayFrontPosePreserved':True,'addedDisplayRearDepth':.060,'closedCrystalContactRails':True,'closedSculptedPlinthShoulder':True,'shoulderSectionPoints':len(profile),'shoulderTopY':-4.82,'pressureShoeFlushCeramicFaces':True,'pressureShoeSize':[.18,.48,1.90],'pressureShoeMaterial':{'metalness':.55,'roughness':.31,'clearcoat':.14,'specularIntensity':.28},'cameraPathEmitterRectangles':False,'externalSunDirectionPreserved':True,'interiorDeckSolarReceiverExcluded':True,'glossyReflectionWorldFill':{'color':[.30,.46,.66],'strength':.70,'cameraAndDiffuseWorldUnchanged':True},'imageTextures':0}
    spec['opticalVolumes']={'GLASS_V19 — V21 thick optical crystal':{'thickness':2.98,'attenuationColor':[.67,.83,.99],'attenuationDistance':125},'GLASS_V19 — V21 internal dichroic lamina':{'thickness':.87086,'attenuationDistance':'infinity'},'GLASS_V19 — V21 pressure display front':{'thickness':.192,'attenuationColor':[.67,.83,.99],'attenuationDistance':250},'GLASS_V19 — V21 internal display lamina':{'thickness':.036,'attenuationDistance':'infinity'},'GLASS_V19 — V21 platform optical lens':{'thickness':.19,'attenuationColor':[.39,.66,.88],'attenuationDistance':83.3333333333}}
    spec['lightingIntegration']='The GLB contains geometry/materials only. Blender light-linking and reflection-path world fill are editable engineering controls; runtime must explicitly reproduce cabin lighting. Preserve shared external sun [.48,.19,-.84].'
    spec['polish'].update({'pass':'plinth-layer-04','previousPass':'optics-source-03','shoulderTopY':-4.58,'segmentedPlinthCeramicSectors':16,'physicalGlassGuideLayer':True,'continuousPressureCarrier':True,'compressionKeys':4,'embeddedGuideSources':4})
    spec['plinthAssembly']={'centerXZ':[9.6,-17.4],'originalLensPreserved':True,'maximumRadialEnvelope':8.51,'deckY':-5.32,'upperShoulderY':-4.58,'localTopLift':.24,'glassGuideY':[-5.19,-5.00],'upperCeramicMetalness':.035,'upperCeramicRoughness':.275,'lightGuideUsesExistingPlatformVolume':True,'allPartsHavePhysicalContacts':True}
    (MODELS/'tem-refined-observatory-v21.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
    (OUT/'manifest.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf8')
else:
    scene=bpy.data.scenes['06 — TEM / Refined Fleet'];bpy.context.window.scene=scene
    remove_old_polish(scene)
    functions('build-tem-refined-fleet-v21.py',{'B','move','mesh','box','ring','tube','web_copy'})
    author=bpy.data.collections['V21.Fleet — editable four distinct craft']
    exports=bpy.data.collections['V21.Fleet — web material batches']
    rig=bpy.data.collections['V21.Fleet — photographic review rig']
    roots=[bpy.data.objects['AUTHOR_REFINED_SHIP_'+str(i)] for i in range(4)]
    pearl=find_material('V21_FLEET_PEARL');titanium=find_material('V21_FLEET_TITANIUM')
    warm=find_material('V21_FLEET_CHAMPAGNE');dark=find_material('V21_FLEET_PRESSURE');glass=find_material('V21_FLEET_GLASS')
    accents=[find_material('V21_FLEET_EMISSION_'+str(i)) for i in range(4)]
    surface(pearl,(.55,.64,.75),Roughness=.215,Metallic=.12,Coat_Weight=.38,Coat_Roughness=.12,Specular_IOR_Level=.45)
    surface(titanium,(.16,.22,.31),Roughness=.27,Metallic=.76,Coat_Weight=.25)
    surface(warm,(.40,.285,.16),Roughness=.22,Metallic=.78)
    surface(glass,(.40,.70,.91),Roughness=.04,Transmission_Weight=.90,IOR=1.452,Coat_Roughness=.08,Specular_IOR_Level=.45)
    bpy.context.view_layer.update()
    radiator_review=[]
    for i,root in enumerate(roots):
        # The old dark material batches contain real heat-exchanger meshes.
        # In three ships, a historical merged-object rotation put those small
        # cubes vertically above the hull. Locate their original connected
        # geometry; reseat it rather than deleting or replacing the details.
        fins=[]
        for obj in list(root.children):
            if obj.type!='MESH' or not any(slot.material==dark for slot in obj.material_slots):continue
            transform=root.matrix_world.inverted() @ obj.matrix_world
            parent_indices=list(range(len(obj.data.vertices)))
            def find(index):
                while parent_indices[index]!=index:
                    parent_indices[index]=parent_indices[parent_indices[index]];index=parent_indices[index]
                return index
            for edge in obj.data.edges:
                a,b=[find(index) for index in edge.vertices]
                if a!=b:parent_indices[b]=a
            components={}
            for vertex in obj.data.vertices:components.setdefault(find(vertex.index),[]).append(vertex.index)
            for indices in components.values():
                if len(indices)<8:continue
                points=[transform @ obj.data.vertices[j].co for j in indices]
                # Convert Blender local positions back to browser local Y-up.
                xyz=[Vector((p.x,p.z,-p.y)) for p in points]
                lo=Vector(tuple(min(p[k] for p in xyz) for k in range(3)))
                hi=Vector(tuple(max(p[k] for p in xyz) for k in range(3)))
                size=hi-lo;center=(hi+lo)*.5
                upright=abs(size.y-.035)<.003 and abs(size.z-.046)<.003
                seated=abs(size.y-.046)<.003 and abs(size.z-.035)<.003
                if abs(size.x-.20)<.005 and (upright or seated):
                    fins.append({'object':obj,'indices':indices,'transform':transform,'center':center,'upright':upright})
        if len(fins)!=10:raise RuntimeError('Expected ten preserved heat-exchanger fins in craft '+str(i)+', found '+str(len(fins)))
        midpoint=sum(fin['center'].x for fin in fins)/len(fins)
        groups=[sorted([f for f in fins if f['center'].x<midpoint],key=lambda f:f['center'].y if f['upright'] else f['center'].z),
                sorted([f for f in fins if f['center'].x>=midpoint],key=lambda f:f['center'].y if f['upright'] else f['center'].z)]
        before_centers=[list(fin['center']) for fin in fins]
        for side,group_fins in zip((-1,1),groups):
            if len(group_fins)!=5:raise RuntimeError('Heat-exchanger bank component count changed')
            for j,fin in enumerate(group_fins):
                destination=Vector((side*.43,.29,-1.50+j*.12))
                inverse=fin['transform'].inverted()
                for index in fin['indices']:
                    vertex=fin['object'].data.vertices[index]
                    p=fin['transform'] @ vertex.co
                    delta=Vector((p.x,p.z,-p.y))-fin['center']
                    if fin['upright']:delta=Vector((delta.x,delta.z,-delta.y))
                    vertex.co=inverse @ B(destination+delta)
                fin['object'].data.update()
            # Real pressure-contact structure touches both hull and fin bottoms.
            mark(box('V21.2 Heat-exchanger ceramic saddle',(side*.43,.20,-1.26),(.28,.14,.78),pearl,root,.022))
            mark(box('V21.2 Recessed radiator pressure slot',(side*.43,.273,-1.26),(.225,.018,.65),dark,root,.008))
            mark(tube('V21.2 Radiator pressure contact seal',[(side*.555,.272,-1.60),(side*.555,.272,-.92),(side*.305,.272,-.92),(side*.305,.272,-1.60)],.0065,warm,root))
        for obj in {fin['object'] for fin in fins}:
            bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(obj.data);bm.free()
        radiator_review.append({'ship':'SHIP_'+str(i),'preservedFins':len(fins),'previousCenters':before_centers,'newBankCenters':[[-.43,.29,-1.26],[.43,.29,-1.26]],'contact':'ceramic saddle + recessed pressure slot; original fin meshes retained'})
    for i,root in enumerate(roots):
        # All new geometry is local to the existing craft and category origin.
        for side in (-1,1):
            mark(tube('V21.2 Hull gold contact seam',[(side*.18,.17,2.55),(side*.36,.29,1.8),(side*.47,.37,.6),(side*.42,.32,-.6),(side*.30,.22,-2.45)],.009,warm,root))
            mark(tube('V21.2 Recessed double wing contact',[(side*.46,.018,1.62),(side*1.35,-.044,.76),(side*1.66,-.04,-.98),(side*.77,-.012,-1.80)],.011,titanium,root))
            # Real nozzle cooling petals and a ceramic outer pressure housing.
            for j in range(12):
                a=j/12*math.tau
                x=side*.82+math.cos(a)*.235;y=-.18+math.sin(a)*.235
                obj=mark(box('V21.2 Nozzle ceramic pressure petal',(x,y,-3.14),(.046,.035,.16),pearl,root,.009))
                obj.rotation_euler.y=-a
            mark(ring('V21.2 Fine aft nozzle contact',(side*.82,-.18,-3.235),.202,.008,warm,root))
            for j in range(5):
                mark(box('V21.2 Dorsal service bridge',(side*.445,.373,-1.40+j*.21),(.058,.060,.038),titanium,root,.010))
            # Illuminated status apertures remain tiny and recessed.
            for j in range(3):
                mark(box('V21.2 Recessed approach status',(side*.38,.34,.05+j*.12),(.022,.012,.044),accents[i],root,.004))
        mark(tube('V21.2 Observation window pressure contour',[(-.18,.48,-.18),(-.245,.64,.31),(-.15,.61,.91),(0,.385,1.33),(.15,.61,.91),(.245,.64,.31),(.18,.48,-.18)],.012,warm,root))
        if i==0:
            for side in (-1,1):
                mark(tube('V21.2 Interceptor swept spine',[(side*.12,.39,-2.4),(side*.16,.61,-1.4),(side*.11,.58,-.35)],.025,titanium,root))
        elif i==1:
            for j in range(8):
                a=j/8*math.tau
                mark(box('V21.2 Optical collar ceramic hinge',(math.cos(a)*1.12,.19,-.52+math.sin(a)*1.12),(.10,.08,.10),pearl,root,.018))
        elif i==2:
            for side in (-1,1):
                mark(tube('V21.2 Narrative sail warm trailing contact',[(side*.32,.28,-1.42),(side*.76,1.50,-1.11),(side*1.48,2.35,-1.22),(side*1.80,.67,-.35)],.011,warm,root))
        else:
            for side in (-1,1):
                for j in range(3):
                    mark(box('V21.2 Lab hatch recessed service catch',(side*.80,.32,-.18+j*.39),(.068,.030,.055),warm,root,.008))
    # Export with genuine local craft origins; staging transforms restored below.
    poses=[(r.location.copy(),r.rotation_euler.copy()) for r in roots]
    for obj in author.objects:
        if obj.type=='CURVE':obj.data.use_fill_caps=True
    for r in roots:r.location=(0,0,0);r.rotation_euler=(0,0,0)
    bpy.context.view_layer.update()
    for obj in list(exports.objects):bpy.data.objects.remove(obj,do_unlink=True)
    exports.hide_render=False
    full=web_copy();lod=web_copy(True);exports.hide_render=True
    for root,(location,rotation) in zip(roots,poses):root.location=location;root.rotation_euler=rotation
    configure_cycles(scene)
    for obj in rig.objects:
        if obj.type=='LIGHT':
            if 'stellar key' in obj.name:obj.data.energy=2300
            if 'atmosphere rim' in obj.name:obj.data.energy=2150
    for name,p,power,color,size,ratio in [('Long cold shoulder',(-5,8,14),1200,(.55,.75,1),18,.06),('Warm fine edge',(2,6,-10),1050,(1,.77,.51),16,.04)]:
        d=bpy.data.lights.new('V21.2 '+name,'AREA');d.energy=power;d.color=color;d.shape='RECTANGLE';d.size=size;d.size_y=size*ratio
        obj=bpy.data.objects.new('V21.2 '+name,d);rig.objects.link(obj);obj.location=B(p)
        obj.rotation_euler=(B((0,.4,0))-obj.location).to_track_quat('-Z','Y').to_euler();mark(obj)
    manifest={'version':21,'revision':'21.2','source':'saved v21 engineering scene refined in place','assets':[full,lod],'newGeometry':'pressure petals, warm service contact seams, collar hinges, live status apertures and attached heat-exchanger banks','imageTextures':0,'radiatorSupport':radiator_review}
    (OUT/'manifest-fleet.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')

notes=bpy.data.texts.get('V21.2 — POLISH PASS') or bpy.data.texts.new('V21.2 — POLISH PASS')
notes.clear();notes.write('Incremental polish of the actual saved v21 master. Prior scenes remain untouched.\nClosed pressure contact geometry, clearer optical materials, brighter pearl ceramic and narrow real rim sources.\nAuthoring typography and web semantic matrices retained. Full/compact exports derive from these same editable objects.\n96 samples + adaptive .012 + OIDN denoise, 1600x900 16-bit PNG. Rendering is for inspection only; no render is used as a web backdrop.\n')
if target=='observatory':
    diagnosis=bpy.data.texts.get('V21.3 — OPTICAL SOURCE DIAGNOSIS AND FIX') or bpy.data.texts.new('V21.3 — OPTICAL SOURCE DIAGNOSIS AND FIX')
    diagnosis.clear();diagnosis.write('optics-source-03 / revision 21.4 retained\nActual sequential Cycles ablations identified grazing SUN as the source of 98.75% of right-deck brightness. Warm area lights contributed only 0.34% there.\nThe external sun direction stays [.48,.19,-.84]. A dedicated interior deck EXCLUDE receiver collection controls its direct footprint; this is explicit artistic light linking.\nA cool reflection-path-only world fill reveals the clear crystal; visible camera world and diffuse illumination are unchanged.\nActual GLB volume extensions now carry the closed-solid optical thicknesses and absorption distances; the prior export lacked the required Thickness interface.\nNo image background. No moved surface or semantic root. The GLB contains no lights or light linking: runtime integration is separate.\n')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(source))
(OUT/('polish-'+target+'.json')).write_text(json.dumps({'revision':'21.7' if target=='observatory' else '21.2','pass':'plinth-layer-04' if target=='observatory' else 'radiator-contact-support','target':target,'blend':str(source),'backup':str(BACKUP),'assets':[full,lod],'saved':True},indent=2),encoding='utf8')
print('TEM_V21_POLISH_COMPLETE',target,json.dumps([full,lod]),flush=True)
