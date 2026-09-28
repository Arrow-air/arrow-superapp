<script setup lang="ts">
import { computed } from 'vue';
import type { QuestionItem } from './derive';
import { systemName, tallyLeader } from './derive';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { origin, recordStatus, shortDate } from './labels';
import { positionTitle, signed } from '../lib/format';

const props = defineProps<{ item: QuestionItem; hideSystem?: boolean }>();
const { to } = useNav();
const { data } = useProject();
const leader = computed(() => (props.item.bundle && data.value ? tallyLeader(data.value, props.item.bundle) : undefined));
const leaderTitle = computed(() => {
  const p = props.item.bundle?.positions.find((x) => x.id === leader.value?.positionId);
  return p ? positionTitle(p.body, 90) : '';
});
const target = computed(() => (props.item.bundle ? to('discussions', { thread: props.item.bundle.thread.id }) : to('discussions', { record: props.item.record!.id })));
const fromRecord = computed(() => props.item.bundle?.thread.sourceRecordId ? data.value?.evidence.records.find((r) => r.id === props.item.bundle!.thread.sourceRecordId) : undefined);
</script>

<template>
  <RouterLink :to="target" class="pw-q" :data-kind="item.kind">
    <span class="pw-eyebrow"><template v-if="!hideSystem">{{ data ? systemName(data.evidence, item.system) : item.system }} · </template><template v-if="item.kind === 'record' && item.record && data">{{ item.record.kind === 'question' ? 'Question' : recordStatus[item.record.status] }} · {{ origin(data.evidence, item.record) }} · {{ item.record.versions.join(' / ') }}</template><template v-else-if="fromRecord && data">raised on the {{ origin(data.evidence, fromRecord) }}</template><template v-else-if="item.bundle?.thread.anchor">on the model · {{ item.bundle.thread.anchor.label }}</template><template v-else>team discussion</template></span>
    <strong>{{ item.title }}</strong>
    <span v-if="item.bundle" class="pw-q-meta">
      {{ item.bundle.positions.length }} {{ item.bundle.positions.length === 1 ? 'contribution' : 'contributions' }} · {{ nameOf(item.bundle.thread.authorId) }} · active {{ shortDate(item.date) }}
      <template v-if="leader && leader.score > 0"><br /><span class="pw-leader">Leading: “{{ leaderTitle }}” <b>{{ signed(leader.score) }}</b> from {{ leader.voters }} {{ leader.voters === 1 ? 'voter' : 'voters' }}</span></template>
    </span>
    <span v-else class="pw-q-meta">{{ item.summary }}</span>
  </RouterLink>
</template>
