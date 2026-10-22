<template>
  <main class="bn bn-legal" :aria-labelledby="'legal-title'">
    <section class="bn-legal__hero">
      <div class="bn-wrap">
        <p class="bn-legal__eyebrow"><i class="fa-solid fa-scale-balanced"></i>{{ doc.eyebrow }}</p>
        <h1 id="legal-title" class="bn-legal__title">{{ doc.title }}</h1>
        <p class="bn-legal__meta">{{ doc.updated }}</p>
        <nav class="bn-legal__switch" :aria-label="doc.switchLabel">
          <RouterLink to="/privacidad" :class="{ 'is-on': kind === 'privacy' }">{{ copy.privacyName }}</RouterLink>
          <RouterLink to="/terminos" :class="{ 'is-on': kind === 'terms' }">{{ copy.termsName }}</RouterLink>
        </nav>
      </div>
    </section>

    <div class="bn-wrap bn-legal__body">
      <aside class="bn-legal__toc" :aria-label="doc.tocLabel">
        <ol><li v-for="(section, index) in doc.sections" :key="index"><a :href="'#s' + (index + 1)">{{ section.h }}</a></li></ol>
      </aside>
      <article class="bn-legal__text">
        <section v-for="(section, index) in doc.sections" :id="'s' + (index + 1)" :key="index">
          <h2>{{ index + 1 }}. {{ section.h }}</h2>
          <p v-for="(paragraph, p) in section.p" :key="p">{{ paragraph }}</p>
          <ul v-if="section.li"><li v-for="(item, i) in section.li" :key="i">{{ item }}</li></ul>
        </section>
        <p class="bn-legal__contact">{{ copy.contactLead }} <a :href="'mailto:' + LEGAL.email">{{ LEGAL.email }}</a>.</p>
      </article>
    </div>
  </main>
</template>

<script>
const { inject, computed } = Vue;
const { useRoute } = VueRouter;

// The facts every notice depends on. Edit here (and only here) when the responsible entity is set up.
const LEGAL = {
  brand: "Buyniverse",
  email: "hi@buyniverse.com",
  entity: "",        // legal name of the responsible entity, when constituted
  address: "",       // registered address, when available
  updated: { es: "Última actualización: 22 de octubre de 2026", en: "Last updated: October 22, 2026" },
};

const who = (lang) => {
  const parts = [LEGAL.entity || LEGAL.brand];
  if (LEGAL.address) parts.push(lang === "es" ? `con domicilio en ${LEGAL.address}` : `located at ${LEGAL.address}`);
  return parts.join(", ");
};

const DOCS = {
  es: {
    privacy: () => ({
      eyebrow: "Aviso de privacidad", title: "Aviso de privacidad", updated: LEGAL.updated.es, switchLabel: "Documentos legales", tocLabel: "Contenido",
      sections: [
        { h: "Quién es responsable de tus datos", p: [`${who("es")} (en adelante, Buyniverse) es responsable del tratamiento de los datos personales que se describen en este aviso, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`] },
        { h: "Qué datos tratamos", p: ["Tratamos solo los datos necesarios para que una empresa compre, venda y facture en la plataforma:"], li: [
          "Identidad: nombre y correo de tu cuenta de Google al iniciar sesión. No creamos ni guardamos contraseñas.",
          "Empresa: razón social, RFC, régimen fiscal, domicilio fiscal, sucursales y personas de tu equipo.",
          "Fiscales: certificado de sello digital (CSD) y su clave, que se guardan cifrados y se usan solo para timbrar tus facturas.",
          "Operación: necesidades, propuestas, pujas, adjudicaciones, facturas, mensajes y documentos que tú o tu equipo cargan.",
          "Cobro: la cuenta CLABE que registras para recibir pagos, cifrada.",
          "Técnicos: registros de seguridad (fecha, acción y dirección IP en forma de huella) para detectar abusos."] },
        { h: "Para qué los usamos", p: ["Para crear y proteger tu cuenta, operar subastas y solicitudes de precio, emitir y cancelar facturas CFDI, calcular y cobrar la comisión de la plataforma, enviarte avisos del servicio y atender tus solicitudes de soporte. No vendemos tus datos ni los usamos para publicidad de terceros."] },
        { h: "Con quién los compartimos", p: ["Solo con quienes hacen posible el servicio, y únicamente lo necesario:"], li: [
          "Google, para iniciar sesión.",
          "El proveedor autorizado de certificación (PAC) que timbra tus facturas, y el SAT cuando corresponde.",
          "El proveedor de correo que envía los avisos del servicio y el proveedor de alojamiento donde corre la plataforma.",
          "Los demás participantes de una operación: un proveedor invitado ve lo necesario para cotizar; un comprador ve las propuestas que le corresponden.",
          "Autoridades, cuando una ley o resolución lo exija."] },
        { h: "Cómo los protegemos", p: ["El estado de cada empresa, los correos de invitaciones, las llaves fiscales y las cuentas de cobro se guardan cifrados. Cada acceso se valida en el servidor por empresa, sucursal y rol, y los eventos relevantes quedan en una bitácora que no puede alterarse. Mantenemos respaldos diarios de acceso restringido. Ningún sistema es infalible; si ocurre una vulneración que afecte tus datos, te lo notificaremos."] },
        { h: "Cookies y rastreo", p: ["Usamos una cookie de sesión necesaria para mantener tu inicio de sesión, que se borra al cerrar el navegador. No usamos cookies de publicidad ni píxeles de seguimiento de terceros. Si algún día lo hiciéramos, te pediríamos tu consentimiento antes."] },
        { h: "Tus derechos (ARCO)", p: [`Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su tratamiento, y revocar tu consentimiento, escribiendo a ${LEGAL.email} desde el correo de tu cuenta. Responderemos en un máximo de 20 días hábiles. Algunos datos fiscales deben conservarse el tiempo que exijan las leyes aplicables, aunque pidas su cancelación.`] },
        { h: "Cuánto tiempo los conservamos", p: ["Mientras tu cuenta esté activa y después, solo el tiempo que exijan las obligaciones fiscales, contables y de seguridad. Los códigos de acceso a la demostración vencen por sí solos."] },
        { h: "Cambios a este aviso", p: ["Si cambiamos este aviso, publicaremos la nueva versión en esta página con su fecha. Si el cambio altera de fondo cómo usamos tus datos, te avisaremos por correo."] },
      ],
    }),
    terms: () => ({
      eyebrow: "Términos de servicio", title: "Términos de servicio", updated: LEGAL.updated.es, switchLabel: "Documentos legales", tocLabel: "Contenido",
      sections: [
        { h: "Qué es Buyniverse", p: [`Buyniverse es una plataforma para que empresas pidan precios (RFQ), comparen propuestas, hagan pujas en vivo entre proveedores aprobados, adjudiquen y facturen. ${who("es")} opera la plataforma. Al usarla aceptas estos términos.`] },
        { h: "Cuentas y empresas", p: ["Inicias sesión con tu cuenta de Google. Eres responsable de lo que se haga con tu cuenta y de que los datos de tu empresa sean verdaderos. Solo puedes actuar en nombre de una empresa si estás autorizado para ello. Los administradores de una empresa deciden quién de su equipo puede hacer qué."] },
        { h: "Cómo funciona una compra", p: ["El comprador publica una necesidad y los proveedores invitados mandan su precio inicial. El comprador aprueba las propuestas que quiere y solo esas compiten en una puja en vivo que parte de la mejor propuesta; gana el precio más bajo cuando termina el tiempo. Cada puja y cada propuesta son definitivas y quedan registradas. El contrato de compraventa es entre comprador y proveedor."] },
        { h: "Pagos: no custodiamos fondos", p: ["Buyniverse no recibe ni guarda el dinero de las operaciones. El pago se hace directamente entre comprador y proveedor. La plataforma registra la recepción y la conciliación entre orden, recepción y factura que autorizan cada pago por hito."] },
        { h: "Comisión", p: ["Cobramos una comisión cuando adjudicas una operación. Se calcula sobre el ahorro verificado, con un piso y un tope sobre lo adjudicado, y los porcentajes vigentes se muestran en la calculadora pública (/ahorro) y en tu cuenta. Sin adjudicación no hay comisión; con poco o ningún ahorro se aplica el piso. La calculadora es una estimación de una sola comparación, no una cotización ni una promesa de ahorro. Durante periodos informativos la comisión se muestra pero no se cobra. Podemos cambiar los porcentajes con aviso previo; el cambio no afecta adjudicaciones ya liquidadas."] },
        { h: "Facturación electrónica", p: ["Los CFDI se timbran con un proveedor autorizado de certificación usando el certificado de sello digital de tu empresa. Eres responsable de que tus datos fiscales, tu certificado y tus conceptos sean correctos y de cumplir tus obligaciones ante el SAT. Los timbres se acreditan cuando se confirma su pago."] },
        { h: "Uso aceptable", p: ["No puedes usar la plataforma para:"], li: [
          "ofrecer o aceptar operaciones fuera de la plataforma para evitar la comisión de una operación iniciada aquí;",
          "manipular una puja, un presupuesto o una propuesta, o usar cuentas falsas;",
          "intentar acceder a datos de otras empresas, interrumpir el servicio o evadir sus controles;",
          "cargar contenido ilícito o que no tengas derecho a compartir."] },
        { h: "Demostración", p: ["El acceso de demostración es privado, por invitación, y usa datos ficticios. Nada de lo que ocurra en la demostración es una operación real."] },
        { h: "Disponibilidad y responsabilidad", p: ["Hacemos un esfuerzo razonable por mantener el servicio disponible, pero no lo garantizamos sin interrupciones. En la medida que la ley lo permite, Buyniverse no responde por daños indirectos ni por pérdidas derivadas de operaciones entre compradores y proveedores, y su responsabilidad total no excederá la comisión que hayas pagado en los doce meses anteriores al hecho."] },
        { h: "Cambios, suspensión y ley aplicable", p: ["Podemos actualizar estos términos publicando la nueva versión con su fecha; si usas la plataforma después del cambio, lo aceptas. Podemos suspender cuentas que incumplan estos términos. Estos términos se rigen por las leyes de los Estados Unidos Mexicanos."] },
      ],
    }),
    copy: { privacyName: "Privacidad", termsName: "Términos", contactLead: "¿Dudas o solicitudes sobre tus datos o estos términos? Escríbenos a" },
  },
  en: {
    privacy: () => ({
      eyebrow: "Privacy notice", title: "Privacy notice", updated: LEGAL.updated.en, switchLabel: "Legal documents", tocLabel: "Contents",
      sections: [
        { h: "Who is responsible for your data", p: [`${who("en")} (Buyniverse) is responsible for the personal data described in this notice, under Mexico's Federal Law on the Protection of Personal Data Held by Private Parties.`] },
        { h: "What data we process", p: ["Only what a company needs to buy, sell and invoice on the platform:"], li: [
          "Identity: the name and email of your Google account when you sign in. We do not create or store passwords.",
          "Company: legal name, RFC, tax regime, tax address, branches and the people on your team.",
          "Tax: the digital seal certificate (CSD) and its key, stored encrypted and used only to stamp your invoices.",
          "Operations: needs, proposals, bids, awards, invoices, messages and documents that you or your team upload.",
          "Payouts: the CLABE account you register to get paid, encrypted.",
          "Technical: security logs (time, action and a hashed IP address) to detect abuse."] },
        { h: "What we use it for", p: ["To create and protect your account, run price requests and auctions, issue and cancel CFDI invoices, calculate and collect the platform fee, send service notices and answer support requests. We do not sell your data or use it for third-party advertising."] },
        { h: "Who we share it with", p: ["Only with those who make the service possible, and only what is needed:"], li: [
          "Google, for sign-in.",
          "The authorised certification provider (PAC) that stamps your invoices, and the SAT where applicable.",
          "The email provider that sends service notices and the hosting provider where the platform runs.",
          "The other parties in a deal: an invited supplier sees what it needs to quote; a buyer sees the proposals meant for it.",
          "Authorities, when a law or ruling requires it."] },
        { h: "How we protect it", p: ["Each company's workspace, invitation emails, tax keys and payout accounts are stored encrypted. Every access is checked on the server by company, branch and role, and relevant events go to a log that cannot be altered. We keep daily backups with restricted access. No system is infallible; if a breach affects your data, we will tell you."] },
        { h: "Cookies and tracking", p: ["We use one session cookie, needed to keep you signed in, deleted when you close the browser. We use no advertising cookies or third-party tracking pixels. If that ever changes, we will ask for your consent first."] },
        { h: "Your rights (ARCO)", p: [`You may access, correct or delete your data, object to its processing and withdraw consent by writing to ${LEGAL.email} from your account email. We reply within 20 business days. Some tax records must be kept for as long as applicable law requires, even if you ask for deletion.`] },
        { h: "How long we keep it", p: ["While your account is active and afterwards only as long as tax, accounting and security obligations require. Demo access codes expire on their own."] },
        { h: "Changes to this notice", p: ["If we change this notice we will publish the new version here with its date. If a change alters how we use your data in a significant way, we will email you."] },
      ],
    }),
    terms: () => ({
      eyebrow: "Terms of service", title: "Terms of service", updated: LEGAL.updated.en, switchLabel: "Legal documents", tocLabel: "Contents",
      sections: [
        { h: "What Buyniverse is", p: [`Buyniverse is a platform where companies ask for prices (RFQ), compare proposals, run live bidding among approved suppliers, award and invoice. ${who("en")} operates it. By using it you accept these terms.`] },
        { h: "Accounts and companies", p: ["You sign in with your Google account. You are responsible for what is done with your account and for your company's data being true. You may act for a company only if you are authorised to. A company's administrators decide who on their team can do what."] },
        { h: "How a purchase works", p: ["The buyer posts a need and invited suppliers send their starting price. The buyer approves the proposals it wants and only those compete in a live round that starts from the best proposal; the lowest price when time ends wins. Every bid and proposal is final and recorded. The sales contract is between buyer and supplier."] },
        { h: "Payments: we do not hold funds", p: ["Buyniverse does not receive or hold the money of a deal. Payment goes directly between buyer and supplier. The platform records the receipt and the order, receipt and invoice match that authorise each milestone payment."] },
        { h: "Fee", p: ["We charge a fee when you award a deal. It is calculated on the verified saving, with a floor and a cap on what is awarded, and the current percentages are shown in the public calculator (/ahorro) and in your account. No award, no fee; with little or no saving the floor applies. The calculator is an estimate for one comparison, not a quote or a promise of savings. During informational periods the fee is shown but not charged. We may change the percentages with notice; a change does not affect awards already settled."] },
        { h: "Electronic invoicing", p: ["CFDI invoices are stamped by an authorised certification provider using your company's digital seal certificate. You are responsible for your tax data, certificate and line items being correct and for meeting your obligations to the SAT. Stamps are credited once their payment is confirmed."] },
        { h: "Acceptable use", p: ["You may not use the platform to:"], li: [
          "offer or accept deals outside the platform to avoid the fee on a deal started here;",
          "manipulate a bid, a budget or a proposal, or use fake accounts;",
          "try to reach other companies' data, disrupt the service or evade its controls;",
          "upload unlawful content or content you have no right to share."] },
        { h: "Demo", p: ["Demo access is private, by invitation, and uses fictitious data. Nothing that happens in the demo is a real deal."] },
        { h: "Availability and liability", p: ["We make a reasonable effort to keep the service available but do not guarantee it without interruption. To the extent the law allows, Buyniverse is not liable for indirect damages or for losses arising from deals between buyers and suppliers, and its total liability will not exceed the fee you paid in the twelve months before the event."] },
        { h: "Changes, suspension and governing law", p: ["We may update these terms by publishing the new version with its date; using the platform after a change means you accept it. We may suspend accounts that breach these terms. These terms are governed by the laws of the United Mexican States."] },
      ],
    }),
    copy: { privacyName: "Privacy", termsName: "Terms", contactLead: "Questions or requests about your data or these terms? Write to" },
  },
};

export default {
  name: "LegalPage",
  setup() {
    const store = inject("store"), route = useRoute();
    const lang = computed(() => (store.locale.value === "en" ? "en" : "es"));
    const kind = computed(() => (route.meta && route.meta.legal === "terms" ? "terms" : "privacy"));
    const set = computed(() => DOCS[lang.value]);
    const doc = computed(() => set.value[kind.value]());
    return { LEGAL, kind, doc, copy: computed(() => set.value.copy) };
  },
};
</script>
