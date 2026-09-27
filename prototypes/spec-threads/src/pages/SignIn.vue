<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authClient, api } from "../data/sharedBackend";
import { refresh } from "../data/store";
const route = useRoute(),
  router = useRouter();
const email = ref(""),
  password = ref(""),
  busy = ref(false),
  error = ref(""),
  invitation = ref<any>();
const joining = computed(() => route.name === "join");
onMounted(async () => {
  if (joining.value) {
    try {
      invitation.value = await api(
        "/invite/info?token=" +
          encodeURIComponent(String(route.query.token ?? "")),
      );
    } catch (e: any) {
      error.value = e.message;
    }
  }
});
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    if (joining.value) {
      const r = await api("/invite/accept", {
        method: "POST",
        body: JSON.stringify({
          token: route.query.token,
          password: password.value,
        }),
      });
      email.value = r.email;
    }
    const { error: e } = await (
      await authClient()
    ).auth.signInWithPassword({ email: email.value, password: password.value });
    if (e) throw e;
    password.value = "";
    await refresh();
    await router.replace("/p/spearhead");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="auth-card briefing-panel">
    <h1>{{ joining ? "Join Spearhead" : "Sign in" }}</h1>
    <p v-if="invitation">
      Welcome, {{ invitation.display_name }}. Your invitation grants the
      {{ invitation.role }} role in this workspace.
    </p>
    <p v-else-if="!joining">
      Use your invited project account. Public evidence remains readable without
      signing in.
    </p>
    <form @submit.prevent="submit">
      <label v-if="!joining" class="field-row"
        >Email<input
          v-model="email"
          type="email"
          autocomplete="username"
          required /></label
      ><label class="field-row"
        >{{ joining ? "Choose a password" : "Password"
        }}<input
          v-model="password"
          type="password"
          :autocomplete="joining ? 'new-password' : 'current-password'"
          :minlength="joining ? 12 : undefined"
          required
      /></label>
      <p v-if="joining" class="small muted">
        Use at least 12 characters. This invitation is single-use.
      </p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="btn" :disabled="busy || (joining && !invitation)">
        {{ busy ? "Working…" : joining ? "Create account" : "Sign in" }}
      </button>
    </form>
    <p class="small muted">
      Need an invitation or account recovery? Contact your workspace
      administrator.
    </p>
  </section>
</template>
