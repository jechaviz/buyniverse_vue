<template>
  <div v-if="context?.company" class="relative hidden lg:block">
    <button
      type="button"
      class="group flex max-w-68 items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 text-left shadow-xs transition hover:border-brand hover:bg-white dark:border-slate-700/80 dark:bg-slate-800/70 dark:hover:bg-slate-800"
      :aria-expanded="open"
      :aria-label="store.t('Switch company or location')"
      @click="open = !open"
    >
      <span class="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand/12 text-brand dark:bg-brand/20"><i class="fa-solid fa-building text-[11px]"></i></span>
      <span class="min-w-0 flex-1 leading-tight">
        <span class="block truncate text-[10px] font-800 text-slate-700 dark:text-slate-200">{{ context.company.legalName }}</span>
        <span class="block truncate text-[9px] font-semibold text-slate-400">{{ context.location?.name || store.t('All locations') }}</span>
      </span>
      <i class="fa-solid fa-chevron-down text-[9px] text-slate-400 transition" :class="open ? 'rotate-180' : ''"></i>
    </button>

    <div v-if="open" class="absolute left-0 top-11 z-70 w-92 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2 shadow-elevated dark:border-slate-700 dark:bg-slate-900">
      <div class="flex items-center justify-between px-2.5 pb-2 pt-1">
        <span class="text-[10px] font-800 uppercase tracking-wider text-slate-400">{{ store.t('Company context') }}</span>
        <span v-if="switching" class="text-[10px] font-bold text-brand"><i class="fa-solid fa-arrows-rotate animate-spin mr-1"></i>{{ store.t('Switching') }}</span>
      </div>
      <div class="max-h-80 space-y-1 overflow-y-auto pr-0.5">
        <section v-for="company in context.companies || []" :key="company.id" class="overflow-hidden rounded-xl border border-transparent" :class="company.id === context.company.id ? 'bg-brand-50/70 dark:bg-brand/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'">
          <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left" :disabled="switching" @click="choose(company.id, null)">
            <span class="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 shadow-xs dark:bg-slate-800 dark:text-slate-300"><i class="fa-solid fa-landmark text-[10px]"></i></span>
            <span class="min-w-0 flex-1"><b class="block truncate text-[11px] text-slate-800 dark:text-slate-100">{{ company.legalName }}</b><span class="block text-[9px] text-slate-400">RFC {{ company.rfc }}</span></span>
            <i v-if="company.id === context.company.id && !context.location" class="fa-solid fa-check text-[10px] text-brand"></i>
          </button>
          <div v-if="company.locations?.length" class="mb-1 ml-5 border-l border-slate-200 pb-1 pl-2 dark:border-slate-700">
            <button v-for="location in company.locations" :key="location.id" type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-brand disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800" :disabled="switching" @click="choose(company.id, location.id)">
              <i class="fa-solid w-3 text-center text-[9px]" :class="location.kind === 'warehouse' ? 'fa-warehouse' : 'fa-code-branch'"></i>
              <span class="min-w-0 flex-1 truncate">{{ location.name }}</span>
              <i v-if="context.location?.id === location.id" class="fa-solid fa-check text-[9px] text-brand"></i>
            </button>
          </div>
        </section>
      </div>
      <p class="mx-2 mt-2 border-t border-slate-100 pt-2 text-[9px] leading-4 text-slate-400 dark:border-slate-800">{{ store.t('Data and permissions follow the selected legal entity and location.') }}</p>
    </div>
  </div>
</template>
<script>
const { inject, ref } = Vue;
export default {
  props: { context: Object, switching: Boolean },
  emits: ["switch"],
  setup(props, { emit }) {
    const open = ref(false);
    const choose = (companyId, locationId) => {
      if (props.switching) return;
      open.value = false;
      emit("switch", { companyId, locationId });
    };
    return { store: inject("store"), open, choose };
  },
};
</script>
