<template>
  <ol class="pl-rail" :aria-label="store.t('Purchasing pipeline')">
    <li>
      <RouterLink to="/procurement/cockpit" class="pl-rail__home" :aria-current="active === 'cockpit' ? 'page' : undefined">
        <i class="fa-solid fa-house text-sm" aria-hidden="true"></i>
        <b class="text-xs">{{ store.t("Overview") }}</b>
      </RouterLink>
    </li>
    <template v-for="(stage, index) in stages" :key="stage.key">
      <li aria-hidden="true"><span class="pl-link" :class="linkClass(index)"></span></li>
      <li>
        <RouterLink :to="`/procurement/${stage.key}`" class="pl-step" :class="{ 'is-done': isDone(index) }" :aria-current="active === stage.key ? 'step' : undefined">
          <span class="pl-step__no">
            <i v-if="isDone(index)" class="fa-solid fa-check text-[11px]" aria-hidden="true"></i>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="pl-step__body">
            <span class="pl-step__title">{{ store.t(stage.label) }}<span class="pl-step__count">{{ stage.count }}</span></span>
            <span class="pl-step__hint" :class="{ 'is-alert': stage.alert }">{{ stage.hint }}</span>
          </span>
        </RouterLink>
      </li>
    </template>
  </ol>
</template>
<script>
const { inject, computed } = Vue;
export default {
  props: { active: { type: String, default: "cockpit" }, keys: { type: Array, default: () => ["queue", "sourcing", "auction", "execution"] } },
  setup(props) {
    const store = inject("store");
    const requests = computed(() => store.scopedRecords(store.state.purchaseRequests));
    const events = computed(() => store.scopedRecords(store.state.sourcingEvents));
    const auctions = computed(() => store.scopedRecords(store.state.auctions));
    const orders = computed(() => store.scopedRecords(store.state.purchaseOrders));
    const count = (total, one, many) => `${total} ${store.t(total === 1 ? one : many)}`;
    const all = computed(() => {
      const pending = requests.value.filter((r) => r.status === "Pending approval").length;
      const openRequests = requests.value.filter((r) => !["Closed", "Rejected"].includes(r.status)).length;
      const rounds = events.value.filter((e) => e.type !== "Auction" && !["Closed", "Awarded"].includes(e.status));
      const toDecide = rounds.filter((e) => e.status === "Comparing").length;
      const live = auctions.value.filter((a) => ["Running", "Paused", "Scheduled"].includes(a.status));
      const running = live.filter((a) => a.status === "Running").length;
      const openOrders = orders.value.filter((o) => !["Matched", "Closed"].includes(o.status));
      const issues = orders.value.reduce((sum, o) => sum + (o.exceptions || []).filter((x) => x.status !== "Resolved").length, 0);
      return {
        queue: { key: "queue", label: "Requests", count: openRequests, alert: pending > 0, hint: pending ? count(pending, "to approve", "to approve") : store.t("Nothing waiting") },
        sourcing: { key: "sourcing", label: "Quotes", count: rounds.length, alert: toDecide > 0, hint: toDecide ? count(toDecide, "ready to decide", "ready to decide") : rounds.length ? store.t("Waiting for offers") : store.t("No open rounds") },
        auction: { key: "auction", label: "Live bids", count: live.length, optional: true, alert: running > 0, hint: running ? count(running, "live now", "live now") : store.t("Optional") },
        execution: { key: "execution", label: "Orders", count: openOrders.length, alert: issues > 0, hint: issues ? count(issues, "issue", "issues") : store.t("On track") },
      };
    });
    const stages = computed(() => props.keys.map((key) => all.value[key]).filter(Boolean));
    const activeIndex = computed(() => stages.value.findIndex((stage) => stage.key === props.active));
    const isDone = (index) => activeIndex.value > index;
    const linkClass = (index) => ({ "is-done": activeIndex.value >= index, "is-optional": stages.value[index]?.optional });
    return { store, stages, isDone, linkClass };
  },
};
</script>
