"""Render actual v21 fleet geometry for visual inspection."""
import bpy,sys,time,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'blender/cinematic-v21'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
samples=int(args[args.index('--samples')+1]) if '--samples' in args else 32
scene=bpy.data.scenes['06 — TEM / Refined Fleet'];bpy.context.window.scene=scene
scene.camera=bpy.data.objects['CAMERA_fleet_v21'];scene.render.engine='CYCLES';scene.cycles.samples=samples
scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.filepath=str(OUT/'tem-refined-fleet-render.png')
start=time.time();bpy.ops.render.render(write_still=True)
shutil.copy2(scene.render.filepath,OUT/'tem-refined-fleet-render-polished.png')
(OUT/'render-fleet.json').write_text(json.dumps({'engine':'CYCLES','samples':samples,'seconds':round(time.time()-start,2),'source':'tem-refined-fleet.blend','file':scene.render.filepath},indent=2),encoding='utf-8')
print('TEM_REFINED_FLEET_RENDER_COMPLETE',flush=True)
