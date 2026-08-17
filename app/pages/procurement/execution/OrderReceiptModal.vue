<template>
  <div
    v-if="open"
    class="fixed inset-0 z-60 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <button class="absolute inset-0" aria-label="Close" @click="$emit('close')"></button>
    <form class="glass relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl" @submit.prevent="$emit('submit')">
      <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-800 uppercase tracking-wider text-brand">Receipt</span>
            <h2 class="mt-1 text-xl font-800">Record receipt</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </header>
      <div class="p-5 space-y-4">
        <div class="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700">
          <table class="w-full min-w-140 text-left text-xs">
            <thead class="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th class="px-3 py-2.5">Line</th>
                <th class="px-3 py-2.5 text-right">Remaining</th>
                <th class="px-3 py-2.5 text-right">Receive now</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="line in lines" :key="line.id">
                <td class="px-3 py-2.5 font-bold">{{ line.description }}</td>
                <td class="px-3 py-2.5 text-right">{{ Math.max(0, line.ordered - line.received) }}</td>
                <td class="px-3 py-2.5 text-right">
                  <input
                    v-model.number="line.receiveNow"
                    type="number"
                    min="0"
                    :max="Math.max(0, line.ordered - line.received)"
                    class="field w-24 text-right py-1 text-xs font-bold"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <footer class="flex items-center justify-end gap-2 border-t border-slate-200/70 p-4 dark:border-slate-700">
        <button type="button" class="btn-muted" @click="$emit('close')">Cancel</button>
        <button type="submit" class="btn-brand">
          <i class="fa-solid fa-box mr-1.5"></i>Post receipt
        </button>
      </footer>
    </form>
  </div>
</template>
<script>
export default {
  props: {
    open: Boolean,
    lines: Array,
  },
  emits: ["close", "submit"],
};
</script>
