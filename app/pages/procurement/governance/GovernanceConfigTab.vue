<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section class="grid gap-4 md:grid-cols-2">
      <article v-for="group in configGroups" :key="group.title" class="panel p-5">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand"><i class="fa-solid" :class="group.icon"></i></span>
          <div>
            <h2 class="text-sm font-800">{{ group.title }}</h2>
            <p class="mt-1 text-[10px] text-slate-500">{{ group.description }}</p>
          </div>
        </div>
        <div class="mt-4 space-y-3">
          <label
            v-for="field in group.fields"
            :key="field.key"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-700"
          >
            <span>
              <b class="block text-xs">{{ field.label }}</b>
              <small class="mt-1 block text-[9px] text-slate-400">{{ field.note }}</small>
            </span>
            <input
              v-if="field.type === 'toggle'"
              v-model="configuration[field.key]"
              type="checkbox"
              class="h-4 w-4 accent-[var(--accent)]"
              @change="$emit('config-changed', field)"
            />
            <select
              v-else
              v-model="configuration[field.key]"
              class="field w-32 py-1.5 text-xs"
              @change="$emit('config-changed', field)"
            >
              <option v-for="option in field.options" :key="option">{{ option }}</option>
            </select>
          </label>
        </div>
      </article>
    </section>
    <aside class="space-y-5">
      <article class="panel p-5">
        <span class="text-[10px] font-800 uppercase tracking-wide text-brand">Shared data</span>
        <h2 class="mt-2 text-lg font-800">One connected flow</h2>
        <ul class="mt-4 space-y-3 text-xs text-slate-500">
          <li v-for="item in nativeChecks" :key="item" class="flex gap-2">
            <i class="fa-solid fa-circle-check mt-0.5 text-emerald-500"></i>
            <span>{{ item }}</span>
          </li>
        </ul>
      </article>
      <article class="panel p-5">
        <h2 class="text-sm font-800">Demo data</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">All state is local, versioned and resettable. No credentials or operational secrets are stored.</p>
        <button class="btn-muted mt-4 w-full" @click="$emit('reset-data')">
          <i class="fa-solid fa-rotate-left"></i>Reset demo data
        </button>
      </article>
    </aside>
  </div>
</template>
<script>
export default {
  props: {
    configGroups: Array,
    configuration: Object,
    nativeChecks: Array,
  },
  emits: ["config-changed", "reset-data"],
};
</script>
