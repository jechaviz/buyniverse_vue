<template>
  <header class="bn bn-nav">
    <div class="bn-wrap">
      <div class="bn-nav__row">
        <BnLogo />
        <nav class="bn-nav__links" :aria-label="store.t('Main')">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ store.t(link.label) }}</RouterLink>
        </nav>

        <div class="bn-nav__actions">
          <div class="bn-lang bn-nav__desktop-only" role="group" :aria-label="store.t('Language')">
            <button v-for="code in ['es', 'en']" :key="code" type="button" :aria-pressed="locale === code" @click="$emit('set-locale', code)">{{ code.toUpperCase() }}</button>
          </div>
          <button type="button" class="bn-icon-btn bn-nav__theme" :aria-label="store.t(dark ? 'Light mode' : 'Dark mode')" @click="$emit('toggle-theme')">
            <i class="fa-solid" :class="dark ? 'fa-sun' : 'fa-moon'"></i>
          </button>

          <template v-if="signedIn">
            <RouterLink to="/dashboard" class="bn-btn bn-btn--primary bn-btn--sm bn-nav__desktop-only">
              <i class="fa-solid fa-arrow-right-to-bracket"></i>{{ store.t("Open workspace") }}
            </RouterLink>
          </template>
          <template v-else>
            <button type="button" class="bn-btn bn-btn--ghost bn-btn--sm bn-nav__desktop-only" @click="$emit('launch-demo')">{{ store.t("Explore demo") }}</button>
            <button type="button" class="bn-btn bn-btn--ghost bn-btn--sm bn-nav__desktop-only" @click="$emit('open-auth', 'login')">{{ store.t("Log in") }}</button>
            <button type="button" class="bn-btn bn-btn--primary bn-btn--sm" @click="$emit('open-auth', 'register')">{{ store.t("Join free") }}</button>
          </template>

          <button type="button" class="bn-icon-btn bn-nav__menu" :aria-expanded="menuOpen" aria-controls="bn-mobile-menu" :aria-label="store.t('Menu')" @click="menuOpen = !menuOpen">
            <i class="fa-solid" :class="menuOpen ? 'fa-xmark' : 'fa-bars'"></i>
          </button>
        </div>
      </div>

      <div v-if="menuOpen" id="bn-mobile-menu" class="bn-mobile-menu">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="menuOpen = false">{{ store.t(link.label) }}</RouterLink>
        <RouterLink v-if="signedIn" to="/dashboard" @click="menuOpen = false">{{ store.t("Open workspace") }}</RouterLink>
        <template v-else>
          <button type="button" @click="menuOpen = false; $emit('open-auth', 'login')">{{ store.t("Log in") }}</button>
          <button type="button" @click="menuOpen = false; $emit('launch-demo')">{{ store.t("Explore demo") }}</button>
        </template>
        <button type="button" @click="$emit('toggle-theme')"><i class="fa-solid" :class="dark ? 'fa-sun' : 'fa-moon'" style="margin-right: 8px"></i>{{ store.t(dark ? "Light mode" : "Dark mode") }}</button>
        <div class="bn-lang" role="group" :aria-label="store.t('Language')" style="justify-self: start; margin-top: 8px">
          <button v-for="code in ['es', 'en']" :key="code" type="button" :aria-pressed="locale === code" @click="$emit('set-locale', code)">{{ code.toUpperCase() }}</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
const { inject, ref, computed, watch, defineAsyncComponent } = Vue;
const { useRoute } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const BnLogo = load("./app/experience/BnLogo.vue?v=4");

export default {
  components: { BnLogo },
  props: { locale: String, dark: Boolean },
  emits: ["set-locale", "toggle-theme", "open-auth", "launch-demo"],
  setup() {
    const store = inject("store");
    const route = useRoute();
    const menuOpen = ref(false);
    watch(() => route.fullPath, () => { menuOpen.value = false; });

    const links = [
      { to: "/marketplace", label: "Find suppliers" },
      { to: "/browse-services", label: "Services" },
      { to: "/find-talent", label: "Talent" },
      { to: "/procurement/auction", label: "Live auctions" },
    ];

    return { store, links, menuOpen, signedIn: computed(() => Boolean(store.currentUser.value)) };
  },
};
</script>
