<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="premium-kicker text-xs font-bold uppercase text-brand">{{ t('Marketplace discovery') }}</p>
        <h1 class="premium-title mt-1 text-3xl font-800">{{ talentMode ? t('Find talent') : t('Browse services') }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ talentMode ? t('Compare verified specialists on delivery signals, not just keywords.') : t('Find scoped services with clear deliverables, delivery and provider signals.') }}</p>
      </div>
      <div class="flex rounded-xl border border-slate-200/80 bg-white/70 p-1 text-sm font-bold shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <RouterLink to="/find-talent" class="rounded-lg px-3 py-2 transition" :class="talentMode ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-brand'">
          <i class="fa-solid fa-user-group mr-1.5"></i>{{ t('Talent') }}
        </RouterLink>
        <RouterLink to="/browse-services" class="rounded-lg px-3 py-2 transition" :class="!talentMode ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-brand'">
          <i class="fa-solid fa-store mr-1.5"></i>{{ t('Services') }}
        </RouterLink>
      </div>
    </header>

    <section class="premium-card grid gap-3 rounded-2xl p-3 lg:grid-cols-[minmax(0,2fr)_minmax(150px,.8fr)_minmax(150px,.8fr)_auto]" aria-label="Discovery filters">
      <label class="relative block">
        <span class="sr-only">{{ t('Search') }}</span>
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input v-model.trim="query" class="field h-10 pl-9" :placeholder="talentMode ? t('Search people, expertise or company') : t('Search services, deliverables or provider')" maxlength="120" autocomplete="off" />
      </label>
      <select v-model="category" class="field h-10" :aria-label="t('Category')">
        <option value="">{{ t('All categories') }}</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="sort" class="field h-10" :aria-label="t('Sort')">
        <option value="recommended">{{ t('Recommended') }}</option>
        <option value="rating">{{ t('Highest rating') }}</option>
        <option value="delivery">{{ t('Fastest delivery') }}</option>
        <option value="price">{{ t('Lowest price') }}</option>
      </select>
      <label class="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <input v-model="verifiedOnly" type="checkbox" />
        <i class="fa-solid fa-shield-halved text-emerald-500"></i>{{ t('Verified only') }}
      </label>
      <div class="flex flex-wrap items-center gap-2 lg:col-span-4">
        <button v-for="chip in quickFilters" :key="chip.key" type="button" class="rounded-full border px-3 py-1.5 text-xs font-bold transition" :class="quickFilter === chip.key ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-500 hover:border-brand hover:text-brand dark:border-slate-700'" @click="quickFilter = quickFilter === chip.key ? '' : chip.key">
          <i class="fa-solid mr-1" :class="chip.icon"></i>{{ t(chip.label) }}
        </button>
        <span class="ml-auto text-xs font-semibold text-slate-400">{{ results.length }} {{ t('matches') }}</span>
      </div>
    </section>

    <section v-if="compareItems.length" class="rounded-2xl border border-brand/25 bg-brand-50/55 p-3 shadow-sm dark:bg-brand/10">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><p class="text-sm font-800 text-brand">{{ t('Comparison tray') }}</p><p class="text-xs text-slate-500">{{ t('Review up to three options side by side before you act.') }}</p></div>
        <button class="btn-muted h-8 px-2.5 text-xs" @click="compareIds = []"><i class="fa-solid fa-xmark mr-1"></i>{{ t('Clear') }}</button>
      </div>
      <div class="mt-3 grid gap-2" :class="compareItems.length === 1 ? 'md:grid-cols-1' : compareItems.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'">
        <article v-for="item in compareItems" :key="item.id" class="rounded-xl border border-white/70 bg-white/85 p-3 dark:border-slate-700 dark:bg-slate-900/90">
          <div class="flex items-start justify-between gap-2"><div><p class="font-bold">{{ item.name }}</p><p class="text-xs text-slate-500">{{ item.subline }}</p></div><button class="text-slate-400 hover:text-rose-500" :aria-label="t('Remove')" @click="toggleCompare(item.id)"><i class="fa-solid fa-xmark"></i></button></div>
          <div class="mt-3 grid grid-cols-3 gap-1 text-center text-xs"><div><b class="block text-slate-900 dark:text-white">{{ item.rating }}</b><span class="text-slate-400">{{ t('Rating') }}</span></div><div><b class="block text-slate-900 dark:text-white">{{ item.delivery }}</b><span class="text-slate-400">{{ t('Delivery') }}</span></div><div><b class="block text-slate-900 dark:text-white">{{ item.price }}</b><span class="text-slate-400">{{ t('From') }}</span></div></div>
        </article>
      </div>
    </section>

    <div v-if="talentMode" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="person in results" :key="person.id" class="premium-card group rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div class="flex gap-3">
          <span class="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-50 font-800 text-brand dark:bg-brand/15">{{ person.avatar }}</span>
          <div class="min-w-0 flex-1"><RouterLink :to="`/profile/${person.id}`" class="block truncate font-800 hover:text-brand">{{ person.name }}</RouterLink><p class="truncate text-xs text-slate-500">{{ person.headline }}</p><p class="mt-1 text-[11px] font-bold" :class="person.availability === 'Available' ? 'text-emerald-600' : 'text-amber-600'"><i class="fa-solid fa-circle mr-1 text-[8px]"></i>{{ t(person.availability) }}</p></div>
          <button type="button" class="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 opacity-100 transition hover:border-brand hover:text-brand md:opacity-0 md:group-hover:opacity-100 dark:border-slate-700" :class="isShortlisted(person.id) ? 'border-brand bg-brand-50 text-brand opacity-100' : ''" :title="t('Shortlist')" :aria-label="t('Shortlist')" @click="toggleShortlist(person.id)"><i class="fa-solid fa-bookmark"></i></button>
        </div>
        <div class="mt-3 flex flex-wrap gap-1"><span v-for="skill in person.skills.slice(0, 4)" :key="skill" class="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ skill }}</span><span v-if="person.skills.length > 4" class="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">+{{ person.skills.length - 4 }}</span></div>
        <div class="mt-3 grid grid-cols-4 border-y border-slate-100 py-2.5 text-center text-xs dark:border-slate-800"><div><b class="block">{{ person.rating }}</b><span class="text-[10px] text-slate-400">{{ t('Rating') }}</span></div><div><b class="block">{{ person.score }}</b><span class="text-[10px] text-slate-400">{{ t('Match') }}</span></div><div><b class="block">{{ person.onTime }}%</b><span class="text-[10px] text-slate-400">{{ t('On time') }}</span></div><div><b class="block">{{ person.responseRate }}%</b><span class="text-[10px] text-slate-400">{{ t('Response') }}</span></div></div>
        <div class="mt-3 flex items-center justify-between gap-2"><div><span class="text-sm font-800">{{ store.money(person.rate) }}</span><span class="ml-1 text-[11px] text-slate-400">/{{ t('hour') }}</span></div><div class="flex gap-1.5"><button class="btn-muted h-8 px-2.5 text-xs" :class="isComparing(person.id) ? 'border-brand text-brand' : ''" @click="toggleCompare(person.id)"><i class="fa-solid fa-scale-balanced"></i><span class="sr-only">{{ t('Compare') }}</span></button><button v-if="canInvite" class="btn-brand h-8 px-2.5 text-xs" @click="invite(person)"><i class="fa-solid fa-user-plus mr-1"></i>{{ t('Invite') }}</button></div></div>
      </article>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="gig in results" :key="gig.id" class="premium-card group flex min-h-62 flex-col rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div class="flex items-start justify-between gap-3"><span class="rounded-md bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand dark:bg-brand/15">{{ gig.category }}</span><button class="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 opacity-100 hover:border-brand hover:text-brand md:opacity-0 md:group-hover:opacity-100 dark:border-slate-700" :class="isShortlisted(gig.id) ? 'border-brand bg-brand-50 text-brand opacity-100' : ''" @click="toggleShortlist(gig.id)"><i class="fa-solid fa-bookmark"></i></button></div>
        <RouterLink :to="`/gig/${gig.id}`" class="mt-3 text-lg font-800 leading-6 hover:text-brand">{{ gig.title }}</RouterLink><p class="mt-2 flex-1 text-sm leading-5 text-slate-500">{{ gig.description }}</p>
        <div class="mt-3 flex flex-wrap gap-1"><span v-for="item in gig.scope.slice(0, 3)" :key="item" class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ item }}</span></div>
        <div class="mt-3 flex items-center justify-between border-y border-slate-100 py-2 text-xs dark:border-slate-800"><span><i class="fa-regular fa-clock mr-1 text-brand"></i>{{ gig.deliveryDays }} {{ t('days') }}</span><span><i class="fa-solid fa-rotate-left mr-1 text-brand"></i>{{ gig.revisions }} {{ t('revisions') }}</span><span><i class="fa-solid fa-star mr-1 text-amber-400"></i>{{ gig.rating }}</span></div>
        <div class="mt-3 flex items-center justify-between gap-2"><div><span class="text-sm font-800">{{ store.money(gig.price) }}</span><span class="ml-1 text-[11px] text-slate-400">{{ t('fixed scope') }}</span></div><div class="flex gap-1.5"><button class="btn-muted h-8 px-2.5 text-xs" :class="isComparing(gig.id) ? 'border-brand text-brand' : ''" @click="toggleCompare(gig.id)"><i class="fa-solid fa-scale-balanced"></i><span class="sr-only">{{ t('Compare') }}</span></button><button v-if="canRequest" class="btn-brand h-8 px-2.5 text-xs" @click="store.requestGig(gig.raw)">{{ t('Request') }}</button></div></div>
      </article>
    </div>
    <div v-if="!results.length" class="premium-card rounded-2xl p-12 text-center text-slate-500"><i class="fa-solid fa-magnifying-glass text-2xl text-slate-300"></i><p class="mt-3 font-bold">{{ t('No matching providers') }}</p><button class="btn-muted mt-4" @click="resetFilters">{{ t('Clear filters') }}</button></div>
  </section>
</template>

<script>
const { inject, computed, ref, watch } = Vue;
const { useRoute } = VueRouter;

export default {
  setup() {
    const store = inject('store');
    const route = useRoute();
    const query = ref(''), category = ref(''), sort = ref('recommended'), verifiedOnly = ref(false), quickFilter = ref(''), compareIds = ref([]);
    const talentMode = computed(() => route.meta.directory === 'talent');
    const t = (key) => store.t(key);
    const canInvite = computed(() => store.isBuyer.value || store.isAdmin.value);
    const canRequest = computed(() => store.isBuyer.value || store.isAdmin.value);
    const suppliers = computed(() => new Map(store.state.suppliers.map((supplier) => [supplier.id, supplier])));
    const talent = computed(() => store.state.users.filter((person) => person.type === 'Freelancer').map((person) => {
      const supplier = suppliers.value.get(person.supplierProfileId) || {};
      const score = Number(supplier.score || 78), rating = Number(supplier.rating || 4.2);
      return { ...person, supplier, skills: Array.isArray(person.skills) ? person.skills : [], rating, score, onTime: Number(supplier.onTime || 88), responseRate: Number(supplier.responseRate || 90), risk: Number(supplier.risk || 30), rate: Number(person.hourlyRate || Math.max(55, 265 - score * 2)), verified: score >= 84 && (supplier.certifications || []).length > 0 };
    }));
    const services = computed(() => store.state.gigs.map((gig) => {
      const owner = gig.creatorType === 'agency' ? store.state.agencies.find((agency) => agency.id === gig.creatorId) : store.user(gig.creatorId);
      const supplier = suppliers.value.get(owner?.supplierProfileId) || {};
      return { ...gig, raw: gig, ownerName: owner?.name || owner?.companyName || 'Verified provider', rating: Number(supplier.rating || (gig.category === 'Design' ? 4.8 : 4.7)), score: Number(supplier.score || 88), responseRate: Number(supplier.responseRate || 93), verified: Boolean((supplier.certifications || []).length) || Boolean(owner), scope: Array.isArray(gig.scope) ? gig.scope : [] };
    }));
    const source = computed(() => talentMode.value ? talent.value : services.value);
    const categories = computed(() => [...new Set(source.value.flatMap((item) => talentMode.value ? item.skills : [item.category]))].sort());
    const quickFilters = computed(() => talentMode.value ? [
      { key: 'available', label: 'Available now', icon: 'fa-circle-check' }, { key: 'low-risk', label: 'Low risk', icon: 'fa-shield-halved' }, { key: 'fast', label: 'Fast response', icon: 'fa-bolt' },
    ] : [
      { key: 'fast', label: 'Fast delivery', icon: 'fa-bolt' }, { key: 'budget', label: 'Under $1,000', icon: 'fa-tags' }, { key: 'scope', label: 'Defined scope', icon: 'fa-list-check' },
    ]);
    const results = computed(() => {
      const term = query.value.toLocaleLowerCase();
      const filtered = source.value.filter((item) => {
        const text = talentMode.value ? `${item.name} ${item.companyName || ''} ${item.headline || ''} ${item.skills.join(' ')}` : `${item.title} ${item.description} ${item.ownerName} ${item.scope.join(' ')}`;
        const categoryMatch = !category.value || (talentMode.value ? item.skills.includes(category.value) : item.category === category.value);
        const quick = !quickFilter.value || (quickFilter.value === 'available' && item.availability === 'Available') || (quickFilter.value === 'low-risk' && item.risk <= 25) || (quickFilter.value === 'fast' && (talentMode.value ? item.responseRate >= 94 : item.deliveryDays <= 3)) || (quickFilter.value === 'budget' && item.price < 1000) || (quickFilter.value === 'scope' && item.scope.length >= 3);
        return (!term || text.toLocaleLowerCase().includes(term)) && categoryMatch && (!verifiedOnly.value || item.verified) && quick;
      });
      return filtered.slice().sort((a, b) => {
        if (sort.value === 'rating') return b.rating - a.rating;
        if (sort.value === 'delivery') return talentMode.value ? b.responseRate - a.responseRate : a.deliveryDays - b.deliveryDays;
        if (sort.value === 'price') return (a.rate || a.price) - (b.rate || b.price);
        return (b.score || 0) - (a.score || 0) || b.rating - a.rating;
      });
    });
    const shortlist = computed(() => {
      const bucket = store.state.marketplaceShortlists || {};
      return new Set(Array.isArray(bucket[store.currentUser.value.id]) ? bucket[store.currentUser.value.id] : []);
    });
    const isShortlisted = (id) => shortlist.value.has(id);
    const toggleShortlist = (id) => {
      if (!canInvite.value) return store.notice(t('Shortlist access denied'), 'fa-shield-halved');
      store.state.marketplaceShortlists ||= {};
      const idValue = String(id).slice(0, 120), values = [...shortlist.value];
      store.state.marketplaceShortlists[store.currentUser.value.id] = values.includes(idValue) ? values.filter((item) => item !== idValue) : [...values, idValue].slice(0, 100);
      store.notice(values.includes(idValue) ? t('Removed from shortlist') : t('Added to shortlist'));
    };
    const isComparing = (id) => compareIds.value.includes(id);
    const toggleCompare = (id) => {
      if (isComparing(id)) return compareIds.value = compareIds.value.filter((item) => item !== id);
      if (compareIds.value.length >= 3) return store.notice(t('Compare up to three options'), 'fa-scale-balanced');
      compareIds.value = [...compareIds.value, id];
    };
    const compareItems = computed(() => compareIds.value.map((id) => source.value.find((item) => item.id === id)).filter(Boolean).map((item) => talentMode.value ? ({ id: item.id, name: item.name, subline: item.headline, rating: `${item.rating} ★`, delivery: `${item.onTime}%`, price: `${store.money(item.rate)}/${t('hour')}` }) : ({ id: item.id, name: item.title, subline: item.ownerName, rating: `${item.rating} ★`, delivery: `${item.deliveryDays} ${t('days')}`, price: store.money(item.price) })));
    const invite = (person) => {
      if (!canInvite.value || !talent.value.some((item) => item.id === person.id)) return store.notice(t('Invitation denied'), 'fa-shield-halved');
      const job = store.state.jobs.find((item) => item.clientId === store.currentUser.value.id && item.status === 'OPEN');
      store.addNotification({ userId: person.id, title: 'New project invitation', text: job ? `${store.currentUser.value.name} invited you to ${job.title}.` : `${store.currentUser.value.name} requested an introduction.`, link: job ? `/job/${job.id}` : '/messages', icon: 'fa-user-plus' });
      store.notice(`${person.name} ${t('invited')}`);
    };
    const resetFilters = () => { query.value = ''; category.value = ''; verifiedOnly.value = false; quickFilter.value = ''; sort.value = 'recommended'; };
    watch(talentMode, () => { resetFilters(); compareIds.value = []; });
    return { store, t, talentMode, query, category, sort, verifiedOnly, quickFilter, quickFilters, categories, results, canInvite, canRequest, compareIds, compareItems, isComparing, toggleCompare, isShortlisted, toggleShortlist, invite, resetFilters };
  },
};
</script>
