// Merge Fusion's per-face primitives into one primitive per solid, keep the named
// subsystem > component > solid hierarchy, then weld and meshopt-compress for the web.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { joinPrimitives, weld, meshopt, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [input, output] = process.argv.slice(2);
const doc = await io.read(input);
let before = 0, after = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  const prims = mesh.listPrimitives();
  before += prims.length;
  for (const p of prims) for (const sem of p.listSemantics()) if (!['POSITION', 'NORMAL'].includes(sem)) p.setAttribute(sem, null);
  const byMaterial = new Map();
  for (const p of prims) { const k = p.getMaterial(); if (!byMaterial.has(k)) byMaterial.set(k, []); byMaterial.get(k).push(p); }
  for (const group of byMaterial.values()) {
    if (group.length < 2) continue;
    const joined = joinPrimitives(group);
    for (const p of group) { mesh.removePrimitive(p); p.dispose(); }
    mesh.addPrimitive(joined);
  }
  after += mesh.listPrimitives().length;
}
await doc.transform(dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(output, doc);
console.log(`primitives ${before} -> ${after}`);
