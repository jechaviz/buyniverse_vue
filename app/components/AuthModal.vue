<template>
  <div v-if="open" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all">
    <div
      class="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 space-y-6"
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

      <!-- Modal Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand text-xl font-bold dark:bg-brand/20">
          <i class="fa-solid" :class="mode === 'login' ? 'fa-right-to-bracket' : 'fa-user-plus'"></i>
        </div>
        <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ mode === 'login' ? store.t("Iniciar Sesión en Buyniverse") : store.t("Crear Cuenta Empresarial") }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ mode === 'login' ? store.t("Accede a tus proyectos, subastas y contratos en fideicomiso.") : store.t("Únete al ecosistema líder de adquisiciones y talento verificado.") }}
        </p>
      </div>

      <!-- Mode Switcher Tabs -->
      <div class="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
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

      <!-- 1. LOGIN FORM -->
      <div v-if="mode === 'login'" class="space-y-4">
        <!-- 1-Click Fast Demo Logins -->
        <div class="rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5 dark:border-brand-900/40 dark:bg-brand-950/20 space-y-2">
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

        <div class="relative flex items-center justify-center">
          <span class="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-800"></span>
          <span class="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900">{{ store.t("o ingresa con tus credenciales") }}</span>
        </div>

        <form class="space-y-3" @submit.prevent="handleLogin">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Correo Electrónico") }}</label>
            <input v-model="loginEmail" type="email" required class="field text-xs" placeholder="tu@empresa.com" />
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Contraseña") }}</label>
            <input v-model="loginPass" type="password" required class="field text-xs" placeholder="••••••••••••" />
          </div>
          <button type="submit" class="btn-brand w-full py-3 text-xs font-bold shadow-md">
            <i class="fa-solid fa-lock mr-1.5"></i>{{ store.t("Ingresar a Buyniverse") }}
          </button>
        </form>
      </div>

      <!-- 2. REGISTER FORM -->
      <div v-else class="space-y-4">
        <!-- Account Type Selector -->
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{{ store.t("Tipo de Cuenta") }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition"
              :class="regType === 'Client' ? 'border-brand bg-brand-50/50 text-brand dark:bg-brand/20 dark:border-brand' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'"
              @click="regType = 'Client'"
            >
              <i class="fa-solid fa-building"></i>{{ store.t("Empresa / Comprador") }}
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition"
              :class="regType === 'Freelancer' ? 'border-brand bg-brand-50/50 text-brand dark:bg-brand/20 dark:border-brand' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'"
              @click="regType = 'Freelancer'"
            >
              <i class="fa-solid fa-laptop-code"></i>{{ store.t("Freelancer / Agencia") }}
            </button>
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="handleRegister">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Nombre Completo / Razón Social") }}</label>
              <input v-model="regName" type="text" required class="field text-xs" placeholder="Ej. Tech Corp" />
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("RFC / Tax ID") }}</label>
              <input v-model="regRfc" type="text" class="field text-xs font-mono uppercase" placeholder="XAXX010101000" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Correo Electrónico Corporativo") }}</label>
            <input v-model="regEmail" type="email" required class="field text-xs" placeholder="contacto@empresa.com" />
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ store.t("Contraseña Segura") }}</label>
            <input v-model="regPass" type="password" required minlength="8" class="field text-xs" placeholder="Mínimo 8 caracteres" />
          </div>

          <div class="pt-1">
            <label class="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
              <input v-model="regTerms" type="checkbox" required class="mt-0.5 rounded accent-brand" />
              <span>{{ store.t("Acepto los Términos de Servicio, Contrato de Fideicomiso (Escrow) y Política de Privacidad.") }}</span>
            </label>
          </div>

          <button type="submit" class="btn-brand w-full py-3 text-xs font-bold shadow-md">
            <i class="fa-solid fa-user-check mr-1.5"></i>{{ store.t("Crear Cuenta y Comenzar") }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
const { inject, ref } = Vue;
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

    const loginEmail = ref("");
    const loginPass = ref("");

    const regType = ref("Client");
    const regName = ref("");
    const regRfc = ref("");
    const regEmail = ref("");
    const regPass = ref("");
    const regTerms = ref(false);

    const demoProfiles = [
      { id: "user-client-brenda", name: "Brenda Smith", role: "Cliente / VP Compras", avatar: "BS" },
      { id: "user-freelancer-john", name: "John Doe", role: "Freelancer Top Rated", avatar: "JD" },
      { id: "user-freelancer-jane", name: "Jane Smith", role: "Directora Pixel Studio", avatar: "JS" },
      { id: "user-admin-admin", name: "Admin Operator", role: "SuperAdmin / Auditor", avatar: "AU" }
    ];

    const loginAs = (userId) => {
      store.switchUser(userId);
      store.notice(store.t("Sesión iniciada correctamente"), "fa-circle-check");
      emit("close");
      router.push("/dashboard");
    };

    const handleLogin = () => {
      // Find matching user or fallback to first
      const found = store.state.users.find(u => u.email.toLowerCase() === loginEmail.value.toLowerCase());
      const targetId = found ? found.id : store.state.users[0]?.id || "user-client-brenda";
      store.switchUser(targetId);
      store.notice(store.t("Sesión iniciada con éxito"), "fa-circle-check");
      emit("close");
      router.push("/dashboard");
    };

    const handleRegister = () => {
      const newId = `user-${Date.now()}`;
      const initials = regName.value.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U1";
      
      const newUser = {
        id: newId,
        name: regName.value,
        email: regEmail.value,
        type: regType.value,
        companyName: regType.value === "Client" ? regName.value : `${regName.value} Studio`,
        headline: regType.value === "Client" ? "Gerente de Compras & Proyectos" : "Especialista Profesional Certificado",
        skills: ["B2B", "Escrow", "Management"],
        avatar: initials,
        jss: 100,
        tier: "Hero",
        certLevel: 5,
        connects: 100,
        rfc: regRfc.value || "XAXX010101000",
        folioBalance: 20
      };

      store.state.users.push(newUser);
      store.switchUser(newId);
      store.notice(store.t("¡Cuenta creada exitosamente! Bienvenido a Buyniverse."), "fa-sparkles");
      emit("close");
      router.push(regType.value === "Client" ? "/post-job/new" : "/dashboard");
    };

    return {
      store,
      mode,
      demoProfiles,
      loginEmail,
      loginPass,
      regType,
      regName,
      regRfc,
      regEmail,
      regPass,
      regTerms,
      loginAs,
      handleLogin,
      handleRegister
    };
  },
};
</script>
