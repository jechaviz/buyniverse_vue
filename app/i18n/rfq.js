(function (global) {
  "use strict";
  // Plain-language copy of the price-request flow: ask for prices, approve proposals, live round, winner.
  // The labels RFQ and RFP stay as small tags; the sentences around them are meant to need no training.
  var dict = {
    "Your answer": "Tu respuesta",
    "Company": "Empresa",
    "Support": "Soporte",
    "Privacy notice": "Aviso de privacidad",
    "Terms of service": "Términos de servicio",
    "Progress": "Avance",
    "Ask for prices (RFQ)": "Pedir precios (RFQ)",
    "Approve proposals": "Aprobar propuestas",
    "Live round": "Puja en vivo",
    "Winner": "Ganador",
    "Proposal request (RFP)": "Pedir propuestas (RFP)",
    "Start the live round?": "¿Iniciar la puja en vivo?",
    "The approved suppliers will bid down from the best proposal. The lowest price when time ends wins.": "Los proveedores aprobados irán bajando su precio a partir de la mejor propuesta. Gana el precio más bajo cuando se acabe el tiempo.",
    "Start live round": "Iniciar la puja en vivo",
    "Live round running": "La puja en vivo está en marcha",
    "The live round cannot start now": "La puja en vivo no se puede iniciar ahora",
    "Live round started": "La puja en vivo comenzó",

    "Proposals": "Propuestas",
    "Each supplier's starting price. Approve the ones that may compete in the live round.": "El precio inicial de cada proveedor. Aprueba las que pueden competir en la puja en vivo.",
    "Can compete in the live round?": "¿Puede competir en la puja en vivo?",
    "Approve": "Aprobar",
    "This proposal cannot be approved now": "Esta propuesta ya no se puede aprobar",
    "Approve at least two proposals to start the live round": "Aprueba al menos dos propuestas para iniciar la puja en vivo",
    "The server could not start the live round. Check that every proposal reached it, then try again.": "El servidor no pudo iniciar la puja en vivo. Revisa que todas las propuestas hayan llegado y vuelve a intentar.",
    "The approval is saved here, but the server did not receive it yet": "La aprobación quedó guardada aquí, pero el servidor todavía no la recibió",
    "Your quote is saved here, but the server did not receive it yet": "Tu propuesta quedó guardada aquí, pero el servidor todavía no la recibió",

    "Recommended": "Recomendado",
    "Let the approved suppliers compete": "Que compitan los proveedores aprobados",
    "They start from their own prices and bid down in a live round. The lowest price when time ends wins. Only suppliers you approved can take part.": "Cada uno parte de su propio precio y lo va bajando en una puja en vivo. Gana el precio más bajo cuando se acabe el tiempo. Solo participan los que aprobaste.",
    "approved": "aprobadas",
    "You need at least two. Approve them in the Proposals tab.": "Necesitas al menos dos. Apruébalas en la pestaña Propuestas.",
    "Or choose a supplier directly": "O elige un proveedor directamente",

    "Step 1 · Your starting price (RFQ)": "Paso 1 · Tu precio inicial (RFQ)",
    "How much would you charge?": "¿Cuánto cobrarías?",
    "Only the buyer sees your price. If the buyer approves your proposal, you will compete live against the other approved suppliers and can lower your price.": "Solo el comprador ve tu precio. Si aprueba tu propuesta, competirás en vivo contra los otros proveedores aprobados y podrás bajar tu precio.",
    "Your starting price": "Tu precio inicial",
    "The full price for everything requested.": "El precio total de todo lo que se pide.",
    "Days to deliver": "Días para entregar",
    "Counted from the day the order is confirmed.": "Se cuentan desde el día en que se confirma el pedido.",
    "Your proposal": "Tu propuesta",
    "Update my proposal": "Actualizar mi propuesta",
    "Send my proposal": "Enviar mi propuesta",
    "Your proposal was approved": "Tu propuesta fue aprobada",
    "You can now compete live. You start from your own price and can only go lower.": "Ya puedes competir en vivo. Partes de tu propio precio y solo puedes bajarlo.",
    "Go to the live round": "Ir a la puja en vivo",
    "The buyer will start the live round soon. We will let you know.": "El comprador iniciará la puja en vivo pronto. Te avisaremos."
  };
  if (typeof global !== "undefined") global.__buyniverseI18n_rfq = dict;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
