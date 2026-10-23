<template>
  <div class="vt">
    <section class="vt-bar">
      <div class="vt-intro">
        <p class="vt-eyebrow"><i class="fa-solid fa-masks-theater"></i> {{ t('Virtual team') }}</p>
        <p>{{ t('Everyone here is simulated, only for this demo: they bid, ask questions, answer and email each other like real suppliers would.') }}</p>
      </div>
      <div class="vt-controls">
        <div class="vt-speed" role="group" :aria-label="t('Speed')">
          <button v-for="option in speeds" :key="option" type="button" :class="{ 'is-on': settings.speed === option }" @click="store.castSetSpeed(option)">{{ option === 0.5 ? '½' : option }}×</button>
        </div>
        <button type="button" class="ct-ghost" @click="store.castTogglePause()"><i class="fa-solid" :class="settings.paused ? 'fa-play' : 'fa-pause'"></i> {{ settings.paused ? t('Resume the simulation') : t('Pause the simulation') }}</button>
        <button type="button" class="ct-go" @click="$emit('restart')"><i class="fa-solid fa-rotate-right"></i> {{ t('Start another demo round') }}</button>
      </div>
    </section>

    <section class="vt-grid">
      <article v-for="row in rows" :key="row.supplierId" class="vt-card" :class="{ 'is-lead': row.leading, 'is-out': row.retired }">
        <header>
          <span class="vt-av">{{ initials(row.name) }}</span>
          <div class="min-w-0"><b>{{ row.name }}</b><small>{{ t(styleLabel(row.style)) }}</small></div>
          <span class="vt-chip" :class="row.leading ? 'on' : row.retired ? 'off' : ''">{{ row.leading ? t('Leading') : row.retired ? t('Withdrew') : row.bids ? t('Bidding') : t('Waiting') }}</span>
        </header>
        <p class="vt-bid">{{ row.lastBid ? store.money(row.lastBid, auction.currency) : '—' }}<small>{{ row.bids }} {{ t('bids') }}</small></p>
        <ul class="vt-team">
          <li v-for="member in row.members" :key="member.id"><span class="vt-dot" :class="`r-${member.team.role}`"></span><b>{{ member.name }}</b><small>{{ title(member) }}</small><em>{{ member.email }}</em></li>
        </ul>
      </article>
    </section>

    <section class="vt-buyer">
      <p class="vt-eyebrow"><i class="fa-solid fa-building"></i> {{ t("The buyer's own team") }}</p>
      <ul class="vt-team">
        <li v-for="member in buyerTeam" :key="member.id"><span class="vt-dot" :class="`r-${member.team.role}`"></span><b>{{ member.name }}</b><small>{{ title(member) }}</small><em>{{ member.email }}</em></li>
      </ul>
      <p class="vt-hint">{{ t('If you do not answer a supplier question, the buyer team does after a while. Write in Messages and the suppliers reply.') }}</p>
    </section>

    <SimulatedMailbox context-type="auction" :context-id="auction.id" />
  </div>
</template>

<script>
const { inject, computed } = Vue;
const load = (p) => Vue.defineAsyncComponent(() => window['vue3-sfc-loader'].loadModule(p, window.sfcOptions));

export default {
  components: { SimulatedMailbox: load('./app/components/SimulatedMailbox.vue?v=1') },
  props: { auction: { type: Object, required: true } },
  emits: ['restart'],
  setup(props) {
    const store = inject('store');
    const t = (key) => store.t(key);
    const settings = computed(() => store.castSettings());
    const rows = computed(() => store.castPeople('auction', props.auction.id));
    const buyerTeam = computed(() => store.state.users.filter((user) => user.virtual && user.team?.side === 'buyer'));
    const locale = () => (store.locale?.value === 'en' ? 'en' : 'es');
    const title = (member) => member.team?.title?.[locale()] || member.team?.title?.es || '';
    const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const styleLabel = (style) => ({ steady: 'Steady bidder', aggressive: 'Aggressive bidder', cautious: 'Cautious bidder', bluffer: 'Opens with a big drop', sniper: 'Bids in the last seconds' }[style] || 'Steady bidder');
    return { store, t, settings, rows, buyerTeam, title, initials, styleLabel, speeds: [0.5, 1, 2, 4] };
  },
};
</script>
