<template>
  <aside class="ws-side" :class="{ 'is-open': mobileOpen }" :aria-label="store.t('Main navigation')">
    <RouterLink to="/dashboard" class="ws-brand" :aria-label="store.t('Buyniverse home')" @click="$emit('close-mobile')">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs><linearGradient id="ws-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36e3c0" /><stop offset="1" stop-color="#4d7cff" /></linearGradient></defs>
        <circle cx="17" cy="19" r="7" fill="none" stroke="url(#ws-ring)" stroke-width="4" />
        <g class="ws-brand__dot"><circle cx="12" cy="7.5" r="3" fill="currentColor" /></g>
      </svg>
      <span>buy<b>niverse</b></span>
    </RouterLink>

    <nav class="ws-nav">
      <div v-for="(section, index) in menu" :key="section.title || 'group-' + index" class="ws-group" role="group" :aria-label="section.title || store.t('Main navigation')">
        <RouterLink
          v-for="link in section.items"
          :key="link.to"
          :to="link.to"
          class="ws-link"
          :class="{ 'is-active': isActive(link) }"
          :title="store.t(link.label)"
          @click="$emit('close-mobile')"
        >
          <i :class="link.icon"></i>
          <span>{{ store.t(link.label) }}</span>
          <em v-if="link.badge">{{ link.badge }}</em>
        </RouterLink>
      </div>
    </nav>

    <button type="button" class="ws-collapse" :aria-label="store.t(collapsed ? 'Expand navigation' : 'Collapse navigation')" @click="$emit('toggle-collapse')">
      <i class="fa-solid" :class="collapsed ? 'fa-angles-right' : 'fa-angles-left'"></i>
      <span>{{ store.t("Collapse menu") }}</span>
    </button>
  </aside>
</template>
<script>
const { useRoute } = VueRouter;
export default {
  props: {
    menu: Array,
    collapsed: Boolean,
    mobileOpen: Boolean,
  },
  emits: ["close-mobile", "toggle-collapse"],
  setup() {
    const route = useRoute();
    // A link is active for its own path or for the areas it stands for (a need lives under /procurement and /necesito).
    const isActive = (link) => {
      const areas = link.match || [link.to];
      return areas.some((area) => route.path === area || route.path.startsWith(area + "/"));
    };
    return { store: Vue.inject("store"), isActive };
  },
};
</script>
