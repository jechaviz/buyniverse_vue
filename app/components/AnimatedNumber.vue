<template>
  <span class="num" :aria-label="final">{{ text }}</span>
</template>
<script>
/**
 * A number that arrives instead of appearing. Money goes through the store's
 * formatter, so the currency and locale are the workspace's. With reduced
 * motion, or when the tab is hidden, it simply shows the value.
 */
const { inject, ref, computed, watch, onMounted, onBeforeUnmount } = Vue;

export default {
  props: {
    value: { type: Number, default: 0 },
    money: { type: Boolean, default: false },
    currency: { type: String, default: "" },
    duration: { type: Number, default: 1000 },
  },
  setup(props) {
    const store = inject("store");
    const current = ref(0);
    const reduced = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let frame = 0;
    const run = (target) => {
      cancelAnimationFrame(frame);
      if (reduced || props.duration <= 0 || document.hidden) { current.value = target; return; }
      const from = current.value, start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / props.duration);
        current.value = from + (target - from) * (1 - Math.pow(1 - t, 4));
        if (t < 1) frame = requestAnimationFrame(tick); else current.value = target;
      };
      frame = requestAnimationFrame(tick);
    };
    const format = (n) => (props.money ? store.money(n, props.currency || undefined) : new Intl.NumberFormat(store.locale.value === "en" ? "en-US" : "es-MX", { maximumFractionDigits: 0 }).format(n));
    onMounted(() => run(props.value));
    watch(() => props.value, run);
    onBeforeUnmount(() => cancelAnimationFrame(frame));
    return { text: computed(() => format(Math.round(current.value))), final: computed(() => format(props.value)) };
  },
};
</script>
