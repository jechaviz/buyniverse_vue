<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="open"
        class="fixed inset-0 z-80"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${drawerId}-title`"
        @keydown.esc="$emit('close')"
      >
        <button
          type="button"
          class="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          aria-label="Close drawer"
          @click="$emit('close')"
        ></button>
        <aside
          class="glass absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200/70 shadow-2xl dark:border-slate-700"
        >
          <header
            class="flex flex-none items-start gap-3 border-b border-slate-200/70 p-5 dark:border-slate-700"
          >
            <span
              class="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/15"
            >
              <i class="fa-solid" :class="icon"></i>
            </span>
            <div class="min-w-0 flex-1">
              <h2 :id="`${drawerId}-title`" class="text-lg font-800">
                {{ title }}
              </h2>
              <p v-if="subtitle" class="mt-1 text-xs leading-5 text-slate-500">
                {{ subtitle }}
              </p>
            </div>
            <button
              type="button"
              class="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label="Close drawer"
              @click="$emit('close')"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto p-5">
            <slot></slot>
          </div>
          <footer
            v-if="$slots.footer"
            class="flex flex-none items-center justify-between gap-3 border-t border-slate-200/70 bg-slate-50/45 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/30"
          >
            <slot name="footer"></slot>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  props: {
    open: Boolean,
    title: { type: String, default: "Details" },
    subtitle: { type: String, default: "" },
    icon: { type: String, default: "fa-sliders" },
  },
  emits: ["close"],
  data() {
    return {
      drawerId: `drawer-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
};
</script>
