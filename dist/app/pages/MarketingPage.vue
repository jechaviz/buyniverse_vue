<template>
  <section class="bn-mkt" aria-labelledby="mkt-title">
    <header class="bn-mkt__head">
      <p class="bn-mkt__eyebrow"><i class="fa-solid fa-bullhorn"></i>{{ t("Marketing") }}</p>
      <h1 id="mkt-title">{{ t("Savings campaigns") }}</h1>
      <p class="bn-mkt__lead">{{ t("Build a tracked link to the public savings calculator, copy an ad that makes no promise, and check what has really happened.") }}</p>
    </header>

    <section class="bn-mkt__card" aria-labelledby="mkt-link">
      <h2 id="mkt-link">{{ t("1. Tracked link") }}</h2>
      <div class="bn-mkt__grid">
        <label class="bn-mkt__field" for="mkt-name">
          <span>{{ t("Campaign name") }}</span>
          <input id="mkt-name" v-model="campaign" class="bn-input" maxlength="60" autocomplete="off" />
        </label>
        <label class="bn-mkt__field" for="mkt-channel">
          <span>{{ t("Channel") }}</span>
          <select id="mkt-channel" v-model="channel" class="bn-input">
            <option v-for="item in CHANNELS" :key="item.id" :value="item.id">{{ t(item.label) }}</option>
          </select>
        </label>
      </div>
      <p class="bn-mkt__url"><code>{{ link }}</code></p>
      <p class="bn-mkt__hint">{{ t("The link opens the public calculator. It carries the campaign name and channel, and no personal data.") }}</p>
    </section>

    <section class="bn-mkt__card" aria-labelledby="mkt-copy">
      <h2 id="mkt-copy">{{ t("2. Ad copy that makes no promise") }}</h2>
      <article v-for="(item, index) in copies" :key="index" class="bn-mkt__copy">
        <p>{{ item }}</p>
        <button type="button" class="bn-btn bn-btn--ghost" @click="copy(item)"><i class="fa-regular fa-copy"></i>{{ t("Copy") }}</button>
      </article>
      <p class="bn-mkt__warn"><i class="fa-solid fa-triangle-exclamation"></i>{{ t("Every saving quoted must be the calculator's estimate or a result from a real purchase. Review any figure with the legal team before publishing it in an ad.") }}</p>
    </section>

    <section class="bn-mkt__card" aria-labelledby="mkt-results">
      <h2 id="mkt-results">{{ t("3. Real results so far") }}</h2>
      <template v-if="!isDemo && realized.auctions">
        <dl class="bn-mkt__figures">
          <div><dt>{{ t("Completed purchases") }}</dt><dd>{{ realized.auctions }}</dd></div>
          <div><dt>{{ t("Savings achieved") }}</dt><dd>{{ money(realized.totalSavings) }}</dd></div>
          <div><dt>{{ t("Kept by buyers") }}</dt><dd>{{ money(realized.netSavings) }}</dd></div>
        </dl>
        <p class="bn-mkt__hint">{{ t("Only purchases that are closed or awarded are counted.") }}</p>
      </template>
      <p v-else class="bn-mkt__hint">{{ isDemo ? t("The demo has no real results and it never feeds advertising.") : t("No completed purchases yet. Results appear here once a purchase is awarded.") }}</p>
    </section>
  </section>
</template>

<script>
const { inject, ref, computed } = Vue;

const CHANNELS = [
  { id: "facebook", label: "Facebook", medium: "social" },
  { id: "instagram", label: "Instagram", medium: "social" },
  { id: "email", label: "Email", medium: "email" },
  { id: "google", label: "Google", medium: "cpc" },
  { id: "other", label: "Other", medium: "referral" },
];

export default {
  name: "MarketingPage",
  setup() {
    const store = inject("store");
    const t = (text) => store.t(text);
    const isDemo = computed(() => Boolean(store.isDemo.value));
    const campaign = ref("ahorro-calculadora");
    const channel = ref("facebook");

    // Lower-case, dashes only: the campaign name ends up in a URL.
    const slug = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "campana";
    const picked = computed(() => CHANNELS.find((item) => item.id === channel.value) || CHANNELS[0]);
    const link = computed(() => {
      const params = new URLSearchParams({ utm_source: picked.value.id, utm_medium: picked.value.medium, utm_campaign: slug(campaign.value) });
      return `https://buyniverse.com/ahorro?${params.toString()}`;
    });

    // No copy here names a saving or a percentage the product has not measured for that buyer.
    const copies = computed(() => [
      t("Before you buy, see what you would keep after the fee. Estimate it in seconds:") + " " + link.value,
      t("Same product, several offers. Compare what each one would really save you:") + " " + link.value,
      t("Buying for your company? Put a budget and an offer in the calculator and see the difference:") + " " + link.value,
    ]);

    const realized = computed(() => {
      const portfolio = window.BuyniverseCommercialMetrics?.portfolio(store.state) || { primary: {} };
      const primary = portfolio.primary || {};
      return { auctions: primary.realizedAuctions || 0, totalSavings: primary.totalSavings || 0, netSavings: primary.netSavings || 0, currency: primary.currency || "USD" };
    });
    const money = (value) => new Intl.NumberFormat(store.locale.value === "en" ? "en-US" : "es-MX", { style: "currency", currency: realized.value.currency, maximumFractionDigits: 2 }).format(value || 0);

    const copy = async (text) => {
      try { await navigator.clipboard.writeText(text); store.notice(t("Copied"), "fa-copy"); }
      catch (_) { store.notice(t("Could not copy. Select the text and copy it by hand."), "fa-triangle-exclamation"); }
    };

    return { t, CHANNELS, campaign, channel, link, copies, realized, money, copy, isDemo };
  },
};
</script>
