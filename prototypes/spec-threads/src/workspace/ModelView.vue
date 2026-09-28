<script setup lang="ts">
// The Spearhead aircraft model with discussions attached to its parts. Click a part to see what is
// being discussed about it, or start a discussion about that part, its component, or its subsystem.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { act, backend, state } from '../data/store';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { anchorKey, anchorLabel, componentName, groupColors, groupNames, groupSystem, MODEL_ID, MODEL_META_URL, MODEL_URL, parseAnchorKey, partName, threadsAbout } from './model';
import { shortDate } from './labels';
import type { ModelAnchor } from '../lib/types';

type Sel = Pick<ModelAnchor, 'group' | 'component' | 'part'>;
const { q, patch, to, go } = useNav();
const { data, isMember } = useProject();
const stage = ref<HTMLDivElement>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
const progress = ref(0);
const meta = ref<{ solids: number; revision: string; snapshot: string; span_m: number; groups: { id: string; solids: number }[] }>();
const layers = ref<{ id: string; solids: number; visible: boolean }[]>([]);
const selection = ref<Sel | null>(null);
const view = ref('iso');

// three.js objects stay outside Vue's reactivity.
let renderer: THREE.WebGLRenderer | undefined, camera: THREE.PerspectiveCamera, controls: OrbitControls, frame = 0, observer: ResizeObserver | undefined;
const scene = new THREE.Scene();
const meshes: THREE.Mesh[] = [];
const groupObjects = new Map<string, THREE.Object3D>();

const anchored = computed(() => (data.value?.bundles ?? []).map((b) => b.thread).filter((t) => t.anchor));
const openAnchored = computed(() => anchored.value.filter((t) => t.status === 'open'));
const about = computed(() => (selection.value ? threadsAbout(anchored.value, selection.value) : []));
const selectionLabel = computed(() => (selection.value ? anchorLabel(selection.value) : ''));
const inferred = (id: string) => id.startsWith('inferred_') || id.startsWith('restored_');

function paint() {
  const sel = selection.value;
  for (const m of meshes) {
    const d = m.userData as Sel;
    const mat = m.material as THREE.MeshStandardMaterial;
    const isSelected = !!sel && d.group === sel.group && (!sel.component || d.component === sel.component) && (!sel.part || d.part === sel.part);
    const discussed = threadsAbout(openAnchored.value, d).length > 0;
    // Parts under open discussion take the highlight colour; the selection glows blue on top.
    mat.color.set(discussed ? '#e8a33a' : groupColors[d.group] ?? '#b8b0a0');
    mat.emissive.setHex(isSelected ? 0x2b5fd9 : 0x000000);
  }
}
function targetBox(sel: Sel | null) {
  const box = new THREE.Box3();
  for (const m of meshes) {
    const d = m.userData as Sel;
    if (!m.visible || !isShown(m)) continue;
    if (sel && (d.group !== sel.group || (sel.component && d.component !== sel.component) || (sel.part && d.part !== sel.part))) continue;
    box.union(new THREE.Box3().setFromObject(m));
  }
  return box;
}
function isShown(o: THREE.Object3D) { let p: THREE.Object3D | null = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; }
function fit(next = view.value, sel: Sel | null = null) {
  if (!renderer) return;
  view.value = next;
  let box = targetBox(sel);
  if (box.isEmpty()) box = targetBox(null);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.05);
  const dir = ({ iso: new THREE.Vector3(-1.15, 0.95, 1.25), top: new THREE.Vector3(0, 1, 0.0001), front: new THREE.Vector3(-1, 0.0001, 0), side: new THREE.Vector3(0, 0.0001, 1) } as Record<string, THREE.Vector3>)[next];
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1)) * (sel ? 1.6 : 1.04);
  camera.position.copy(center).add(dir.normalize().multiplyScalar(distance));
  controls.target.copy(center);
  camera.near = Math.max(0.001, radius / 1000); camera.far = Math.max(100, distance * 10); camera.updateProjectionMatrix(); controls.update();
}
function select(sel: Sel | null, focus = false) {
  selection.value = sel;
  paint();
  if (focus && sel) fit(view.value, sel);
  void patch({ focus: sel ? anchorKey(sel) : undefined });
}
function toggleLayer(id: string, visible?: boolean) {
  const obj = groupObjects.get(id); if (!obj) return;
  obj.visible = visible ?? !obj.visible;
  layers.value = layers.value.map((l) => (l.id === id ? { ...l, visible: obj.visible } : l));
}
function solo(id: string) { for (const l of layers.value) toggleLayer(l.id, l.id === id); fit(); }
function showAll() { for (const l of layers.value) toggleLayer(l.id, true); fit(); }

onMounted(async () => {
  const host = stage.value!;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch { status.value = 'error'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x10191f);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Spearhead 3D model. Drag to rotate, scroll to zoom, click a part to select it.');
  scene.add(new THREE.HemisphereLight(0xe1efff, 0x45504a, 2.7));
  for (const [pos, color, intensity] of [[[2, 5, 3], 0xffffff, 3], [[-3, 2, -4], 0xb9d5ff, 2], [[1, -2, 1], 0xffe4bf, 0.7]] as [number[], number, number][]) { const l = new THREE.DirectionalLight(color, intensity); l.position.set(pos[0], pos[1], pos[2]); scene.add(l); }
  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer!.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  observer = new ResizeObserver(resize); observer.observe(host); resize();
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down: [number, number] | undefined;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const rect = renderer!.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes.filter(isShown), false)[0];
    select(hit ? { ...(hit.object.userData as Sel) } : null);
  });
  const animate = () => { frame = requestAnimationFrame(animate); controls.update(); renderer!.render(scene, camera); };
  animate();
  try {
    const base = import.meta.env.BASE_URL;
    meta.value = await fetch(base + MODEL_META_URL).then((r) => { if (!r.ok) throw new Error('model.json ' + r.status); return r.json(); });
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(base + MODEL_URL, (e) => { if (e.total) progress.value = Math.round((e.loaded / e.total) * 100); });
    const json = gltf.parser.json as { nodes: { name?: string }[] };
    // Names as written in the model file (three.js sanitizes object names).
    const original = (o: THREE.Object3D) => { const i = gltf.parser.associations.get(o)?.nodes; return i !== undefined ? json.nodes[i]?.name ?? o.name : o.name; };
    for (const entry of meta.value!.groups) {
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
        mesh.material = new THREE.MeshStandardMaterial({ color: groupColors[entry.id] ?? '#b8b0a0', metalness: 0.05, roughness: 0.72, side: THREE.DoubleSide });
        meshes.push(mesh);
      });
    }
    scene.add(gltf.scene);
    layers.value = meta.value!.groups.map((g) => ({ id: g.id, solids: g.solids, visible: true }));
    const focus = parseAnchorKey(q('focus'));
    fit();
    if (focus) select(focus, true); else paint();
    status.value = 'ready';
  } catch (e) {
    console.warn('Model failed to load', e);
    status.value = 'error';
  }
  // Read-only hooks for browser checks and for anyone scripting a review.
  (window as any).__arrowModel = { get ready() { return status.value === 'ready'; }, get meshes() { return meshes.length; }, select: (key: string) => select(parseAnchorKey(key) ?? null, true), get selection() { return selection.value ? anchorKey(selection.value) : ''; } };
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose();
  for (const m of meshes) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
  renderer?.dispose(); renderer?.domElement.remove();
  delete (window as any).__arrowModel;
});
watch(openAnchored, paint);
watch(() => q('focus'), (key) => { const sel = parseAnchorKey(key); if (status.value === 'ready' && sel && (!selection.value || anchorKey(sel) !== anchorKey(selection.value))) select(sel, true); });

// Starting a discussion about the selection, at the level the person chooses.
const scope = ref<'part' | 'component' | 'group'>('part');
const scopes = computed(() => {
  const s = selection.value; if (!s) return [];
  return [
    ...(s.part ? [{ id: 'part' as const, sel: { ...s } }] : []),
    ...(s.component && componentName(s.component) ? [{ id: 'component' as const, sel: { group: s.group, component: s.component } }] : []),
    { id: 'group' as const, sel: { group: s.group } },
  ];
});
watch(selection, () => { scope.value = scopes.value[0]?.id ?? 'group'; composing.value = false; });
const composing = ref(false), title = ref(''), body = ref(''), busy = ref(false);
async function start() {
  if (!data.value || !selection.value) return;
  const sel = scopes.value.find((s) => s.id === scope.value)?.sel ?? selection.value;
  busy.value = true;
  let id = '';
  const ok = await act(async () => { id = (await backend.createThread({ projectId: data.value!.project.id, system: groupSystem(sel.group), title: title.value, body: body.value, tags: [], anchor: { model: MODEL_ID, ...sel, label: anchorLabel(sel) } })).id; });
  busy.value = false;
  if (ok) { title.value = body.value = ''; composing.value = false; await go('discussions', { thread: id }); }
}
</script>

<template>
  <div class="pw-model">
    <div class="pw-model-stage">
      <div ref="stage" class="pw-model-canvas" :data-ready="status === 'ready'"></div>
      <div class="pw-model-toolbar" role="toolbar" aria-label="Camera">
        <button v-for="v in ['iso', 'top', 'front', 'side']" :key="v" :class="{ active: view === v }" @click="fit(v)">{{ v === 'iso' ? '3D' : v.charAt(0).toUpperCase() + v.slice(1) }}</button>
        <button @click="fit(view, selection)">Fit</button>
      </div>
      <p v-if="status === 'loading'" class="pw-model-loading">Loading the aircraft<template v-if="progress"> · {{ progress }}%</template></p>
      <p v-else-if="status === 'error'" class="pw-model-loading">The 3D model couldn’t load in this browser. Discussions about parts are still listed on the right.</p>
      <p class="pw-model-legend"><span class="pw-dot" style="background:#e1a236"></span>open discussion <span class="pw-dot" style="background:#87b4cf"></span>inferred <span class="pw-dot" style="background:#75c3ba"></span>recovered from hidden Fusion bodies</p>
    </div>

    <aside class="pw-model-panel">
      <template v-if="selection">
        <button class="pw-back" @click="select(null)">← All discussed parts</button>
        <p class="pw-eyebrow">Selected</p>
        <h3 class="pw-model-title">{{ selectionLabel }}</h3>
        <p v-if="inferred(selection.group)" class="pw-muted pw-small">{{ selection.group.startsWith('inferred_') ? 'Mirrored from the port side; not modelled in Fusion.' : 'Recovered from bodies hidden in the Fusion file.' }}</p>
        <div class="pw-model-section">
          <p class="pw-eyebrow">Discussions about this</p>
          <p v-if="!about.length" class="pw-muted pw-small">None yet.</p>
          <RouterLink v-for="t in about" :key="t.id" :to="to('discussions', { thread: t.id })" class="pw-item">
            <span class="pw-eyebrow">{{ t.status === 'open' ? 'Open' : 'Settled' }} · {{ t.anchor!.label }}</span>
            <strong>{{ t.title }}</strong>
            <span class="pw-muted pw-small">{{ nameOf(t.authorId) }} · {{ shortDate(t.createdAt) }}</span>
          </RouterLink>
        </div>
        <div v-if="isMember" class="pw-model-section">
          <button v-if="!composing" class="pw-btn" @click="composing = true">Start a discussion about this</button>
          <form v-else class="pw-form" @submit.prevent="start">
            <label>About
              <select v-model="scope">
                <option v-for="s in scopes" :key="s.id" :value="s.id">{{ anchorLabel(s.sel) }}</option>
              </select>
            </label>
            <label>Question or proposed change<input v-model="title" maxlength="240" required /></label>
            <label>Context<textarea v-model="body" required placeholder="What you see in the model, why it matters, what would settle it." /></label>
            <div class="pw-row"><button class="pw-btn" :disabled="busy || !title.trim() || !body.trim()">Post</button><button type="button" class="pw-btn pw-btn-quiet" @click="composing = false">Cancel</button></div>
          </form>
        </div>
        <p v-else-if="!state.me" class="pw-muted pw-small">Sign in, or pick someone under “Explore as”, to start a discussion about this part.</p>
      </template>
      <template v-else>
        <p class="pw-eyebrow">Spearhead · Fusion snapshot {{ meta?.snapshot ?? '' }}</p>
        <h3 class="pw-model-title">Click a part to see or start a discussion about it.</h3>
        <p class="pw-muted pw-small">{{ meta?.solids ?? '' }} solids, {{ meta?.span_m ?? '' }} m span. A tessellated preview of the Build123D reconstruction of the latest Fusion structures; the STEP files in the Spearhead repository are exact.</p>
        <div class="pw-model-section">
          <p class="pw-eyebrow">Parts under discussion · {{ anchored.length }}</p>
          <p v-if="!anchored.length" class="pw-muted pw-small">No discussions are attached to parts yet.</p>
          <button v-for="t in anchored" :key="t.id" class="pw-item pw-model-thread" @click="select({ group: t.anchor!.group, component: t.anchor!.component, part: t.anchor!.part }, true)">
            <span class="pw-eyebrow">{{ t.status === 'open' ? 'Open' : 'Settled' }} · {{ t.anchor!.label }}</span>
            <strong>{{ t.title }}</strong>
          </button>
        </div>
        <div class="pw-model-section">
          <p class="pw-eyebrow">Layers</p>
          <div v-for="l in layers" :key="l.id" class="pw-layer">
            <label><input type="checkbox" :checked="l.visible" @change="toggleLayer(l.id)" /><span class="pw-dot" :style="{ background: groupColors[l.id] }"></span>{{ groupNames[l.id] ?? l.id }}</label>
            <span class="pw-muted pw-small">{{ l.solids }}</span>
            <button class="pw-layer-solo" @click="solo(l.id)">Solo</button>
          </div>
          <button class="pw-link pw-layer-all" @click="showAll">Show all</button>
        </div>
      </template>
      <p class="pw-muted pw-small pw-model-source">Model from <a href="https://github.com/Arrow-air/project-spearhead/tree/hex/build123d-fusion-aircraft/src/design" target="_blank" rel="noopener">project-spearhead ↗</a> · revision {{ meta?.revision ?? '' }}</p>
    </aside>
  </div>
</template>
