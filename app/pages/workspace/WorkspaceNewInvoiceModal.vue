<template>
  <div v-if="open" class="fixed inset-0 z-60 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <button class="absolute inset-0" aria-label="Close" @click="$emit('close')"></button>
    <form class="glass relative w-full max-w-lg rounded-2xl p-6 shadow-2xl" @submit.prevent="$emit('create')">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-800">New invoice</h2>
        <button type="button" class="btn-muted h-8 w-8 p-0" aria-label="Close" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="mt-4 space-y-4">
        <label class="block text-xs font-bold">
          Project title
          <input v-model="draft.projectTitle" class="field mt-1" required placeholder="Project or service description" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-bold">
            Total amount
            <input v-model.number="draft.total" class="field mt-1" type="number" min="1" required placeholder="0.00" />
          </label>
          <label class="block text-xs font-bold">
            Currency
            <select v-model="draft.currency" class="field mt-1">
              <option>USD</option>
              <option>MXN</option>
              <option>EUR</option>
            </select>
          </label>
        </div>
        <label class="block text-xs font-bold">
          Due date
          <input v-model="draft.dueDate" class="field mt-1" type="date" required />
        </label>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="btn-muted" @click="$emit('close')">Cancel</button>
        <button class="btn-brand">Create invoice</button>
      </div>
    </form>
  </div>
</template>
<script>
export default {
  props: {
    open: Boolean,
    draft: Object,
  },
  emits: ["close", "create"],
};
</script>
