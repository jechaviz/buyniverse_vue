<template>
  <RouterLink to="/" class="bn-logo" :aria-label="store.t('Buyniverse home')">
    <!-- One lap of the 3D ring, pre-rendered as a 32-frame strip: frame 0 is
         the rest pose, and hover plays the orbit with CSS steps(). -->
    <span class="bn-logo__mark" aria-hidden="true" :style="{ width: size + 'px', height: size + 'px', backgroundImage: 'url(assets/brand/buyniverse-mark-orbit.png?v=2)' }"></span>
    <span v-if="wordmark" class="bn-logo__word">buy<b>niverse</b></span>
  </RouterLink>
</template>

<script>
/**
 * The Buyniverse logo: the rendered 3D mark (a violet price tag with an
 * embossed "b", brass eyelet and cord; see app/lib/bn-three.js) beside the
 * lowercase wordmark. On hover its ring of stars orbits the tag: a 32-frame
 * strip rendered by tools/brand/render-mark.html, played with CSS steps().
 */
const { inject } = Vue;

export default {
  props: {
    size: { type: Number, default: 46 },
    wordmark: { type: Boolean, default: true },
  },
  setup() {
    return { store: inject("store") };
  },
};
</script>
