<template>
  <article class="sv">
    <header class="sv-head">
      <div>
        <p class="sv-kicker">{{ store.t(kicker) }}</p>
        <h2 class="sv-title">{{ store.t(title) }}</h2>
      </div>
      <div class="sv-tools">
        <label v-if="configurable" class="sv-fee">
          <span>{{ store.t('Service fee') }}</span>
          <select :value="model.successFeeRate || 40" :aria-label="store.t('Service fee')" @change="updateRate">
            <option v-for="rate in feeRates" :key="rate" :value="rate">{{ rate }}%</option>
          </select>
        </label>
        <span class="sv-state" :class="{ 'is-live': model.state !== 'realized' }"><i></i>{{ store.t(model.state === 'realized' ? 'Realized at award' : 'Live potential') }}</span>
      </div>
    </header>

    <div class="sv-big">
      <span>{{ store.t('Total savings') }}</span>
      <b><AnimatedNumber money :value="Number(model.totalSavings) || 0" :currency="model.currency || 'USD'" /></b>
    </div>

    <div v-if="bar" class="sv-bar" role="img" :aria-label="`${store.t('Budget baseline')} ${display(model.budget)}, ${store.t('Total savings')} ${display(model.totalSavings)}`">
      <i class="is-paid" :style="{ width: ready ? bar.paid + '%' : '0%' }"></i>
      <i class="is-first" :style="{ width: ready ? bar.first + '%' : '0%' }"></i>
      <i class="is-final" :style="{ width: ready ? bar.final + '%' : '0%' }"></i>
    </div>

    <dl class="sv-legend">
      <div v-for="step in steps" :key="step.key" :class="'is-' + step.key">
        <dt>{{ store.t(step.label) }}</dt>
        <dd>{{ display(step.value) }}</dd>
        <small>{{ step.note }}</small>
      </div>
    </dl>

    <p class="sv-foot">
      {{ store.t('Service fee') }} {{ model.successFeeRate || 40 }}% {{ store.t('of validated savings') }} · <b>{{ display(model.outcomeShare) }}</b>
      <span class="sv-dot"></span>{{ store.t('Net buyer savings') }} <b class="is-net">{{ display(model.netSavings) }}</b>
    </p>
  </article>
</template>

<script>
const { inject, ref, computed, onMounted, defineAsyncComponent } = Vue;
const AnimatedNumber = defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule("./app/components/AnimatedNumber.vue?v=1", window.sfcOptions));

export default {
  components: { AnimatedNumber },
  props: {
    model: { type: Object, default: () => ({}) },
    title: { type: String, default: 'Savings waterfall' },
    kicker: { type: String, default: 'Commercial intelligence' },
    configurable: { type: Boolean, default: false },
  },
  emits: ['change-service-fee'],
  setup(props, { emit }) {
    const store = inject('store');
    const feeRates = [10, 20, 25, 30, 35, 40, 45, 50];
    const ready = ref(false);
    onMounted(() => setTimeout(() => { ready.value = true; }, 120));
    const display = (value) => store.money(Number(value) || 0, props.model.currency || 'USD');
    const updateRate = (event) => {
      const rate = Number(event?.target?.value);
      if (Number.isFinite(rate)) emit('change-service-fee', rate);
    };
    // The budget as one bar: what you pay, what the first offers saved, what the live bids saved on top.
    const bar = computed(() => {
      const budget = Number(props.model.budget) || 0, first = Number(props.model.bestFirst) || budget, final = Number(props.model.bestFinal) || first;
      if (budget <= 0 || final > budget) return null;
      const pct = (n) => Math.max(0, Math.min(100, (n / budget) * 100));
      return { paid: pct(final), first: pct(budget - first), final: pct(first - final) };
    });
    const steps = computed(() => [
      { key: 'budget', label: 'Budget baseline', value: props.model.budget, note: store.t('Approved commercial ceiling') },
      { key: 'first', label: 'Best first offer', value: props.model.bestFirst, note: `${store.t('Financial savings')} · ${display(props.model.financialSavings)}` },
      { key: 'final', label: 'Best final offer', value: props.model.bestFinal, note: `${store.t('Buyniverse savings')} · ${display(props.model.buyniverseSavings)}` },
    ]);
    return { store, steps, display, feeRates, updateRate, bar, ready };
  },
};
</script>
