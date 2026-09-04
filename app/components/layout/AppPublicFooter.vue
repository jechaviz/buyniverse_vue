<template>
  <footer class="border-t border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md py-12 px-4 sm:px-8">
    <div class="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-5 text-xs">
      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center gap-2.5">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand font-head font-bold text-white text-sm shadow-sm shadow-brand/30">B</span>
          <span class="font-head text-base font-800 text-slate-900 dark:text-white">Buyniverse</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {{ store.t("Plataforma SaaS empresarial para compras B2B, subastas inversas en vivo (BAFO), rondas RFX, contratos en fideicomiso (Escrow) y facturación SAT CFDI 4.0.") }}
        </p>
      </div>

      <div class="space-y-2.5">
        <b class="font-head text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">{{ store.t("Soluciones") }}</b>
        <ul class="space-y-1.5 text-slate-500 dark:text-slate-400">
          <li><RouterLink to="/procurement/auction" class="hover:text-brand transition">{{ store.t("Subastas Inversas") }}</RouterLink></li>
          <li><RouterLink to="/procurement/sourcing" class="hover:text-brand transition">{{ store.t("Rondas de Cotización RFX") }}</RouterLink></li>
          <li><RouterLink to="/post-job/new" class="hover:text-brand transition">{{ store.t("Publicar Proyecto") }}</RouterLink></li>
          <li><RouterLink to="/find-talent" class="hover:text-brand transition">{{ store.t("Directorio de Proveedores") }}</RouterLink></li>
        </ul>
      </div>

      <div class="space-y-2.5">
        <b class="font-head text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">{{ store.t("Cumplimiento") }}</b>
        <ul class="space-y-1.5 text-slate-500 dark:text-slate-400">
          <li><RouterLink to="/invoices" class="hover:text-brand transition">{{ store.t("Facturación CFDI 4.0") }}</RouterLink></li>
          <li><RouterLink to="/projects" class="hover:text-brand transition">{{ store.t("Fideicomiso por Hitos") }}</RouterLink></li>
          <li><RouterLink to="/dashboard" class="hover:text-brand transition">{{ store.t("Auditoría Inmutable") }}</RouterLink></li>
        </ul>
      </div>

      <div class="space-y-2.5">
        <b class="font-head text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">{{ store.t("Empresa") }}</b>
        <ul class="space-y-1.5 text-slate-500 dark:text-slate-400">
          <li><a href="#" class="hover:text-brand transition">{{ store.t("Términos de Servicio") }}</a></li>
          <li><a href="#" class="hover:text-brand transition">{{ store.t("Aviso de Privacidad") }}</a></li>
          <li><a href="#" class="hover:text-brand transition">{{ store.t("Soporte Empresarial") }}</a></li>
        </ul>
      </div>
    </div>

    <div class="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
      <p>© 2026 Buyniverse Technologies. {{ store.t("Todos los derechos reservados.") }}</p>
      <div class="flex items-center gap-4">
        <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {{ store.t("Sistemas Operativos 100%") }}
        </span>
      </div>
    </div>
  </footer>
</template>
<script>
export default {
  setup() {
    return { store: Vue.inject("store") };
  },
};
</script>
