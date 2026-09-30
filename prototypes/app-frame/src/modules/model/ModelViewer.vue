<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MODEL_META_URL, MODEL_URL, componentName, provenance, selKey, within, type Sel } from './model';

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
const emit = defineEmits<{ pick: [sel: Sel | null]; ready: [meta: ModelMeta, structure: Structure]; thumbs: [thumbs: Thumbs] }>();
export interface ModelMeta { solids: number; revision: string; snapshot: string; span_m: number; groups: { id: string; solids: number }[] }
/** group → component ('' for loose solids) → solid names, as the model file has them. */
export type Structure = Record<string, Record<string, string[]>>;
/** selKey of a group or component → a small transparent render of just that piece. */
export type Thumbs = Record<string, string>;

type View = 'iso' | 'top' | 'front' | 'side';
const stage = ref<HTMLDivElement>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
const progress = ref(0);
const view = ref<View>('iso');
// Blueprint grid behind the model, on by default; remembered in this browser.
const GRID_KEY = 'app-frame:viewer-grid';
const grid = ref(true);
try { grid.value = localStorage.getItem(GRID_KEY) !== 'off'; } catch {}
function toggleGrid() {
  grid.value = !grid.value;
  try { localStorage.setItem(GRID_KEY, grid.value ? 'on' : 'off'); } catch {}
}

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

// Motion: camera moves and highlight changes ease over the same half second.
// Both run inside the render loop that already draws every frame, so they cost
// a few lerps per frame and nothing else. Reduced motion keeps the instant cut.
const DURATION = 550;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Where each part's look is heading; the loop eases the material toward it.
const looks = new WeakMap<THREE.Mesh, { color: THREE.Color; opacity: number; emissive: THREE.Color }>();
let fading = false;

function paint(instant = false) {
  const sel = props.selection;
  for (const m of meshes) {
    const d = m.userData as Sel;
    const lit = isLit(d.group);
    const discussed = lit && props.discussed.some((a) => within(d, a) || within(a, d));
    const selected = !!sel && within(d, sel);
    looks.set(m, {
      color: new THREE.Color(!lit ? colors.ghost : selected ? colors.selected : discussed ? colors.discussed : colors[provenance(d.group)]),
      opacity: lit ? 1 : 0.07,
      emissive: new THREE.Color(selected ? 0x1d2e62 : 0x000000),
    });
  }
  for (const [id, obj] of groupObjects) obj.visible = isOn(id);
  if (instant || reduced()) settle(1); else fading = true;
}
/** Move every material a fraction `k` of the way to its look; true once all have arrived. */
function settle(k: number) {
  let done = true;
  for (const m of meshes) {
    const mat = m.material as THREE.MeshStandardMaterial;
    const look = looks.get(m); if (!look) continue;
    mat.color.lerp(look.color, k); mat.emissive.lerp(look.emissive, k);
    mat.opacity += (look.opacity - mat.opacity) * k;
    const near = (a: THREE.Color, b: THREE.Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.006;
    const arrived = k === 1 || (Math.abs(mat.opacity - look.opacity) < 0.004 && near(mat.color, look.color) && near(mat.emissive, look.emissive));
    if (arrived) { mat.color.copy(look.color); mat.emissive.copy(look.emissive); mat.opacity = look.opacity; } else done = false;
    // Solid parts write depth; anything see-through (or on its way) blends.
    const solid = mat.opacity > 0.99;
    if (mat.transparent === solid) { mat.transparent = !solid; mat.depthWrite = solid; mat.needsUpdate = true; }
  }
  return done;
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
/** The camera shot that frames box `b` from direction `dir`. */
function shot(b: THREE.Box3, dir: THREE.Vector3, margin: number) {
  const target = b.getCenter(new THREE.Vector3());
  const radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.05);
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1)) * margin;
  return { target, dir: dir.clone().normalize(), distance, near: Math.max(0.001, radius / 1000), far: Math.max(100, distance * 10) };
}
type Shot = ReturnType<typeof shot>;
function place(s: Shot) {
  camera.position.copy(s.target).addScaledVector(s.dir, s.distance);
  controls.target.copy(s.target);
  camera.near = s.near; camera.far = s.far; camera.updateProjectionMatrix(); controls.update();
}
function aim(b: THREE.Box3, dir: THREE.Vector3, margin: number) { place(shot(b, dir, margin)); }

// A camera move in progress: the aim point slides, the view direction swings
// around it (so Top to 3D arcs instead of cutting through the model), and the
// distance eases in log space (so zooming feels even).
let glide: { from: Shot; to: Shot; turn: THREE.Quaternion; start: number } | undefined;
function glideTo(to: Shot) {
  const offset = camera.position.clone().sub(controls.target);
  const from: Shot = { target: controls.target.clone(), dir: offset.clone().normalize(), distance: offset.length(), near: Math.min(camera.near, to.near), far: Math.max(camera.far, to.far) };
  if (reduced() || from.distance === 0) { place(to); return; }
  glide = { from, to, turn: new THREE.Quaternion().setFromUnitVectors(from.dir, to.dir), start: performance.now() };
  camera.near = from.near; camera.far = from.far; camera.updateProjectionMatrix();
}
function stepGlide(now: number) {
  if (!glide) return;
  const { from, to, turn, start } = glide;
  const e = ease(Math.min(1, (now - start) / DURATION));
  const dir = from.dir.clone().applyQuaternion(new THREE.Quaternion().slerp(turn, e));
  const distance = Math.exp(Math.log(from.distance) + (Math.log(to.distance) - Math.log(from.distance)) * e);
  controls.target.lerpVectors(from.target, to.target, e);
  camera.position.copy(controls.target).addScaledVector(dir, distance);
  if (e === 1) { place(to); glide = undefined; }
}
/** Frame the selection, else the lit groups, else the whole aircraft. */
function fit(next: View = view.value, instant = false) {
  if (!renderer || !meshes.length) return;
  view.value = next;
  const sel = props.selection;
  let b = sel ? box((d) => within(d, sel)) : new THREE.Box3();
  if (b.isEmpty() && props.lit?.length) b = box((d) => isLit(d.group));
  if (b.isEmpty()) b = box(() => true);
  const s = shot(b, dirs[next], sel ? 1.5 : 1.04);
  if (instant) place(s); else glideTo(s);
}

/**
 * Render one piece of the aircraft on its own into a small transparent image,
 * for the panel's tiles. Uses the live renderer for a moment and puts
 * everything back in the same task, so the canvas never shows it.
 */
/** Box around the heart of a piece: the 80% of its solids whose centres sit
    nearest its median centre, padded a little. Long spars and scattered
    fasteners that belong to a group don't shrink the render of it. */
function coreBox(only: (d: Sel) => boolean) {
  const items = meshes.filter((m) => only(m.userData as Sel)).map((m) => new THREE.Box3().setFromObject(m));
  if (items.length < 5) return box(only);
  const centers = items.map((b) => b.getCenter(new THREE.Vector3()));
  const median = (axis: 'x' | 'y' | 'z') => { const v = centers.map((c) => c[axis]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const mid = new THREE.Vector3(median('x'), median('y'), median('z'));
  const near = centers.map((c, i) => ({ c, i, d: c.distanceTo(mid) })).sort((a, b) => a.d - b.d).slice(0, Math.ceil(items.length * 0.8));
  const core = new THREE.Box3();
  for (const n of near) core.expandByPoint(n.c);
  // Pad by the typical solid's size so the pieces at the edge aren't cut in half.
  const sizes = near.map((n) => items[n.i].getSize(new THREE.Vector3()).length()).sort((a, b) => a - b);
  core.expandByScalar(sizes[Math.floor(sizes.length / 2)] / 2);
  return core;
}

/** The canvas as an image, trimmed to its drawn pixels plus a small margin. */
function cropped(src: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return c.toDataURL('image/png');
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.06);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

function snapshot(only: (d: Sel) => boolean, w = 240, h = 150) {
  const r = renderer!;
  const size = r.getSize(new THREE.Vector2());
  const cam = { pos: camera.position.clone(), target: controls.target.clone(), aspect: camera.aspect, near: camera.near, far: camera.far };
  const groupsOn = [...groupObjects.values()].map((o) => [o, o.visible] as const);
  for (const [o] of groupsOn) o.visible = true;
  for (const m of meshes) {
    const d = m.userData as Sel;
    const mat = m.material as THREE.MeshStandardMaterial;
    m.visible = only(d);
    mat.color.set(colors[provenance(d.group)]); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; mat.emissive.setHex(0);
  }
  r.setSize(w, h, false);
  camera.aspect = w / h;
  aim(coreBox(only), dirs.iso, 1.08);
  r.render(scene, camera);
  const url = cropped(r.domElement);
  for (const m of meshes) m.visible = true;
  for (const [o, v] of groupsOn) o.visible = v;
  r.setSize(size.x, size.y, false);
  camera.aspect = cam.aspect; camera.near = cam.near; camera.far = cam.far; camera.position.copy(cam.pos); controls.target.copy(cam.target);
  camera.updateProjectionMatrix(); controls.update();
  paint(true);
  return url;
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
  // Left orbits, middle and right pan, the wheel zooms (the CAD convention).
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  // Stop the browser's middle-click autoscroll from grabbing the pan.
  renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer!.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  observer = new ResizeObserver(resize); observer.observe(host); resize();

  // A click (not a drag) picks the nearest lit part; empty space clears.
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down: [number, number] | undefined;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = e.button === 0 ? [e.clientX, e.clientY] : undefined; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    // Only a left click picks; panning with the other buttons never selects.
    if (e.button !== 0 || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const rect = renderer!.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes.filter((m) => isShown(m) && isLit((m.userData as Sel).group)), false)[0];
    emit('pick', hit ? { ...(hit.object.userData as Sel) } : null);
  });
  // Grabbing the view hands control back straight away.
  controls.addEventListener('start', () => { glide = undefined; });
  let last = performance.now();
  const animate = (now: number) => {
    frame = requestAnimationFrame(animate);
    stepGlide(now);
    // Fade: close ~99.9% of the gap over DURATION, whatever the frame rate.
    if (fading) fading = !settle(1 - Math.pow(0.001, Math.min(now - last, 100) / DURATION));
    last = now;
    controls.update();
    renderer!.render(scene, camera);
  };
  frame = requestAnimationFrame(animate);

  try {
    const base = import.meta.env.BASE_URL;
    const meta: ModelMeta = await fetch(base + MODEL_META_URL).then((r) => { if (!r.ok) throw new Error('model.json ' + r.status); return r.json(); });
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(base + MODEL_URL, (e) => { if (e.total) progress.value = Math.round((e.loaded / e.total) * 100); });
    const json = gltf.parser.json as { nodes: { name?: string }[] };
    // Names as written in the model file (three.js sanitizes object names).
    const original = (o: THREE.Object3D) => { const i = gltf.parser.associations.get(o)?.nodes; return i !== undefined ? json.nodes[i]?.name ?? o.name : o.name; };
    const structure: Structure = {};
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
        ((structure[entry.id] ??= {})[component ?? ''] ??= []).push(original(mesh));
        mesh.material = new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.7, side: THREE.DoubleSide });
        meshes.push(mesh);
      });
    }
    scene.add(gltf.scene);
    paint(true);
    fit(view.value, true);
    status.value = 'ready';
    // Read-only hook for browser checks: where the camera is, and whether it's moving.
    (window as any).__arrowView = () => ({ at: camera.position.toArray().map((n) => +n.toFixed(3)), gliding: !!glide, fading });
    emit('ready', meta, structure);
    // Tiles for every group and every named component.
    const thumbs: Thumbs = {};
    for (const [group, comps] of Object.entries(structure)) {
      thumbs[selKey({ group })] = snapshot((d) => d.group === group);
      for (const component of Object.keys(comps)) {
        if (componentName(component)) thumbs[selKey({ group, component })] = snapshot((d) => d.group === group && d.component === component);
      }
    }
    emit('thumbs', thumbs);
  } catch (e) {
    console.warn('Model failed to load', e);
    status.value = 'error';
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose();
  for (const m of meshes) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
  renderer?.dispose(); renderer?.domElement.remove();
  delete (window as any).__arrowView;
});

watch(() => [props.discussed, props.hidden, props.lit], () => paint(), { deep: true });
watch(() => props.selection, (s, prev) => { paint(); if (s || prev) fit(); }, { deep: true });
watch(() => props.lit, () => fit(), { deep: true });
</script>

<template>
  <div class="viewer">
    <div class="grid" :class="{ on: grid }" aria-hidden="true"></div>
    <div ref="stage" class="canvas" :data-ready="status === 'ready'"></div>
    <div class="toolbar">
    <div class="seg views" role="radiogroup" aria-label="Camera">
      <button v-for="v in (['iso', 'top', 'front', 'side'] as View[])" :key="v" type="button" role="radio" :aria-checked="view === v" @click="fit(v)">
        {{ v === 'iso' ? '3D' : v[0].toUpperCase() + v.slice(1) }}
      </button>
    </div>
    <button type="button" class="grid-toggle" :aria-pressed="grid" :title="grid ? 'Hide grid' : 'Show grid'" @click="toggleGrid">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" /></svg>
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
.viewer { position: relative; height: 100%; min-height: 0; background: var(--cad-viewer, var(--thumb-bg)); overflow: hidden; }
.canvas { position: absolute; inset: 0; }
.canvas :deep(canvas) { display: block; cursor: grab; }
.canvas :deep(canvas:active) { cursor: grabbing; }

.toolbar { position: absolute; top: 12px; left: 12px; display: flex; gap: 6px; }
.grid { position: absolute; inset: 0; background: var(--cad-grid, none); opacity: 0; transition: opacity 200ms ease-out; pointer-events: none; }
.grid.on { opacity: 1; }
.grid-toggle {
  display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px;
  background: var(--slate-a3); backdrop-filter: blur(8px); color: var(--fg-muted); cursor: pointer; transition: color 120ms, background-color 120ms;
}
.grid-toggle:hover { color: var(--fg-2); }
.grid-toggle[aria-pressed='true'] { background: var(--slate-a5); color: var(--fg); }
.grid-toggle svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.3; stroke-linejoin: round; }
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a3); backdrop-filter: blur(8px); }
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
