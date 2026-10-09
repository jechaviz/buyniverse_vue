<template>
  <aside v-if="visible" class="bn-setup-banner" role="status">
    <i class="fa-solid fa-list-check"></i>
    <div><b>{{ store.t("Finish setting up your company") }}</b>
      <span>{{ doneCount }} / {{ requiredCount }} {{ store.t("required steps done") }}</span></div>
    <RouterLink to="/setup" class="bn-btn bn-btn--primary bn-btn--sm">{{ store.t("Continue setup") }}<i class="fa-solid fa-arrow-right"></i></RouterLink>
  </aside>
</template>

<script>
const { inject, ref, computed, watch } = Vue;
const { useRoute } = VueRouter;

// A nudge for company administrators until the setup wizard has nothing
// required left. It asks the server (the only judge) and stays silent on any
// failure, in the demo, and for people who cannot manage the company.
export default {
  setup() {
    const store = inject("store"), route = useRoute();
    const status = ref(null);
    const canManage = computed(() => Boolean(store.ui?.tenantContext?.permissions?.manageCompany || store.ui?.tenantContext?.permissions?.manageTenant));
    const visible = computed(() => Boolean(status.value) && !status.value.ready && route.path !== "/setup" && !route.meta.onboarding);
    const required = computed(() => Object.values(status.value?.steps || {}).filter((step) => step.required));
    const requiredCount = computed(() => required.value.length);
    const doneCount = computed(() => required.value.filter((step) => step.done).length);
    const check = async () => {
      if (store.isDemo.value || !store.currentUser.value || !canManage.value || !window.BuyniverseSetup) { status.value = null; return; }
      try { status.value = await window.BuyniverseSetup.status(); } catch (_) { status.value = null; }
    };
    watch(() => [store.ui?.tenantContext?.company?.id, store.currentUser.value?.id, route.path === "/setup"], check, { immediate: true });
    return { store, visible, requiredCount, doneCount };
  },
};
</script>
