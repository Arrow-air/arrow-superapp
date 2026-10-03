<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Kbd from '../../frame/Kbd.vue';
import Icon from '../../frame/Icon.vue';
import Avatar from './Avatar.vue';
import type { IconName } from '../../frame/icons';
import { MOD } from '../../frame/shortcuts';
import { threadTypes, typeStyle } from './types';
import { useDraft } from '../../lib/drafts';
import { lastError } from './store';
import type { ThreadType } from './data';

// Starting a thread, the same everywhere one starts (Gavin's app-frame design):
// a header strip that reads as one sentence (new thread, in a zone, about a
// part), then a composer with the title as its first line and the kind of
// thread chosen inside the box it describes.
const props = withDefaults(defineProps<{
  /** The zone it lands in, shown in the strip. */
  where: string;
  whereIcon?: IconName;
  /** When given, the zone is a choice in the strip (v-model:zone). */
  zones?: { id: string; label: string }[];
  zone?: string;
  /** What it is about, narrowest first; the switch picks one (v-model:scope). */
  scopes?: { key: string; label: string }[];
  scope?: string;
  type?: ThreadType;
  /** The version it opens in, when it opens in one. */
  version?: string;
  titleHint?: Partial<Record<ThreadType, string>>;
  bodyHint?: string;
  submitLabel?: string;
  /** Where this draft is kept in the browser until it's saved, e.g. "new:gps-rf". */
  draftKey: string;
  /** Creates the thread; true once the server has it. On false the draft stays. */
  submit: (draft: { type: ThreadType; title: string; body: string; key: string }) => Promise<boolean>;
}>(), { type: 'question', submitLabel: 'Post thread' });
const emit = defineEmits<{
  cancel: [];
  'update:zone': [zone: string];
  'update:scope': [scope: string];
}>();

const types = (Object.keys(threadTypes) as ThreadType[]).map((id) => ({ id, ...threadTypes[id] }));
const type = ref<ThreadType>(props.type);
watch(() => props.type, (t) => (type.value = t));
// Title and description stay in this browser until the thread is created.
const titleDraft = useDraft(() => `${props.draftKey}:title`);
const bodyDraft = useDraft(() => `${props.draftKey}:body`);
const title = titleDraft.text;
const body = bodyDraft.text;
const sending = ref(false);
const error = ref('');
const titleEl = ref<HTMLInputElement>();
onMounted(() => titleEl.value?.focus({ preventScroll: true }));

const hints: Record<ThreadType, string> = { question: 'What do you need to know?', proposal: 'What should change?', idea: 'The idea, in a line' };
const placeholder = computed(() => props.titleHint?.[type.value] ?? hints[type.value]);
const ready = computed(() => title.value.trim().length > 3 && !sending.value);
async function post() {
  if (!ready.value) return;
  sending.value = true;
  const ok = await props.submit({ type: type.value, title: title.value.trim(), body: body.value.trim(), key: titleDraft.sendKey() });
  sending.value = false;
  error.value = ok ? '' : lastError.value || 'Not saved. Your text is still here; try again.';
  if (ok) { titleDraft.done(); bodyDraft.done(); }
}
</script>

<template>
  <form class="new" @submit.prevent="post" @keydown.esc="emit('cancel')">
    <!-- Header strip, one sentence in three parts: what this is, where it goes, what it's about. -->
    <header class="head">
      <span class="what"><Icon name="comment" :size="13" />New thread</span>
      <span class="joint">in</span>
      <select v-if="zones" class="where" :value="zone" aria-label="Zone" @change="emit('update:zone', ($event.target as HTMLSelectElement).value)">
        <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.label }}</option>
      </select>
      <span v-else class="where"><Icon v-if="whereIcon" :name="whereIcon" :size="13" />{{ where }}</span>
      <template v-if="scopes?.length">
        <span class="joint">about</span>
        <div class="seg" role="radiogroup" aria-label="About">
          <button v-for="s in scopes" :key="s.key" type="button" role="radio" :aria-checked="scope === s.key" @click="emit('update:scope', s.key)">{{ s.label }}</button>
        </div>
      </template>
      <span v-if="version" class="ver" title="The version this thread is about">{{ version }}</span>
    </header>

    <div class="composer">
      <div class="composer-body">
        <Avatar id="me" :size="28" />
        <div class="fields">
          <!-- The title leads the post, where you start typing. -->
          <input ref="titleEl" v-model="title" class="title" maxlength="160" :placeholder="placeholder" aria-label="Title" />
          <textarea
            v-model="body"
            rows="4"
            :placeholder="bodyHint ?? 'Context: what you see, why it matters, what would settle it.'"
            aria-label="Description"
            @keydown.meta.enter.prevent="post"
            @keydown.ctrl.enter.prevent="post"
          ></textarea>
        </div>
      </div>
      <div class="composer-bar">
        <!-- What kind of thread, inside the box it describes. -->
        <div class="seg types" role="radiogroup" aria-label="Type">
          <button v-for="t in types" :key="t.id" type="button" role="radio" :aria-checked="type === t.id" :title="t.hint" :style="typeStyle(t.id)" @click="type = t.id">
            <Icon :name="t.icon" :size="13" />{{ t.label }}
          </button>
        </div>
        <div class="actions">
          <Kbd class="hint" :keys="[MOD, '↵']" outline />
          <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
          <button class="primary" type="submit" :disabled="!ready">{{ sending ? 'Saving…' : submitLabel }}</button>
        </div>
      </div>
    </div>
    <p v-if="error" class="save-error" role="alert">{{ error }}</p>
  </form>
</template>

<style scoped>
.new { margin: 0; }
.head {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; padding-bottom: 12px;
  border-bottom: 1px solid var(--slate-a3); font-size: var(--text-base);
}
.what { display: inline-flex; align-items: center; gap: 6px; margin-right: 4px; color: var(--fg); font-weight: 600; }
.what :deep(svg) { color: var(--indigo-11); }
.joint { color: var(--fg-faint); }
.where {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 0; border-radius: 8px;
  background: var(--slate-a3); color: var(--fg-2); font: inherit; font-weight: 500;
}
select.where { cursor: pointer; outline: none; }
select.where:focus-visible { box-shadow: 0 0 0 2px var(--focus-ring); }
.where :deep(svg) { color: var(--fg-muted); }
.ver { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-muted); }
.head .seg button { height: 24px; }
.seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a2); }
.seg button {
  height: 24px; padding: 0 9px; border: 0; border-radius: 6px; background: none;
  color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--indigo-a4); color: var(--indigo-12); }

.fields { flex: 1; min-width: 0; display: flex; flex-direction: column; }
/* No rule between them; size and weight separate title from details. */
.title {
  display: block; width: 100%; margin: 0; padding: 2px 0 0; border: 0; background: none; outline: none;
  color: var(--fg); font: inherit; font-size: 17px; font-weight: 600; letter-spacing: -0.01em;
}
.title::placeholder { color: var(--fg-muted); font-weight: 600; }

.composer { overflow: clip; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-2); transition: border-color 150ms; }
.composer:focus-within { border-color: var(--slate-a7); }
.composer-body { display: flex; align-items: flex-start; gap: 12px; padding: 14px 14px 8px; }
.composer-body .av { flex: none; }
.composer textarea {
  display: block; width: 100%; min-height: 80px; padding: 6px 0 0; border: 0; background: none; resize: vertical;
  color: var(--fg); font: inherit; font-size: var(--text-nav); line-height: 1.5; outline: none;
}
.composer textarea::placeholder { color: var(--fg-faint); }
/* The utility bar: a darker strip under a hairline, apart from what you write. */
.composer-bar {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding: 8px;
  border-top: 1px solid var(--slate-a3); background: var(--composer-bar);
}
.types button { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px 0 8px; }
.types button :deep(svg) { color: var(--tfg); opacity: 0.75; }
.types button[aria-checked='true'] { background: var(--tbg); color: var(--tfg); }
.types button[aria-checked='true'] :deep(svg) { opacity: 1; }
.hint { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-faint); }
.actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.ghost { padding: 0 6px; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-base); cursor: pointer; }
.ghost:hover { color: var(--fg); }
.primary {
  height: 32px; padding: 0 14px; border: 0; border-radius: 9px; background: var(--indigo-9); color: #fff;
  font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2), 0 1px 2px rgb(0 0 0 / 0.3); transition: background-color 120ms, opacity 120ms;
}
.primary:hover:not(:disabled) { background: var(--indigo-10); }
.primary:disabled { opacity: 0.4; cursor: default; }
.primary:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.save-error { margin: 8px 0 0; padding: 8px 10px; border-radius: 8px; background: var(--red-a3); color: var(--red-11); font-size: var(--text-sm); line-height: 1.45; }
</style>
