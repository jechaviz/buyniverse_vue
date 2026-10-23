<template>
  <section class="sl" aria-live="polite">
    <header class="sl-head">
      <div>
        <p class="sl-eyebrow">{{ t('Shopping list') }}</p>
        <h2 class="sl-title">{{ lines.length ? `${lines.length} ${lines.length === 1 ? t('item') : t('items')}` : t('Your list is empty') }}</h2>
      </div>
      <button v-if="lines.length" type="button" class="sl-link" @click="clearList"><i class="fa-regular fa-trash-can"></i> {{ t('Clear') }}</button>
    </header>

    <p v-if="!lines.length" class="sl-empty">{{ t('Search what you need and press "Add to list". Add as many items as you want: monitors, computers, printers, keyboards.') }}</p>

    <ul v-else class="sl-lines">
      <li v-for="line in view" :key="line.id" class="sl-line">
        <div class="sl-line-top">
          <div class="min-w-0">
            <p class="sl-name">{{ line.raw.custom ? line.description : line.description }}</p>
            <p v-if="line.spec" class="sl-sub">{{ line.spec }}</p>
          </div>
          <button type="button" class="sl-x" :aria-label="t('Remove')" @click="remove(line.id)"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="sl-line-mid">
          <label class="sl-qty"><span class="sr-only">{{ t('Quantity') }}</span>
            <button type="button" :aria-label="t('Less')" @click="bump(line.raw, -1)"><i class="fa-solid fa-minus"></i></button>
            <input v-model.number="line.raw.quantity" type="number" min="1" max="100000" step="1" inputmode="numeric" @change="fixQuantity(line.raw)" />
            <button type="button" :aria-label="t('More')" @click="bump(line.raw, 1)"><i class="fa-solid fa-plus"></i></button>
          </label>
          <select v-if="line.product" v-model="line.raw.offerId" class="field sl-pick" :aria-label="t('Supplier')">
            <option v-for="offer in line.product.offers" :key="offer.id" :value="offer.id">{{ supplierName(offer.supplierId) }} · {{ money(offer.price) }}</option>
            <option value="quick">{{ t('Ask for a quick offer') }}</option>
          </select>
          <label v-else class="sl-budget">{{ t('Budget per unit') }}
            <input v-model.number="line.raw.budget" class="field" type="number" min="1" step="any" inputmode="decimal" />
          </label>
        </div>
        <p class="sl-line-bot">
          <template v-if="line.offer"><b>{{ money(line.offer.price * line.raw.quantity) }}</b><span>{{ line.offer.leadDays }} {{ t('days') }} · {{ line.offer.terms }}</span><span v-if="line.saving > 0" class="sl-save">−{{ money(line.saving) }} {{ t('vs reference') }}</span></template>
          <template v-else><b>≈ {{ money(line.estimate * line.raw.quantity) }}</b><span><i class="fa-regular fa-clock"></i> {{ t('Suppliers will send their offer') }}</span></template>
        </p>
      </li>
    </ul>

    <button v-if="!adding" type="button" class="sl-custom" @click="adding = true"><i class="fa-solid fa-circle-plus"></i> {{ t("I can't find it: describe what I need") }}</button>
    <form v-else class="sl-form" @submit.prevent="addCustom">
      <label>{{ t('What do you need?') }}<input v-model.trim="draft.description" class="field" maxlength="160" :placeholder="t('Example: 42U floor rack with ventilation')" required /></label>
      <label>{{ t('Details (size, model, brand)') }}<input v-model.trim="draft.spec" class="field" maxlength="300" /></label>
      <div class="sl-form-row">
        <label>{{ t('Quantity') }}<input v-model.number="draft.quantity" class="field" type="number" min="1" max="100000" step="1" required /></label>
        <label>{{ t('Budget per unit') }}<input v-model.number="draft.budget" class="field" type="number" min="1" step="any" required /></label>
      </div>
      <div class="sl-form-actions"><button type="button" class="ct-ghost" @click="adding = false">{{ t('Cancel') }}</button><button class="ct-go">{{ t('Add to list') }}</button></div>
    </form>

    <template v-if="lines.length">
      <div v-if="quickLines.length" class="sl-quick">
        <label>{{ t('I need their offers within') }}
          <select v-model.number="hours" class="field">
            <option v-for="option in windows" :key="option.hours" :value="option.hours">{{ option.label }}</option>
          </select>
        </label>
        <p :class="inviteCount >= 2 ? 'sl-ok' : 'sl-warn'">
          <i class="fa-solid" :class="inviteCount >= 2 ? 'fa-bolt' : 'fa-triangle-exclamation'"></i>
          <template v-if="inviteCount >= 2">{{ inviteCount }} {{ t('suppliers can send an offer in that time') }}</template>
          <template v-else>{{ t('Fewer than two suppliers answer that fast; allow more time.') }}</template>
        </p>
      </div>

      <dl class="sl-total">
        <div v-if="pricedLines.length"><dt>{{ t('With a price list') }} ({{ pricedLines.length }})</dt><dd>{{ money(pricedTotal) }}</dd></div>
        <div v-if="quickLines.length"><dt>{{ t('Waiting for offers') }} ({{ quickLines.length }})</dt><dd>≈ {{ money(quickTotal) }}</dd></div>
        <div v-if="savingTotal > 0" class="sl-save-row"><dt>{{ t('You save against the reference') }}</dt><dd>{{ money(savingTotal) }}</dd></div>
      </dl>

      <ol class="sl-plan">
        <li v-if="pricedLines.length"><i class="fa-solid fa-file-invoice"></i> {{ pricedGroups }} {{ pricedGroups === 1 ? t('purchase request, one per supplier') : t('purchase requests, one per supplier') }}</li>
        <li v-if="quickLines.length"><i class="fa-solid fa-bolt"></i> {{ t('One quick quote (RFQ) with the items without a price') }}</li>
      </ol>

      <button type="button" class="ct-go sl-publish" :disabled="busy || !canBuy || (quickLines.length > 0 && inviteCount < 2)" @click="publish"><i class="fa-solid fa-paper-plane mr-1"></i>{{ pricedLines.length && !quickLines.length ? t('Create purchase requests') : quickLines.length && !pricedLines.length ? t('Ask for offers') : t('Send my list') }}</button>
      <p v-if="!canBuy" class="sl-warn">{{ t('Only buyers can publish a list.') }}</p>
    </template>

    <div v-if="result" class="sl-result" role="status">
      <p class="sl-result-title"><i class="fa-solid fa-circle-check"></i> {{ result.pending ? t('List sent for approval') : t('List published') }}</p>
      <p v-if="result.priced">{{ result.priced }} {{ result.priced === 1 ? t('purchase request created') : t('purchase requests created') }}.</p>
      <p v-if="result.quick">{{ result.event ? t('The quick quote is open: suppliers are answering.') : t('The quick quote opens when it is approved.') }}</p>
      <p class="sl-result-links">
        <RouterLink v-if="result.event" :to="`/procurement/sourcing?event=${result.event.id}`">{{ t('See the offers') }}</RouterLink>
        <RouterLink to="/procurement/queue">{{ t('Purchase requests') }}</RouterLink>
      </p>
    </div>
  </section>
</template>

<script>
const { inject, computed, ref, reactive } = Vue;

export default {
  emits: ['changed'],
  setup(props, { emit }) {
    const store = inject('store');
    const t = (key) => store.t(key);
    if (!Array.isArray(store.state.shoppingList)) store.state.shoppingList = [];
    const adding = ref(false), busy = ref(false), result = ref(null), hours = ref(24);
    const draft = reactive({ description: '', spec: '', quantity: 1, budget: null });
    const windows = [{ hours: 2, label: t('2 hours') }, { hours: 4, label: t('4 hours') }, { hours: 8, label: t('8 hours (one working day)') }, { hours: 24, label: t('24 hours') }, { hours: 48, label: t('2 days') }, { hours: 72, label: t('3 days') }];
    const lines = computed(() => store.state.shoppingList);
    // One list is in one currency: the one of its first catalog item (custom items are budgeted in it).
    const currency = computed(() => { const first = lines.value.map((line) => store.state.products.find((item) => item.id === line.productId)).find(Boolean); return (first && first.currency) || 'MXN'; });
    const money = (value) => store.money(value, currency.value);
    const canBuy = computed(() => store.isBuyer.value || store.isAdmin.value);
    const supplierName = (id) => store.state.suppliers.find((supplier) => supplier.id === id)?.name || t('Unverified supplier');
    const view = computed(() => lines.value.map((raw) => {
      const product = raw.productId ? store.state.products.find((item) => item.id === raw.productId) : null;
      const offer = product && raw.offerId !== 'quick' ? product.offers.find((item) => item.id === raw.offerId) || null : null;
      const estimate = Number(raw.budget) > 0 ? Number(raw.budget) : product ? Number(product.referencePrice || product.rate) : 0;
      const quantity = Number(raw.quantity) || 1;
      const saving = offer && product ? Math.max(0, (Number(product.referencePrice || offer.price) - offer.price) * quantity) : 0;
      return { id: raw.id, raw, product, offer, estimate, saving, description: raw.description, spec: raw.spec || (product ? Object.values(product.specs || {}).slice(1, 4).join(' · ') : '') };
    }));
    const pricedLines = computed(() => view.value.filter((line) => line.offer));
    const quickLines = computed(() => view.value.filter((line) => !line.offer));
    const pricedTotal = computed(() => pricedLines.value.reduce((sum, line) => sum + line.offer.price * (Number(line.raw.quantity) || 1), 0));
    const quickTotal = computed(() => quickLines.value.reduce((sum, line) => sum + line.estimate * (Number(line.raw.quantity) || 1), 0));
    const savingTotal = computed(() => pricedLines.value.reduce((sum, line) => sum + line.saving, 0));
    const pricedGroups = computed(() => new Set(pricedLines.value.map((line) => line.offer.supplierId)).size);
    const inviteCount = computed(() => window.BuyniverseNeed.quickQuoteSuppliers(store.state, quickLines.value.map((line) => line.raw.productId), hours.value).length);

    const fixQuantity = (raw) => { const n = Math.round(Number(raw.quantity)); raw.quantity = Number.isFinite(n) ? Math.max(1, Math.min(100000, n)) : 1; };
    const bump = (raw, step) => { raw.quantity = Math.max(1, Math.min(100000, (Number(raw.quantity) || 1) + step)); };
    const remove = (id) => { const i = store.state.shoppingList.findIndex((line) => line.id === id); if (i >= 0) store.state.shoppingList.splice(i, 1); result.value = null; emit('changed'); };
    const clearList = () => { store.state.shoppingList.splice(0); result.value = null; emit('changed'); };
    const addCustom = () => {
      const quantity = Math.round(Number(draft.quantity)), budget = Number(draft.budget);
      if (draft.description.length < 3 || !(quantity >= 1) || !(budget > 0)) return store.notice(t('Complete what you need, the quantity and your maximum budget'), 'fa-triangle-exclamation');
      store.state.shoppingList.push({ id: `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, productId: null, description: draft.description, spec: draft.spec, quantity, budget, offerId: 'quick', custom: true });
      Object.assign(draft, { description: '', spec: '', quantity: 1, budget: null }); adding.value = false; result.value = null; emit('changed');
    };
    const publish = () => {
      if (busy.value) return;
      busy.value = true;
      try {
        const out = store.publishShoppingList({ hours: hours.value, lines: view.value.map((line) => ({ productId: line.raw.productId, description: line.description, quantity: Number(line.raw.quantity), offerId: line.offer ? line.offer.id : undefined, budget: line.raw.custom ? Number(line.raw.budget) : undefined, spec: line.raw.custom ? line.raw.spec : undefined })) });
        if (out) { result.value = out; store.state.shoppingList.splice(0); store.notice(out.pending ? t('List sent for approval') : t('List published'), 'fa-paper-plane'); emit('changed'); }
      } finally { busy.value = false; }
    };

    return { store, t, money, lines, view, adding, busy, result, hours, windows, draft, canBuy, supplierName, pricedLines, quickLines, pricedTotal, quickTotal, savingTotal, pricedGroups, inviteCount, fixQuantity, bump, remove, clearList, addCustom, publish };
  },
};
</script>
