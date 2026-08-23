<template>
  <section v-if="allowed" class="mx-auto max-w-5xl space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
      <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">
        {{ paymentMode ? "CFDI Payment 2.0" : "CFDI 4.0" }}
      </p>
      <h1 class="font-head mt-1 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
        {{ editing ? "Edit" : "Create" }}
        {{ paymentMode ? "payment complement" : "invoice" }}
      </h1>
      <p
        v-if="draftRecovered || draftSavedAt"
        class="mt-2 text-xs font-semibold flex items-center gap-1.5"
        :class="draftRecovered ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
      >
        <i
          class="fa-solid text-xs"
          :class="draftRecovered ? 'fa-clock-rotate-left' : 'fa-shield'"
        ></i
        >{{
          draftRecovered
            ? "A protected draft was restored from this tab."
            : `Draft protected ${draftSavedAt}`
        }}
      </p>
      </div>
      <OperationalScopeBadge :scope="existing?.operationalScope || store.operationalScope.value" />
    </header>
    <form class="space-y-5" @submit.prevent="save">
      <article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
        <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Issuer & receiver</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Issuer<select v-model="form.issuerId" class="field mt-1.5 text-xs font-semibold" required>
              <option
                v-for="x in store.state.issuers"
                :key="x.id"
                :value="x.id"
              >
                {{ x.name }} · {{ x.rfc }}
              </option>
            </select></label
          ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Receiver<select
              v-model="form.receiverId"
              class="field mt-1.5 text-xs font-semibold"
              required
            >
              <option v-for="x in clients" :key="x.id" :value="x.id">
                {{ x.name }} · {{ x.rfc }}
              </option>
            </select></label
          >
        </div>
      </article>
      <article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
        <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">
          {{ paymentMode ? "Payment details" : "Fiscal details" }}
        </h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Currency<select
              v-model="form.currency"
              class="field mt-1.5 text-xs"
              required
            >
              <option>MXN</option>
              <option>USD</option>
            </select></label
          ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Date<input
              v-model="form.date"
              type="date"
              class="field mt-1.5 text-xs"
              required /></label
          ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >{{ paymentMode ? "Payment method" : "CFDI use"
            }}<select v-model="form.method" class="field mt-1.5 text-xs" required>
              <option value="03">03 · Electronic transfer</option>
              <option value="01">01 · Cash</option>
              <option value="G03">G03 · General expenses</option>
            </select></label
          ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Exchange rate<input
              v-model.number="form.exchangeRate"
              type="number"
              min="0.000001"
              step="0.000001"
              class="field mt-1.5 text-xs font-mono"
              required
          /></label>
        </div>
      </article>
      <article v-if="!paymentMode" class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Concepts</h2>
            <p class="mt-0.5 text-xs text-slate-400">
              Amounts and VAT are calculated automatically.
            </p>
          </div>
          <button type="button" class="btn-muted text-xs py-1.5 px-3" @click="addLine">
            <i class="fa-solid fa-plus mr-1.5 text-xs"></i>Add concept
          </button>
        </div>
        <div class="mt-4 space-y-3">
          <div
            v-for="(line, i) in form.lines"
            :key="line.id"
            class="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:grid-cols-[1fr_7rem_9rem_3rem] dark:border-slate-800 dark:bg-slate-800/40 items-end"
          >
            <label
              ><span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</span
              ><input
                v-model.trim="line.description"
                class="field text-xs"
                required /></label
            ><label
              ><span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantity</span
              ><input
                v-model.number="line.quantity"
                class="field text-xs font-mono"
                type="number"
                min="0.01"
                step="0.01"
                required /></label
            ><label
              ><span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit price</span
              ><input
                v-model.number="line.unitPrice"
                class="field text-xs font-mono"
                type="number"
                min="0.01"
                step="0.01"
                required /></label
            ><button
              type="button"
              class="grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title="Remove"
              @click="form.lines.length > 1 && form.lines.splice(i, 1)"
            >
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </article>
      <article v-else class="panel p-6">
        <h2 class="font-800">Related document</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <label class="text-sm font-semibold sm:col-span-2"
            >Invoice<select
              v-model="form.invoiceId"
              class="field mt-2"
              required
              @change="syncInvoice"
            >
              <option v-for="x in unpaid" :key="x.id" :value="x.id">
                {{ x.serie }}-{{ x.folio }} · {{ x.projectTitle }} ·
                {{ store.money(x.total, x.currency) }}
              </option>
            </select></label
          ><label class="text-sm font-semibold"
            >Amount applied<input
              v-model.number="form.amount"
              class="field mt-2"
              type="number"
              min="0.01"
              :max="selectedInvoice?.total"
              step="0.01"
              required
          /></label>
        </div>
        <p v-if="selectedInvoice" class="mt-4 text-sm text-slate-500">
          Previous balance
          {{ store.money(selectedInvoice.total, selectedInvoice.currency) }} ·
          New balance
          {{
            store.money(
              Math.max(0, selectedInvoice.total - form.amount),
              selectedInvoice.currency,
            )
          }}
        </p>
      </article>
      <article
        class="panel flex flex-wrap items-center justify-between gap-4 p-6"
      >
        <div>
          <p class="text-sm text-slate-500">Total</p>
          <p class="text-3xl font-800">
            {{ store.money(total, form.currency) }}
          </p>
          <p v-if="!paymentMode" class="text-xs text-slate-500">
            Subtotal {{ store.money(subtotal, form.currency) }} · VAT
            {{ store.money(tax, form.currency) }}
          </p>
        </div>
        <div class="flex gap-2">
          <RouterLink :to="parent" class="btn-muted">Cancel</RouterLink
          ><button class="btn-brand">
            <i class="fa-solid fa-stamp mr-2"></i
            >{{ editing ? "Update" : "Save & stamp" }}
          </button>
        </div>
      </article>
    </form>
  </section>
  <section v-else class="panel mx-auto max-w-xl p-10 text-center">
    <i class="fa-solid fa-lock text-3xl text-slate-400"></i>
    <h1 class="mt-4 text-2xl font-800">Fiscal document unavailable</h1>
    <RouterLink :to="parent" class="btn-brand mt-5">Return</RouterLink>
  </section>
</template>
<script>
const { inject, computed, reactive, ref, watch, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const OperationalScopeBadge = load("./app/components/OperationalScopeBadge.vue?v=1");
export default {
  components: { OperationalScopeBadge },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter();
    const paymentMode = computed(() => route.meta.fiscal === "payment");
    const existing = computed(() =>
      paymentMode.value
        ? store.scopedRecords(store.state.paymentReceipts).find(
            (item) => item.id === route.params.paymentId,
          )
        : store.scopedRecords(store.state.invoices).find(
            (item) => item.id === route.params.invoiceId,
          ),
    );
    const editing = computed(() => Boolean(existing.value));
    const relatedInvoice = computed(() =>
      paymentMode.value && existing.value
        ? store.scopedRecords(store.state.invoices).find(
            (item) => item.id === existing.value.invoiceId,
          )
        : null,
    );
    const allowed = computed(() => {
      const user = store.currentUser.value;
      if (store.isAdmin.value) return true;
      if (!store.isSupplier.value) return false;
      if (!editing.value) return true;
      return paymentMode.value
        ? relatedInvoice.value?.providerId === user.id
        : existing.value?.providerId === user.id;
    });
    const today = new Date().toISOString().slice(0, 10);
    const form = reactive({
      issuerId: store.state.issuers[0]?.id,
      receiverId: store.state.users.find((item) => item.type === "Client")?.id,
      currency: "MXN",
      date: today,
      method: "03",
      exchangeRate: 1,
      invoiceId: "",
      amount: 0,
      lines: [
        {
          id: "line-1",
          description: "Professional services",
          quantity: 1,
          unitPrice: 1000,
        },
      ],
    });
    if (existing.value && allowed.value)
      Object.assign(form, JSON.parse(JSON.stringify(existing.value)), {
        date: (existing.value.date || existing.value.issuedDate || today).slice(
          0,
          10,
        ),
        lines: existing.value.lineItems || form.lines,
      });
    const draftStore = window.WebCommon.createSessionDraft(
        `buyniverse-fiscal-${store.currentUser.value.id}-${paymentMode.value ? "payment" : "invoice"}-${existing.value?.id || "new"}`,
        { ttlMs: 4 * 60 * 60 * 1000, maxBytes: 256 * 1024 },
      ),
      recovered = existing.value ? null : draftStore.read(),
      draftRecovered = ref(Boolean(recovered)),
      draftSavedAt = ref("");
    if (recovered) Object.assign(form, recovered);
    let draftTimer = 0,
      draftCompleted = false;
    const saveDraft = () => {
      window.clearTimeout(draftTimer);
      if (existing.value || draftCompleted) return;
      if (draftStore.write(form))
        draftSavedAt.value = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    };
    watch(
      form,
      () => {
        draftRecovered.value = false;
        window.clearTimeout(draftTimer);
        draftTimer = window.setTimeout(saveDraft, 350);
      },
      { deep: true },
    );
    onBeforeUnmount(saveDraft);
    const clients = computed(() =>
      store.state.users.filter((item) => item.type === "Client"),
    );
    const unpaid = computed(() =>
      store.scopedRecords(store.state.invoices).filter(
        (item) =>
          item.paymentStatus !== "Paid" &&
          (store.isAdmin.value ||
            item.providerId === store.currentUser.value.id),
      ),
    );
    const selectedInvoice = computed(() =>
      unpaid.value.find((item) => item.id === form.invoiceId),
    );
    const subtotal = computed(() =>
      form.lines.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0,
      ),
    );
    const tax = computed(() => subtotal.value * 0.16),
      total = computed(() =>
        paymentMode.value
          ? Number(form.amount) || 0
          : subtotal.value + tax.value,
      ),
      parent = computed(() => (paymentMode.value ? "/payments" : "/invoices"));
    function addLine() {
      if (allowed.value && form.lines.length < 100)
        form.lines.push({
          id: window.ProcurementCommon.uid("line"),
          description: "",
          quantity: 1,
          unitPrice: 1,
        });
    }
    function syncInvoice() {
      const item = selectedInvoice.value;
      if (item) {
        form.amount = item.total;
        form.currency = item.currency;
        form.receiverId = item.clientId;
      }
    }
    function save() {
      if (!allowed.value)
        return store.notice(
          "Fiscal document update denied",
          "fa-shield-halved",
        );
      const issuer = store.state.issuers.find(
          (item) => item.id === form.issuerId,
        ),
        receiver = clients.value.find((item) => item.id === form.receiverId),
        exchangeRate = Number(form.exchangeRate),
        date = new Date(`${form.date}T12:00:00Z`);
      if (
        !issuer ||
        !receiver ||
        !["MXN", "USD"].includes(form.currency) ||
        !["01", "03", "G03"].includes(form.method) ||
        !Number.isFinite(exchangeRate) ||
        exchangeRate <= 0 ||
        Number.isNaN(date.getTime())
      )
        return store.notice(
          "Complete the required fiscal fields",
          "fa-triangle-exclamation",
        );
      if (paymentMode.value) {
        const invoice = selectedInvoice.value,
          amount = Number(form.amount);
        if (
          !invoice ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > Number(invoice.total)
        )
          return store.notice(
            "Amount must be within an accessible invoice balance",
            "fa-triangle-exclamation",
          );
        const payload = {
          ...form,
          receiverId: invoice.clientId,
          amount,
          relatedDocuments: [
            {
              documentId: invoice.uuid,
              previousBalance: invoice.total,
              amountPaid: amount,
              newBalance: invoice.total - amount,
            },
          ],
        };
        if (existing.value) {
          if (
            relatedInvoice.value?.providerId !== store.currentUser.value.id &&
            !store.isAdmin.value
          )
            return store.notice("Payment update denied", "fa-shield-halved");
          Object.assign(existing.value, payload);
        } else if (!store.addPayment(payload)) return;
      } else {
        if (
          !form.lines.length ||
          form.lines.length > 100 ||
          form.lines.some(
            (line) =>
              !window.WebCommon.sanitizeText(line.description, 500).trim() ||
              !Number.isFinite(Number(line.quantity)) ||
              Number(line.quantity) <= 0 ||
              !Number.isFinite(Number(line.unitPrice)) ||
              Number(line.unitPrice) <= 0,
          )
        )
          return store.notice(
            "Complete every invoice concept",
            "fa-triangle-exclamation",
          );
        const payload = {
          ...form,
          providerId:
            store.isSupplier.value
              ? store.currentUser.value.id
              : existing.value?.providerId,
          receiverId: receiver.id,
          projectTitle: window.WebCommon.sanitizeText(
            form.lines[0]?.description || "Professional services",
            240,
          ).trim(),
          total: total.value,
          issuedDate: date.toISOString(),
          lineItems: form.lines.map((line) => {
            const quantity = Number(line.quantity),
              unitPrice = Number(line.unitPrice),
              amount = quantity * unitPrice;
            return {
              id: line.id,
              description: window.WebCommon.sanitizeText(
                line.description,
                500,
              ).trim(),
              quantity,
              unitPrice,
              amount,
              taxes: [{ type: "IVA", rate: 0.16, amount: amount * 0.16 }],
            };
          }),
        };
        if (existing.value) {
          if (existing.value.status !== "Vigente")
            return store.notice(
              "Cancelled invoices are read-only",
              "fa-shield-halved",
            );
          Object.assign(existing.value, payload, {
            providerId: existing.value.providerId,
          });
        } else if (!store.addInvoice(payload)) return;
      }
      draftCompleted = true;
      draftStore.clear();
      router.push(parent.value);
    }
    return {
      store,
      paymentMode,
      editing,
      allowed,
      form,
      clients,
      unpaid,
      selectedInvoice,
      subtotal,
      tax,
      total,
      parent,
      draftRecovered,
      draftSavedAt,
      addLine,
      syncInvoice,
      save,
    };
  },
};
</script>
