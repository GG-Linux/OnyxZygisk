<script setup lang="ts">
/* Switch — pill toggle (.switch). Bound with v-model:checked. */
const checked = defineModel<boolean>("checked", { default: false });
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <label class="switch" :class="{ 'switch--disabled': disabled }">
    <input type="checkbox" v-model="checked" :disabled="disabled" />
    <span class="slider"></span>
  </label>
</template>
