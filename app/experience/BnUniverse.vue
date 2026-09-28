<template>
  <div ref="stage" class="bn-cinema__stage" aria-hidden="true">
    <!-- A painted nebula always shows first; the live galaxy fades in over it
         only once WebGL is confirmed, so no visitor ever sees an empty band. -->
    <div class="bn-cinema__fallback"></div>
    <canvas ref="canvas" :style="{ opacity: live ? 1 : 0 }"></canvas>
    <div class="bn-cinema__grain" :style="{ backgroundImage: grain }"></div>
    <div class="bn-cinema__vignette"></div>
    <div class="bn-cinema__scrim"></div>
  </div>
</template>

<script>
const { ref, watch, onMounted, onBeforeUnmount } = Vue;

// Film grain: a small deterministic noise tile, generated once per page.
function grainTile() {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(160, 160);
    let s = 1337;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const v = s >>> 24;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    ctx.putImageData(img, 0, 0);
    return `url(${c.toDataURL("image/png")})`;
  } catch (_) {
    return "none";
  }
}

export default {
  props: {
    // One node per listed supplier: [{ id, sector, score }]
    nodes: { type: Array, default: () => [] },
  },
  setup(props) {
    const stage = ref(null);
    const canvas = ref(null);
    const live = ref(false);
    const grain = ref("none");
    let controller = null, visible = false, disposed = false, mounting = false;
    let io = null, ro = null;

    const sync = () => {
      if (!controller) return;
      if (visible && document.visibilityState === "visible") controller.start();
      else controller.stop();
    };
    const stageCoords = (event) => {
      const r = stage.value.getBoundingClientRect();
      return [((event.clientX - r.left) / r.width) * 2 - 1, ((event.clientY - r.top) / r.height) * 2 - 1];
    };
    const onPointer = (event) => {
      if (!controller || !stage.value) return;
      const [x, y] = stageCoords(event);
      controller.setPointer(x, y);
      // Hovering the galactic core reveals it as the brand tag.
      controller.setHover(x, y);
    };
    const onLeave = () => controller && controller.clearHover();
    // Touch has no hover: a tap on the core reveals the tag for a moment.
    let tapTimer = 0;
    const onTap = (event) => {
      if (!controller || !stage.value || event.pointerType === "mouse") return;
      const [x, y] = stageCoords(event);
      controller.setHover(x, y);
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => controller && controller.clearHover(), 2600);
    };

    const mount = () => {
      const three = window.BuyniverseThree;
      if (!three || !canvas.value || controller || mounting) return;
      mounting = true;
      three.createUniverse(canvas.value, { nodes: props.nodes }).then((instance) => {
        mounting = false;
        if (!instance) return;
        if (disposed) return instance.dispose();
        controller = instance;
        live.value = true;
        sync();
      });
    };

    // Guests receive suppliers asynchronously: rebuild once the real nodes arrive.
    watch(() => props.nodes.length, (count) => {
      if (!controller || controller.nodeCount === count) return;
      controller.dispose();
      controller = null;
      if (visible) mount();
    });

    onMounted(() => {
      grain.value = grainTile();
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
      document.addEventListener("visibilitychange", sync);
      if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.documentElement.addEventListener("mouseleave", onLeave);
      }
      window.addEventListener("pointerdown", onTap, { passive: true });
    });

    onBeforeUnmount(() => {
      disposed = true;
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onTap);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      clearTimeout(tapTimer);
      io && io.disconnect();
      ro && ro.disconnect();
      controller && controller.dispose();
      controller = null;
    });

    return { stage, canvas, live, grain };
  },
};
</script>
