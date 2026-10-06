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
BACKUP = OUT / 'pre-polish-20261007'
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
target = args[args.index('--target') + 1] if '--target' in args else 'observatory'
if target not in ('observatory', 'fleet'):
    raise ValueError('Only the two saved v21 engineering projects are allowed')
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
    surface(floor, (.025,.042,.070), Roughness=.245, Metallic=.29, Coat_Weight=.28, Coat_Roughness=.17, Specular_IOR_Level=.36)
    surface(glass, (.86,.93,.99), Roughness=.043, Transmission_Weight=.94, IOR=1.468, Coat_Weight=.22, Coat_Roughness=.09, Specular_IOR_Level=.50)
    surface(inner, (.88,.94,1), Roughness=.035, Transmission_Weight=1.0, IOR=1.035, Coat_Weight=.035, Specular_IOR_Level=.20)
    surface(displayglass, (.87,.95,1), Roughness=.037, Transmission_Weight=.975, IOR=1.457, Coat_Weight=.18, Coat_Roughness=.08, Specular_IOR_Level=.44)
    surface(displayinner, (.96,.98,1), Roughness=.023, Transmission_Weight=1.0, IOR=1.018, Coat_Weight=0, Specular_IOR_Level=.16)
    for m in (glass, displayglass):
        for n in m.node_tree.nodes:
            if n.type == 'VOLUME_ABSORPTION':
                n.inputs['Color'].default_value = (.67,.83,.99,1)
                n.inputs['Density'].default_value = .008 if m == glass else .004
    for m in (cyan, violet):
        principled(m).inputs['Emission Strength'].default_value = 2.05 if m == cyan else 1.85

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
    # Broad fill plus narrow real reflected sources establish curvature.
    for obj in rig.objects:
        if obj.type != 'LIGHT': continue
        if obj.data.type == 'AREA':
            if 'warm key' in obj.name: obj.data.energy=1800
            if 'azure cabin' in obj.name: obj.data.energy=2800
            if 'soft crystal' in obj.name: obj.data.energy=1100
            if 'amethyst' in obj.name: obj.data.energy=1050
        if obj.data.type == 'SUN':obj.data.energy=.72;obj.data.angle=.065
    def strip(name,p,to,power,color,size,ratio):
        d=bpy.data.lights.new('V21.2 '+name,'AREA');d.energy=power;d.color=color;d.shape='RECTANGLE';d.size=size;d.size_y=size*ratio
        o=bpy.data.objects.new('V21.2 '+name,d);rig.objects.link(o);o.location=B(p)
        o.rotation_euler=(B(to)-o.location).to_track_quat('-Z','Y').to_euler()
        if hasattr(d,'diffuse_factor'):d.diffuse_factor=.6
        if hasattr(d,'specular_factor'):d.specular_factor=.8
        mark(o);return o
    strip('Cold crystal knife edge',(-3,11,6),(9.6,6,-17),750,(.55,.78,1),11,.025)
    strip('Warm contact shoulder',(20,14,-8),(9.6,5,-17),600,(1,.80,.57),9,.025)
    strip('Front laminated reading edge',(-15,10,8),(-8.3,1.45,-2),300,(.61,.84,1),9,.018)
    strip('Deck soft horizon glint',(2,1,-28),(8,-5,-10),520,(.52,.67,1),18,.018)
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    bg.inputs['Strength'].default_value=.48
    configure_cycles(scene)
    authored=[('CABIN_V19',cabin,croot),('T_IDENTITY_V19',identity,troot),('SURFACE_FRAME_V19',screen,froot),('EXTERIOR_V19',exterior,eroot)]
    full=export_asset();lod=export_asset(True)
    spec=json.loads((MODELS/'tem-refined-observatory-v21.json').read_text(encoding='utf8'))
    spec['revision']='21.2';spec['assets']={'full':full,'lod':lod}
    spec['materialGuide']['crystal'].update(transmission=.94,roughness=.043,ior=1.468,attenuationColor=[.67,.83,.99],attenuationDistance=16)
    spec['materialGuide']['floor'].update(metalness=.29,roughness=.245,clearcoat=.28,specularIntensity=.36)
    spec['materialGuide']['ceramic'].update(metalness=.12,roughness=.23,clearcoat=.40)
    spec['polish']={'source':'accepted saved v21 engineering project','displayFrontPosePreserved':True,'addedDisplayRearDepth':.060,'closedCrystalContactRails':True,'imageTextures':0}
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
                mark(box('V21.2 Optical collar ceramic hinge',(math.cos(a)*1.12,.19+math.sin(a)*1.12,-.38),(.07,.12,.17),pearl,root,.018))
        elif i==2:
            for side in (-1,1):
                mark(tube('V21.2 Narrative sail warm trailing contact',[(side*.32,.28,-1.42),(side*.76,1.50,-1.11),(side*1.48,2.35,-1.22),(side*1.80,.67,-.35)],.011,warm,root))
        else:
            for side in (-1,1):
                for j in range(3):
                    mark(box('V21.2 Lab hatch recessed service catch',(side*.80,.32,-.18+j*.39),(.068,.030,.055),warm,root,.008))
    # Export with genuine local craft origins; staging transforms restored below.
    poses=[(r.location.copy(),r.rotation_euler.copy()) for r in roots]
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
    manifest={'version':21,'revision':'21.2','source':'saved v21 engineering scene refined in place','assets':[full,lod],'newGeometry':'pressure petals, warm service contact seams, collar hinges and live status apertures','imageTextures':0}
    (OUT/'manifest-fleet.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')

notes=bpy.data.texts.get('V21.2 — POLISH PASS') or bpy.data.texts.new('V21.2 — POLISH PASS')
notes.clear();notes.write('Incremental polish of the actual saved v21 master. Prior scenes remain untouched.\nClosed pressure contact geometry, clearer optical materials, brighter pearl ceramic and narrow real rim sources.\nAuthoring typography and web semantic matrices retained. Full/compact exports derive from these same editable objects.\n96 samples + adaptive .012 + OIDN denoise, 1600x900 16-bit PNG. Rendering is for inspection only; no render is used as a web backdrop.\n')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(source))
(OUT/('polish-'+target+'.json')).write_text(json.dumps({'revision':'21.2','target':target,'blend':str(source),'backup':str(BACKUP),'assets':[full,lod],'saved':True},indent=2),encoding='utf8')
print('TEM_V21_POLISH_COMPLETE',target,json.dumps([full,lod]),flush=True)
