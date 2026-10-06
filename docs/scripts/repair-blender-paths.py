"""Repair relocated project paths in existing editable Blender files only.

Run with the installed Blender in background mode. Packed data stays packed;
geometry, materials, cameras and animation are not regenerated.
"""
from pathlib import Path
import os,json,bpy

ROOT=Path(__file__).resolve().parents[1]
BLENDER=(ROOT/'blender').resolve()
LEGACY=ROOT.parent
manifest=json.loads((ROOT/'docs/folder-migration.json').read_text(encoding='utf-8-sig'))
originals={item['target']:item['source'] for item in manifest['files']}
report={'projectRoot':str(ROOT),'files':[],'missingExternal':[]}

def mapped(text,project):
    if not text:return text
    normalized=text.replace('\\','/')
    relative=normalized.startswith('//')
    if relative:
        current=(project.parent/normalized[2:]).resolve()
        if current.exists():return text
        old_project=LEGACY/originals[project.relative_to(ROOT).as_posix()]
        normalized=(old_project.parent/normalized[2:]).resolve().as_posix()
    old_blender=(LEGACY/'_archive/tem-blender').as_posix()
    old_root=LEGACY.as_posix()
    if normalized.casefold().startswith(old_blender.casefold()+'/'):
        result=BLENDER/normalized[len(old_blender)+1:]
    elif normalized.casefold().startswith(old_root.casefold()+'/') and not normalized.casefold().startswith(ROOT.as_posix().casefold()+'/'):
        result=ROOT/normalized[len(old_root)+1:]
    else:return text
    result=result.resolve()
    if not result.is_relative_to(ROOT):raise RuntimeError('Relocated path escaped Tem')
    return '//'+os.path.relpath(result,project.parent).replace('\\','/') if relative else result.as_posix()

for project in sorted(BLENDER.rglob('*.blend')):
    if not project.resolve().is_relative_to(BLENDER):raise RuntimeError('Engineering file escaped Blender folder')
    bpy.ops.wm.open_mainfile(filepath=str(project),load_ui=False,use_scripts=False)
    changes=[]
    def update(owner,attribute,label):
        before=getattr(owner,attribute,'')
        if not isinstance(before,str) or not before:return
        after=mapped(before,project)
        if after!=before:
            setattr(owner,attribute,after);changes.append({'owner':label,'attribute':attribute,'before':before,'after':after})
    for collection in ('images','movieclips','sounds','libraries','cache_files','fonts','volumes'):
        for item in getattr(bpy.data,collection,[]):update(item,'filepath',collection+':'+item.name)
    for scene in bpy.data.scenes:
        update(scene.render,'filepath','render:'+scene.name)
    # Blender 5.2 stores compositing in node groups, while older files may
    # retain a scene node tree. Inspect both without depending on a locale.
    trees=list(bpy.data.node_groups)
    for scene in bpy.data.scenes:
        tree=getattr(scene,'node_tree',None)
        if tree:trees.append(tree)
    for tree in trees:
        for node in tree.nodes:
            for attribute in ('base_path','directory'):
                if hasattr(node,attribute):update(node,attribute,'node:'+node.name)
    if changes:
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(project),check_existing=False,relative_remap=False)
    report['files'].append({'file':project.relative_to(ROOT).as_posix(),'updatedPaths':len(changes),'changes':changes})

(ROOT/'docs/blender-path-repair.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('TEM_BLENDER_PATHS_REPAIRED',len(report['files']),sum(f['updatedPaths'] for f in report['files']))
