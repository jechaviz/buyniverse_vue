<template>
  <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
    <!-- Top Configuration Bar for Cover / Section End -->
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90 flex-none">
      <div class="flex items-center gap-2">
        <span
          class="badge text-[11px] font-bold"
          :class="activeSection.type === 'cover' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'"
        >
          <i :class="activeSection.type === 'cover' ? 'fa-solid fa-file-shield mr-1' : 'fa-solid fa-file-circle-check mr-1'"></i>
          {{ activeSection.type === 'cover' ? store.t("Portada de Sección") : store.t("Fin de Sección / Firmas") }}
        </span>

        <!-- Vertical Alignment Switcher (Top, Center, Bottom) -->
        <div class="flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 dark:bg-slate-800 dark:border-slate-700 text-xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase px-1.5">{{ store.t("Posición:") }}</span>
          <button
            type="button"
            class="px-2 py-0.5 rounded-lg font-bold transition text-[11px] flex items-center gap-1"
            :class="activeSection.alignVertical === 'top' ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'"
            @click="activeSection.alignVertical = 'top'"
            :title="store.t('Alinear al inicio de la página')"
          >
            <i class="fa-solid fa-align-left rotate-90"></i>
            <span>{{ store.t("Inicio") }}</span>
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-lg font-bold transition text-[11px] flex items-center gap-1"
            :class="(!activeSection.alignVertical || activeSection.alignVertical === 'center') ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'"
            @click="activeSection.alignVertical = 'center'"
            :title="store.t('Centrar verticalmente en la página')"
          >
            <i class="fa-solid fa-align-center"></i>
            <span>{{ store.t("Al Centro") }}</span>
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-lg font-bold transition text-[11px] flex items-center gap-1"
            :class="activeSection.alignVertical === 'bottom' ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'"
            @click="activeSection.alignVertical = 'bottom'"
            :title="store.t('Alinear al final de la página')"
          >
            <i class="fa-solid fa-align-right rotate-90"></i>
            <span>{{ store.t("Al Final") }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Template Presets for Cover -->
      <div class="flex items-center gap-1.5">
        <button
          v-if="activeSection.type === 'cover'"
          type="button"
          class="btn-muted text-xs py-1 px-2.5 font-bold"
          @click="applyNdaCoverPreset"
        >
          <i class="fa-solid fa-user-lock text-brand mr-1"></i>{{ store.t("Leyenda NDA") }}
        </button>
        <button
          v-if="activeSection.type === 'section_end'"
          type="button"
          class="btn-muted text-xs py-1 px-2.5 font-bold"
          @click="activeSection.showSignatures = !activeSection.showSignatures"
        >
          <i class="fa-solid fa-signature text-brand mr-1"></i>{{ store.t("Bloque de Firmas") }}
        </button>
      </div>
    </div>

    <!-- Main Editor Form and Live Cover Visualizer Split View -->
    <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column: Form Fields for Cover / End -->
      <div class="space-y-4 text-xs">
        <div>
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            {{ activeSection.type === 'cover' ? store.t("Título Principal de la Portada") : store.t("Título de Cierre") }}
          </label>
          <input
            v-model="activeSection.title"
            class="field text-sm font-bold"
            :placeholder="activeSection.type === 'cover' ? store.t('PLIEGO DE ESPECIFICACIONES TÉCNICAS') : store.t('CIERRE DE SECCIÓN & ACEPTACIÓN')"
          />
        </div>

        <div v-if="activeSection.type === 'cover'">
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            {{ store.t("Subtítulo / Modalidad de Compra") }}
          </label>
          <input
            v-model="activeSection.subtitle"
            class="field text-xs"
            :placeholder="store.t('Subasta Inversa BAFO · Licitación RFQ-2026-042')"
          />
        </div>

        <div>
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            {{ store.t("Descripción o Resumen Ejecutivo") }}
          </label>
          <textarea
            v-model="activeSection.content"
            rows="3"
            class="field text-xs font-mono"
            :placeholder="store.t('Resumen ejecutivo, objeto del pliego y requisitos mandatorios...')"
          ></textarea>
        </div>

        <!-- Cover Specific: NDA Disclaimer & Version Control -->
        <template v-if="activeSection.type === 'cover'">
          <div>
            <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              <i class="fa-solid fa-shield-halved text-brand mr-1"></i>{{ store.t("Leyenda Legal / Aviso de Confidencialidad (NDA)") }}
            </label>
            <textarea
              v-model="activeSection.legalDisclaimer"
              rows="2"
              class="field text-xs"
              :placeholder="store.t('Este documento contiene secretos industriales protegidos por NDA...')"
            ></textarea>
          </div>

          <div>
            <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              <i class="fa-solid fa-code-branch text-brand mr-1"></i>{{ store.t("Control de Versiones y Metadata") }}
            </label>
            <input
              v-model="activeSection.versionText"
              class="field text-xs"
              :placeholder="store.t('v2.1 · 20/08/2026 · Aprobado por Comité de Compras')"
            />
          </div>
        </template>
      </div>

      <!-- Right Column: Live Letter Page Simulated Preview with Real Positioning -->
      <div class="flex flex-col items-center justify-center p-2">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <i class="fa-solid fa-eye text-brand"></i>
          <span>{{ store.t("Vista Previa Hoja Carta (Alineación: ") + (activeSection.alignVertical || 'center') + ")" }}</span>
        </div>

        <!-- Simulated 8.5x11 Sheet with Dynamic Flex Alignment -->
        <div
          class="w-full max-w-sm aspect-[8.5/11] rounded-2xl border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 flex flex-col overflow-hidden relative"
          :class="activeSection.alignVertical === 'top' ? 'justify-start' : activeSection.alignVertical === 'bottom' ? 'justify-end' : 'justify-center'"
        >
          <!-- Watermark tag if center -->
          <div
            v-if="activeSection.type === 'cover'"
            class="space-y-4"
            :class="activeSection.alignVertical === 'center' ? 'text-center' : ''"
          >
            <span class="inline-block rounded-lg bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              {{ store.t("Documento Confidencial · BAFO") }}
            </span>
            <div>
              <h2 class="font-head text-lg font-800 text-slate-900 dark:text-white leading-tight">
                {{ activeSection.title || store.t("TÍTULO DE LA PORTADA") }}
              </h2>
              <p v-if="activeSection.subtitle" class="text-xs font-semibold text-brand mt-1">
                {{ activeSection.subtitle }}
              </p>
            </div>
            <p v-if="activeSection.content" class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {{ activeSection.content }}
            </p>
            <div v-if="activeSection.legalDisclaimer" class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 text-left">
              <b class="block mb-0.5"><i class="fa-solid fa-lock mr-1"></i>NDA & Confidencialidad:</b>
              {{ activeSection.legalDisclaimer }}
            </div>
            <div v-if="activeSection.versionText" class="text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-2 dark:border-slate-800">
              {{ activeSection.versionText }}
            </div>
          </div>

          <!-- Section End Layout -->
          <div
            v-else
            class="space-y-4"
            :class="activeSection.alignVertical === 'center' ? 'text-center' : ''"
          >
            <span class="inline-block rounded-lg bg-emerald-500/10 text-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              {{ store.t("Cierre de Sección") }}
            </span>
            <h2 class="font-head text-base font-800 text-slate-900 dark:text-white">
              {{ activeSection.title || store.t("Fin de Sección") }}
            </h2>
            <p v-if="activeSection.content" class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {{ activeSection.content }}
            </p>
            <div v-if="activeSection.showSignatures" class="border-t border-slate-200 pt-3 dark:border-slate-700 grid grid-cols-2 gap-2 text-[9px] text-center text-slate-500 font-mono">
              <div class="border-b border-dashed border-slate-400 pb-4">Firma Comprador</div>
              <div class="border-b border-dashed border-slate-400 pb-4">Firma Proveedor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "DocumentCoverEditor",
  props: {
    store: Object,
    activeSection: Object,
  },
  setup(props) {
    function applyNdaCoverPreset() {
      if (!props.activeSection) return;
      props.activeSection.subtitle = "Acuerdo de Confidencialidad y Secretos Industriales";
      props.activeSection.legalDisclaimer = "La información contenida en este pliego es de carácter estrictamente confidencial. Queda prohibida su reproducción o divulgación total o parcial sin autorización por escrito.";
      props.activeSection.versionText = `Versión 1.0 · ${new Date().toLocaleDateString()} · Buyniverse Escrow Protected`;
      props.store.notice("Preset de Leyendas NDA aplicado a la portada", "fa-shield-halved");
    }

    return { applyNdaCoverPreset };
  },
};
</script>
