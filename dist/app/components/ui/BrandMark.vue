<template>
  <span
    v-if="variant === 'tile'"
    class="grid shrink-0 place-items-center rounded-2xl bg-brand shadow-md shadow-brand/30"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <svg :width="size * 0.72" :height="size * 0.72" viewBox="0 0 32 32" role="img" :aria-label="label">
      <title>{{ label }}</title>
      <path :d="bowls" fill="none" stroke="currentColor" class="text-white" :stroke-width="weight" stroke-linecap="round" />
      <path :d="stem" stroke="currentColor" class="text-white" :stroke-width="weight" stroke-linecap="round" />
    </svg>
  </span>
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    class="shrink-0 text-brand"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <path :d="bowls" fill="none" stroke="currentColor" :stroke-width="weight" stroke-linecap="round" />
    <path :d="stem" stroke="currentColor" :stroke-width="weight" stroke-linecap="round" />
  </svg>
</template>

<script>
/**
 * The Buyniverse monogram.
 *
 * A capital B whose two bowls are the brand's B-Infinity lemniscate, stacked
 * upright, with the stem held clear of them. The bowl geometry is sampled from
 * app/lib/brand-curve.js -- the same curve the identity site draws and the hero
 * renders in WebGL -- so the logo, the brand and the product all carry one mark
 * rather than the letter-in-a-box placeholder and unrelated bar glyph they
 * replace. The path is baked rather than computed at runtime because the icon
 * has to paint before any script runs.
 */
const BOWLS =
  "M16.67 28C18.5 27.83 22.71 24.89 23.46 23.22C24.2 21.54 22.29 19.46 21.13 17.93C19.97 16.41 17.85 15.59 16.5 14.07C15.15 12.54 12.79 10.46 13.04 8.78C13.28 7.11 16.33 3.96 17.98 4C19.62 4.04 22.67 7.28 22.92 9.05C23.17 10.81 20.81 12.97 19.46 14.59C18.11 16.2 15.99 17.11 14.83 18.72C13.67 20.33 12.19 22.71 12.5 24.26C12.81 25.81 14.85 28.17 16.67 28Z";
const STEM = "M9.3 4L9.3 28";

export default {
  props: {
    size: { type: Number, default: 40 },
    // "tile" is the brand-filled rounded square used in app chrome and icons;
    // "line" is the bare mark for light surfaces.
    variant: { type: String, default: "tile" },
    label: { type: String, default: "Buyniverse" },
    weight: { type: Number, default: 4.2 },
  },
  setup() {
    return { bowls: BOWLS, stem: STEM };
  },
};
</script>
