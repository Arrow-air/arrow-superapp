<script setup lang="ts">
// #/community/reach-out: the team's page for reaching out. Phase 1d builds it
// here: the say-hi and intro-call queues, drafts a person sends from their own
// account, and the after-call note. Person pages already link in with
// ?person=<id> (Invite to a call) and ?person=<id>&invite=join (Invite to
// join). Until then it says so and sends people back.
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import { community, loadCommunity, onTeam } from '../../modules/registry/community';
import '../../modules/registry/registry.css';
import '../../modules/registry/community.css';

const route = useRoute();
const personId = computed(() => (typeof route.query.person === 'string' ? route.query.person : ''));
const who = computed(() => community.people.find((p) => p.id === personId.value));
onMounted(() => { document.title = 'Reach out · Community · Arrow'; void loadCommunity(); });
</script>

<template>
  <div class="cm rg reach">
    <nav class="crumb" aria-label="Breadcrumb"><span>Community</span><Icon name="chevron-right" :size="12" /><b>Reach out</b><span class="teamtag"><Icon name="lock" :size="11" />team only</span></nav>
    <template v-if="onTeam">
      <h1>Reach out</h1>
      <p class="lede">Saying hi to everyone new on Discord, and intro calls with the people we pick. The queues and the drafts you send from your own account come here next.</p>
      <div class="callout team" data-reach-soon>
        <Icon name="send" :size="16" />
        <div>
          <template v-if="who">For now, reach {{ who.name }} the usual way, and note it on their page so the team knows.</template>
          <template v-else>For now, reach out the usual way and note it on the person's page so the team knows.</template>
          <div class="row">
            <RouterLink v-if="who" class="btn sm" :to="`/community/people/${who.id}`">Back to {{ who.name }}</RouterLink>
            <RouterLink class="btn sm" :to="{ path: '/community/people', query: { view: 'call' } }">Open to a call</RouterLink>
            <RouterLink class="btn sm" :to="{ path: '/community/people', query: { view: 'waiting' } }">Waiting on us</RouterLink>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="state">This page is for Arrow's core team. <RouterLink class="link" to="/community/people">See everyone in Community</RouterLink>.</p>
  </div>
</template>

<style scoped>
.crumb .teamtag { margin-left: 6px; }
.callout { max-width: 720px; margin-top: 16px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
</style>
