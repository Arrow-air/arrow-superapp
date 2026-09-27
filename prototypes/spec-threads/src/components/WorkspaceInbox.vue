<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { state, backend, refresh } from "../data/store";
import { api } from "../data/sharedBackend";
import FollowRecord from "./FollowRecord.vue";
const router = useRouter();
const seen = ref(0);
const fresh = computed(() =>
  events.value.filter((e) => Number(e.id) > seen.value),
);
const actionLabel = (action: string) =>
  (
    ({
      createThread: "Discussion started",
      createPosition: "Contribution posted",
      addComment: "Reply posted",
      concludeThread: "Outcome recorded",
      updateWork: "Work updated",
      claimWork: "Work claimed",
      saveOutcome: "Draft updated",
      editContribution: "Contribution edited",
      "evidence-import": "Evidence imported",
      attachment: "File attached",
      join: "Member joined",
      reconciliation: "Repository review updated",
      castVote: "Support updated",
      updateProfile: "Profile updated",
    }) as Record<string, string>
  )[action] ?? action.replace(/([a-z])([A-Z])/g, "$1 $2");
async function markSeen() {
  const r = await api("/activity-cursor", {
    method: "POST",
    body: JSON.stringify({
      seen: Math.max(0, ...events.value.map((e) => Number(e.id))),
    }),
  });
  seen.value = r.seen;
}
const events = ref<any[]>([]),
  notifications = ref<any[]>([]),
  error = ref(""),
  email = ref(""),
  name = ref(""),
  role = ref("member"),
  invite = ref(""),
  busy = ref(false),
  grants = ref<any[]>([]);
const lead = computed(() =>
  state.roles.some((r) => r.memberId === state.me?.id && r.role === "lead"),
);
const myWork = computed(() =>
  grants.value.filter(
    (g) =>
      g.tracking?.ownerId === state.me?.id &&
      !["completed", "cancelled"].includes(g.tracking?.stage),
  ),
);
async function load() {
  if (!state.me) return;
  try {
    [events.value, notifications.value, grants.value] = await Promise.all([
      api("/events"),
      api("/notifications"),
      backend.listGrants(),
    ]);
    seen.value = (await api("/activity-cursor")).seen;
    error.value = "";
  } catch (e: any) {
    error.value = e.message;
  }
}
watch(() => [state.me?.id, state.version], load, { immediate: true });
async function open(e: any) {
  const threads = await backend.listThreads();
  const work = grants.value.find((g) => g.id === e.entity_id);
  const thread = threads.find((t) => t.id === e.entity_id);
  if (work)
    await router.push({
      path: "/p/spearhead",
      query: {
        view: "work",
        workspace: "team",
        grant: work.id,
        version: work.versionId,
      },
    });
  else if (thread)
    await router.push({
      path: "/p/spearhead",
      query: {
        view: "shape",
        workspace: "team",
        thread: thread.id,
        version: thread.versionId,
      },
    });
  else if (e.action === "reconciliation")
    await router.push({
      path: "/p/spearhead",
      query: { view: "sources", evidence: "review" },
    });
}
async function mark(id: number) {
  notifications.value = await api("/notifications", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
async function createInvite() {
  busy.value = true;
  try {
    const r = await api("/invites", {
      method: "POST",
      body: JSON.stringify({
        email: email.value,
        displayName: name.value,
        role: role.value,
      }),
    });
    invite.value =
      window.location.origin +
      window.location.pathname +
      "#/join?token=" +
      r.token;
    email.value = "";
    name.value = "";
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function exportProject() {
  try {
    const data = await api("/export");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "spearhead-workspace.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>
<template>
  <section class="records-view">
    <header class="briefing-heading">
      <h2>Your workspace</h2>
      <p>Assignments, watched records, and recent team changes.</p>
    </header>
    <p v-if="!state.me" class="briefing-panel">
      <RouterLink to="/sign-in">Sign in to see your workspace →</RouterLink>
    </p>
    <template v-else
      ><div class="row">
        <FollowRecord target="project" /><button
          class="btn btn-ghost"
          @click="refresh().then(load)"
        >
          Refresh shared records</button
        ><button class="btn btn-ghost" @click="exportProject">
          Export project
        </button>
      </div>
      <p v-if="error" role="alert">{{ error }}</p>
      <div class="briefing-grid">
        <section class="briefing-panel">
          <h3>My work · {{ myWork.length }}</h3>
          <p v-if="!myWork.length">No active assignments.</p>
          <button
            v-for="g in myWork"
            class="briefing-item"
            @click="open({ entity_id: g.id })"
          >
            <strong>{{ g.title }}</strong
            ><span
              >{{ g.tracking.stage.replaceAll("_", " ") }} ·
              {{ g.tracking.dueDate || "No due date" }}</span
            >
          </button>
        </section>
        <section class="briefing-panel">
          <h3>
            Inbox · {{ notifications.filter((n) => !n.read_at).length }} unread
          </h3>
          <p v-if="!notifications.length">
            Nothing here yet. Follow a record or the project for updates.
          </p>
          <article v-for="n in notifications" :key="n.id" class="inbox-entry">
            <button class="text-action" @click="open(n)">{{ n.title }}</button>
            <p>
              {{ actionLabel(n.action) }} ·
              {{ new Date(n.at).toLocaleString() }}
            </p>
            <button
              v-if="!n.read_at"
              class="text-action"
              @click="mark(Number(n.id))"
            >
              Mark read</button
            ><span v-else class="muted">Read</span>
          </article>
        </section>
      </div>
      <section class="briefing-panel">
        <h3>Changes since your last review · {{ fresh.length }}</h3>
        <button v-if="fresh.length" class="text-action" @click="markSeen">
          Mark these changes reviewed
        </button>
        <p class="muted small">
          Latest 100 changes. Marking activity reviewed does not clear inbox
          notifications.
        </p>
        <p v-if="!events.length">
          No team activity yet. Imported historical evidence is not new team
          activity.
        </p>
        <article
          v-for="e in events"
          :key="e.id"
          class="inbox-entry"
          :class="{ 'unread-change': Number(e.id) > seen }"
        >
          <button class="text-action" @click="open(e)">{{ e.title }}</button>
          <p>
            {{ actionLabel(e.action) }} ·
            {{
              state.members.find((m) => m.id === e.actor_id)?.displayName ??
              "Workspace member"
            }}
            · {{ new Date(e.at).toLocaleString() }}
          </p>
        </article>
      </section>
      <details v-if="lead" class="briefing-panel">
        <summary>Invite a team member</summary>
        <p>
          Invitations grant access to this workspace. Share the single-use link
          privately; no email is sent automatically.
        </p>
        <form @submit.prevent="createInvite">
          <label class="field-row">Name<input v-model="name" required /></label
          ><label class="field-row"
            >Email<input v-model="email" type="email" required /></label
          ><label class="field-row"
            >Role<select aria-label="Invitation role" v-model="role">
              <option value="member">Contributor</option>
              <option value="core">Reviewer</option>
              <option value="lead">Project lead</option>
            </select></label
          ><button class="btn" :disabled="busy">Create invitation</button>
        </form>
        <label v-if="invite" class="field-row"
          >Private invitation — expires in 2 days<textarea
            :value="invite"
            readonly
          />
        </label></details
    ></template>
  </section>
</template>
