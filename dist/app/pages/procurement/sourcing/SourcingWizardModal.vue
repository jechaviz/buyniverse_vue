<template><div
    v-if="open"
    class="fixed inset-0 z-60 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  ><button class="absolute inset-0" aria-label="Close" @click="$emit('close')"></button><form
      ref="formRef"
      class="glass relative my-8 w-full max-w-4xl overflow-hidden rounded-2xl"
      @submit.prevent="$emit('submit')"
    ><header class="border-b border-slate-200/70 p-5 dark:border-slate-700"><div class="flex items-center justify-between"><div><span class="text-[10px] font-800 uppercase tracking-wider text-brand">Quote round</span><h2 class="mt-1 text-xl font-800">New quote round</h2></div><button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="$emit('close')"
          ><i class="fa-solid fa-xmark"></i></button></div><div class="mt-5 grid grid-cols-3 gap-2"><div
            v-for="(step, index) in steps"
            :key="step"
            class="rounded-lg border px-3 py-2 text-xs font-bold"
            :class="
              currentStep === index
                ? 'border-brand bg-brand-50 text-brand dark:bg-brand/10'
                : currentStep > index
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10'
                  : 'border-slate-200 text-slate-400 dark:border-slate-700'
            "
          ><span class="mr-2">{{ index + 1 }}</span>{{ step }}
          </div></div></header><div class="min-h-80 p-5"><div v-if="currentStep === 0" class="grid gap-4 md:grid-cols-2"><label class="md:col-span-2"><span class="mb-1.5 block text-xs font-bold">Title</span><input v-model.trim="modelValue.title" class="field" required /></label><label><span class="mb-1.5 block text-xs font-bold">Type</span><select v-model="modelValue.type" class="field" required><option value="RFI">Information request</option><option value="RFQ">Quote request</option><option value="RFP">Proposal request</option><option value="Auction">Live bid</option><option value="Negotiation">Negotiation</option></select></label><label><span class="mb-1.5 block text-xs font-bold">From request</span><select v-model="modelValue.requestId" class="field"><option value="">No linked request</option><option v-for="req in requests" :key="req.id" :value="req.id">
                {{ req.id }} · {{ req.title }}
              </option></select></label><label><span class="mb-1.5 block text-xs font-bold">Budget</span><input v-model.number="modelValue.budget" class="field" type="number" min="1" required /></label><label><span class="mb-1.5 block text-xs font-bold">Deadline</span><input v-model="modelValue.deadline" class="field" type="date" required /></label><label class="md:col-span-2"><span class="mb-1.5 block text-xs font-bold">First item or group</span><textarea v-model.trim="modelValue.description" class="field min-h-24" required placeholder="Describe scope, quantities and expected outcome."></textarea></label></div><div v-else-if="currentStep === 1"><p class="required-note mb-3">Select at least two suppliers</p><div class="grid gap-3 md:grid-cols-2"><button
              v-for="supplier in suppliers"
              :key="supplier.id"
              type="button"
              class="flex items-center justify-between rounded-xl border p-4 text-left"
              :class="modelValue.suppliers.includes(supplier.id) ? 'border-brand bg-brand-50 dark:bg-brand/10' : 'border-slate-200/70 dark:border-slate-700'"
              @click="$emit('toggle-supplier', supplier.id)"
            ><span><b class="block text-sm">{{ supplier.name }}</b><small class="mt-1 block text-[10px] text-slate-500">{{ supplier.category }} · score {{ supplier.score }}</small></span><i class="fa-solid" :class="modelValue.suppliers.includes(supplier.id) ? 'fa-circle-check text-brand' : 'fa-circle text-slate-300'"></i></button></div></div><div v-else class="grid gap-5 md:grid-cols-2"><div class="space-y-3"><h3 class="text-sm font-800">Send settings</h3><label class="block"><span class="mb-1.5 block text-xs font-bold">Visibility</span><select v-model="modelValue.visibility" class="field" required><option>Private</option><option>Restricted</option><option>Public</option></select></label><label class="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700"><input v-model="modelValue.autoExtend" type="checkbox" class="accent-[var(--accent)]" /><span><b class="block text-xs">Auto-extend</b><small class="text-[10px] text-slate-500">Protect last-minute activity.</small></span></label></div><div class="rounded-xl bg-slate-950 p-4 text-white"><span class="text-[10px] font-800 uppercase tracking-wide text-brand-100">Review</span><h3 class="mt-2 text-lg font-800">{{ modelValue.title || "Untitled quote round" }}</h3><dl class="mt-4 space-y-3 text-xs"><div class="flex justify-between"><dt class="text-slate-400">Type</dt><dd>{{ typeLabel(modelValue.type) }}</dd></div><div class="flex justify-between"><dt class="text-slate-400">Suppliers</dt><dd>{{ modelValue.suppliers.length }}</dd></div><div class="flex justify-between"><dt class="text-slate-400">Budget</dt><dd>{{ formatMoney(modelValue.budget) }}</dd></div><div class="flex justify-between"><dt class="text-slate-400">Starts as</dt><dd>Draft</dd></div></dl></div></div></div><footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 p-4 dark:border-slate-700"><button
          type="button"
          class="btn-muted"
          :disabled="currentStep === 0"
          @click="$emit('prev')"
        ><i class="fa-solid fa-arrow-left"></i>Back
        </button><p v-if="error" class="text-xs font-semibold text-rose-500" role="alert"><i class="fa-solid fa-circle-exclamation mr-1"></i>{{ error }}
        </p><button v-if="currentStep < 2" type="button" class="btn-brand" @click="$emit('next')">
          Continue<i class="fa-solid fa-arrow-right ml-1"></i></button><button v-else type="submit" class="btn-brand"><i class="fa-solid fa-check mr-1"></i>Create draft
        </button></footer></form></div></template>
<script>
export default {
props: {
open: Boolean,
currentStep: Number,
steps: Array,
modelValue: Object,
suppliers: Array,
requests: Array,
error: String,
typeLabel: Function,
formatMoney: Function,
},
emits: ["close", "prev", "next", "submit", "toggle-supplier"],
};
</script>