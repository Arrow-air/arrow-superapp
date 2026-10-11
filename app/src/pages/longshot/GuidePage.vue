<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { longshotGuide as guide } from '../../projects/longshot/guide';
import { lsPartName } from '../../projects/longshot/parts';
import { lsIssueUrl } from '../../projects/longshot/github';
import { modelFor } from '../../projects/models';
import { answers, answersTo, loadAnswers } from '../../modules/guide/store';
import { guideMarkdown } from '../../modules/guide/markdown';
import QuestionCard from '../../modules/guide/QuestionCard.vue';
import LineView from '../../modules/guide/LineView.vue';
import type { GuideQuestion, GuideStep } from '../../modules/guide/types';
import { person } from '../../modules/threads/store';
import { remote } from '../../lib/backend';
import { zoneLabel, zonePath } from '../../frame/nav';

// How to build a Longshot pack, step by step, from the record. Each step
// carries its sources, what to check, and the questions the record can't
// answer yet; the Questions view collects those for whoever knows (Julius
// for most), and on build day they're answered from a phone at the bench.
// The 3D model follows along: built so far solid, this step's parts lit,
// the rest a ghost. Export turns the guide and its answers into Markdown for
// the repository's docs.
const CadModel = defineAsyncComponent({ loader: () => import('../../modules/model/CadModel.vue'), suspensible: false });

const route = useRoute();
const router = useRouter();
const m = modelFor('longshot');

type View = 'guide' | 'questions' | 'shots';
const view = computed<View>(() => (route.query.view === 'questions' || route.query.view === 'shots' ? route.query.view : 'guide'));
const setView = (v: View) => router.replace({ query: { ...route.query, view: v === 'guide' ? undefined : v, show: undefined } });
// A different view starts at its top; jumping to a step scrolls on from there.
watch(view, () => void nextTick(() => root.value?.scrollIntoView({ block: 'start' })));

type Step = GuideStep & { n: number };
const steps: Step[] = guide.steps.map((s, i) => ({ ...s, n: i + 1 }));
const phases = guide.phases.map((ph, i) => ({ ...ph, n: i + 1, steps: steps.filter((s) => s.phase === ph.id) })).filter((ph) => ph.steps.length);
const stepOf = (id: string) => steps.find((s) => s.id === id);

// Questions and answers.
const allQ = steps.flatMap((s) => s.questions.map((q) => ({ q, s })));
const isAnswered = (id: string) => answers.list.some((a) => a.question === id);
const answeredCount = computed(() => allQ.filter(({ q }) => isAnswered(q.id)).length);
const openCount = computed(() => allQ.length - answeredCount.value);
const pct = computed(() => (allQ.length ? Math.round((answeredCount.value / allQ.length) * 100) : 0));
const answeredIn = (s: Step) => s.questions.filter((q) => isAnswered(q.id)).length;
const capture = computed(() => !remote || answers.available);

const askers = [...new Set(allQ.map(({ q }) => q.ask).filter((x): x is string => !!x))];
const nameOf = (id?: string) => person(id)?.name ?? (id === 'me' ? 'You' : 'A member');
const show = computed(() => (route.query.show as string | undefined) ?? 'all');
const setShow = (v: string) => router.replace({ query: { ...route.query, view: 'questions', show: v === 'all' ? undefined : v } });
const matches = (q: GuideQuestion) => {
  switch (show.value) {
    case 'all': return true;
    case 'open': return !isAnswered(q.id);
    case 'answered': return isAnswered(q.id);
    case 'now': return q.when === 'before';
    case 'build': return q.when === 'build';
    default: return q.ask === show.value;
  }
};
const qGroups = computed(() => steps.map((s) => ({ s, qs: s.questions.filter(matches) })).filter((g) => g.qs.length));
const countFor = (who: string) => allQ.filter(({ q }) => q.ask === who && !isAnswered(q.id)).length;
const copied = ref(false);
async function copyLink() {
  const url = location.href;
  try { await navigator.clipboard.writeText(url); copied.value = true; setTimeout(() => (copied.value = false), 1800); }
  catch { window.prompt('Copy this link', url); }
}

// Shot list: ticks stay in this browser.
const SHOTS = `superapp:guide-shots:${guide.id}`;
const shots = reactive<Record<string, boolean>>((() => { try { return JSON.parse(localStorage.getItem(SHOTS) ?? '{}'); } catch { return {}; } })());
watch(shots, (v) => { try { localStorage.setItem(SHOTS, JSON.stringify(v)); } catch { /* storage unavailable */ } }, { deep: true });
const shotTotal = steps.reduce((k, s) => k + (s.shots?.length ?? 0), 0);
const shotDone = computed(() => steps.reduce((k, s) => k + (s.shots ?? []).filter((_, i) => shots[`${s.id}:${i}`]).length, 0));

// The model, following the steps.
const root = ref<HTMLElement>();
const wide = ref(false);
const phone = ref(false);
const show3d = ref(false);
const viewerOn = computed(() => view.value === 'guide' && (wide.value || show3d.value));
const modelSteps = steps.filter((s) => s.model);
const active = ref<string>(stepOf(route.query.step as string)?.id ?? modelSteps[0]?.id ?? steps[0].id);
const viewStep = computed(() => {
  const i = steps.findIndex((s) => s.id === active.value);
  for (let k = i; k >= 0; k--) if (steps[k].model) return steps[k];
  return modelSteps[0];
});
const lit = computed(() => viewStep.value?.model?.lit ?? null);
const adds = computed(() => viewStep.value?.model?.adds ?? []);
const vIndex = computed(() => modelSteps.findIndex((s) => s.id === viewStep.value?.id));

let pausedUntil = 0;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function focusStep(id: string) {
  active.value = id;
  pausedUntil = performance.now() + 900;
  void nextTick(() => document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }));
}
function go(dir: 1 | -1) {
  const next = modelSteps[Math.min(modelSteps.length - 1, Math.max(0, vIndex.value + dir))];
  if (next) focusStep(next.id);
}
function in3d(id: string) {
  show3d.value = true;
  focusStep(id);
}
/** From the questions or shot list back to a step in the guide. */
async function openStep(id: string) {
  await setView('guide');
  await nextTick();
  focusStep(id);
}
function toPhase(id: string) {
  document.getElementById(`phase-${id}`)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}

// Which step is being read: a thin band near the top of the reading area
// (below the pinned model on a mid-size screen) picks it.
let io: IntersectionObserver | undefined;
function spy() {
  io?.disconnect();
  io = undefined;
  if (!viewerOn.value) return;
  const margin = wide.value ? '-12% 0px -80% 0px' : phone.value ? '-14% 0px -78% 0px' : '-52% 0px -40% 0px';
  io = new IntersectionObserver((entries) => {
    if (performance.now() < pausedUntil) return;
    const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) active.value = (hit.target as HTMLElement).dataset.step ?? active.value;
  }, { rootMargin: margin });
  root.value?.querySelectorAll<HTMLElement>('.step').forEach((el) => io!.observe(el));
}
watch([viewerOn, wide, phone], () => void nextTick(spy));

// Layout: the page's own width decides the side-by-side model; the window
// decides the phone sheet (below 768px the window scrolls, not the slot).
let ro: ResizeObserver | undefined;
let timer = 0;
const mq = matchMedia('(max-width: 767px)');
const onMq = () => (phone.value = mq.matches);
onMounted(async () => {
  onMq();
  mq.addEventListener('change', onMq);
  const slot = root.value?.closest<HTMLElement>('.slot');
  ro = new ResizeObserver(() => {
    // Hysteresis: the side-by-side layout changes the page's height, a scrollbar
    // can come or go, and the width would flip the layout back and forth.
    const w = root.value?.clientWidth ?? 0;
    if (!wide.value && w >= 900) wide.value = true;
    else if (wide.value && w < 840) wide.value = false;
    if (slot) root.value?.style.setProperty('--slot-h', `${slot.clientHeight}px`);
  });
  ro.observe(root.value!);
  if (slot) ro.observe(slot);
  await loadAnswers(guide.project, guide.id);
  if (remote) timer = window.setInterval(() => { if (document.visibilityState === 'visible') void loadAnswers(guide.project, guide.id); }, 20000);
  if (route.query.step && stepOf(route.query.step as string)) focusStep(route.query.step as string);
  else if (route.query.question) {
    const id = route.query.question as string;
    await nextTick();
    document.querySelector(`[data-question="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center' });
  }
});
onBeforeUnmount(() => {
  window.clearInterval(timer);
  io?.disconnect();
  ro?.disconnect();
  mq.removeEventListener('change', onMq);
});

// Export.
const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const buildLabel = (id: string) => guide.builds.find((b) => b.id === id)?.label ?? id;
const partName = (id: string) => lsPartName(id) ?? id;
function exportMd() {
  const now = new Date().toISOString();
  const md = guideMarkdown(guide, answers.list, { nameOf, partName, buildLabel, issueUrl: lsIssueUrl, day: longDay }, longDay(now));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = `longshot-pack-guide-${now.slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const threadLink = (id: string) => ({ query: { ...route.query, thread: id } });
</script>

<template>
  <div ref="root" class="gp" :class="{ wide, phone, 'with-3d': viewerOn }">
    <header class="gp-head view">
      <p class="kicker">Build · {{ guide.subject }}</p>
      <h1 class="view-title">{{ guide.title }}</h1>
      <p class="view-lede">{{ guide.intro }}</p>
      <p v-if="guide.variantNote" class="variant">{{ guide.variantNote }}</p>
      <div class="status">
        <span class="chip amber">Draft</span>
        <span>{{ steps.length }} steps</span><span class="dot">·</span>
        <span>{{ allQ.length }} questions</span><span class="dot">·</span>
        <span data-answered>{{ answeredCount }} answered</span>
        <span class="bar" role="progressbar" :aria-valuenow="answeredCount" aria-valuemin="0" :aria-valuemax="allQ.length" :aria-label="`${answeredCount} of ${allQ.length} questions answered`"><i :style="{ width: `${pct}%` }"></i></span>
      </div>
      <p v-if="remote && !answers.available" class="banner">Reading works; answering opens once this page's database update is in.</p>
      <p v-else-if="answers.error" class="banner">Couldn't load the answers: {{ answers.error }}</p>
      <div class="gtools">
        <div class="vseg" role="radiogroup" aria-label="Show">
          <button type="button" role="radio" :aria-checked="view === 'guide'" @click="setView('guide')">Steps</button>
          <button type="button" role="radio" :aria-checked="view === 'questions'" @click="setView('questions')">Questions · {{ openCount }} open</button>
          <button type="button" role="radio" :aria-checked="view === 'shots'" @click="setView('shots')">Shot list</button>
        </div>
        <button v-if="view === 'guide' && !wide" type="button" class="vbtn" :aria-pressed="show3d" @click="show3d = !show3d">{{ show3d ? 'Hide 3D' : 'Follow in 3D' }}</button>
        <button type="button" class="vbtn" @click="exportMd">Export Markdown</button>
      </div>
    </header>

    <aside v-if="viewerOn" class="gp-3d" aria-label="The pack at this step, in 3D">
      <div class="v-bar">
        <button type="button" class="vnav" :disabled="vIndex <= 0" aria-label="Previous step" @click="go(-1)">‹</button>
        <p class="v-step" data-viewer-step><span class="faint">Step {{ viewStep?.n }} of {{ steps.length }}</span> {{ viewStep?.title }}</p>
        <button type="button" class="vnav" :disabled="vIndex >= modelSteps.length - 1" aria-label="Next step" @click="go(1)">›</button>
        <button v-if="!wide" type="button" class="vnav close" aria-label="Hide 3D" @click="show3d = false">×</button>
      </div>
      <div class="v-stage">
        <CadModel :look="m.look" :lit="lit" :hidden="[]" :selected="null" :discussed="[]" :explode="0" :labels="m.labels" :accent="adds" accent-label="This step" />
      </div>
    </aside>

    <div class="gp-body view">
      <!-- Steps -->
      <template v-if="view === 'guide'">
        <nav class="phases" aria-label="Phases">
          <button v-for="ph in phases" :key="ph.id" type="button" class="chip" @click="toPhase(ph.id)">{{ ph.n }}. {{ ph.title }}</button>
        </nav>
        <section v-for="ph in phases" :id="`phase-${ph.id}`" :key="ph.id" class="phase">
          <h2 class="phase-h"><span class="pn">{{ ph.n }}</span>{{ ph.title }}</h2>
          <p class="phase-sum">{{ ph.summary }}</p>
          <article v-for="s in ph.steps" :id="`step-${s.id}`" :key="s.id" class="step" :data-step="s.id" :class="{ current: viewerOn && viewStep?.id === s.id }">
            <header class="step-h">
              <span class="sn">{{ s.n }}</span>
              <div class="st">
                <h3>{{ s.title }}</h3>
                <p class="goal"><span class="faint">Done when</span> {{ s.goal }}</p>
              </div>
              <button v-if="s.model" type="button" class="vbtn tiny" :aria-label="`Show step ${s.n} in 3D`" @click="in3d(s.id)">3D</button>
            </header>

            <div v-if="s.parts?.length" class="parts">
              <RouterLink v-for="p in s.parts" :key="p.id" class="chip" :to="{ path: '/longshot/build/bom', query: { part: p.id } }" :title="p.id">{{ p.qty }} × {{ partName(p.id) }}</RouterLink>
            </div>
            <div v-if="s.tools?.length" class="block">
              <h4>Tools and supplies</h4>
              <ul class="lines"><li v-for="(t, i) in s.tools" :key="i"><LineView :l="t" /></li></ul>
            </div>
            <div class="block">
              <h4>How</h4>
              <ol class="lines how"><li v-for="(h, i) in s.how" :key="i"><LineView :l="h" /></li></ol>
            </div>
            <div v-if="s.checks?.length" class="block">
              <h4>Check before moving on</h4>
              <ul class="lines checks"><li v-for="(c, i) in s.checks" :key="i"><LineView :l="c" /></li></ul>
            </div>
            <div v-if="s.safety?.length" class="block safety">
              <h4>Safety</h4>
              <ul class="lines"><li v-for="(c, i) in s.safety" :key="i"><LineView :l="c" /></li></ul>
            </div>
            <div v-if="s.images?.length" class="imgs">
              <figure v-for="im in s.images" :key="im.src">
                <a :href="im.src" target="_blank" rel="noopener"><img :src="im.src" :alt="im.caption" loading="lazy" /></a>
                <figcaption>{{ im.caption }} <a :href="im.source.url" target="_blank" rel="noopener">{{ im.source.label }}</a></figcaption>
              </figure>
            </div>
            <div v-if="s.questions.length" class="block">
              <h4>Open questions <span class="faint">· {{ answeredIn(s) }} of {{ s.questions.length }} answered</span></h4>
              <QuestionCard v-for="q in s.questions" :key="q.id" :q="q" :guide="guide" :list="answersTo(q.id)" :capture="capture" />
            </div>
            <div v-if="s.shots?.length" class="block">
              <h4>Photos to take</h4>
              <ul class="shots">
                <li v-for="(x, i) in s.shots" :key="i"><label><input v-model="shots[`${s.id}:${i}`]" type="checkbox" /> {{ x }}</label></li>
              </ul>
            </div>
            <footer v-if="s.issues?.length || s.threads?.length || s.zone" class="rel">
              <a v-for="n in s.issues ?? []" :key="n" :href="lsIssueUrl(n)" target="_blank" rel="noopener" class="chip">#{{ n }}</a>
              <RouterLink v-for="t in s.threads ?? []" :key="t" :to="threadLink(t)" class="chip indigo">{{ t }}</RouterLink>
              <RouterLink v-if="s.zone" :to="zonePath(s.zone)" class="chip">{{ zoneLabel(s.zone) }}</RouterLink>
            </footer>
          </article>
        </section>
        <p class="end faint">That's the whole build on record so far. What's missing is in the questions above; answer what you know, and the next build fills in the rest.</p>
      </template>

      <!-- Questions -->
      <template v-else-if="view === 'questions'">
        <div class="filters">
          <div class="vseg" role="radiogroup" aria-label="Which questions">
            <button type="button" role="radio" :aria-checked="show === 'all'" @click="setShow('all')">All</button>
            <button type="button" role="radio" :aria-checked="show === 'open'" @click="setShow('open')">Open</button>
            <button type="button" role="radio" :aria-checked="show === 'answered'" @click="setShow('answered')">Answered</button>
            <button type="button" role="radio" :aria-checked="show === 'now'" @click="setShow('now')">Answerable now</button>
            <button type="button" role="radio" :aria-checked="show === 'build'" @click="setShow('build')">On build day</button>
          </div>
          <div class="vseg" role="radiogroup" aria-label="Who knows">
            <button v-for="w in askers" :key="w" type="button" role="radio" :aria-checked="show === w" @click="setShow(w)">For {{ nameOf(w) }} · {{ countFor(w) }}</button>
          </div>
          <button type="button" class="vbtn" @click="copyLink">{{ copied ? 'Link copied' : 'Copy link to this list' }}</button>
        </div>
        <section v-for="g in qGroups" :key="g.s.id" class="qgroup">
          <h3 class="qg-h"><button type="button" class="steplink" @click="openStep(g.s.id)"><span class="faint">Step {{ g.s.n }}</span> {{ g.s.title }}</button></h3>
          <QuestionCard v-for="q in g.qs" :key="q.id" :q="q" :guide="guide" :list="answersTo(q.id)" :capture="capture" />
        </section>
        <p v-if="!qGroups.length" class="vempty">No questions match.</p>
      </template>

      <!-- Shot list -->
      <template v-else>
        <p class="muted shots-lede">{{ shotDone }} of {{ shotTotal }} taken. What to photograph at each step on build day, so the guide can show it. Ticks stay in this browser.</p>
        <section v-for="s in steps.filter((x) => x.shots?.length)" :key="s.id" class="qgroup">
          <h3 class="qg-h"><button type="button" class="steplink" @click="openStep(s.id)"><span class="faint">Step {{ s.n }}</span> {{ s.title }}</button></h3>
          <ul class="shots">
            <li v-for="(x, i) in s.shots" :key="i"><label><input v-model="shots[`${s.id}:${i}`]" type="checkbox" /> {{ x }}</label></li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.gp { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: 'head' 'viewer' 'body'; }
.gp-head { grid-area: head; padding-bottom: 0; }
.gp-body { grid-area: body; padding-top: 6px; }
.gp-3d { grid-area: viewer; display: flex; flex-direction: column; min-height: 0; background: var(--cad-viewer); }
.gp.wide.with-3d { grid-template-columns: minmax(0, 1fr) minmax(340px, 42%); grid-template-areas: 'head viewer' 'body viewer'; }
.gp.wide .gp-3d { position: sticky; top: 0; align-self: start; height: var(--slot-h, 80vh); border-left: 1px solid var(--border-soft, var(--slate-a3)); }
.gp:not(.wide):not(.phone) .gp-3d { position: sticky; top: 0; z-index: 3; height: calc(var(--slot-h, 80vh) * 0.42); min-height: 240px; border-block: 1px solid var(--border-soft, var(--slate-a3)); }
.gp.phone .gp-3d { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; height: 40dvh; border-top: 1px solid var(--slate-a5); box-shadow: 0 -12px 32px -12px rgb(0 0 0 / 0.45); }
.gp.phone.with-3d .gp-body { padding-bottom: calc(40dvh + 24px); }
.gp:not(.wide):not(.phone) .step { scroll-margin-top: calc(var(--slot-h, 80vh) * 0.42 + 12px); }
.step { scroll-margin-top: 12px; }

.kicker { margin: 0 0 4px; font-size: var(--text-sm); color: var(--fg-faint); }
.variant { margin: 8px 0 0; max-width: 720px; padding: 8px 10px; border-radius: 8px; background: var(--slate-a2); color: var(--fg-muted); font-size: var(--text-base); line-height: 1.5; }
.status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-top: 12px; color: var(--fg-2); font-size: var(--text-base); }
.status .dot { margin: 0; }
.bar { position: relative; flex: 0 0 120px; height: 6px; margin-left: 6px; border-radius: 3px; background: var(--slate-a4); overflow: hidden; }
.bar i { position: absolute; inset: 0 auto 0 0; background: var(--jade-9, #29a383); border-radius: 3px; transition: width 300ms ease-out; }
.banner { margin: 10px 0 0; padding: 8px 10px; border-radius: 8px; background: var(--amber-a3); color: var(--amber-11); font-size: var(--text-base); }
.gtools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }

.v-bar { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid var(--slate-a3); background: var(--cad-panel); }
.v-step { flex: 1; min-width: 0; margin: 0; overflow: hidden; color: var(--fg); font-size: var(--text-base); font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
.v-step .faint { margin-right: 6px; font-weight: 400; color: var(--fg-faint); }
.vnav { flex: none; width: 28px; height: 28px; border: 0; border-radius: 7px; background: var(--slate-a3); color: var(--fg-2); font: inherit; font-size: 16px; line-height: 1; cursor: pointer; }
.vnav:hover:not(:disabled) { background: var(--slate-a5); color: var(--fg); }
.vnav:disabled { opacity: 0.35; cursor: default; }
.v-stage { position: relative; flex: 1; min-height: 0; }
.v-stage > :deep(.viewer) { position: absolute; inset: 0; }

.phases { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 4px; }
.phases .chip { height: 22px; border: 0; cursor: pointer; font: inherit; font-size: var(--text-sm); }
.phase { margin-top: 26px; }
.phase-h { display: flex; align-items: center; gap: 8px; margin: 0; font-size: var(--text-md); font-weight: 600; color: var(--fg); }
.pn { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; background: var(--slate-a4); color: var(--fg-2); font-size: var(--text-sm); font-weight: 600; }
.phase-sum { margin: 4px 0 10px; max-width: 720px; color: var(--fg-muted); font-size: var(--text-base); line-height: 1.55; }
.step { margin-top: 12px; padding: 14px 16px 12px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--surface, transparent); transition: border-color 200ms; }
.step.current { border-color: var(--amber-a7, var(--amber-9)); }
.step-h { display: flex; align-items: flex-start; gap: 10px; }
.sn { flex: none; display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 8px; background: var(--indigo-a3); color: var(--indigo-11); font-size: var(--text-base); font-weight: 600; font-variant-numeric: tabular-nums; }
.st { flex: 1; min-width: 0; }
.st h3 { margin: 2px 0 0; font-size: var(--text-md); font-weight: 600; color: var(--fg); line-height: 1.35; }
.goal { margin: 3px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.goal .faint { margin-right: 4px; }
.vbtn.tiny { flex: none; height: 24px; padding: 0 8px; }
.parts { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0 36px; }
.block { margin: 12px 0 0 36px; }
.block h4 { margin: 0 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.lines { margin: 0; padding-left: 18px; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.55; }
.lines li + li { margin-top: 4px; }
.lines.checks { list-style: none; padding-left: 0; }
.lines.checks li { position: relative; padding-left: 20px; }
.lines.checks li::before { content: ''; position: absolute; left: 2px; top: 5px; width: 10px; height: 10px; border: 1.5px solid var(--slate-a8); border-radius: 3px; }
.safety { padding: 8px 10px; border-radius: 8px; background: var(--red-a2, var(--slate-a2)); }
.safety h4 { color: var(--red-11); }
.imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin: 12px 0 0 36px; }
.imgs figure { margin: 0; }
.imgs img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; border: 1px solid var(--slate-a4); background: var(--slate-a2); }
.imgs figcaption { margin-top: 4px; color: var(--fg-muted); font-size: var(--text-sm); line-height: 1.4; }
.imgs figcaption a { color: var(--fg-faint); }
.shots { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.45; }
.shots label { display: flex; gap: 8px; align-items: flex-start; cursor: pointer; }
.shots input { margin-top: 3px; accent-color: var(--jade-9, #29a383); }
.rel { display: flex; flex-wrap: wrap; gap: 4px; margin: 12px 0 0 36px; }
.end { margin: 28px 0 8px; font-size: var(--text-base); }

.filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0 12px; }
.qgroup { margin-top: 18px; }
.qg-h { margin: 0 0 8px; font-size: var(--text-nav); font-weight: 600; }
.steplink { padding: 0; border: 0; background: none; color: var(--fg); font: inherit; text-align: left; cursor: pointer; }
.steplink:hover { text-decoration: underline; }
.steplink .faint { margin-right: 6px; font-weight: 400; }
.shots-lede { margin: 6px 0 0; font-size: var(--text-base); }

@media (max-width: 599px) {
  .parts, .block, .imgs, .rel { margin-left: 0; }
  .step { padding: 12px; }
}
</style>
