<template>
  <div class="space-y-5">
    <section class="panel overflow-hidden">
      <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
        <h2 class="text-lg font-800">Access by role</h2>
        <p class="mt-1 text-xs text-slate-500">Each role sees only the work and controls it needs.</p>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-230 text-left text-xs">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th class="px-4 py-3">Role</th>
              <th v-for="surface in roleSurfaces" :key="surface" class="px-4 py-3 text-center">{{ surface }}</th>
              <th class="px-4 py-3">Main task</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="role in roles" :key="role.name">
              <td class="px-4 py-4">
                <b>{{ role.name }}</b>
                <p class="mt-1 text-[10px] text-slate-400">{{ role.productRole }}</p>
              </td>
              <td v-for="surface in roleSurfaces" :key="surface" class="px-4 py-4 text-center">
                <i class="fa-solid" :class="role.surfaces.includes(surface) ? 'fa-circle-check text-emerald-500' : 'fa-minus text-slate-300'"></i>
              </td>
              <td class="px-4 py-4 text-[11px] leading-5 text-slate-500">{{ role.job }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article v-for="principle in rolePrinciples" :key="principle.title" class="premium-card rounded-xl border p-4">
        <span class="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand"><i class="fa-solid" :class="principle.icon"></i></span>
        <h3 class="mt-4 text-sm font-800">{{ principle.title }}</h3>
        <p class="mt-2 text-xs leading-5 text-slate-500">{{ principle.detail }}</p>
      </article>
    </section>
  </div>
</template>
<script>
export default {
  props: {
    roles: Array,
    roleSurfaces: Array,
    rolePrinciples: Array,
  },
};
</script>
