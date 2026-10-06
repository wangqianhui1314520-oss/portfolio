"""Executed in the cinematic author's namespace: editable finish + real UV bakes."""

def authored_finishes():
 for mat in [pearl,titanium,warm,dark,floor]:
  nt=mat.node_tree;p=nt.nodes.get('Principled BSDF');base=p.inputs['Roughness'].default_value
  bevel=nt.nodes.new('ShaderNodeBevel');bevel.name='Manufactured corner radius';bevel.samples=4
  bevel.inputs['Radius'].default_value=.025 if mat in [titanium,warm] else .045
  if p.inputs['Normal'].is_linked:nt.links.new(p.inputs['Normal'].links[0].from_socket,bevel.inputs['Normal'])
  nt.links.new(bevel.outputs['Normal'],p.inputs['Normal'])
  coord=nt.nodes.new('ShaderNodeTexCoord');noise=nt.nodes.new('ShaderNodeTexNoise')
  noise.inputs['Scale'].default_value=95 if mat in [titanium,warm] else 65;noise.inputs['Detail'].default_value=2
  nt.links.new(coord.outputs['Generated'],noise.inputs['Vector'])
  finish=nt.nodes.new('ShaderNodeMapRange');finish.name='Absolute roughness — manufactured variation'
  finish.inputs['From Min'].default_value=0;finish.inputs['From Max'].default_value=1
  finish.inputs['To Min'].default_value=base-.025;finish.inputs['To Max'].default_value=base+.045
  nt.links.new(noise.outputs['Fac'],finish.inputs['Value']);nt.links.new(finish.outputs['Result'],p.inputs['Roughness'])
  if mat in [titanium,warm] and 'Anisotropic IOR Level' in p.inputs:p.inputs['Anisotropic IOR Level'].default_value=.22

def bake_finish(objects,label):
 """Cycles bevel normals, absolute roughness and geometry AO, 1024 square.

 Normal detail is an actual shader-bevel bake from authored geometry. It is
 not described as a projection from an unproduced high-poly sculpt.
 """
 import numpy as np
 size=1024;previous_collections=[(c,c.hide_render) for c in scene.collection.children]
 for c,_ in previous_collections:c.hide_render=c!=exports
 exports.hide_render=False
 materials={}
 for o in objects:
  o.hide_render=False;o.hide_set(False)
  for slot in o.material_slots:
   source=slot.material
   if source not in materials:
    clone=source.copy();clone.name=source.name+'.'+label;materials[source]=clone
   slot.material=materials[source]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.010,scale_to_bounds=True)
 bpy.ops.object.mode_set(mode='OBJECT')
 scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.device='CPU'
 scene.render.bake.use_clear=False;scene.render.bake.margin=8;scene.render.bake.use_selected_to_active=False
 images={};stats={}
 for kind,pass_type in [('normal','NORMAL'),('roughness','ROUGHNESS'),('ao','AO')]:
  img=bpy.data.images.new('TEM_'+label+'_'+kind+'_1k',width=size,height=size,alpha=False)
  img.colorspace_settings.name='Non-Color'
  initial=np.ones((size*size,4),dtype=np.float32)
  if kind=='normal':initial[:,0:2]=.5
  img.pixels.foreach_set(initial.ravel());img.update()
  for mat in materials.values():
   target=mat.node_tree.nodes.new('ShaderNodeTexImage');target.name='Bake target — '+kind;target.image=img
   mat.node_tree.nodes.active=target
  print('TEM_BAKE '+label+' '+kind,flush=True)
  bpy.ops.object.bake(type=pass_type)
  img.filepath_raw=str(OUT/(label.lower()+'-'+kind+'-1k.png'));img.file_format='PNG';img.save();img.pack()
  pixels=np.asarray(img.pixels[:],dtype=np.float32).reshape((-1,4))
  stats[kind]={'size':size,'min':round(float(pixels[:,:3].min()),5),'max':round(float(pixels[:,:3].max()),5),'std':round(float(pixels[:,:3].std()),5)}
  images[kind]=img
 ao_group=bpy.data.node_groups.get('glTF Material Output')
 if not ao_group:
  ao_group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
  ao_group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 for mat in materials.values():
  if mat.name.startswith('EMISSION') or mat.name.startswith('GLASS'):continue
  nt=mat.node_tree;p=nt.nodes.get('Principled BSDF')
  for socket in ['Normal','Roughness']:
   for link in list(p.inputs[socket].links):nt.links.remove(link)
  normaltex=nt.nodes.new('ShaderNodeTexImage');normaltex.name='Baked manufactured bevel normals';normaltex.image=images['normal']
  normal=nt.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.72
  nt.links.new(normaltex.outputs['Color'],normal.inputs['Color']);nt.links.new(normal.outputs['Normal'],p.inputs['Normal'])
  roughtex=nt.nodes.new('ShaderNodeTexImage');roughtex.name='Baked absolute roughness';roughtex.image=images['roughness']
  p.inputs['Roughness'].default_value=1.;nt.links.new(roughtex.outputs['Color'],p.inputs['Roughness'])
  aotex=nt.nodes.new('ShaderNodeTexImage');aotex.name='Ray baked geometry AO';aotex.image=images['ao']
  output=nt.nodes.new('ShaderNodeGroup');output.node_tree=ao_group;nt.links.new(aotex.outputs['Color'],output.inputs['Occlusion'])
 for c,was_hidden in previous_collections:c.hide_render=was_hidden
 return stats
