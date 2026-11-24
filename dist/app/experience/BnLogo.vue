<template>
  <RouterLink to="/" class="bn-logo" :aria-label="store.t('Buyniverse home')">
    <!-- Proposal A (Convergent Orbit): geometric "b" orbital ring + convergence node. On hover the node orbits the bowl centre (17, 18.5). -->
    <svg class="bn-logo__mark" aria-hidden="true" viewBox="0 0 32 32" fill="none" :width="size" :height="size">
      <defs><linearGradient :id="gid" x1="7" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#36e3c0" /><stop offset="1" stop-color="#3f6af2" /></linearGradient></defs>
      <path d="M9.5 6v12.5a7.5 7.5 0 1 0 13.65-4.3" :stroke="`url(#${gid})`" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
      <g class="bn-logo__orbit"><circle cx="18.3" cy="11.1" r="2.4" fill="currentColor" /></g>
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
