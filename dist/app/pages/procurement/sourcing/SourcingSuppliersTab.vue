<template>
  <div class="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div>
      <div class="relative">
        <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400"></i>
        <input
          :value="search"
          class="field pl-9"
          placeholder="Search the qualified supplier network"
          @input="$emit('update:search', $event.target.value)"
        />
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <button
          v-for="supplier in suppliers"
          :key="supplier.id"
          class="rounded-xl border p-4 text-left transition"
          :class="
            event.invitedSupplierIds.includes(supplier.id)
              ? 'border-brand bg-brand-50/60 dark:bg-brand/10'
              : 'border-slate-200/70 hover:border-brand/40 dark:border-slate-700'
          "
          @click="$emit('toggle-supplier', supplier.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex gap-3">
              <span class="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-800 dark:bg-slate-700">
                {{ initials(supplier.name) }}
              </span>
              <div>
                <b class="text-sm">{{ supplier.name }}</b>
                <p class="mt-1 text-[10px] text-slate-500">{{ supplier.category }} · {{ supplier.status }}</p>
              </div>
            </div>
            <span
              class="grid h-6 w-6 place-items-center rounded-full border"
              :class="
                event.invitedSupplierIds.includes(supplier.id)
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-300 text-transparent dark:border-slate-600'
              "
            >
              <i class="fa-solid fa-check text-[10px]"></i>
            </span>
          </div>
          <div class="mt-4 grid grid-cols-4 gap-2 text-center">
            <div>
              <b class="block text-sm">{{ supplier.score }}</b>
              <small class="text-[9px] text-slate-400">Score</small>
            </div>
            <div>
              <b class="block text-sm">{{ supplier.onTime }}%</b>
              <small class="text-[9px] text-slate-400">On-time</small>
            </div>
            <div>
              <b class="block text-sm">{{ supplier.risk }}</b>
              <small class="text-[9px] text-slate-400">Risk</small>
            </div>
            <div>
              <b class="block text-sm">{{ supplier.esg }}</b>
              <small class="text-[9px] text-slate-400">ESG</small>
            </div>
          </div>
        </button>
      </div>
    </div>
    <aside class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-800">Invited suppliers</h3>
        <span class="text-2xl font-800">{{ event.invitedSupplierIds.length }}</span>
      </div>
      <div class="mt-4 space-y-2">
        <div
          v-for="id in event.invitedSupplierIds"
          :key="id"
          class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800"
        >
          <span class="truncate font-semibold">{{ supplierName(id) }}</span>
          <button class="text-slate-400 hover:text-rose-500" @click="$emit('toggle-supplier', id)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p v-if="!event.invitedSupplierIds.length" class="py-8 text-center text-xs text-slate-400">
          Choose who should receive this request.
        </p>
      </div>
      <button
        class="btn-brand mt-4 w-full"
        :disabled="!event.invitedSupplierIds.length"
        @click="$emit('send-invites')"
      >
        <i class="fa-solid fa-paper-plane mr-1.5"></i>Send
      </button>
    </aside>
  </div>
</template>
<script>
export default {
  props: {
    event: Object,
    suppliers: Array,
    search: String,
    initials: Function,
    supplierName: Function,
  },
  emits: ["update:search", "toggle-supplier", "send-invites"],
};
</script>
