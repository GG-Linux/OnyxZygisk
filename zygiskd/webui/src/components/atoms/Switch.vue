<script setup lang="ts">
/* Switch — the square track/knob toggle (.switch). Bound with v-model:checked. */
const checked = defineModel<boolean>("checked", { default: false });
</script>

<template>
  <label class="switch">
    <input type="checkbox" v-model="checked">
    <span class="slider"></span>
  </label>
</template>
