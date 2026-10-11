# Three.js 0.161.0

The site ships this fixed version and its required addons from the same origin
as its models. No build or runtime CDN connection is required.

These files are unmodified copies from the `three@0.161.0` npm distribution,
retrieved from `https://cdn.jsdelivr.net/npm/three@0.161.0/` with TLS verification.
The original package paths and MIT license are preserved. The page import map
resolves the addons' bare `three` imports to `build/three.module.js`.

The included modules are the dependency closure of the site's postprocessing,
GLTFLoader, Reflector, and BufferGeometryUtils imports. Keep the core and addons
on the same version when updating, and run `tests/graphics-dependencies.test.mjs`.
