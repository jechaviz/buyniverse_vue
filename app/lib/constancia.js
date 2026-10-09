(function (global) {
  "use strict";

  // Reads a Constancia de Situacion Fiscal (PDF) in the browser: the file never
  // leaves the device. pdf.js is self-hosted (assets/vendor/pdfjs, unmodified),
  // loaded only when a file is chosen, and only its text is used. The parser is
  // pure so it can be tested without a browser. It fills the form as a
  // convenience; every value is validated again by the server on save.

  function plain(text) {
    return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  }
  // The labels of the constancia, used to know where a value ends.
  var LABELS = "Nombre de Vialidad|Tipo de Vialidad|N[uú]mero Exterior|N[uú]mero Interior|Nombre de la Colonia|Nombre de la Localidad|Nombre del Municipio|Nombre de la Entidad|Entre Calle|Y Calle|Correo Electr[oó]nico|Tel[eé]fono|Fecha|CP|C[oó]digo Postal|Reg[ií]menes|Actividades|Obligaciones|Estatus|AL\\b";
  function value(one, label) {
    var rx = new RegExp(label + "\\s*:\\s*(.+?)(?=\\s+(?:" + LABELS + ")\\s*:|\\s+(?:" + LABELS + ")\\b|$)", "i");
    var match = one.match(rx);
    return match ? match[1].trim() : "";
  }

  function normalizeName(name) {
    return String(name || "").toUpperCase().replace(/\s+/g, " ").trim()
      .replace(/[,\s]+(S\.?\s?A\.?\s?P\.?\s?I\.?|S\.?\s?A\.?\s?B\.?|S\.?\s?A\.?|S\.?\s?DE\s?R\.?\s?L\.?|S\.?\s?C\.?|A\.?\s?C\.?|S\.?\s?A\.?\s?S\.?)(\s+DE\s+C\.?\s?V\.?)?\.?$/u, "")
      .replace(/[ ,.]+$/, "");
  }

  /** text: the PDF's text; regimes: the SAT catalogue { code: { name } }. */
  function parse(text, regimes) {
    var one = String(text || "").replace(/\s*\n+\s*/g, " ");
    var grab = function (rx) { var m = one.match(rx); return m && m[1] ? m[1].trim() : ""; };
    var rfc = grab(/RFC:\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i) || grab(/\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/);
    var name = grab(/Denominaci[oó]n\s*\/?\s*Raz[oó]n\s*Social:\s*(.+?)\s+(?:R[eé]gimen\s+Capital|Nombre\s+Comercial|Fecha)/i);
    if (!name) {
      var first = grab(/Nombre\s*\(s\):\s*(.+?)\s+Primer\s+Apellido/i), a1 = grab(/Primer\s+Apellido:\s*(.+?)\s+Segundo\s+Apellido/i), a2 = grab(/Segundo\s+Apellido:\s*(.+?)\s+(?:Fecha|Estatus)/i);
      if (first) name = [first, a1, a2].filter(Boolean).join(" ");
    }
    var section = plain(one.split(/Reg[ií]menes:?/i)[1] || one);
    // The constancia words regimes its own way ("Regimen de Actividades Empresariales y Profesionales" for the
    // catalogue's "Personas Fisicas con Actividades..."): a long, distinctive core of the name is enough.
    var core = function (name) { return plain(name).replace(/^(REGIMEN (DE LAS |DE LOS |DE |DEL )?|PERSONAS FISICAS CON |GENERAL DE LEY )/, ""); };
    var codes = Object.keys(regimes || {});
    var found = codes.filter(function (code) { return section.indexOf(plain(regimes[code].name)) >= 0; });
    codes.forEach(function (code) {
      var distinctive = core(regimes[code].name);
      if (found.indexOf(code) < 0 && distinctive.length >= 20 && section.indexOf(distinctive) >= 0) found.push(code);
    });
    var street = value(one, "Nombre de Vialidad"), outer = value(one, "N[uú]mero Exterior"), inner = value(one, "N[uú]mero Interior");
    var address = [street, outer ? "No. " + outer : "", inner ? "Int. " + inner : ""].filter(Boolean).join(" ");
    return {
      rfc: rfc ? rfc.toUpperCase() : "",
      legalName: name ? normalizeName(name) : "",
      postalCode: grab(/C[oó]digo\s+Postal:\s*(\d{5})/i),
      regimes: found,
      street: address,
      neighborhood: value(one, "Nombre de la Colonia"),
      tradeName: grab(/Nombre\s+Comercial:\s*(.+?)\s+(?:Fecha|Estatus|Regimen)/i),
    };
  }

  var pdfjs = null;
  function loadPdfjs() {
    if (pdfjs) return pdfjs;
    var root = new URL(global.BuyniverseBase ? global.BuyniverseBase.root : "/", global.location.origin).href;
    pdfjs = import(root + "assets/vendor/pdfjs/pdf.min.mjs").then(function (lib) {
      // CSP forbids real workers; pdf.js then runs its worker code in the page (from this same origin).
      lib.GlobalWorkerOptions.workerSrc = root + "assets/vendor/pdfjs/pdf.worker.min.mjs";
      return lib;
    }).catch(function (error) { pdfjs = null; throw error; });
    return pdfjs;
  }
  function text(file) {
    if (!file || file.type !== "application/pdf" || file.size > 8 * 1024 * 1024) return Promise.reject(new Error("Choose the constancia as a PDF of up to 8 MB."));
    return Promise.all([loadPdfjs(), file.arrayBuffer()]).then(function (parts) {
      return parts[0].getDocument({ data: parts[1], isEvalSupported: false }).promise;
    }).then(function (doc) {
      var pages = []; for (var i = 1; i <= Math.min(doc.numPages, 4); i++) pages.push(doc.getPage(i).then(function (page) { return page.getTextContent(); }));
      return Promise.all(pages);
    }).then(function (contents) {
      return contents.map(function (content) { return content.items.map(function (item) { return item.str; }).join("\n"); }).join("\n");
    });
  }

  global.BuyniverseConstancia = { parse: parse, text: text, read: function (file, regimes) { return text(file).then(function (value) { return parse(value, regimes); }); }, normalizeName: normalizeName };
})(typeof window !== "undefined" ? window : globalThis);
