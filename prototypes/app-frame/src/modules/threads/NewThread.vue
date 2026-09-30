<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Kbd from '../../frame/Kbd.vue';
import Icon from '../../frame/Icon.vue';
import Avatar from './Avatar.vue';
import type { IconName } from '../../frame/icons';
import { MOD } from '../../frame/shortcuts';
import { componentName, partName, selLabel, type Sel } from '../model/model';
import type { ThreadType } from './data';

// Starting a thread about a place on the aircraft. The part picked on the model
// is the default subject; the switch can widen it to its component or group.

const props = defineProps<{ part?: Sel; pageLabel: string; pageIcon?: IconName }>();
const emit = defineEmits<{ post: [draft: { part?: Sel; type: ThreadType; title: string; body: string }]; cancel: [] }>();

// From narrowest to widest: the solid, its component, its group.
const scopes = computed(() => {
  const p = props.part;
  if (!p) return [];
  const out: { key: string; label: string; sel: Sel }[] = [];
  if (p.part) out.push({ key: 'part', label: partName(p.part), sel: { ...p } });
  if (componentName(p.component)) out.push({ key: 'component', label: componentName(p.component), sel: { group: p.group, component: p.component } });
  out.push({ key: 'group', label: selLabel({ group: p.group }), sel: { group: p.group } });
  return out;
});
const scope = ref('');
watch(scopes, (s) => (scope.value = s[0]?.key ?? ''), { immediate: true });
const about = computed(() => scopes.value.find((s) => s.key === scope.value)?.sel);

const types: { id: ThreadType; label: string; hint: string; icon: IconName }[] = [
  { id: 'question', label: 'Question', hint: 'Something you need answered', icon: 'question' },
  { id: 'proposal', label: 'Proposal', hint: 'A change you want decided', icon: 'branch' },
  { id: 'idea', label: 'Idea', hint: 'Worth exploring, no decision yet', icon: 'bulb' },
];
const type = ref<ThreadType>('question');
const title = ref('');
const body = ref('');
const titleEl = ref<HTMLInputElement>();
onMounted(() => titleEl.value?.focus());

const ready = computed(() => title.value.trim().length > 3);
function post() {
  if (!ready.value) return;
  emit('post', { part: about.value, type: type.value, title: title.value.trim(), body: body.value.trim() });
}
</script>

<template>
  <form class="new" @submit.prevent="post" @keydown.esc="emit('cancel')">
    <!-- Header strip, one sentence in three parts: what this is, where it goes, what it's about. -->
    <header class="head">
      <span class="what"><Icon name="comment" :size="13" />New thread</span>
      <span class="joint">in</span>
      <span class="where"><Icon v-if="pageIcon" :name="pageIcon" :size="13" />{{ pageLabel }}</span>
      <template v-if="scopes.length">
        <span class="joint">about</span>
        <div class="seg" role="radiogroup" aria-label="About">
          <button v-for="s in scopes" :key="s.key" type="button" role="radio" :aria-checked="scope === s.key" @click="scope = s.key">{{ s.label }}</button>
        </div>
      </template>
    </header>

    <input ref="titleEl" v-model="title" class="title" maxlength="160" :placeholder="type === 'proposal' ? 'What should change?' : type === 'idea' ? 'The idea, in a line' : 'What do you need to know?'" aria-label="Title" />

    <div class="composer">
      <div class="composer-body">
        <Avatar id="me" :size="28" />
        <textarea
          v-model="body"
          rows="5"
          placeholder="Context: what you see on the part, why it matters, what would settle it."
          aria-label="Description"
          @keydown.meta.enter.prevent="post"
          @keydown.ctrl.enter.prevent="post"
        ></textarea>
      </div>
      <div class="composer-bar">
        <!-- What kind of thread, inside the box it describes. -->
        <div class="seg types" role="radiogroup" aria-label="Type">
          <button v-for="t in types" :key="t.id" type="button" role="radio" :aria-checked="type === t.id" :title="t.hint" @click="type = t.id">
            <Icon :name="t.icon" :size="13" />{{ t.label }}
          </button>
        </div>
        <div class="actions">
          <Kbd class="hint" :keys="[MOD, '↵']" outline />
          <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
          <button class="primary" type="submit" :disabled="!ready">Post thread</button>
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped>
.new { max-width: 720px; padding: 22px 32px 48px; }
.head {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 18px; padding-bottom: 14px;
  border-bottom: 1px solid var(--slate-a3); font-size: var(--text-base);
}
.what { display: inline-flex; align-items: center; gap: 6px; margin-right: 4px; color: var(--fg); font-weight: 600; }
.what :deep(svg) { color: var(--indigo-11); }
.joint { color: var(--fg-faint); }
.where {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 8px;
  background: var(--slate-a3); color: var(--fg-2); font-weight: 500;
}
.where :deep(svg) { color: var(--fg-muted); }
.head .seg button { height: 24px; }
.seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a2); }
.seg button {
  height: 24px; padding: 0 9px; border: 0; border-radius: 6px; background: none;
  color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--indigo-a4); color: var(--indigo-12); }

.title {
  display: block; width: 100%; margin: 0; padding: 0; border: 0; background: none; outline: none;
  color: var(--fg); font: inherit; font-size: 18px; font-weight: 600; letter-spacing: -0.01em;
}
.title::placeholder { color: var(--fg-faint); font-weight: 500; }

.composer { margin-top: 14px; overflow: clip; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-2); transition: border-color 150ms; }
.composer:focus-within { border-color: var(--slate-a7); }
.composer-body { display: flex; align-items: flex-start; gap: 12px; padding: 14px 14px 8px; }
.composer-body .av { flex: none; }
.composer textarea {
  flex: 1; display: block; min-width: 0; min-height: 96px; padding: 4px 0 0; border: 0; background: none; resize: vertical;
  color: var(--fg); font: inherit; font-size: var(--text-nav); line-height: 1.5; outline: none;
}
.composer textarea::placeholder { color: var(--fg-faint); }
/* The utility bar: a darker strip under a hairline, apart from what you write. */
.composer-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px;
  border-top: 1px solid var(--slate-a3); background: rgb(0 0 0 / 0.25);
}
.types button { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px 0 8px; }
.types button :deep(svg) { opacity: 0.8; }
.types button[aria-checked='true'] :deep(svg) { opacity: 1; }
.hint { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-faint); }
.actions { display: flex; align-items: center; gap: 10px; }
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
</style>
