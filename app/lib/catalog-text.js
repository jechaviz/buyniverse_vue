/**
 * Display text of catalog specs. Spec values are mostly technical (a processor, a resolution) and stay as they
 * are; the few English words in them (materials, colours, kinds of product, warranty terms) are translated here,
 * so a Spanish buyer does not read half a sentence in English. Pure: the same call gives the same text.
 */
(function (global) {
  "use strict";

  var PHRASES = [
    [/Small form factor/g, "Compacto"], [/Mini PC/g, "Mini PC"], [/All-in-one/g, "Todo en uno"], [/Pen drive/g, "Memoria USB"], [/Sheet-fed scanner/g, "Escáner de alimentación por hoja"],
    [/Echo cancellation/g, "Cancelación de eco"], [/Mic noise cancelling/g, "Cancelación de ruido del micrófono"], [/Passive \+ mic noise reduction/g, "Pasiva + reducción de ruido del micrófono"],
    [/Hybrid ANC/g, "ANC híbrido"], [/Dual mics/g, "Doble micrófono"], [/Thermal transfer/g, "Transferencia térmica"], [/Ink tank/g, "Tanque de tinta"], [/Labels up to (\d+) mm/g, "Etiquetas de hasta $1 mm"],
    [/A4 to A3 \(carrier\)/g, "A4 a A3 (con carrier)"], [/Diskless, up to (\d+) bays/g, "Sin discos, hasta $1 bahías"], [/(\d+) SATA bay \(disk not included\)/g, "$1 bahía SATA (disco no incluido)"],
    [/Plastic, cushioned palm rest/g, "Plástico, descansa-palmas acolchado"], [/Plastic \/ aluminium/g, "Plástico / aluminio"], [/Up to (\d+) h video/g, "Hasta $1 h de video"], [/Up to (\d+) h/g, "Hasta $1 h"],
    [/(\d+) years?/g, function (m, n) { return n + (n === "1" ? " año" : " años"); }], [/(\d+) months/g, "$1 meses"], [/(\d+) user\b/g, "$1 usuario"], [/(\d+) devices/g, "$1 dispositivos"], [/(\d+) cores/g, "$1 núcleos"],
    [/Keyboard \+ mouse/g, "Teclado + ratón"], [/Laptops DDR4/g, "Laptops DDR4"], [/Desktops DDR5/g, "Equipos de escritorio DDR5"], [/(\d+(?:\.\d+)?)" laptops/g, 'Laptops de $1"'],
    [/Windows, macOS, web/g, "Windows, macOS, web"], [/Windows, macOS, mobile/g, "Windows, macOS, móvil"], [/Smart \(web\)/g, "Smart (web)"],
    [/\b45 W PoE budget\b/g, "45 W de presupuesto PoE"], [/5 Gbps firewall/g, "Firewall de 5 Gbps"], [/LED commercial/g, "LED comercial"], [/On-ear headset/g, "Diadema sobre la oreja"], [/Over-ear headset/g, "Diadema circumaural"],
    [/Conference speakerphone/g, "Altavoz para conferencias"], [/Webcam 4K/g, "Cámara web 4K"], [/Security cable/g, "Cable de seguridad"], [/\bLifetime\b/g, "De por vida"], [/\bMulti\b/g, "Varios"],
  ];
  var SINGLE = {
    Plastic: "Plástico", Black: "Negro", Grey: "Gris", Graphite: "Grafito", Metal: "Metal", Steel: "Acero", Aluminium: "Aluminio", Braided: "Trenzado", Nylon: "Nailon", Polyester: "Poliéster",
    Keyboard: "Teclado", Mouse: "Ratón", Cable: "Cable", Dock: "Dock", Webcam: "Cámara web", Laser: "Láser", Inkjet: "Inyección de tinta", Monochrome: "Monocromática", Color: "Color",
    Portable: "Portátil", Tower: "Torre", Tiny: "Mini", Subscription: "Suscripción", Unmanaged: "No administrable", "Managed L2": "Administrable L2", Ethernet: "Ethernet",
  };

  function spec(value, locale) {
    var text = String(value == null ? "" : value);
    if (locale !== "es") return text;
    if (Object.prototype.hasOwnProperty.call(SINGLE, text)) return SINGLE[text];
    PHRASES.forEach(function (pair) { text = text.replace(pair[0], pair[1]); });
    return text;
  }

  var api = { spec: spec };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BuyniverseCatalogText = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
