import bpy,sys,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'blender/cinematic-v19'
args=sys.argv[sys.argv.index('--')+1:]
samples=int(args[args.index('--samples')+1]) if '--samples' in args else 64
scene=bpy.data.scenes['03 — TEM / Dream Observatory'];bpy.context.window.scene=scene
scene.camera=bpy.data.objects['CAMERA_profile_v19'];scene.render.engine='CYCLES'
scene.cycles.samples=samples;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.filepath=str(OUT/'tem-profile-render.png')
started=time.time();bpy.ops.render.render(write_still=True)
(OUT/'render-profile.json').write_text(json.dumps({'samples':samples,'engine':'CYCLES','seconds':round(time.time()-started,2),'file':scene.render.filepath,'source':str(OUT/'tem-dream-observatory.blend')},indent=2),encoding='utf8')
print('TEM_OBSERVATORY_RENDER_COMPLETE',flush=True)
