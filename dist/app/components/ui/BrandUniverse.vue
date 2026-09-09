<template>
  <div class="brand-universe absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <!-- Fallback that always paints: the canvas only ever layers on top of it,
         so no-WebGL, reduced-data and slow-network visitors still get depth. -->
    <div class="absolute -right-24 -top-28 h-[26rem] w-[26rem] rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/20"></div>
    <div class="absolute -left-24 -bottom-28 h-[26rem] w-[26rem] rounded-full bg-rose-500/10 blur-3xl dark:bg-indigo-500/15"></div>
    <canvas
      ref="canvasEl"
      class="absolute inset-0 h-full w-full transition-opacity duration-1000"
      :class="active ? 'opacity-100' : 'opacity-0'"
    ></canvas>
  </div>
</template>

<script>
const { ref, onMounted, onBeforeUnmount, watch } = Vue;

export default {
  props: {
    // 0 = offers still competing across the curve, 1 = fully converged on the award.
    convergence: { type: Number, default: 0 },
    particles: { type: Number, default: 900 },
  },
  setup(props) {
    const canvasEl = ref(null);
    const active = ref(false);

    let controller = null;
    let intersectionObserver = null;
    let resizeObserver = null;
    let themeObserver = null;
    let disposed = false;
    let visible = false;

    const isDark = () => document.documentElement.classList.contains("dark");

    const syncRunState = () => {
      if (!controller) return;
      if (visible && document.visibilityState === "visible") controller.start();
      else controller.stop();
    };

    const onVisibilityChange = () => syncRunState();

    const onPointerMove = (event) => {
      if (!controller || !canvasEl.value) return;
      const rect = canvasEl.value.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      controller.setPointer(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1
      );
    };

    // Every particle is repositioned on the CPU each frame, so the crowd is
    // sized to the device rather than the design: a phone paints a third of the
    // desktop count and spends its battery on something else.
    const particleBudget = () => {
      const width = window.innerWidth || 1280;
      if (width < 640) return Math.round(props.particles * 0.35);
      if (width < 1024) return Math.round(props.particles * 0.6);
      return props.particles;
    };

    const mountUniverse = () => {
      const engine = window.BuyniverseWebGL;
      if (!engine || !canvasEl.value) return;
      engine
        .createUniverse(canvasEl.value, {
          particles: particleBudget(),
          dark: isDark(),
        })
        .then((instance) => {
          if (!instance) return;
          if (disposed) {
            instance.dispose();
            return;
          }
          controller = instance;
          controller.setConvergence(props.convergence);
          active.value = true;
          syncRunState();
        });
    };

    onMounted(() => {
      if (!canvasEl.value) return;

      // Only pay for Three.js once the hero is genuinely on screen.
      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            visible = !!entry && entry.isIntersecting;
            if (visible && !controller) mountUniverse();
            syncRunState();
          },
          { rootMargin: "120px" }
        );
        intersectionObserver.observe(canvasEl.value);
      } else {
        visible = true;
        mountUniverse();
      }

      if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(() => controller && controller.resize());
        resizeObserver.observe(canvasEl.value);
      }

      themeObserver = new MutationObserver(() => controller && controller.setTheme(isDark()));
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      document.addEventListener("visibilitychange", onVisibilityChange);
      if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
      }
    });

    onBeforeUnmount(() => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onPointerMove);
      if (intersectionObserver) intersectionObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      if (themeObserver) themeObserver.disconnect();
      if (controller) controller.dispose();
      controller = null;
    });

    watch(
      () => props.convergence,
      (value) => controller && controller.setConvergence(value)
    );

    return { canvasEl, active };
  },
};
</script>
