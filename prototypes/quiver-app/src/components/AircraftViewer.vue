<script setup lang="ts">
// The real Quiver assembly, exported from the repo's build123d CAD. Every mesh resolves to a BOM id.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const props = defineProps<{ selected: string | null; explode: number; hidden: string[]; marked: string[] }>();
const emit = defineEmits<{ (e: 'select', id: string | null): void; (e: 'ready', ids: string[]): void }>();
const host = ref<HTMLDivElement>();
const loading = ref(true);
const hover = ref<string | null>(null);

const GROUP_COLOR: Record<string, number> = { '1': 0x2b2e33, '2': 0x8d939b, '3': 0x3a6f60, '4': 0xb97a3a };
const SELECT = 0x1d5fd1, MARK = 0xd9822b;
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls;
let raf = 0, ro: ResizeObserver;
const meshes: { mesh: THREE.Mesh; id: string; home: THREE.Vector3; dir: THREE.Vector3 }[] = [];
const centre = new THREE.Vector3();
let radius = 1;

const idOf = (o: THREE.Object3D | null) => { for (let n = o; n; n = n.parent) { const m = /^(\d{4})/.exec(n.name); if (m) return m[1]; } return ''; };

function paint() {
  for (const m of meshes) {
    const mat = m.mesh.material as THREE.MeshStandardMaterial;
    const sel = m.id === props.selected, hov = m.id === hover.value, mark = props.marked.includes(m.id);
    mat.color.setHex(sel ? SELECT : mark ? MARK : GROUP_COLOR[m.id[0]] ?? 0x777777);
    mat.emissive.setHex(hov && !sel ? 0x1a2f55 : 0x000000);
    mat.opacity = props.selected && !sel ? 0.14 : 1;
    if (mat.transparent !== mat.opacity < 1) { mat.transparent = mat.opacity < 1; mat.needsUpdate = true; }
    mat.depthWrite = mat.opacity === 1;
    m.mesh.renderOrder = sel ? 2 : 0;
    m.mesh.visible = !props.hidden.includes(m.id[0]);
  }
}
function place() {
  for (const m of meshes) m.mesh.position.copy(m.home).addScaledVector(m.dir, props.explode);
}
function frame(id: string | null) {
  const box = new THREE.Box3();
  for (const m of meshes) if (!id || m.id === id) box.expandByObject(m.mesh);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(box.getSize(new THREE.Vector3()).length() / 2, radius * 0.12);
  const dir = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(c);
  camera.position.copy(c).addScaledVector(dir, r / Math.sin((camera.fov * Math.PI) / 360) * (id ? 2.4 : 0.95));
}

onMounted(async () => {
  const el = host.value!;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  el.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 1, 100000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3ad, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1, 2, 1.5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-2, 0.5, -1); scene.add(fill);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(import.meta.env.BASE_URL + 'quiver.glb');
  scene.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);
  const all = new THREE.Box3().setFromObject(gltf.scene);
  all.getCenter(centre); radius = all.getSize(new THREE.Vector3()).length() / 2;
  // Explode per part id, not per mesh, so a multi-body part moves as one piece.
  const byId = new Map<string, THREE.Box3>();
  gltf.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const id = idOf(m); if (!id) return; const b = byId.get(id) ?? new THREE.Box3(); b.expandByObject(m); byId.set(id, b); });
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    const id = idOf(m); if (!id) { m.visible = false; return; }
    m.material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.75, metalness: id[0] === '2' ? 0.35 : 0.08 });
    const world = byId.get(id)!.getCenter(new THREE.Vector3()).sub(centre);
    world.y *= 1.6; // pull the stack apart vertically more than sideways
    // convert the world-space direction into the mesh's parent space
    const parentInv = new THREE.Matrix4().copy(m.parent!.matrixWorld).invert();
    const dir = world.clone().transformDirection(parentInv).multiplyScalar(world.length() / (m.parent!.getWorldScale(new THREE.Vector3()).x || 1));
    meshes.push({ mesh: m, id, home: m.position.clone(), dir });
  });
  camera.position.copy(centre).add(new THREE.Vector3(1, 0.62, 1.15).multiplyScalar(radius * 2.6));
  controls.target.copy(centre);
  camera.near = radius / 200; camera.far = radius * 40; camera.updateProjectionMatrix();
  paint(); place(); frame(null);
  loading.value = false;
  emit('ready', [...byId.keys()]);

  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  const pick = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    pt.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pt, camera);
    const hit = ray.intersectObjects(meshes.filter((m) => m.mesh.visible).map((m) => m.mesh), false)[0];
    return hit ? idOf(hit.object) : null;
  };
  let down = { x: 0, y: 0 };
  renderer.domElement.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener('pointerup', (e) => { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) emit('select', pick(e)); });
  renderer.domElement.addEventListener('pointermove', (e) => { const id = pick(e); if (id !== hover.value) { hover.value = id; renderer.domElement.style.cursor = id ? 'pointer' : 'grab'; paint(); } });

  const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  ro = new ResizeObserver(size); ro.observe(el); size();
  const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  loop();
});
onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); controls?.dispose(); renderer?.dispose(); });

watch(() => [props.selected, props.hidden, props.marked], () => { paint(); }, { deep: true });
watch(() => props.selected, (id) => { if (id) frame(id); });
watch(() => props.explode, () => { place(); if (props.selected) frame(props.selected); });
defineExpose({ reset: () => frame(null) });
</script>

<template>
  <div class="viewer" ref="host">
    <div v-if="loading" class="viewer-note label">Loading the Quiver assembly…</div>
    <div v-else-if="hover" class="viewer-note label">{{ hover }}</div>
  </div>
</template>
