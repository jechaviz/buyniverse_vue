<template>
  <Teleport to="body">
    <div v-if="open" class="nl" :style="{ '--c': color }" role="dialog" aria-modal="true" :aria-label="store.t('Publishing your need')" @click="finish" @keydown.esc="finish">
      <div class="nl-stage">
        <canvas ref="canvas" class="nl-ring" aria-hidden="true"></canvas>
        <h2 class="nl-title">{{ store.t("Publishing your need") }}</h2>
        <ol class="nl-lines" aria-live="polite">
          <li v-for="(line, i) in shown" :key="i" class="nl-line"><i class="fa-solid fa-check"></i><span>{{ line }}</span></li>
        </ol>
        <p class="nl-skip">{{ store.t("Click to continue") }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script>
/**
 * The moment a need goes out. The mark orbits to the kind of purchase, the
 * suppliers are named as they are invited, and then you are taken to where the
 * offers will arrive. A second, not a loading screen: any key or click skips it.
 */
const { inject, ref, watch, nextTick, onBeforeUnmount } = Vue;

export default {
  props: {
    open: { type: Boolean, default: false },
    color: { type: String, default: "#36e3c0" },
    focus: { type: Number, default: -1 },
    lines: { type: Array, default: () => [] },
    // the suppliers being invited: [{ id, name }]; each one lifts off the ring and falls toward the need
    suppliers: { type: Array, default: () => [] },
  },
  emits: ["done"],
  setup(props, { emit }) {
    const store = inject("store"), Need = window.BuyniverseNeed;
    const canvas = ref(null), shown = ref([]);
    let scene = null;
    let timers = [], finished = false;
    const finish = () => { if (finished) return; finished = true; emit("done"); };
    const onKey = () => finish();
    watch(() => props.open, async (open) => {
      timers.forEach(clearTimeout); timers = []; shown.value = []; finished = false;
      if (scene) { scene.dispose(); scene = null; }
      if (!open) { window.removeEventListener("keydown", onKey); return; }
      window.addEventListener("keydown", onKey);
      await nextTick();
      if (window.BnOrbit && canvas.value) { scene = window.BnOrbit.mount(canvas.value, { color: props.color }); scene.call(); }
      props.lines.forEach((line, i) => timers.push(setTimeout(() => { shown.value = [...shown.value, line]; if (scene) scene.ping(); }, 350 + i * 520)));
      props.suppliers.slice(0, 4).forEach((sup, i, all) => timers.push(setTimeout(() => { if (scene) scene.addOrb({ id: sup.id, label: sup.label || "", level: all.length > 1 ? 0.15 + 0.85 * (i / (all.length - 1)) : 1, win: i === all.length - 1 }); }, 500 + i * 520)));
      timers.push(setTimeout(finish, 350 + props.lines.length * 520 + 650));
    });
    onBeforeUnmount(() => { timers.forEach(clearTimeout); window.removeEventListener("keydown", onKey); if (scene) scene.dispose(); });
    return { store, canvas, shown, finish };
  },
};
</script>
