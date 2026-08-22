<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="premium-kicker text-xs font-bold uppercase text-brand">{{ t('Procurement catalog') }}</p><h1 class="premium-title mt-1 text-3xl font-800">{{ t('Products') }}</h1><p class="mt-1 text-sm text-slate-500">{{ t('Compare qualified supplier offers and turn the best option into a controlled requisition.') }}</p></div>
      <div class="flex gap-2"><RouterLink to="/procurement/queue" class="btn-muted h-9 px-3 text-xs"><i class="fa-solid fa-cart-plus mr-1.5"></i>{{ t('Purchase requests') }}</RouterLink><button class="btn-brand h-9 px-3 text-xs" @click="showOnlySavings = !showOnlySavings" :aria-pressed="showOnlySavings"><i class="fa-solid fa-piggy-bank mr-1.5"></i>{{ showOnlySavings ? t('All products') : t('Savings opportunities') }}</button></div>
    </header>

    <section class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in metrics" :key="metric.label" class="premium-card flex items-center gap-3 rounded-xl p-3"><span class="grid h-9 w-9 place-items-center rounded-lg" :class="metric.tone"><i class="fa-solid" :class="metric.icon"></i></span><div><p class="text-lg font-800">{{ metric.value }}</p><p class="text-[11px] font-semibold text-slate-500">{{ t(metric.label) }}</p></div></article>
    </section>

    <section class="premium-card grid gap-3 rounded-2xl p-3 lg:grid-cols-[minmax(0,2fr)_190px_190px_auto]">
      <label class="relative"><span class="sr-only">{{ t('Search') }}</span><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i><input v-model.trim="query" class="field h-10 pl-9" :placeholder="t('Search catalog, SKU or supplier')" maxlength="120" autocomplete="off" /></label>
      <select v-model="category" class="field h-10" :aria-label="t('Category')"><option value="">{{ t('All categories') }}</option><option v-for="item in categories" :key="item" :value="item">{{ item }}</option></select>
      <select v-model="sort" class="field h-10" :aria-label="t('Sort')"><option value="savings">{{ t('Highest savings') }}</option><option value="price">{{ t('Lowest price') }}</option><option value="offers">{{ t('Most offers') }}</option><option value="name">{{ t('Name') }}</option></select>
      <span class="flex h-10 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-500 dark:bg-slate-800">{{ catalog.length }} {{ t('items') }}</span>
    </section>

    <section class="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(355px,.43fr)]">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="product in catalog" :key="product.id" class="premium-card group flex min-h-66 flex-col rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg" :class="selectedProductId === product.id ? 'ring-2 ring-brand/50' : ''">
          <div class="flex items-start justify-between gap-2"><span class="rounded-md bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand dark:bg-brand/15">{{ product.category }}</span><span v-if="product.compliantOffers === product.offers.length" class="text-[10px] font-bold text-emerald-600"><i class="fa-solid fa-shield-halved mr-1"></i>{{ t('Qualified') }}</span></div>
          <button class="mt-3 text-left text-lg font-800 leading-6 hover:text-brand" @click="selectProduct(product.id)">{{ product.description }}</button><p class="mt-1 text-[11px] text-slate-400">{{ product.sku }} · {{ t(product.unit) }}</p>
          <div class="mt-4 flex items-end justify-between"><div><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ t('Best verified price') }}</p><p class="text-xl font-800">{{ store.money(product.best.price) }}</p></div><div class="text-right"><p class="text-[11px] font-bold text-emerald-600"><i class="fa-solid fa-arrow-trend-down mr-1"></i>{{ product.savingsPercent }}% {{ t('less') }}</p><p class="text-[10px] text-slate-400">{{ t('vs reference') }}</p></div></div>
          <div class="mt-3 flex items-center justify-between border-y border-slate-100 py-2 text-xs dark:border-slate-800"><span><i class="fa-solid fa-building-circle-check mr-1 text-brand"></i>{{ product.offers.length }} {{ t('offers') }}</span><span><i class="fa-regular fa-clock mr-1 text-brand"></i>{{ product.best.leadDays }} {{ t('days') }}</span><span><i class="fa-solid fa-cubes-stacked mr-1 text-brand"></i>{{ product.best.stock }}</span></div>
          <div class="mt-auto pt-3"><button class="btn-muted h-8 w-full text-xs" @click="selectProduct(product.id)"><i class="fa-solid fa-scale-balanced mr-1"></i>{{ selectedProductId === product.id ? t('Comparing offers') : t('Compare offers') }}</button></div>
        </article>
        <div v-if="!catalog.length" class="premium-card col-span-full rounded-2xl p-12 text-center text-slate-500"><i class="fa-solid fa-box-open text-2xl text-slate-300"></i><p class="mt-3 font-bold">{{ t('No catalog items match') }}</p><button class="btn-muted mt-4" @click="resetFilters">{{ t('Clear filters') }}</button></div>
      </div>

      <aside class="premium-card h-fit overflow-hidden rounded-2xl" aria-live="polite">
        <div class="border-b border-slate-200/80 p-4 dark:border-slate-800"><div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-wide text-brand">{{ t('Offer comparison') }}</p><h2 class="mt-1 text-lg font-800">{{ selected?.description || t('Select a product') }}</h2><p v-if="selected" class="mt-1 text-xs text-slate-500">{{ selected.sku }} · {{ selected.offers.length }} {{ t('qualified supplier offers') }}</p></div><i class="fa-solid fa-scale-balanced text-xl text-brand/50"></i></div></div>
        <template v-if="selected"><div class="border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"><label class="text-[11px] font-bold text-slate-500">{{ t('Quantity') }}<input v-model.number="quantity" class="field mt-1 h-9 w-28" type="number" min="1" max="100000" step="1" inputmode="numeric" /></label><span class="ml-3 text-xs text-slate-500">{{ t('Reference') }}: <s>{{ store.money(selected.referencePrice * quantity) }}</s></span></div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800"><article v-for="offer in selected.offers" :key="offer.id" class="p-4" :class="offer.id === selectedOfferId ? 'bg-brand-50/50 dark:bg-brand/8' : ''"><div class="flex gap-2"><span class="grid h-8 w-8 flex-none place-items-center rounded-lg bg-slate-100 text-xs font-800 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ initials(offer.supplier.name) }}</span><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><p class="truncate text-sm font-800">{{ offer.supplier.name }}</p><b class="whitespace-nowrap text-sm" :class="offer.id === selected.best.id ? 'text-emerald-600' : ''">{{ store.money(offer.price * quantity) }}</b></div><p class="mt-0.5 text-[11px] text-slate-500">{{ store.money(offer.price) }}/{{ t(selected.unit) }} · {{ offer.terms }}</p></div></div><div class="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]"><span><b class="block text-xs">{{ offer.leadDays }}d</b>{{ t('Delivery') }}</span><span><b class="block text-xs">{{ offer.supplier.score }}</b>{{ t('Score') }}</span><span><b class="block text-xs" :class="offer.supplier.risk <= 25 ? 'text-emerald-600' : 'text-amber-600'">{{ offer.supplier.risk }}</b>{{ t('Risk') }}</span></div><div class="mt-3 flex gap-2"><button class="btn-muted h-8 flex-1 text-xs" :class="offer.id === selectedOfferId ? 'border-brand text-brand' : ''" @click="selectedOfferId = offer.id">{{ offer.id === selected.best.id ? t('Best value') : t('Select offer') }}</button><button v-if="canBuy" class="btn-brand h-8 flex-1 text-xs" @click="createRequest(offer)"><i class="fa-solid fa-cart-plus mr-1"></i>{{ t('Request') }}</button></div></article></div>
          <footer class="border-t border-slate-200/80 bg-slate-50/60 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60"><i class="fa-solid fa-circle-info mr-1 text-brand"></i>{{ t('Savings are calculated against the catalog reference, before tax and freight.') }}</footer>
        </template>
        <div v-else class="p-12 text-center text-sm text-slate-500"><i class="fa-solid fa-arrow-left-long text-xl text-brand"></i><p class="mt-3">{{ t('Choose an item to inspect supplier offers.') }}</p></div>
      </aside>
    </section>
  </section>
</template>

<script>
const { inject, computed, ref, watch } = Vue;
const { useRouter } = VueRouter;

export default {
  setup() {
    const store = inject('store'), router = useRouter();
    const query = ref(''), category = ref(''), sort = ref('savings'), showOnlySavings = ref(false), selectedProductId = ref(''), selectedOfferId = ref(''), quantity = ref(1);
    const t = (key) => store.t(key);
    const canBuy = computed(() => store.isBuyer.value || store.isAdmin.value);
    const supplierMap = computed(() => new Map(store.state.suppliers.map((supplier) => [supplier.id, supplier])));
    const products = computed(() => store.state.products.map((raw) => {
      const fallback = { id: `${raw.id}-preferred`, supplierId: raw.preferredSupplierId, price: Number(raw.rate || 0), leadDays: 7, stock: 100, terms: 'Net 30', compliant: true };
      const offers = (Array.isArray(raw.offers) && raw.offers.length ? raw.offers : [fallback]).map((offer, index) => ({ ...offer, id: String(offer.id || `${raw.id}-offer-${index}`).slice(0, 120), price: Math.max(0, Number(offer.price || raw.rate || 0)), leadDays: Math.max(1, Math.min(365, Number(offer.leadDays || 7))), stock: Math.max(0, Number(offer.stock || 0)), terms: String(offer.terms || 'Net 30').slice(0, 60), compliant: offer.compliant !== false, supplier: supplierMap.value.get(offer.supplierId) || { id: '', name: t('Unverified supplier'), score: 0, risk: 99 } })).filter((offer) => offer.price > 0 && offer.supplier.id).sort((a, b) => (b.compliant - a.compliant) || a.price - b.price);
      const qualified = offers.filter((offer) => offer.compliant);
      const best = qualified[0] || offers[0];
      const referencePrice = Math.max(Number(raw.referencePrice || raw.rate || 0), ...offers.map((offer) => offer.price));
      const savingsPercent = referencePrice > 0 && best ? Math.max(0, Math.round((1 - best.price / referencePrice) * 100)) : 0;
      return { ...raw, description: String(raw.description || raw.name || raw.id), sku: String(raw.sku || raw.id.toUpperCase()), unit: String(raw.unit || 'Each'), offers, best, referencePrice, savingsPercent, compliantOffers: qualified.length };
    }).filter((product) => product.best));
    const categories = computed(() => [...new Set(products.value.map((product) => product.category))].sort());
    const catalog = computed(() => {
      const term = query.value.toLocaleLowerCase();
      return products.value.filter((product) => {
        const offerText = product.offers.map((offer) => offer.supplier.name).join(' ');
        return (!term || `${product.description} ${product.sku} ${product.category} ${offerText}`.toLocaleLowerCase().includes(term)) && (!category.value || product.category === category.value) && (!showOnlySavings.value || product.savingsPercent > 0);
      }).slice().sort((a, b) => sort.value === 'price' ? a.best.price - b.best.price : sort.value === 'offers' ? b.offers.length - a.offers.length : sort.value === 'name' ? a.description.localeCompare(b.description) : b.savingsPercent - a.savingsPercent || a.best.price - b.best.price);
    });
    const selected = computed(() => products.value.find((product) => product.id === selectedProductId.value) || catalog.value[0] || null);
    const metrics = computed(() => {
      const allOffers = products.value.flatMap((product) => product.offers);
      const bestSavings = products.value.reduce((total, product) => total + Math.max(0, product.referencePrice - product.best.price), 0);
      return [{ label: 'Catalog items', value: products.value.length, icon: 'fa-boxes-stacked', tone: 'bg-brand-50 text-brand dark:bg-brand/15' }, { label: 'Qualified offers', value: allOffers.filter((offer) => offer.compliant).length, icon: 'fa-shield-halved', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' }, { label: 'Price coverage', value: `${Math.round((allOffers.length / Math.max(1, products.value.length)) * 10) / 10}×`, icon: 'fa-scale-balanced', tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10' }, { label: 'Visible savings', value: store.money(bestSavings), icon: 'fa-piggy-bank', tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' }];
    });
    const selectProduct = (id) => { selectedProductId.value = id; const product = products.value.find((item) => item.id === id); selectedOfferId.value = product?.best?.id || ''; quantity.value = 1; };
    watch(catalog, (list) => { if (!list.some((product) => product.id === selectedProductId.value)) selectProduct(list[0]?.id || ''); }, { immediate: true });
    const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const createRequest = (offer) => {
      const product = selected.value, qty = Number(quantity.value);
      if (!canBuy.value || !product || !product.offers.some((item) => item.id === offer.id) || !Number.isInteger(qty) || qty < 1 || qty > 100000) return store.notice(t('Purchase request denied'), 'fa-shield-halved');
      const amount = Number((offer.price * qty).toFixed(2));
      if (!window.WebCommon.isSafeAmount(amount, 0) || amount <= 0) return store.notice(t('Enter a valid quantity'), 'fa-triangle-exclamation');
      const request = { id: `PR-CAT-${Date.now().toString(36)}`, title: `${product.description} · ${offer.supplier.name}`, requesterId: store.currentUser.value.id, ownerId: store.currentUser.value.id, approverId: 'user-admin-admin', department: 'Procurement', amount, currency: product.currency || 'USD', status: 'Draft', priority: 'Medium', category: product.category, dueDate: new Date(Date.now() + offer.leadDays * 86400000).toISOString(), budgetCode: 'CATALOG-2026', nextAction: 'Submit for approval', supplierId: offer.supplier.id, preferredOfferId: offer.id, notes: `Catalog comparison selected ${offer.supplier.name}; reference ${store.money(product.referencePrice)} / ${product.unit}.`, items: [{ id: window.ProcurementCommon.uid('pr-line'), productId: product.id, description: product.description, quantity: qty, unitPrice: offer.price, supplierId: offer.supplier.id }], audit: [] };
      store.state.purchaseRequests.unshift(request);
      store.procurementEvent(request, 'Catalog offer selected', `${offer.supplier.name} · ${store.money(amount)}`, 'success');
      store.notice(t('Purchase request created'));
      router.push(`/procurement/queue?request=${encodeURIComponent(request.id)}`);
    };
    const resetFilters = () => { query.value = ''; category.value = ''; sort.value = 'savings'; showOnlySavings.value = false; };
    return { store, t, query, category, sort, showOnlySavings, categories, catalog, metrics, selected, selectedProductId, selectedOfferId, quantity, canBuy, selectProduct, initials, createRequest, resetFilters };
  },
};
</script>
