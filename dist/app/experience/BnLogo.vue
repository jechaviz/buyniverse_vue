<template>
  <RouterLink to="/" class="bn-logo" :aria-label="store.t('Buyniverse home')">
    <!-- A ring and a dot. On hover the dot orbits the ring: the same gesture the hero plays in 3D. -->
    <svg class="bn-logo__mark" aria-hidden="true" viewBox="0 0 32 32" :width="size" :height="size">
      <defs><linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36e3c0" /><stop offset="1" stop-color="#4d7cff" /></linearGradient></defs>
      <circle cx="17" cy="19" r="7" fill="none" :stroke="`url(#${gid})`" stroke-width="4" />
      <g class="bn-logo__orbit"><circle cx="12" cy="7.5" r="3" fill="currentColor" /></g>
    </svg>
    <span v-if="wordmark" class="bn-logo__word">buy<b>niverse</b></span>
  </RouterLink>
</template>

<script>
/**
 * The Buyniverse logo: the ring-and-dot mark beside the lowercase wordmark.
 * The mark is vector, so it is crisp at any size and costs no request.
 */
const { inject } = Vue;
let uid = 0;

export default {
  props: {
    size: { type: Number, default: 38 },
    wordmark: { type: Boolean, default: true },
  },
  setup() {
    return { store: inject("store"), gid: `bn-logo-g${++uid}` };
  },
};
</script>
