<template><div><section v-if="mode === 'profile' && person" class="space-y-6"><article class="panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90"><div class="flex flex-wrap items-start justify-between gap-5"><div class="flex flex-wrap sm:flex-nowrap gap-5"><span
              class="grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-3xl bg-brand-50 text-3xl font-800 text-brand shadow-soft dark:bg-brand/20 flex-none"
            >{{ person.avatar }}</span><div><div class="flex flex-wrap items-center gap-2"><span class="rounded-lg bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-brand/20">{{ person.type }}</span><span class="badge bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold dark:bg-violet-500/10"><i class="fa-solid fa-shield-halved mr-1"></i>Contra 0% Fee
                </span><span class="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold dark:bg-emerald-500/10"><i class="fa-solid fa-circle-check mr-1"></i>Top 5% Verified
                </span></div><h1 class="font-head mt-2 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ person.name }}</h1><p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {{ person.headline || person.companyName }}
              </p><p class="mt-2 text-xs text-slate-400 flex flex-wrap items-center gap-2"><span><i class="fa-solid fa-location-dot text-brand mr-1"></i>{{ person.location || "Remote" }}</span><span>·</span><span class="text-sky-600 font-semibold"><i class="fa-solid fa-bolt mr-1"></i>Jobbers Express Pitch: Fast Delivery</span></p></div></div><button v-if="own" class="btn-muted text-xs py-2 px-3.5" @click="editing = !editing"><i class="fa-solid fa-pen mr-1.5 text-xs"></i>{{ store.t("Edit profile") }}
          </button></div><form
          v-if="editing"
          class="mt-6 grid gap-4 border-t border-slate-100 pt-6 dark:border-slate-800 sm:grid-cols-2"
          @submit.prevent="saveProfile"
        ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Headline<input v-model="person.headline" class="field mt-1.5 text-xs" /></label><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Location<input v-model="person.location" class="field mt-1.5 text-xs" /></label><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:col-span-2">
            Bio<textarea v-model="person.bio" class="field mt-1.5 min-h-28 text-xs leading-relaxed"></textarea></label><button class="btn-brand text-xs py-2 px-4 sm:col-span-2">{{ store.t("Save profile") }}</button></form></article><div class="grid gap-6 lg:grid-cols-3"><div class="space-y-6 lg:col-span-2"><article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80"><h2 class="font-head font-800 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("About") }}</h2><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {{ person.bio || "Experienced professional focused on clear communication, scalable architecture and reliable delivery." }}
            </p><h2 class="font-head mt-6 font-800 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("Skills") }}</h2><div class="mt-3 flex flex-wrap gap-2"><span
                v-for="x in person.skills || []"
                :key="x"
                class="badge rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >{{ x }}</span></div></article><article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80 space-y-4"><div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3"><div class="flex items-center gap-2"><span class="grid h-6 w-6 place-items-center rounded bg-violet-100 text-violet-700 text-xs dark:bg-violet-500/20"><i class="fa-solid fa-shapes"></i></span><h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">{{ store.t("Featured Case Studies (Contra style)") }}</h2></div><span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Deliveries</span></div><div class="grid gap-4 sm:grid-cols-2"><div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"><div class="flex items-center justify-between"><b class="text-xs font-bold text-slate-900 dark:text-white">B2B SaaS Procurement Portal</b><span class="badge bg-emerald-50 text-emerald-700 text-[9px] font-bold">Completed</span></div><p class="text-[11px] text-slate-500 leading-relaxed">
                  Engineered zero-build Vue 3 platform with live reverse auction, 3-way matching and CFDI 4.0 fiscal engine.
                </p><div class="flex flex-wrap gap-1 pt-1"><span class="badge bg-white dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300">Vue 3</span><span class="badge bg-white dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300">UnoCSS</span><span class="badge bg-white dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300">Escrow</span></div></div><div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"><div class="flex items-center justify-between"><b class="text-xs font-bold text-slate-900 dark:text-white">Enterprise Design System</b><span class="badge bg-purple-50 text-purple-700 text-[9px] font-bold">Featured</span></div><p class="text-[11px] text-slate-500 leading-relaxed">
                  Crafted accessible WCAG 2.2 multi-brand design tokens, UI components and interactive prototypes.
                </p><div class="flex flex-wrap gap-1 pt-1"><span class="badge bg-white dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300">Figma</span><span class="badge bg-white dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300">Tokens</span><span class="badge bg-white dark:bg-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300">WCAG</span></div></div></div></article><article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80"><h2 class="font-head font-800 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("Reviews") }}</h2><div class="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"><div class="flex items-center gap-2"><span class="text-amber-500 text-xs"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></span><b class="text-xs font-bold text-slate-900 dark:text-white">{{ store.t("5.0 · Excellent collaboration") }}</b></div><p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {{ store.t("Clear milestones, thoughtful feedback and delivery on schedule.") }}
              </p></div></article></div><aside class="space-y-4"><article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80"><h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">{{ store.t("Profile summary") }}</h2><dl class="mt-4 space-y-3.5 text-xs border-t border-slate-100 pt-4 dark:border-slate-800"><div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Verified") }}</dt><dd class="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-circle-check text-xs"></i>Yes</dd></div><div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Availability") }}</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ person.availability || "Available" }}</dd></div><div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Total earned") }}</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ store.money(person.totalEarned || 0) }}</dd></div></dl></article></aside></div></section><section v-else-if="mode === 'agency' && agency" class="space-y-6"><article class="panel p-6 rounded-3xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90"><p class="premium-kicker text-xs font-bold uppercase text-brand">{{ store.t("Agency") }}</p><div class="mt-2 flex flex-wrap justify-between gap-4"><div><h1 class="font-head text-3xl font-800">{{ agency.name }}</h1><p class="mt-2 text-sm text-slate-500">{{ agency.tagline }}</p></div><button v-if="owner" class="btn-muted text-xs py-2 px-3.5" @click="agency.bio = agency.bio + ' '; store.notice('Agency profile ready to edit');"><i class="fa-solid fa-pen mr-2"></i>{{ store.t("Edit agency") }}
          </button></div><p class="mt-5 max-w-3xl leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">{{ agency.bio }}</p></article></section><section v-else class="panel p-10 text-center rounded-2xl border border-slate-200/80 bg-white/90 shadow-card"><h1 class="font-head text-xl font-800">Profile not found</h1></section></div></template>
<script>
const { inject, computed, ref } = Vue;
const { useRoute } = VueRouter;
export default {
props: { mode: { type: String, default: "profile" } },
setup(props) {
const store = inject("store"), route = useRoute();
const editing = ref(false);
const person = computed(() => {
const id = route.params.userId || store.currentUser.value.id;
return store.user(id);
});
const agency = computed(() => {
const id = route.params.agencyId || person.value?.agencyId;
return store.state.agencies.find((x) => x.id === id);
});
const own = computed(() => person.value?.id === store.currentUser.value.id);
const owner = computed(() => agency.value?.ownerId === store.currentUser.value.id);
const saveProfile = () => {
editing.value = false;
store.notice("Profile updated successfully");
};
return { store, person, agency, own, owner, editing, saveProfile };
},
};
</script>