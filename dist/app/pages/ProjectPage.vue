<template><section v-if="job && allowed" class="space-y-6"><div class="flex flex-wrap items-start justify-between gap-4"><div><h1 class="premium-title text-3xl font-800">{{ job.title }}</h1><p class="mt-2 text-slate-500">
          {{ job.category }} · {{ store.money(job.budget, job.currency) }} ·
          {{ job.dueDate ? `Due ${store.date(job.dueDate)}` : "No due date" }}
        </p></div><span class="badge bg-brand-50 text-brand dark:bg-brand/20">{{ job.status.replace("_", " ") }}</span></div><div v-if="contest" class="panel border-brand-200 p-5"><p class="text-sm font-bold text-brand">Design contest</p><p class="mt-1 text-sm text-slate-500">
        {{ contest.bids.length }} entries ·
        {{ contest.winnerId ? `Winner: ${store.user(contest.winnerId)?.name}` : `Closes ${store.date(contest.endTime)}` }}
      </p></div><section v-if="isPreHiring" class="panel p-5"><div class="flex flex-wrap items-center justify-between gap-4"><div><p class="premium-kicker text-xs font-bold uppercase text-brand">Project launchpad</p><h2 class="mt-2 text-xl font-800">Source, compare and award providers</h2></div><button v-if="job.clientId === store.currentUser.value.id && job.status === 'DRAFT'" class="btn-brand" @click="publishProject"><i class="fa-solid fa-rocket mr-2"></i>Publish project
        </button></div><ol class="mt-6 grid gap-4 md:grid-cols-3"><li v-for="step in launchSteps" :key="step.label" class="flex gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/65"><span class="grid h-8 w-8 flex-none place-items-center rounded-full text-xs font-bold" :class="step.done ? 'bg-green-500 text-white' : step.current ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'">
            {{ step.done ? "✓" : step.number }}
          </span><div><b class="text-sm">{{ step.label }}</b><p class="mt-1 text-xs text-slate-500">{{ step.copy }}</p></div></li></ol></section><nav class="flex gap-5 overflow-x-auto border-b border-slate-200 dark:border-slate-700" aria-label="Project sections"><button
        v-for="tab in tabs"
        :key="tab.key"
        class="whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-bold transition"
        :class="activeTab === tab.key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
        @click="openProjectTab(tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="ml-1.5 text-xs opacity-70">{{ tab.count }}</span></button></nav><ProjectDetailsTab
      v-if="activeTab === 'details'"
      :job="job"
      :draft="draft"
      :editing="editing"
      :comments="comments"
      :proposals-count="proposals.length"
      :user-name="(id) => store.user(id)?.name"
      :format-date="store.date"
      :format-money="store.money"
      @toggle-editing="toggleEditing"
      @save-project="saveProject"
      @reset-draft="resetDraft"
    /><ProjectProvidersTab
      v-else-if="activeTab === 'providers'"
      :job="job"
      :contest="contest"
      :is-owner="store.currentUser.value.id === job.clientId"
      :is-freelancer="store.currentUser.value.type === 'Freelancer'"
      :provider-tab="providerTab"
      :provider-search="providerSearch"
      :provider-rows="providerRows"
      :proposals="proposals"
      :bid="bid"
      :provider-state="providerState"
      :user-name="(id) => store.user(id)?.name"
      :format-money="store.money"
      @update:provider-tab="openProviderTab"
      @update:provider-search="providerSearch = $event"
      @update:bid="bid = $event"
      @set-state="({ provider, state }) => setProviderState(provider, state)"
      @propose="propose"
    /><ProjectMilestonesTab
      v-else-if="activeTab === 'milestones'"
      :job="job"
      :milestones="milestones"
      :is-owner="store.currentUser.value.id === job.clientId"
      :format-date="store.date"
      :format-money="store.money"
      @open-milestone="openMilestone"
      @release="release"
    /><section v-else-if="activeTab === 'files'" class="panel overflow-hidden"><div class="border-b border-slate-100 p-5 dark:border-slate-700"><h2 class="font-800">Files</h2></div><div v-if="files.length" class="divide-y divide-slate-100 dark:divide-slate-700"><article v-for="file in files" :key="file.id" class="flex flex-wrap items-center justify-between gap-4 p-5"><span class="font-mono text-sm font-bold">{{ file.name }}</span><button class="btn-muted" @click="openFile(file)">Preview</button></article></div><p v-else class="p-10 text-center text-sm text-slate-500">No files uploaded.</p><div v-if="selectedFile" class="border-t border-slate-100 p-5 dark:border-slate-700"><div class="flex items-center justify-between mb-3"><b class="text-sm">{{ selectedFile.name }}</b><button class="btn-brand text-xs" @click="saveFile">Save file</button></div><textarea v-model="filePreview" class="min-h-48 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-slate-100 outline-none focus:border-brand"></textarea></div></section><section v-else class="panel overflow-hidden"><div class="border-b border-slate-100 p-5 dark:border-slate-700"><h2 class="font-800">Comments</h2></div><div class="space-y-3 p-5"><article v-for="c in comments.slice().reverse()" :key="c.id" class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/65" :class="c.parentId ? 'ml-8 border-l-2 border-brand/30' : ''"><b>{{ store.user(c.userId)?.name || "Team member" }}</b><p class="mt-1 text-sm">{{ c.text }}</p><small class="mt-2 block text-slate-400">{{ store.date(c.at) }}</small><button class="mt-2 text-xs font-bold text-brand hover:underline" @click="replyTo = c">Reply</button></article><p v-if="!comments.length" class="py-5 text-center text-sm text-slate-500">Start the project conversation.</p></div><form class="border-t border-slate-100 p-5 dark:border-slate-700" @submit.prevent="addComment"><div v-if="replyTo" class="mb-2 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand dark:bg-brand/15"><span>Replying to {{ store.user(replyTo.userId)?.name }}</span><button type="button" @click="replyTo = null"><i class="fa-solid fa-xmark"></i></button></div><div class="flex gap-3"><input v-model.trim="commentDraft" class="field" :placeholder="replyTo ? 'Write a reply' : 'Write an update'" /><button class="btn-brand">{{ replyTo ? "Reply" : "Comment" }}</button></div></form></section></section><section v-else class="panel p-8 text-center"><h1 class="text-2xl font-800">Project not found</h1><RouterLink to="/projects" class="btn-brand mt-4">Back to projects</RouterLink></section><Teleport to="body"><Transition name="toast"><div v-if="focusedMilestone" class="fixed inset-0 z-60 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Milestone tasks"><button class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Close task view" @click="closeMilestone"></button><section class="glass relative max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl p-6 shadow-2xl"><div class="flex items-start justify-between gap-4"><div><p class="premium-kicker text-xs font-bold uppercase text-brand">Milestone tasks</p><h2 class="premium-title mt-2 text-2xl font-800">{{ focusedMilestone.title }}</h2></div><button class="btn-muted h-9 w-9 p-0" aria-label="Close" @click="closeMilestone"><i class="fa-solid fa-xmark"></i></button></div><div v-if="focusedTasks.length" class="mt-6 grid gap-3 md:grid-cols-2"><article v-for="task in focusedTasks" :key="task.id" class="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/50"><div class="flex items-start justify-between gap-3"><b>{{ task.title }}</b><select class="rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-600" :value="task.status" @change="task.status = $event.target.value"><option>Todo</option><option>In progress</option><option>Done</option></select></div><div class="mt-4 flex items-center justify-between text-xs text-slate-500"><span><i class="fa-regular fa-comment-dots mr-1"></i>{{ task.commentsCount || 0 }}</span><span><i class="fa-solid fa-paperclip mr-1"></i>{{ task.attachmentsCount || 0 }}</span><span>{{ task.assignedTo?.map((id) => store.user(id)?.avatar).join(" · ") }}</span></div></article></div><p v-else class="mt-6 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-800/60">No tasks have been defined for this milestone.</p></section></div></Transition></Teleport></template>
<script>
const { inject, computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const ProjectDetailsTab = load("./app/pages/project/ProjectDetailsTab.vue?v=1");
const ProjectProvidersTab = load("./app/pages/project/ProjectProvidersTab.vue?v=1");
const ProjectMilestonesTab = load("./app/pages/project/ProjectMilestonesTab.vue?v=1");
export default {
components: { ProjectDetailsTab, ProjectProvidersTab, ProjectMilestonesTab },
setup() {
const store = inject("store"), route = useRoute(), router = useRouter();
const job = computed(() => store.job(route.params.id));
const contract = computed(() => job.value?.contractId ? store.contract(job.value.contractId) : null);
const contest = computed(() => store.state.contests.find((i) => i.id === job.value?.contestId));
const allowed = computed(() => {
const item = job.value, user = store.currentUser.value;
if (!item) return false;
return user.type === "Admin" || item.clientId === user.id || contract.value?.providerId === user.id || item.proposals?.some((p) => p.freelancerId === user.id);
});
const canManage = computed(() => Boolean(job.value) && (store.currentUser.value.type === "Admin" || job.value.clientId === store.currentUser.value.id));
const proposals = computed(() => canManage.value ? job.value?.proposals || [] : (job.value?.proposals || []).filter((p) => p.freelancerId === store.currentUser.value.id));
const milestones = computed(() => allowed.value ? contract.value?.milestones || [] : []);
const files = computed(() => allowed.value ? job.value?.files || [] : []);
const comments = computed(() => allowed.value ? job.value?.comments || [] : []);
const activeTab = ref("details"), providerTab = ref("providers"), providerSearch = ref("");
const editing = ref(false), focusedMilestone = ref(null), bid = ref(null), commentDraft = ref(""), replyTo = ref(null), selectedFile = ref(null), filePreview = ref("");
const makeDraft = () => ({
title: job.value?.title || "", category: job.value?.category || "", budget: job.value?.budget || 0,
status: job.value?.status || "DRAFT", dueDate: job.value?.dueDate?.slice?.(0, 10) || "",
skillsText: (job.value?.skills || []).join(", "), description: job.value?.description || "",
});
const draft = ref(makeDraft());
const providerRows = computed(() => store.state.users.filter((u) => u.type === "Freelancer").filter((u) => `${u.name} ${u.headline || ""} ${(u.skills || []).join(" ")}`.toLowerCase().includes(providerSearch.value.toLowerCase())));
const tabs = computed(() => [
{ key: "details", label: "Details" }, { key: "providers", label: "Providers", count: proposals.value.length },
{ key: "milestones", label: "Milestones", count: milestones.value.length }, { key: "files", label: "Files", count: files.value.length },
{ key: "comments", label: "Comments", count: comments.value.length },
]);
const focusedTasks = computed(() => focusedMilestone.value?.tasks || []);
const isPreHiring = computed(() => ["DRAFT", "OPEN", "PENDING_APPROVAL", "RFI"].includes(job.value?.status));
const launchSteps = computed(() => [
{ number: 1, label: "Source providers", copy: "Invite qualified freelancers", done: (job.value?.invitedFreelancers || []).length > 0, current: (job.value?.invitedFreelancers || []).length === 0 },
{ number: 2, label: "Compare proposals", copy: "Evaluate bids & portfolio fit", done: proposals.value.length > 0, current: (job.value?.invitedFreelancers || []).length > 0 && !proposals.value.length },
{ number: 3, label: "Award contract", copy: "Fund escrow & start delivery", done: Boolean(job.value?.contractId), current: proposals.value.length > 0 && !job.value?.contractId },
]);
const openProjectTab = (key) => { activeTab.value = key; router.replace({ query: window.WebCommon.mergeRouteQuery(route.query, { tab: key }) }); };
const openProviderTab = (key) => { providerTab.value = key; };
const toggleEditing = () => { editing.value = !editing.value; if (editing.value) draft.value = makeDraft(); };
const resetDraft = () => { draft.value = makeDraft(); editing.value = false; };
const saveProject = () => {
Object.assign(job.value, { ...draft.value, skills: draft.value.skillsText.split(",").map((s) => s.trim()).filter(Boolean) });
editing.value = false;
store.notice("Project updated successfully");
};
const publishProject = () => { job.value.status = "OPEN"; store.notice("Project published!"); };
const providerState = (p) => (job.value?.invitedFreelancers || []).includes(p.id) ? "Invited" : (job.value?.shortlistedFreelancers || []).includes(p.id) ? "Shortlisted" : "Available";
const setProviderState = (p, state) => {
if (state === "invited") {
job.value.invitedFreelancers = job.value.invitedFreelancers || [];
if (!job.value.invitedFreelancers.includes(p.id)) job.value.invitedFreelancers.push(p.id);
} else {
job.value.shortlistedFreelancers = job.value.shortlistedFreelancers || [];
if (!job.value.shortlistedFreelancers.includes(p.id)) job.value.shortlistedFreelancers.push(p.id);
}
store.notice(`${p.name} marked as ${state}`);
};
const propose = () => {
if (!bid.value) return;
store.addProposal(job.value.id, { freelancerId: store.currentUser.value.id, bid: bid.value, status: "SUBMITTED" });
bid.value = null;
store.notice("Proposal submitted successfully!");
};
const openMilestone = (m) => { focusedMilestone.value = m; };
const closeMilestone = () => { focusedMilestone.value = null; };
const release = (m) => { store.release(contract.value.id, m.id); store.notice("Milestone funds released"); };
const openFile = (f) => { selectedFile.value = f; filePreview.value = f.content || ""; };
const saveFile = () => { if (selectedFile.value) { selectedFile.value.content = filePreview.value; store.notice("File content saved"); } };
const addComment = () => {
if (!commentDraft.value) return;
store.sendMessage({ jobId: job.value.id, userId: store.currentUser.value.id, text: commentDraft.value, parentId: replyTo.value?.id || null, at: new Date().toISOString() });
commentDraft.value = ""; replyTo.value = null;
};
const syncRouteState = () => {
const q = route.query;
if (q.tab && ["details", "providers", "milestones", "files", "comments"].includes(q.tab)) activeTab.value = q.tab;
if (q.providerTab && ["providers", "proposals"].includes(q.providerTab)) providerTab.value = q.providerTab;
if (q.milestone) {
const m = milestones.value.find((item) => item.id === q.milestone);
if (m) focusedMilestone.value = m;
}
};
watch(() => route.query, syncRouteState, { immediate: true });
return {
store, job, contract, contest, allowed, canManage, proposals, milestones, files, comments,
activeTab, providerTab, providerSearch, editing, focusedMilestone, bid, commentDraft, replyTo,
selectedFile, filePreview, draft, providerRows, tabs, focusedTasks, isPreHiring, launchSteps,
openProjectTab, openProviderTab, toggleEditing, resetDraft, saveProject, publishProject,
providerState, setProviderState, propose, openMilestone, closeMilestone, release, openFile,
saveFile, addComment, syncRouteState,
};
},
};
</script>