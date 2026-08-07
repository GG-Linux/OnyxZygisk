<script setup lang="ts">
/* Pill — the outlined status tag (.pill + .pill-* variant). */
import { computed } from "vue";

const props = withDefaults(
  defineProps<{ variant?: "green" | "gray" | "red" | "orange" | "primary" }>(),
  { variant: "gray" },
);

const classes = computed(() => ["pill", `pill-${props.variant}`]);
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
