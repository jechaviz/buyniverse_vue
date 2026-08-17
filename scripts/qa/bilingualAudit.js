const fs = require("fs");
const path = require("path");

function runBilingualAudit(root, read, vueFiles) {
  const localeStorage = new Map();
  const i18nScope = {
    navigator: { language: "en-US" },
    localStorage: {
      getItem: (key) => localeStorage.get(key) || null,
      setItem: (key, value) => localeStorage.set(key, String(value)),
    },
    dispatchEvent: () => {},
    CustomEvent: function (type, init) {
      this.type = type;
      this.detail = init?.detail;
    },
  };
  new Function("window", read("../lib/web-common/browser.js"))(i18nScope);
  new Function("window", read("app/i18n.js"))(i18nScope);
  if (
    !i18nScope.BuyniverseI18n.setLocale("es") ||
    i18nScope.BuyniverseI18n.t("Projects") !== "Proyectos" ||
    i18nScope.BuyniverseI18n.t("12 records") !== "12 registros" ||
    i18nScope.BuyniverseI18n.t("Commercial summary") !== "Resumen comercial" ||
    i18nScope.BuyniverseI18n.t("1 provider proposal") !== "1 propuesta de proveedor" ||
    i18nScope.BuyniverseI18n.t("2 provider proposals") !== "2 propuestas de proveedores" ||
    i18nScope.BuyniverseI18n.t("Step 3 of 5") !== "Paso 3 de 5" ||
    i18nScope.BuyniverseI18n.t("Drag Status") !== "Arrastrar Estado" ||
    i18nScope.BuyniverseI18n.t("Filter Status") !== "Filtrar Estado" ||
    i18nScope.BuyniverseI18n.t("ACTIVE") !== "ACTIVO" ||
    i18nScope.BuyniverseI18n.t("Owner: Risk Office") !== "Responsable: Oficina de Riesgos" ||
    i18nScope.BuyniverseI18n.t("· 3 invited suppliers.") !== "· 3 proveedores invitados." ||
    i18nScope.BuyniverseI18n.intlLocale() !== "es-MX" ||
    localeStorage.get("buyniverse-vue-locale") !== "es"
  )
    throw new Error("Bilingual runtime translation or persistence failed");

  const localeInvariantCopy = new Set([
    "Buyniverse", "Finkok", "SW Sapien", "Total", "Subtotal", "CFDI 4.0",
    "Marketing", "Brief", "+60 sec", "Incoterm", "Net 15", "Net 30",
    "Net 45", "Net 60", "Control",
  ]);

  const staticCopy = [
    ...new Set(
      vueFiles.flatMap((file) => {
        const template = read(file).match(/<template>([\s\S]*?)<\/template>/)?.[1];
        return [...(template || "").matchAll(/>([^<{][^<]*)</g)]
          .map((match) => match[1].replace(/\s+/g, " ").trim())
          .filter(
            (value) =>
              value.length > 1 &&
              value.length <= 180 &&
              /[A-Za-z]/.test(value) &&
              !/[{}=<>]/.test(value) &&
              !/^(Ctrl K|ESC|[A-Z]{2,6}|[A-Z0-9-]+)$/.test(value) &&
              !localeInvariantCopy.has(value),
          );
      }),
    ),
  ];

  const translatedStaticCopy = staticCopy.filter((value) => i18nScope.BuyniverseI18n.t(value) !== value);
  const translationCoverage = Math.round((translatedStaticCopy.length / staticCopy.length) * 100);

  if (translationCoverage < 80)
    throw new Error(`Static bilingual coverage is too low: ${translationCoverage}%`);

  const indexSource = read("index.html");
  if (!indexSource.includes("app/i18n.js") || indexSource.indexOf("app/i18n.js") > indexSource.indexOf("app/main.js"))
    throw new Error("The bilingual catalogue must load before the application");

  const appSource = read("app/App.vue");
  for (const token of ['aria-label="Language"', "buyniverse-vue-locale", "setLocale(code)", "BuyniverseI18n.install", 'aria-labelledby="user-preferences-title"'])
    if (!`${appSource}\n${read("app/i18n.js")}`.includes(token))
      throw new Error(`Bilingual UI coverage is missing ${token}`);

  if (
    appSource.indexOf('aria-label="Language"') < appSource.indexOf('aria-label="Account menu"') ||
    appSource.includes("paletteOpen") ||
    appSource.includes('aria-label="Toggle theme"') ||
    appSource.includes('aria-label="Change accent color"')
  )
    throw new Error("Language, theme and accent must live in the account menu");

  return `${translationCoverage}% static copy coverage`;
}

module.exports = { runBilingualAudit };
