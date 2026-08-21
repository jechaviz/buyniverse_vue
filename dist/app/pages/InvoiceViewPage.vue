<template>
  <div>
    <section v-if="invoice && allowed" class="space-y-5">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase text-brand">
            CFDI 4.0
          </p>
          <h1 class="premium-title mt-2 text-3xl font-800">
            Invoice {{ invoice.serie }}-{{ invoice.folio }}
          </h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-muted" @click="print">
            <i class="fa-solid fa-print mr-2"></i>Print / PDF</button
          ><button v-if="canManage" class="btn-muted" @click="clone">
            <i class="fa-regular fa-copy mr-2"></i>Clone</button
          ><RouterLink
            v-if="canManage && invoice.status === 'Vigente'"
            class="btn-brand"
            :to="`/invoices/${invoice.id}/edit`"
            ><i class="fa-solid fa-pen mr-2"></i>Edit</RouterLink
          ><button v-if="canManage" class="btn-muted" @click="send">
            <i class="fa-regular fa-paper-plane mr-2"></i
            >{{ invoice.sentAt ? "Resend" : "Send" }}</button
          ><button
            v-if="canManage && invoice.status === 'Vigente'"
            class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            @click="cancelOpen = true"
          >
            <i class="fa-solid fa-ban mr-2"></i>Cancel
          </button>
        </div>
      </header>
      <div
        v-if="invoice.status === 'Cancelado'"
        class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      >
        <b>Cancelled CFDI</b>
        <p class="mt-1">Motive: {{ invoice.cancellationDetails?.motive }}</p>
        <p v-if="invoice.cancellationDetails?.replacementUuid">
          Replacement: {{ invoice.cancellationDetails.replacementUuid }}
        </p>
      </div>
      <article class="panel overflow-hidden">
        <div class="border-b border-slate-100 p-6 dark:border-slate-700">
          <div class="flex flex-wrap justify-between gap-5">
            <div>
              <p class="text-xs font-bold uppercase text-slate-400">Issuer</p>
              <h2 class="mt-2 text-lg font-800">
                {{ issuer?.name || store.user(invoice.providerId)?.name }}
              </h2>
              <p class="font-mono text-sm text-slate-500">
                {{ issuer?.rfc || "XAXX010101000" }} · Regime
                {{ issuer?.regime || "612" }}
              </p>
            </div>
            <div class="text-right">
              <span
                class="badge"
                :class="
                  invoice.status === 'Vigente'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                "
                >{{ invoice.status }}</span
              >
              <p class="mt-3 text-sm text-slate-500">
                Issued {{ store.date(invoice.issuedDate) }}
              </p>
              <p class="text-sm text-slate-500">
                Due {{ store.date(invoice.dueDate) }}
              </p>
            </div>
          </div>
        </div>
        <div class="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <p class="text-xs font-bold uppercase text-slate-400">Receiver</p>
            <b class="mt-2 block">{{ receiver?.name }}</b>
            <p class="text-sm text-slate-500">
              {{ receiver?.rfc || "XAXX010101000" }}
            </p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase text-slate-400">
              Fiscal identifiers
            </p>
            <p class="mt-2 break-all font-mono text-xs">
              UUID {{ invoice.uuid || "Pending stamp" }}
            </p>
            <p class="mt-1 text-sm text-slate-500">
              Currency {{ invoice.currency }} · CFDI use
              {{ invoice.method || "G03" }}
            </p>
          </div>
        </div>
        <div
          class="overflow-x-auto border-t border-slate-100 dark:border-slate-700"
        >
          <table class="w-full text-sm">
            <thead
              class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800"
            >
              <tr>
                <th class="p-4">Concept</th>
                <th class="p-4 text-right">Qty</th>
                <th class="p-4 text-right">Unit price</th>
                <th class="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in lines"
                :key="line.id"
                class="border-t border-slate-100 dark:border-slate-700"
              >
                <td class="p-4">{{ line.description }}</td>
                <td class="p-4 text-right">{{ line.quantity }}</td>
                <td class="p-4 text-right">
                  {{ store.money(line.unitPrice, invoice.currency) }}
                </td>
                <td class="p-4 text-right font-bold">
                  {{ store.money(line.amount, invoice.currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          class="flex justify-end border-t border-slate-100 p-6 dark:border-slate-700"
        >
          <dl class="w-64 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500">Subtotal</dt>
              <dd>{{ store.money(subtotal, invoice.currency) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">VAT</dt>
              <dd>{{ store.money(tax, invoice.currency) }}</dd>
            </div>
            <div class="flex justify-between border-t pt-2 text-lg font-800">
              <dt>Total</dt>
              <dd>{{ store.money(invoice.total, invoice.currency) }}</dd>
            </div>
          </dl>
        </div>
      </article>
      <div
        v-if="cancelOpen"
        class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
        @click.self="cancelOpen = false"
      >
        <form
          class="panel w-full max-w-lg space-y-4 p-6"
          @submit.prevent="cancel"
        >
          <h2 class="text-xl font-800">Cancel invoice</h2>
          <label class="block text-sm font-semibold"
            >SAT motive<select
              v-model="cancellation.motive"
              class="field mt-2"
              required
            >
              <option value="01">
                01 · Document issued with errors, with replacement
              </option>
              <option value="02">
                02 · Document issued with errors, no replacement
              </option>
              <option value="03">03 · Operation did not take place</option>
              <option value="04">
                04 · Nominative operation in global invoice
              </option>
            </select></label
          ><label
            v-if="cancellation.motive === '01'"
            class="block text-sm font-semibold"
            >Replacement UUID<input
              v-model.trim="cancellation.replacementUuid"
              class="field mt-2"
              required
          /></label>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-muted" @click="cancelOpen = false">
              Keep invoice</button
            ><button
              class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Confirm cancellation
            </button>
          </div>
        </form>
      </div>
    </section>
    <section v-else class="panel p-10 text-center">
      <i class="fa-solid fa-lock text-3xl text-slate-400"></i>
      <h1 class="mt-4 text-2xl font-800">Invoice unavailable</h1>
      <RouterLink to="/invoices" class="btn-brand mt-4"
        >Back to invoices</RouterLink
      >
    </section>
  </div>
</template>
<script>
const { inject, computed, ref, reactive } = Vue;
const { useRoute, useRouter } = VueRouter;
export default {
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter();
    const invoice = computed(() =>
      store.state.invoices.find((item) => item.id === route.params.invoiceId),
    );
    const issuer = computed(
        () =>
          store.state.issuers.find(
            (item) => item.id === invoice.value?.issuerId,
          ) || store.state.issuers[0],
      ),
      receiver = computed(() => store.user(invoice.value?.clientId));
    const allowed = computed(() => {
      const item = invoice.value,
        user = store.currentUser.value;
      return (
        !!item &&
        (store.isAdmin.value ||
          item.clientId === user.id ||
          item.providerId === user.id)
      );
    });
    const canManage = computed(() => {
      const item = invoice.value,
        user = store.currentUser.value;
      return !!item && (store.isAdmin.value || (store.isSupplier.value && item.providerId === user.id));
    });
    const lines = computed(() =>
      invoice.value?.lineItems?.length
        ? invoice.value.lineItems
        : [
            {
              id: "summary",
              description:
                invoice.value?.projectTitle || "Professional services",
              quantity: 1,
              unitPrice: (invoice.value?.total || 0) / 1.16,
              amount: (invoice.value?.total || 0) / 1.16,
            },
          ],
    );
    const subtotal = computed(() =>
        lines.value.reduce(
          (sum, item) =>
            sum +
            (Number(item.amount) ||
              Number(item.quantity) * Number(item.unitPrice) ||
              0),
          0,
        ),
      ),
      tax = computed(() =>
        Math.max(0, (invoice.value?.total || 0) - subtotal.value),
      );
    const cancelOpen = ref(false),
      cancellation = reactive({ motive: "02", replacementUuid: "" });
    const deny = () => {
      store.notice("Invoice action denied", "fa-shield-halved");
      return false;
    };
    function print() {
      if (allowed.value) window.print();
    }
    function send() {
      if (!canManage.value || invoice.value.status !== "Vigente") return deny();
      invoice.value.sentAt = new Date().toISOString();
      store.addNotification({
        userId: invoice.value.clientId,
        title: "Invoice delivered",
        text: `Invoice ${invoice.value.serie}-${invoice.value.folio} is available.`,
        link: `/invoices/${invoice.value.id}`,
        icon: "fa-file-invoice-dollar",
      });
      store.notice("Invoice sent");
    }
    function clone() {
      if (!canManage.value) return deny();
      const copy = JSON.parse(JSON.stringify(invoice.value));
      Object.assign(copy, {
        id: window.ProcurementCommon.uid("inv"),
        providerId:
          store.isSupplier.value
            ? store.currentUser.value.id
            : copy.providerId,
        folio: String(300 + store.state.invoices.length),
        uuid: undefined,
        status: "Vigente",
        paymentStatus: "Unpaid",
        issuedDate: new Date().toISOString(),
      });
      delete copy.cancellationDetails;
      store.state.invoices.unshift(copy);
      store.notice("Draft cloned");
      router.push(`/invoices/${copy.id}/edit`);
    }
    function cancel() {
      const replacement = window.WebCommon.sanitizeText(
          cancellation.replacementUuid,
          60,
        ).trim(),
        uuid =
          /^[0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
      if (!canManage.value || invoice.value.status !== "Vigente") return deny();
      if (
        !["01", "02", "03", "04"].includes(cancellation.motive) ||
        (cancellation.motive === "01" && !uuid.test(replacement))
      )
        return store.notice(
          "Enter a valid replacement UUID",
          "fa-triangle-exclamation",
        );
      invoice.value.status = "Cancelado";
      invoice.value.cancellationDetails = {
        motive: cancellation.motive,
        replacementUuid: replacement,
        cancelledAt: new Date().toISOString(),
      };
      cancelOpen.value = false;
      store.notice("Invoice cancelled", "fa-ban");
    }
    return {
      store,
      invoice,
      issuer,
      receiver,
      allowed,
      canManage,
      lines,
      subtotal,
      tax,
      cancelOpen,
      cancellation,
      print,
      send,
      clone,
      cancel,
    };
  },
};
</script>
