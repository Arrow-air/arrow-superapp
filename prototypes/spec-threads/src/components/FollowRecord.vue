<script setup lang="ts">
import { ref, watch } from "vue";
import { api } from "../data/sharedBackend";
import { state } from "../data/store";
import { isSharedProject } from "../data/projectDataMode";
const props = defineProps<{ target: string }>();
const following = ref(false),
  error = ref(""),
  busy = ref(false);
watch(
  () => [props.target, state.me?.id],
  async () => {
    if (state.me && isSharedProject)
      try {
        following.value = (await api<string[]>("/watches")).includes(
          props.target,
        );
      } catch (e: any) {
        error.value = e.message;
      }
  },
  { immediate: true },
);
async function toggle() {
  busy.value = true;
  try {
    const all = await api<string[]>("/watches", {
      method: "POST",
      body: JSON.stringify({ target: props.target, on: !following.value }),
    });
    following.value = all.includes(props.target);
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <button
    v-if="state.me && isSharedProject"
    class="btn btn-ghost"
    :aria-pressed="following"
    :disabled="busy"
    @click="toggle"
  >
    {{ following ? "Following" : "Follow updates" }}
  </button>
  <p v-if="error" role="alert">{{ error }}</p>
</template>
