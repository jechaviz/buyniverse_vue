/**
 * The demo's script. The people are in app/data/demo.js (scripts/build_demo_cast.js): a team inside every
 * supplier and the buyer's own internal team. This file is what they say and do: what a supplier asks the buyer
 * in a live round, how they react to being outbid, how each side's teams talk to each other and hand each other
 * tasks once an order exists, and the emails that go with it. Pure data and pure functions: the engine that plays
 * it is app/store/castActions.js. Nothing here is real: the addresses are yopmail.com and nothing is ever sent.
 */
(function (global) {
  "use strict";

  var hash = function (text) { var h = 2166136261; for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  var pickFrom = function (list, seed) { return list[Math.floor(hash(String(seed)) * list.length) % list.length]; };
  var say = function (entry, locale, vars) {
    var raw = typeof entry === "string" ? entry : (entry && (entry[locale] || entry.es)) || "";
    return raw.replace(/\{(\w+)\}/g, function (all, key) { return vars && vars[key] != null ? String(vars[key]) : all; });
  };

  // ---- Live round ---------------------------------------------------------------------------------
  var GREETINGS = [
    { es: "Buenas tardes a todos. Gracias por la invitación, estamos listos para competir.", en: "Good afternoon everyone. Thanks for the invitation, we are ready to compete." },
    { es: "Hola, confirmamos asistencia a la puja. Cualquier duda la vemos por este canal.", en: "Hello, we confirm we are in the round. We can sort out any question here." },
    { es: "Saludos. Ya revisamos las bases; participamos con gusto.", en: "Greetings. We reviewed the terms and are glad to take part." },
  ];
  // Questions a supplier asks the buyer before or during the round. `topic` ties each to its answer.
  var QUESTIONS = [
    { topic: "freight", es: "Una aclaración: ¿el precio debe incluir flete y entrega en sitio, o se cotiza puesto en almacén del proveedor?", en: "A clarification: should the price include freight and on-site delivery, or is it quoted ex-warehouse?" },
    { topic: "payment", es: "¿Qué plazo de pago aplica: 30 o 45 días? Cambia nuestro costo financiero.", en: "Which payment term applies: 30 or 45 days? It changes our financing cost." },
    { topic: "partial", es: "¿Aceptan entregas parciales por semana o necesitan todo en una sola entrega?", en: "Do you accept weekly partial deliveries or do you need everything in one shipment?" },
    { topic: "warranty", es: "¿Se requiere garantía extendida a 36 meses o basta la del fabricante?", en: "Is a 36-month extended warranty required, or is the manufacturer's enough?" },
    { topic: "invoice", es: "¿Facturamos con CFDI 4.0 a la razón social de Innovate Inc.? ¿Necesitan orden de compra en la factura?", en: "Do we invoice with CFDI 4.0 to Innovate Inc.? Do you need the purchase order on the invoice?" },
    { topic: "equivalent", es: "¿Aceptan marcas equivalentes si cumplen la ficha técnica, o solo las marcas listadas?", en: "Do you accept equivalent brands if they meet the datasheet, or only the listed ones?" },
    { topic: "install", es: "¿La puesta en marcha e instalación va incluida en el precio?", en: "Is installation and set-up included in the price?" },
  ];
  // The buyer's answer by topic, played by whoever asked or a colleague. Keyword rules find the topic in a typed message.
  var ANSWERS = {
    freight: { es: "Confirmado: el precio incluye flete y entrega en sitio. El riesgo de transporte es nuestro hasta la recepción.", en: "Confirmed: the price includes freight and on-site delivery. Transport risk is ours until receipt." },
    payment: { es: "Para esta compra aplica crédito a 30 días contra factura. Si lo prefieren a 45, el costo financiero lo vemos aparte.", en: "For this purchase 30-day credit against invoice applies. If you prefer 45, we see the financing cost separately." },
    partial: { es: "Sí, aceptamos entregas parciales semanales, siempre que el total llegue dentro del plazo ofertado.", en: "Yes, weekly partial deliveries are fine as long as the total arrives within the offered lead time." },
    warranty: { es: "Pedimos 36 meses de garantía; si es del fabricante, adjunten la póliza.", en: "We ask for 36 months of warranty; if it is the manufacturer's, attach the policy." },
    invoice: { es: "Sí, CFDI 4.0 a Innovate Inc. con la orden de compra en el campo de referencia.", en: "Yes, CFDI 4.0 to Innovate Inc. with the purchase order in the reference field." },
    equivalent: { es: "Aceptamos equivalentes si igualan o superan la ficha; TI valida antes de la compra.", en: "Equivalents are accepted if they match or exceed the datasheet; IT validates before purchase." },
    install: { es: "Incluyan instalación y puesta en marcha en sitio; no la cotizamos por separado.", en: "Include on-site installation and set-up; we do not quote it separately." },
  };
  // Replies a supplier gives when the buyer writes in the round channel.
  var SUPPLIER_REPLIES = {
    freight: { es: "Entendido. Nuestro precio actual ya incluye flete a sitio; lo dejamos así.", en: "Understood. Our current price already includes freight to site; we keep it." },
    payment: { es: "Gracias por precisar. Con 30 días podemos sostener nuestra oferta.", en: "Thanks for clarifying. With 30 days we can hold our offer." },
    partial: { es: "Perfecto, podemos surtir semanalmente sin costo adicional.", en: "Perfect, we can ship weekly at no extra cost." },
    warranty: { es: "Sin problema: la garantía de 36 meses va incluida con póliza del fabricante.", en: "No problem: the 36-month warranty is included with the manufacturer's policy." },
    invoice: { es: "Anotado. Facturamos CFDI 4.0 con la orden en referencia.", en: "Noted. We invoice CFDI 4.0 with the order in the reference." },
    equivalent: { es: "Gracias. Ofertamos la marca de la ficha; si mejoramos precio con un equivalente lo consultamos antes.", en: "Thanks. We bid the datasheet brand; if an equivalent improves the price we will check first." },
    install: { es: "Entendido, la instalación va incluida en nuestro precio.", en: "Understood, installation is included in our price." },
    price: { es: "Gracias por el comentario. Estamos revisando margen; si hay espacio mejoramos en la siguiente puja.", en: "Thanks for the comment. We are reviewing margin; if there is room we will improve in the next bid." },
    thanks: { es: "A la orden. Quedamos atentos.", en: "At your service. We remain available." },
    fallback: { es: "Recibido, lo confirmo con mi equipo y respondo por aquí.", en: "Received, I will confirm with my team and answer here." },
  };
  var TOPIC_WORDS = [
    ["freight", /flete|env[ií]o|entrega en sitio|transporte|freight|shipping|delivery/i], ["payment", /pago|cr[eé]dito|plazo de|payment|credit|net ?\d+/i], ["partial", /parcial|semanal|partial|weekly/i],
    ["warranty", /garant[ií]a|warranty/i], ["invoice", /factur|cfdi|invoice/i], ["equivalent", /equivalen|marca|brand/i], ["install", /instala|puesta en marcha|install|set-?up/i],
    ["price", /precio|descuento|mejorar|rebaja|price|discount|improve|better/i], ["thanks", /gracias|thanks|thank you/i],
  ];
  var topicOf = function (text) { var found = TOPIC_WORDS.filter(function (pair) { return pair[1].test(String(text || "")); })[0]; return found ? found[0] : "fallback"; };

  var OUTBID = [
    { es: "Bien jugado. Estamos evaluando si podemos mejorar.", en: "Well played. We are checking whether we can improve." },
    { es: "Nos superaron por poco; ajustamos.", en: "You edged us out; we are adjusting." },
    { es: "Ese precio ya toca nuestro margen mínimo.", en: "That price is touching our minimum margin." },
    { es: "Vamos con otra postura en un momento.", en: "We will come back with another bid shortly." },
  ];
  var LEADING = [
    { es: "Mantenemos la mejor oferta; seguimos atentos.", en: "We hold the best offer; staying alert." },
    { es: "Gracias, seguimos en primer lugar.", en: "Thanks, we are still in first place." },
  ];
  var RETIRE = { es: "Con este precio llegamos a nuestro límite. Nos retiramos de la puja; gracias por la oportunidad.", en: "At this price we reach our limit. We withdraw from the round; thanks for the opportunity." };
  var CLOSING = { es: "Gracias a todos. Quedamos atentos al resultado.", en: "Thanks everyone. We await the result." };

  // ---- Emails (never sent: shown in the demo's mailbox) ---------------------------------------------
  var MAIL = {
    invitation: function (v) { return { from: "Buyniverse", subject: { es: "Te invitaron a una puja en vivo: " + v.title, en: "You were invited to a live round: " + v.title }, body: { es: "Hola " + v.first + ",\n\n" + v.buyer + " te invita a competir en \"" + v.title + "\". La puja abre ahora y dura " + v.minutes + " minutos.\n\nEntra desde tu espacio de proveedor para enviar tu precio.\n\nBuyniverse", en: "Hello " + v.first + ",\n\n" + v.buyer + " invites you to compete in \"" + v.title + "\". The round opens now and lasts " + v.minutes + " minutes.\n\nSign in to your supplier space to send your price.\n\nBuyniverse" } }; },
    outbid: function (v) { return { from: "Buyniverse", subject: { es: "Te superaron en " + v.title, en: "You were outbid in " + v.title }, body: { es: "Hola " + v.first + ",\n\nAlguien ofertó menos que tú en \"" + v.title + "\". Tu última oferta fue " + v.last + ". Aún puedes mejorar antes de que cierre.\n\nBuyniverse", en: "Hello " + v.first + ",\n\nSomeone bid lower than you in \"" + v.title + "\". Your last bid was " + v.last + ". You can still improve before it closes.\n\nBuyniverse" } }; },
    question: function (v) { return { from: v.fromName, subject: { es: "Aclaración sobre " + v.title, en: "Clarification about " + v.title }, body: { es: "Hola " + v.buyerFirst + ",\n\n" + v.text + "\n\nSaludos,\n" + v.fromName + "\n" + v.company, en: "Hello " + v.buyerFirst + ",\n\n" + v.text + "\n\nRegards,\n" + v.fromName + "\n" + v.company } }; },
    answer: function (v) { return { from: v.fromName, subject: { es: "Re: Aclaración sobre " + v.title, en: "Re: Clarification about " + v.title }, body: { es: v.text + "\n\n" + v.fromName + "\n" + v.company, en: v.text + "\n\n" + v.fromName + "\n" + v.company } }; },
    closing: function (v) { return { from: "Buyniverse", subject: { es: "Cerró la puja: " + v.title, en: "The round closed: " + v.title }, body: { es: "Hola " + v.first + ",\n\nLa puja \"" + v.title + "\" cerró. " + (v.won ? "Tu oferta de " + v.last + " quedó en primer lugar." : "Tu mejor oferta fue " + v.last + ".") + " El comprador decidirá y te avisaremos.\n\nBuyniverse", en: "Hello " + v.first + ",\n\nThe round \"" + v.title + "\" closed. " + (v.won ? "Your bid of " + v.last + " is in first place." : "Your best bid was " + v.last + ".") + " The buyer will decide and we will let you know.\n\nBuyniverse" } }; },
    order: function (v) { return { from: v.fromName, subject: { es: v.subject, en: v.subjectEn || v.subject }, body: { es: v.text + "\n\n" + v.fromName + "\n" + v.company, en: (v.textEn || v.text) + "\n\n" + v.fromName + "\n" + v.company } }; },
  };

  // ---- An order: the two companies' teams work it together --------------------------------------------
  // Each step fires `at` seconds after the order is opened (scaled by the demo speed), once every step in `after` has fired.
  // `by` is "supplier.<role>" or "buyer.<role>". A step may say something, open a task, finish tasks and send an email.
  // `user: true` opens a task for the person watching, and the steps that need it wait until they finish it (or a reminder fires).
  var ORDER_STEPS = [
    { id: "confirm", at: 8, by: "supplier.sales", say: { es: "Hola equipo de Innovate. Confirmamos la orden {po}. Somos {first} (ventas), y con nosotros estarán técnica, logística y facturación. Les compartimos el plan en un momento.", en: "Hello Innovate team. We confirm order {po}. I am {first} (sales); technical, logistics and billing will be with us. We will share the plan shortly." },
      mail: { to: "buyer.requester", subject: { es: "Confirmamos la orden {po}", en: "We confirm order {po}" }, text: { es: "Confirmamos la orden {po} y las fechas acordadas. En breve te compartimos la ficha técnica y el plan de entrega.", en: "We confirm order {po} and the agreed dates. Shortly we will send the datasheet and the delivery plan." } },
      task: { key: "t-confirm", title: { es: "Confirmar la orden y las fechas con el cliente", en: "Confirm the order and dates with the client" }, side: "supplier", role: "sales", state: "done" } },
    { id: "datasheet", at: 22, by: "supplier.technical", after: ["confirm"], say: { es: "Les compartimos la ficha técnica y la garantía de 36 meses. Marcos, ¿podrías confirmar que es compatible con la imagen corporativa de TI?", en: "We are sharing the datasheet and the 36-month warranty. Marcos, could you confirm it is compatible with IT's corporate image?" },
      task: { key: "t-datasheet", title: { es: "Enviar ficha técnica y garantía", en: "Send datasheet and warranty" }, side: "supplier", role: "technical", state: "done" },
      open: { key: "t-compat", title: { es: "Confirmar compatibilidad con la imagen corporativa", en: "Confirm compatibility with the corporate image" }, side: "buyer", role: "requester" } },
    { id: "compat", at: 42, by: "buyer.requester", after: ["datasheet"], say: { es: "Revisado: es compatible. Solo necesitamos los drivers firmados para integrarlos a la imagen.", en: "Reviewed: it is compatible. We only need the signed drivers to add them to the image." },
      finish: ["t-compat"], open: { key: "t-drivers", title: { es: "Entregar drivers firmados a TI", en: "Deliver signed drivers to IT" }, side: "supplier", role: "technical" } },
    { id: "fiscal", at: 58, by: "buyer.finance", after: ["confirm"], say: { es: "Para facturar: CFDI 4.0, uso G03, y la orden {po} en referencia. ¿Pueden confirmar sus datos fiscales y condiciones de pago?", en: "For invoicing: CFDI 4.0, use G03, with order {po} as reference. Can you confirm your tax details and payment terms?" },
      mail: { to: "supplier.billing", subject: { es: "Datos para facturar la orden {po}", en: "Invoicing details for order {po}" }, text: { es: "Facturaremos con CFDI 4.0, uso G03, con la orden {po} en referencia. Por favor confirmen sus datos fiscales y condiciones de pago.", en: "We will invoice with CFDI 4.0, use G03, with order {po} as reference. Please confirm your tax details and payment terms." } },
      open: { key: "t-fiscal", title: { es: "Confirmar datos fiscales y condiciones de pago", en: "Confirm tax details and payment terms" }, side: "supplier", role: "billing" } },
    { id: "drivers", at: 70, by: "supplier.technical", after: ["compat"], say: { es: "Enviados los drivers firmados a TI por correo. Cualquier ajuste me avisan.", en: "Signed drivers sent to IT by email. Let me know about any adjustment." }, finish: ["t-drivers"],
      mail: { to: "buyer.requester", subject: { es: "Drivers firmados · {po}", en: "Signed drivers · {po}" }, text: { es: "Adjuntamos los drivers firmados y el hash de verificación. Quedo atento a tus comentarios.", en: "We attach the signed drivers and the verification hash. I remain available for your comments." } } },
    { id: "billing", at: 82, by: "supplier.billing", after: ["fiscal"], say: { es: "Datos confirmados, Patricia: facturamos contra entrega con la orden {po} en referencia, a 30 días. Les enviamos la constancia fiscal por correo.", en: "Details confirmed, Patricia: we invoice on delivery with order {po} as reference, at 30 days. We are emailing the tax certificate." },
      finish: ["t-fiscal"], open: { key: "t-invoice", title: { es: "Emitir factura (CFDI 4.0) al entregar", en: "Issue invoice (CFDI 4.0) on delivery" }, side: "supplier", role: "billing" },
      mail: { to: "buyer.finance", subject: { es: "Constancia fiscal y condiciones · {po}", en: "Tax certificate and terms · {po}" }, text: { es: "Confirmamos nuestros datos fiscales y pago a 30 días contra factura. Adjuntamos la constancia de situación fiscal.", en: "We confirm our tax details and payment at 30 days against invoice. We attach the tax status certificate." } } },
    { id: "window", at: 96, by: "supplier.logistics", after: ["confirm"], say: { es: "Ernesto, para programar la entrega: ¿qué ventana de recepción prefieren y en qué andén?", en: "Ernesto, to schedule delivery: which receiving window do you prefer, and which dock?" },
      open: { key: "t-window", title: { es: "Confirmar ventana de recepción en almacén", en: "Confirm the warehouse receiving window" }, side: "buyer", role: "warehouse" } },
    { id: "window-answer", at: 118, by: "buyer.warehouse", after: ["window"], say: { es: "Lunes a viernes de 9:00 a 13:00, andén 2. Necesitamos aviso 24 horas antes y el listado de series.", en: "Monday to Friday 9:00 to 13:00, dock 2. We need 24 hours' notice and the serial-number list." },
      finish: ["t-window"], open: { key: "t-serials", title: { es: "Preparar listado de series y avisar 24 h antes", en: "Prepare the serial list and notify 24 h ahead" }, side: "supplier", role: "logistics" } },
    { id: "legal", at: 130, by: "buyer.legal", after: ["confirm"], say: { es: "Por parte de legal: necesitamos la póliza de garantía firmada y los términos de entrega adjuntos a la orden.", en: "From legal: we need the signed warranty policy and the delivery terms attached to the order." },
      open: { key: "t-terms", title: { es: "Enviar póliza de garantía y términos firmados", en: "Send the signed warranty policy and terms" }, side: "supplier", role: "sales" },
      mail: { to: "supplier.sales", subject: { es: "Documentos pendientes de la orden {po}", en: "Pending documents for order {po}" }, text: { es: "Para cerrar el expediente necesitamos la póliza de garantía firmada y los términos de entrega.", en: "To close the file we need the signed warranty policy and the delivery terms." } } },
    { id: "terms", at: 150, by: "supplier.sales", after: ["legal"], say: { es: "Valeria, ya subimos la póliza y los términos firmados al expediente de la orden.", en: "Valeria, we uploaded the signed policy and terms to the order file." }, finish: ["t-terms"] },
    { id: "schedule", at: 165, by: "supplier.logistics", after: ["window-answer"], say: { es: "Propuesta de entrega: {eta}, ventana 9:00 a 13:00 en andén 2. Les pido su visto bueno para confirmar el transporte.", en: "Delivery proposal: {eta}, window 9:00 to 13:00 at dock 2. I ask for your approval to confirm transport." },
      finish: ["t-serials"], user: { key: "t-approve", title: { es: "Aprobar el calendario de entrega propuesto", en: "Approve the proposed delivery schedule" }, side: "buyer", role: "owner" },
      mail: { to: "buyer.owner", subject: { es: "Calendario de entrega propuesto · {po}", en: "Proposed delivery schedule · {po}" }, text: { es: "Proponemos entregar el {eta}, de 9:00 a 13:00 en andén 2. Necesitamos tu aprobación para confirmar el transporte.", en: "We propose delivering on {eta}, from 9:00 to 13:00 at dock 2. We need your approval to confirm transport." } } },
    { id: "reminder", at: 280, by: "supplier.sales", after: ["schedule"], unlessDone: ["t-approve"], say: { es: "Un recordatorio amable: seguimos esperando tu aprobación del calendario de entrega para no perder la ventana del transportista.", en: "A friendly reminder: we are still waiting for your approval of the delivery schedule so we do not lose the carrier's slot." },
      mail: { to: "buyer.owner", subject: { es: "Recordatorio: aprobar calendario · {po}", en: "Reminder: approve schedule · {po}" }, text: { es: "Seguimos esperando tu aprobación del calendario de entrega para confirmar el transporte.", en: "We are still waiting for your approval of the delivery schedule to confirm transport." } } },
    { id: "approved", at: 0, by: "supplier.logistics", after: ["schedule"], whenDone: ["t-approve"], delay: 6, say: { es: "Gracias. Transporte confirmado. Les enviamos la guía y el listado de series 24 horas antes de llegar.", en: "Thank you. Transport confirmed. We will send the waybill and serial list 24 hours before arrival." },
      open: { key: "t-deliver", title: { es: "Entregar en almacén y recabar acuse", en: "Deliver to the warehouse and collect the receipt" }, side: "supplier", role: "logistics" },
      mail: { to: "buyer.warehouse", subject: { es: "Transporte confirmado · {po}", en: "Transport confirmed · {po}" }, text: { es: "Confirmamos transporte para el {eta}. Les enviamos guía y listado de series 24 horas antes.", en: "We confirm transport for {eta}. We will send waybill and serial list 24 hours before." } } },
    { id: "ready", at: 0, by: "supplier.sales", after: ["approved", "billing", "terms", "drivers"], delay: 12, say: { es: "Todo listo de nuestra parte: documentos, drivers, facturación y entrega programada. Gracias al equipo de Innovate por la coordinación.", en: "All set on our side: documents, drivers, billing and delivery scheduled. Thanks to the Innovate team for the coordination." } },
  ];

  var api = { hash: hash, pickFrom: pickFrom, say: say, topicOf: topicOf, GREETINGS: GREETINGS, QUESTIONS: QUESTIONS, ANSWERS: ANSWERS, SUPPLIER_REPLIES: SUPPLIER_REPLIES, OUTBID: OUTBID, LEADING: LEADING, RETIRE: RETIRE, CLOSING: CLOSING, MAIL: MAIL, ORDER_STEPS: ORDER_STEPS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BuyniverseCastScript = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
