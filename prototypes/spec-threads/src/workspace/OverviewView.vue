<script setup lang="ts">
import { computed } from 'vue';
import { state } from '../data/store';
import { isExampleWorkspace } from '../data/projectDataMode';
import { trackingOf } from '../lib/projectRecords';
import { versionRetro, proposerAward } from '../lib/retro';
import { freezeCheck } from '../lib/versions';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import QuestionRow from './QuestionRow.vue';
import { activeStages, arrow, buildingVersion, callSuggestions, daysUntil, discussingVersion, openQuestions, recentOutcomes, specFor } from './derive';
import { recordStatus, shortDate, stageLabel } from './labels';

const { to } = useNav();
const { data, isLead, isMember } = useProject();
const pt2 = computed(() => (data.value ? discussingVersion(data.value.project) : undefined));
const pt1 = computed(() => (data.value ? buildingVersion(data.value.project) : undefined));
const pt1Summary = computed(() => data.value?.evidence.versions.find((v) => v.id === pt1.value?.id)?.summary);
const questions = computed(() => (data.value && pt2.value ? openQuestions(data.value, pt2.value.id) : []));
const outcomes = computed(() => (data.value && pt2.value ? recentOutcomes(data.value, pt2.value.id).slice(0, 4) : []));
const spec = computed(() => (data.value && pt2.value ? specFor(data.value, pt2.value) : []));
const decidedCount = computed(() => spec.value.reduce((n, s) => n + s.decisions.length, 0));
const teamWork = computed(() => (data.value ? data.value.grants.filter((g) => activeStages.includes(trackingOf(g).stage)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []));
const suggestions = computed(() => (data.value ? callSuggestions(data.value) : []));
const freeze = computed(() => (data.value && pt2.value ? freezeCheck(data.value.project, pt2.value.id, data.value.bundles.map((b) => b.thread)) : null));
const retro = computed(() => (data.value && pt2.value ? versionRetro({ project: data.value.project, versionId: pt2.value.id, bundles: data.value.bundles, members: data.value.members, roles: data.value.roles }) : null));
const myRetro = computed(() => retro.value?.lines.find((l) => l.memberId === state.me?.id)?.amount ?? 0);
const days = computed(() => (pt2.value?.freezeTarget ? daysUntil(pt2.value.freezeTarget) : null));
const needsMe = computed(() => {
  if (!data.value || !state.me) return [];
  const me = state.me.id;
  const review = isLead.value ? data.value.grants.filter((g) => trackingOf(g).stage === 'in_review') : [];
  const mine = data.value.grants.filter((g) => trackingOf(g).ownerId === me && ['open', 'in_progress'].includes(trackingOf(g).stage));
  return [...review.map((g) => ({ g, why: `${nameOf(trackingOf(g).ownerId)} submitted this for your review` })), ...mine.map((g) => ({ g, why: `Assigned to you · ${stageLabel[trackingOf(g).stage].toLowerCase()}` }))];
});
const reward = (g: (typeof teamWork.value)[number]) => trackingOf(g).amount;
const lastFrozen = computed(() => (data.value?.project.versions ?? []).filter((v) => v.state === 'frozen').sort((a, b) => b.order - a.order)[0]);
const lastFrozenDecisions = computed(() => (data.value && lastFrozen.value ? data.value.decisions.filter((d) => d.versionId === lastFrozen.value!.id && d.status === 'decided').length : 0));
const claimable = computed(() => (data.value?.grants ?? []).filter((g) => trackingOf(g).stage === 'open' && !trackingOf(g).ownerId));
const leadName = computed(() => {
  const leads = data.value ? data.value.members.filter((m) => data.value!.roles.some((r) => r.memberId === m.id && r.role === 'lead')) : [];
  return leads.length === 1 ? leads[0].displayName : 'a project lead';
});
</script>

<template>
  <div v-if="data && pt2" class="pw-overview">
    <section class="pw-hero">
      <div>
        <p class="pw-eyebrow">What’s happening</p>
        <h2>Shaping {{ pt2.name }} while {{ pt1?.name ?? 'the prototype' }} flies</h2>
        <p class="pw-lede">{{ pt1Summary }} Ideas from outside the build team go into {{ pt2.name }}; at the freeze the lead settles every open discussion: adopt it into the spec, fund it as work, defer it, or decline it.</p>
      </div>
      <dl class="pw-stats">
        <RouterLink :to="to('discussions')"><dt>Open questions</dt><dd>{{ questions.length }}</dd></RouterLink>
        <RouterLink :to="to('spec')"><dt>Decided for {{ pt2.name }}</dt><dd>{{ decidedCount }}</dd></RouterLink>
        <RouterLink :to="to('work')"><dt>Work underway</dt><dd>{{ teamWork.length }}</dd></RouterLink>
        <RouterLink :to="to('freeze')"><dt>{{ pt2.name }} retro pool</dt><dd>{{ pt2.retroPool ? arrow(pt2.retroPool.amount) : 'Not set' }}</dd></RouterLink>
      </dl>
    </section>

    <section v-if="!isMember" class="pw-help">
      <div v-if="isExampleWorkspace"><strong>Try it</strong><span>Pick someone under “Explore as” at the top. As Nadia (lead) you can settle discussions, accept work, and freeze {{ pt2.name }} to see the retro split. As Sofia or Mara you can contribute, support ideas, and claim work.</span></div>
      <div v-else><strong>How to help</strong><span>Read an open question below and add what you know, pick up an open bounty, or bring an idea for {{ pt2.name }}. Contributing needs an invitation while the pilot runs: ask {{ leadName }} in Arrow’s Discord.</span></div>
      <div class="pw-row"><RouterLink class="pw-btn pw-btn-quiet" :to="to('discussions')">Open questions ({{ questions.length }})</RouterLink><RouterLink class="pw-btn pw-btn-quiet" :to="to('work')">Open bounties ({{ claimable.length }})</RouterLink><RouterLink v-if="!state.me && !isExampleWorkspace" class="pw-btn" to="/sign-in">Sign in</RouterLink></div>
    </section>

    <section v-if="lastFrozen" class="pw-card pw-frozen">
      <div class="pw-card-head"><h3>{{ lastFrozen.name }} froze {{ lastFrozen.frozenAt ? shortDate(lastFrozen.frozenAt) : '' }}</h3><RouterLink class="pw-link" :to="to('spec', { version: lastFrozen.id })">Locked {{ lastFrozen.name }} spec →</RouterLink></div>
      <p>{{ lastFrozenDecisions }} {{ lastFrozenDecisions === 1 ? 'decision' : 'decisions' }} locked into the {{ lastFrozen.name }} spec.<template v-if="lastFrozen.retroAllocation"> {{ arrow(lastFrozen.retroAllocation.amount) }} retro pool split across {{ lastFrozen.retroAllocation.lines.length }} {{ lastFrozen.retroAllocation.lines.length === 1 ? 'person' : 'people' }}<template v-if="state.me && lastFrozen.retroAllocation.lines.some(l => l.memberId === state.me!.id)">, including {{ arrow(lastFrozen.retroAllocation.lines.find(l => l.memberId === state.me!.id)!.amount) }} for you</template>.</template> Unsettled questions moved to {{ pt2.name }}.</p>
      <RouterLink class="pw-link" :to="to('freeze')">See the split →</RouterLink>
    </section>

    <section v-if="needsMe.length" class="pw-card pw-card-alert">
      <h3>Needs you</h3>
      <RouterLink v-for="{ g, why } in needsMe" :key="g.id" :to="to('work', { grant: g.id })" class="pw-item"><strong>{{ g.title }}</strong><span class="pw-muted">{{ why }}</span></RouterLink>
    </section>

    <div class="pw-grid">
      <section class="pw-card pw-span">
        <div class="pw-card-head"><h3>Open questions for {{ pt2.name }}</h3><RouterLink class="pw-link" :to="to('discussions')">All discussions →</RouterLink></div>
        <p v-if="!questions.length" class="pw-muted">No open discussions for {{ pt2.name }} yet. Start one from the Discussions tab, or bring in a suggestion from calls.</p>
        <QuestionRow v-for="item in questions.slice(0, 6)" :key="item.key" :item="item" />
        <RouterLink v-if="questions.length > 6" class="pw-link" :to="to('discussions')">{{ questions.length - 6 }} more open →</RouterLink>
      </section>

      <div class="pw-side">
      <section class="pw-card pw-freeze-card">
        <div class="pw-card-head"><h3>{{ pt2.name }} freeze</h3><RouterLink class="pw-link" :to="to('freeze')">{{ isLead ? 'Freeze review →' : 'Details →' }}</RouterLink></div>
        <p class="pw-big">{{ pt2.freezeTarget ? shortDate(pt2.freezeTarget) : 'No date yet' }}<small v-if="days !== null"> {{ days > 0 ? `in ${days} days` : days === 0 ? 'today' : 'overdue' }}</small></p>
        <p class="pw-muted">{{ freeze?.resolved.length ?? 0 }} of {{ (freeze?.resolved.length ?? 0) + (freeze?.open.length ?? 0) }} team discussions settled</p>
        <div v-if="pt2.retroPool" class="pw-retro-mini">
          <p><b>{{ arrow(pt2.retroPool.amount) }}</b> goes to the {{ pt2.name }} discussion at the freeze, split by weighted support.</p>
          <p v-if="state.me && myRetro" class="pw-muted">Your share if it froze today: <b>{{ arrow(myRetro) }}</b></p>
          <p v-else-if="retro && retro.lines.length" class="pw-muted">{{ retro.lines.length }} {{ retro.lines.length === 1 ? 'person' : 'people' }} would share it today.</p>
        </div>
        <p v-else-if="isLead" class="pw-muted">Set a freeze date and a retro pool so contributors know when and how {{ pt2.name }} ideas are rewarded.</p>
      </section>
      <section v-if="suggestions.length" class="pw-card pw-suggest">
        <div class="pw-card-head"><h3>Suggested from calls</h3><RouterLink class="pw-link" :to="to('discussions', { status: 'suggested' })">All {{ suggestions.length }} →</RouterLink></div>
        <p class="pw-muted pw-small">Raised on calls or in the repository, not in the app yet. They join {{ pt2.name }} when someone starts a discussion.</p>
        <RouterLink v-for="item in suggestions.slice(0, 4)" :key="item.key" :to="to('discussions', { record: item.record!.id })" class="pw-item"><span class="pw-eyebrow">{{ item.record!.kind === 'question' ? 'Question' : 'Agreed or proposed' }} · {{ shortDate(item.date) }}</span><strong>{{ item.title }}</strong></RouterLink>
      </section>
      </div>
    </div>

    <div class="pw-grid pw-grid-even">
      <section class="pw-card">
        <div class="pw-card-head"><h3>Recently decided</h3><RouterLink class="pw-link" :to="to('spec')">{{ pt2.name }} spec →</RouterLink></div>
        <p v-if="!outcomes.length" class="pw-muted">Nothing settled for {{ pt2.name }} yet. Decisions appear here when a lead settles a discussion.</p>
        <RouterLink v-for="o in outcomes" :key="o.bundle.thread.id" :to="o.decision ? to('spec', { decision: o.decision.id }) : to('discussions', { thread: o.bundle.thread.id })" class="pw-item">
          <span class="pw-eyebrow">{{ o.adopted ? 'Adopted into the spec' : 'Concluded' }} · {{ shortDate(o.at) }}</span>
          <strong>{{ o.summary }}</strong>
          <span class="pw-muted pw-small">{{ o.bundle.thread.title }}</span>
        </RouterLink>
      </section>
      <section class="pw-card">
        <div class="pw-card-head"><h3>Work underway</h3><RouterLink class="pw-link" :to="to('work')">All work →</RouterLink></div>
        <RouterLink v-for="g in teamWork.slice(0, 4)" :key="g.id" :to="to('work', { grant: g.id })" class="pw-item">
          <span class="pw-eyebrow">{{ trackingOf(g).stage === 'open' && !trackingOf(g).ownerId ? 'Open bounty' : stageLabel[trackingOf(g).stage] }}<template v-if="reward(g)"> · {{ arrow(reward(g)!) }}</template></span>
          <strong>{{ g.title }}</strong>
          <span class="pw-muted pw-small">{{ trackingOf(g).ownerId ? nameOf(trackingOf(g).ownerId) : 'Unclaimed' }}<template v-if="trackingOf(g).dueDate"> · due {{ shortDate(trackingOf(g).dueDate) }}</template><template v-if="reward(g) && g.proposerShare"> · {{ arrow(proposerAward(reward(g), g.proposerShare)) }} proposer award{{ g.proposerIds.length ? ' to ' + g.proposerIds.map(nameOf).join(', ') : ', held for a lead to confirm' }}</template></span>
        </RouterLink>
        <p v-if="!teamWork.length" class="pw-muted">No work underway yet. Work comes from settled discussions.</p>
      </section>
    </div>

    <section class="pw-card">
      <div class="pw-card-head"><h3>{{ pt2.name }} by system</h3><RouterLink class="pw-link" :to="to('spec')">Read the spec →</RouterLink></div>
      <div class="pw-systems">
        <RouterLink v-for="s in spec.filter(s => s.system !== 'project-wide' || s.decisions.length || s.open.length)" :key="s.system" :to="to('spec', { system: s.system })" class="pw-system">
          <strong>{{ s.name }}</strong>
          <span><b>{{ s.decisions.length }}</b> decided · <b :class="{ 'pw-warn': s.open.length }">{{ s.open.length }}</b> open</span>
        </RouterLink>
      </div>
    </section>

  </div>
</template>
