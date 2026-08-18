<template><aside
    class="app-sidebar glass flex flex-shrink-0 flex-col transition-all duration-300 border-r border-slate-200/80 dark:border-slate-800/80"
    :class="[collapsed ? 'w-20' : 'w-64', mobileOpen ? 'is-open' : '']"
  ><div class="flex h-16 items-center border-b border-slate-200/80 px-4 dark:border-slate-800/80"><RouterLink to="/" class="flex items-center gap-3 overflow-hidden" @click="$emit('close-mobile')"><span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand text-base font-800 text-white shadow-soft">B</span><span v-show="!collapsed" class="font-head text-xl font-800 tracking-tight text-slate-900 dark:text-white">Buyniverse</span></RouterLink></div><nav class="flex-1 overflow-y-auto px-3 py-4"><template v-for="section in menu" :key="section.title || section.items[0].to"><p v-if="section.title && !collapsed" class="px-3 pb-1.5 pt-4 text-[11px] font-700 uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {{ section.title }}
        </p><RouterLink
          v-for="link in section.items"
          :key="link.to"
          :to="link.to"
          class="mb-1 flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300"
          active-class="bg-brand-50 text-brand font-semibold shadow-xs dark:bg-brand/15 dark:text-brand-200"
          @click="$emit('close-mobile')"
        ><i class="w-5 text-center text-slate-400 dark:text-slate-400" :class="link.icon"></i><span v-show="!collapsed" class="ml-3 whitespace-nowrap">{{ link.label }}</span></RouterLink></template>
<script>
export default {
props: {
menu: Array,
collapsed: Boolean,
mobileOpen: Boolean,
},
emits: ["close-mobile", "toggle-collapse"],
};
</script>