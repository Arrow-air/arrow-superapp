// Compresses the raw Longshot GLB from export_longshot.py into public/longshot.glb,
// with the tools used for quiver.glb: weld, simplify the meshes the exporter marked
// (parts drawn many times and hidden inside others, like the 71 inserts), then
// meshopt (quantized positions; there are no normals or UVs, the viewer shades
// flat). Node names, the hierarchy and the shared meshes pass through untouched.
// The glTF tools are not app dependencies; install them in a scratch folder:
//   npm i --prefix /tmp/longshot-model @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer
//   GLTF_TOOLS=/tmp/longshot-model node scripts/model/convert.mjs /tmp/longshot-model/longshot-raw.glb public/longshot.glb
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';

const require = createRequire(`${process.env.GLTF_TOOLS ?? '/tmp/longshot-model'}/`);
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dedup, meshopt, prune, simplifyPrimitive, weld } = require('@gltf-transform/functions');
const { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } = require('meshoptimizer');

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: node convert.mjs <raw.glb> <out.glb>');

const doc = await io.read(input);
const triangles = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + p.getIndices().getCount() / 3, 0), 0);
const before = triangles();
await doc.transform(dedup(), weld());
for (const mesh of doc.getRoot().listMeshes()) {
  // extras.simplify is an error bound as a fraction of the mesh's size (0.02 of a 6 mm insert is 0.12 mm).
  const error = mesh.getExtras().simplify;
  if (error) for (const prim of mesh.listPrimitives()) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error });
  mesh.setExtras({});
}
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(output, doc);
console.log(`triangles ${before} -> ${triangles()}, ${(statSync(output).size / 1e6).toFixed(2)} MB`);
