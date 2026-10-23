<template>
  <section class="ct">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">{{ t('Products') }}</h1>
        <p class="pg-lede">{{ t('Search what you need, see who already offers it and build one shopping list. What nobody has a price for, suppliers quote within hours.') }}</p>
      </div>
      <div class="pg-actions">
        <RouterLink to="/procurement/queue" class="pg-link">{{ t('Purchase requests') }}</RouterLink>
        <button type="button" class="pg-link" :class="{ 'is-on': showOnlySavings }" :aria-pressed="showOnlySavings" @click="showOnlySavings = !showOnlySavings">{{ showOnlySavings ? t('All products') : t('Savings opportunities') }}</button>
      </div>
    </header>

    <div class="st">
      <div v-for="metric in metrics" :key="metric.label" class="st-item"><b>{{ metric.value }}</b><span>{{ t(metric.label) }}</span></div>
    </div>

    <section class="ct-bar grid gap-3 lg:grid-cols-[minmax(0,2fr)_180px_180px_auto]">
      <label class="relative"><span class="sr-only">{{ t('Search') }}</span><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input v-model.trim="query" class="field h-11 pl-10" :placeholder="t('Search: monitor, laptop, printer, brand, model...')" maxlength="120" autocomplete="off" /></label>
      <select v-model="brand" class="field h-11" :aria-label="t('Brand')"><option value="">{{ t('All brands') }}</option><option v-for="item in brands" :key="item" :value="item">{{ item }}</option></select>
      <select v-model="sort" class="field h-11" :aria-label="t('Sort')"><option value="category">{{ t('Category') }}</option><option value="savings">{{ t('Highest savings') }}</option><option value="price">{{ t('Lowest price') }}</option><option value="offers">{{ t('Most offers') }}</option><option value="name">{{ t('Name') }}</option></select>
      <span class="ct-count">{{ catalog.length }} {{ t('items') }}</span>
    </section>

    <nav class="ct-groups" :aria-label="t('Category')">
      <button type="button" class="ct-chip" :class="{ 'is-on': !category }" @click="category = ''">{{ t('All categories') }} <small>{{ products.length }}</small></button>
      <button v-for="group in groups" :key="group.name" type="button" class="ct-chip" :class="{ 'is-on': category === group.name }" @click="category = category === group.name ? '' : group.name"><i class="fa-solid" :class="group.icon"></i>{{ t(group.name) }} <small>{{ group.count }}</small></button>
    </nav>

    <section class="ct-split">
      <div>
        <div class="ct-grid">
          <article v-for="product in visible" :key="product.id" class="ct-card group flex flex-col" :class="{ 'is-on': selectedProductId === product.id }">
            <div class="flex items-start justify-between gap-2"><span class="ct-kind">{{ t(product.category) }}</span><span v-if="product.compliantOffers === product.offers.length" class="text-[10px] font-bold text-emerald-600"><i class="fa-solid fa-shield-halved mr-1"></i>{{ t('Qualified') }}</span></div>
            <button class="mt-3 text-left text-lg font-800 leading-6 hover:text-brand" @click="selectProduct(product.id)">{{ t(product.description) }}</button>
            <p class="mt-1 text-[11px] text-slate-400">{{ product.sku }} · {{ t(product.unit) }}</p>
            <p v-if="product.keySpecs" class="ct-specs">{{ product.keySpecs }}</p>
            <div class="mt-4 flex items-end justify-between"><div><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ t('Best verified price') }}</p><p class="text-xl font-800">{{ money(product.best.price, product.currency) }}</p></div><div class="text-right"><p v-if="product.savingsPercent" class="text-[11px] font-bold text-emerald-600"><i class="fa-solid fa-arrow-trend-down mr-1"></i>{{ product.savingsPercent }}% {{ t('less') }}</p><p class="text-[10px] text-slate-400">{{ t('vs reference') }}</p></div></div>
            <div class="ct-meta"><span><i class="fa-solid fa-building-circle-check mr-1 text-brand"></i>{{ product.offers.length }} {{ t('offers') }}</span><span><i class="fa-regular fa-clock mr-1 text-brand"></i>{{ product.best.leadDays }} {{ t('days') }}</span><span><i class="fa-solid fa-cubes-stacked mr-1 text-brand"></i>{{ product.best.stock }}</span></div>
            <p v-if="product.quickCount" class="ct-quick"><i class="fa-solid fa-bolt"></i> {{ product.quickCount }} {{ t('more can quote in') }} ≈ {{ product.quickHours }} h</p>
            <div class="mt-auto flex gap-2 pt-3">
              <button type="button" class="ct-ghost flex-1" :class="{ 'is-on': selectedProductId === product.id }" @click="selectProduct(product.id)"><i class="fa-solid fa-scale-balanced mr-1"></i>{{ selectedProductId === product.id ? t('Comparing offers') : t('Compare offers') }}</button>
              <button v-if="canBuy" type="button" class="ct-go flex-1" :class="{ 'ct-added': inList(product.id) }" @click="addToList(product, product.best)"><i class="fa-solid mr-1" :class="inList(product.id) ? 'fa-check' : 'fa-cart-plus'"></i>{{ inList(product.id) ? `${t('In list')} · ${quantityInList(product.id)}` : t('Add to list') }}</button>
            </div>
          </article>
          <div v-if="!catalog.length" class="ct-empty col-span-full"><i class="fa-solid fa-box-open text-2xl text-slate-300"></i><p class="mt-3 font-bold">{{ t('No catalog items match') }}</p><p class="mt-1 text-xs">{{ t('Not in the catalog? Describe it in your shopping list and suppliers will quote it.') }}</p><div class="mt-4 flex flex-wrap justify-center gap-2"><button class="btn-muted" @click="resetFilters">{{ t('Clear filters') }}</button><button v-if="canBuy" class="ct-go" @click="describeIt"><i class="fa-solid fa-pen mr-1"></i>{{ t("I can't find it: describe what I need") }}</button></div></div>
        </div>
        <div v-if="catalog.length > shown" class="mt-6 text-center"><button type="button" class="ct-ghost" @click="shown += 24">{{ t('Show more') }} ({{ catalog.length - shown }})</button></div>
      </div>

      <aside class="ct-side" ref="side">
        <div class="ct-tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'offers'" :class="{ 'is-on': tab === 'offers' }" @click="tab = 'offers'"><i class="fa-solid fa-scale-balanced"></i> {{ t('Offers') }}</button>
          <button type="button" role="tab" :aria-selected="tab === 'list'" :class="{ 'is-on': tab === 'list' }" @click="tab = 'list'"><i class="fa-solid fa-list-check"></i> {{ t('Shopping list') }} <span v-if="listCount" class="ct-badge">{{ listCount }}</span></button>
        </div>

        <div v-show="tab === 'offers'" class="ct-sheet" aria-live="polite">
          <div class="border-b border-slate-200/80 p-4 dark:border-slate-800"><div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-wide text-brand">{{ t('Offer comparison') }}</p><h2 class="mt-1 text-lg font-800">{{ selected ? t(selected.description) : t('Select a product') }}</h2><p v-if="selected" class="mt-1 text-xs text-slate-500">{{ selected.sku }} · {{ selected.offers.length }} {{ t('qualified supplier offers') }}</p></div><i class="fa-solid fa-scale-balanced text-xl text-brand/50"></i></div></div>
          <template v-if="selected">
            <dl v-if="specRows.length" class="ct-spec-table"><div v-for="row in specRows" :key="row.key"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div></dl>
            <div class="border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"><label class="text-[11px] font-bold text-slate-500">{{ t('Quantity') }}<input v-model.number="quantity" class="field mt-1 h-9 w-28" type="number" min="1" max="100000" step="1" inputmode="numeric" /></label><span class="ml-3 text-xs text-slate-500">{{ t('Reference') }}: <s>{{ money(selected.referencePrice * quantity, selected.currency) }}</s></span></div>
            <div class="divide-y divide-slate-100 dark:divide-slate-800"><article v-for="offer in selected.offers" :key="offer.id" class="ct-offer" :class="{ 'is-on': offer.id === selectedOfferId }"><div class="flex gap-2"><span class="grid h-8 w-8 flex-none place-items-center rounded-lg bg-slate-100 text-xs font-800 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ initials(offer.supplier.name) }}</span><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><p class="truncate text-sm font-800">{{ offer.supplier.name }}</p><b class="whitespace-nowrap text-sm" :class="offer.id === selected.best.id ? 'text-emerald-600' : ''">{{ money(offer.price * quantity, selected.currency) }}</b></div><p class="mt-0.5 text-[11px] text-slate-500">{{ money(offer.price, selected.currency) }}/{{ t(selected.unit) }} · {{ offer.terms }}</p></div></div><div class="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]"><span><b class="block text-xs">{{ offer.leadDays }}d</b>{{ t('Delivery') }}</span><span><b class="block text-xs">{{ offer.supplier.score }}</b>{{ t('Score') }}</span><span><b class="block text-xs" :class="offer.supplier.risk <= 25 ? 'text-emerald-600' : 'text-amber-600'">{{ offer.supplier.risk }}</b>{{ t('Risk') }}</span></div><div class="mt-3 flex gap-2"><button class="ct-ghost flex-1" :class="{ 'is-on': offer.id === selectedOfferId }" @click="selectedOfferId = offer.id">{{ offer.id === selected.best.id ? t('Best value') : t('Select offer') }}</button><button v-if="canBuy" class="ct-go flex-1" @click="addToList(selected, offer, quantity)"><i class="fa-solid fa-cart-plus mr-1"></i>{{ t('Add to list') }}</button></div></article></div>

            <section v-if="quickers.length" class="ct-quickers">
              <h3><i class="fa-solid fa-bolt"></i> {{ t('No price list: they send an offer in hours') }}</h3>
              <p>{{ t('These suppliers have no published price for this item. Ask and they quote it.') }}</p>
              <ul>
                <li v-for="supplier in quickers" :key="supplier.id"><span class="ct-q-av">{{ initials(supplier.name) }}</span><span class="min-w-0 flex-1"><b>{{ supplier.name }}</b><small>{{ supplier.marketplace.city }} · {{ t('answers in') }} ≈ {{ supplier.marketplace.responseHours }} h</small></span></li>
              </ul>
              <button v-if="canBuy" type="button" class="ct-ghost ct-wide" @click="addToList(selected, null, quantity)"><i class="fa-solid fa-bolt mr-1"></i>{{ t('Ask these suppliers for a quick offer') }}</button>
            </section>
            <footer class="border-t border-slate-200/80 bg-slate-50/60 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60"><i class="fa-solid fa-circle-info mr-1 text-brand"></i>{{ t('Savings are calculated against the catalog reference, before tax and freight.') }}</footer>
          </template>
          <div v-else class="p-12 text-center text-sm text-slate-500"><i class="fa-solid fa-arrow-left-long text-xl text-brand"></i><p class="mt-3">{{ t('Choose an item to inspect supplier offers.') }}</p></div>
        </div>

        <ShoppingList v-show="tab === 'list'" ref="listPanel" />
      </aside>
    </section>

    <button v-if="canBuy && listCount" type="button" class="ct-pill" @click="openList"><i class="fa-solid fa-list-check"></i> {{ t('Shopping list') }} · {{ listCount }}</button>
  </section>
</template>

<script>
const { inject, computed, ref, watch, nextTick } = Vue;

const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const GROUP_ICONS = { Monitors: 'fa-display', Laptops: 'fa-laptop', Desktops: 'fa-desktop', Printers: 'fa-print', 'Keyboards & mice': 'fa-keyboard', Networking: 'fa-network-wired', Storage: 'fa-hard-drive', 'Power & UPS': 'fa-plug-circle-bolt', Tablets: 'fa-tablet-screen-button', 'Headsets & webcams': 'fa-headset', 'Docks & cables': 'fa-usb', 'Displays & TVs': 'fa-tv', Phones: 'fa-mobile-screen', 'Security cameras': 'fa-video', Components: 'fa-microchip', Software: 'fa-compact-disc' };
const SPEC_LABELS = { size: 'Size', resolution: 'Resolution', refresh_rate: 'Refresh rate', panel: 'Panel', ports: 'Ports', processor: 'Processor', memory: 'Memory', storage: 'Storage', display: 'Display', battery: 'Battery', graphics: 'Graphics', form_factor: 'Form factor', technology: 'Technology', color: 'Colour', speed: 'Speed', connectivity: 'Connectivity', paper_size: 'Paper size', type: 'Type', compatibility: 'Compatibility', material: 'Material', warranty: 'Warranty', wireless_standard: 'Wireless', management: 'Management', power: 'Power', capacity: 'Capacity', interface: 'Interface', output_power: 'Output power', runtime: 'Runtime', outlets: 'Outlets', os: 'System', camera: 'Camera', noise_cancelling: 'Noise cancelling', weight: 'Item weight', hdr: 'HDR', lens: 'Lens', night_vision: 'Night vision', license_type: 'License', term: 'Term', users: 'Users', platform: 'Platform', language: 'Language' };

export default {
  components: { ShoppingList: load('./app/pages/catalog/ShoppingList.vue?v=2') },
  setup() {
    const store = inject('store');
    const query = ref(''), category = ref(''), brand = ref(''), sort = ref('category'), showOnlySavings = ref(false), selectedProductId = ref(''), selectedOfferId = ref(''), quantity = ref(1), shown = ref(24), tab = ref('offers');
    const side = ref(null), listPanel = ref(null);
    const t = (key) => store.t(key);
    const specText = (value) => window.BuyniverseCatalogText.spec(value, store.locale.value);
    const money = (value, currency) => store.money(value, currency || 'USD');
    const canBuy = computed(() => store.isBuyer.value || store.isAdmin.value);
    if (!Array.isArray(store.state.shoppingList)) store.state.shoppingList = [];
    const supplierMap = computed(() => new Map(store.state.suppliers.map((supplier) => [supplier.id, supplier])));
    const products = computed(() => store.state.products.map((raw) => {
      const fallback = { id: `${raw.id}-preferred`, supplierId: raw.preferredSupplierId, price: Number(raw.rate || 0), leadDays: 7, stock: 100, terms: 'Net 30', compliant: true };
      const offers = (Array.isArray(raw.offers) && raw.offers.length ? raw.offers : [fallback]).map((offer, index) => ({ ...offer, id: String(offer.id || `${raw.id}-offer-${index}`).slice(0, 120), price: Math.max(0, Number(offer.price || raw.rate || 0)), leadDays: Math.max(1, Math.min(365, Number(offer.leadDays || 7))), stock: Math.max(0, Number(offer.stock || 0)), terms: String(offer.terms || 'Net 30').slice(0, 60), compliant: offer.compliant !== false, supplier: supplierMap.value.get(offer.supplierId) || { id: '', name: t('Unverified supplier'), score: 0, risk: 99 } })).filter((offer) => offer.price > 0 && offer.supplier.id).sort((a, b) => (b.compliant - a.compliant) || a.price - b.price);
      const qualified = offers.filter((offer) => offer.compliant);
      const best = qualified[0] || offers[0];
      const referencePrice = Math.max(Number(raw.referencePrice || raw.rate || 0), ...offers.map((offer) => offer.price));
      const savingsPercent = referencePrice > 0 && best ? Math.max(0, Math.round((1 - best.price / referencePrice) * 100)) : 0;
      const quick = raw.brand ? window.BuyniverseNeed.quickQuoteSuppliers(store.state, [raw.id], 0).filter((supplier) => !offers.some((offer) => offer.supplierId === supplier.id)) : [];
      return { ...raw, description: String(raw.description || raw.name || raw.id), sku: String(raw.sku || raw.id.toUpperCase()), unit: String(raw.unit || 'Each'), offers, best, referencePrice, savingsPercent, compliantOffers: qualified.length, keySpecs: Object.values(raw.specs || {}).slice(0, 3).map(specText).join(' · '), quickCount: quick.length, quickHours: quick.length ? Math.min(...quick.map((supplier) => Number(supplier.marketplace.responseHours || 24))) : 0 };
    }).filter((product) => product.best));
    const groups = computed(() => {
      const counts = new Map();
      products.value.forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count, icon: GROUP_ICONS[name] || 'fa-box' }));
    });
    const brands = computed(() => [...new Set(products.value.filter((product) => !category.value || product.category === category.value).map((product) => product.brand).filter(Boolean))].sort());
    const catalog = computed(() => {
      const words = query.value.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      return products.value.filter((product) => {
        const haystack = `${product.description} ${product.sku} ${product.category} ${t(product.category)} ${product.brand || ''} ${Object.values(product.specs || {}).join(' ')} ${product.offers.map((offer) => offer.supplier.name).join(' ')}`.toLocaleLowerCase();
        return words.every((word) => haystack.includes(word)) && (!category.value || product.category === category.value) && (!brand.value || product.brand === brand.value) && (!showOnlySavings.value || product.savingsPercent > 0);
      }).slice().sort((a, b) => sort.value === 'category' ? groupRank(a) - groupRank(b) || a.description.localeCompare(b.description) : sort.value === 'price' ? a.best.price - b.best.price : sort.value === 'offers' ? b.offers.length - a.offers.length : sort.value === 'name' ? a.description.localeCompare(b.description) : b.savingsPercent - a.savingsPercent || a.best.price - b.best.price);
    });
    const groupRank = (product) => { const i = groups.value.findIndex((group) => group.name === product.category); return i < 0 ? 999 : i; };
    const visible = computed(() => catalog.value.slice(0, shown.value));
    const selected = computed(() => products.value.find((product) => product.id === selectedProductId.value) || catalog.value[0] || null);
    const specRows = computed(() => Object.entries(selected.value?.specs || {}).map(([key, value]) => ({ key, label: t(SPEC_LABELS[key] || key), value: specText(value) })));
    const quickers = computed(() => !selected.value ? [] : window.BuyniverseNeed.quickQuoteSuppliers(store.state, [selected.value.id], 0).filter((supplier) => !selected.value.offers.some((offer) => offer.supplierId === supplier.id)).slice(0, 5));
    const metrics = computed(() => {
      const allOffers = products.value.flatMap((product) => product.offers);
      const bestSavings = products.value.filter((product) => product.currency === 'MXN').reduce((total, product) => total + Math.max(0, product.referencePrice - product.best.price), 0);
      return [{ label: 'Catalog items', value: products.value.length }, { label: 'Qualified offers', value: allOffers.filter((offer) => offer.compliant).length }, { label: 'Price coverage', value: `${Math.round((allOffers.length / Math.max(1, products.value.length)) * 10) / 10}×` }, { label: 'Visible savings', value: money(bestSavings, 'MXN') }];
    });
    const listCount = computed(() => store.state.shoppingList.length);
    const inList = (id) => store.state.shoppingList.some((line) => line.productId === id);
    const quantityInList = (id) => store.state.shoppingList.filter((line) => line.productId === id).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const selectProduct = (id) => { selectedProductId.value = id; const product = products.value.find((item) => item.id === id); selectedOfferId.value = product?.best?.id || ''; quantity.value = 1; tab.value = 'offers'; };
    watch(catalog, (list) => { shown.value = Math.max(24, shown.value); if (!list.some((product) => product.id === selectedProductId.value)) selectProduct(list[0]?.id || ''); }, { immediate: true });
    watch([query, category, brand, sort, showOnlySavings], () => { shown.value = 24; });
    watch(category, () => { if (brand.value && !brands.value.includes(brand.value)) brand.value = ''; });
    const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    // A product goes on the list once per supplier choice; adding it again adds to the quantity.
    const addToList = (product, offer, qty = 1) => {
      if (!canBuy.value || !product) return store.notice(t('Purchase request denied'), 'fa-shield-halved');
      const amount = Math.round(Number(qty));
      if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return store.notice(t('Enter a valid quantity'), 'fa-triangle-exclamation');
      const listed = store.state.shoppingList[0] && store.state.products.find((item) => item.id === store.state.shoppingList[0].productId);
      if (listed && (listed.currency || 'USD') !== (product.currency || 'USD')) return store.notice(t('One list uses one currency; this item is priced in another'), 'fa-triangle-exclamation');
      const offerId = offer ? offer.id : 'quick';
      const same = store.state.shoppingList.find((line) => line.productId === product.id && line.offerId === offerId);
      if (same) same.quantity = Math.min(100000, (Number(same.quantity) || 0) + amount);
      else store.state.shoppingList.push({ id: `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, productId: product.id, description: product.description, quantity: amount, offerId });
      store.notice(`${t(product.description)} · ${t('added to your list')}`, 'fa-cart-plus');
    };
    const openList = () => { tab.value = 'list'; nextTick(() => side.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
    const describeIt = () => { openList(); nextTick(() => { const panel = listPanel.value; if (panel && panel.$el) panel.$el.querySelector('.sl-custom')?.click(); }); };
    const resetFilters = () => { query.value = ''; category.value = ''; brand.value = ''; sort.value = 'category'; showOnlySavings.value = false; };
    return { store, t, money, specText, query, category, brand, sort, showOnlySavings, groups, brands, products, catalog, visible, shown, metrics, selected, specRows, quickers, selectedProductId, selectedOfferId, quantity, canBuy, tab, side, listPanel, listCount, inList, quantityInList, selectProduct, initials, addToList, openList, describeIt, resetFilters };
  },
};
</script>
