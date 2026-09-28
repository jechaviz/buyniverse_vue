<template>
  <footer class="bn bn-footer">
    <div class="bn-wrap">
      <div class="bn-footer__grid">
        <div class="bn-stack" style="grid-column: 1 / -1; max-width: 380px">
          <BnLogo />
          <p class="bn-muted" style="margin: 0; font-size: 0.92rem; line-height: 1.6">
            {{ store.t("The marketplace where companies find, compare and hire suppliers for every kind of purchase, from software licences to freight.") }}
          </p>
        </div>
        <div v-for="column in columns" :key="column.title">
          <h4>{{ store.t(column.title) }}</h4>
          <ul>
            <li v-for="item in column.items" :key="item.to"><RouterLink :to="item.to">{{ store.t(item.label) }}</RouterLink></li>
          </ul>
        </div>
      </div>
      <hr class="bn-divider" style="margin: 36px 0 20px" />
      <div class="bn-row" style="justify-content: space-between; flex-wrap: wrap; font-size: 0.82rem; color: var(--bn-faint)">
        <span>© {{ year }} Buyniverse</span>
        <span>{{ store.t("CFDI 4.0 invoicing · Escrow payments · Audited reverse auctions") }}</span>
      </div>
    </div>
  </footer>
</template>

<script>
const { inject, defineAsyncComponent } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const BnLogo = load("./app/experience/BnLogo.vue?v=3");

export default {
  components: { BnLogo },
  setup() {
    const columns = [
      { title: "Buy", items: [{ to: "/marketplace", label: "Find suppliers" }, { to: "/browse-services", label: "Services" }, { to: "/find-talent", label: "Talent" }, { to: "/procurement/auction", label: "Live auctions" }] },
      { title: "Sectors", items: [{ to: "/marketplace?sector=technology", label: "Technology" }, { to: "/marketplace?sector=services", label: "Professional services" }, { to: "/marketplace?sector=operations", label: "Operations & industry" }, { to: "/marketplace?sector=logistics", label: "Logistics" }] },
      { title: "Sell", items: [{ to: "/find-work", label: "Find work" }, { to: "/procurement/sourcing", label: "Open RFQs" }, { to: "/onboarding", label: "List your company" }] },
    ];
    return { store: inject("store"), columns, year: new Date().getFullYear() };
  },
};
</script>
