<template>
  <RouterLink to="/" class="bn-logo" :aria-label="store.t('Buyniverse home')">
    <img
      src="assets/brand/buyniverse-mark-64.png?v=2"
      srcset="assets/brand/buyniverse-mark-64.png?v=2 1x, assets/brand/buyniverse-mark-192.png?v=2 3x"
      :width="size"
      :height="size"
      alt=""
      decoding="async"
    />
    <span v-if="wordmark" class="bn-logo__word">buy<b>niverse</b></span>
  </RouterLink>
</template>

<script>
/**
 * The Buyniverse logo: the rendered 3D mark (a violet price tag with an
 * embossed "b", brass eyelet and cord; see app/lib/bn-three.js) beside the
 * lowercase wordmark. The mark is a PNG asset rendered by
 * tools/brand/render-mark.html.
 */
const { inject } = Vue;

export default {
  props: {
    size: { type: Number, default: 38 },
    wordmark: { type: Boolean, default: true },
  },
  setup() {
    return { store: inject("store") };
  },
};
</script>
