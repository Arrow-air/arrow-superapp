<script setup lang="ts">
// After an intro call (Reach out, the mockups' screen 6): three prompts, a
// minute each, and what they're good for. Saving writes one call note on
// their page (sa_add_note) and sets the status to Talked with the next step
// and the good-for tags (sa_set_outreach), in that order: if the second
// fails, the note is already there and the error says what's left.
import { computed, ref, watch } from 'vue';
import Icon from '../../frame/Icon.vue';
import { intro } from './community';
import { callNote, notesDue } from './reach';
import { firstName } from './you';
import { addNote, setOutreach, type Person } from '../../lib/registry';

const props = defineProps<{ person: Person }>();
const emit = defineEmits<{ saved: [] }>();

const p = computed(() => props.person);
const first = computed(() => firstName(p.value.name) || p.value.name);
const goodAt = ref('');
const wants = ref('');
const next = ref('');
const tags = ref<string[]>([]);
const newTag = ref('');
const busy = ref(false);
const err = ref('');
const done = ref('');
// A different person starts clean, with the tags the team already has for them.
watch(() => p.value.id, () => {
  goodAt.value = ''; wants.value = ''; next.value = intro(p.value)?.next_step ?? ''; newTag.value = ''; err.value = ''; done.value = '';
  tags.value = [...(intro(p.value)?.good_for ?? [])];
}, { immediate: true });

function addTag() {
  const t = newTag.value.trim();
  if (t && !tags.value.includes(t)) tags.value = [...tags.value, t];
  newTag.value = '';
}
const canSave = computed(() => !!(goodAt.value.trim() || wants.value.trim() || next.value.trim()) && !busy.value);
async function save() {
  if (!canSave.value) return;
  busy.value = true;
  err.value = '';
  let wrote = false;
  try {
    await addNote(p.value.id, 'call', callNote(goodAt.value, wants.value, next.value));
    wrote = true;
    await setOutreach(p.value.id, { status: intro(p.value)?.status === 'talked' ? undefined : 'talked', nextStep: next.value.trim(), goodFor: tags.value });
    done.value = `Saved on ${first.value}'s page: a call note, and the status is Talked.`;
    goodAt.value = ''; wants.value = '';
    emit('saved');
  } catch (e) {
    err.value = wrote ? `The call note is saved, but the status didn't change: ${(e as Error).message}` : (e as Error).message;
    if (wrote) emit('saved');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="aftercall" aria-label="After the call" data-aftercall>
    <div class="row sp">
      <span class="teamtag"><Icon name="lock" :size="11" />After the call · {{ p.name }}</span>
      <span v-if="notesDue(p)" class="pill amber" data-notes-due>notes due</span>
    </div>
    <p class="muted small">Three prompts, a minute each. Saved as a call note on {{ first }}'s page, with the status set to Talked and the next step.</p>
    <div class="afterform">
      <div><label class="label" for="ac-good">What they're good at</label><textarea id="ac-good" v-model="goodAt" class="input" rows="3" maxlength="2500" data-ac-good></textarea></div>
      <div><label class="label" for="ac-wants">What they want</label><textarea id="ac-wants" v-model="wants" class="input" rows="3" maxlength="2500" data-ac-wants></textarea></div>
      <div><label class="label" for="ac-next">Next step</label><textarea id="ac-next" v-model="next" class="input" rows="3" maxlength="300" data-ac-next></textarea></div>
    </div>
    <div class="goodfor">
      <span class="small muted">Good for</span>
      <span v-for="t in tags" :key="t" class="tag" data-ac-tag>{{ t }}<button type="button" class="x" :aria-label="`Remove ${t}`" @click="tags = tags.filter((x) => x !== t)">×</button></span>
      <form class="addtag" @submit.prevent="addTag">
        <input v-model="newTag" class="input" maxlength="80" placeholder="+ a project, a part, a build day" aria-label="Add what they're good for" data-ac-tag-input />
      </form>
    </div>
    <p v-if="err" class="err" role="alert" data-ac-err>{{ err }}</p>
    <p v-if="done" class="okline" role="status" data-ac-done><Icon name="check-circle" :size="13" />{{ done }}</p>
    <div class="row end">
      <span class="small muted">Status after saving</span><span class="pill jade">Talked</span>
      <button class="btn sm teambtn" type="button" :disabled="!canSave" data-ac-save @click="save">{{ busy ? 'Saving…' : 'Save note' }}</button>
    </div>
  </section>
</template>

<style scoped>
.aftercall { padding: 14px 16px; border: 1px solid var(--team-line); border-radius: 12px; background: var(--team-bg); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.row.sp { justify-content: space-between; }
.row.end { justify-content: flex-end; margin-top: 12px; }
.muted.small { margin: 6px 0 10px; }
.afterform { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.afterform .input { min-height: 72px; }
.goodfor { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
.tag .x { margin-left: 2px; padding: 0 2px; border: 0; background: none; color: var(--fg-faint); font: inherit; cursor: pointer; }
.tag .x:hover { color: var(--fg); }
.addtag { flex: 1 1 200px; max-width: 280px; }
.addtag .input { min-height: 26px; padding: 3px 8px; font-size: var(--text-sm); }
.okline { display: flex; gap: 6px; align-items: baseline; margin: 10px 0 0; color: var(--jade-11); font-size: var(--text-sm); }
.btn.teambtn { border-color: var(--amber-a7); color: var(--amber-11); }
.btn.teambtn:hover:not(:disabled) { border-color: var(--amber-a8); background: var(--amber-a3); color: var(--amber-12); }
@media (max-width: 767px) {
  .aftercall { padding: 12px; }
  .afterform { grid-template-columns: minmax(0, 1fr); }
  .afterform .input { min-height: 60px; }
}
</style>
