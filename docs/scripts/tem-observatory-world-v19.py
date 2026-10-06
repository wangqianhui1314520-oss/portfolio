"""Editable exterior for the v19 portrait observatory, authored in browser Y-up.

The root builder executes this helper with its existing geometry functions.
Coordinates are absolute: archive centre (0, 0, -27), first camera near
(0, 2.5, 20).  Nothing here is a photograph or a camera-facing background.
`tem_export=False` marks Cycles-only cloud volumes and the physical sun lamp.
The lower cloud surface, billows, architecture and side gardens are web meshes.
"""


def build_exterior_v19(collection, materials):
    before = set(collection.objects)
    rng = random.Random(190619)
    supplied = materials if isinstance(materials, dict) else {}

    def take(keys, name, color, **kwargs):
        for key in keys:
            if key in supplied:
                return supplied[key]
        existing = bpy.data.materials.get(name)
        return existing or material(name, color, **kwargs)

    porcelain = take(('pearl', 'ceramic', 'PEARL_CERAMIC'),
                     'V19 EXTERIOR — ceramic', (.35, .43, .51), metal=.10,
                     rough=.33, coat=.22)
    titanium = take(('titanium', 'TITANIUM_COLD'),
                    'V19 EXTERIOR — titanium', (.075, .11, .15), metal=.76,
                    rough=.31, coat=.12)
    champagne = take(('warm', 'champagne', 'TITANIUM_CHAMPAGNE'),
                     'V19 EXTERIOR — champagne', (.27, .19, .11), metal=.79,
                     rough=.28, coat=.16)
    dark = take(('dark', 'DARK_PRESSURE'), 'V19 EXTERIOR — shadow alloy',
                (.016, .027, .046), metal=.37, rough=.38)
    cool = take(('cyan', 'EMISSION_CYAN'), 'V19 EXTERIOR — cyan guidance',
                (.14, .39, .61), rough=.34, emit=1.10)
    warm_light = take(('amber', 'EMISSION_AMBER'),
                      'V19 EXTERIOR — warm inhabited windows',
                      (.96, .47, .17), rough=.36, emit=1.70)

    # This surface is the deliberately inexpensive web representation of the
    # lower part of the cloud sea. Cycles also receives porous volume shells.
    cloud = material('V19 CLOUD — illuminated lower sea', (.76, .82, .93),
                     rough=.99)
    shader = cloud.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Subsurface Weight'].default_value = .26
    shader.inputs['Specular IOR Level'].default_value = .10
    shader.inputs['Metallic'].default_value = 0.0
    shader.inputs['Coat Weight'].default_value = 0.0
    nodes, links = cloud.node_tree.nodes, cloud.node_tree.links
    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = .42
    noise.inputs['Detail'].default_value = 3.2
    noise.inputs['Roughness'].default_value = .67
    links.new(coord.outputs['Object'], noise.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .14
    bump.inputs['Distance'].default_value = .45
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])

    rock = material('V19 GARDEN — basalt microfinish', (.021, .028, .047),
                    metal=.05, rough=.86)
    nodes, links = rock.node_tree.nodes, rock.node_tree.links
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 7.0
    noise.inputs['Detail'].default_value = 4.0
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .33
    bump.inputs['Distance'].default_value = .11
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])
    foliage = material('V19 GARDEN — midnight iridescent leaves',
                       (.045, .082, .125), metal=.10, rough=.42, coat=.23)

    def mark(obj, layer, export=True):
        obj['tem_world_layer'] = layer
        obj['tem_export'] = bool(export)
        obj['tem_coordinate_space'] = 'browser-Y-up:absolute'
        return obj

    def shape(name, p, radii, mat, layer, phase=0.0, segments=24, bands=12):
        """Closed ellipsoid, with large soft variations rather than hard facets."""
        verts, faces = [], []
        # Separate cap vertices avoid the repeated polar vertices of a UV grid.
        verts.append((p[0], p[1] + radii[1], p[2]))
        for j in range(1, bands):
            theta = j / bands * math.pi
            for k in range(segments):
                phi = k / segments * math.tau
                ripple = (1.0 + .055 * math.sin(phi * 3.0 + phase) *
                          math.sin(theta * 2.0 + phase) +
                          .026 * math.cos(phi * 5.0 - theta * 3.0 + phase))
                verts.append((p[0] + math.sin(theta) * math.cos(phi) * radii[0] * ripple,
                              p[1] + math.cos(theta) * radii[1] * ripple,
                              p[2] + math.sin(theta) * math.sin(phi) * radii[2] * ripple))
        bottom = len(verts)
        verts.append((p[0], p[1] - radii[1], p[2]))
        for k in range(segments):
            faces.append((0, 1 + k, 1 + (k + 1) % segments))
        for j in range(bands - 2):
            for k in range(segments):
                a = 1 + j * segments + k
                b = 1 + j * segments + (k + 1) % segments
                faces.append((a, a + segments, b + segments, b))
        end = 1 + (bands - 2) * segments
        for k in range(segments):
            faces.append((bottom, end + (k + 1) % segments, end + k))
        return mark(mesh(name, verts, faces, mat, collection), layer)

    # A real connected rolling surface; its top is always below the archive
    # glass and T. Increasing distance lowers the bank rather than making a
    # flat horizon plane intersect all the foreground objects.
    lobes = []
    for i in range(36):
        z = -92.0 - rng.random() * 485.0
        x = (rng.random() - .5) * 820.0
        lobes.append((x, z, 9.0 + rng.random() * 14.0,
                      20.0 + rng.random() * 31.0,
                      17.0 + rng.random() * 28.0))

    def cloud_height(x, z):
        distance = max(0.0, -z - 85.0)
        # The joined undersea sits beneath discrete cumulus groups; a high
        # smooth terrain surface would fill the valleys and read as dunes.
        base = -44.0 - distance * .027
        soft = (math.sin(x * .023 + z * .009) * 3.4 +
                math.cos(z * .032 - x * .008) * 2.2 +
                math.sin(x * .066) * math.cos(z * .041) * 1.25)
        bumps = 0.0
        for cx, cz, height, sx, sz in lobes:
            gaussian = math.exp(-((x - cx) / sx) ** 2 - ((z - cz) / sz) ** 2)
            bumps = max(bumps, height * gaussian)
        return min(-20.0, base + soft + bumps * .67)

    columns, rows = 64, 40
    verts, faces = [], []
    for j in range(rows + 1):
        z = -82.0 - j / rows * 555.0
        for i in range(columns + 1):
            x = -440.0 + i / columns * 880.0
            verts.append((x, cloud_height(x, z), z))
    for j in range(rows):
        for i in range(columns):
            k = j * (columns + 1) + i
            faces.append((k, k + 1, k + columns + 2, k + columns + 1))
    # Close the far underside. The silhouette is valid from other archive
    # headings and its edge never becomes a zero-thickness floating sheet.
    perimeter = (list(range(columns + 1)) +
                 [j * (columns + 1) + columns for j in range(1, rows + 1)] +
                 [rows * (columns + 1) + i for i in range(columns - 1, -1, -1)] +
                 [j * (columns + 1) for j in range(rows - 1, 0, -1)])
    lower = []
    for upper in perimeter:
        x, _, z = verts[upper]
        lower.append(len(verts))
        verts.append((x, -83.0, z))
    for j, upper in enumerate(perimeter):
        nxt = (j + 1) % len(perimeter)
        faces.append((upper, lower[j], lower[nxt], perimeter[nxt]))
    bottom_centre = len(verts)
    verts.append((0.0, -83.0, -359.5))
    for j in range(len(lower)):
        faces.append((bottom_centre, lower[(j + 1) % len(lower)], lower[j]))
    mark(mesh('V19 CLOUD SEA — continuous rolling underside', verts, faces,
              cloud, collection), 'cloud-web')

    # Broken near-bank crests add parallax without filling the middle of the
    # window with oversized cotton balls. Low profiles sit below y=-12.
    crests = [(-112, -112, 25, 8.0, 18), (-48, -139, 31, 8.7, 25),
              (50, -116, 24, 7.0, 21), (123, -149, 32, 9.0, 25),
              (-205, -212, 45, 12, 35), (205, -242, 48, 12, 36),
              (-78, -296, 44, 12, 33), (86, -336, 42, 12, 32),
              (277, -398, 63, 14, 43), (-281, -388, 64, 15, 46)]
    for i, (x, z, rx, ry, rz) in enumerate(crests):
        y = cloud_height(x, z) + ry * .14
        shape('V19 CLOUD CREST %02d — geometric web billow' % i,
              (x, y, z), (rx, ry, rz), cloud, 'cloud-web',
              phase=i * .79, segments=24, bands=12)
        # Four staggered lobules break each broad crest into a cauliflower
        # silhouette. They are closed depth-tested meshes, not fog sprites.
        for j in range(4):
            angle = j * 2.3999632297 + i * .37
            rr = .31 + rng.random() * .24
            xx = x + math.cos(angle) * rx * .54
            zz = z + math.sin(angle) * rz * .51
            ry_small = 4.2 + rng.random() * 5.4
            yy = y + ry * (.42 + rng.random() * .27)
            shape('V19 CUMULUS LOBULE %02d %d — soft volume silhouette' % (i, j),
                  (xx, yy, zz), (rx * rr, ry_small, rz * rr),
                  cloud, 'cloud-web', phase=angle, segments=12, bands=8)

    # Opaque fallback meshes cannot sit inside a Cycles cloud: their surfaces
    # hide the internal scattering and made the previous render look like snow.
    # Keep them exportable for compact web fallback but never render them here.
    for obj in collection.objects:
        if obj.get('tem_world_layer') == 'cloud-web':
            obj.hide_render = True
            obj['tem_render_representation'] = 'web fallback mesh; Cycles uses porous volume'

    # All shells sample the same world-space field, so neighbouring clouds
    # share continuous eddies instead of repeating one smooth spherical blob.
    # A separate generated-coordinate radial envelope removes mesh boundaries.
    volume = bpy.data.materials.new('V19 CLOUD — Cycles porous scattering')
    volume.use_nodes = True
    nodes, links = volume.node_tree.nodes, volume.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    scattering = nodes.new('ShaderNodeVolumePrincipled')
    scattering.inputs['Color'].default_value = (.91, .94, .99, 1)
    scattering.inputs['Anisotropy'].default_value = .36
    scattering.inputs['Emission Strength'].default_value = 0.0
    coord = nodes.new('ShaderNodeTexCoord')
    geometry = nodes.new('ShaderNodeNewGeometry')
    stretch = nodes.new('ShaderNodeVectorMath')
    stretch.operation = 'MULTIPLY'
    stretch.inputs[1].default_value = (.062, .062, .105)
    links.new(geometry.outputs['Position'], stretch.inputs[0])

    def cloud_noise(name, scale, detail, roughness):
        texture = nodes.new('ShaderNodeTexNoise')
        texture.name = name
        texture.noise_dimensions = '3D'
        texture.inputs['Scale'].default_value = scale
        texture.inputs['Detail'].default_value = detail
        texture.inputs['Roughness'].default_value = roughness
        links.new(stretch.outputs['Vector'], texture.inputs['Vector'])
        return texture

    def cloud_math(operation, first, second):
        node = nodes.new('ShaderNodeMath')
        node.operation = operation
        for index, value in enumerate([first, second]):
            if isinstance(value, (int, float)):
                node.inputs[index].default_value = value
            else:
                links.new(value, node.inputs[index])
        return node.outputs[0]

    macro = cloud_noise('Cloud macro — shared world density', 1.0, 4.8, .66)
    middle = cloud_noise('Cloud eddies — shared secondary scale', 2.75, 2.6, .68)
    fine = cloud_noise('Cloud pores — irregular transparent cavities', 6.4, 1.8, .62)
    mixed = cloud_math('ADD', cloud_math('MULTIPLY', macro.outputs['Fac'], .68),
                       cloud_math('MULTIPLY', middle.outputs['Fac'], .32))
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .36
    ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = .66
    ramp.color_ramp.elements[1].color = (.14, .14, .14, 1)
    body = ramp.color_ramp.elements.new(.48)
    body.color = (.045, .045, .045, 1)
    ramp.color_ramp.interpolation = 'EASE'
    links.new(mixed, ramp.inputs['Fac'])
    pores = nodes.new('ShaderNodeValToRGB')
    pores.color_ramp.elements[0].position = .36
    pores.color_ramp.elements[0].color = (1, 1, 1, 1)
    pores.color_ramp.elements[1].position = .67
    pores.color_ramp.elements[1].color = (.13, .13, .13, 1)
    links.new(fine.outputs['Fac'], pores.inputs['Fac'])
    centred = nodes.new('ShaderNodeVectorMath')
    centred.operation = 'SUBTRACT'
    centred.inputs[1].default_value = (.5, .5, .5)
    links.new(coord.outputs['Generated'], centred.inputs[0])
    radial = nodes.new('ShaderNodeVectorMath')
    radial.operation = 'LENGTH'
    links.new(centred.outputs['Vector'], radial.inputs[0])
    envelope = nodes.new('ShaderNodeMapRange')
    envelope.interpolation_type = 'SMOOTHSTEP'
    envelope.inputs['From Min'].default_value = .25
    envelope.inputs['From Max'].default_value = .495
    envelope.inputs['To Min'].default_value = 1.0
    envelope.inputs['To Max'].default_value = 0.0
    links.new(radial.outputs['Value'], envelope.inputs['Value'])
    density = cloud_math('MULTIPLY',
                         cloud_math('MULTIPLY', ramp.outputs['Color'],
                                    envelope.outputs['Result']),
                         pores.outputs['Color'])
    links.new(density, scattering.inputs['Density'])
    # This tiny density-coupled blue term approximates higher-order sky bounce.
    # Empty pores emit nothing, so it cannot reveal the shell as a smooth ball.
    scattering.inputs['Emission Color'].default_value = (.22, .31, .47, 1)
    links.new(cloud_math('MULTIPLY', density, .020),
              scattering.inputs['Emission Strength'])
    links.new(scattering.outputs['Volume'], output.inputs['Volume'])
    for i, (x, z, rx, ry, rz) in enumerate(crests):
        y = cloud_height(x, z) + ry * .40
        shell = shape('V19 CLOUD VOLUME %02d — offline scattering shell' % i,
                      (x, y, z), (rx * 1.32, ry * 2.0 + 2.4, rz * 1.32),
                      volume, 'cloud-volume-offline', phase=i * .79,
                      segments=20, bands=10)
        shell['tem_export'] = False
        shell['tem_density_representation'] = 'three world noise scales x radial envelope x cavities'
    connection = shape('V19 CLOUD SEA VOLUME — low connected cloud bank',
                       (0, -51, -360), (460, 19, 305),
                       volume, 'cloud-volume-offline', phase=.61,
                       segments=32, bands=12)
    connection['tem_export'] = False
    connection['tem_density_representation'] = 'connected low cloud bank; world density shared with crests'

    def city_box(name, p, size, mat, bevel):
        block = box(name, p, size, mat, collection, bevel)
        # At 150–450 world units one machined chamfer is enough; three bevel
        # segments on every tiny terrace spend geometry without visible gain.
        for modifier in block.modifiers:
            if modifier.type == 'BEVEL':
                modifier.segments = 1
        return block

    def platform(name, p, radius):
        profile = [(0, -.80), (radius * .60, -.80), (radius * .89, -3.30),
                   (radius, -1.40), (radius, -.12), (radius * .94, .24),
                   (0, .24), (0, -.80)]
        mark(lathe(name + ' — layered elevated foundation', profile, p,
                   titanium, collection, n=40), 'city')
        mark(ring(name + ' — ceramic outer shoulder', radius * .96, .26,
                  porcelain, collection, p=p, w=.29, h=.16, n=48), 'city')
        mark(ring(name + ' — recessed warm inhabited rim', radius * .905,
                  .32, warm_light, collection, p=p, start=.13,
                  extent=math.tau * .77, w=.041, h=.028, n=40), 'city')
        mark(ring(name + ' — lower machined rim', radius * .88, -2.2,
                  champagne, collection, p=p, w=.15, h=.08, n=40), 'city')

    def tower(name, p, height, width, rotation):
        # A waisted, manufactured profile terminates in a narrow antenna.
        # Different faceted shoulders give identifiable architecture at range.
        profile = [(0, width), (height * .10, width * 1.11),
                   (height * .31, width * .73), (height * .70, width * .51),
                   (height * .87, width * .35), (height, width * .12)]
        verts, faces, sides = [], [], 8
        for lift, radius in profile:
            for j in range(sides):
                a = rotation + j / sides * math.tau
                verts.append((p[0] + math.cos(a) * radius,
                              p[1] + lift, p[2] + math.sin(a) * radius))
        for row in range(len(profile) - 1):
            for j in range(sides):
                a, b = row * sides + j, row * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
        faces.extend([tuple(reversed(range(sides))),
                      tuple((len(profile) - 1) * sides + j for j in range(sides))])
        mark(mesh(name + ' — tapered architectural core', verts, faces,
                  porcelain, collection), 'city')
        for j in range(3):
            angle = rotation + j * math.tau / 3.0
            line = [(p[0] + math.cos(angle) * r * 1.035,
                     p[1] + y, p[2] + math.sin(angle) * r * 1.035)
                    for y, r in profile]
            mark(sweep(name + ' — champagne load spine', line,
                       width * .058, width * .050, champagne, collection,
                       n=12, sides=6), 'city')
        for lift in [.27, .60]:
            r = width * (1.12 - lift * .80)
            mark(ring(name + ' — occupied observation collar', r,
                      height * lift, titanium, collection, p=p,
                      w=width * .13, h=.15, n=16), 'city')
            mark(ring(name + ' — fine inhabited window belt', r * .98,
                      height * lift + .17, warm_light, collection, p=p,
                      start=rotation + .35, extent=math.tau * .69,
                      w=.025, h=.025, n=16), 'city')
        mark(sweep(name + ' — narrow transmission spire',
                   [(p[0], p[1] + height * .94, p[2]),
                    (p[0] + .04, p[1] + height + width * 1.7, p[2])],
                   width * .075, width * .075, porcelain, collection,
                   n=6, sides=6, taper=True), 'city')

    # The nearest city stands to the LEFT beneath the reading pane. The right
    # settlement is farther away and lower, leaving the glass T silhouette open.
    sites = [('AURELIA', (-72, -23, -165), 20, 6, 4.1),
             ('SABLE', (-146, -29, -281), 29, 7, 5.0),
             ('DAWN', (134, -35, -280), 25, 6, 4.1),
             ('DISTANT RELAY', (-3, -43, -442), 24, 8, 3.5)]
    for site, p, radius, count, nominal_height in sites:
        platform(site, p, radius)
        for i in range(count):
            a = i * 2.3999632297
            r = radius * (.12 + .65 * math.sqrt((i + 1) / count))
            size = 1.14 + rng.random() * .94
            y = p[1] + .35
            x, z = p[0] + math.cos(a) * r, p[2] + math.sin(a) * r
            h = nominal_height * (1.65 + rng.random() * 1.55)
            if i == 0:
                h *= 1.50
                size *= 1.25
            tower(site + ' / tower %02d' % i, (x, y, z), h, size,
                  a * .22)
        # Occupied low-rise terraces connect the spires into a settlement.
        # These broad roof silhouettes survive at mid-ground distances better
        # than another ring of needle antennas and indicate inhabited scale.
        for j in range(4):
            a = j * math.pi * .5 + .61
            xx = p[0] + math.cos(a) * radius * .39
            zz = p[2] + math.sin(a) * radius * .39
            width = 3.1 + rng.random() * 1.9
            depth = 2.5 + rng.random() * 1.4
            height = 1.3 + rng.random() * 1.0
            mark(city_box(site + ' — occupied terrace lower body',
                     (xx, p[1] + height * .5 + .38, zz),
                     (width, height, depth), dark, .12), 'city')
            mark(city_box(site + ' — cantilevered ceramic terrace roof',
                     (xx + .20, p[1] + height + .48, zz),
                     (width * .91, .34, depth * 1.08),
                     porcelain, .09), 'city')
            mark(city_box(site + ' — inhabited warm terrace window',
                     (xx, p[1] + height * .75 + .30, zz + depth * .501),
                     (width * .78, .10, .035),
                     warm_light, .006), 'city')
        for j in range(4):
            a = j * math.pi / 2.0 + .32
            x, z = p[0] + math.cos(a) * radius * .60, p[2] + math.sin(a) * radius * .60
            mark(sweep(site + ' — lower suspension fin',
                       [(x, p[1] - .3, z),
                        (p[0] + (x - p[0]) * .5, p[1] - 7.5,
                         p[2] + (z - p[2]) * .5),
                        (p[0], p[1] - 17.0, p[2])],
                       .72, .38, titanium, collection, n=16, sides=6,
                       taper=True), 'city')

    # A quiet transport viaduct enters clouds instead of drawing a perfect
    # synthetic horizon. Its underside and nested rail create real parallax.
    points = [(-125, -26, -285), (-103, -24, -240),
              (-96, -23, -195), (-77, -22.7, -168)]
    mark(sweep('V19 CITY — inter-platform viaduct', points, 2.0, .56,
               titanium, collection, n=52, sides=10), 'city')
    mark(sweep('V19 CITY — inset warm viaduct guide',
               [(x, y + .57, z) for x, y, z in points], .043, .029,
               warm_light, collection, n=52, sides=6), 'city')

    # Lower side gardens supply human-scale foreground. All rocks and leaves
    # stay outside |x|<25, leaving both the main panel and T unobstructed.
    for side in [-1, 1]:
        for i in range(5):
            p = (side * (31.0 + rng.random() * 6.5),
                 -6.0 + rng.random() * .34, 5.0 - i * 3.6)
            radii = (2.3 + rng.random() * 1.6,
                     1.15 + rng.random() * .70,
                     1.8 + rng.random() * 1.8)
            shape('V19 GARDEN — side basalt %d %02d' % (side, i),
                  p, radii, rock, 'foreground-garden', phase=i * .6,
                  segments=16, bands=9)
        p = (side * 29.7, -5.5, 1.4)
        verts, faces = [], []
        for j in range(22):
            a = j * 2.3999632297
            length = 1.1 + rng.random() * 1.4
            r = .45 + rng.random() * 1.3
            root = Vector((p[0] + math.cos(a) * r, p[1], p[2] + math.sin(a) * r))
            bend = Vector((math.cos(a) * length * .54,
                           length, math.sin(a) * length * .48))
            blade_side = Vector((-math.sin(a), 0, math.cos(a)))
            start = len(verts)
            for k in range(5):
                t = k / 4.0
                centre = root + bend * t + Vector((0, math.sin(t * math.pi) * .24, 0))
                width = (.08 + math.sin(t * math.pi) * .17) * (1.0 - t * .82)
                # A closed diamond section gives the leaf a real thin ridge;
                # opposite coplanar faces would flicker in the web renderer.
                verts.extend([tuple(centre - blade_side * width),
                              tuple(centre + Vector((0, .028, 0))),
                              tuple(centre + blade_side * width),
                              tuple(centre - Vector((0, .018, 0)))])
            for k in range(4):
                for side_index in range(4):
                    a0 = start + k * 4 + side_index
                    a1 = start + k * 4 + (side_index + 1) % 4
                    faces.append((a0, a1, a1 + 4, a0 + 4))
            faces.extend([tuple(start + j for j in reversed(range(4))),
                          tuple(start + 16 + j for j in range(4))])
        mark(mesh('V19 GARDEN — curved midnight leaves %d' % side,
                  verts, faces, foliage, collection), 'foreground-garden')

    # The visible stellar core and SUN share their actual direction. The lamp
    # can be taken over by the root portrait rig; it is never exported as GLB.
    sunrise_position = (430.0, 72.0, -680.0)
    sun_material = material('V19 SUNRISE — warm stellar core',
                            (1.0, .61, .27), rough=.36, emit=24.0)
    shape('V19 SUNRISE — physical warm stellar core', sunrise_position,
          (1.8, 1.8, 1.8), sun_material, 'sunrise-core', segments=24, bands=12)
    sunlight_direction = Vector((.48, .19, -.84)).normalized()
    target = Vector(sunrise_position) - sunlight_direction * 850.0
    data = bpy.data.lights.new('V19 SUNRISE — shared grazing physical sun', 'SUN')
    data.energy = 1.45
    data.color = (1.0, .66, .36)
    data.angle = .022
    lamp = bpy.data.objects.new(data.name, data)
    collection.objects.link(lamp)
    lamp.location = Vector((sunrise_position[0], -sunrise_position[2], sunrise_position[1]))
    blender_target = Vector((target.x, -target.z, target.y))
    lamp.rotation_euler = (blender_target - lamp.location).to_track_quat('-Z', 'Y').to_euler()
    mark(lamp, 'sunrise-light-offline', export=False)
    lamp['tem_sun_direction_browser'] = tuple(sunlight_direction)
    lamp['tem_shared_light_role'] = 'portrait-only warm right horizon key'

    # A large blue sky source supplies the multiple-scattered illumination
    # clouds receive outdoors. Grazing warm sunlight alone turned even a blue
    # matte albedo into dark brown terrain in the first actual render.
    fill_data = bpy.data.lights.new('V19 CLOUD — broad sky scattering fill', 'AREA')
    fill_data.energy = 240000.0
    fill_data.color = (.58, .73, 1.0)
    fill_data.shape = 'DISK'
    fill_data.size = 340.0
    fill_data.use_shadow = False
    fill = bpy.data.objects.new(fill_data.name, fill_data)
    collection.objects.link(fill)
    fill.location = Vector((0, 245, 110))
    fill_target = Vector((0, 250, -29))
    fill.rotation_euler = (fill_target - fill.location).to_track_quat('-Z', 'Y').to_euler()
    mark(fill, 'sky-scattering-fill-offline', export=False)
    fill['tem_shared_light_role'] = 'exterior cloud sea broad blue sky fill; match web hemisphere'

    objects = [obj for obj in collection.objects if obj not in before]
    for obj in objects:
        if 'tem_export' not in obj:
            mark(obj, 'city')
    return objects
