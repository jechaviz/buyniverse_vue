<template>
  <main class="bn bn-sup" aria-labelledby="support-title">
    <section class="bn-sup__hero">
      <div class="bn-wrap">
        <p class="bn-sup__eyebrow"><i class="fa-solid fa-life-ring"></i>{{ t("Support centre") }}</p>
        <h1 id="support-title" class="bn-sup__title">{{ t("How can we help?") }}</h1>
        <p class="bn-sup__lead">{{ t("Ask in your own words. Answers come from Buyniverse's own guides and, when you need it, a person from the team takes over.") }}</p>
        <form class="bn-sup__ask" @submit.prevent="send(input)">
          <label class="sr-only" for="support-question">{{ t("Your question") }}</label>
          <input id="support-question" v-model="input" class="bn-input" maxlength="1500" :placeholder="t('For example: my CSD says it is an e.firma')" autocomplete="off" />
          <button class="bn-btn bn-btn--primary" :disabled="busy || !input.trim()"><i class="fa-solid" :class="busy ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'"></i>{{ t("Ask") }}</button>
        </form>
        <p class="bn-sup__mode"><span :class="{ 'is-live': status.ai }"></span>{{ status.ai ? t("AI assistant grounded on Buyniverse guides · it can make mistakes, a person reviews every ticket.") : t("Guided help with Buyniverse guides · a person answers every ticket.") }}</p>
      </div>
    </section>

    <div class="bn-wrap bn-sup__layout">
      <section class="bn-sup__main">
        <div class="bn-sup__areas" role="tablist" :aria-label="t('Topics')">
          <button v-for="item in areas" :key="item.id" type="button" role="tab" class="bn-sup__area" :aria-selected="area === item.id" @click="chooseArea(item.id)">
            <span class="bn-sup__avatar"><i class="fa-solid" :class="item.icon"></i></span>
            <span><b>{{ lang(item.title) }}</b><small>{{ item.persona }} · {{ lang(item.focus) }}</small></span>
          </button>
        </div>
        <div v-if="suggestions.length" class="bn-sup__chips">
          <button v-for="question in suggestions" :key="question" type="button" class="bn-chip" @click="send(t(question))">{{ t(question) }}</button>
        </div>

        <div v-if="messages.length" class="bn-sup__thread" aria-live="polite">
          <article v-for="(message, index) in messages" :key="index" class="bn-sup__msg" :class="'bn-sup__msg--' + message.role">
            <template v-if="message.role === 'user'"><p>{{ message.text }}</p></template>
            <template v-else>
              <header class="bn-sup__who"><span class="bn-sup__avatar bn-sup__avatar--sm">{{ message.persona.charAt(0) }}</span><b>{{ message.persona }}</b><small>{{ message.mode === "ai" ? t("AI assistant") : t("Buyniverse guide") }}</small></header>
              <p v-if="message.text">{{ message.text }}</p>
              <div v-for="id in message.articles" :key="id" class="bn-sup__article">
                <template v-if="article(id)">
                  <h3>{{ lang(article(id).title) }}</h3>
                  <p>{{ lang(article(id).summary) }}</p>
                  <ol><li v-for="step in steps(article(id))" :key="step">{{ step }}</li></ol>
                  <div v-if="article(id).links.length" class="bn-sup__links"><RouterLink v-for="link in article(id).links" :key="link.to" :to="link.to" class="bn-chip">{{ lang(link.label) }}<i class="fa-solid fa-arrow-right"></i></RouterLink></div>
                </template>
              </div>
              <footer v-if="index === messages.length - 1 && !ticketOpen && !ticket" class="bn-sup__feedback">
                <span>{{ t("Did this solve it?") }}</span>
                <button type="button" class="bn-chip" @click="helped">{{ t("Yes, thanks") }}</button>
                <button type="button" class="bn-chip" @click="openTicket">{{ t("No, talk to a person") }}</button>
              </footer>
            </template>
          </article>
        </div>

        <form v-if="ticketOpen" class="bn-sup__ticket" @submit.prevent="submitTicket">
          <h2>{{ t("Open a ticket") }}</h2>
          <p class="bn-sup__muted">{{ t("A person from the team reviews it. The conversation above is attached so you do not repeat yourself.") }}</p>
          <div class="bn-sup__grid">
            <label class="bn-field"><span>{{ t("Topic") }}</span><select v-model="form.area" class="bn-select"><option v-for="item in areas" :key="item.id" :value="item.id">{{ lang(item.title) }}</option></select></label>
            <label class="bn-field"><span>{{ t("Priority") }}</span><select v-model="form.severity" class="bn-select"><option value="normal">{{ t("Normal") }}</option><option value="high">{{ t("High: I cannot work or it is about security") }}</option><option value="low">{{ t("Low: a question") }}</option></select></label>
            <label class="bn-field bn-sup__wide"><span>{{ t("Subject") }} <b>*</b></span><input v-model.trim="form.subject" class="bn-input" maxlength="160" required /></label>
            <label class="bn-field bn-sup__wide"><span>{{ t("What happened?") }} <b>*</b></span><textarea v-model.trim="form.message" class="bn-input bn-sup__textarea" maxlength="4000" rows="5" required></textarea></label>
            <label v-if="!signedIn" class="bn-field bn-sup__wide"><span>{{ t("Email to reply to") }} <b>*</b></span><input v-model.trim="form.email" class="bn-input" type="email" maxlength="254" autocomplete="email" required /></label>
            <input v-model="form.website" class="bn-sup__trap" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
          </div>
          <label v-if="!signedIn" class="bn-ob__confirm"><input v-model="form.consent" type="checkbox" required /><span>{{ t("I agree to be contacted at this email about this ticket only.") }}</span></label>
          <p v-if="demo" class="bn-sup__muted"><i class="fa-solid fa-flask"></i> {{ t("This is the demo: tickets are sent from buyniverse.com only.") }}</p>
          <p v-if="ticketError" class="bn-sup__error" role="alert">{{ ticketError }}</p>
          <div class="bn-sup__actions"><button type="button" class="bn-btn bn-btn--ghost" @click="ticketOpen = false">{{ t("Cancel") }}</button><button class="bn-btn bn-btn--primary" :disabled="sending || demo"><i class="fa-solid" :class="sending ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'"></i>{{ t("Send ticket") }}</button></div>
        </form>

        <div v-if="ticket" class="bn-sup__done" role="status">
          <i class="fa-solid fa-circle-check"></i>
          <div><b>{{ t("Ticket created") }} · {{ ticket }}</b><span>{{ signedIn ? t("Follow it below in My tickets.") : t("We will reply to your email; keep this reference.") }}</span></div>
        </div>
      </section>

      <aside class="bn-sup__side">
        <section v-if="signedIn" class="bn-sup__card">
          <h3>{{ t("My tickets") }}</h3>
          <p v-if="!tickets.length" class="bn-sup__muted">{{ t("You have no tickets yet.") }}</p>
          <ul v-else class="bn-sup__tickets"><li v-for="item in tickets" :key="item.reference"><b>{{ item.subject }}</b><span>{{ item.reference }} · <em :class="'is-' + item.status">{{ t(statusLabel(item.status)) }}</em></span><p v-if="item.lastReply" class="bn-sup__reply"><i class="fa-solid fa-reply"></i> {{ item.lastReply.text }}</p></li></ul>
        </section>
        <section class="bn-sup__card">
          <h3>{{ t("Popular guides") }}</h3>
          <ul class="bn-sup__popular"><li v-for="item in popular" :key="item.id"><button type="button" @click="showArticle(item)">{{ lang(item.title) }}</button></li></ul>
        </section>
      </aside>
    </div>
  </main>
</template>

<script>
const { inject, ref, reactive, computed, onMounted } = Vue;
const { useRoute } = VueRouter;

const SUGGESTIONS = {
  "": ["I cannot sign in", "What do I need to sell on Buyniverse?", "How do I upload my CSD?", "How much does Buyniverse charge?"],
  access: ["I cannot sign in", "How do I invite my team?", "Is my data safe?"],
  suppliers: ["What do I need to sell on Buyniverse?", "Requirements for suppliers in Mexico", "My postal code does not match my state"],
  invoicing: ["How do I upload my CSD?", "How do I cancel a CFDI?", "When do I issue a payment complement?"],
  buying: ["How do I launch a reverse auction?", "How do I compare suppliers?"],
  payments: ["When is an escrow payment released?", "How much does Buyniverse charge?"],
};
const STATUS = { open: "Open", in_progress: "In progress", waiting_customer: "Waiting for you", resolved: "Resolved", closed: "Closed" };

export default {
  setup() {
    const store = inject("store"), route = useRoute();
    const t = (text) => store.t(text);
    const lang = (value) => (value && typeof value === "object" ? value[store.locale.value] || value.es || "" : value || "");
    const basePath = window.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
    const kb = ref({ areas: [], articles: [] });
    const status = reactive({ ai: false, online: false }), csrf = ref("");
    const area = ref(""), input = ref(""), busy = ref(false), messages = ref([]);
    const ticketOpen = ref(false), sending = ref(false), ticket = ref(""), ticketError = ref(""), tickets = ref([]), signedIn = ref(false);
    const form = reactive({ area: "access", severity: "normal", subject: "", message: "", email: "", consent: false, website: "" });
    const demo = computed(() => store.runtimeMode?.value === "demo");

    const areas = computed(() => kb.value.areas);
    const suggestions = computed(() => SUGGESTIONS[area.value] || SUGGESTIONS[""]);
    const popular = computed(() => ["access-sign-in", "suppliers-requirements", "invoicing-csd", "buying-auction", "payments-fee"].map((id) => article(id)).filter(Boolean));
    const article = (id) => window.BuyniverseSupport.article(kb.value, id);
    const steps = (item) => (item.steps && (item.steps[store.locale.value] || item.steps.es)) || [];
    const personaOf = (id) => (kb.value.areas.find((item) => item.id === id) || kb.value.areas[0] || { persona: "Iris" }).persona;
    const statusLabel = (value) => STATUS[value] || value;

    const api = async (path, body) => {
      const headers = { Accept: "application/json" };
      if (body) Object.assign(headers, { "Content-Type": "application/json", "X-Buyniverse-Request": "support-v1", "X-Buyniverse-CSRF": csrf.value });
      const response = await fetch(`${basePath}/api/v1/support/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error", headers, body: body ? JSON.stringify(body) : undefined });
      const json = await response.json().catch(() => ({}));
      if (json && typeof json.csrf === "string") csrf.value = json.csrf;
      if (!response.ok) { const error = new Error(json.error || "Support is temporarily unavailable"); error.status = response.status; throw error; }
      return json;
    };

    const chooseArea = (id) => { area.value = area.value === id ? "" : id; form.area = id; };
    const guided = (question) => {
      const hits = window.BuyniverseSupport.search(kb.value, question, { area: area.value, locale: store.locale.value });
      return { mode: "guided", articles: hits.map((hit) => hit.article.id), area: hits[0] ? hits[0].article.area : area.value, escalate: !hits.length };
    };
    const send = async (raw) => {
      const question = String(raw || "").trim();
      if (!question || busy.value) return;
      const history = messages.value.slice(-6).map((item) => ({ role: item.role, text: item.text || (item.articles || []).map((id) => lang((article(id) || {}).title)).join("; ") })).filter((item) => item.text);
      messages.value.push({ role: "user", text: question });
      input.value = ""; busy.value = true; ticket.value = "";
      let result;
      try { result = status.online ? await api("assistant", { message: question, area: area.value, history, locale: store.locale.value }) : guided(question); }
      catch (error) { result = guided(question); if (error.status === 429) store.notice(t("Please wait a moment before trying again"), "fa-hourglass-half"); }
      busy.value = false;
      const resultArea = result.area || area.value;
      const intro = result.reply || (result.articles.length ? t("These Buyniverse guides answer it:") : t("I did not find a guide for this. Let us open a ticket so a person can help you."));
      messages.value.push({ role: "assistant", text: intro, articles: result.articles, mode: result.mode, persona: result.persona || personaOf(resultArea), area: resultArea });
      if (!form.subject) form.subject = question.slice(0, 160);
      if (resultArea) form.area = resultArea;
      if (result.escalate) openTicket();
    };
    const showArticle = (item) => { messages.value.push({ role: "assistant", text: "", articles: [item.id], mode: "guided", persona: personaOf(item.area), area: item.area }); };
    const helped = () => { messages.value.push({ role: "assistant", text: t("Great. If anything else comes up, ask here anytime."), articles: [], mode: "guided", persona: personaOf(area.value) }); };
    const openTicket = () => {
      ticketOpen.value = true; ticketError.value = "";
      const asked = messages.value.filter((item) => item.role === "user").map((item) => "• " + item.text).join("\n");
      if (!form.message) form.message = asked;
    };
    const submitTicket = async () => {
      if (demo.value) return;
      sending.value = true; ticketError.value = "";
      try {
        const articles = [...new Set(messages.value.flatMap((item) => item.articles || []))];
        const result = await api("tickets", { ...form, locale: store.locale.value, articles, path: String(route.query.from || route.fullPath).slice(0, 200) });
        ticket.value = result.reference; ticketOpen.value = false;
        Object.assign(form, { subject: "", message: "", consent: false });
        if (signedIn.value) loadTickets();
      } catch (error) { ticketError.value = t(error.message); }
      finally { sending.value = false; }
    };
    const loadTickets = async () => {
      try { const result = await api("tickets"); signedIn.value = !!result.authenticated; tickets.value = result.tickets || []; } catch (_) { signedIn.value = false; }
    };

    onMounted(async () => {
      kb.value = await fetch(`${basePath}/app/data/support/kb.json?v=1`, { cache: "force-cache" }).then((r) => r.json()).catch(() => ({ areas: [], articles: [] }));
      const topic = String(route.query.topic || "");
      if (kb.value.areas.some((item) => item.id === topic)) chooseArea(topic);
      if (demo.value) return;
      try { const result = await api("status"); status.online = true; status.ai = !!result.ai; loadTickets(); } catch (_) { status.online = false; }
    });

    return { t, lang, kb, status, area, input, busy, messages, areas, suggestions, popular, article, steps, statusLabel, chooseArea, send, showArticle, helped,
      ticketOpen, openTicket, submitTicket, sending, ticket, ticketError, tickets, signedIn, form, demo };
  },
};
</script>
