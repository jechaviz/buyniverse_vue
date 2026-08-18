<template>
  <section v-if="allowed" class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ existing ? store.t("Edit project draft") : store.t("Create a project") }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {{ store.t("Build a complete sourcing brief and collaboration workflow.") }}
        </p>
      </div>
      <span v-if="project.sourcingType" class="rounded-xl border border-brand/20 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand dark:bg-brand/20">
        {{ project.sourcingType }}
      </span>
    </div>

    <div
      v-if="draftRecovered"
      class="panel flex flex-wrap items-center justify-between gap-3 border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 rounded-2xl shadow-xs"
      role="status"
    >
      <span><i class="fa-solid fa-clock-rotate-left mr-2 text-amber-600 dark:text-amber-400"></i>{{ store.t("A protected draft from this tab was restored.") }}</span>
      <button class="text-xs font-bold text-rose-600 hover:underline" @click="discardRecovered">{{ store.t("Discard draft") }}</button>
    </div>

    <section class="panel overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 shadow-card">
      <!-- Step Indicator Bar -->
      <div v-if="step > 0" class="border-b border-slate-100/80 bg-slate-50/60 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-950/40">
        <ol class="flex items-center justify-center gap-2 sm:gap-3" :aria-label="store.t('Wizard progress')">
          <li v-for="number in totalSteps" :key="number" class="flex items-center gap-2 sm:gap-3">
            <button
              class="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold transition-all shadow-xs"
              :class="number === step ? 'bg-brand text-white shadow-soft ring-2 ring-brand/30 ring-offset-2 dark:ring-offset-slate-900' : number < step ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              :aria-current="number === step ? 'step' : undefined"
              @click="number < step && (step = number)"
            >
              <i v-if="number < step" class="fa-solid fa-check text-xs"></i>
              <span v-else>{{ number }}</span>
            </button>
            <span v-if="number < totalSteps" class="h-0.5 w-5 sm:w-10 rounded-full" :class="number < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'"></span>
          </li>
        </ol>
      </div>

      <!-- Main Step Views -->
      <div ref="wizardPanel" class="min-h-105 p-6 sm:p-8">
        <WizardStep0Strategy v-if="step === 0" @choose-type="chooseType" />
        <WizardStep1Details v-else-if="step === 1" :project="project" :skills-text="skillsText" @update:skills-text="skillsText = $event" />
        <WizardStep3Files v-else-if="step === 2" :project="project" :format-size="formatSize" @add-file="addFile" @remove-file="removeFile" />
        <WizardStep4Team v-else-if="step === 3" :project="project" :available-team="availableTeam" :user-name="(id) => store.user(id)?.name" @add-team="addTeam" @remove-team="removeTeam" />
        <WizardStep5Approvers v-else :ordered-approvers="orderedApprovers" :available-approvers="availableApprovers" :user-name="(id) => store.user(id)?.name" @add-approver="addApprover" @remove-approver="removeApprover" />
      </div>

      <!-- Wizard Navigation Footer -->
      <footer v-if="step > 0" class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-5 dark:border-slate-700">
        <button class="btn-muted" @click="back"><i class="fa-solid fa-arrow-left mr-2"></i>{{ store.t("Back") }}</button>
        <p v-if="wizardError" class="text-xs font-semibold text-rose-500" role="alert">
          <i class="fa-solid fa-circle-exclamation mr-1"></i>{{ wizardError }}
        </p>
        <div class="flex items-center gap-3">
          <span v-if="draftSavedAt" class="hidden text-[10px] font-semibold text-emerald-600 md:inline">
            <i class="fa-solid fa-shield mr-1"></i>{{ store.t("Protected") }} {{ draftSavedAt }}
          </span>
          <span class="required-note">{{ store.t("Required fields") }}</span>
          <span class="hidden text-xs text-slate-400 sm:block">{{ store.t("Step " + step + " of " + totalSteps) }}</span>
          <button v-if="step < totalSteps" class="btn-brand" @click="next">
            {{ store.t("Next") }} <i class="fa-solid fa-arrow-right ml-2"></i>
          </button>
          <button v-else class="btn-brand" @click="finish">
            <i class="fa-solid fa-rocket mr-2"></i>{{ existing ? store.t("Save project") : store.t("Create project") }}
          </button>
        </div>
      </footer>
    </section>
  </section>

  <section v-else class="panel mx-auto max-w-xl p-10 text-center rounded-3xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
    <i class="fa-solid fa-cart-shopping text-3xl text-brand"></i>
    <h1 class="font-head mt-4 text-2xl font-800 text-slate-900 dark:text-white">{{ store.t("Switch to Buyer workspace") }}</h1>
    <p class="mt-2 text-sm text-slate-500">{{ store.t("Project creation and sourcing briefs operate in the Buyer workspace.") }}</p>
    <div class="mt-6 flex justify-center gap-3">
      <button class="btn-brand" @click="store.setMarketplaceMode('buyer')">{{ store.t("Switch to Buy") }}</button>
      <RouterLink to="/" class="btn-muted">{{ store.t("Back home") }}</RouterLink>
    </div>
  </section>
</template>
<script>
const { inject, computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const WizardStep0Strategy = load("./app/pages/wizard/WizardStep0Strategy.vue?v=2");
const WizardStep1Details = load("./app/pages/wizard/WizardStep1Details.vue?v=2");
const WizardStep3Files = load("./app/pages/wizard/WizardStep3Files.vue?v=2");
const WizardStep4Team = load("./app/pages/wizard/WizardStep4Team.vue?v=2");
const WizardStep5Approvers = load("./app/pages/wizard/WizardStep5Approvers.vue?v=2");

export default {
  components: { WizardStep0Strategy, WizardStep1Details, WizardStep3Files, WizardStep4Team, WizardStep5Approvers },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const allowed = computed(() => store.isBuyer.value || store.isAdmin.value || ["Client", "Admin"].includes(store.currentUser.value.type));
    const existing = computed(() => route.params.id !== "new" ? store.job(route.params.id) : null);

    const initialStep = Number(route.query.step);
    const step = ref(Number.isInteger(initialStep) && initialStep >= 0 && initialStep <= 4 ? initialStep : (existing.value ? 1 : 1));
    const totalSteps = computed(() => project.value.sourcingType === "RFI" ? 2 : 4);
    const skillsText = ref(""), wizardError = ref(""), draftRecovered = ref(false), draftSavedAt = ref("");

    const blankProject = () => ({
      sourcingType: "RFP", title: "", description: "", category: "Development", budget: 5000,
      projectLevel: "Intermediate", duration: "1 to 3 months", hiringLimitDate: "",
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      visibility: "private", currency: "USD", skills: [], files: [], team: [], approvers: [],
    });
    const project = ref(existing.value ? JSON.parse(JSON.stringify(existing.value)) : blankProject());

    if (existing.value?.skills) skillsText.value = existing.value.skills.join(", ");

    const chooseType = (type) => { project.value.sourcingType = type; step.value = 1; };

    const addFile = (event) => {
      const f = event.target.files?.[0];
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) return store.notice("File size exceeds 2 MB", "fa-triangle-exclamation");
      project.value.files.push({ id: window.WebCommon.uid("file"), name: f.name, size: f.size, category: "Brief" });
      event.target.value = "";
    };
    const removeFile = (id) => { project.value.files = project.value.files.filter((i) => i.id !== id); };

    const availableTeam = computed(() => store.state.users.filter((u) => !project.value.team.some((m) => m.userId === u.id)));
    const addTeam = (userId) => {
      if (!userId) return;
      project.value.team.push({ userId, role: "Contributor", permission: "view" });
    };
    const removeTeam = (userId) => { project.value.team = project.value.team.filter((m) => m.userId !== userId); };

    const availableApprovers = computed(() => store.state.users.filter((u) => !project.value.approvers.some((a) => a.userId === u.id)));
    const orderedApprovers = computed(() => [...project.value.approvers].sort((a, b) => a.level - b.level));
    const addApprover = (userId) => {
      if (!userId) return;
      project.value.approvers.push({ userId, level: project.value.approvers.length + 1, role: "Approver" });
    };
    const removeApprover = (userId) => { project.value.approvers = project.value.approvers.filter((a) => a.userId !== userId); };

    const formatSize = (bytes) => (bytes / 1024).toFixed(1) + " KB";

    const next = () => {
      wizardError.value = "";
      if (step.value === 1 && (!project.value.title || !project.value.description)) {
        wizardError.value = "Please complete the title and description before proceeding.";
        return;
      }
      step.value = Math.min(totalSteps.value, step.value + 1);
    };

    const back = () => { wizardError.value = ""; step.value = Math.max(0, step.value - 1); };

    const finish = () => {
      if (!project.value.title || !project.value.description) {
        wizardError.value = "Please complete the title and description.";
        step.value = 1;
        return;
      }
      project.value.skills = skillsText.value.split(",").map((s) => s.trim()).filter(Boolean);
      if (existing.value) {
        Object.assign(existing.value, project.value);
        store.notice("Project draft saved");
        router.push(`/project/${existing.value.id}`);
      } else {
        const newId = `job-${Date.now().toString().slice(-6)}`;
        const full = { ...project.value, id: newId, clientId: store.currentUser.value.id, status: "OPEN", createdAt: new Date().toISOString(), proposals: [], comments: [] };
        store.state.jobs.unshift(full);
        store.notice("Project created successfully!");
        router.push(`/project/${newId}`);
      }
    };

    const discardRecovered = () => { draftRecovered.value = false; project.value = blankProject(); };

    watch(step, (s) => {
      router.replace({ path: route.path, query: window.WebCommon.mergeRouteQuery(route.query, { step: s > 0 ? s : null }) });
    });

    return {
      store, allowed, existing, step, totalSteps, skillsText, wizardError, draftRecovered,
      draftSavedAt, project, chooseType, addFile, removeFile, availableTeam,
      addTeam, removeTeam, availableApprovers, orderedApprovers, addApprover, removeApprover,
      formatSize, next, back, finish, discardRecovered,
    };
  },
};
</script>
