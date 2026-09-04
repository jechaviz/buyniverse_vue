<template>
  <nav class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/85 sm:px-8">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <!-- Logo & Brand -->
      <RouterLink to="/" class="flex items-center gap-3 group">
        <span class="grid h-10 w-10 place-items-center rounded-2xl bg-brand font-head text-lg font-bold text-white shadow-md shadow-brand/30 group-hover:scale-105 transition-transform">
          B
        </span>
        <div>
          <span class="font-head text-lg font-800 tracking-tight text-slate-900 dark:text-white block">Buyniverse</span>
          <span class="text-[10px] font-bold uppercase tracking-wider text-brand -mt-1 block">{{ store.t("B2B Sourcing & Talent") }}</span>
        </div>
      </RouterLink>

      <!-- Public Nav Links -->
      <div class="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
        <RouterLink to="/procurement/auction" class="hover:text-brand transition flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {{ store.t("Subastas en Vivo") }}
        </RouterLink>
        <RouterLink to="/procurement/sourcing" class="hover:text-brand transition">
          {{ store.t("Rondas RFX") }}
        </RouterLink>
        <RouterLink to="/find-talent" class="hover:text-brand transition">
          {{ store.t("Buscar Talento") }}
        </RouterLink>
        <RouterLink to="/browse-services" class="hover:text-brand transition">
          {{ store.t("Servicios") }}
        </RouterLink>
      </div>

      <!-- Actions & Auth Buttons -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        <!-- Language Selector -->
        <div class="flex rounded-xl bg-slate-100 p-0.5 text-[10px] font-bold dark:bg-slate-800/80" role="group" aria-label="Select language">
          <button
            v-for="code in ['es', 'en']"
            :key="code"
            class="h-6 rounded-lg px-2 transition font-bold"
            :class="locale === code ? 'bg-white text-brand shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-400'"
            :aria-label="code === 'es' ? 'Spanish' : 'English'"
            @click="$emit('set-locale', code)"
          >
            {{ code.toUpperCase() }}
          </button>
        </div>

        <!-- Theme Toggle -->
        <button
          class="grid h-8 w-8 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 hover:text-brand dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 transition"
          :aria-label="dark ? 'Light mode' : 'Dark mode'"
          @click="$emit('toggle-theme')"
        >
          <i class="fa-solid text-xs" :class="dark ? 'fa-sun' : 'fa-moon'"></i>
        </button>

        <!-- Auth Buttons -->
        <button
          type="button"
          class="btn-muted text-xs py-2 px-3.5"
          @click="$emit('open-auth', 'login')"
        >
          <i class="fa-solid fa-right-to-bracket mr-1.5"></i>{{ store.t("Iniciar Sesión") }}
        </button>

        <button
          type="button"
          class="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2 text-xs font-bold text-brand hover:bg-brand-100/70 dark:border-brand-900/40 dark:bg-brand-950/40 transition"
          @click="$emit('launch-demo')"
        >
          <i class="fa-solid fa-flask text-xs"></i>{{ store.t("Explore demo") }}
        </button>

        <button
          type="button"
          class="btn-brand text-xs py-2 px-4 shadow-sm"
          @click="$emit('open-auth', 'register')"
        >
          <i class="fa-solid fa-user-plus mr-1.5"></i>{{ store.t("Registrarse") }}
        </button>

        <RouterLink
          to="/dashboard"
          class="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2 text-xs font-bold text-brand hover:bg-brand-100/70 dark:border-brand-900/40 dark:bg-brand-950/40 transition"
        >
          <i class="fa-solid fa-gauge text-xs"></i>{{ store.t("Ir al Panel") }}
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
<script>
export default {
  props: {
    locale: String,
    dark: Boolean,
  },
  emits: ["set-locale", "toggle-theme", "open-auth", "launch-demo"],
  setup() {
    return { store: Vue.inject("store") };
  },
};
</script>
