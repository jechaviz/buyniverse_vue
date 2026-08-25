<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="open"
        class="fixed inset-0 z-80 flex justify-center bg-slate-950/70 p-4 pt-[12vh] backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Quick access"
        @keydown="onKeydown"
      >
        <button
          class="absolute inset-0"
          aria-label="Close quick access"
          @click="$emit('close')"
        ></button>
        <section
          ref="panel"
          tabindex="-1"
          class="glass relative h-fit w-full max-w-2xl overflow-hidden rounded-3xl shadow-elevated border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95"
        >
          <div
            class="flex items-center gap-3 border-b border-slate-200/80 px-5 py-1 dark:border-slate-800"
          >
            <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm"></i>
            <input
              ref="searchInput"
              v-model.trim="query"
              class="h-14 min-w-0 flex-1 bg-transparent text-sm md:text-base text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 outline-none"
              placeholder="Search views, projects, invoices or requests…"
              aria-label="Quick search"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter.prevent="activate"
            />
            <kbd
              class="rounded-lg border border-slate-200/90 bg-slate-100/80 px-2 py-1 text-[10px] font-mono font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >ESC</kbd
            >
          </div>
          <div class="max-h-[60vh] overflow-y-auto p-2.5 space-y-1">
            <button
              v-for="(item, index) in results"
              :key="item.path"
              class="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-all"
              :class="
                index === selected
                  ? 'bg-brand-50 text-brand dark:bg-brand/15 dark:text-brand-200 shadow-xs'
                  : 'hover:bg-slate-100/80 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60'
              "
              @mouseenter="selected = index"
              @click="go(item)"
            >
              <span
                class="grid h-10 w-10 flex-none place-items-center rounded-xl transition"
                :class="
                  index === selected
                    ? 'bg-white text-brand shadow-xs dark:bg-slate-800 dark:text-brand'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                "
                ><i class="fa-solid text-sm" :class="item.icon"></i
              ></span>
              <span class="min-w-0 flex-1"
                ><b class="block truncate text-xs font-bold leading-tight">{{ item.label }}</b
                ><small class="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{{
                  item.subtitle
                }}</small></span
              >
              <span
                class="rounded-lg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
                :class="
                  index === selected
                    ? 'bg-brand-100/70 text-brand-700 dark:bg-brand/30 dark:text-brand-200'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                "
                >{{ item.group }}</span
              >
            </button>
            <div
              v-if="!results.length"
              class="p-12 text-center text-sm text-slate-500 dark:text-slate-400"
            >
              <i class="fa-regular fa-face-frown-open text-3xl text-slate-300 dark:text-slate-600"></i>
              <p class="mt-3 text-xs">No accessible result matches your search.</p>
            </div>
          </div>
          <footer
            class="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/70 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400"
          >
            <span class="flex items-center gap-2">
              <kbd class="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 dark:bg-slate-800 dark:border-slate-700">↑↓</kbd> navigate
              <kbd class="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 dark:bg-slate-800 dark:border-slate-700">↵</kbd> select
            </span>
            <span class="text-[10px] font-medium">Role-based instant navigation</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
<script>
const { inject, ref, computed, watch, nextTick, onBeforeUnmount } = Vue;
const { useRouter } = VueRouter;
export default {
  props: { open: Boolean },
  emits: ["close"],
  setup(props, { emit }) {
    const store = inject("store"),
      router = useRouter(),
      query = ref(""),
      selected = ref(0),
      searchInput = ref(null),
      panel = ref(null),
      overlayId = `command-palette-${Math.random().toString(36).slice(2, 9)}`,
      user = store.currentUser;
    const allowedJob = (job) => {
      const current = user.value;
      return Boolean(current && (
        current.type === "Admin" ||
        job.clientId === current.id ||
        store.contract(job.contractId)?.providerId === current.id ||
      job.proposals?.some(
          (proposal) => proposal.freelancerId === current.id,
        )
      ));
    };
    const allowedInvoice = (invoice) => {
      const current = user.value;
      return Boolean(current && (current.type === "Admin" || [invoice.clientId, invoice.providerId].includes(current.id)));
    };
    const allowedContract = (contract) => {
      const current = user.value;
      return Boolean(current && (current.type === "Admin" || [contract.clientId, contract.providerId].includes(current.id)));
    };
    const canonicalPath = (path) => String(path || "").split("?")[0];
    const staticItems = computed(() => {
      const current = user.value;
      if (!current) return [];
      const common = [
        [
          "/dashboard",
          "Dashboard",
          "Work, money and recent activity",
          "fa-gauge-high",
        ],
        [
          "/projects",
          "Projects",
          "Delivery and sourcing workspaces",
          "fa-folder",
        ],
        ["/messages", "Messages", "Project conversations", "fa-comments"],
        [
          "/invoices",
          "Invoices",
          "Fiscal documents and status",
          "fa-file-invoice-dollar",
        ],
      ];
      if (current.type !== "Freelancer")
        common.push(
          [
            "/procurement",
            "Purchases",
            "Requests, quotes, bids and orders",
            "fa-cart-shopping",
          ],
          [
            "/suppliers",
            "Suppliers",
            "Qualified supplier directory",
            "fa-building-circle-check",
          ],
          ["/clients", "Clients", "Customer relationships", "fa-user-tie"],
        );
      if (current.type === "Freelancer")
        common.push(
          [
            "/saved-jobs",
            "Saved jobs",
            "Opportunities to revisit",
            "fa-bookmark",
          ],
          ["/browse-services", "Services", "Marketplace offerings", "fa-store"],
        );
      if (current.type === "Admin")
        common.push([
          "/admin/issuers",
          "Issuers",
          "Fiscal issuer administration",
          "fa-building-columns",
        ]);
      return common.map(([path, label, subtitle, icon]) => ({
        path,
        label,
        subtitle,
        icon,
        group: "View",
      }));
    });
    const resolveRecent = (item) => {
      const path = item.path.includes("?new=1")
        ? item.path.split("?")[0]
        : item.path;
      const basePath = canonicalPath(path);
      const projectId = basePath.match(/^\/project\/([^/]+)$/)?.[1];
      const invoiceId = basePath.match(/^\/invoices\/([^/]+)$/)?.[1];
      const contractId = basePath.match(/^\/contract\/([^/]+)$/)?.[1];
      const job = projectId && store.job(projectId);
      const invoice = invoiceId && store.state.invoices.find((entry) => entry.id === invoiceId);
      const contract = contractId && store.contract(contractId);
      const request = path.match(/[?&]request=([^&]+)/)?.[1];
      const purchaseRequest = request && store.purchaseRequest(decodeURIComponent(request));
      const direct = staticItems.value.find((entry) => entry.path === basePath);
      const fallback = String(item.label || "").trim();
      const isGeneric = !fallback || /^workspace$/i.test(fallback);
      if (job) return { path, label: job.title, subtitle: `Project · ${job.status}`, icon: "fa-folder-open", group: "Recent" };
      if (invoice) return { path, label: `Invoice ${invoice.serie}-${invoice.folio}`, subtitle: invoice.projectTitle || invoice.paymentStatus, icon: "fa-file-invoice-dollar", group: "Recent" };
      if (contract) return { path, label: store.job(contract.sourceId)?.title || contract.id, subtitle: `Contract · ${contract.status}`, icon: "fa-file-contract", group: "Recent" };
      if (purchaseRequest) return { path, label: `${purchaseRequest.id} · ${purchaseRequest.title}`, subtitle: `Purchase request · ${purchaseRequest.status}`, icon: "fa-clipboard-list", group: "Recent" };
      if (direct) return { ...direct, path, subtitle: "Recently opened", group: "Recent" };
      return {
        path,
        label: isGeneric ? basePath.replace(/^\//, "").replace(/[-/]/g, " ") || "Dashboard" : fallback,
        subtitle: "Recently opened",
        icon: "fa-clock-rotate-left",
        group: "Recent",
      };
    };
    const items = computed(() => {
      const current = user.value;
      if (!current) return [];
      const recent = (store.state.recentViews || [])
        .filter((item) => item.userId === current.id)
        .slice(0, 6)
        .map(resolveRecent);
      const jobs = store.state.jobs.filter(allowedJob).map((job) => ({
        path: `/project/${job.id}`,
        label: job.title,
        subtitle: `Project · ${job.status}`,
        icon: "fa-folder-open",
        group: "Project",
      }));
      const invoices = store.state.invoices
        .filter(allowedInvoice)
        .map((invoice) => ({
          path: `/invoices/${invoice.id}`,
          label: `Invoice ${invoice.serie}-${invoice.folio}`,
          subtitle: invoice.projectTitle || invoice.paymentStatus,
          icon: "fa-file-invoice-dollar",
          group: "Invoice",
        }));
      const contracts = store.state.contracts
        .filter(allowedContract)
        .map((contract) => ({
          path: `/contract/${contract.id}`,
          label: store.job(contract.sourceId)?.title || contract.id,
          subtitle: `Contract · ${contract.status}`,
          icon: "fa-file-contract",
          group: "Contract",
        }));
      const requests =
        current.type === "Freelancer"
          ? []
          : store.state.purchaseRequests
              .filter(
                (request) =>
                  current.type === "Admin" ||
                  request.ownerId === current.id ||
                  request.requesterId === current.id ||
                  request.approverId === current.id,
              )
              .map((request) => ({
                path: `/procurement/queue?request=${encodeURIComponent(request.id)}`,
                label: `${request.id} · ${request.title}`,
                subtitle: `Purchase request · ${request.status}`,
                icon: "fa-clipboard-list",
                group: "Request",
              }));
      const unique = new Map();
      [
        ...recent,
        ...staticItems.value,
        ...jobs,
        ...contracts,
        ...invoices,
        ...requests,
      ].forEach((item) => {
        const key = canonicalPath(item.path);
        if (!unique.has(key)) unique.set(key, item);
      });
      return [...unique.values()];
    });
    const results = computed(() => {
      const term = query.value.toLocaleLowerCase();
      return items.value
        .filter(
          (item) =>
            !term ||
            `${item.label} ${item.subtitle} ${item.group}`
              .toLocaleLowerCase()
              .includes(term),
        )
        .slice(0, 14);
    });
    watch(
      () => props.open,
      (open) => {
        if (open) {
          query.value = "";
          selected.value = 0;
          nextTick(() => window.BuyniverseOverlay?.activate(overlayId, () => panel.value, () => searchInput.value));
        } else window.BuyniverseOverlay?.release(overlayId);
      },
      { immediate: true },
    );
    watch(results, () => {
      selected.value = 0;
    });
    const move = (delta) => {
      if (results.value.length)
        selected.value =
          (selected.value + delta + results.value.length) %
          results.value.length;
    };
    const go = (item) => {
      if (!item) return;
      emit("close");
      router.push(item.path);
    };
    const activate = () => go(results.value[selected.value]);
    const onKeydown = (event) => {
      if (event.key === "Escape") emit("close");
      else window.BuyniverseOverlay?.trap(event, overlayId);
    };
    onBeforeUnmount(() => window.BuyniverseOverlay?.release(overlayId));
    return { store, query, selected, searchInput, panel, results, move, go, activate, onKeydown };
  },
};
</script>
