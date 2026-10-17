<template>
  <main class="bn bn-sav" aria-labelledby="savings-title">
    <section class="bn-sav__hero">
      <div class="bn-wrap">
        <p class="bn-sav__eyebrow"><i class="fa-solid fa-calculator"></i>{{ t("Savings calculator") }}</p>
        <h1 id="savings-title" class="bn-sav__title">{{ t("What would you keep after Buyniverse's fee?") }}</h1>
        <p class="bn-sav__lead">{{ t("Enter what you planned to pay and one offer you received. We show the saving, the fee and what stays with you.") }}</p>
      </div>
    </section>

    <div class="bn-wrap bn-sav__layout">
      <form class="bn-sav__form" @submit.prevent="recalculate">
        <label class="bn-sav__field" for="sav-budget">
          <span>{{ t("Your budget") }}</span>
          <input id="sav-budget" v-model.number="budget" class="bn-input" type="number" min="0" step="0.01" inputmode="decimal" />
        </label>
        <label class="bn-sav__field" for="sav-offer">
          <span>{{ t("An offer you received") }}</span>
          <input id="sav-offer" v-model.number="offer" class="bn-input" type="number" min="0" step="0.01" inputmode="decimal" />
        </label>
        <p class="bn-sav__note">{{ t("The figures are an example for this single comparison. Change them to see your own.") }}</p>
      </form>

      <section class="bn-sav__result" aria-live="polite" :aria-label="t('Result')">
        <template v-if="result.valid">
          <dl class="bn-sav__figures">
            <div><dt>{{ t("Saving") }}</dt><dd>{{ money(result.savings) }}</dd></div>
            <div><dt>{{ t("Buyniverse fee") }}</dt><dd>{{ money(result.fee) }}</dd></div>
            <div class="bn-sav__net"><dt>{{ t("You keep") }}</dt><dd>{{ money(result.net) }}</dd></div>
          </dl>
          <p class="bn-sav__pct">{{ result.savings > 0 ? t("That is {percent}% below your budget.", { percent: result.percentSaved }) : t("This offer is not below your budget, so there is no saving.") }}</p>
          <p class="bn-sav__rule">{{ rule }}</p>
        </template>
        <p v-else class="bn-sav__empty">{{ t("Enter a budget above zero and an offer of zero or more to see the estimate.") }}</p>
      </section>
    </div>

    <section class="bn-wrap bn-sav__honest">
      <h2>{{ t("What this number is, and what it is not") }}</h2>
      <ul>
        <li>{{ t("It is an estimate for one comparison. It is not a quote and not a promise of savings.") }}</li>
        <li>{{ t("Real results depend on the offers each buyer receives in its own purchase.") }}</li>
        <li>{{ t("The fee is calculated on the saving, with a floor and a cap, by the same rule as your dashboard.") }}</li>
      </ul>
      <a class="bn-btn bn-btn--primary" href="/necesito"><i class="fa-solid fa-bolt"></i>{{ t("Publish a need and compare real offers") }}</a>
    </section>
  </main>
</template>

<script>
const { inject, ref, computed } = Vue;

export default {
  name: "SavingsPage",
  setup() {
    const store = inject("store");
    const t = (text, vars) => {
      let out = store.t(text);
      if (vars) for (const [key, value] of Object.entries(vars)) out = out.replace(`{${key}}`, String(value));
      return out;
    };
    const budget = ref(1000000), offer = ref(800000);
    const result = computed(() => window.BuyniverseSavings.estimate({ budget: budget.value, offer: offer.value }));
    const money = (value) => new Intl.NumberFormat(store.locale.value === "en" ? "en-US" : "es-MX", { style: "currency", currency: result.value.currency || "MXN", maximumFractionDigits: 2 }).format(value || 0);
    // Which rule decided the fee, in words: a saving share, the floor, or the cap.
    const rule = computed(() => {
      const r = result.value;
      if (r.basis === "floor") return t("With little or no saving, a floor applies: {floor}% of what you award, and at least a fixed minimum.", { floor: r.floorPercent });
      if (r.basis === "cap") return t("The fee never exceeds {cap}% of what you award, and that limit applies here.", { cap: r.capPercent });
      return t("The fee is {rate}% of the saving. It never exceeds {cap}% of what you award.", { rate: r.ratePercent, cap: r.capPercent });
    });
    // The estimate is live as the fields change; Enter in a field just keeps the current figures.
    const recalculate = () => {};
    return { t, budget, offer, result, money, rule, recalculate };
  },
};
</script>
