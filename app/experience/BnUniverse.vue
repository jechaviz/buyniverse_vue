<template>
  <div ref="stage" class="bn-hero__stage" aria-hidden="true">
    <!-- The rendered mark always paints first; the live scene fades in over it
         only once WebGL is confirmed, so no visitor ever sees an empty stage. -->
    <div class="bn-hero__fallback" :style="{ opacity: live ? 0 : 1 }">
      <img src="assets/brand/buyniverse-mark-1024.png" width="1024" height="1024" alt="" decoding="async" />
    </div>
    <canvas ref="canvas" :style="{ opacity: live ? 1 : 0, transition: 'opacity .8s ease' }"></canvas>
  </div>
</template>

<script>
const { ref, onMounted, onBeforeUnmount } = Vue;

export default {
  props: {
    // One orbiting node per listed supplier: [{ id, sector, score }]
    nodes: { type: Array, default: () => [] },
  },
  setup(props) {
    const stage = ref(null);
    const canvas = ref(null);
    const live = ref(false);
    let controller = null, visible = false, disposed = false;
    let io = null, ro = null, mo = null;

    const isDark = () => document.documentElement.classList.contains("dark");
    const sync = () => {
      if (!controller) return;
      if (visible && document.visibilityState === "visible") controller.start();
      else controller.stop();
    };
    const onPointer = (event) => {
      if (!controller || !stage.value) return;
      const r = stage.value.getBoundingClientRect();
      controller.setPointer(((event.clientX - r.left) / r.width) * 2 - 1, ((event.clientY - r.top) / r.height) * 2 - 1);
    };

    const mount = () => {
      const three = window.BuyniverseThree;
      if (!three || !canvas.value || controller) return;
      three.createUniverse(canvas.value, { nodes: props.nodes, dark: isDark() }).then((instance) => {
        if (!instance) return;
        if (disposed) return instance.dispose();
        controller = instance;
        live.value = true;
        sync();
      });
    };

    onMounted(() => {
      if (typeof IntersectionObserver === "function") {
        io = new IntersectionObserver(([entry]) => {
          visible = Boolean(entry && entry.isIntersecting);
          if (visible) mount();
          sync();
        }, { rootMargin: "160px" });
        io.observe(stage.value);
      } else {
        visible = true;
        mount();
      }
      if (typeof ResizeObserver === "function") {
        ro = new ResizeObserver(() => controller && controller.resize());
        ro.observe(stage.value);
      }
      mo = new MutationObserver(() => controller && controller.setTheme(isDark()));
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      document.addEventListener("visibilitychange", sync);
      if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", onPointer, { passive: true });
    });

    onBeforeUnmount(() => {
      disposed = true;
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer);
      io && io.disconnect();
      ro && ro.disconnect();
      mo && mo.disconnect();
      controller && controller.dispose();
      controller = null;
    });

    return { stage, canvas, live };
  },
};
</script>
