<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
    <article class="panel overflow-hidden">
      <header class="flex items-center justify-between border-b border-slate-200/70 p-5 dark:border-slate-700">
        <div>
          <h2 class="text-lg font-800">{{ t('Automations') }}</h2>
          <p class="mt-1 text-xs text-slate-500">{{ t('Simple triggers and clear steps.') }}</p>
        </div>
        <button class="btn-brand" @click="$emit('open-workflow')">
          <i class="fa-solid fa-plus"></i>{{ t('New workflow') }}
        </button>
      </header>
      <div class="divide-y divide-slate-100 dark:divide-slate-700">
        <article v-for="workflow in workflows" :key="workflow.id" class="p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand"><i class="fa-solid fa-bolt"></i></span>
                <b class="text-sm">{{ workflow.name }}</b>
                <span class="badge" :class="workflow.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'">
                  {{ t(workflow.status) }}
                </span>
              </div>
              <p class="ml-10 mt-1 text-[10px] text-slate-500">{{ t('When') }} {{ workflow.trigger }}</p>
            </div>
            <div class="flex gap-4 text-center">
              <div><b class="block text-sm">{{ workflow.runs }}</b><small class="text-[9px] text-slate-400">{{ t('Runs') }}</small></div>
              <div><b class="block text-sm">{{ workflow.successRate }}%</b><small class="text-[9px] text-slate-400">{{ t('Success') }}</small></div>
              <button class="text-slate-400 hover:text-brand" @click="$emit('toggle-workflow', workflow)">
                <i class="fa-solid" :class="workflow.status === 'Active' ? 'fa-toggle-on text-emerald-500' : 'fa-toggle-off'"></i>
              </button>
            </div>
          </div>
          <div class="mt-4 flex gap-2 overflow-x-auto">
            <div v-for="(step, index) in workflow.steps" :key="step" class="flex min-w-max items-center gap-2">
              <span class="rounded-lg border border-slate-200/70 px-3 py-2 text-[10px] font-bold dark:border-slate-700">
                <span class="mr-1 text-brand">{{ index + 1 }}</span>{{ step }}
              </span>
              <i v-if="index < workflow.steps.length - 1" class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
            </div>
          </div>
        </article>
      </div>
    </article>
    <aside class="space-y-5">
      <article class="panel p-5">
        <span class="text-[10px] font-800 uppercase tracking-wide text-brand">{{ t('Automation health') }}</span>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"><b class="block text-2xl">36</b><small class="text-[9px] text-slate-400">{{ t('Total runs') }}</small></div>
          <div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"><b class="block text-2xl text-emerald-500">94%</b><small class="text-[9px] text-slate-400">{{ t('Success') }}</small></div>
        </div>
        <p class="mt-4 text-xs leading-5 text-slate-500">{{ t('Automation routes routine work; people approve important decisions.') }}</p>
      </article>
      <article class="rounded-xl bg-slate-950 p-5 text-white">
        <span class="text-[10px] font-800 uppercase tracking-wide text-brand-100">{{ t('Safety') }}</span>
        <h3 class="mt-2 text-lg font-800">{{ t('Always actionable') }}</h3>
        <p class="mt-2 text-xs leading-5 text-slate-400">{{ t('Every state has an owner and a next action. Important decisions always require a person.') }}</p>
      </article>
    </aside>
  </div>
</template>
<script>
export default {
  inject: ["store"],
  props: {
    workflows: Array,
  },
  emits: ["open-workflow", "toggle-workflow"],
  methods: { t(key) { void this.store?.locale?.value; return this.store?.t?.(key) || key; } },
};
</script>
