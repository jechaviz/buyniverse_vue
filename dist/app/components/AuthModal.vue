<template>
  <div v-if="open" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all overflow-y-auto">
    <div
      class="relative my-8 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 space-y-5"
      role="dialog"
      aria-modal="true"
    >
      <!-- Close Button -->
      <button
        type="button"
        class="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition"
        aria-label="Cerrar"
        @click="$emit('close')"
      >
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>

      <!-- Header Icon & Title -->
      <div class="text-center space-y-1.5">
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand text-xl font-bold dark:bg-brand/20">
          <i class="fa-solid" :class="mode === 'login' ? 'fa-right-to-bracket' : mode === 'register' ? 'fa-user-plus' : 'fa-key'"></i>
        </div>
        <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ mode === 'login' ? store.t("Iniciar Sesión en Buyniverse") : mode === 'register' ? store.t("Crear Cuenta Empresarial") : store.t("Recuperar Contraseña") }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ mode === 'login' ? store.t("Accede a tus proyectos, subastas y contratos en fideicomiso.") : mode === 'register' ? store.t("Únete al ecosistema líder de compras B2B y talento certificado.") : store.t("Te enviaremos un código de seguridad para restablecer tu acceso.") }}
        </p>
      </div>

      <div v-if="isDemoRuntime" class="rounded-2xl border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-100" role="note">
        <p class="flex items-center gap-1.5 font-bold">
          <i class="fa-solid fa-shield-halved"></i>{{ store.t("Entorno demostrativo; no ingreses credenciales reales.") }}
        </p>
        <p class="mt-1 text-[11px] leading-relaxed opacity-85">
          {{ store.t("El acceso de producción requiere identidad federada, MFA y autorización verificada en servidor.") }}
        </p>
      </div>

      <!-- Mode Switcher Tabs (Only if not in forgot password mode) -->
      <div v-if="!isDemoRuntime && !federatedOnly && mode !== 'forgot'" class="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
        <button
          type="button"
          class="rounded-xl py-2 text-xs font-bold transition"
          :class="mode === 'login' ? 'bg-white text-brand shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'"
          @click="mode = 'login'"
        >
          <i class="fa-solid fa-right-to-bracket mr-1.5"></i>{{ store.t("Iniciar Sesión") }}
        </button>
        <button
          type="button"
          class="rounded-xl py-2 text-xs font-bold transition"
          :class="mode === 'register' ? 'bg-white text-brand shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'"
          @click="mode = 'register'"
        >
          <i class="fa-solid fa-user-plus mr-1.5"></i>{{ store.t("Registrarse") }}
        </button>
      </div>

      <!-- ================================================================= -->
      <!-- 1. Social logins are server-configured, never client-side mocks. -->
      <!-- ================================================================= -->
      <div v-if="socialProviders.length && mode !== 'forgot'" class="space-y-2.5">
        <p class="text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <i class="fa-solid fa-user-shield mr-1 text-brand"></i>{{ store.t("Acceso personal seguro; tu espacio se crea sin RFC hasta que agregues una empresa.") }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="prov in socialProviders"
            :key="prov.id"
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand transition shadow-2xs"
            :title="`Continuar con ${prov.name}`"
            @click="handleSocialAuth(prov)"
          >
            <i :class="[prov.icon, prov.color, 'text-sm']"></i>
            <span class="truncate">{{ prov.short }}</span>
          </button>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- 2. LOGIN FORM                                                     -->
      <!-- ================================================================= -->
      <div v-if="mode === 'login'" class="space-y-4">
        <!-- 1-Click Fast Demo Logins -->
        <div v-if="isDemoRuntime" class="rounded-2xl border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-950/20 space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
            <i class="fa-solid fa-bolt text-amber-500"></i>{{ store.t("Acceso Rápido con Perfiles Demo") }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="p in demoProfiles"
              :key="p.id"
              type="button"
              class="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2 text-left hover:border-brand hover:bg-brand-50/20 dark:border-slate-800 dark:bg-slate-800 transition"
              @click="loginAs(p.id)"
            >
              <span class="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand-100 text-[10px] font-bold text-brand dark:bg-brand/30">
                {{ p.avatar }}
              </span>
              <div class="min-w-0">
                <b class="block truncate text-[11px] font-bold text-slate-800 dark:text-slate-200">{{ p.name }}</b>
                <span class="block truncate text-[9px] text-slate-400">{{ p.role }}</span>
              </div>
            </button>
          </div>
        </div>

        <form v-if="!isDemoRuntime && !federatedOnly" class="space-y-3" @submit.prevent="handleEmailLogin">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Correo Electrónico") }}</label>
            <div class="relative">
              <i class="fa-solid fa-envelope absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input v-model="loginEmail" type="email" required class="field pl-9 text-xs" placeholder="nombre@empresa.com" />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ store.t("Contraseña") }}</label>
              <button type="button" class="text-[11px] font-bold text-brand hover:underline" @click="openForgot">
                {{ store.t("¿Olvidaste tu contraseña?") }}
              </button>
            </div>
            <div class="relative">
              <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input v-model="loginPass" :type="showLoginPass ? 'text' : 'password'" required class="field pl-9 pr-9 text-xs" placeholder="••••••••••••" />
              <button type="button" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600" @click="showLoginPass = !showLoginPass">
                <i class="fa-solid" :class="showLoginPass ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-brand w-full py-3 text-xs font-bold shadow-md">
            <i class="fa-solid fa-right-to-bracket mr-1.5"></i>{{ store.t("Ingresar a Buyniverse") }}
          </button>
        </form>
      </div>

      <!-- ================================================================= -->
      <!-- 3. REGISTER FORM (Email & Enterprise)                            -->
      <!-- ================================================================= -->
      <div v-else-if="mode === 'register' && !isDemoRuntime && !federatedOnly" class="space-y-4">
        <!-- Account Type Selector -->
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{{ store.t("Tipo de Cuenta") }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-2xl border p-2.5 text-xs font-bold transition"
              :class="regType === 'Client' ? 'border-brand bg-brand-50/50 text-brand dark:bg-brand/20 dark:border-brand' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'"
              @click="regType = 'Client'"
            >
              <i class="fa-solid fa-building"></i>{{ store.t("Empresa / Comprador") }}
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-2xl border p-2.5 text-xs font-bold transition"
              :class="regType === 'Freelancer' ? 'border-brand bg-brand-50/50 text-brand dark:bg-brand/20 dark:border-brand' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'"
              @click="regType = 'Freelancer'"
            >
              <i class="fa-solid fa-laptop-code"></i>{{ store.t("Freelancer / Proveedor") }}
            </button>
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="handleEmailRegister">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Nombre Completo / Razón Social") }}</label>
              <input v-model="regName" type="text" required class="field text-xs" placeholder="Ej. Acme Corp" />
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("RFC / Tax ID") }}</label>
              <input v-model="regRfc" type="text" class="field text-xs font-mono uppercase" placeholder="ACM010101XYZ" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Correo Electrónico Corporativo") }}</label>
            <div class="relative">
              <i class="fa-solid fa-envelope absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input v-model="regEmail" type="email" required class="field pl-9 text-xs" placeholder="contacto@acme.com" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Contraseña Segura") }}</label>
            <div class="relative">
              <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input v-model="regPass" :type="showRegPass ? 'text' : 'password'" required minlength="8" class="field pl-9 pr-9 text-xs" placeholder="Mínimo 8 caracteres (A-Z, 0-9, #)" />
              <button type="button" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600" @click="showRegPass = !showRegPass">
                <i class="fa-solid" :class="showRegPass ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
            <!-- Password Strength Bar -->
            <div class="mt-1.5 flex items-center gap-1.5">
              <div class="h-1 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div class="h-full transition-all duration-300" :class="passwordStrength.colorClass" :style="{ width: passwordStrength.pct + '%' }"></div>
              </div>
              <span class="text-[10px] font-bold" :class="passwordStrength.textClass">{{ passwordStrength.label }}</span>
            </div>
          </div>

          <div class="pt-1">
            <label class="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
              <input v-model="regTerms" type="checkbox" required class="mt-0.5 rounded accent-brand" />
              <span>{{ store.t("Acepto los Términos de Servicio, Contrato de Fideicomiso (Escrow) y Política de Privacidad.") }}</span>
            </label>
          </div>

          <button type="submit" class="btn-brand w-full py-3 text-xs font-bold shadow-md">
            <i class="fa-solid fa-user-plus mr-1.5"></i>{{ store.t("Crear Cuenta por Email") }}
          </button>
        </form>
      </div>

      <!-- ================================================================= -->
      <!-- 4. FORGOT PASSWORD FLOW (OTP & Reset)                             -->
      <!-- ================================================================= -->
      <div v-else-if="mode === 'forgot' && !isDemoRuntime" class="space-y-4">
        <!-- Step 1: Send OTP -->
        <div v-if="forgotStep === 1" class="space-y-3">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Ingresa tu Correo Registrado") }}</label>
            <div class="relative">
              <i class="fa-solid fa-envelope absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input v-model="forgotEmail" type="email" required class="field pl-9 text-xs" placeholder="tu@empresa.com" />
            </div>
          </div>

          <button type="button" class="btn-brand w-full py-3 text-xs font-bold shadow-md" @click="sendRecoveryOtp">
            <i class="fa-solid fa-paper-plane mr-1.5"></i>{{ store.t("Enviar Código de Seguridad") }}
          </button>
        </div>

        <!-- Step 2: Validate OTP & Set New Password -->
        <div v-else-if="forgotStep === 2" class="space-y-3">
          <div class="rounded-2xl bg-amber-50 p-3 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-xs">
            <p class="font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-shield-halved"></i>{{ store.t("Código de Recuperación Generado") }}
            </p>
            <p class="mt-1 font-mono text-sm tracking-widest font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded inline-block">
              {{ generatedOtp }}
            </p>
            <p class="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
              {{ store.t("Se ha enviado una copia a tu correo. Ingrésalo abajo para confirmar tu identidad.") }}
            </p>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Código PIN de 6 Dígitos") }}</label>
            <input v-model="inputOtp" type="text" maxlength="6" class="field text-center font-mono text-base font-bold tracking-widest uppercase" placeholder="123456" />
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Nueva Contraseña") }}</label>
            <input v-model="newPassword" type="password" required minlength="8" class="field text-xs" placeholder="Mínimo 8 caracteres" />
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Confirmar Nueva Contraseña") }}</label>
            <input v-model="confirmPassword" type="password" required minlength="8" class="field text-xs" placeholder="Repite tu contraseña" />
          </div>

          <button type="button" class="btn-brand w-full py-3 text-xs font-bold shadow-md" @click="verifyOtpAndReset">
            <i class="fa-solid fa-key mr-1.5"></i>{{ store.t("Restablecer Contraseña e Ingresar") }}
          </button>
        </div>

        <div class="pt-2 text-center">
          <button type="button" class="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white" @click="mode = 'login'">
            <i class="fa-solid fa-arrow-left mr-1.5"></i>{{ store.t("Volver al Inicio de Sesión") }}
          </button>
        </div>
      </div>

      <div v-else-if="mode !== 'login'" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/60">
        <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ store.t("Este flujo está deshabilitado en la demostración pública.") }}</p>
        <button type="button" class="mt-2 text-xs font-bold text-brand hover:underline" @click="mode = 'login'">
          {{ store.t("Volver a los perfiles demo") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
const { inject, ref, computed, onMounted, watch } = Vue;
const { useRouter } = VueRouter;

export default {
  props: {
    open: { type: Boolean, default: false },
    initialMode: { type: String, default: "login" }
  },
  emits: ["close", "logged-in"],
  setup(props, { emit }) {
    const store = inject("store");
    const router = useRouter();
    const mode = ref(props.initialMode || "login");
    // This public build intentionally never collects real credentials. A
    // federated production session is established only by the server callback.
    const socialProviders = ref([]);
    const socialLoading = ref(false);
    const basePath = window.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
    const federatedOnly = computed(() => socialProviders.value.length > 0);
    const isDemoRuntime = computed(() => !Boolean(window.BuyniverseRuntime?.serverAuth) && !federatedOnly.value);

    // Login fields
    const loginEmail = ref("");
    const loginPass = ref("");
    const showLoginPass = ref(false);

    // Register fields
    const regType = ref("Client");
    const regName = ref("");
    const regRfc = ref("");
    const regEmail = ref("");
    const regPass = ref("");
    const showRegPass = ref(false);
    const regTerms = ref(false);

    // Forgot password fields
    const forgotStep = ref(1);
    const forgotEmail = ref("");
    const generatedOtp = ref("");
    const inputOtp = ref("");
    const newPassword = ref("");
    const confirmPassword = ref("");

    const providerAppearance = {
      google: { short: "Google", icon: "fa-brands fa-google", color: "text-rose-500" },
      facebook: { short: "Facebook", icon: "fa-brands fa-facebook", color: "text-blue-600" },
    };
    const loadSocialProviders = async () => {
      socialLoading.value = true;
      try {
        const response = await fetch(`${basePath}/api/v1/auth/providers`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.providers)) throw new Error("Identity providers unavailable");
        socialProviders.value = payload.providers
          .filter((provider) => provider && typeof provider.id === "string" && providerAppearance[provider.id])
          .map((provider) => ({ id: provider.id, name: typeof provider.name === "string" ? provider.name : providerAppearance[provider.id].short, ...providerAppearance[provider.id] }));
      } catch (_) {
        socialProviders.value = [];
      } finally {
        socialLoading.value = false;
      }
    };

    const demoProfiles = [
      { id: "user-client-brenda", name: "Brenda Smith", role: "Cliente / VP Compras", avatar: "BS" },
      { id: "user-freelancer-john", name: "John Doe", role: "Freelancer Top Rated", avatar: "JD" },
      { id: "user-freelancer-jane", name: "Jane Smith", role: "Directora Pixel Studio", avatar: "JS" },
      { id: "user-admin-admin", name: "Admin Operator", role: "SuperAdmin / Auditor", avatar: "AU" }
    ];

    // Password strength calculation
    const passwordStrength = computed(() => {
      const p = regPass.value;
      if (!p) return { pct: 0, label: "", colorClass: "bg-slate-300", textClass: "text-slate-400" };
      let score = 0;
      if (p.length >= 8) score += 30;
      if (/[A-Z]/.test(p)) score += 25;
      if (/[0-9]/.test(p)) score += 25;
      if (/[^A-Za-z0-9]/.test(p)) score += 20;

      if (score < 50) return { pct: score, label: "Débil", colorClass: "bg-rose-500", textClass: "text-rose-500" };
      if (score < 80) return { pct: score, label: "Media", colorClass: "bg-amber-500", textClass: "text-amber-500" };
      return { pct: score, label: "Fuerte (Segura)", colorClass: "bg-emerald-500", textClass: "text-emerald-500" };
    });

    const activateUser = (userId) => {
      if (typeof store.selectUser === "function") {
        store.selectUser(userId);
      } else if (typeof store.switchUser === "function") {
        store.switchUser(userId);
      } else if (store.state) {
        store.state.currentUserId = userId;
      }
    };

    const loginAs = (userId) => {
      activateUser(userId);
      store.notice(store.t("Sesión iniciada correctamente"), "fa-circle-check");
      emit("close");
      router.push("/dashboard");
    };

    const unavailable = () => {
      store.notice(store.t("Disponible únicamente con identidad federada de producción."), "fa-shield-halved");
      mode.value = "login";
    };
    const handleSocialAuth = (provider) => {
      const id = provider && typeof provider.id === "string" ? provider.id : "";
      if (!providerAppearance[id] || socialLoading.value) return;
      window.location.assign(`${basePath}/api/v1/auth/${encodeURIComponent(id)}/start`);
    };
    const handleEmailLogin = unavailable;
    const handleEmailRegister = unavailable;
    const openForgot = unavailable;
    const sendRecoveryOtp = unavailable;
    const verifyOtpAndReset = unavailable;

    onMounted(loadSocialProviders);
    watch(() => props.open, (open) => { if (open) loadSocialProviders(); });
    watch(federatedOnly, (enabled) => {
      if (enabled && mode.value !== "login" && mode.value !== "forgot") mode.value = "login";
    });

    return {
      store,
      mode,
      isDemoRuntime,
      federatedOnly,
      socialProviders,
      socialLoading,
      demoProfiles,
      loginEmail,
      loginPass,
      showLoginPass,
      regType,
      regName,
      regRfc,
      regEmail,
      regPass,
      showRegPass,
      regTerms,
      passwordStrength,
      forgotStep,
      forgotEmail,
      generatedOtp,
      inputOtp,
      newPassword,
      confirmPassword,
      loginAs,
      handleSocialAuth,
      handleEmailLogin,
      handleEmailRegister,
      openForgot,
      sendRecoveryOtp,
      verifyOtpAndReset
    };
  },
};
</script>
