// Checks public/longshot.glb against what the 3D viewer relies on, loading it the
// way QuiverModel.vue does (three.js GLTFLoader + meshopt decoder): one root, the
// manifest's families in order, then optional assemblies, then one node per placed
// part named "<id>" or "<id> <n>" (n = 1..qty) with every id in the manifest and
// in its family, and every mesh under such a node. Prints the per-family counts.
//   node scripts/model/check.mjs public/longshot.glb src/data/generated/longshot-model.json
import { readFileSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const [glbPath, manifestPath] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const bytes = readFileSync(glbPath);
const gltf = await new Promise((ok, fail) =>
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), '', ok, fail));
// Names as written in the file (three.js sanitizes object names: spaces become underscores).
const original = (o) => { const i = gltf.parser.associations.get(o)?.nodes; return i === undefined ? o.name : gltf.parser.json.nodes[i].name ?? ''; };

const parts = new Map(manifest.parts.map((p) => [p.id, p]));
const familyOf = new Map(manifest.families.map((f) => [f.label, f.id]));
const idOf = (name) => [...parts.keys()].find((id) => name === id || name.startsWith(`${id} `));
const problems = [];
for (const a of parts.keys()) for (const b of parts.keys()) if (a !== b && b.startsWith(a)) problems.push(`id ${a} is a prefix of ${b}`);

const roots = gltf.scene.children;
if (roots.length !== 1) problems.push(`${roots.length} root nodes`);
const families = roots[0].children.map(original);
if (families.join() !== manifest.families.map((f) => f.label).join()) problems.push(`families ${families} differ from the manifest`);

const seen = new Map(), counted = new Set(); // id -> instance numbers; part nodes counted
const perFamily = new Map(families.map((f) => [f, new Set()]));
let meshes = 0, triangles = 0;
gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  meshes++;
  triangles += o.geometry.index.count / 3;
  let node = o;
  while (node && !idOf(original(node))) node = node.parent;
  if (!node) return problems.push(`mesh ${original(o)} has no part node above it`);
  const chain = [];
  for (let n = node; n && n !== gltf.scene; n = n.parent) chain.unshift(n);
  const [, family] = chain;
  const name = original(node), id = idOf(name), n = name === id ? 0 : Number(name.slice(id.length + 1));
  if (!/^[A-Za-z0-9_-]+( [1-9]\d*)?$/.test(name)) problems.push(`odd part node name ${JSON.stringify(name)}`);
  if (chain.length < 3 || chain.length > 4) problems.push(`${name} sits ${chain.length - 1} levels below the root`);
  if (familyOf.get(original(family)) !== parts.get(id).family) problems.push(`${name} is under ${original(family)}`);
  if (!node.name.startsWith(id)) problems.push(`three.js renamed ${name} to ${node.name}`);
  if (counted.has(node)) return; // a part with several meshes counts once
  counted.add(node);
  seen.set(id, [...(seen.get(id) ?? []), n]);
  perFamily.get(original(family)).add(name);
});
for (const [id, p] of parts) {
  const nums = (seen.get(id) ?? []).sort((a, b) => a - b);
  const want = p.qty === 1 ? [0] : Array.from({ length: p.qty }, (_, i) => i + 1);
  if (nums.join() !== want.join()) problems.push(`${id}: instances ${nums} but qty ${p.qty}`);
}

const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).multiplyScalar(1000);
for (const [f, names] of perFamily) console.log(`${f.padEnd(13)} ${String(names.size).padStart(3)} part nodes  ${manifest.families.find((x) => x.label === f)?.parts.join(', ') ?? '(not a manifest family)'}`);
const cells = manifest.families.find((f) => f.id === 'cells')?.parts.reduce((n, id) => n + (seen.get(id)?.length ?? 0), 0);
console.log(`cells: ${cells}; ${meshes} meshes, ${triangles} triangles drawn; ` +
  `size ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} mm (x, y up, z); ${(statSync(glbPath).size / 1e6).toFixed(2)} MB`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('ok');
