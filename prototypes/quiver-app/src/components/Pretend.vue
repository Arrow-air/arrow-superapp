<script setup lang="ts">defineProps<{ why?: string }>();</script>
<template><span class="chip chip-pretend" :title="why ?? 'Not real. Added by the demo so the screen can be clicked.'">pretend</span></template>
