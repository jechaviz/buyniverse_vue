<template>
  <div v-if="open" class="bn bn-auth" @mousedown.self="$emit('close')" @keydown="onKeydown">
    <div ref="dialog" class="bn-auth__dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <aside class="bn-auth__story" aria-hidden="true">
        <div class="bn-auth__brand"><img src="assets/brand/buyniverse-ring.svg?v=1" alt="" width="40" height="40" />buyniverse</div>
        <div>
          <h3>{{ mode === "register" ? t("Every purchase, a universe of suppliers.") : t("Welcome back.") }}</h3>
          <p>{{ mode === "register" ? t("One secure identity. Then you choose how your company takes part.") : t("Your requests, auctions and escrow payments, right where you left them.") }}</p>
        </div>
        <ol class="bn-auth__steps">
          <li><span class="bn-auth__step-no">1</span><div><b>{{ t("Verify who you are") }}</b><span>{{ t("Use the account you already have. Buyniverse never sees or stores its password.") }}</span></div></li>
          <li><span class="bn-auth__step-no">2</span><div><b>{{ t("Choose your role") }}</b><span>{{ t("Buy, sell or both. Each permission is audited separately.") }}</span></div></li>
          <li><span class="bn-auth__step-no">3</span><div><b>{{ t("Become a formal supplier") }}</b><span>{{ t("Your tax identity is validated for your country: RFC and CFDI in Mexico, EIN and sales tax in the United States, and 22 more jurisdictions.") }}</span></div></li>
        </ol>
        <div class="bn-auth__trust">
          <span><i class="fa-solid fa-key"></i>{{ t("No stored passwords") }}</span>
          <span><i class="fa-solid fa-vault"></i>{{ t("Escrow payments") }}</span>
          <span><i class="fa-solid fa-clipboard-check"></i>{{ t("Audit trail") }}</span>
        </div>
      </aside>

      <section class="bn-auth__panel">
        <button type="button" class="bn-auth__close" :aria-label="t('Close')" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        <div class="bn-auth__tabs" role="tablist" :aria-label="t('Access')">
          <button type="button" role="tab" :aria-selected="mode === 'login'" @click="mode = 'login'">{{ t("Sign in") }}</button>
          <button type="button" role="tab" :aria-selected="mode === 'register'" @click="mode = 'register'">{{ t("Create account") }}</button>
        </div>
        <h2 :id="titleId" class="bn-auth__title">{{ mode === "register" ? t("Create your Buyniverse account") : t("Sign in to Buyniverse") }}</h2>
        <p class="bn-auth__lead">{{ mode === "register" ? t("Sign up with your work or personal account; you set up your company in the next step.") : t("Continue with the account you used to join.") }}</p>

        <div v-if="errorMessage" class="bn-auth__notice bn-auth__notice--error" role="alert">
          <i class="fa-solid fa-circle-exclamation"></i><div><b>{{ t("We could not sign you in") }}</b>{{ errorMessage }}</div>
        </div>

        <template v-if="isDemoRuntime">
          <div class="bn-auth__notice bn-auth__notice--warn" role="note">
            <i class="fa-solid fa-flask"></i>
            <div><b>{{ store.t("Entorno demostrativo; no ingreses credenciales reales.") }}</b>{{ t("Pick a sample profile to explore every flow with fictional data.") }}</div>
          </div>
          <div class="bn-auth__profiles">
            <button v-for="profile in demoProfiles" :key="profile.id" type="button" class="bn-auth__profile" @click="loginAs(profile.id)">
              <span class="bn-auth__avatar">{{ profile.avatar }}</span>
              <span><b>{{ profile.name }}</b><span>{{ t(profile.role) }}</span></span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
          <p class="bn-auth__legal">{{ store.t("Disponible únicamente con identidad federada de producción.") }} {{ t("Real accounts are created on buyniverse.com.") }}</p>
        </template>

        <template v-else-if="socialLoading && !socialProviders.length">
          <div class="bn-auth__notice bn-auth__notice--info" role="status"><i class="fa-solid fa-circle-notch fa-spin"></i><div>{{ t("Checking available sign-in methods…") }}</div></div>
        </template>

        <template v-else-if="socialProviders.length">
          <div class="bn-auth__providers">
            <button v-for="provider in socialProviders" :key="provider.id" type="button" class="bn-auth__provider" :disabled="redirecting" @click="handleSocialAuth(provider)">
              <i :class="provider.icon" :style="{ color: provider.color }"></i>
              <span>{{ (mode === "register" ? t("Sign up with") : t("Continue with")) + " " + provider.name }}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
          <p class="bn-auth__legal">{{ t("By continuing you allow Buyniverse to receive your name and email from the provider to create and protect your account.") }}</p>
          <div class="bn-auth__divider">{{ t("or") }}</div>
          <div class="bn-auth__actions">
            <button v-if="store.demoAvailable.value" type="button" class="bn-btn bn-btn--ghost bn-btn--sm" @click="launchDemo">{{ store.t("Explore demo") }}</button>
            <button v-if="supportAvailable" type="button" class="bn-btn bn-btn--ghost bn-btn--sm" @click="openSupport"><i class="fa-solid fa-life-ring"></i>{{ t("Get help") }}</button>
          </div>
        </template>

        <template v-else-if="identityUnavailable">
          <div class="bn-auth__notice bn-auth__notice--info" role="status">
            <i class="fa-solid fa-hourglass-half"></i>
            <div><b>{{ t("Account access is being enabled") }}</b>{{ t(store.demoAvailable.value ? "Sign-in with Google, Microsoft, LinkedIn and Facebook opens as soon as each provider approves Buyniverse. Meanwhile the demo shows every flow with sample data, no sign-up needed." : "Sign-in with Google, Microsoft, LinkedIn and Facebook opens as soon as each provider approves Buyniverse.") }}</div>
          </div>
          <div class="bn-auth__actions">
            <button v-if="store.demoAvailable.value" type="button" class="bn-btn bn-btn--primary" @click="launchDemo"><i class="fa-solid fa-play"></i>{{ store.t("Explore demo") }}</button>
            <button v-if="supportAvailable" type="button" class="bn-btn bn-btn--ghost" @click="openSupport"><i class="fa-solid fa-life-ring"></i>{{ t("Request business access") }}</button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script>
const { inject, ref, computed, watch, nextTick, onBeforeUnmount } = Vue;
const { useRouter, useRoute } = VueRouter;

// This public build never collects passwords. A production session is
// established only by the server-side federated callback; the demo runs on
// sanitized client fixtures and is clearly labelled as such.
const PROVIDER_APPEARANCE = {
  google: { icon: "fa-brands fa-google", color: "#ea4335" },
  microsoft: { icon: "fa-brands fa-microsoft", color: "#00a4ef" },
  linkedin: { icon: "fa-brands fa-linkedin", color: "#0a66c2" },
  facebook: { icon: "fa-brands fa-facebook", color: "#1877f2" },
};
const ERROR_MESSAGES = {
  cancelled: "The sign-in was cancelled or took too long. Try again.",
  identity: "The provider could not confirm your identity. Try again or use another account.",
};

export default {
  props: {
    open: { type: Boolean, default: false },
    initialMode: { type: String, default: "login" },
    error: { type: String, default: "" },
  },
  emits: ["close", "logged-in"],
  setup(props, { emit }) {
    const store = inject("store");
    const router = useRouter();
    const route = useRoute();
    const t = (text) => store.t(text);
    const mode = ref(props.initialMode === "register" ? "register" : "login");
    const dialog = ref(null);
    const overlayId = `auth-${Math.random().toString(36).slice(2, 9)}`;
    const titleId = `${overlayId}-title`;
    const socialProviders = ref([]);
    const socialLoading = ref(false);
    const redirecting = ref(false);
    const basePath = window.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
    const isDemoRuntime = computed(() => store.runtimeMode?.value === "demo");
    const identityUnavailable = computed(() => !isDemoRuntime.value && !socialProviders.value.length);
    const errorMessage = computed(() => (ERROR_MESSAGES[props.error] ? t(ERROR_MESSAGES[props.error]) : ""));
    const returnTarget = computed(() => (route.query && route.query.returnTo ? String(route.query.returnTo) : ""));

    const demoProfiles = [
      { id: "user-client-brenda", name: "Brenda Smith", role: "Buyer · VP of Procurement", avatar: "BS" },
      { id: "user-freelancer-john", name: "John Doe", role: "Supplier · Top-rated freelancer", avatar: "JD" },
      { id: "user-freelancer-jane", name: "Jane Smith", role: "Supplier · Pixel Studio director", avatar: "JS" },
      { id: "user-admin-admin", name: "Admin Operator", role: "Platform administrator and auditor", avatar: "AU" },
    ];

    const loadSocialProviders = async () => {
      if (isDemoRuntime.value) return;
      socialLoading.value = true;
      try {
        const response = await fetch(`${basePath}/api/v1/auth/providers`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.providers)) throw new Error("Identity providers unavailable");
        socialProviders.value = payload.providers
          .filter((provider) => provider && typeof provider.id === "string" && PROVIDER_APPEARANCE[provider.id])
          .map((provider) => ({ id: provider.id, name: typeof provider.name === "string" ? provider.name : provider.id, ...PROVIDER_APPEARANCE[provider.id] }));
      } catch (_) {
        socialProviders.value = [];
      } finally {
        socialLoading.value = false;
      }
    };

    const loginAs = (userId) => {
      if (!isDemoRuntime.value) return;
      if (typeof store.selectUser === "function") store.selectUser(userId);
      else if (typeof store.switchUser === "function") store.switchUser(userId);
      store.notice(t("Signed in to the demo"), "fa-circle-check");
      emit("logged-in");
      emit("close");
      router.push(returnTarget.value || "/dashboard");
    };
    const handleSocialAuth = (provider) => {
      if (!PROVIDER_APPEARANCE[provider?.id] || redirecting.value) return;
      redirecting.value = true;
      window.location.assign(`${basePath}/api/v1/auth/${encodeURIComponent(provider.id)}/start`);
    };
    const launchDemo = () => store.enterDemo();
    // Support links appear only once the support centre route is registered.
    const supportAvailable = router.getRoutes().some((item) => item.path === "/soporte");
    const openSupport = () => {
      emit("close");
      router.push({ path: "/soporte", query: { topic: "access" } });
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") emit("close");
      else window.BuyniverseOverlay?.trap(event, overlayId);
    };

    watch(() => props.open, (open) => {
      if (!open) { window.BuyniverseOverlay?.release(overlayId); redirecting.value = false; return; }
      mode.value = props.initialMode === "register" ? "register" : "login";
      loadSocialProviders();
      nextTick(() => window.BuyniverseOverlay?.activate(overlayId, () => dialog.value));
    }, { immediate: true });
    watch(() => props.initialMode, (value) => { mode.value = value === "register" ? "register" : "login"; });
    onBeforeUnmount(() => window.BuyniverseOverlay?.release(overlayId));

    return { store, t, mode, dialog, titleId, socialProviders, socialLoading, redirecting, isDemoRuntime, identityUnavailable,
      errorMessage, demoProfiles, loginAs, handleSocialAuth, launchDemo, supportAvailable, openSupport, onKeydown };
  },
};
</script>
