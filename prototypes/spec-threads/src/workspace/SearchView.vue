<script setup lang="ts">
import { computed } from 'vue';
import { trackingOf } from '../lib/projectRecords';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { decisionTitle, recordState, systemName } from './derive';
import { recordStatus, sourceKind, stageLabel } from './labels';

const { q, to } = useNav();
const { data } = useProject();
const term = computed(() => q('q').toLowerCase());
const has = (...texts: (string | undefined)[]) => !!term.value && texts.some((t) => t?.toLowerCase().includes(term.value));
const threads = computed(() => (data.value?.bundles ?? []).filter((b) => has(b.thread.title, b.thread.body, ...b.positions.map((p) => p.body), ...b.comments.map((c) => c.body))));
const decisions = computed(() => (data.value?.decisions ?? []).filter((d) => has(d.chosen, d.question, d.outcomeSnapshot?.body)));
const work = computed(() => (data.value?.grants ?? []).filter((g) => has(g.title, g.scope, trackingOf(g).evidence)));
const records = computed(() => (data.value?.evidence.records ?? []).filter((r) => has(r.title, r.summary, r.body, r.owner)));
const sources = computed(() => (data.value?.evidence.sources ?? []).filter((s) => has(s.title, s.note)));
const people = computed(() => (data.value?.members ?? []).filter((m) => has(m.displayName, m.bio, ...m.expertise)));
const total = computed(() => threads.value.length + decisions.value.length + work.value.length + records.value.length + sources.value.length + people.value.length);
</script>

<template>
  <div v-if="data">
    <div class="pw-page-head"><div><h2>Search</h2><p class="pw-muted">{{ total }} results for “{{ q('q') }}”</p></div></div>
    <section v-if="decisions.length" class="pw-card"><h3>Decisions</h3><RouterLink v-for="d in decisions" :key="d.id" :to="to('spec', { decision: d.id })" class="pw-item"><strong>{{ decisionTitle(d) }}</strong><span class="pw-muted pw-small">{{ d.question }}</span></RouterLink></section>
    <section v-if="threads.length" class="pw-card"><h3>Discussions</h3><RouterLink v-for="b in threads" :key="b.thread.id" :to="to('discussions', { thread: b.thread.id })" class="pw-item"><span class="pw-eyebrow">{{ b.thread.status === 'open' ? 'Open' : 'Settled' }} · {{ systemName(data.evidence, b.thread.system) }}</span><strong>{{ b.thread.title }}</strong></RouterLink></section>
    <section v-if="work.length" class="pw-card"><h3>Work</h3><RouterLink v-for="g in work" :key="g.id" :to="to('work', { grant: g.id })" class="pw-item"><span class="pw-eyebrow">{{ stageLabel[trackingOf(g).stage] }}</span><strong>{{ g.title }}</strong><span class="pw-muted pw-small">{{ nameOf(trackingOf(g).ownerId) }}</span></RouterLink></section>
    <section v-if="records.length" class="pw-card"><h3>From calls and documents</h3><RouterLink v-for="r in records" :key="r.id" :to="to('discussions', { record: r.id })" class="pw-item"><span class="pw-eyebrow">{{ recordState(data, r).label || recordStatus[r.status] }} · {{ systemName(data.evidence, r.systems[0]) }}</span><strong>{{ r.title }}</strong><span class="pw-muted pw-small">{{ r.summary }}</span></RouterLink></section>
    <section v-if="people.length" class="pw-card"><h3>People</h3><RouterLink v-for="m in people" :key="m.id" :to="to('people', { person: m.id })" class="pw-item"><strong>{{ m.displayName }}</strong></RouterLink></section>
    <section v-if="sources.length" class="pw-card"><h3>Sources</h3><a v-for="s in sources" :key="s.id" :href="s.url" target="_blank" rel="noopener" class="pw-item"><span class="pw-eyebrow">{{ sourceKind[s.kind] }}</span><strong>{{ s.title }} ↗</strong></a></section>
    <p v-if="!total" class="pw-card pw-muted">Nothing matches. Try a part name, a system, or a person.</p>
  </div>
</template>
