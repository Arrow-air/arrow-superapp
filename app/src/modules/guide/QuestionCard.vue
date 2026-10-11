<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDraft } from '../../lib/drafts';
import { remote } from '../../lib/backend';
import { day, person } from '../threads/store';
import { canRemove, removeAnswer, saveAnswer, type Answer } from './store';
import type { Guide, GuideQuestion } from './types';

// One open question in a guide step: why the guide needs it, who likely
// knows, what common practice says (as context, never as the answer), the
// answers given so far, and a form to answer or change your answer. Drafts
// survive a reload until they're saved.
const props = defineProps<{ q: GuideQuestion; guide: Guide; list: Answer[]; capture: boolean }>();

const open = ref(false);
const saving = ref(false);
const base = () => `guide:${props.guide.id}:${props.q.id}`;
const { text: value, done: doneValue } = useDraft(base);
const { text: note, done: doneNote } = useDraft(() => `${base()}:note`);
const build = ref(props.guide.builds[0]?.id ?? '');

const nameOf = (id?: string) => (id === 'me' ? 'You' : person(id)?.name ?? 'A member');
const askName = computed(() => (props.q.ask ? person(props.q.ask)?.name ?? props.q.ask : ''));
const buildLabel = (id: string) => props.guide.builds.find((b) => b.id === id)?.label ?? id;
const mine = computed(() => props.list.find((a) => a.authorId === 'me' && (!props.q.perBuild || a.build === build.value)));

const NUMBER = /^[<>≈~]?\s*-?\d+([.,]\d+)?(\s*(–|-|to)\s*-?\d+([.,]\d+)?)?$/;
const URL_RE = /^https?:\/\/\S+$/i;
const problem = computed(() => {
  const v = value.value.trim();
  if (!v) return '';
  if (props.q.kind === 'number' && !NUMBER.test(v)) return 'A number, or a range like 30–40.';
  if (props.q.kind === 'link' && !URL_RE.test(v)) return 'A link starting with https://';
  return '';
});
const valid = computed(() => !!value.value.trim() && !problem.value);

function start() {
  if (mine.value && !value.value) { value.value = mine.value.value; note.value = mine.value.note; }
  if (props.q.kind === 'choice' && !value.value) value.value = props.q.options?.[0] ?? '';
  open.value = true;
}
function change(a: Answer) {
  if (a.build) build.value = a.build;
  value.value = a.value;
  note.value = a.note;
  open.value = true;
}
async function save() {
  if (!valid.value || saving.value) return;
  saving.value = true;
  const ok = await saveAnswer({ project: props.guide.project, guide: props.guide.id, question: props.q.id, build: props.q.perBuild ? build.value : '', value: value.value, note: note.value });
  saving.value = false;
  if (ok) { doneValue(); doneNote(); open.value = false; }
}
function cancel() { open.value = false; }
async function remove(a: Answer) {
  if (!window.confirm('Remove this answer?')) return;
  await removeAnswer(a);
}
</script>

<template>
  <div class="qc" :data-question="q.id" :class="{ answered: list.length > 0 }">
    <div class="qhead">
      <span class="state" :class="list.length ? 'done' : 'open'" :title="list.length ? 'Answered' : 'Open'" aria-hidden="true"></span>
      <p class="qtext">{{ q.text }}<span v-if="q.kind === 'number' && q.unit" class="unit-hint">{{ q.unit }}</span></p>
    </div>
    <p class="why">{{ q.why }}</p>
    <div class="meta">
      <span v-if="q.ask" class="chip">Ask {{ askName }}</span>
      <span class="chip" :class="q.when === 'build' ? 'amber' : 'indigo'">{{ q.when === 'build' ? 'On build day' : 'Answerable now' }}</span>
      <span v-if="q.perBuild" class="chip">Each pack</span>
    </div>
    <details v-if="q.hint" class="hint">
      <summary>Common practice</summary>
      <p>{{ q.hint }}</p>
    </details>

    <ul v-if="list.length" class="answers">
      <li v-for="a in list" :key="a.id" class="ans" :data-answer="a.id">
        <div class="aval">
          <a v-if="q.kind === 'link'" :href="a.value" target="_blank" rel="noopener">{{ a.value }}</a>
          <b v-else>{{ a.value }}</b><span v-if="q.kind === 'number' && q.unit" class="unit"> {{ q.unit }}</span>
          <span v-if="a.build" class="chip">{{ buildLabel(a.build) }}</span>
        </div>
        <p v-if="a.note" class="anote">{{ a.note }}</p>
        <p class="aby">
          {{ nameOf(a.authorId) }} · {{ day(a.editedAt ?? a.at) }}<template v-if="a.editedAt"> · edited</template>
          <button v-if="a.authorId === 'me' && capture" type="button" class="lbtn" @click="change(a)">Change</button>
          <button v-if="canRemove(a) && capture" type="button" class="lbtn" @click="remove(a)">Remove</button>
        </p>
      </li>
    </ul>

    <form v-if="open" class="aform" @submit.prevent="save">
      <label class="field">
        <span class="lab">Your answer</span>
        <span class="row">
          <select v-if="q.kind === 'choice'" v-model="value" :aria-label="q.text">
            <option v-for="o in q.options" :key="o" :value="o">{{ o }}</option>
          </select>
          <textarea v-else-if="q.kind === 'text'" v-model="value" rows="2" :aria-label="q.text" />
          <input v-else v-model="value" :type="q.kind === 'link' ? 'url' : 'text'" :inputmode="q.kind === 'number' ? 'decimal' : undefined" :placeholder="q.kind === 'link' ? 'https://' : ''" :aria-label="q.text" />
          <span v-if="q.kind === 'number' && q.unit" class="unit">{{ q.unit }}</span>
        </span>
      </label>
      <p v-if="problem" class="problem">{{ problem }}</p>
      <label class="field">
        <span class="lab">Note <span class="faint">(optional)</span></span>
        <textarea v-model="note" rows="2" placeholder="How you measured it, which tool, anything odd" aria-label="Note" />
      </label>
      <label v-if="q.perBuild" class="field inline">
        <span class="lab">Measured on</span>
        <select v-model="build" aria-label="Build">
          <option v-for="b in guide.builds" :key="b.id" :value="b.id">{{ b.label }}</option>
        </select>
      </label>
      <div class="actions">
        <button type="submit" class="vbtn primary" :disabled="!valid || saving">{{ saving ? 'Saving…' : mine ? 'Save change' : 'Save answer' }}</button>
        <button type="button" class="vbtn" @click="cancel">Cancel</button>
        <span v-if="!remote" class="faint small">The demo keeps answers in this browser.</span>
      </div>
    </form>
    <button v-else-if="capture" type="button" class="vbtn answer" @click="start">{{ mine ? 'Change my answer' : 'Answer' }}</button>
  </div>
</template>

<style scoped>
.qc { padding: 10px 12px; border: 1px solid var(--slate-a4); border-radius: 10px; background: var(--slate-a2); }
.qc + .qc { margin-top: 8px; }
.qc.answered { border-color: var(--jade-a5, var(--slate-a4)); }
.qhead { display: flex; gap: 8px; align-items: flex-start; }
.state { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; }
.state.open { border: 1.5px solid var(--amber-9, #ffc53d); }
.state.done { background: var(--jade-9, #29a383); }
.qtext { margin: 0; color: var(--fg); font-size: var(--text-nav); font-weight: 500; line-height: 1.45; }
.unit-hint { margin-left: 6px; padding: 0 5px; border-radius: 4px; background: var(--slate-a3); color: var(--fg-muted); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 400; }
.why { margin: 4px 0 0 16px; color: var(--fg-muted); font-size: var(--text-base); line-height: 1.5; }
.meta { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 0 16px; }
.hint { margin: 6px 0 0 16px; font-size: var(--text-base); color: var(--fg-muted); }
.hint summary { cursor: pointer; color: var(--fg-faint); font-size: var(--text-sm); }
.hint p { margin: 4px 0 0; padding: 6px 8px; border-left: 2px solid var(--slate-a6); line-height: 1.5; }
.answers { list-style: none; margin: 8px 0 0 16px; padding: 0; display: grid; gap: 6px; }
.ans { padding: 6px 8px; border-radius: 8px; background: var(--slate-a3); }
.aval { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; color: var(--fg); font-size: var(--text-nav); }
.aval a { color: var(--indigo-11); word-break: break-all; }
.unit { color: var(--fg-muted); font-family: var(--font-mono); font-size: var(--text-sm); }
.anote { margin: 3px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; white-space: pre-wrap; }
.aby { margin: 3px 0 0; color: var(--fg-faint); font-size: var(--text-sm); }
.lbtn { margin-left: 8px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.lbtn:hover { color: var(--fg); text-decoration: underline; }
.aform { display: grid; gap: 8px; margin: 10px 0 0 16px; }
.field { display: grid; gap: 4px; }
.field.inline { grid-template-columns: max-content max-content; align-items: center; gap: 8px; }
.lab { color: var(--fg-faint); font-size: var(--text-sm); }
.row { display: flex; align-items: center; gap: 6px; }
.aform input, .aform textarea, .aform select {
  width: 100%; min-width: 0; padding: 6px 8px; border: 1px solid var(--slate-a6); border-radius: 7px; background: var(--bg, transparent);
  color: var(--fg); font: inherit; font-size: 16px; /* 16px keeps iOS from zooming on focus */
}
@media (min-width: 768px) { .aform input, .aform textarea, .aform select { font-size: var(--text-nav); } }
.aform input:focus-visible, .aform textarea:focus-visible, .aform select:focus-visible { outline: none; border-color: var(--indigo-8, var(--indigo-9)); box-shadow: 0 0 0 2px var(--focus-ring); }
.field.inline select { width: auto; }
.problem { margin: -2px 0 0; color: var(--red-11); font-size: var(--text-sm); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.vbtn.primary { border-color: transparent; background: var(--indigo-9); color: #fff; }
.vbtn.primary:hover { background: var(--indigo-10); color: #fff; }
.vbtn.primary:disabled { opacity: 0.45; cursor: default; }
.vbtn.answer { margin: 8px 0 0 16px; }
.small { font-size: var(--text-sm); }
.faint { color: var(--fg-faint); }
</style>
