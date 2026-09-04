<template>
  <aside
    class="app-sidebar flex flex-shrink-0 flex-col transition-all duration-300 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl z-40"
    :class="[
      collapsed ? 'md:w-20' : 'md:w-64',
      mobileOpen
        ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl flex'
        : 'hidden md:flex'
    ]"
  >
    <!-- Brand Header -->
    <div class="flex h-16 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800/80 flex-none">
      <RouterLink to="/" class="flex items-center gap-3 overflow-hidden group" @click="$emit('close-mobile')">
        <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand text-base font-800 text-white shadow-md shadow-brand/30 group-hover:scale-105 transition-transform">
          B
        </span>
        <div v-show="!collapsed" class="min-w-0">
          <span class="font-head text-base font-800 tracking-tight text-slate-900 dark:text-white block">Buyniverse</span>
          <span class="text-[9px] font-bold uppercase tracking-wider text-brand -mt-1 block">{{ store.t("Enterprise") }}</span>
        </div>
      </RouterLink>
      <button
        v-if="mobileOpen"
        class="text-slate-400 hover:text-slate-600 md:hidden p-1"
        @click="$emit('close-mobile')"
      >
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      <template v-for="(section, sIdx) in menu" :key="section.title ? section.title + sIdx : 'sec-' + sIdx">
        <div class="space-y-1">
          <p v-if="section.title && !collapsed" class="px-3 pb-1 text-[10px] font-800 uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {{ store.t(section.title) }}
          </p>
          <div v-else-if="section.title && collapsed" class="h-px bg-slate-200/60 dark:bg-slate-800/60 my-2"></div>

          <RouterLink
            v-for="link in section.items"
            :key="link.to"
            :to="link.to"
            class="group flex items-center rounded-xl px-3 py-2 text-xs font-semibold transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-900/80 active:scale-98"
            active-class="bg-brand-50/80 text-brand font-bold shadow-xs dark:bg-brand/15 dark:text-brand-200 border-l-3 border-brand"
            @click="$emit('close-mobile')"
          >
            <i class="w-5 text-center text-xs text-slate-400 group-hover:text-brand transition-colors" :class="link.icon"></i>
            <span v-show="!collapsed" class="ml-3 whitespace-nowrap flex-1 truncate">{{ store.t(link.label) }}</span>
            <span
              v-if="link.badge && !collapsed"
              class="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-800 text-brand dark:bg-brand/20"
            >
              {{ link.badge }}
            </span>
          </RouterLink>
        </div>
      </template>
    </nav>

    <!-- Footer Collapse Toggle -->
    <div class="border-t border-slate-200/80 p-3 dark:border-slate-800/80 flex-none">
      <button
        class="flex w-full items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition"
        :aria-label="store.t(collapsed ? 'Expand navigation' : 'Collapse navigation')"
        @click="$emit('toggle-collapse')"
      >
        <i class="fa-solid text-xs" :class="collapsed ? 'fa-angles-right' : 'fa-angles-left'"></i>
        <span v-show="!collapsed" class="ml-2 text-xs font-semibold">{{ store.t("Colapsar menú") }}</span>
      </button>
    </div>
  </aside>
</template>
<script>
export default {
  props: {
    menu: Array,
    collapsed: Boolean,
    mobileOpen: Boolean,
  },
  emits: ["close-mobile", "toggle-collapse"],
  setup() {
    return { store: Vue.inject("store") };
  },
};
</script>
