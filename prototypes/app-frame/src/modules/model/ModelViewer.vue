<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MODEL_META_URL, MODEL_URL, provenance, within, type Sel } from './model';

// The Spearhead model on a canvas. It only draws: which groups are lit, what is
// selected and what is under discussion all come in as props, and a click on a
// lit part comes out as `pick`. Ported from spec-threads' ModelView.

const props = defineProps<{
  /** Groups drawn solid; everything else is a faint ghost. Null lights everything. */
  lit: string[] | null;
  /** Groups switched off entirely (the layer toggles). */
  hidden?: string[];
  selection: Sel | null;
  /** Places with an open thread; their parts take the discussion colour. */
  discussed: Sel[];
}>();
const emit = defineEmits<{ pick: [sel: Sel | null]; ready: [meta: ModelMeta] }>();
export interface ModelMeta { solids: number; revision: string; snapshot: string; span_m: number; groups: { id: string; solids: number }[] }

type View = 'iso' | 'top' | 'front' | 'side';
const stage = ref<HTMLDivElement>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
const progress = ref(0);
const view = ref<View>('iso');

// Part colours. Neutral structure, with mirrored and recovered bodies tinted
// the way the spec site marks them, on the frame's Radix steps.
const colors = { modelled: '#b0b4ba', mirrored: '#75c7f0', recovered: '#1fd8a4', discussed: '#ffc53d', selected: '#5472e4', ghost: '#5a6169' };

// three.js objects stay outside Vue's reactivity.
let renderer: THREE.WebGLRenderer | undefined, camera: THREE.PerspectiveCamera, controls: OrbitControls, frame = 0, observer: ResizeObserver | undefined;
const scene = new THREE.Scene();
const meshes: THREE.Mesh[] = [];
const groupObjects = new Map<string, THREE.Object3D>();

const isLit = (group: string) => !props.lit || props.lit.includes(group);
const isOn = (group: string) => !props.hidden?.includes(group);

function paint() {
  const sel = props.selection;
  for (const m of meshes) {
    const d = m.userData as Sel;
    const mat = m.material as THREE.MeshStandardMaterial;
    const lit = isLit(d.group);
    const discussed = lit && props.discussed.some((a) => within(d, a) || within(a, d));
    const selected = !!sel && within(d, sel);
    mat.color.set(!lit ? colors.ghost : selected ? colors.selected : discussed ? colors.discussed : colors[provenance(d.group)]);
    mat.transparent = !lit;
    mat.opacity = lit ? 1 : 0.07;
    mat.depthWrite = lit;
    mat.emissive.setHex(selected ? 0x1d2e62 : 0x000000);
    mat.needsUpdate = true;
  }
  for (const [id, obj] of groupObjects) obj.visible = isOn(id);
}

function isShown(o: THREE.Object3D) { let p: THREE.Object3D | null = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; }
function box(filter: (d: Sel) => boolean) {
  const b = new THREE.Box3();
  for (const m of meshes) if (isShown(m) && filter(m.userData as Sel)) b.union(new THREE.Box3().setFromObject(m));
  return b;
}
const dirs: Record<View, THREE.Vector3> = {
  iso: new THREE.Vector3(-1.15, 0.95, 1.25), top: new THREE.Vector3(0, 1, 0.0001),
  front: new THREE.Vector3(-1, 0.0001, 0), side: new THREE.Vector3(0, 0.0001, 1),
};
/** Frame the selection, else the lit groups, else the whole aircraft. */
function fit(next: View = view.value) {
  if (!renderer || !meshes.length) return;
  view.value = next;
  const sel = props.selection;
  let b = sel ? box((d) => within(d, sel)) : new THREE.Box3();
  if (b.isEmpty() && props.lit?.length) b = box((d) => isLit(d.group));
  if (b.isEmpty()) b = box(() => true);
  const center = b.getCenter(new THREE.Vector3());
  const radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.05);
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1)) * (sel ? 1.5 : 1.04);
  camera.position.copy(center).add(dirs[next].clone().normalize().multiplyScalar(distance));
  controls.target.copy(center);
  camera.near = Math.max(0.001, radius / 1000); camera.far = Math.max(100, distance * 10); camera.updateProjectionMatrix(); controls.update();
}
defineExpose({ fit });

onMounted(async () => {
  const host = stage.value!;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { status.value = 'error'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Spearhead 3D model. Drag to rotate, scroll to zoom, click a part to select it.');
  scene.add(new THREE.HemisphereLight(0xe1efff, 0x2a2e33, 2.6));
  for (const [pos, color, intensity] of [[[2, 5, 3], 0xffffff, 3], [[-3, 2, -4], 0xb9d5ff, 1.8], [[1, -2, 1], 0xffe4bf, 0.6]] as [number[], number, number][]) {
    const l = new THREE.DirectionalLight(color, intensity); l.position.set(pos[0], pos[1], pos[2]); scene.add(l);
  }
  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer!.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  observer = new ResizeObserver(resize); observer.observe(host); resize();

  // A click (not a drag) picks the nearest lit part; empty space clears.
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down: [number, number] | undefined;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const rect = renderer!.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes.filter((m) => isShown(m) && isLit((m.userData as Sel).group)), false)[0];
    emit('pick', hit ? { ...(hit.object.userData as Sel) } : null);
  });
  const animate = () => { frame = requestAnimationFrame(animate); controls.update(); renderer!.render(scene, camera); };
  animate();

  try {
    const base = import.meta.env.BASE_URL;
    const meta: ModelMeta = await fetch(base + MODEL_META_URL).then((r) => { if (!r.ok) throw new Error('model.json ' + r.status); return r.json(); });
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(base + MODEL_URL, (e) => { if (e.total) progress.value = Math.round((e.loaded / e.total) * 100); });
    const json = gltf.parser.json as { nodes: { name?: string }[] };
    // Names as written in the model file (three.js sanitizes object names).
    const original = (o: THREE.Object3D) => { const i = gltf.parser.associations.get(o)?.nodes; return i !== undefined ? json.nodes[i]?.name ?? o.name : o.name; };
    for (const entry of meta.groups) {
      const obj = gltf.scene.getObjectByName(entry.id);
      if (!obj) continue;
      groupObjects.set(entry.id, obj);
      obj.traverse((node) => {
        if (!(node as THREE.Mesh).isMesh) return;
        const mesh = node as THREE.Mesh;
        let child: THREE.Object3D = mesh;
        while (child.parent && child.parent !== obj) child = child.parent;
        const component = child !== mesh ? original(child) : undefined;
        mesh.userData = { group: entry.id, component, part: original(mesh) } satisfies Sel;
        mesh.material = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.7, side: THREE.DoubleSide });
        meshes.push(mesh);
      });
    }
    scene.add(gltf.scene);
    paint();
    fit();
    status.value = 'ready';
    emit('ready', meta);
  } catch (e) {
    console.warn('Model failed to load', e);
    status.value = 'error';
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose();
  for (const m of meshes) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
  renderer?.dispose(); renderer?.domElement.remove();
});

watch(() => [props.discussed, props.hidden, props.lit], paint, { deep: true });
watch(() => props.selection, (s, prev) => { paint(); if (s || prev) fit(); }, { deep: true });
watch(() => props.lit, () => fit(), { deep: true });
</script>

<template>
  <div class="viewer">
    <div ref="stage" class="canvas" :data-ready="status === 'ready'"></div>
    <div class="seg views" role="radiogroup" aria-label="Camera">
      <button v-for="v in (['iso', 'top', 'front', 'side'] as View[])" :key="v" type="button" role="radio" :aria-checked="view === v" @click="fit(v)">
        {{ v === 'iso' ? '3D' : v[0].toUpperCase() + v.slice(1) }}
      </button>
    </div>
    <p v-if="status === 'loading'" class="note center">Loading the aircraft<template v-if="progress"> · {{ progress }}%</template></p>
    <p v-else-if="status === 'error'" class="note center">The 3D model couldn't load in this browser.</p>
    <p class="note legend">
      <span><i :style="{ background: colors.selected }"></i>Selected</span>
      <span><i :style="{ background: colors.discussed }"></i>Open thread</span>
      <span><i :style="{ background: colors.mirrored }"></i>Mirrored</span>
      <span><i :style="{ background: colors.recovered }"></i>Recovered</span>
    </p>
  </div>
</template>

<style scoped>
.viewer { position: relative; height: 100%; min-height: 0; background: var(--thumb-bg); overflow: hidden; }
.canvas { position: absolute; inset: 0; }
.canvas :deep(canvas) { display: block; cursor: grab; }
.canvas :deep(canvas:active) { cursor: grabbing; }

.seg { position: absolute; top: 12px; left: 12px; display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a3); backdrop-filter: blur(8px); }
.seg button {
  height: 24px; padding: 0 9px; border: 0; border-radius: 6px; background: none;
  color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--slate-a5); color: var(--fg); }

.note { position: absolute; margin: 0; font-size: var(--text-sm); color: var(--fg-muted); pointer-events: none; }
.center { inset: 0; display: grid; place-items: center; }
.legend { left: 12px; bottom: 12px; display: flex; gap: 12px; padding: 5px 10px; border-radius: 8px; background: var(--slate-a3); backdrop-filter: blur(8px); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 7px; height: 7px; border-radius: 50%; }
</style>
