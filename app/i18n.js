(function (global) {
  "use strict";

  var dicts = [];
  if (global.__buyniverseI18n_core) dicts.push(global.__buyniverseI18n_core);
  if (global.__buyniverseI18n_marketplace) dicts.push(global.__buyniverseI18n_marketplace);
  if (global.__buyniverseI18n_workspace) dicts.push(global.__buyniverseI18n_workspace);
  if (global.__buyniverseI18n_fiscal) dicts.push(global.__buyniverseI18n_fiscal);
  if (global.__buyniverseI18n_procurement) dicts.push(global.__buyniverseI18n_procurement);

  if (typeof globalThis !== "undefined") {
    if (globalThis.__buyniverseI18n_core) dicts.push(globalThis.__buyniverseI18n_core);
    if (globalThis.__buyniverseI18n_marketplace) dicts.push(globalThis.__buyniverseI18n_marketplace);
    if (globalThis.__buyniverseI18n_workspace) dicts.push(globalThis.__buyniverseI18n_workspace);
    if (globalThis.__buyniverseI18n_fiscal) dicts.push(globalThis.__buyniverseI18n_fiscal);
    if (globalThis.__buyniverseI18n_procurement) dicts.push(globalThis.__buyniverseI18n_procurement);
  }

  if (dicts.length === 0) {
    try {
      var fs = (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") ? process.getBuiltinModule("fs") : null;
      var path = (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") ? process.getBuiltinModule("path") : null;
      if (!fs && typeof process !== "undefined" && process.mainModule) {
        fs = process.mainModule.require("fs");
        path = process.mainModule.require("path");
      }
      if (fs && path) {
        var baseDir = path.resolve("app/i18n");
        var files = ["core.js", "marketplace.js", "workspace.js", "fiscal.js", "procurement.js"];
        for (var f = 0; f < files.length; f++) {
          var content = fs.readFileSync(path.join(baseDir, files[f]), "utf8");
          var subScope = {};
          new Function("global", "window", "module", "exports", content)(subScope, subScope, {}, {});
          if (subScope.__buyniverseI18n_core) dicts.push(subScope.__buyniverseI18n_core);
          if (subScope.__buyniverseI18n_marketplace) dicts.push(subScope.__buyniverseI18n_marketplace);
          if (subScope.__buyniverseI18n_workspace) dicts.push(subScope.__buyniverseI18n_workspace);
          if (subScope.__buyniverseI18n_fiscal) dicts.push(subScope.__buyniverseI18n_fiscal);
          if (subScope.__buyniverseI18n_procurement) dicts.push(subScope.__buyniverseI18n_procurement);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  var es = {};
  for (var i = 0; i < dicts.length; i++) {
    Object.assign(es, dicts[i]);
  }

  // Common fallbacks and system tokens
  Object.assign(es, {
    "No milestones yet.": "Aún no hay hitos.",
    "This field is required.": "Este campo es obligatorio.",
    "Enter a value in the requested format.": "Ingresa un valor con el formato solicitado.",
    "Use the requested format.": "Usa el formato solicitado.",
    "Enter a value that matches the allowed increment.":
      "Ingresa un valor que respete el incremento permitido.",
    "Shorten this value.": "Reduce la longitud de este valor.",
    "Review this field.": "Revisa este campo.",
    "Route not found": "Ruta no encontrada",
    "Go home": "Ir al inicio",
    "Go to Dashboard": "Ir al panel",
    "This view could not be loaded": "No se pudo cargar esta vista",
    "Retry": "Reintentar"
  });

  var patterns = [
    {
      match: /^Drag (.+)$/,
      replace: function (_, value) {
        return "Arrastrar " + (es[value] || value);
      },
    },
    {
      match: /^Filter (.+)$/,
      replace: function (_, value) {
        return "Filtrar " + (es[value] || value);
      },
    },
    {
      match: /^Select (.+)$/,
      replace: function (_, value) {
        return "Seleccionar " + (es[value] || value);
      },
    },
    {
      match: /^Actions for (.+); primary action (.+)$/,
      replace: function (_, item, action) {
        return "Acciones para " + (es[item] || item) + "; acción principal " + (es[action] || action);
      },
    },
    {
      match: /^Actions for (.+)$/,
      replace: function (_, item) {
        return "Acciones para " + (es[item] || item);
      },
    },
    {
      match: /^(\d+) records$/,
      replace: function (_, count) {
        return count + " registros";
      },
    },
    {
      match: /^(\d+) unread$/,
      replace: function (_, count) {
        return count + " sin leer";
      },
    },
    {
      match: /^(\d+) days$/,
      replace: function (_, count) {
        return count + " días";
      },
    },
    {
      match: /^(\d+) revisions$/,
      replace: function (_, count) {
        return count + " revisiones";
      },
    },
    {
      match: /^(\d+) provider proposals?$/,
      replace: function (_, count) {
        return count === "1"
          ? "1 propuesta de proveedor"
          : count + " propuestas de proveedores";
      },
    },
    {
      match: /^(\d+) proposals received$/,
      replace: function (_, count) {
        return count === "1"
          ? "1 propuesta recibida"
          : count + " propuestas recibidas";
      },
    },
    {
      match: /^(\d+)% complete$/,
      replace: function (_, count) {
        return count + "% completado";
      },
    },
    {
      match: /^(\d+) entries \u00b7 Winner: (.+)$/,
      replace: function (_, count, winner) {
        return count + (count === "1" ? " participación" : " participaciones") + " · Ganador: " + winner;
      },
    },
    {
      match: /^Contract (.+)$/,
      replace: function (_, value) {
        return "Contrato " + value;
      },
    },
    {
      match: /^Invoice (.+)$/,
      replace: function (_, value) {
        return "Factura " + value;
      },
    },
    {
      match: /^Live contest \u00b7 (.+)$/,
      replace: function (_, status) {
        return "Concurso en vivo · " + (es[status] || status);
      },
    },
    {
      match: /^Step (\d+) of (\d+)$/,
      replace: function (_, step, total) {
        return "Paso " + step + " de " + total;
      },
    },
    {
      match: /^(\d+) qualified supplier\(s\)$/,
      replace: function (_, count) {
        return count + (count === "1" ? " proveedor calificado" : " proveedores calificados");
      },
    },
    {
      match: /^(\d+) active suppliers$/,
      replace: function (_, count) {
        return count + (count === "1" ? " proveedor activo" : " proveedores activos");
      },
    },
    {
      match: /^On-time (\d+)%$/,
      replace: function (_, count) {
        return count + "% a tiempo";
      },
    },
    {
      match: /^(\d+)% received$/,
      replace: function (_, count) {
        return count + "% recibido";
      },
    },
    {
      match: /^(\d+) of (\d+)$/,
      replace: function (_, visible, total) {
        return visible + " de " + total;
      },
    },
    {
      match: /^(\d+)\/(\d+) extensions$/,
      replace: function (_, used, total) {
        return used + "/" + total + " extensiones";
      },
    },
    {
      match: /^(.+) compressed$/,
      replace: function (_, value) {
        return value + " de reducción";
      },
    },
    {
      match: /^(\d+) invited suppliers\.$/,
      replace: function (_, count) {
        return count + (count === "1" ? " proveedor invitado." : " proveedores invitados.");
      },
    },
    {
      match: /^· (\d+) invited suppliers\.$/,
      replace: function (_, count) {
        return "· " + count + (count === "1" ? " proveedor invitado." : " proveedores invitados.");
      },
    },
    {
      match: /^Reserve (.+)$/,
      replace: function (_, value) {
        return "Reserva " + value;
      },
    },
    {
      match: /^Owner: (.+)$/,
      replace: function (_, owner) {
        return "Responsable: " + (es[owner] || owner);
      },
    },
    {
      match: /^IF (.+)$/,
      replace: function (_, condition) {
        return "SI " + (es[condition] || condition);
      },
    },
    {
      match: /^THEN (.+)$/,
      replace: function (_, action) {
        return "ENTONCES " + (es[action] || action);
      },
    },
    {
      match: /^(.+) \u00b7 (.+) \u00b7 No due date$/,
      replace: function (_, category, value) {
        return (es[category] || category) + " · " + value + " · Sin fecha límite";
      },
    },
    {
      match: /^(\d+) need attention$/,
      replace: function (_, count) {
        return count + " requieren atención";
      },
    },
    {
      match: /^(\d+) invited$/,
      replace: function (_, count) {
        return count + " invitados";
      },
    },
    {
      match: /^(\d+) offers$/,
      replace: function (_, count) {
        return count + " ofertas";
      },
    },
    {
      match: /^(\d+) issues?$/,
      replace: function (_, count) {
        return count + (count === "1" ? " incidencia" : " incidencias");
      },
    },
    {
      match: /^(\d+)% on time$/,
      replace: function (_, count) {
        return count + "% a tiempo";
      },
    },
    {
      match: /^Step (\d+)$/,
      replace: function (_, count) {
        return "Paso " + count;
      },
    },
    {
      match: /^Round (\d+)$/,
      replace: function (_, count) {
        return "Ronda " + count;
      },
    },
    {
      match: /^Due (.+)$/,
      replace: function (_, value) {
        return "Vence " + value;
      },
    },
    {
      match: /^(Development|Design|Marketing) · (.+) · Due (.+)$/,
      replace: function (_, category, value, date) {
        return (es[category] || category) + " · " + value + " · Vence " + date;
      },
    },
    {
      match: /^(.+) · (\d+) offers$/,
      replace: function (_, value, count) {
        return value + " · " + count + " ofertas";
      },
    },
    {
      match: /^(.+) · commercial terms$/,
      replace: function (_, value) {
        return value + " · condiciones comerciales";
      },
    },
    {
      match: /^(.+) · (.+)$/,
      replace: function (_, first, second) {
        return (es[first] || first) + " · " + (es[second] || second);
      },
    },
    {
      match: /^Last local save (.+)$/,
      replace: function (_, value) {
        return "Último guardado local " + value;
      },
    },
    {
      match: /^Contract · (.+)$/,
      replace: function (_, value) {
        return "Contrato · " + value;
      },
    },
    {
      match: /^Live contest · (.+)$/,
      replace: function (_, value) {
        return "Concurso en vivo · " + value;
      },
    },
    {
      match: /^Ends (.+) · Prize (.+)$/,
      replace: function (_, date, prize) {
        return "Termina " + date + " · Premio " + prize;
      },
    },
    {
      match: /^by (.+)$/,
      replace: function (_, actor) {
        return "por " + actor;
      },
    },
    {
      match: /^Use (.+) accent$/,
      replace: function (_, color) {
        return "Usar acento " + (es[color] || color);
      },
    },
    {
      match: /^(\d+)–(\d+) of (\d+)$/,
      replace: function (_, from, to, total) {
        return from + "–" + to + " de " + total;
      },
    },
    {
      match: /^Export (.+)$/,
      replace: function (_, format) {
        return "Exportar " + (es[format] || format);
      },
    },
    {
      match: /^Version (\d+)$/,
      replace: function (_, count) {
        return "Versión " + count;
      },
    },
    {
      match: /^PR: (.+)$/,
      replace: function (_, value) {
        return "SP: " + value;
      },
    },
    {
      match: /^RFX: (.+)$/,
      replace: function (_, value) {
        return "RFX: " + value;
      },
    },
    {
      match: /^Invoice: (.+)$/,
      replace: function (_, value) {
        return "Factura: " + value;
      },
    },
    {
      match: /^Awarded: (.+)$/,
      replace: function (_, value) {
        return "Adjudicado: " + value;
      },
    },
    {
      match: /^Replying to (.+)$/,
      replace: function (_, value) {
        return "Respondiendo a " + value;
      },
    },
    {
      match: /^Closes (.+)$/,
      replace: function (_, value) {
        return "Cierra " + value;
      },
    },
    {
      match: /^Protected (.+)$/,
      replace: function (_, value) {
        return "Protegido " + value;
      },
    },
    {
      match: /^Score (.+) with (.+), (\d+)-day lead time and risk (.+)\. The buyer makes the final choice\.$/,
      replace: function (_, score, price, lead, risk) {
        return "Puntuación " + score + " con " + price + ", plazo de entrega de " + lead + " días y riesgo " + risk + ". El comprador toma la decisión final.";
      },
    },
  ];

  var service = global.WebCommon.createRuntimeI18n({
    sourceLocale: "en",
    supported: ["en", "es"],
    storageKey: "buyniverse-vue-locale",
    messages: { es: es },
    patterns: patterns,
  });

  global.BuyniverseI18n = service;
})(window);
