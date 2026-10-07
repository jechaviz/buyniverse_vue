<template>
  <header class="ws-top">
    <button type="button" class="ws-icon ws-burger" :aria-label="store.t('Toggle navigation')" @click="$emit('toggle-nav')"><i class="fa-solid fa-bars"></i></button>

    <!-- Buyers: the one thing they do, always within reach. -->
    <form v-if="marketplaceMode === 'buyer'" class="ws-prompt" :class="{ 'has-text': draft }" role="search" novalidate data-no-validate="true" @submit.prevent="needFromPrompt">
      <i class="fa-solid fa-bolt" aria-hidden="true"></i>
      <input v-model="draft" class="ws-bare" type="text" maxlength="120" autocomplete="off" data-optional="true" :placeholder="store.t('I need…')" :aria-label="store.t('What do you need?')" />
      <button type="submit" :aria-label="store.t('Publish a need')"><i class="fa-solid fa-arrow-right"></i></button>
    </form>
    <button v-else type="button" class="ws-prompt" @click="$emit('open-command')">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>{{ store.t("Quick access") }}</span><kbd>Ctrl K</kbd>
    </button>

    <TenantContextMenu v-if="tenantContext" :context="tenantContext" :switching="ui?.tenantSwitching" @switch="$emit('switch-tenant', $event)" />
    <span class="ws-spacer"></span>

    <span v-if="saveStatus && saveStatus.state !== 'saved'" class="ws-status" :class="'is-' + saveStatus.state" :title="saveStatusTitle" role="status" aria-live="polite"><i></i><span>{{ saveStatus.short }}</span></span>
    <button v-if="store.isDemo.value" type="button" class="ws-text-btn" @click="$emit('open-auth', 'login')">{{ store.t("Log in") }}</button>
    <RouterLink v-if="marketplaceMode === 'supplier'" to="/find-work" class="ws-cta"><i class="fa-solid fa-briefcase"></i><span>{{ store.t("Find Work") }}</span></RouterLink>
    <RouterLink v-else-if="marketplaceMode === 'admin'" to="/settings/organizations" class="ws-cta"><i class="fa-solid fa-building-shield"></i><span>{{ store.t("Manage access") }}</span></RouterLink>
    <button v-if="marketplaceMode === 'buyer'" type="button" class="ws-icon ws-search" :title="store.t('Quick access') + ' · Ctrl K'" :aria-label="store.t('Quick access')" @click="$emit('open-command')"><i class="fa-solid fa-magnifying-glass"></i></button>

    <div class="relative">
      <button type="button" class="ws-icon" :title="store.t('Notifications')" :aria-label="store.t('Notifications')" :aria-expanded="notificationsOpen" @click="$emit('toggle-overlay', 'notifications')">
        <i class="fa-regular fa-bell"></i><b v-if="unreadNotifications.length">{{ unreadNotifications.length }}</b>
      </button>
      <div v-if="notificationsOpen" class="ws-pop">
        <div class="ws-pop__head">
          <h2>{{ store.t("Notifications") }}</h2>
          <p>{{ unreadNotifications.length ? store.t(`${unreadNotifications.length} unread`) : store.t("You are all caught up") }}</p>
        </div>
        <RouterLink v-for="notification in visibleNotifications" :key="notification.id" :to="notification.link" class="ws-note" :class="{ 'is-new': !notification.isRead }" @click="$emit('open-notification', notification)">
          <i class="fa-solid" :class="notification.icon"></i>
          <span><b>{{ notification.title }}</b><span>{{ notification.text }}</span><time>{{ formatDate ? formatDate(notification.at) : notification.at }}</time></span>
        </RouterLink>
        <p v-if="!visibleNotifications.length" class="ws-pop__head">{{ store.t("No notifications yet.") }}</p>
        <section v-if="unreadNotifications.length"><button type="button" class="ws-text-btn" @click="$emit('mark-all-read')">{{ store.t("Mark all read") }}</button></section>
      </div>
    </div>

    <div class="relative">
      <button type="button" class="ws-avatar" aria-label="Account menu" :aria-expanded="accountOpen" @click="$emit('toggle-overlay', 'account')">{{ user.avatar }}</button>
      <div v-if="accountOpen" class="ws-pop">
        <div class="ws-pop__head"><h2>{{ user.name }}</h2><p>{{ user.email }}</p></div>
        <RouterLink :to="`/profile/${user.id}`" class="ws-pop__item" @click="$emit('close-account')"><i class="fa-regular fa-user"></i>{{ store.t("View profile") }}</RouterLink>
        <RouterLink to="/profile/billing" class="ws-pop__item" @click="$emit('close-account')"><i class="fa-regular fa-credit-card"></i>{{ store.t("Billing & folios") }}</RouterLink>
        <RouterLink to="/soporte" class="ws-pop__item" @click="$emit('close-account')"><i class="fa-regular fa-life-ring"></i>{{ store.t("Help and support") }}</RouterLink>
        <button type="button" class="ws-pop__item" @click="$emit('lock-now')"><i class="fa-solid fa-lock"></i>{{ store.t("Lock workspace") }}</button>

        <section v-if="marketplaceModeOptions.length > 1">
          <h3>{{ store.t("Company workspace") }}</h3>
          <div class="ws-seg" role="group" :aria-label="store.t('Company operating workspace')">
            <button v-for="option in marketplaceModeOptions" :key="option.key" type="button" :aria-pressed="marketplaceMode === option.key" @click="$emit('switch-mode', option.key)">{{ store.t(option.label) }}</button>
          </div>
        </section>

        <section aria-labelledby="user-preferences-title">
          <h3 id="user-preferences-title">{{ store.t("Preferences") }}</h3>
          <div class="ws-row">
            <span>{{ store.t("Language") }}</span>
            <div class="ws-seg" role="group" aria-label="Language">
              <button v-for="code in ['es', 'en']" :key="code" type="button" :aria-pressed="locale === code" :title="store.t(code === 'en' ? 'Switch to English' : 'Switch to Spanish')" @click="setLocale(code)">{{ code.toUpperCase() }}</button>
            </div>
          </div>
          <div class="ws-row">
            <span>{{ store.t("Theme") }}</span>
            <div class="ws-seg" role="group" :aria-label="store.t('Theme')">
              <button type="button" :aria-pressed="!dark" @click="dark && $emit('toggle-theme')"><i class="fa-solid fa-sun"></i></button>
              <button type="button" :aria-pressed="dark" @click="!dark && $emit('toggle-theme')"><i class="fa-solid fa-moon"></i></button>
            </div>
          </div>
          <div class="ws-row">
            <span>{{ store.t("Accent") }}</span>
            <div class="ws-swatches">
              <button v-for="option in accents" :key="option.key" type="button" :aria-label="store.t(`Use ${option.label} accent`)" :aria-pressed="accent === option.key" :title="store.t(option.label)" :style="{ backgroundColor: option.accent }" @click="$emit('set-accent', option)"></button>
            </div>
          </div>
        </section>

        <section v-if="store.isDemo.value">
          <h3>{{ store.t("Demo account") }}</h3>
          <select class="field" :value="currentUserId" @change="$emit('switch-user', $event.target.value)">
            <option v-for="person in users" :key="person.id" :value="person.id">{{ person.name }} · {{ person.type }}</option>
          </select>
        </section>
      </div>
    </div>
  </header>
</template>
<script>
const { inject, ref } = Vue;
const { useRouter } = VueRouter;
const load = (path) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(path, window.sfcOptions));

export default {
  components: { TenantContextMenu: load("./app/components/TenantContextMenu.vue?v=2") },
  props: {
    ui: Object,
    user: Object,
    users: Array,
    currentUserId: String,
    marketplaceMode: String,
    marketplaceModeOptions: Array,
    activeModeLabel: String,
    workspaceShortcutLabel: String,
    tenantContext: Object,
    saveStatus: Object,
    saveStatusTitle: String,
    notificationsOpen: Boolean,
    visibleNotifications: Array,
    unreadNotifications: Array,
    accountOpen: Boolean,
    locale: String,
    dark: Boolean,
    accents: Array,
    accent: String,
    formatDate: Function,
  },
  emits: [
    "toggle-nav", "open-command", "toggle-overlay", "mark-all-read",
    "open-notification", "close-account", "lock-now", "switch-mode",
    "set-locale", "toggle-theme", "set-accent", "switch-user",
    "switch-tenant", "open-workspace-shortcut", "open-auth",
  ],
  setup(props, { emit }) {
    const store = inject("store"), router = useRouter();
    const draft = ref("");
    // Whatever was typed becomes the start of the need; the page picks its category.
    const needFromPrompt = () => {
      const text = draft.value.trim();
      const key = text ? window.BuyniverseNeed.guess(text) : null;
      draft.value = "";
      router.push({ path: "/necesito", query: { ...(text ? { q: text } : {}), ...(key ? { cat: key } : {}) } });
    };
    return { store, draft, needFromPrompt, setLocale: (code) => emit("set-locale", code) };
  },
};
</script>
