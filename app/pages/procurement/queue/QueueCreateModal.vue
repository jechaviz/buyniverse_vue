<template>
  <div v-if="open" class="fixed inset-0 z-60 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <button class="absolute inset-0" aria-label="Close" @click="$emit('close')"></button>
    <form class="glass relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl" @submit.prevent="$emit('save')">
      <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-800 uppercase tracking-wider text-brand">Purchase request</span>
            <h2 class="mt-1 text-xl font-800">New request</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </header>
      <div class="p-5 space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-xs font-bold">
            Title
            <input v-model.trim="draft.title" class="field mt-1" required placeholder="Server infrastructure refresh" />
          </label>
          <label class="block text-xs font-bold">
            Department
            <input v-model.trim="draft.department" class="field mt-1" required placeholder="Engineering" />
          </label>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="block text-xs font-bold">
            Category
            <select v-model="draft.category" class="field mt-1">
              <option>Technology</option>
              <option>Operations</option>
              <option>Packaging</option>
              <option>Services</option>
              <option>Logistics</option>
            </select>
          </label>
          <label class="block text-xs font-bold">
            Priority
            <select v-model="draft.priority" class="field mt-1">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label class="block text-xs font-bold">
            Needed by
            <input v-model="draft.dueDate" class="field mt-1" type="date" required />
          </label>
        </div>
        <div class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700 space-y-3">
          <h3 class="text-xs font-800 uppercase tracking-wide text-slate-500">First line item</h3>
          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_120px]">
            <label class="block text-xs font-bold">
              Item description
              <input v-model.trim="draft.itemDescription" class="field mt-1" required placeholder="Cloud enterprise compute nodes" />
            </label>
            <label class="block text-xs font-bold">
              Qty
              <input v-model.number="draft.quantity" class="field mt-1" type="number" min="1" required />
            </label>
            <label class="block text-xs font-bold">
              Unit price
              <input v-model.number="draft.unitPrice" class="field mt-1" type="number" min="1" required />
            </label>
          </div>
        </div>
        <label class="block text-xs font-bold">
          Business notes & justification
          <textarea v-model.trim="draft.notes" class="field mt-1 min-h-20" placeholder="Why is this purchase required?"></textarea>
        </label>
      </div>
      <footer class="flex items-center justify-end gap-2 border-t border-slate-200/70 p-4 dark:border-slate-700">
        <button type="button" class="btn-muted" @click="$emit('close')">Cancel</button>
        <button type="submit" class="btn-brand"><i class="fa-solid fa-plus mr-1.5"></i>Create request</button>
      </footer>
    </form>
  </div>
</template>
<script>
export default {
  props: {
    open: Boolean,
    draft: Object,
  },
  emits: ["close", "save"],
};
</script>
