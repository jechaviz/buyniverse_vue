<template><div class="space-y-5"><nav class="glass flex gap-1 overflow-x-auto rounded-xl p-1.5"><button
        v-for="item in tabs"
        :key="item.key"
        class="min-w-max rounded-lg px-3 py-2 text-xs font-bold"
        :class="tab === item.key ? 'bg-brand text-white' : 'text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700'"
        @click="openTab(item.key)"
      ><i class="fa-solid mr-1.5" :class="item.icon"></i>{{ item.label }}
        <span v-if="item.count" class="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px]">{{ item.count }}</span></button></nav><GovernanceAutomationTab
      v-if="tab === 'automation'"
      :workflows="store.state.procurementWorkflows"
      @open-workflow="workflowOpen = true"
      @toggle-workflow="toggleWorkflow"
    /><GovernanceRulesTab
      v-else-if="tab === 'rules'"
      :rules="store.state.procurementRules"
      :rule-draft="ruleDraft"
      :rule-icon="ruleIcon"
      :rule-type-label="ruleTypeLabel"
      @toggle-rule="toggleRule"
      @add-rule="addRule"
    /><GovernanceRolesTab
      v-else-if="tab === 'roles'"
      :roles="roles"
      :role-surfaces="roleSurfaces"
      :role-principles="rolePrinciples"
    /><GovernanceConfigTab
      v-else-if="tab === 'configuration'"
      :config-groups="configGroups"
      :configuration="configuration"
      :native-checks="nativeChecks"
      @config-changed="configChanged"
      @reset-data="store.reset"
    /><GovernanceAuditTab
      v-else
      :audit-search="auditSearch"
      :filtered-audit="filteredAudit"
      :format-date="store.date"
      :user-name="(id) => store.user(id)?.name"
      @update:audit-search="auditSearch = $event"
      @export="exportAudit"
    /><GovernanceWorkflowModal
      :open="workflowOpen"
      :draft="workflowDraft"
      @close="workflowOpen = false"
      @save="saveWorkflow"
    /></div></template>
<script>
const { inject, computed, ref, reactive, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const GovernanceAutomationTab = load("./app/pages/procurement/governance/GovernanceAutomationTab.vue?v=1");
const GovernanceRulesTab = load("./app/pages/procurement/governance/GovernanceRulesTab.vue?v=1");
const GovernanceRolesTab = load("./app/pages/procurement/governance/GovernanceRolesTab.vue?v=1");
const GovernanceConfigTab = load("./app/pages/procurement/governance/GovernanceConfigTab.vue?v=1");
const GovernanceAuditTab = load("./app/pages/procurement/governance/GovernanceAuditTab.vue?v=1");
const GovernanceWorkflowModal = load("./app/pages/procurement/governance/GovernanceWorkflowModal.vue?v=1");
export default {
components: { GovernanceAutomationTab, GovernanceRulesTab, GovernanceRolesTab, GovernanceConfigTab, GovernanceAuditTab, GovernanceWorkflowModal },
setup() {
const store = inject("store"), route = useRoute(), router = useRouter();
const tab = computed({
get: () => ["automation", "rules", "roles", "configuration", "audit"].includes(route.query.tab) ? route.query.tab : "automation",
set: (key) => router.push({ path: "/procurement/governance", query: window.WebCommon.mergeRouteQuery(route.query, { tab: key }) }),
});
const openTab = (key) => { tab.value = key; };
const tabs = [
{ key: "automation", label: "Automations", icon: "fa-bolt" },
{ key: "rules", label: "Rules", icon: "fa-scale-balanced" },
{ key: "roles", label: "Roles", icon: "fa-users-gear" },
{ key: "configuration", label: "Configuration", icon: "fa-sliders" },
{ key: "audit", label: "History", icon: "fa-clock-rotate-left" },
];
const ruleDraft = reactive({ name: "", type: "Approval", condition: "", action: "" });
const auditSearch = ref(""), workflowOpen = ref(false);
const workflowDraft = reactive({ name: "", trigger: "", stepsText: "" });
const roleSurfaces = ["Cockpit", "Intake", "Sourcing", "Auction", "Execution", "Intelligence", "Governance"];
const roles = [
{ name: "Buyer / Operator", productRole: "Standard requester", surfaces: ["Cockpit", "Intake", "Sourcing", "Execution"], job: "Create requests, run sourcing rounds, receive goods and manage exceptions." },
{ name: "Procurement Lead", productRole: "Category strategist", surfaces: ["Cockpit", "Intake", "Sourcing", "Auction", "Execution", "Intelligence", "Governance"], job: "Manage complex tenders, run live auctions, maintain supplier panels and policy rules." },
{ name: "Approver (Budget)", productRole: "Manager / Director", surfaces: ["Cockpit", "Intake", "Governance"], job: "Approve intake requests above threshold and review audit log." },
{ name: "Supplier Participant", productRole: "External bidder", surfaces: ["Cockpit", "Auction", "Execution"], job: "Submit quotes, place real-time bids in reverse auctions and review receipts." },
{ name: "Administrator", productRole: "Platform admin", surfaces: ["Cockpit", "Intake", "Sourcing", "Auction", "Execution", "Intelligence", "Governance"], job: "Full administrative access, policy definitions and demo data management." },
];
const rolePrinciples = [
{ title: "No blind execution", icon: "fa-eye", detail: "High-value approvals and award decisions require explicit human review." },
{ title: "Supplier confidentiality", icon: "fa-user-secret", detail: "Competitor identities remain masked during live auctions." },
{ title: "Reversible changes", icon: "fa-clock-rotate-left", detail: "All status changes and rule definitions are tracked in the audit trail." },
{ title: "Zero data leakage", icon: "fa-shield-halved", detail: "Strict segregation of client, supplier and platform administrative views." },
];
const configuration = reactive({ autoExtendAuctions: true, threeWayMatchStrict: true, allowEmergencyOrders: false, defaultCurrency: "USD", maxSnipingSeconds: 60 });
const configGroups = [
{
title: "Operational policies", icon: "fa-shield-halved", description: "Default limits and compliance checks.",
fields: [
{ key: "threeWayMatchStrict", label: "Strict 3-way matching", note: "Block payment if PO, receipt and invoice differ", type: "toggle" },
{ key: "allowEmergencyOrders", label: "Allow emergency orders", note: "Generate POs without prior sourcing round", type: "toggle" },
{ key: "defaultCurrency", label: "Default currency", note: "Base currency for comparison metrics", type: "select", options: ["USD", "MXN", "EUR"] },
],
},
{
title: "Auction controls", icon: "fa-gavel", description: "Anti-sniping and auto-extension settings.",
fields: [
{ key: "autoExtendAuctions", label: "Anti-sniping auto-extend", note: "Add time when bids arrive in closing minutes", type: "toggle" },
{ key: "maxSnipingSeconds", label: "Extension duration", note: "Seconds added per late bid", type: "select", options: ["30", "60", "120", "180"] },
],
},
];
const nativeChecks = [
"No external build step required (Vue 3 CDN/SFC runtime).",
"All persistent state stored in browser LocalStorage with automatic schema migration.",
"Zero-latency simulation for demo workflows with full audit coverage.",
];
const toggleWorkflow = (wf) => {
wf.status = wf.status === "Active" ? "Paused" : "Active";
store.procurementEvent(wf, "Workflow status updated", wf.status);
store.notice(`Workflow ${wf.name} is now ${wf.status}`);
};
const toggleRule = (r) => {
r.enabled = !r.enabled;
store.procurementEvent(r, "Rule toggled", r.enabled ? "Enabled" : "Disabled");
store.notice(`Rule ${r.name} ${r.enabled ? "enabled" : "disabled"}`);
};
const addRule = () => {
store.state.procurementRules.push({
id: window.ProcurementCommon.uid("rule"),
name: ruleDraft.name, type: ruleDraft.type, condition: ruleDraft.condition, action: ruleDraft.action,
owner: store.currentUser.value.name, enabled: true,
});
store.notice("Rule added successfully");
ruleDraft.name = ""; ruleDraft.condition = ""; ruleDraft.action = "";
};
const saveWorkflow = () => {
store.state.procurementWorkflows.push({
id: window.ProcurementCommon.uid("wf"),
name: workflowDraft.name, trigger: workflowDraft.trigger,
steps: workflowDraft.stepsText.split(",").map((s) => s.trim()).filter(Boolean),
status: "Active", runs: 0, successRate: 100,
});
workflowOpen.value = false;
store.notice("Workflow created");
workflowDraft.name = ""; workflowDraft.trigger = ""; workflowDraft.stepsText = "";
};
const configChanged = (f) => { store.notice(`${f.label} updated`); };
const ruleIcon = (type) => ({ Approval: "fa-user-check", Exclusion: "fa-ban", Auction: "fa-gavel", Matching: "fa-link", "Supplier limit": "fa-building", "Price threshold": "fa-money-bill-wave" })[type] || "fa-gear";
const ruleTypeLabel = (t) => ({ Auction: "Live bid", Matching: "Invoice check" })[t] || t;
const filteredAudit = computed(() => {
const q = auditSearch.value.toLowerCase();
return (store.state.procurementAudit || []).filter((e) => !q || [e.action, e.detail, e.entityId, e.actorId].join(" ").toLowerCase().includes(q)).slice().reverse();
});
const exportAudit = () => {
window.ProcurementCommon.download("procurement-audit-log.csv", window.ProcurementCommon.csv(filteredAudit.value), "text/csv");
store.notice("Audit log exported", "fa-download");
};
return {
store, tab, openTab, tabs, ruleDraft, auditSearch, workflowOpen, workflowDraft, roleSurfaces,
roles, rolePrinciples, configuration, configGroups, nativeChecks, toggleWorkflow, toggleRule,
addRule, saveWorkflow, configChanged, ruleIcon, ruleTypeLabel, filteredAudit, exportAudit,
};
},
};
</script>