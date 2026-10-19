<template>
  <section class="space-y-6">
    <header>
      <p class="premium-kicker text-xs font-bold uppercase text-brand">Account</p>
      <h1 class="premium-title mt-2 text-3xl font-800">Billing & folios</h1>
    </header>

    <!-- Demo: folios are simulated in the browser. -->
    <div v-if="isDemo" class="grid gap-5 lg:grid-cols-3">
      <article class="panel p-6">
        <p class="text-sm text-slate-500">Available folios</p>
        <p class="mt-2 text-4xl font-800">{{ user.folioBalance || 0 }}</p>
        <form class="mt-5 flex items-end gap-2" @submit.prevent="purchase">
          <label class="flex-1"><span class="mb-1 block text-xs font-bold">Folios to buy</span><input v-model.number="quantity" class="field" type="number" min="1" max="100" step="1" required></label>
          <button class="btn-brand">Buy</button>
        </form>
      </article>
      <article class="panel p-6 lg:col-span-2">
        <h2 class="font-800">Recent transactions</h2>
        <div v-for="transaction in transactions" :key="transaction.id" class="mt-4 flex justify-between border-b border-slate-100 pb-3">
          <span><b>{{ transaction.description }}</b><small class="mt-1 block text-slate-500">{{ store.date(transaction.date) }}</small></span><b>{{ store.money(transaction.amount) }}</b>
        </div>
        <p v-if="!transactions.length" class="mt-5 text-slate-500">No billing activity.</p>
      </article>
    </div>

    <!-- Production: what the server holds for this company. -->
    <template v-else>
      <article class="panel p-6">
        <p class="text-sm text-slate-500">{{ store.t("Stamps available") }}</p>
        <p class="mt-2 text-4xl font-800">{{ stamps === null ? "…" : stamps }}</p>
        <p class="mt-3 text-sm text-slate-500">{{ store.t("Stamps are credited by Buyniverse once a payment is confirmed. Manage them in your company setup.") }} <RouterLink to="/setup" class="text-brand font-bold">{{ store.t("Company setup") }}</RouterLink></p>
      </article>

      <article class="panel p-6">
        <h2 class="font-800">{{ store.t("Award fees") }}</h2>
        <p class="mt-2 text-sm text-slate-500">{{ store.t("The fee for each closed award, computed by the server from the live-auction ledger.") }}</p>
        <p v-if="fees === null" class="mt-4 text-sm text-slate-500">{{ store.t("Loading…") }}</p>
        <p v-else-if="!fees.length" class="mt-4 text-sm text-slate-500">{{ store.t("No awards settled yet.") }}</p>
        <table v-else class="mt-4 w-full text-sm">
          <thead><tr class="text-left text-xs text-slate-500"><th class="pb-2">{{ store.t("Auction") }}</th><th class="pb-2">{{ store.t("Saving") }}</th><th class="pb-2">{{ store.t("Fee") }}</th><th class="pb-2">{{ store.t("Status") }}</th></tr></thead>
          <tbody>
            <tr v-for="fee in fees" :key="fee.id" class="border-t border-slate-100">
              <td class="py-2">{{ fee.auctionRef }}</td>
              <td class="py-2">{{ money(fee.savingCents, fee.currency) }}</td>
              <td class="py-2 font-bold">{{ money(fee.feeCents, fee.currency) }}</td>
              <td class="py-2">{{ store.t(STATUS[fee.status] || fee.status) }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </template>
  </section>
</template>
<script>
const { inject, computed, ref, onMounted } = Vue;
const STATUS = { informative: "Informative", pending: "Pending", paid: "Collected", waived: "Waived" };

export default {
  setup() {
    const store = inject("store"), user = store.currentUser, quantity = ref(10);
    const isDemo = computed(() => Boolean(store.isDemo.value));
    const transactions = computed(() => store.state.transactions.filter((item) => item.userId === user.value.id));
    const stamps = ref(null), fees = ref(null);

    function purchase() {
      const amount = Number(quantity.value);
      if (!Number.isInteger(amount) || amount < 1 || amount > 100) return store.notice("Choose between 1 and 100 folios", "fa-triangle-exclamation");
      user.value.folioBalance = (user.value.folioBalance || 0) + amount;
      store.state.transactions.unshift({ id: window.ProcurementCommon.uid("txn"), userId: user.value.id, type: "Folio purchase", amount: -amount * 5, date: new Date().toISOString(), description: `Purchased ${amount} CFDI folios` });
      store.notice("Folios added");
    }
    const money = (cents, currency) => new Intl.NumberFormat(store.locale.value === "es" ? "es-MX" : "en-US", { style: "currency", currency: currency || "MXN" }).format(Number(cents || 0) / 100);

    onMounted(async () => {
      if (isDemo.value) return;
      fees.value = await window.BuyniverseCommerce.settlements();
      try { const status = await window.BuyniverseSetup.status(); stamps.value = Number(status?.company?.issuance?.stampsBalance ?? 0); }
      catch (_) { stamps.value = 0; }
    });

    return { store, user, quantity, transactions, purchase, isDemo, stamps, fees, money, STATUS };
  },
};
</script>
