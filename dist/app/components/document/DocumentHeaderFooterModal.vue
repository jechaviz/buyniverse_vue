<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 space-y-5"
    >
      <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand text-sm">
            <i class="fa-solid fa-heading"></i>
          </span>
          <div>
            <h3 class="font-head text-sm font-800 text-slate-900 dark:text-white">{{ store.t("Personalizar Encabezados y Pies de Página") }}</h3>
            <p class="text-[11px] text-slate-400">{{ store.t("Configuración aplicable a las Hojas Carta del documento") }}</p>
          </div>
        </div>
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          @click="$emit('close')"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <!-- Running Header -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="font-bold text-slate-700 dark:text-slate-300">
              <i class="fa-solid fa-heading mr-1.5 text-brand"></i>{{ store.t("Texto del Encabezado Superior") }}
            </label>
            <label class="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
              <input type="checkbox" :checked="showRunningHeader" @change="$emit('update:showRunningHeader', $event.target.checked)" class="accent-brand" />
              <span>{{ store.t("Mostrar") }}</span>
            </label>
          </div>
          <input
            :value="headerText"
            @input="$emit('update:headerText', $event.target.value)"
            class="field text-xs py-2 px-3"
            :placeholder="store.t('Ej. BUY-2026-RFP · Especificación Técnica de Compra')"
          />
        </div>

        <!-- Running Footer -->
        <div>
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            <i class="fa-solid fa-shoe-prints mr-1.5 text-brand"></i>{{ store.t("Texto del Pie de Página") }}
          </label>
          <input
            :value="footerText"
            @input="$emit('update:footerText', $event.target.value)"
            class="field text-xs py-2 px-3"
            :placeholder="store.t('Ej. Confidencial · Buyniverse Escrow Protected')"
          />
        </div>

        <!-- Page Number Format -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              <i class="fa-solid fa-list-ol mr-1.5 text-brand"></i>{{ store.t("Estilo de Paginación") }}
            </label>
            <select
              :value="pageNumberFormat"
              @change="$emit('update:pageNumberFormat', $event.target.value)"
              class="field text-xs py-2 px-2.5"
            >
              <option value="Page X of Y">Página X de Y (Estándar)</option>
              <option value="X / Y">X / Y (Compacto)</option>
              <option value="Page X">Página X</option>
              <option value="none">Sin numeración</option>
            </select>
          </div>

          <div>
            <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              <i class="fa-solid fa-stamp mr-1.5 text-brand"></i>{{ store.t("Marca de Agua / Tag") }}
            </label>
            <select
              :value="watermarkText"
              @change="$emit('update:watermarkText', $event.target.value)"
              class="field text-xs py-2 px-2.5"
            >
              <option value="">Ninguna</option>
              <option value="CONFIDENCIAL">CONFIDENCIAL</option>
              <option value="BORRADOR">BORRADOR</option>
              <option value="BAFO 2026">BAFO 2026</option>
              <option value="PROTEGIDO NDA">PROTEGIDO NDA</option>
            </select>
          </div>
        </div>

        <!-- Suppression on Covers -->
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <label class="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              :checked="suppressOnCover"
              @change="$emit('update:suppressOnCover', $event.target.checked)"
              class="accent-brand"
            />
            <span>{{ store.t("Ocultar encabezado y pie en Portadas") }}</span>
          </label>
          <p class="text-[10px] text-slate-400 mt-1 ml-5">
            {{ store.t("Las portadas se presentarán con diseño limpio de página completa sin bordes repetitivos.") }}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          class="btn-brand text-xs py-1.5 px-4 font-bold"
          @click="$emit('close')"
        >
          <i class="fa-solid fa-check mr-1"></i>{{ store.t("Aplicar") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "DocumentHeaderFooterModal",
  props: {
    store: Object,
    headerText: String,
    footerText: String,
    pageNumberFormat: String,
    showRunningHeader: Boolean,
    watermarkText: String,
    suppressOnCover: Boolean,
  },
  emits: [
    "close",
    "update:headerText",
    "update:footerText",
    "update:pageNumberFormat",
    "update:showRunningHeader",
    "update:watermarkText",
    "update:suppressOnCover",
  ],
};
</script>
