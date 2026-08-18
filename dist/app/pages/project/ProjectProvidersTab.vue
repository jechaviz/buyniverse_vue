<template><section class="space-y-4"><div v-if="isOwner" class="panel flex flex-wrap items-center justify-between gap-3 p-4"><div><b>Provider sourcing</b><p class="mt-1 text-sm text-slate-500">
          {{ contest ? `Contest ${contest.status.toLowerCase()}` : proposals.length > 1 ? "You can compare proposals and start a sourcing round." : "Invite or shortlist providers to begin." }}
        </p></div><RouterLink v-if="contest" :to="`/project/${job.id}/contest`" class="btn-muted">View contest</RouterLink></div><div class="border-b border-slate-200 dark:border-slate-700"><button class="border-b-2 px-4 py-3 text-sm font-bold" :class="providerTab === 'providers' ? 'border-brand text-brand' : 'border-transparent text-slate-500'" @click="$emit('update:providerTab', 'providers')">
        Providers
      </button><button class="border-b-2 px-4 py-3 text-sm font-bold" :class="providerTab === 'proposals' ? 'border-brand text-brand' : 'border-transparent text-slate-500'" @click="$emit('update:providerTab', 'proposals')">
        Proposals <span class="ml-1 text-xs opacity-70">{{ proposals.length }}</span></button></div><div v-if="providerTab === 'providers'" class="panel overflow-hidden"><div class="border-b border-slate-100 p-4 dark:border-slate-700"><input :value="providerSearch" class="field max-w-md" placeholder="Search available providers" @input="$emit('update:providerSearch', $event.target.value)" /></div><div class="divide-y divide-slate-100 dark:divide-slate-700"><article v-for="provider in providerRows" :key="provider.id" class="flex flex-wrap items-center justify-between gap-4 p-5"><div class="flex min-w-0 items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand dark:bg-brand/20">{{ provider.avatar }}</span><div><RouterLink :to="`/profile/${provider.id}`" class="font-bold hover:text-brand">{{ provider.name }}</RouterLink><p class="mt-1 text-sm text-slate-500">{{ provider.headline }}</p><div class="mt-2 flex flex-wrap gap-1"><span v-for="skill in provider.skills?.slice(0, 3)" :key="skill" class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ skill }}</span></div></div></div><div class="flex items-center gap-3"><span class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ providerState(provider) }}</span><button v-if="isOwner" class="btn-muted" @click="$emit('set-state', { provider, state: 'invited' })">Invite</button><button v-if="isOwner" class="btn-muted" @click="$emit('set-state', { provider, state: 'shortlisted' })">Shortlist</button></div></article><p v-if="!providerRows.length" class="p-10 text-center text-sm text-slate-500">No providers match this search.</p></div></div><div v-else class="panel overflow-hidden"><div v-if="proposals.length" class="divide-y divide-slate-100 dark:divide-slate-700"><article v-for="prop in proposals" :key="prop.id" class="flex flex-wrap items-center justify-between gap-4 p-5"><div><RouterLink :to="`/profile/${prop.freelancerId}`" class="font-bold hover:text-brand">{{ userName(prop.freelancerId) || "Provider" }}</RouterLink><p class="mt-1 text-sm text-slate-500">{{ prop.qualification || "Pending qualification" }}</p></div><div class="text-right"><b>{{ formatMoney(prop.bid, job.currency) }}</b><p class="mt-1 text-xs font-bold uppercase text-slate-400">{{ prop.status }}</p></div></article></div><p v-else class="p-10 text-center text-sm text-slate-500">No proposals yet.</p><form v-if="isFreelancer && job.status === 'OPEN'" class="flex gap-3 border-t border-slate-100 p-5 dark:border-slate-700" @submit.prevent="$emit('propose')"><input :value="bid" class="field max-w-xs" type="number" min="1" placeholder="Your bid" @input="$emit('update:bid', Number($event.target.value))" /><button class="btn-brand">Submit proposal</button></form></div></section></template>
<script>
export default {
props: {
job: Object,
contest: Object,
isOwner: Boolean,
isFreelancer: Boolean,
providerTab: String,
providerSearch: String,
providerRows: Array,
proposals: Array,
bid: Number,
providerState: Function,
userName: Function,
formatMoney: Function,
},
emits: ["update:providerTab", "update:providerSearch", "update:bid", "set-state", "propose"],
};
</script>