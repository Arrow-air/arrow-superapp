<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { act, backend, state } from '../data/store';
import { api } from '../data/sharedBackend';
import { trackingOf } from '../lib/projectRecords';
import { versionRetro } from '../lib/retro';
import { positionTitle } from '../lib/format';
import type { Role } from '../lib/types';
import { useNav } from './nav';
import { useProject } from './useProject';
import { arrow, discussingVersion, namedOnCalls, people, plural, systemName } from './derive';
import { roleLabel, shortDate, stageLabel } from './labels';

const { q, to, go, router } = useNav();
const { data, isLead } = useProject();
const pt2 = computed(() => (data.value ? discussingVersion(data.value.project) : undefined));
const frozen = computed(() => data.value?.project.versions.filter((v) => v.retroAllocation) ?? []);
const list = computed(() => (data.value ? people(data.value, pt2.value?.id).sort((a, b) => (a.role === 'lead' ? -1 : b.role === 'lead' ? 1 : b.contributions + b.started - (a.contributions + a.started))) : []));
const person = computed(() => list.value.find((p) => p.member.id === q('person')));
const w = computed(() => data.value?.project.weights);
const calls = computed(() => (data.value ? namedOnCalls(data.value) : []));
const weightIn = (role: Role, expert: boolean, builder = false) => w.value ? Math.round((w.value.base + (expert ? w.value.expertiseBonus : 0) + (builder ? w.value.builderBonus : 0)) * w.value.roleMultiplier[role] * 100) / 100 : 1;
const activity = computed(() => {
  if (!data.value || !person.value) return [];
  const id = person.value.member.id;
  const rows = data.value.bundles.flatMap((b) => [
    ...(b.thread.authorId === id ? [{ at: b.thread.createdAt, what: 'Started', title: b.thread.title, thread: b.thread.id }] : []),
    ...b.positions.filter((p) => p.authorId === id).map((p) => ({ at: p.createdAt, what: 'Contributed', title: `${positionTitle(p.body, 80)} — in “${b.thread.title}”`, thread: b.thread.id })),
  ]);
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
});
const work = computed(() => (data.value && person.value ? data.value.grants.filter((g) => trackingOf(g).ownerId === person.value!.member.id) : []));
const earlierRetro = computed(() => frozen.value.map((v) => ({ v, amount: v.retroAllocation!.lines.find((l) => l.memberId === person.value?.member.id)?.amount ?? 0 })).filter((x) => x.amount));

// Lead controls
const role = ref<Role>('member'), verified = ref<string[]>([]), extra = ref(''), busy = ref(false), saved = ref(false);
watch(() => person.value?.member.id, () => { const p = person.value; if (!p) return; role.value = p.role; verified.value = (p.member.verifiedExpertise ?? []).filter((t) => data.value?.project.systems.includes(t)); extra.value = (p.member.verifiedExpertise ?? []).filter((t) => !data.value?.project.systems.includes(t)).join(', '); saved.value = false; }, { immediate: true });
async function saveStanding() {
  if (!data.value || !person.value || !backend.setMemberStanding) return;
  busy.value = true;
  const tags = [...verified.value, ...extra.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)];
  saved.value = await act(() => backend.setMemberStanding!({ projectId: data.value!.project.id, memberId: person.value!.member.id, role: role.value, verifiedExpertise: tags }));
  busy.value = false;
}

// Invitations (lead)
const inviting = ref(false), email = ref(''), inviteName = ref(''), inviteRole = ref<Role>('member'), invite = ref(''), inviteError = ref('');
async function createInvite() {
  busy.value = true; inviteError.value = '';
  try {
    const r = await api<{ token: string }>('/invites', { method: 'POST', body: JSON.stringify({ email: email.value, displayName: inviteName.value, role: inviteRole.value }) });
    invite.value = window.location.origin + window.location.pathname + '#/join?token=' + r.token;
    email.value = inviteName.value = '';
  } catch (e: any) { inviteError.value = e.message; } finally { busy.value = false; }
}
function back() { if (window.history.state?.back) router.back(); else go('people'); }
</script>

<template>
  <div v-if="data">
    <article v-if="person" class="pw-detail">
      <button class="pw-back" @click="back">← Back</button>
      <div class="pw-person-head">
        <span class="pw-avatar pw-avatar-lg">{{ person.member.displayName.slice(0, 1) }}</span>
        <div>
          <h2 class="pw-detail-title">{{ person.member.displayName }}</h2>
          <p class="pw-muted">{{ roleLabel[person.role] }}<template v-if="person.member.location"> · {{ person.member.location }}</template></p>
        </div>
      </div>
      <p v-if="person.member.bio" class="pw-lede">{{ person.member.bio }}</p>
      <p class="pw-row"><span v-for="t in person.member.verifiedExpertise ?? []" :key="t" class="pw-tag pw-tag-verified" title="Confirmed by the project lead">✓ {{ systemName(data.evidence, t) }}</span><span v-for="t in person.member.expertise.filter(t => !(person!.member.verifiedExpertise ?? []).includes(t))" :key="'s' + t" class="pw-tag">{{ t }}</span></p>

      <dl class="pw-stats pw-stats-small">
        <div><dt>Discussions started</dt><dd>{{ person.started }}</dd></div>
        <div><dt>Contributions</dt><dd>{{ person.contributions }}</dd></div>
        <div><dt>Weighted support received</dt><dd>{{ person.support }}</dd></div>
        <div><dt>Ideas adopted</dt><dd>{{ person.adopted }}</dd></div>
        <div><dt>Work accepted</dt><dd>{{ person.workAccepted }}</dd></div>
      </dl>

      <section class="pw-card">
        <h3>Rewards</h3>
        <ul class="pw-ledger">
          <li v-if="pt2?.retroPool"><span>{{ pt2.name }} retro pool, if it froze today</span><b>{{ arrow(person.retro) }}</b></li>
          <li v-for="x in earlierRetro" :key="x.v.id"><span>{{ x.v.name }} retro (recorded at the freeze)</span><b>{{ arrow(x.amount) }}</b></li>
          <li><span>Proposer awards from work their ideas became</span><b>{{ arrow(person.proposerAwards) }}</b></li>
          <li><span>Accepted work</span><b>{{ arrow(person.earnedFromWork) }}</b></li>
        </ul>
        <p class="pw-muted pw-small">Amounts are what the rules assign. Payment happens outside the app.</p>
      </section>

      <section class="pw-card">
        <h3>How much {{ person.member.displayName.split(' ')[0] }}’s support counts</h3>
        <p>{{ roleLabel[person.role] }}: <b>{{ weightIn(person.role, false) }}</b> in most discussions<template v-if="(person.member.verifiedExpertise ?? []).length">, <b>{{ weightIn(person.role, true) }}</b> in {{ (person.member.verifiedExpertise ?? []).map(t => systemName(data!.evidence, t)).join(', ') }} discussions</template>. Declaring “I can help build this” on a discussion adds {{ w?.builderBonus }}.</p>
        <p class="pw-muted pw-small">Weight = (1 + verified expertise + builder) × role. Token holdings will count once wallets are linked; a typed-in balance doesn’t.</p>
      </section>

      <section v-if="isLead" class="pw-card pw-form">
        <h3>Role and verified expertise</h3>
        <label>Role<select v-model="role"><option value="member">Contributor (×{{ w?.roleMultiplier.member }})</option><option value="core">Core (×{{ w?.roleMultiplier.core }})</option><option value="lead">Project lead (×{{ w?.roleMultiplier.lead }})</option></select></label>
        <fieldset><legend>Expertise you’ve confirmed</legend><label v-for="s in data.project.systems" :key="s" class="pw-check"><input v-model="verified" type="checkbox" :value="s" />{{ systemName(data.evidence, s) }}</label></fieldset>
        <label>Other confirmed tags<input v-model="extra" placeholder="e.g. pcb, firmware" /></label>
        <div class="pw-row"><button class="pw-btn" :disabled="busy" @click.prevent="saveStanding">Save</button><span v-if="saved" class="pw-muted" role="status">Saved.</span></div>
      </section>

      <section class="pw-section">
        <h3>Recent activity</h3>
        <p v-if="!activity.length && !work.length" class="pw-muted">Nothing yet.</p>
        <RouterLink v-for="(a, i) in activity" :key="i" :to="to('discussions', { thread: a.thread })" class="pw-item"><span class="pw-eyebrow">{{ a.what }} · {{ shortDate(a.at) }}</span><strong>{{ a.title }}</strong></RouterLink>
        <RouterLink v-for="g in work" :key="g.id" :to="to('work', { grant: g.id })" class="pw-item"><span class="pw-eyebrow">Work · {{ stageLabel[trackingOf(g).stage] }}</span><strong>{{ g.title }}</strong></RouterLink>
      </section>
      <p v-if="person.member.id === state.me?.id" class="pw-row"><RouterLink class="pw-link" to="/profile">Edit your profile →</RouterLink></p>
    </article>

    <template v-else>
      <div class="pw-page-head">
        <div><h2>People</h2><p class="pw-muted">Who’s working on Spearhead, what they’ve contributed, and what the reward rules assign them.</p></div>
        <button v-if="isLead" class="pw-btn" @click="inviting = !inviting">Invite someone</button>
      </div>
      <form v-if="inviting && isLead" class="pw-card pw-form" @submit.prevent="createInvite">
        <h3>Invite someone</h3>
        <label>Name<input v-model="inviteName" required /></label>
        <label>Email<input v-model="email" type="email" required /></label>
        <label>Role<select v-model="inviteRole"><option value="member">Contributor</option><option value="core">Core</option><option value="lead">Project lead</option></select></label>
        <button class="pw-btn" :disabled="busy">Create invitation link</button>
        <p v-if="inviteError" role="alert" class="pw-warn">{{ inviteError }}</p>
        <label v-if="invite">Send this link privately. It works once and expires in 2 days.<textarea :value="invite" readonly /></label>
      </form>
      <section class="pw-card">
        <div class="pw-people">
          <RouterLink v-for="p in list" :key="p.member.id" :to="to('people', { person: p.member.id })" class="pw-person">
            <span class="pw-avatar">{{ p.member.displayName.slice(0, 1) }}</span>
            <div>
              <strong>{{ p.member.displayName }}</strong>
              <span class="pw-muted pw-small">{{ roleLabel[p.role] }}<template v-if="(p.member.verifiedExpertise ?? []).length"> · ✓ {{ (p.member.verifiedExpertise ?? []).map(t => systemName(data!.evidence, t)).join(', ') }}</template></span>
              <span class="pw-small">{{ plural(p.contributions, 'contribution') }} · {{ p.started }} started · {{ plural(p.workAccepted, 'work item') }} accepted<template v-if="p.retro"> · {{ arrow(p.retro) }} {{ pt2?.name }} retro if frozen today</template><template v-if="p.retroRecorded"> · {{ arrow(p.retroRecorded) }} retro recorded</template></span>
            </div>
          </RouterLink>
        </div>
        <p v-if="!list.length" class="pw-muted">No members yet.</p>
      </section>
      <section v-if="calls.length" class="pw-card">
        <h3>Named on calls, not in the app yet</h3>
        <p class="pw-muted pw-small">People the call notes credit with work or decisions. Invite them so their contributions and rewards can be recorded.</p>
        <div class="pw-row"><RouterLink v-for="c in calls" :key="c.name" class="pw-tag" :to="to('search', { q: c.name })">{{ c.name }} · {{ plural(c.records, 'record') }}</RouterLink></div>
      </section>
      <section v-if="pt2?.retroPool && data" class="pw-card">
        <div class="pw-card-head"><h3>{{ pt2.name }} retro pool: {{ arrow(pt2.retroPool.amount) }}</h3><RouterLink class="pw-link" :to="to('freeze')">How it’s split →</RouterLink></div>
        <p class="pw-muted pw-small">Split at the freeze by weighted support on each contribution, including ideas that weren’t adopted.</p>
      </section>
    </template>
  </div>
</template>
