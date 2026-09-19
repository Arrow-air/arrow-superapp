<script setup lang="ts">
import { computed } from 'vue';
import { decisionById, tally, state, me, personas } from '../data/pretend';
import { partById, taskById } from '../data/quiver';
import Pretend from '../components/Pretend.vue';

const props = defineProps<{ id: string }>();
const d = computed(() => decisionById.get(props.id)!);
const rows = computed(() => tally(d.value));
const heads = computed(() => rows.value.reduce((a, r) => a + r.heads, 0) || 1);
const myWeight = computed(() => (d.value.kind === 'money' ? Math.sqrt(me().tokens) : me().signal));
const dependents = computed(() => [...decisionById.values()].filter((x) => x.dependsOn.some((y) => y.id === d.value.id)));
const split = computed(() => { const w = [...rows.value].sort((a, b) => b.share - a.share)[0], h = [...rows.value].sort((a, b) => b.heads - a.heads)[0]; return w.position.id !== h.position.id ? { w, h } : null; });
const label = (pid: string) => personas.find((p) => p.id === pid)?.label ?? pid;
</script>

<template>
  <template v-if="d">
    <RouterLink to="/decisions" class="small">← Decisions</RouterLink>
    <div class="spread" style="margin-top:8px">
      <div>
        <div class="row"><span class="chip chip-warn">open</span><span class="chip" :class="d.kind === 'money' ? 'chip-bounty' : 'chip-project'">{{ d.kind === 'money' ? 'money · token weighted' : 'engineering · signal weighted' }}</span>
          <a class="chip chip-real" :href="d.source.url" target="_blank" rel="noopener">question from {{ d.source.label }} ↗</a></div>
        <h1 style="margin-top:8px">{{ d.title }}</h1>
        <p class="lede">{{ d.question }}</p>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 320px">
      <div>
        <h2>Positions <Pretend why="The options are quoted from the issue. The votes are invented and come from role personas, not people." /></h2>
        <div v-for="r in rows" :key="r.position.id" class="pos" :class="{ mine: state.votes[d.id] === r.position.id }">
          <div class="spread"><strong>{{ r.position.label }}</strong>
            <button class="btn" :class="{ 'btn-ghost': state.votes[d.id] !== r.position.id }" @click="state.votes[d.id] = r.position.id">{{ state.votes[d.id] === r.position.id ? 'Your position' : 'Back this' }}</button></div>
          <p class="small" style="margin:6px 0 10px">{{ r.position.text }}</p>
          <div class="row small"><span style="width:70px" class="muted">weighted</span><div class="bar" style="flex:1"><i :style="{ width: r.share * 100 + '%' }" /></div><span class="mono" style="width:44px;text-align:right">{{ Math.round(r.share * 100) }}%</span></div>
          <div class="row small" style="margin-top:4px"><span style="width:70px" class="muted">heads</span><div class="bar heads" style="flex:1"><i :style="{ width: (r.heads / heads) * 100 + '%' }" /></div><span class="mono" style="width:44px;text-align:right">{{ r.heads }}</span></div>
          <p v-if="r.voters.length" class="small muted" style="margin:8px 0 0">{{ r.voters.map((v) => v.label).join(' · ') }}</p>
          <div v-for="(o, i) in d.objections.filter((o) => o.position === r.position.id)" :key="i" class="objection"><span class="label">Unanswered objection · {{ label(o.by) }}</span><br />{{ o.text }}</div>
        </div>
        <p v-if="split" class="pin">The crowd and the weighting disagree: most heads back “{{ split.h.position.label }}”, most weight backs “{{ split.w.position.label }}”. This is the case the decider has to explain in writing.</p>
      </div>

      <aside class="stack">
        <div class="card card-subtle">
          <span class="label">Who decides</span>
          <h3>{{ d.decider }}</h3>
          <p class="small muted">{{ d.deciderNote }}</p>
          <p class="small">The vote informs. It does not decide. Going against the top-weighted position needs a published reason, and that gets counted as an override.</p>
        </div>
        <div class="card">
          <span class="label">Your weight here <Pretend /></span>
          <h3 class="mono">{{ myWeight.toFixed(1) }}</h3>
          <p v-if="d.kind === 'money'" class="small muted">Money votes weigh tokens: the square root of {{ me().tokens.toLocaleString() }} $ARROW. Holdings always count, never linearly.</p>
          <ul v-else class="small muted" style="padding-left:18px;margin:0"><li v-for="w in me().signalWhy" :key="w">{{ w }}</li></ul>
        </div>
        <div class="card">
          <span class="label">Anchored to</span>
          <RouterLink v-for="p in d.parts" :key="p" :to="`/aircraft/${p}`" class="mini"><span class="mono muted">{{ p }}</span> {{ partById.get(p)?.name }}</RouterLink>
          <RouterLink v-for="t in d.tasks" :key="t" :to="`/work/${t}`" class="mini"><span class="mono muted">{{ t }}</span> {{ taskById.get(t)?.title }}</RouterLink>
        </div>
        <div class="card" v-if="d.dependsOn.length || dependents.length">
          <span class="label">Dependencies <Pretend why="The demo drew these links. The repo does not record dependencies between decisions." /></span>
          <div v-for="x in d.dependsOn" :key="x.id" class="dep"><span class="muted">affects</span><span><RouterLink v-if="decisionById.get(x.id)" :to="`/decisions/${x.id}`">{{ decisionById.get(x.id)!.title }}</RouterLink><strong v-else>Endurance study (T-03)</strong><br /><span class="small muted">{{ x.why }}</span></span></div>
          <div v-for="x in dependents" :key="x.id" class="dep"><span class="muted">affected by</span><RouterLink :to="`/decisions/${x.id}`">{{ x.title }}</RouterLink></div>
        </div>
      </aside>
    </div>
  </template>
</template>
