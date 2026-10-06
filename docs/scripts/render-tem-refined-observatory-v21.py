"""Fixed Cycles render of the actual v21 engineering scene."""
import bpy,sys,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'blender/cinematic-v21'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
samples=int(args[args.index('--samples')+1]) if '--samples' in args else 48
scene=bpy.data.scenes['05 — TEM / Refined Optical Observatory'];bpy.context.window.scene=scene
scene.camera=bpy.data.objects['CAMERA_refined_observatory_v21'];scene.frame_set(1)
scene.render.engine='CYCLES';scene.cycles.samples=samples;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.filepath=str(OUT/'tem-refined-observatory-render.png')
started=time.time();bpy.ops.render.render(write_still=True)
(OUT/'render-refined.json').write_text(json.dumps({'samples':samples,'engine':'CYCLES','seconds':round(time.time()-started,2),'file':scene.render.filepath,'source':str(OUT/'tem-refined-optical-observatory.blend'),'scene':scene.name,'environmentImages':0},indent=2),encoding='utf8')
print('TEM_REFINED_V21_RENDER_COMPLETE',flush=True)
