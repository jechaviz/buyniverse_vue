<template>
  <div>
    <!-- Session Lock Overlay -->
    <div
      v-if="ui.locked"
      class="fixed inset-0 z-90 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Session locked"
      @keydown="handleLockKeydown"
    >
      <section ref="lockPanel" tabindex="-1" class="glass w-full max-w-md rounded-3xl p-8 text-center shadow-elevated">
        <span class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-2xl text-brand dark:bg-brand/20 shadow-soft">
          <i class="fa-solid fa-shield-halved"></i>
        </span>
        <p class="premium-kicker mt-5 text-[11px] font-800 uppercase tracking-widest text-brand">Privacy protection</p>
        <h1 class="font-head mt-2 text-2xl font-800 tracking-tight">Session locked</h1>
        <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          The local workspace was covered after inactivity. In production this action must require server-backed re-authentication.
        </p>
        <button class="btn-brand mt-6 w-full py-2.5" @click="$emit('resume-session')">
          <i class="fa-solid fa-unlock-keyhole mr-2"></i>Resume demo session
        </button>
      </section>
    </div>

    <!-- Confirm Modal -->
    <Transition name="toast">
      <div
        v-if="ui.modal"
        class="fixed inset-0 z-70 grid place-items-center p-4"
        role="dialog"
        aria-modal="true"
        :aria-label="ui.modal.title"
        @keydown="handleConfirmKeydown"
      >
        <button class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Cancel confirmation" @click="$emit('resolve-confirm', false)"></button>
        <section ref="confirmPanel" tabindex="-1" class="glass relative w-full max-w-md rounded-3xl p-6 shadow-elevated">
          <div
            class="grid h-12 w-12 place-items-center rounded-2xl"
            :class="ui.modal.danger ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-brand-50 text-brand dark:bg-brand/20'"
          >
            <i class="fa-solid text-lg" :class="ui.modal.danger ? 'fa-triangle-exclamation' : 'fa-circle-question'"></i>
          </div>
          <h2 class="font-head mt-4 text-xl font-800 tracking-tight">{{ ui.modal.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ ui.modal.message }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-muted" @click="$emit('resolve-confirm', false)">Cancel</button>
            <button
              class="btn-brand"
              :class="ui.modal.danger ? '!bg-rose-600 hover:!bg-rose-700 shadow-none' : ''"
              @click="$emit('resolve-confirm', true)"
            >
              {{ ui.modal.confirmText }}
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <!-- Loading Toast Overlay -->
    <Transition name="toast">
      <div v-if="ui.loading" class="fixed inset-0 z-65 grid place-items-center bg-slate-950/35 backdrop-blur-[2px]" role="status">
        <div class="glass flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-card">
          <i class="fa-solid fa-circle-notch animate-spin text-brand"></i>
          <span class="text-sm font-semibold">{{ ui.loadingMessage || "Working…" }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script>
export default {
  props: {
    ui: Object,
  },
  emits: ["resume-session", "resolve-confirm"],
  data() {
    return {
      lockOverlayId: `session-lock-${Math.random().toString(36).slice(2, 9)}`,
      confirmOverlayId: `confirm-modal-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
  watch: {
    "ui.locked": {
      immediate: true,
      handler(open) { this.syncOverlay(this.lockOverlayId, "lockPanel", open); },
    },
    "ui.modal": {
      immediate: true,
      handler(modal) { this.syncOverlay(this.confirmOverlayId, "confirmPanel", Boolean(modal)); },
    },
  },
  beforeUnmount() {
    window.BuyniverseOverlay?.release(this.lockOverlayId);
    window.BuyniverseOverlay?.release(this.confirmOverlayId);
  },
  methods: {
    syncOverlay(id, refName, open) {
      if (!open) return window.BuyniverseOverlay?.release(id);
      this.$nextTick(() => window.BuyniverseOverlay?.activate(id, () => this.$refs[refName]));
    },
    handleLockKeydown(event) {
      if (event.key === "Escape") return event.preventDefault();
      window.BuyniverseOverlay?.trap(event, this.lockOverlayId);
    },
    handleConfirmKeydown(event) {
      if (event.key === "Escape") this.$emit("resolve-confirm", false);
      else window.BuyniverseOverlay?.trap(event, this.confirmOverlayId);
    },
  },
};
</script>
