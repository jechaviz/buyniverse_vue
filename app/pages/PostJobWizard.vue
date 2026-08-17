<template>
  <section v-if="allowed" class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ existing ? "Edit project draft" : "Create a project" }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Build a complete sourcing brief and collaboration workflow.
        </p>
      </div>
      <span
        v-if="project.sourcingType"
        class="rounded-xl border border-brand/20 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand dark:bg-brand/20"
        >{{ project.sourcingType }}</span
      >
    </div>
    <div
      v-if="draftRecovered"
      class="panel flex flex-wrap items-center justify-between gap-3 border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 rounded-2xl shadow-xs"
      role="status"
    >
      <span
        ><i class="fa-solid fa-clock-rotate-left mr-2 text-amber-600 dark:text-amber-400"></i>A
        protected draft from this tab was restored.</span
      >
      <button
        class="text-xs font-bold text-rose-600 hover:underline"
        @click="discardRecovered"
      >
        Discard draft
      </button>
    </div>

    <section class="panel overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 shadow-card">
      <div
        v-if="step > 0"
        class="border-b border-slate-100/80 bg-slate-50/60 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-950/40"
      >
        <ol
          class="flex items-center justify-center gap-2 sm:gap-3"
          aria-label="Wizard progress"
        >
          <li
            v-for="number in totalSteps"
            :key="number"
            class="flex items-center gap-2 sm:gap-3"
          >
            <button
              class="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold transition-all shadow-xs"
              :class="
                number === step
                  ? 'bg-brand text-white shadow-soft ring-2 ring-brand/30 ring-offset-2 dark:ring-offset-slate-900'
                  : number < step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              "
              :aria-current="number === step ? 'step' : undefined"
              @click="number < step && (step = number)"
            >
              <i v-if="number < step" class="fa-solid fa-check text-xs"></i
              ><span v-else>{{ number }}</span></button
            ><span
              v-if="number < totalSteps"
              class="h-0.5 w-5 sm:w-10 rounded-full"
              :class="number < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'"
            ></span>
          </li>
        </ol>
      </div>

      <div ref="wizardPanel" class="min-h-105 p-6 sm:p-8">
        <div v-if="step === 0" class="mx-auto max-w-2xl text-center">
          <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">
            Sourcing strategy
          </p>
          <h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">
            What do you need from the market?
          </h2>
          <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Choose the process that best matches the maturity of your
            requirement.
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-2">
            <button
              class="rounded-3xl border border-slate-200/90 bg-white p-6 text-left transition hover:border-brand hover:shadow-elevated dark:border-slate-800 dark:bg-slate-800/60 shadow-card"
              @click="chooseType('RFI')"
            >
              <span
                class="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 text-lg shadow-xs"
                ><i class="fa-solid fa-lightbulb"></i></span
              ><b class="font-head mt-4 block text-base font-800 text-slate-900 dark:text-white">Request for information</b
              ><span class="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400"
                >Explore solutions and refine a problem before defining a
                commercial scope.</span
              >
            </button>
            <button
              class="rounded-3xl border border-slate-200/90 bg-white p-6 text-left transition hover:border-brand hover:shadow-elevated dark:border-slate-800 dark:bg-slate-800/60 shadow-card"
              @click="chooseType('RFP')"
            >
              <span
                class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand dark:bg-brand/20 text-lg shadow-xs"
                ><i class="fa-solid fa-file-signature"></i></span
              ><b class="font-head mt-4 block text-base font-800 text-slate-900 dark:text-white">Request for proposal</b
              ><span class="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400"
                >Define scope, budget, team and approvals to receive comparable
                proposals.</span
              >
            </button>
          </div>
        </div>

        <div v-else-if="step === 1" class="mx-auto max-w-2xl">
          <WizardHeading
            kicker="Project assistant"
            title="Describe the outcome"
            copy="Start with a plain-language request. The demo can turn it into an editable brief."
          />
          <label class="mt-6 block text-sm font-semibold"
            >What are you trying to achieve?<textarea
              v-model.trim="prompt"
              class="field mt-2 min-h-36"
              placeholder="Example: We need a responsive customer portal with billing, roles and analytics."
            ></textarea>
          </label>
          <div class="mt-4 flex flex-wrap justify-end gap-3">
            <button class="btn-muted" @click="step = 2">Skip assistant</button
            ><button
              class="btn-brand"
              :disabled="!prompt"
              @click="generateBrief"
            >
              <i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Generate draft
            </button>
          </div>
        </div>

        <div v-else-if="step === 2" class="space-y-6">
          <WizardHeading
            kicker="Core brief"
            title="Project details"
            copy="Define the information providers need to qualify and price the work."
          />
          <div class="grid gap-4 md:grid-cols-2">
            <label class="block text-sm font-semibold md:col-span-2"
              >Title<input
                v-model.trim="project.title"
                class="field mt-2"
                required
                placeholder="Customer portal redesign"
            /></label>
            <label class="block text-sm font-semibold md:col-span-2"
              >Description<textarea
                v-model.trim="project.description"
                class="field mt-2 min-h-36"
                required
                placeholder="Scope, goals, constraints and expected outcomes"
              ></textarea>
            </label>
            <template v-if="project.sourcingType === 'RFP'">
              <label class="block text-sm font-semibold"
                >Category<select
                  v-model="project.category"
                  class="field mt-2"
                  required
                >
                  <option>Development</option>
                  <option>Design</option>
                  <option>Marketing</option>
                  <option>Operations</option>
                </select></label
              >
              <label class="block text-sm font-semibold"
                >Budget<input
                  v-model.number="project.budget"
                  class="field mt-2"
                  type="number"
                  min="1"
                  required
              /></label>
              <label class="block text-sm font-semibold"
                >Project level<select
                  v-model="project.projectLevel"
                  class="field mt-2"
                  required
                >
                  <option>Basic</option>
                  <option>Intermediate</option>
                  <option>Expert</option>
                </select></label
              >
              <label class="block text-sm font-semibold"
                >Duration<select
                  v-model="project.duration"
                  class="field mt-2"
                  required
                >
                  <option>Less than 1 month</option>
                  <option>1 to 3 months</option>
                  <option>3 to 6 months</option>
                  <option>More than 6 months</option>
                </select></label
              >
              <label class="block text-sm font-semibold"
                >Hiring limit<input
                  v-model="project.hiringLimitDate"
                  class="field mt-2"
                  type="date"
              /></label>
              <label class="block text-sm font-semibold"
                >Delivery date<input
                  v-model="project.dueDate"
                  class="field mt-2"
                  type="date"
              /></label>
              <label class="block text-sm font-semibold"
                >Visibility<select
                  v-model="project.visibility"
                  class="field mt-2"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select></label
              >
              <label class="block text-sm font-semibold"
                >Currency<select
                  v-model="project.currency"
                  class="field mt-2"
                  required
                >
                  <option>USD</option>
                  <option>MXN</option>
                </select></label
              >
              <label class="block text-sm font-semibold md:col-span-2"
                >Skills
                <span class="font-normal text-slate-400">comma separated</span
                ><input
                  v-model="skillsText"
                  class="field mt-2"
                  placeholder="Vue, UX research, Accessibility"
              /></label>
            </template>
          </div>
        </div>

        <div v-else-if="step === 3" class="mx-auto max-w-3xl">
          <WizardHeading
            kicker="Attachments"
            title="Project files"
            copy="Attach briefs or references and classify them for the project workspace."
          />
          <label
            class="mt-6 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center transition hover:border-brand hover:bg-brand-50/40 dark:border-slate-600"
            ><i class="fa-solid fa-cloud-arrow-up text-4xl text-slate-400"></i
            ><b class="mt-3">Choose a file</b
            ><span class="mt-1 text-sm text-slate-500"
              >PDF, Office, text or image · maximum 2 MB · metadata stays in
              this demo.</span
            ><input
              class="hidden"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,text/plain,text/markdown,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              @change="addFile"
          /></label>
          <div class="mt-5 space-y-2">
            <article
              v-for="file in project.files"
              :key="file.id"
              class="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
            >
              <i class="fa-solid fa-file text-brand"></i
              ><b class="min-w-0 flex-1 truncate text-sm">{{ file.name }}</b
              ><small class="text-slate-400">{{ formatSize(file.size) }}</small
              ><select
                v-model="file.category"
                class="rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-600"
              >
                <option>Brief</option>
                <option>Contract</option>
                <option>Documentation</option>
                <option>Reference</option></select
              ><button
                class="text-red-500"
                aria-label="Remove file"
                @click="removeFile(file.id)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </article>
          </div>
        </div>

        <div v-else-if="step === 4" class="mx-auto max-w-2xl">
          <WizardHeading
            kicker="Collaboration"
            title="Project team"
            copy="Add workspace members and define what they can do."
          />
          <div class="mt-6 space-y-2">
            <article
              v-for="member in project.team"
              :key="member.userId"
              class="grid items-center gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_9rem_7rem_auto] dark:bg-slate-800/60"
            >
              <b>{{ store.user(member.userId)?.name }}</b
              ><label
                ><span class="mb-1 block text-[10px] font-bold">Role</span
                ><input
                  v-model="member.role"
                  class="field py-1.5"
                  placeholder="Role"
                  required /></label
              ><label
                ><span class="mb-1 block text-[10px] font-bold">Access</span
                ><select
                  v-model="member.permission"
                  class="field py-1.5"
                  required
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select></label
              ><button
                class="text-red-500"
                aria-label="Remove team member"
                @click="removeTeam(member.userId)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </article>
          </div>
          <select
            class="field mt-4"
            value=""
            @change="
              addTeam($event.target.value);
              $event.target.value = '';
            "
          >
            <option value="">Add a team member</option>
            <option
              v-for="person in availableTeam"
              :key="person.id"
              :value="person.id"
            >
              {{ person.name }} · {{ person.type }}
            </option>
          </select>
        </div>

        <div v-else class="mx-auto max-w-2xl">
          <WizardHeading
            kicker="Governance"
            title="Approval chain"
            copy="Set the people who must approve the project before publication."
          />
          <div class="mt-6 space-y-2">
            <article
              v-for="approver in orderedApprovers"
              :key="approver.userId"
              class="grid items-center gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[5rem_1fr_9rem_auto] dark:bg-slate-800/60"
            >
              <label
                ><span class="mb-1 block text-[10px] font-bold">Level</span
                ><input
                  v-model.number="approver.level"
                  class="field py-1.5 text-center"
                  type="number"
                  min="1"
                  required /></label
              ><b>{{ store.user(approver.userId)?.name }}</b
              ><label
                ><span class="mb-1 block text-[10px] font-bold">Role</span
                ><input
                  v-model="approver.role"
                  class="field py-1.5"
                  placeholder="Approver role"
                  required /></label
              ><button
                class="text-red-500"
                aria-label="Remove approver"
                @click="removeApprover(approver.userId)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </article>
          </div>
          <select
            class="field mt-4"
            value=""
            @change="
              addApprover($event.target.value);
              $event.target.value = '';
            "
          >
            <option value="">Add an approver</option>
            <option
              v-for="person in availableApprovers"
              :key="person.id"
              :value="person.id"
            >
              {{ person.name }} · {{ person.type }}
            </option>
          </select>
        </div>
      </div>

      <footer
        v-if="step > 0"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-5 dark:border-slate-700"
      >
        <button class="btn-muted" @click="back">
          <i class="fa-solid fa-arrow-left mr-2"></i>Back
        </button>
        <p
          v-if="wizardError"
          class="text-xs font-semibold text-rose-500"
          role="alert"
        >
          <i class="fa-solid fa-circle-exclamation mr-1"></i>{{ wizardError }}
        </p>
        <div class="flex items-center gap-3">
          <span
            v-if="draftSavedAt"
            class="hidden text-[10px] font-semibold text-emerald-600 md:inline"
            ><i class="fa-solid fa-shield mr-1"></i>Protected
            {{ draftSavedAt }}</span
          >
          <span class="required-note">Required fields</span
          ><span class="hidden text-xs text-slate-400 sm:block"
            >Step {{ step }} of {{ totalSteps }}</span
          ><button v-if="step < totalSteps" class="btn-brand" @click="next">
            Next <i class="fa-solid fa-arrow-right ml-2"></i></button
          ><button v-else class="btn-brand" @click="finish">
            <i class="fa-solid fa-rocket mr-2"></i
            >{{ existing ? "Save project" : "Create project" }}
          </button>
        </div>
      </footer>
    </section>
  </section>
  <section v-else class="panel mx-auto max-w-xl p-10 text-center rounded-3xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
    <i class="fa-solid fa-cart-shopping text-3xl text-brand"></i>
    <h1 class="font-head mt-4 text-2xl font-800 text-slate-900 dark:text-white">Switch to Buyer workspace</h1>
    <p class="mt-2 text-sm text-slate-500">
      Project creation and sourcing briefs operate in the Buyer workspace.
    </p>
    <div class="mt-6 flex justify-center gap-3">
      <button class="btn-brand" @click="store.setMarketplaceMode('buyer')">
        <i class="fa-solid fa-cart-shopping mr-2"></i>Switch to Buyer
      </button>
      <RouterLink to="/" class="btn-muted">Go home</RouterLink>
    </div>
  </section>
</template>
<script>
const { inject, ref, computed, watch, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const WizardHeading = {
  props: ["kicker", "title", "copy"],
  template:
    '<div class="text-center"><p class="premium-kicker text-xs font-bold uppercase text-brand">{{ kicker }}</p><h2 class="mt-2 text-2xl font-800">{{ title }}</h2><p class="mt-2 text-slate-500">{{ copy }}</p></div>',
};
export default {
  components: { WizardHeading },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter(),
      existing = computed(() =>
        route.params.id && route.params.id !== "new"
          ? store.job(route.params.id)
          : null,
      ),
      allowed = computed(
        () =>
          store.currentUser.value.type === "Admin" ||
          store.isAdmin.value ||
          ((store.isBuyer.value || store.currentUser.value.type === "Client") &&
            (!existing.value ||
              existing.value.clientId === store.currentUser.value.id)),
      );
    const blank = () => ({
      title: "",
      description: "",
      sourcingType: "",
      category: "Development",
      budget: null,
      currency: "USD",
      projectLevel: "Intermediate",
      duration: "1 to 3 months",
      visibility: "private",
      hiringLimitDate: "",
      dueDate: "",
      skills: [],
      files: [],
      team: [],
      approvers: [],
    });
    const draftStore = window.WebCommon.createSessionDraft(
        `buyniverse-project-${store.currentUser.value.id}-${route.params.id || "new"}`,
        { ttlMs: 8 * 60 * 60 * 1000 },
      ),
      recovered = existing.value ? null : draftStore.read();
    const project = ref(
        existing.value
          ? JSON.parse(JSON.stringify(existing.value))
          : recovered?.project || blank(),
      ),
      step = ref(
        Number.isInteger(Number(route.query.step)) &&
          Number(route.query.step) >= 0 &&
          Number(route.query.step) <= 4
          ? Number(route.query.step)
          : (recovered?.step ?? (project.value.sourcingType ? 1 : 0)),
      ),
      prompt = ref(recovered?.prompt || ""),
      skillsText = ref(
        recovered?.skillsText || (project.value.skills || []).join(", "),
      ),
      wizardPanel = ref(null),
      wizardError = ref(""),
      draftRecovered = ref(Boolean(recovered)),
      draftSavedAt = ref("");
    let draftTimer = 0,
      draftCompleted = false;
    const saveDraft = () => {
      window.clearTimeout(draftTimer);
      if (existing.value || draftCompleted) return;
      if (
        draftStore.write({
          project: project.value,
          step: step.value,
          prompt: prompt.value,
          skillsText: skillsText.value,
        })
      )
        draftSavedAt.value = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    };
    watch(
      [project, step, prompt, skillsText],
      () => {
        draftRecovered.value = false;
        window.clearTimeout(draftTimer);
        draftTimer = window.setTimeout(saveDraft, 350);
      },
      { deep: true },
    );
    watch(
      step,
      (value) => {
        if (String(route.query.step ?? "") === String(value)) return;
        router.replace({
          path: route.path,
          query: window.WebCommon.mergeRouteQuery(route.query, {
            step: value,
          }),
        });
      },
      { immediate: true },
    );
    watch(
      () => route.query.step,
      (value) => {
        const next = Number(value);
        if (
          Number.isInteger(next) &&
          next >= 0 &&
          next <= totalSteps.value &&
          next !== step.value
        )
          step.value = next;
      },
    );
    onBeforeUnmount(saveDraft);
    const discardRecovered = () => {
      draftStore.clear();
      project.value = blank();
      step.value = 0;
      prompt.value = "";
      skillsText.value = "";
      draftRecovered.value = false;
      draftSavedAt.value = "";
      store.notice("Recovered draft discarded");
    };
    const totalSteps = computed(() =>
        project.value.sourcingType === "RFI" ? 2 : 5,
      ),
      orderedApprovers = computed(() =>
        [...(project.value.approvers || [])].sort((a, b) => a.level - b.level),
      ),
      availableTeam = computed(() =>
        store.state.users.filter(
          (person) =>
            !(project.value.team || []).some(
              (member) => member.userId === person.id,
            ),
        ),
      ),
      availableApprovers = computed(() =>
        store.state.users.filter(
          (person) =>
            !(project.value.approvers || []).some(
              (member) => member.userId === person.id,
            ),
        ),
      );
    const canContinue = computed(() =>
        step.value === 1
          ? true
          : step.value === 2
            ? Boolean(
                project.value.title &&
                project.value.description &&
                (project.value.sourcingType === "RFI" ||
                  (Number(project.value.budget) > 0 &&
                    project.value.projectLevel &&
                    project.value.duration)),
              )
            : true,
      ),
      canFinish = computed(
        () => project.value.title && project.value.description,
      );
    const chooseType = (type) => {
      project.value.sourcingType = type;
      step.value = 1;
    };
    const generateBrief = () => {
      const text = prompt.value.trim();
      if (!text) return;
      project.value.title = text.split(/[.!?]/)[0].slice(0, 80);
      project.value.description = `Objective\n${text}\n\nExpected outcome\nA clear, measurable delivery proposal with scope, timing and assumptions.`;
      const lower = text.toLowerCase();
      project.value.category = lower.includes("design")
        ? "Design"
        : lower.includes("marketing")
          ? "Marketing"
          : "Development";
      skillsText.value =
        project.value.category === "Design"
          ? "Figma, UX, Design systems"
          : project.value.category === "Marketing"
            ? "Campaign strategy, Analytics"
            : "Architecture, Development, Testing";
      step.value = 2;
    };
    const validateCurrent = () => {
      wizardError.value = "";
      const invalid = wizardPanel.value?.querySelector(":invalid");
      if (invalid) {
        invalid.reportValidity();
        invalid.focus();
        wizardError.value = "Complete the required fields marked with *.";
        return false;
      }
      if (!canContinue.value) {
        wizardError.value =
          "Complete the required project information before continuing.";
        return false;
      }
      return true;
    };
    const next = () => {
      if (validateCurrent())
        step.value = Math.min(totalSteps.value, step.value + 1);
    };
    const back = () => {
      wizardError.value = "";
      step.value = Math.max(0, step.value - 1);
    };
    const addFile = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const allowed = /\.(pdf|docx?|txt|md|csv|png|jpe?g)$/i;
      if (file.size > 2 * 1024 * 1024 || !allowed.test(file.name)) {
        store.notice("Use an allowed file of 2 MB or less", "fa-shield-halved");
        event.target.value = "";
        return;
      }
      const safeName = window.WebCommon.sanitizeText(
        file.name.replace(/[\\/]/g, "_"),
        120,
      );
      const entry = {
        id: window.ProcurementCommon.uid("file"),
        name: safeName,
        path: "/",
        size: file.size,
        type: file.type || "application/octet-stream",
        category: "Documentation",
        uploadedAt: new Date().toISOString(),
        uploadedById: store.currentUser.value.id,
        status: "Modified",
      };
      project.value.files.push(entry);
      if (
        /^text\/(plain|markdown|csv)$/.test(file.type) &&
        file.size <= 100000
      ) {
        const reader = new FileReader();
        reader.onload = () =>
          (entry.content = window.WebCommon.sanitizeText(
            reader.result,
            100000,
          ));
        reader.onerror = () =>
          store.notice("The file could not be read", "fa-triangle-exclamation");
        reader.readAsText(file);
      }
      event.target.value = "";
    };
    const removeFile = (id) =>
      (project.value.files = project.value.files.filter(
        (file) => file.id !== id,
      ));
    const formatSize = (size) =>
      size < 1024 ? `${size} B` : `${Math.round(size / 1024)} KB`;
    const addTeam = (id) => {
      if (id)
        project.value.team.push({
          userId: id,
          role: "Team member",
          permission: "view",
        });
    };
    const removeTeam = (id) =>
      (project.value.team = project.value.team.filter(
        (member) => member.userId !== id,
      ));
    const addApprover = (id) => {
      if (id)
        project.value.approvers.push({
          userId: id,
          role: "Project approver",
          level: project.value.approvers.length + 1,
          status: "Pending",
        });
    };
    const removeApprover = (id) =>
      (project.value.approvers = project.value.approvers.filter(
        (member) => member.userId !== id,
      ));
    const finish = () => {
      if (!allowed.value || !validateCurrent() || !canFinish.value) return;
      const data = {
        ...project.value,
        title: window.WebCommon.sanitizeText(project.value.title, 120).trim(),
        description: window.WebCommon.sanitizeText(
          project.value.description,
          4000,
        ).trim(),
        skills: skillsText.value
          .split(",")
          .map((value) => window.WebCommon.sanitizeText(value, 80).trim())
          .filter(Boolean)
          .slice(0, 30),
        budget: Number(project.value.budget) || 0,
        dueDate: project.value.dueDate
          ? new Date(project.value.dueDate).toISOString()
          : undefined,
        hiringLimitDate: project.value.hiringLimitDate
          ? new Date(project.value.hiringLimitDate).toISOString()
          : undefined,
      };
      let saved;
      if (existing.value) {
        const identity = {
          id: existing.value.id,
          clientId: existing.value.clientId,
        };
        Object.assign(existing.value, data, identity);
        saved = existing.value;
        store.notice("Project draft saved", "fa-floppy-disk");
      } else {
        saved = store.postJob(data);
      }
      if (saved) {
        draftCompleted = true;
        draftStore.clear();
        router.push(`/project/${saved.id}`);
      }
    };
    return {
      store,
      existing,
      allowed,
      project,
      step,
      prompt,
      skillsText,
      totalSteps,
      orderedApprovers,
      availableTeam,
      availableApprovers,
      canContinue,
      canFinish,
      wizardPanel,
      wizardError,
      draftRecovered,
      draftSavedAt,
      discardRecovered,
      chooseType,
      generateBrief,
      next,
      back,
      addFile,
      removeFile,
      formatSize,
      addTeam,
      removeTeam,
      addApprover,
      removeApprover,
      finish,
    };
  },
};
</script>
