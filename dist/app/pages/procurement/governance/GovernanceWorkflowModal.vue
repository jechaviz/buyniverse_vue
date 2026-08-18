<template><div v-if="open" class="fixed inset-0 z-60 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><button class="absolute inset-0" aria-label="Close" @click="$emit('close')"></button><form class="glass relative w-full max-w-lg rounded-2xl p-6 shadow-2xl" @submit.prevent="$emit('save')"><div class="flex items-center justify-between"><h2 class="text-xl font-800">New workflow</h2><button type="button" class="btn-muted h-8 w-8 p-0" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button></div><div class="mt-4 space-y-4"><label class="block text-xs font-bold">
          Name
          <input v-model.trim="draft.name" class="field mt-1" required placeholder="Auto-dispatch purchase orders" /></label><label class="block text-xs font-bold">
          Trigger condition
          <input v-model.trim="draft.trigger" class="field mt-1" required placeholder="PO signed and amount < $10k" /></label><label class="block text-xs font-bold">
          Steps <span class="text-slate-400 font-normal">(comma-separated)</span><input v-model.trim="draft.stepsText" class="field mt-1" required placeholder="Validate terms, Notify supplier, Issue invoice" /></label></div><div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-muted" @click="$emit('close')">Cancel</button><button class="btn-brand">Create workflow</button></div></form></div></template>
<script>
export default {
props: {
open: Boolean,
draft: Object,
},
emits: ["close", "save"],
};
</script>