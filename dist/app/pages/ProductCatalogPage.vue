<template>
  <section class="ct">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">{{ t('Products') }}</h1>
        <p class="pg-lede">{{ t('Search what you need, see who already offers it and build one shopping list. What nobody has a price for, suppliers quote within hours.') }}</p>
      </div>
      <div class="pg-actions">
        <RouterLink to="/procurement/queue" class="pg-link">{{ t('Purchase requests') }}</RouterLink>
        <button type="button" class="pg-link" :class="{ 'is-on': onlyStock }" :aria-pressed="onlyStock" @click="onlyStock = !onlyStock">{{ t('In stock only') }}</button>
        <button type="button" class="pg-link" :class="{ 'is-on': showOnlySavings }" :aria-pressed="showOnlySavings" @click="showOnlySavings = !showOnlySavings">{{ showOnlySavings ? t('All products') : t('Savings opportunities') }}</button>
      </div>
    </header>

    <div class="st">
      <div v-for="metric in metrics" :key="metric.label" class="st-item"><b>{{ metric.value }}</b><span>{{ t(metric.label) }}</span></div>
    </div>

    <p v-if="!progress.done" class="ct-loading" role="status"><i class="fa-solid fa-circle-notch fa-spin"></i> {{ t('Loading the ElectroPrice catalog') }}: {{ progress.loaded }}/{{ progress.total || '…' }} <small>{{ t('You can search while it loads.') }}</small></p>

    <section class="ct-bar grid gap-3 lg:grid-cols-[minmax(0,2fr)_180px_180px_auto]">
      <label class="relative"><span class="sr-only">{{ t('Search') }}</span><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input v-model.trim="query" class="field h-11 pl-10" :placeholder="t('Search: monitor, laptop, printer, brand, model...')" maxlength="120" autocomplete="off" /></label>
      <select v-model="brand" class="field h-11" :aria-label="t('Brand')"><option value="">{{ t('All brands') }}</option><option v-for="item in brands" :key="item" :value="item">{{ item }}</option></select>
      <select v-model="sort" class="field h-11" :aria-label="t('Sort')"><option value="category">{{ t('Category') }}</option><option value="savings">{{ t('Highest savings') }}</option><option value="price">{{ t('Lowest price') }}</option><option value="priceDesc">{{ t('Highest price') }}</option><option value="name">{{ t('Name') }}</option></select>
      <span class="ct-count">{{ catalog.length.toLocaleString() }} {{ t('items') }}</span>
    </section>

    <nav class="ct-groups" :aria-label="t('Category')">
      <button type="button" class="ct-chip" :class="{ 'is-on': !category }" @click="category = ''">{{ t('All categories') }} <small>{{ everything.length.toLocaleString() }}</small></button>
      <button v-for="group in groups" :key="group.name" type="button" class="ct-chip" :class="{ 'is-on': category === group.name }" @click="category = category === group.name ? '' : group.name"><i class="fa-solid" :class="group.icon"></i>{{ t(group.name) }} <small>{{ group.count.toLocaleString() }}</small></button>
    </nav>

    <section class="ct-split">
      <div>
        <div class="ct-grid">
          <article v-for="product in visible" :key="product.id" class="ct-card ct-shop group flex flex-col" :class="{ 'is-on': selectedProductId === product.id }">
            <button type="button" class="ct-photo" :aria-label="product.description" @click="selectProduct(product.id)">
              <i v-if="product.image" class="fa-solid fa-circle-notch fa-spin ct-photo-ph ct-spin" aria-hidden="true"></i>
              <i class="fa-regular fa-image ct-photo-ph ct-photo-none" aria-hidden="true"></i>
              <img v-if="product.image" :src="product.image" :alt="product.description" :referrerpolicy="product.imageReferrer" loading="lazy" decoding="async" @load="photoLoaded" @error="photoFailed" />
              <span v-if="product.stock === 0" class="ct-flag is-order"><i class="fa-regular fa-clock"></i> {{ t('On order') }}</span>
              <span v-else class="ct-flag is-stock"><i class="fa-solid fa-circle-check"></i> {{ t('In stock') }}</span>
              <span v-if="product.savingsPercent" class="ct-off">−{{ product.savingsPercent }}%</span>
            </button>
            <p class="ct-brandline"><span class="ct-kind">{{ t(product.category) }}</span><b v-if="product.brand">{{ product.brand }}</b></p>
            <button class="ct-name" @click="selectProduct(product.id)">{{ product.description }}</button>
            <p v-if="product.keySpecs" class="ct-specs">{{ product.keySpecs }}</p>
            <div class="ct-priceline"><b>{{ money(product.best.price, product.currency) }}</b><s v-if="product.referencePrice > product.best.price">{{ money(product.referencePrice, product.currency) }}</s></div>
            <p class="ct-ship"><i class="fa-solid fa-truck-fast"></i> {{ product.best.supplier.name }} · {{ product.best.leadDays }} {{ t('days') }}<span v-if="product.best.stock"> · {{ product.best.stock }} {{ t('available') }}</span></p>
            <p v-if="product.quickCount" class="ct-quick"><i class="fa-solid fa-bolt"></i> {{ product.quickCount }} {{ t('more can quote in') }} ≈ {{ product.quickHours }} h</p>
            <div class="mt-auto flex gap-2 pt-3">
              <button type="button" class="ct-ghost flex-1" :class="{ 'is-on': selectedProductId === product.id }" @click="selectProduct(product.id)"><i class="fa-solid fa-circle-info mr-1"></i>{{ t('Details') }}</button>
              <button v-if="canBuy" type="button" class="ct-go flex-1" :class="{ 'ct-added': inList(product.id) }" @click="addToList(product, product.best)"><i class="fa-solid mr-1" :class="inList(product.id) ? 'fa-check' : 'fa-cart-plus'"></i>{{ inList(product.id) ? `${t('In list')} · ${quantityInList(product.id)}` : t('Add to list') }}</button>
            </div>
          </article>
          <div v-if="!catalog.length" class="ct-empty col-span-full"><i class="fa-solid fa-box-open text-2xl text-slate-300"></i><p class="mt-3 font-bold">{{ progress.done ? t('No catalog items match') : t('Still loading: nothing matches yet') }}</p><p class="mt-1 text-xs">{{ t('Not in the catalog? Describe it in your shopping list and suppliers will quote it.') }}</p><div class="mt-4 flex flex-wrap justify-center gap-2"><button class="btn-muted" @click="resetFilters">{{ t('Clear filters') }}</button><button v-if="canBuy" class="ct-go" @click="describeIt"><i class="fa-solid fa-pen mr-1"></i>{{ t("I can't find it: describe what I need") }}</button></div></div>
        </div>
        <div v-if="catalog.length > shown" class="mt-6 text-center"><button type="button" class="ct-ghost" @click="shown += 24">{{ t('Show more') }} ({{ (catalog.length - shown).toLocaleString() }})</button></div>
      </div>

      <aside class="ct-side" ref="side">
        <div class="ct-tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'offers'" :class="{ 'is-on': tab === 'offers' }" @click="tab = 'offers'"><i class="fa-solid fa-scale-balanced"></i> {{ t('Offers') }}</button>
          <button type="button" role="tab" :aria-selected="tab === 'list'" :class="{ 'is-on': tab === 'list' }" @click="tab = 'list'"><i class="fa-solid fa-list-check"></i> {{ t('Shopping list') }} <span v-if="listCount" class="ct-badge">{{ listCount }}</span></button>
        </div>

        <div v-show="tab === 'offers'" class="ct-sheet" aria-live="polite">
          <template v-if="selected">
            <div class="ct-hero">
              <div class="ct-hero-photo" :key="selected.id"><i v-if="selected.image" class="fa-solid fa-circle-notch fa-spin ct-photo-ph ct-spin" aria-hidden="true"></i><i class="fa-regular fa-image ct-photo-ph ct-photo-none" aria-hidden="true"></i><img v-if="selected.image" :src="selected.image" :alt="selected.description" :referrerpolicy="selected.imageReferrer" decoding="async" @load="photoLoaded" @error="photoFailed" /></div>
              <p class="ct-brandline"><span class="ct-kind">{{ t(selected.category) }}</span><b v-if="selected.brand">{{ selected.brand }}</b></p>
              <h2>{{ selected.description }}</h2>
              <p class="ct-sku">{{ t('Part number') }}: {{ selected.sku }}</p>
              <div class="ct-priceline is-big"><b>{{ money(selected.best.price, selected.currency) }}</b><s v-if="selected.referencePrice > selected.best.price">{{ money(selected.referencePrice, selected.currency) }}</s><span v-if="selected.savingsPercent" class="ct-off-inline">−{{ selected.savingsPercent }}%</span></div>
              <p class="ct-ship"><span class="ct-flag-inline" :class="selected.stock === 0 ? 'is-order' : 'is-stock'"><i class="fa-solid" :class="selected.stock === 0 ? 'fa-clock' : 'fa-circle-check'"></i> {{ selected.stock === 0 ? t('On order') : `${selected.stock} ${t('available')}` }}</span> · {{ selected.offers.length }} {{ selected.offers.length === 1 ? t('offer') : t('qualified supplier offers') }}</p>
            </div>
            <p v-if="aboutText" class="ct-about">{{ aboutText }}</p>
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
const { inject, computed, ref, shallowRef, watch, nextTick, onMounted, onBeforeUnmount } = Vue;

const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const GROUP_ICONS = { 'Monitors': 'fa-display', 'Laptops': 'fa-laptop', 'Desktops': 'fa-desktop', 'Printers & scanners': 'fa-print', 'Keyboards & mice': 'fa-keyboard', 'Networking': 'fa-network-wired', 'Storage': 'fa-hard-drive', 'Power & UPS': 'fa-plug-circle-bolt', 'Tablets': 'fa-tablet-screen-button', 'Audio & headsets': 'fa-headset', 'Cables & adapters': 'fa-usb', 'Displays & TVs': 'fa-tv', 'Phones': 'fa-mobile-screen', 'Security & access': 'fa-video', 'Components': 'fa-microchip', 'Software': 'fa-compact-disc', 'Servers': 'fa-server', 'Consumables & supplies': 'fa-fill-drip', 'Warranties & services': 'fa-shield-halved', 'POS & retail': 'fa-cash-register', 'Gaming': 'fa-gamepad', 'Accessories & other': 'fa-boxes-stacked' };
// The order of the categories: what a company buys most as a device first, accessories and services last.
const GROUP_ORDER = ['Laptops', 'Desktops', 'Monitors', 'Tablets', 'Phones', 'Printers & scanners', 'Networking', 'Storage', 'Components', 'Keyboards & mice', 'Audio & headsets', 'Displays & TVs', 'Servers', 'Power & UPS', 'Security & access', 'Software', 'Cables & adapters', 'POS & retail', 'Gaming', 'Consumables & supplies', 'Warranties & services', 'Accessories & other'];
const SPEC_LABELS = { brand: 'Brand', model: 'Model', about: 'About' };

export default {
  components: { ShoppingList: load('./app/pages/catalog/ShoppingList.vue?v=5') },
  setup() {
    const store = inject('store');
    const Catalog = window.BuyniverseCatalog, Need = window.BuyniverseNeed;
    const query = ref(''), category = ref(''), brand = ref(''), sort = ref('category'), showOnlySavings = ref(false), onlyStock = ref(false), selectedProductId = ref(''), selectedOfferId = ref(''), quantity = ref(1), shown = ref(24), tab = ref('offers');
    const side = ref(null), listPanel = ref(null);
    const t = (key) => store.t(key);
    const money = (value, currency) => store.money(value, currency || 'USD');
    const canBuy = computed(() => store.isBuyer.value || store.isAdmin.value);
    if (!Array.isArray(store.state.shoppingList)) store.state.shoppingList = [];

    // ElectroPrice's catalog loads in the background; the rows are plain objects, not reactive state.
    const rows = shallowRef(Catalog.all());
    const progress = ref(Catalog.progress());
    let stop = null;
    onMounted(() => {
      stop = Catalog.subscribe((p) => { rows.value = Catalog.all(); progress.value = p; });
      Catalog.loadAll().catch(() => { progress.value = { ...progress.value, done: true }; });
    });
    onBeforeUnmount(() => { if (stop) stop(); });

    const supplierMap = computed(() => new Map(store.state.suppliers.map((supplier) => [supplier.id, supplier])));
    const unknown = () => ({ id: '', name: t('Unverified supplier'), score: 0, risk: 99 });

    // Products that were already in the workspace before the catalog (a handful), made into the same light shape.
    const legacy = computed(() => store.state.products.filter((raw) => !String(raw.id).startsWith('ep-')).map((raw) => {
      const fallback = { id: `${raw.id}-preferred`, supplierId: raw.preferredSupplierId, price: Number(raw.rate || 0), leadDays: 7, stock: 100, terms: 'Net 30', compliant: true };
      const offers = (Array.isArray(raw.offers) && raw.offers.length ? raw.offers : [fallback]).map((offer, index) => ({ ...offer, id: String(offer.id || `${raw.id}-offer-${index}`).slice(0, 120), price: Math.max(0, Number(offer.price || raw.rate || 0)), leadDays: Math.max(1, Math.min(365, Number(offer.leadDays || 7))), stock: Math.max(0, Number(offer.stock || 0)), terms: String(offer.terms || 'Net 30').slice(0, 60), compliant: offer.compliant !== false, supplier: supplierMap.value.get(offer.supplierId) || unknown() })).filter((offer) => offer.price > 0 && offer.supplier.id).sort((a, b) => (b.compliant - a.compliant) || a.price - b.price);
      const best = offers.filter((offer) => offer.compliant)[0] || offers[0];
      if (!best) return null;
      const reference = Math.max(Number(raw.referencePrice || raw.rate || 0), ...offers.map((offer) => offer.price));
      const description = String(raw.description || raw.name || raw.id);
      return { id: raw.id, sku: String(raw.sku || raw.id.toUpperCase()), description, brand: raw.brand || '', price: best.price, reference, stock: best.stock, specs: raw.specs || {}, category: raw.category, group: '', source: 'state', savingsPercent: reference > 0 ? Math.max(0, Math.round((1 - best.price / reference) * 100)) : 0, hay: `${description} ${raw.sku || ''} ${raw.category} ${offers.map((o) => o.supplier.name).join(' ')}`.toLowerCase(), offers, best, currency: raw.currency || 'USD', unit: String(raw.unit || 'Each') };
    }).filter(Boolean));

    const everything = computed(() => [...rows.value, ...legacy.value]);
    const groups = computed(() => {
      const counts = new Map();
      everything.value.forEach((row) => counts.set(row.category, (counts.get(row.category) || 0) + 1));
      const order = (name) => { const i = GROUP_ORDER.indexOf(name); return i < 0 ? 100 : i; };
      return [...counts.entries()].sort((a, b) => order(a[0]) - order(b[0]) || b[1] - a[1]).map(([name, count]) => ({ name, count, icon: GROUP_ICONS[name] || 'fa-box' }));
    });
    const groupRank = computed(() => new Map(groups.value.map((group, index) => [group.name, index])));
    const brands = computed(() => {
      const counts = new Map();
      everything.value.forEach((row) => { if (row.brand && (!category.value || row.category === category.value)) counts.set(row.brand, (counts.get(row.brand) || 0) + 1); });
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([name]) => name).sort((a, b) => a.localeCompare(b));
    });
    const catalog = computed(() => {
      const words = query.value.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const list = everything.value.filter((row) => (!category.value || row.category === category.value) && (!brand.value || row.brand === brand.value) && (!showOnlySavings.value || row.savingsPercent > 0) && (!onlyStock.value || row.stock > 0) && words.every((word) => row.hay.includes(word)));
      const rank = groupRank.value;
      const by = {
        category: (a, b) => (rank.get(a.category) ?? 999) - (rank.get(b.category) ?? 999) || (b.stock > 0) - (a.stock > 0) || a.description.localeCompare(b.description),
        savings: (a, b) => b.savingsPercent - a.savingsPercent || a.price - b.price,
        price: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, name: (a, b) => a.description.localeCompare(b.description),
      };
      return list.sort(by[sort.value] || by.category);
    });

    // Only what is on screen becomes a full product record.
    const quickBase = computed(() => Need.quickQuoteSuppliers(store.state, [], 0));
    const quickList = (offers) => quickBase.value.filter((supplier) => !offers.some((offer) => offer.supplierId === supplier.id));
    const quickOf = (offers) => { const list = quickList(offers); return { quickCount: list.length, quickHours: list.length ? Math.min(...list.map((supplier) => Number(supplier.marketplace.responseHours || 24))) : 0 }; };
    const enrich = (row) => {
      if (!row) return null;
      const keySpecs = Object.values(row.specs || {}).slice(0, 4).join(' · ');
      if (row.source === 'state') return { ...row, referencePrice: row.reference, compliantOffers: row.offers.filter((o) => o.compliant).length, keySpecs, ...quickOf(row.offers) };
      const offer = { ...Catalog.offerOf(row), supplier: supplierMap.value.get(Catalog.SUPPLIER) || unknown() };
      return { ...row, unit: 'Each', currency: 'MXN', offers: [offer], best: offer, referencePrice: row.reference, compliantOffers: 1, keySpecs, ...quickOf([offer]) };
    };

    const visible = computed(() => catalog.value.slice(0, shown.value).map(enrich));
    const selectedRow = computed(() => everything.value.find((row) => row.id === selectedProductId.value) || catalog.value[0] || null);
    const selected = computed(() => enrich(selectedRow.value));
    const specRows = computed(() => Object.entries(selected.value?.specs || {}).filter(([key]) => key !== 'about').map(([key, value]) => ({ key, label: t(SPEC_LABELS[key] || key), value })));
    const aboutText = computed(() => selected.value?.specs?.about || '');
    // The tile shows a spinner while the photo loads, the photo when it is in, and an icon when it never comes.
    const photoLoaded = (event) => { event.target.parentElement.classList.add('is-loaded'); };
    const photoFailed = (event) => { event.target.style.display = 'none'; event.target.parentElement.classList.add('is-failed'); };
    const quickers = computed(() => selected.value ? quickList(selected.value.offers).slice(0, 5) : []);
    const metrics = computed(() => [
      { label: 'Catalog items', value: everything.value.length.toLocaleString() },
      { label: 'In stock', value: everything.value.filter((row) => row.stock > 0).length.toLocaleString() },
      { label: 'Categories', value: groups.value.length },
      { label: 'Suppliers who quote on request', value: quickBase.value.length },
    ]);

    const listCount = computed(() => store.state.shoppingList.length);
    const inList = (id) => store.state.shoppingList.some((line) => line.productId === id);
    const quantityInList = (id) => store.state.shoppingList.filter((line) => line.productId === id).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const selectProduct = (id) => { selectedProductId.value = id; const row = everything.value.find((item) => item.id === id); selectedOfferId.value = enrich(row)?.best?.id || ''; quantity.value = 1; tab.value = 'offers'; };
    watch(catalog, (list) => { if (!list.some((row) => row.id === selectedProductId.value)) selectProduct(list[0]?.id || ''); }, { immediate: true });
    watch([query, category, brand, sort, showOnlySavings, onlyStock], () => { shown.value = 24; });
    watch(category, () => { if (brand.value && !brands.value.includes(brand.value)) brand.value = ''; });
    const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    // A product goes on the list once per supplier choice; adding it again adds to the quantity. A catalog product becomes a workspace product the first time.
    const addToList = (product, offer, qty = 1) => {
      if (!canBuy.value || !product) return store.notice(t('Purchase request denied'), 'fa-shield-halved');
      const amount = Math.round(Number(qty));
      if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return store.notice(t('Enter a valid quantity'), 'fa-triangle-exclamation');
      const row = everything.value.find((item) => item.id === product.id);
      const record = row && row.source === 'catalog' ? Catalog.ensure(store.state, row) : store.state.products.find((item) => item.id === product.id);
      if (!record) return null;
      const listed = store.state.shoppingList[0] && store.state.products.find((item) => item.id === store.state.shoppingList[0].productId);
      if (listed && (listed.currency || 'USD') !== (record.currency || 'USD')) return store.notice(t('One list uses one currency; this item is priced in another'), 'fa-triangle-exclamation');
      const offerId = offer ? offer.id : 'quick';
      const same = store.state.shoppingList.find((line) => line.productId === record.id && line.offerId === offerId);
      if (same) same.quantity = Math.min(100000, (Number(same.quantity) || 0) + amount);
      else store.state.shoppingList.push({ id: `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, productId: record.id, description: record.description, quantity: amount, offerId });
      store.notice(`${record.description} · ${t('added to your list')}`, 'fa-cart-plus');
    };
    const openList = () => { tab.value = 'list'; nextTick(() => side.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
    const describeIt = () => { openList(); nextTick(() => { const panel = listPanel.value; if (panel && panel.$el) panel.$el.querySelector('.sl-custom')?.click(); }); };
    const resetFilters = () => { query.value = ''; category.value = ''; brand.value = ''; sort.value = 'category'; showOnlySavings.value = false; onlyStock.value = false; };
    return { store, t, money, query, category, brand, sort, showOnlySavings, onlyStock, groups, brands, everything, progress, catalog, visible, shown, metrics, selected, specRows, aboutText, photoLoaded, photoFailed, quickers, selectedProductId, selectedOfferId, quantity, canBuy, tab, side, listPanel, listCount, inList, quantityInList, selectProduct, initials, addToList, openList, describeIt, resetFilters };
  },
};
</script>
