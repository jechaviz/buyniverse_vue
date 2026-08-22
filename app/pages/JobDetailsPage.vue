<template>
  <div>
    <section v-if="job" class="space-y-6">
      <div v-if="job.status === 'PENDING_APPROVAL'" class="panel border-amber-300/80 bg-amber-50/80 p-4 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/80 rounded-2xl flex items-center gap-2.5 shadow-xs">
        <i class="fa-solid fa-clock text-amber-600 dark:text-amber-400"></i>{{ store.t("This job is waiting for approval.") }}
      </div>
      <div v-if="job.status === 'REJECTED'" class="panel border-rose-300/80 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/80 rounded-2xl shadow-xs">
        <b>{{ store.t("Rejected.") }}</b> {{ job.rejectionReason || store.t("Review the brief and submit it again.") }}
      </div>

      <!-- Job Header -->
      <header class="flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-lg bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-brand/20">
              {{ clientView ? store.t("Manage job") : store.t(job.category) }}
            </span>
            <span class="badge rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold dark:bg-sky-500/10">
              <i class="fa-solid fa-gavel mr-1"></i>{{ job.auctionType === 'OPEN' ? store.t('Open Live Auction') : store.t('Sealed Bid Sourcing') }}
            </span>
          </div>
          <h1 class="font-head mt-2 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ job.title }}</h1>
          <p class="mt-2 text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span><i class="fa-regular fa-calendar mr-1"></i>{{ store.t("Posted") }} {{ store.date(job.postedAt) }}</span>
            <span>·</span>
            <span><i class="fa-solid fa-location-dot mr-1"></i>{{ job.location || 'Remote' }}</span>
            <span>·</span>
            <span class="text-emerald-600 font-semibold"><i class="fa-solid fa-shield-halved mr-1"></i>{{ store.t("Escrow Guaranteed") }}</span>
          </p>
        </div>
        <div class="flex gap-2.5">
          <button v-if="isFreelancer" class="btn-muted text-xs py-2 px-3.5" @click="store.toggleSavedJob(job.id)">
            <i class="mr-1.5" :class="saved ? 'fa-solid fa-bookmark text-brand' : 'fa-regular fa-bookmark'"></i>
            {{ saved ? store.t("Saved") : store.t("Save job") }}
          </button>
          <RouterLink v-if="isOwner" class="btn-brand text-xs py-2 px-3.5" :to="`/post-job/${job.id}`">
            <i class="fa-solid fa-pen mr-1.5"></i>{{ store.t("Edit job") }}
          </RouterLink>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main class="space-y-6">
          <!-- Project Brief Card -->
          <article class="panel p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card">
            <h2 class="font-head font-800 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("Project brief") }}</h2>
            <p class="mt-4 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">{{ job.description }}</p>
            <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              <span v-for="skill in job.skills" :key="skill" class="badge rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ skill }}</span>
            </div>
          </article>

          <article v-if="projectDocuments.length" class="panel rounded-3xl border border-brand/20 bg-brand-50/30 p-5 shadow-card dark:bg-brand/7">
            <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-wider text-brand">{{ requiredDocuments.length ? store.t('Proposal gate') : store.t('Project documents') }}</p><h2 class="mt-1 font-head text-base font-800">{{ store.t('Candidate documents') }}</h2><p class="mt-1 text-xs text-slate-500">{{ requiredDocuments.length ? store.t('Review and acknowledge the required version before you submit a proposal.') : store.t('Review the documents shared for this project.') }}</p></div><span class="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-brand shadow-sm dark:bg-slate-900/80">{{ acknowledgedDocumentCount }}/{{ projectDocuments.length }} {{ store.t('acknowledged') }}</span></div>
            <div class="mt-4 divide-y divide-brand/10 rounded-2xl border border-brand/15 bg-white/70 dark:bg-slate-900/70"><div v-for="document in projectDocuments" :key="document.id" class="flex flex-wrap items-center justify-between gap-3 p-3"><div class="min-w-0"><p class="truncate text-xs font-800"><i class="fa-solid mr-1.5 text-brand" :class="document.kind === 'nda' ? 'fa-user-shield' : 'fa-file-lines'"></i>{{ document.name }}</p><p class="mt-0.5 text-[10px] text-slate-400">{{ store.t('Version') }} {{ document.versionHash }} · {{ document.requiredForProposal ? store.t('Required for proposal') : store.t('Optional') }}</p></div><button v-if="isFreelancer && document.signatureRequired" class="btn-muted h-8 px-3 text-xs" :class="hasAcknowledged(document) ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : ''" @click="openDocument(document)"><i class="fa-solid mr-1" :class="hasAcknowledged(document) ? 'fa-circle-check' : 'fa-signature'"></i>{{ hasAcknowledged(document) ? store.t('Acknowledged') : store.t('Review and acknowledge') }}</button></div></div>
          </article>

          <!-- Employer Bid Room (For Client / Owner / Admin) -->
          <JobEmployerBidRoom
            v-if="clientView || isOwner || store.isAdmin.value"
            :job="job"
            :proposals="job.proposals"
            @award="awardCandidate"
          />

          <!-- Freelancer Bidding Console & Proposal Builder -->
          <JobFreelancerBidding
            v-if="isFreelancer && job.status === 'OPEN'"
            :job="job"
            :my-proposal="myProposal"
            @submit-proposal="handleProposalSubmission"
            @counter-bid="handleCounterBid"
          />

          <!-- Q&A Section -->
          <JobPublicQna
            :job="job"
            :questions="job.questions"
            :is-owner="isOwner"
            :is-freelancer="isFreelancer"
          />
        </main>

        <!-- Sidebar Details -->
        <aside class="space-y-4">
          <!-- Budget & Escrow Card -->
          <article class="panel p-5 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ store.t("Budget & Model") }}</p>
            <p class="font-head font-mono mt-1 text-2xl font-800 text-slate-900 dark:text-white">{{ store.money(job.budget, job.currency) }}</p>
            <dl class="mt-4 space-y-2.5 text-xs border-t border-slate-100 pt-4 dark:border-slate-800">
              <div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Project type") }}</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ store.t(job.budgetType) }}</dd></div>
              <div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Experience") }}</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ store.t(job.experienceLevel) }}</dd></div>
              <div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("NDA") }}</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ requiresNda ? store.t('Required') : store.t('Not required') }}</dd></div>
              <div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Target date") }}</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ store.date(job.dueDate) }}</dd></div>
            </dl>
          </article>

          <!-- Client Reputation Card (Upwork / Freelancer.com style) -->
          <article class="panel p-5 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ store.t("About the client") }}</p>
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-bold text-xs text-brand dark:bg-brand/20">{{ client?.avatar || 'CL' }}</span>
              <div>
                <b class="font-head text-xs font-bold text-slate-900 dark:text-white block">{{ client?.companyName || client?.name }}</b>
                <p class="text-[11px] text-slate-400">{{ client?.location || 'Remote' }}</p>
              </div>
            </div>
            <div class="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p class="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <i class="fa-solid fa-circle-check"></i>{{ store.t("Payment Method Verified") }}
              </p>
              <p class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400">{{ store.t("Rating") }}</span>
                <span class="font-bold">★ 4.9 (18 {{ store.t("reviews") }})</span>
              </p>
              <p class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400">{{ store.t("Total Spent") }}</span>
                <span class="font-bold font-mono">$45,000+ USD</span>
              </p>
              <p class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400">{{ store.t("Hire Rate") }}</span>
                <span class="font-bold">92%</span>
              </p>
            </div>
          </article>
        </aside>
      </div>

      <!-- NDA Acceptance Modal -->
      <div v-if="showNda" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" @click.self="showNda = false">
        <div class="glass max-w-lg p-6 rounded-3xl shadow-elevated border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95">
          <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">{{ store.t("Confidentiality") }}</p>
          <h2 class="font-head mt-1 text-xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Non-disclosure agreement") }}</h2>
          <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {{ store.t("By continuing, you agree to use the project information only to prepare and deliver this proposal, and not to disclose it to third parties.") }}
          </p>
          <label class="mt-4 flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input v-model="ndaAccepted" type="checkbox" class="rounded text-brand focus:ring-brand" />
            {{ store.t("I have read and accept the NDA.") }}
          </label>
          <div class="mt-6 flex justify-end gap-2.5">
            <button class="btn-muted text-xs py-2 px-3.5" @click="showNda = false">{{ store.t("Cancel") }}</button>
            <button class="btn-brand text-xs py-2 px-4" :disabled="!ndaAccepted" @click="commitProposal">{{ store.t("Accept & submit") }}</button>
          </div>
        </div>
      </div>

      <ProjectDocumentSignatureModal :open="Boolean(signingDocument)" :document="signingDocument" :signer="store.currentUser.value" @close="signingDocument = null" @accepted="acceptDocument" />
    </section>

    <section v-else class="panel p-12 text-center rounded-2xl border border-slate-200/80 bg-white/90 shadow-card">
      <h1 class="font-head text-xl font-800">{{ store.t("Job not found") }}</h1>
      <RouterLink class="btn-brand mt-4 text-xs py-2 px-4" to="/">{{ store.t("Browse jobs") }}</RouterLink>
    </section>
  </div>
</template>
<script>
const { inject, computed, ref } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const JobEmployerBidRoom = load("./app/pages/job/JobEmployerBidRoom.vue?v=1");
const JobFreelancerBidding = load("./app/pages/job/JobFreelancerBidding.vue?v=1");
const JobPublicQna = load("./app/pages/job/JobPublicQna.vue?v=1");
const ProjectDocumentSignatureModal = load("./app/components/project/ProjectDocumentSignatureModal.vue?v=1");

export default {
  components: { JobEmployerBidRoom, JobFreelancerBidding, JobPublicQna, ProjectDocumentSignatureModal },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const job = computed(() => store.job(route.params.jobId));

    if (job.value) {
      job.value.description ||= "A focused project with clear milestones, collaborative reviews and production-ready delivery.";
      job.value.questions ||= [];
      job.value.budgetType ||= "Fixed price";
      job.value.experienceLevel ||= "Intermediate";
      job.value.postedAt ||= "2026-07-01T12:00:00Z";
      job.value.auctionType ||= "OPEN";
      job.value.requiredDocuments ||= [];
      job.value.documentAcceptances ||= [];
    }

    const client = computed(() => store.user(job.value?.clientId));
    const clientView = computed(() => Boolean(route.meta.clientView));
    const isOwner = computed(() => job.value?.clientId === store.currentUser.value.id && (store.isBuyer.value || store.isAdmin.value));
    const isFreelancer = computed(() => store.isSupplier.value);
    const saved = computed(() => store.state.savedJobIds?.includes(job.value?.id));
    const myProposal = computed(() => job.value?.proposals.find((p) => p.freelancerId === store.currentUser.value.id));
    const projectDocuments = computed(() => (Array.isArray(job.value?.requiredDocuments) ? job.value.requiredDocuments : []).filter(Boolean));
    const requiredDocuments = computed(() => projectDocuments.value.filter((document) => document.requiredForProposal));
    const hasAcknowledged = (document) => Boolean(job.value?.documentAcceptances?.some((entry) => entry?.documentId === document.id && entry?.versionHash === document.versionHash && entry?.signerId === store.currentUser.value.id));
    const missingDocuments = computed(() => requiredDocuments.value.filter((document) => document.signatureRequired && !hasAcknowledged(document)));
    const acknowledgedDocumentCount = computed(() => projectDocuments.value.filter((document) => hasAcknowledged(document)).length);
    const requiresNda = computed(() => Boolean(job.value?.requiresNDA || requiredDocuments.value.some((document) => document.kind === "nda")));
    const legacyNdaRequired = computed(() => Boolean(job.value?.requiresNDA && !requiredDocuments.value.some((document) => document.kind === "nda")));

    const showNda = ref(false);
    const ndaAccepted = ref(false);
    const pendingDraft = ref(null);
    const signingDocument = ref(null);

    const handleProposalSubmission = (data) => {
      pendingDraft.value = data;
      const nextDocument = missingDocuments.value[0];
      if (nextDocument) {
        signingDocument.value = nextDocument;
      } else if (legacyNdaRequired.value) {
        ndaAccepted.value = false;
        showNda.value = true;
      } else {
        commitProposal();
      }
    };

    const commitProposal = () => {
      const data = pendingDraft.value;
      if (!data) return;
      if (missingDocuments.value.length) { signingDocument.value = missingDocuments.value[0]; return; }
      store.addProposal(job.value, data.bid);
      const created = job.value.proposals.find((item) => item.freelancerId === store.currentUser.value.id);
      if (created) {
        Object.assign(created, {
          completionTime: data.completionTime,
          coverLetter: data.coverLetter,
          boosted: data.boosted,
          milestones: data.milestones,
          extras: data.extras,
          ndaAccepted: Boolean(requiresNda.value),
          documentAcknowledgements: requiredDocuments.value.filter((document) => hasAcknowledged(document)).map((document) => ({ documentId: document.id, versionHash: document.versionHash })),
        });
      }
      showNda.value = false;
      store.notice("Proposal and milestone bid submitted with Escrow guarantee!");
    };

    const openDocument = (document) => {
      if (!isFreelancer.value || !projectDocuments.value.includes(document)) return;
      signingDocument.value = document;
    };
    const acceptDocument = (acceptance) => {
      const document = projectDocuments.value.find((item) => item.id === acceptance?.documentId && item.versionHash === acceptance?.versionHash);
      if (!document || acceptance?.signerId !== store.currentUser.value.id || !acceptance?.signerName) return store.notice("Document acknowledgment denied", "fa-shield-halved");
      job.value.documentAcceptances ||= [];
      if (!hasAcknowledged(document)) job.value.documentAcceptances.push({ documentId: document.id, sourceId: document.sourceId, versionHash: document.versionHash, signerId: store.currentUser.value.id, signerName: store.currentUser.value.name, acceptedAt: acceptance.acceptedAt, method: "clickwrap" });
      signingDocument.value = null;
      store.securityEvent?.("Project document acknowledged", `${job.value.id}/${document.id}`, "success");
      const nextDocument = missingDocuments.value[0];
      if (nextDocument && pendingDraft.value) signingDocument.value = nextDocument;
      else if (pendingDraft.value && legacyNdaRequired.value) { ndaAccepted.value = false; showNda.value = true; }
      else if (pendingDraft.value) commitProposal();
      store.notice("Document acknowledged");
    };

    const handleCounterBid = (amount) => {
      if (!myProposal.value) return;
      myProposal.value.bid = Number(amount);
      store.notice(`Counter-bid updated to ${store.money(amount, job.value.currency)}!`, "fa-bolt");
    };

    const awardCandidate = (proposal) => {
      proposal.status = "Accepted";
      job.value.status = "IN_PROGRESS";
      const newContractId = `contract-${Date.now().toString().slice(-4)}`;
      store.state.contracts.unshift({
        id: newContractId,
        sourceId: job.value.id,
        clientId: job.value.clientId,
        providerId: proposal.freelancerId,
        amount: proposal.bid,
        status: "In progress",
        milestones: (proposal.milestones || []).map((m, idx) => ({
          id: `m-${idx + 1}`,
          title: m.title || `Milestone ${idx + 1}`,
          amount: m.amount || Math.round(proposal.bid / (proposal.milestones.length || 1)),
          status: idx === 0 ? "Funded" : "Pending",
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        })),
      });
      job.value.contractId = newContractId;
      store.notice("Project awarded! Milestone 1 funded into Escrow.", "fa-handshake");
      router.push(`/contract/${newContractId}`);
    };

    return {
      store,
      job,
      client,
      clientView,
      isOwner,
      isFreelancer,
      saved,
      myProposal,
      projectDocuments,
      requiredDocuments,
      acknowledgedDocumentCount,
      requiresNda,
      hasAcknowledged,
      signingDocument,
      showNda,
      ndaAccepted,
      handleProposalSubmission,
      commitProposal,
      openDocument,
      acceptDocument,
      handleCounterBid,
      awardCandidate,
    };
  },
};
</script>
