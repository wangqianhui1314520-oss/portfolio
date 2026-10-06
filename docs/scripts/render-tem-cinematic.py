import bpy,sys,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'blender/cinematic-v18'
args=sys.argv[sys.argv.index('--')+1:]
def arg(key,default):return args[args.index(key)+1] if key in args else default
camera=arg('--camera','profile');engine=arg('--engine','CYCLES');samples=int(arg('--samples','32'))
assert camera in ['profile','atlas'] and engine in ['CYCLES','BLENDER_EEVEE']
scene=bpy.data.scenes['01 — TEM / Observatory' if camera=='profile' else '02 — TEM / Creation Atlas']
bpy.context.window.scene=scene;scene.camera=bpy.data.objects['CAMERA_'+camera];scene.render.engine=engine
# Keep the interactive browser responsive while two camera jobs run locally.
scene.render.threads_mode='FIXED';scene.render.threads=6
if engine=='CYCLES':scene.cycles.samples=samples;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/('tem-'+camera+'-render.png'))
started=time.time();bpy.ops.render.render(write_still=True)
(OUT/('render-'+camera+'.json')).write_text(json.dumps({'camera':camera,'engine':engine,'samples':samples,'seconds':round(time.time()-started,2),'file':scene.render.filepath,'source':str(OUT/'tem-cinematic.blend')},indent=2),encoding='utf8')
print('TEM_RENDER_COMPLETE',flush=True)
