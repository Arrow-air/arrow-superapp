<script setup lang="ts">
// The Dev Kit assembly, exported from the repository's build123d CAD. Every
// mesh resolves to a BOM number, so hover and click work per part. The
// viewer is Gavin's CAD explorer from app-frame (camera glides, the
// perspective/orthographic dolly-zoom, camera views, the blueprint grid,
// fades, tiles cut from the model) on the Quiver model, with the explode
// slider from prototypes/quiver-app. It only draws: what is lit, selected,
// hidden and under discussion all come in as props; a click comes out as
// `select`.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { theme } from '../../frame/theme';

/** An assembly in the model file (Plates, Landing Gear, PCB…), switchable as a layer. */
export interface Layer { id: string; label: string; category: string; parts: string[] }
/** A key (a zone, or a BOM number) → a small transparent render of just those parts. */
export type Thumbs = Record<string, string>;

const props = defineProps<{
  /** BOM numbers drawn solid; everything else is a faint ghost. Null lights everything. */
  lit: string[] | null;
  /** Layers switched off entirely. */
  hidden: string[];
  selected: string | null;
  /** Parts with an open thread; they take the discussion colour. */
  discussed: string[];
  explode: number;
  labels: Record<string, string>;
}>();
const emit = defineEmits<{ select: [id: string | null]; ready: [ids: string[], layers: Layer[]] }>();

type View = 'iso' | 'top' | 'front' | 'side';
const host = ref<HTMLDivElement>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
const progress = ref(0);
const view = ref<View>('iso');
const hover = ref<string | null>(null);
// Blueprint grid behind the model, on by default; remembered in this browser.
const GRID_KEY = 'superapp:viewer-grid';
const grid = ref(true);
try { grid.value = localStorage.getItem(GRID_KEY) !== 'off'; } catch {}
function toggleGrid() {
  grid.value = !grid.value;
  try { localStorage.setItem(GRID_KEY, grid.value ? 'on' : 'off'); } catch {}
}

// Part colours by BOM family: structure, supporting structure, equipment,
// harness. On the dark blueprint the structure is lifted so arms and gear read.
const dark = () => theme.value === 'dark' || (theme.value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
const FAMILY_DARK: Record<string, string> = { '1': '#8a939e', '2': '#c3c8ce', '3': '#4f9a84', '4': '#d08c48' };
const FAMILY_LIGHT: Record<string, string> = { '1': '#3a3f46', '2': '#9aa1aa', '3': '#3f7a69', '4': '#b97a3a' };
const colors = { discussed: '#ffc53d', selected: '#5472e4', ghost: '#5a6169' };
const family = (id: string) => (dark() ? FAMILY_DARK : FAMILY_LIGHT)[id[0]] ?? '#888888';

// three.js objects stay outside Vue's reactivity.
let renderer: THREE.WebGLRenderer | undefined, camera: THREE.PerspectiveCamera, controls: OrbitControls, raf = 0, ro: ResizeObserver | undefined;
const scene = new THREE.Scene();
interface Part { mesh: THREE.Mesh; id: string; layer: string; home: THREE.Vector3; dir: THREE.Vector3 }
const parts: Part[] = [];
const isLit = (id: string) => !props.lit || props.lit.includes(id);
const isOn = (layer: string) => !props.hidden.includes(layer);

// Projection (Gavin's). `camera` is the rig the controls drive and all framing
// uses; what gets drawn is a view of it. Perspective draws through `lens`, and
// at full flatness through `ortho`. Easing `flat` from 0 to 1 is the
// dolly-zoom that turns perspective into orthographic without a jump.
const FOV = 35, FLAT_FOV = 1.2;
const lens = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
const projection = ref<'persp' | 'ortho'>('persp');
let flat = 0, flatFrom = 0, flatStart = 0;
function setProjection(p: 'persp' | 'ortho') {
  if (projection.value === p) return;
  projection.value = p;
  flatFrom = flat; flatStart = performance.now();
  if (reduced()) flat = p === 'ortho' ? 1 : 0;
}
function viewCamera(): THREE.Camera {
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  if (flat >= 1) {
    const h = distance * halfTan, w = h * camera.aspect;
    ortho.left = -w; ortho.right = w; ortho.top = h; ortho.bottom = -h;
    ortho.near = -camera.far; ortho.far = camera.far;
    ortho.position.copy(camera.position); ortho.quaternion.copy(camera.quaternion);
    ortho.updateProjectionMatrix();
    return ortho;
  }
  if (flat <= 0) return camera;
  const t = halfTan + (Math.tan(THREE.MathUtils.degToRad(FLAT_FOV / 2)) - halfTan) * flat;
  const scale = halfTan / t;
  lens.fov = THREE.MathUtils.radToDeg(2 * Math.atan(t)); lens.aspect = camera.aspect;
  lens.near = camera.near * scale; lens.far = camera.far * scale + distance * scale;
  lens.position.copy(controls.target).addScaledVector(offset, scale); lens.quaternion.copy(camera.quaternion);
  lens.updateProjectionMatrix();
  return lens;
}
function stepFlat(now: number) {
  const goal = projection.value === 'ortho' ? 1 : 0;
  if (flat === goal) return;
  const e = ease(Math.min(1, (now - flatStart) / 450));
  flat = flatFrom + (goal - flatFrom) * e;
  if (e === 1) flat = goal;
}
/** The view buttons: flat views are orthographic, 3D is perspective, as in most CAD tools. */
function pickView(v: View) {
  setProjection(v === 'iso' ? 'persp' : 'ortho');
  fit(v);
}
let lastView: THREE.Camera | undefined;

// Motion: camera moves and highlight changes ease over the same half second,
// inside the render loop. Reduced motion keeps the instant cut.
const DURATION = 550;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const looks = new WeakMap<THREE.Mesh, { color: THREE.Color; opacity: number; emissive: THREE.Color }>();
let fading = false;
function paint(instant = false) {
  for (const p of parts) {
    const lit = isLit(p.id);
    const sel = p.id === props.selected, hov = lit && p.id === hover.value && !sel;
    const discussed = lit && props.discussed.includes(p.id);
    looks.set(p.mesh, {
      color: new THREE.Color(!lit ? colors.ghost : sel ? colors.selected : discussed ? colors.discussed : family(p.id)),
      opacity: lit ? 1 : 0.07,
      emissive: new THREE.Color(sel ? 0x1d2e62 : hov ? 0x243a6b : 0x000000),
    });
    p.mesh.visible = isOn(p.layer);
  }
  if (instant || reduced()) settle(1); else fading = true;
}
/** Move every material a fraction `k` of the way to its look; true once all have arrived. */
function settle(k: number) {
  let done = true;
  const near = (a: THREE.Color, b: THREE.Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.006;
  for (const p of parts) {
    const mat = p.mesh.material as THREE.MeshStandardMaterial;
    const look = looks.get(p.mesh); if (!look) continue;
    mat.color.lerp(look.color, k); mat.emissive.lerp(look.emissive, k);
    mat.opacity += (look.opacity - mat.opacity) * k;
    const arrived = k === 1 || (Math.abs(mat.opacity - look.opacity) < 0.004 && near(mat.color, look.color) && near(mat.emissive, look.emissive));
    if (arrived) { mat.color.copy(look.color); mat.emissive.copy(look.emissive); mat.opacity = look.opacity; } else done = false;
    // Solid parts write depth; anything see-through (or on its way) blends.
    const solid = mat.opacity > 0.99;
    if (mat.transparent === solid) { mat.transparent = !solid; mat.depthWrite = solid; mat.needsUpdate = true; }
  }
  return done;
}
function place() {
  for (const p of parts) p.mesh.position.copy(p.home).addScaledVector(p.dir, props.explode);
}

function box(only: (p: Part) => boolean) {
  const b = new THREE.Box3();
  for (const p of parts) if (p.mesh.visible && only(p)) b.expandByObject(p.mesh);
  return b;
}
const dirs: Record<View, THREE.Vector3> = {
  iso: new THREE.Vector3(1, 0.62, 1.15), top: new THREE.Vector3(0, 1, 0.0001),
  front: new THREE.Vector3(0, 0.0001, 1), side: new THREE.Vector3(1, 0.0001, 0),
};
/** The camera shot that frames box `b` from direction `dir`. */
function shot(b: THREE.Box3, dir: THREE.Vector3, margin: number) {
  const target = b.getCenter(new THREE.Vector3());
  const radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.005);
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1)) * margin;
  return { target, dir: dir.clone().normalize(), distance, near: Math.max(0.0005, radius / 1000), far: Math.max(10, distance * 20) };
}
type Shot = ReturnType<typeof shot>;
function put(s: Shot) {
  camera.position.copy(s.target).addScaledVector(s.dir, s.distance);
  controls.target.copy(s.target);
  camera.near = s.near; camera.far = s.far; camera.updateProjectionMatrix(); controls.update();
}

// A camera move in progress: the aim point slides, the view direction swings
// around it, and the distance eases in log space.
let glide: { from: Shot; to: Shot; turn: THREE.Quaternion; start: number } | undefined;
function glideTo(to: Shot) {
  const offset = camera.position.clone().sub(controls.target);
  const from: Shot = { target: controls.target.clone(), dir: offset.clone().normalize(), distance: offset.length(), near: Math.min(camera.near, to.near), far: Math.max(camera.far, to.far) };
  if (reduced() || from.distance === 0) { put(to); return; }
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
  if (e === 1) { put(to); glide = undefined; }
}
/** Frame the selection, else the lit parts, else the whole aircraft. Keeps the current view unless told. */
function fit(next: View = view.value, instant = false) {
  if (!renderer || !parts.length) return;
  view.value = next;
  const sel = props.selected;
  let b = sel ? box((p) => p.id === sel) : new THREE.Box3();
  if (b.isEmpty() && props.lit?.length) b = box((p) => isLit(p.id));
  if (b.isEmpty()) b = box(() => true);
  const s = shot(b, dirs[next], sel ? 1.6 : props.lit ? 1.3 : 1.0);
  if (instant) put(s); else glideTo(s);
}

/** Box around the heart of a piece: the 80% of its meshes nearest its median
    centre, so a stray far-off mesh doesn't shrink the render. */
function coreBox(only: (p: Part) => boolean) {
  const items = parts.filter(only).map((p) => new THREE.Box3().setFromObject(p.mesh));
  if (items.length < 5) return box(only);
  const centers = items.map((b) => b.getCenter(new THREE.Vector3()));
  const median = (axis: 'x' | 'y' | 'z') => { const v = centers.map((c) => c[axis]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const mid = new THREE.Vector3(median('x'), median('y'), median('z'));
  const nearest = centers.map((c, i) => ({ i, d: c.distanceTo(mid) })).sort((a, b) => a.d - b.d).slice(0, Math.ceil(items.length * 0.8));
  const core = new THREE.Box3();
  for (const n of nearest) core.union(items[n.i]);
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
/**
 * Render some parts on their own into a small transparent image, for the
 * panel's tiles. Borrows the live renderer and puts everything back in the
 * same task, so the canvas never shows it.
 */
function snapshot(ids: Set<string>, w = 240, h = 150) {
  const r = renderer!;
  const size = r.getSize(new THREE.Vector2());
  const cam = { pos: camera.position.clone(), target: controls.target.clone(), aspect: camera.aspect, near: camera.near, far: camera.far };
  for (const p of parts) {
    const mat = p.mesh.material as THREE.MeshStandardMaterial;
    p.mesh.visible = ids.has(p.id);
    mat.color.set(family(p.id)); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; mat.emissive.setHex(0);
  }
  r.setSize(w, h, false);
  camera.aspect = w / h;
  put(shot(coreBox((p) => ids.has(p.id)), dirs.iso, 1.05));
  r.render(scene, camera);
  const url = cropped(r.domElement);
  r.setSize(size.x, size.y, false);
  camera.aspect = cam.aspect; camera.near = cam.near; camera.far = cam.far; camera.position.copy(cam.pos); controls.target.copy(cam.target);
  camera.updateProjectionMatrix(); controls.update();
  paint(true);
  return url;
}
/** Tiles for each set, one at a time in idle moments, so clicks and slides stay smooth. */
function thumbnails(sets: { key: string; parts: string[] }[], each: (key: string, url: string) => void) {
  const queue = sets.filter((s) => s.parts.length);
  const later = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 16));
  const step = () => {
    if (!renderer || !queue.length) return;
    const s = queue.shift()!;
    each(s.key, snapshot(new Set(s.parts)));
    later(step);
  };
  later(step);
}
defineExpose({ fit, reset: () => fit('iso'), thumbnails });

const idOf = (o: THREE.Object3D | null) => { for (let n = o; n; n = n.parent) { const m = /^(\d{4})/.exec(n.name); if (m) return m[1]; } return ''; };

onMounted(async () => {
  const el = host.value!;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { status.value = 'error'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Quiver Dev Kit 3D model. Drag to rotate, right-drag to pan, scroll to zoom, click a part to select it.');
  scene.add(new THREE.HemisphereLight(0xe1efff, 0x2a2e33, 2.6));
  for (const [pos, color, intensity] of [[[2, 5, 3], 0xffffff, 3], [[-3, 2, -4], 0xb9d5ff, 1.8], [[1, -2, 1], 0xffe4bf, 0.6]] as [number[], number, number][]) {
    const l = new THREE.DirectionalLight(color, intensity); l.position.set(pos[0], pos[1], pos[2]); scene.add(l);
  }
  camera = new THREE.PerspectiveCamera(FOV, 1, 0.001, 100);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08;
  // Left orbits, middle and right pan, the wheel zooms (the CAD convention).
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  const size = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer!.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  ro = new ResizeObserver(size); ro.observe(el); size();

  // A left click (not a drag) picks the nearest lit part; empty space clears.
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
  const under = (ev: PointerEvent) => {
    const r = renderer!.domElement.getBoundingClientRect();
    pt.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pt, lastView ?? camera);
    const hit = ray.intersectObjects(parts.filter((p) => p.mesh.visible && isLit(p.id)).map((p) => p.mesh), false)[0];
    return hit ? idOf(hit.object) : null;
  };
  const cv = renderer.domElement;
  let down: [number, number] | undefined;
  cv.addEventListener('pointerdown', (e) => { down = e.button === 0 ? [e.clientX, e.clientY] : undefined; });
  cv.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    emit('select', under(e));
  });
  cv.addEventListener('pointermove', (e) => { if (e.buttons) return; const id = under(e); if (id !== hover.value) { hover.value = id; cv.style.cursor = id ? 'pointer' : 'grab'; paint(); } });
  cv.addEventListener('pointerleave', () => { if (hover.value) { hover.value = null; paint(); } });
  // Grabbing the view hands control back straight away.
  controls.addEventListener('start', () => { glide = undefined; });

  let last = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    stepGlide(now);
    if (fading) fading = !settle(1 - Math.pow(0.001, Math.min(now - last, 100) / DURATION));
    last = now;
    controls.update();
    stepFlat(now);
    lastView = viewCamera();
    renderer!.render(scene, lastView);
  };
  raf = requestAnimationFrame(loop);

  try {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}quiver.glb`, (e) => { if (e.total) progress.value = Math.round((e.loaded / e.total) * 100); });
    const json = gltf.parser.json as { nodes: { name?: string }[] };
    // Names as written in the model file (three.js sanitizes object names).
    const original = (o: THREE.Object3D) => { const i = gltf.parser.associations.get(o)?.nodes; return i !== undefined ? json.nodes[i]?.name ?? o.name : o.name; };
    scene.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(gltf.scene);
    const centre = all.getCenter(new THREE.Vector3());

    // Layers: the assemblies under each family (Plates, Landing Gear, PCB…);
    // a family whose parts sit directly under it is one layer itself.
    const layers = new Map<string, Layer>();
    const layerOf = (mesh: THREE.Object3D) => {
      const chain: THREE.Object3D[] = [];
      for (let n: THREE.Object3D | null = mesh; n && n !== gltf.scene; n = n.parent) chain.unshift(n);
      const [, cat, asm] = chain; // root, family, assembly or part
      if (!cat) return { id: '', label: '', category: '' };
      const own = !asm || /^\d{4}/.test(original(asm));
      return { id: original(own ? cat : asm), label: original(own ? cat : asm), category: original(cat) };
    };
    // Explode per part number, not per mesh, so a multi-body part moves as one piece.
    const byId = new Map<string, THREE.Box3>();
    gltf.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const id = idOf(m); if (!id) return; const b = byId.get(id) ?? new THREE.Box3(); b.expandByObject(m); byId.set(id, b); });
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const id = idOf(m); if (!id) { m.visible = false; return; }
      // The export has no normals; flat shading derives them per face.
      m.material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.72, metalness: id[0] === '2' ? 0.3 : 0.05, side: THREE.DoubleSide });
      const world = byId.get(id)!.getCenter(new THREE.Vector3()).sub(centre);
      world.y *= 1.6; // pull the stack apart vertically more than sideways
      const parentInv = new THREE.Matrix4().copy(m.parent!.matrixWorld).invert();
      const dir = world.clone().transformDirection(parentInv).multiplyScalar(world.length() / (m.parent!.getWorldScale(new THREE.Vector3()).x || 1));
      const l = layerOf(m);
      if (l.id) { const entry = layers.get(l.id) ?? { ...l, parts: [] }; if (!entry.parts.includes(id)) entry.parts.push(id); layers.set(l.id, entry); }
      parts.push({ mesh: m, id, layer: l.id, home: m.position.clone(), dir });
    });
    paint(true); place(); fit('iso', true);
    status.value = 'ready';
    // Read-only hook for browser checks: where the camera is, and whether it's moving.
    (window as any).__arrowView = () => ({ at: camera.position.toArray().map((n) => +n.toFixed(3)), gliding: !!glide, fading, projection: projection.value, flat: +flat.toFixed(3) });
    emit('ready', [...byId.keys()], [...layers.values()]);
  } catch (e) {
    console.warn('Model failed to load', e);
    status.value = 'error';
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf); ro?.disconnect(); controls?.dispose();
  for (const p of parts) { p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose(); }
  renderer?.dispose(); renderer?.domElement.remove();
  delete (window as any).__arrowView;
});

watch(() => [props.discussed, props.hidden, props.lit, theme.value], () => paint(), { deep: true });
watch(() => props.selected, (s, prev) => { paint(); if (s || prev) fit(); });
watch(() => props.lit, () => fit(), { deep: true });
watch(() => props.explode, () => { place(); if (!glide) fit(view.value, true); });
</script>

<template>
  <div class="viewer" :data-ready="status === 'ready' ? 'true' : undefined">
    <div class="grid" :class="{ on: grid }" aria-hidden="true"></div>
    <div ref="host" class="canvas"></div>
    <div class="view-tools">
      <div class="seg views" role="radiogroup" aria-label="Camera">
        <button v-for="v in (['iso', 'top', 'front', 'side'] as View[])" :key="v" type="button" role="radio" :aria-checked="view === v" @click="pickView(v)">
          {{ v === 'iso' ? '3D' : v[0].toUpperCase() + v.slice(1) }}
        </button>
      </div>
      <button type="button" class="chipbtn" :title="projection === 'ortho' ? 'Orthographic: click for perspective' : 'Perspective: click for orthographic'" @click="setProjection(projection === 'ortho' ? 'persp' : 'ortho')">
        {{ projection === 'ortho' ? 'Ortho' : 'Persp' }}
      </button>
      <button type="button" class="chipbtn icon" :aria-pressed="grid" :title="grid ? 'Hide grid' : 'Show grid'" @click="toggleGrid">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" /></svg>
      </button>
      <slot name="tools" />
    </div>
    <p v-if="status === 'loading'" class="note center">Loading the Dev Kit assembly<template v-if="progress"> · {{ progress }}%</template></p>
    <p v-else-if="status === 'error'" class="note center">This browser can't show the 3D model (WebGL is off). The parts list still works.</p>
    <p v-else-if="hover" class="note hovering"><span class="mono">{{ hover }}</span> {{ labels[hover] }}</p>
    <p class="note legend">
      <span><i :style="{ background: colors.selected }"></i>Selected</span>
      <span><i :style="{ background: colors.discussed }"></i>Open thread</span>
      <span><i :style="{ background: family('1') }"></i>Structure</span>
      <span class="hide-sm"><i :style="{ background: family('3') }"></i>Equipment</span>
    </p>
    <slot />
  </div>
</template>

<style scoped>
.viewer {
  position: relative; height: 100%; min-height: 0; overflow: hidden; background: var(--cad-viewer);
  /* Controls over the model: a translucent blueprint tint, not the frame's grey. */
  --chip-bg: var(--cad-chip); --chip-hover: var(--cad-chip-hover); --chip-active: var(--cad-chip-active);
}
.canvas { position: absolute; inset: 0; }
.canvas :deep(canvas) { display: block; outline: none; cursor: grab; }
.canvas :deep(canvas:active) { cursor: grabbing; }
.grid { position: absolute; inset: 0; background: var(--cad-grid); opacity: 0; transition: opacity 200ms ease-out; pointer-events: none; }
.grid.on { opacity: 1; }
.view-tools { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; flex-wrap: wrap; gap: 6px; pointer-events: none; }
.view-tools > * { pointer-events: auto; }
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--chip-bg); backdrop-filter: blur(8px); }
.seg button { height: 24px; padding: 0 9px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--chip-active); color: var(--fg); }
.chipbtn {
  height: 28px; min-width: 52px; padding: 0 10px; border: 0; border-radius: 8px; background: var(--chip-bg); backdrop-filter: blur(8px);
  color: var(--fg-2); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; transition: color 120ms, background-color 120ms;
}
.chipbtn:hover { color: var(--fg); background: var(--chip-hover); }
.chipbtn.icon { display: grid; place-items: center; min-width: 0; width: 28px; padding: 0; color: var(--fg-muted); }
.chipbtn.icon[aria-pressed='true'] { background: var(--chip-active); color: var(--fg); }
.chipbtn:focus-visible, .seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.chipbtn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.3; stroke-linejoin: round; }

.note { position: absolute; margin: 0; font-size: var(--text-sm); color: var(--fg-muted); pointer-events: none; }
.center { inset: 0; display: grid; place-items: center; }
.hovering { left: 50%; bottom: 52px; transform: translateX(-50%); padding: 5px 10px; border-radius: 8px; background: var(--chip-bg); backdrop-filter: blur(8px); color: var(--fg-2); white-space: nowrap; }
.mono { font-family: var(--font-mono); color: var(--fg-muted); }
.legend { left: 12px; bottom: 12px; display: flex; gap: 12px; padding: 5px 10px; border-radius: 8px; background: var(--chip-bg); backdrop-filter: blur(8px); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 7px; height: 7px; border-radius: 50%; }
@media (max-width: 599px) { .hide-sm { display: none !important; } }
</style>
