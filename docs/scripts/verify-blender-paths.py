"""Read saved engineering files and verify relocated resource/output paths."""
from pathlib import Path
import json,bpy

ROOT=Path(__file__).resolve().parents[1]
BLENDER=ROOT/'blender'
legacy=ROOT.parent.as_posix().casefold()+'/'
current=ROOT.as_posix().casefold()+'/'
report={'passed':True,'files':[]}
for project in sorted(BLENDER.rglob('*.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(project),load_ui=False,use_scripts=False)
    old=[];missing=[];packed=0
    for image in bpy.data.images:
        packed+=bool(image.packed_file)
        if not image.filepath:continue
        resolved=Path(bpy.path.abspath(image.filepath)).resolve()
        path=resolved.as_posix().casefold()
        if path.startswith(legacy) and not path.startswith(current):old.append(str(resolved))
        if not image.packed_file and image.source=='FILE' and not resolved.exists():missing.append(str(resolved))
    for scene in bpy.data.scenes:
        resolved=Path(bpy.path.abspath(scene.render.filepath)).resolve().as_posix().casefold()
        if resolved.startswith(legacy) and not resolved.startswith(current):old.append(scene.render.filepath)
    report['files'].append({'file':project.relative_to(ROOT).as_posix(),'packedImages':packed,'oldWorkspacePaths':old,'missingUnpackedImages':missing})
    report['passed'] &= not old and not missing
(ROOT/'docs/blender-path-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('TEM_BLENDER_PATH_VERIFICATION',report['passed'],len(report['files']))
if not report['passed']:raise RuntimeError('Engineering paths need repair; see verification report')
