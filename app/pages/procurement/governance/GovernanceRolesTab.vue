<template>
  <div class="space-y-5">
    <section class="panel overflow-hidden">
      <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
        <h2 class="text-lg font-800">{{ t('Access by role') }}</h2>
        <p class="mt-1 text-xs text-slate-500">{{ t('Each role sees only the work and controls it needs.') }}</p>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-230 text-left text-xs">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th class="px-4 py-3">{{ t('Role') }}</th>
              <th v-for="surface in roleSurfaces" :key="surface" class="px-4 py-3 text-center">{{ t(surface) }}</th>
              <th class="px-4 py-3">{{ t('Main task') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="role in roles" :key="role.name">
              <td class="px-4 py-4">
                <b>{{ t(role.name) }}</b>
                <p class="mt-1 text-[10px] text-slate-400">{{ t(role.productRole) }}</p>
              </td>
              <td v-for="surface in roleSurfaces" :key="surface" class="px-4 py-4 text-center">
                <i class="fa-solid" :class="role.surfaces.includes(surface) ? 'fa-circle-check text-emerald-500' : 'fa-minus text-slate-300'"></i>
              </td>
              <td class="px-4 py-4 text-[11px] leading-5 text-slate-500">{{ t(role.job) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article v-for="principle in rolePrinciples" :key="principle.title" class="premium-card rounded-xl border p-4">
        <span class="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand"><i class="fa-solid" :class="principle.icon"></i></span>
        <h3 class="mt-4 text-sm font-800">{{ t(principle.title) }}</h3>
        <p class="mt-2 text-xs leading-5 text-slate-500">{{ t(principle.detail) }}</p>
      </article>
    </section>
  </div>
</template>
<script>
export default {
  inject: ["store"],
  props: {
    roles: Array,
    roleSurfaces: Array,
    rolePrinciples: Array,
  },
  methods: { t(key) { void this.store?.locale?.value; return this.store?.t?.(key) || key; } },
};
</script>
