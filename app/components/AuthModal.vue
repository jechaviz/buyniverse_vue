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

      <!-- Mode Switcher Tabs (Only if not in forgot password mode) -->
      <div v-if="mode !== 'forgot'" class="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
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
      <!-- 1. SOCIAL LOGINS (Google, Microsoft, GitHub, LinkedIn)           -->
      <!-- ================================================================= -->
      <div v-if="mode !== 'forgot'" class="space-y-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

        <div class="relative flex items-center justify-center">
          <span class="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-800"></span>
          <span class="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900">
            {{ store.t("o con tu correo electrónico") }}
          </span>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- 2. LOGIN FORM                                                     -->
      <!-- ================================================================= -->
      <div v-if="mode === 'login'" class="space-y-4">
        <!-- 1-Click Fast Demo Logins -->
        <div class="rounded-2xl border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-950/20 space-y-2">
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

        <form class="space-y-3" @submit.prevent="handleEmailLogin">
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
      <div v-else-if="mode === 'register'" class="space-y-4">
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
      <div v-else-if="mode === 'forgot'" class="space-y-4">
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
    </div>
  </div>
</template>

<script>
const { inject, ref, computed } = Vue;
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

    // Social Providers
    const socialProviders = [
      { id: "google", name: "Google Workspace", short: "Google", icon: "fa-brands fa-google", color: "text-rose-500" },
      { id: "microsoft", name: "Microsoft 365 / Azure", short: "Microsoft", icon: "fa-brands fa-microsoft", color: "text-blue-500" },
      { id: "github", name: "GitHub Enterprise", short: "GitHub", icon: "fa-brands fa-github", color: "text-slate-800 dark:text-white" },
      { id: "linkedin", name: "LinkedIn Professional", short: "LinkedIn", icon: "fa-brands fa-linkedin", color: "text-sky-600" }
    ];

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

    const loginAs = (userId) => {
      store.switchUser(userId);
      store.notice(store.t("Sesión iniciada correctamente"), "fa-circle-check");
      emit("close");
      router.push("/dashboard");
    };

    const handleSocialAuth = (prov) => {
      // Create or locate social user
      const socialId = `user-social-${prov.id}`;
      let user = store.state.users.find(u => u.id === socialId);
      if (!user) {
        user = {
          id: socialId,
          name: `${prov.short} Verified Executive`,
          email: `auth.${prov.id}@enterprise-sso.com`,
          type: "Client",
          companyName: `${prov.short} Enterprise Partner`,
          headline: `Autenticado con ${prov.name} SSO`,
          skills: ["SSO", "Enterprise", "B2B"],
          avatar: prov.short.slice(0, 2).toUpperCase(),
          jss: 100,
          tier: "Hero",
          certLevel: 5,
          connects: 150,
          rfc: "SSO990101XYZ",
          folioBalance: 50
        };
        store.state.users.push(user);
      }
      store.switchUser(user.id);
      store.notice(`${store.t("Acceso exitoso con")} ${prov.name}`, "fa-circle-check");
      emit("close");
      router.push("/dashboard");
    };

    const handleEmailLogin = () => {
      const found = store.state.users.find(u => u.email.toLowerCase() === loginEmail.value.toLowerCase());
      const targetId = found ? found.id : store.state.users[0]?.id || "user-client-brenda";
      store.switchUser(targetId);
      store.notice(store.t("Sesión iniciada con éxito"), "fa-circle-check");
      emit("close");
      router.push("/dashboard");
    };

    const handleEmailRegister = () => {
      const newId = `user-${Date.now()}`;
      const initials = regName.value.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U1";
      
      const newUser = {
        id: newId,
        name: regName.value,
        email: regEmail.value,
        type: regType.value,
        companyName: regType.value === "Client" ? regName.value : `${regName.value} Studio`,
        headline: regType.value === "Client" ? "Gerente de Compras & Proyectos" : "Especialista Profesional Certificado",
        skills: ["B2B", "Escrow", "Sourcing"],
        avatar: initials,
        jss: 100,
        tier: "Hero",
        certLevel: 5,
        connects: 100,
        rfc: regRfc.value || "XAXX010101000",
        folioBalance: 25
      };

      store.state.users.push(newUser);
      store.switchUser(newId);
      store.notice(store.t("¡Cuenta creada exitosamente! Bienvenido a Buyniverse."), "fa-sparkles");
      emit("close");
      router.push(regType.value === "Client" ? "/post-job/new" : "/dashboard");
    };

    const openForgot = () => {
      mode.value = "forgot";
      forgotStep.value = 1;
      forgotEmail.value = loginEmail.value || "";
    };

    const sendRecoveryOtp = () => {
      if (!forgotEmail.value) {
        store.notice(store.t("Por favor ingresa un correo válido"), "fa-triangle-exclamation");
        return;
      }
      // Generate 6-digit PIN
      generatedOtp.value = String(Math.floor(100000 + Math.random() * 900000));
      inputOtp.value = generatedOtp.value; // pre-fill for frictionless UX
      forgotStep.value = 2;
      store.notice(store.t("Código de recuperación generado"), "fa-envelope");
    };

    const verifyOtpAndReset = () => {
      if (inputOtp.value !== generatedOtp.value) {
        store.notice(store.t("El código PIN no coincide"), "fa-triangle-exclamation");
        return;
      }
      if (!newPassword.value || newPassword.value.length < 8) {
        store.notice(store.t("La contraseña debe tener al menos 8 caracteres"), "fa-triangle-exclamation");
        return;
      }
      if (newPassword.value !== confirmPassword.value) {
        store.notice(store.t("Las contraseñas no coinciden"), "fa-triangle-exclamation");
        return;
      }

      // Successful password reset
      store.notice(store.t("Contraseña restablecida exitosamente. Iniciando sesión..."), "fa-circle-check");
      const found = store.state.users.find(u => u.email.toLowerCase() === forgotEmail.value.toLowerCase());
      const targetId = found ? found.id : store.state.users[0]?.id || "user-client-brenda";
      store.switchUser(targetId);
      emit("close");
      router.push("/dashboard");
    };

    return {
      store,
      mode,
      socialProviders,
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
