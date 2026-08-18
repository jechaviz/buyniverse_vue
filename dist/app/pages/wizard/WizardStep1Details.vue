<template><div class="space-y-6"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4"><div><p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">{{ store.t("Core brief") }}</p><h2 class="font-head mt-0.5 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Project details") }}</h2><p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {{ store.t("Define the information providers need to qualify and price the work.") }}
        </p></div><div class="flex items-center gap-1.5 self-start rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/80"><button
          type="button"
          class="rounded-lg px-2.5 py-1 text-xs font-bold transition"
          :class="project.sourcingType === 'RFP' ? 'bg-brand text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'"
          @click="project.sourcingType = 'RFP'"
        ><i class="fa-solid fa-file-signature mr-1"></i>RFP
        </button><button
          type="button"
          class="rounded-lg px-2.5 py-1 text-xs font-bold transition"
          :class="project.sourcingType === 'RFI' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'"
          @click="project.sourcingType = 'RFI'"
        ><i class="fa-solid fa-lightbulb mr-1"></i>RFI
        </button></div></div><div class="rounded-2xl border border-brand/25 bg-brand-50/40 p-4.5 dark:bg-brand/10 shadow-xs"><div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><span class="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white text-xs shadow-xs"><i class="fa-solid fa-wand-magic-sparkles"></i></span><b class="text-xs font-800 text-slate-900 dark:text-white">{{ store.t("Project assistant") }}</b><span class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">— {{ store.t("Describe the outcome") }}</span></div><div class="flex items-center gap-1.5"><button
            type="button"
            class="rounded-lg border border-brand/20 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-brand hover:bg-brand hover:text-white transition dark:bg-slate-800/80"
            @click="applyTemplate('portal')"
          ><i class="fa-solid fa-laptop-code mr-1"></i>Portal SaaS
          </button><button
            type="button"
            class="rounded-lg border border-brand/20 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-brand hover:bg-brand hover:text-white transition dark:bg-slate-800/80"
            @click="applyTemplate('design')"
          ><i class="fa-solid fa-palette mr-1"></i>Brand & UI
          </button><button
            type="button"
            class="rounded-lg border border-brand/20 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-brand hover:bg-brand hover:text-white transition dark:bg-slate-800/80"
            @click="applyTemplate('audit')"
          ><i class="fa-solid fa-shield-halved mr-1"></i>Audit & Sec
          </button></div></div><div class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input
          v-model.trim="aiPrompt"
          class="field text-xs bg-white dark:bg-slate-900/90"
          :placeholder="store.t('Example: We need a responsive customer portal with billing, roles and analytics.')"
          @keydown.enter.prevent="generateFromPrompt"
        /><button
          type="button"
          class="btn-brand text-xs px-3.5 py-1.5"
          :disabled="!aiPrompt"
          @click="generateFromPrompt"
        ><i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>{{ store.t("Generate draft") }}
        </button></div></div><div class="grid gap-5 md:grid-cols-2"><label class="block text-xs font-bold md:col-span-2"><div class="flex items-center justify-between mb-1.5"><span>{{ store.t("Title") }} <span class="text-rose-500">*</span></span><span class="text-[10px] font-normal text-slate-400">{{ (project.title || '').length }} / 120</span></div><input
          v-model.trim="project.title"
          class="field"
          required
          maxlength="120"
          :placeholder="store.t('Customer portal redesign')"
        /></label><label class="block text-xs font-bold md:col-span-2"><div class="flex items-center justify-between mb-1.5"><span>{{ store.t("Description") }} <span class="text-rose-500">*</span></span><span class="text-[10px] font-normal text-slate-400">{{ (project.description || '').length }} / 4000</span></div><textarea
          v-model.trim="project.description"
          class="field min-h-36 font-sans text-xs leading-relaxed"
          required
          maxlength="4000"
          :placeholder="store.t('Scope, goals, constraints and expected outcomes')"
        ></textarea></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Category") }} <span class="text-rose-500">*</span></span><select v-model="project.category" class="field" required><option value="Development">{{ store.t("Development") }}</option><option value="Design">{{ store.t("Design") }}</option><option value="Marketing">{{ store.t("Marketing") }}</option><option value="Operations">{{ store.t("Operations") }}</option></select></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Project level") }} <span class="text-rose-500">*</span></span><select v-model="project.projectLevel" class="field" required><option value="Basic">{{ store.t("Basic") }}</option><option value="Intermediate">{{ store.t("Intermediate") }}</option><option value="Expert">{{ store.t("Expert") }}</option></select></label><template v-if="project.sourcingType === 'RFP'"><label class="block text-xs font-bold"><div class="flex items-center justify-between mb-1.5"><span>{{ store.t("Budget") }} <span class="text-rose-500">*</span></span><span class="text-[10px] font-normal text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-shield-halved mr-1"></i>{{ store.t("Escrow protected") }}
            </span></div><input
            v-model.number="project.budget"
            class="field"
            type="number"
            min="1"
            required
          /></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Currency") }} <span class="text-rose-500">*</span></span><select v-model="project.currency" class="field" required><option value="USD">USD ($)</option><option value="MXN">MXN ($)</option><option value="EUR">EUR (€)</option></select></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Duration") }} <span class="text-rose-500">*</span></span><select v-model="project.duration" class="field" required><option value="Less than 1 month">{{ store.t("Less than 1 month") }}</option><option value="1 to 3 months">{{ store.t("1 to 3 months") }}</option><option value="3 to 6 months">{{ store.t("3 to 6 months") }}</option><option value="More than 6 months">{{ store.t("More than 6 months") }}</option></select></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Delivery date") }}</span><input v-model="project.dueDate" class="field" type="date" /></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Hiring limit") }}</span><input v-model="project.hiringLimitDate" class="field" type="date" /></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Visibility") }}</span><select v-model="project.visibility" class="field"><option value="private">{{ store.t("Private") }}</option><option value="public">{{ store.t("Public") }}</option></select></label><div class="block text-xs font-bold md:col-span-2"><div class="flex items-center justify-between mb-1.5"><span>{{ store.t("Skills") }} <span class="text-[10px] font-normal text-slate-400">({{ store.t("comma separated") }})</span></span><div class="flex items-center gap-1"><button
                v-for="s in quickSkills"
                :key="s"
                type="button"
                class="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand transition dark:bg-slate-800 dark:text-slate-300"
                @click="appendSkill(s)"
              >
                + {{ s }}
              </button></div></div><input
            :value="skillsText"
            class="field"
            :placeholder="store.t('Vue, UX research, Accessibility')"
            @input="$emit('update:skillsText', $event.target.value)"
          /></div></template>
<script>
const { inject, ref, computed } = Vue;
export default {
props: {
project: Object,
skillsText: String,
},
emits: ["update:skillsText", "generated"],
setup(props, { emit }) {
const store = inject("store");
const aiPrompt = ref("");
const quickSkills = computed(() => {
const cat = props.project.category;
if (cat === "Design") return ["Figma", "Design Systems", "UX Research", "Prototyping"];
if (cat === "Marketing") return ["SEO", "Growth Strategy", "Content", "Analytics"];
if (cat === "Operations") return ["Logistics", "Procurement", "Compliance", "SLA"];
return ["Vue 3", "Node.js", "REST APIs", "UnoCSS", "TypeScript"];
});
const appendSkill = (skill) => {
const current = (props.skillsText || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!current.includes(skill)) {
current.push(skill);
emit("update:skillsText", current.join(", "));
}
};
const applyTemplate = (type) => {
if (type === "portal") {
aiPrompt.value = "Customer portal with multi-role access, automated billing, and KPI analytics.";
} else if (type === "design") {
aiPrompt.value = "Brand identity redesign with full design system, accessible tokens, and Figma specs.";
} else if (type === "audit") {
aiPrompt.value = "Comprehensive technical security and WCAG 2.2 accessibility compliance audit.";
}
generateFromPrompt();
};
const generateFromPrompt = () => {
const text = aiPrompt.value.trim();
if (!text) return;
props.project.title = text.split(/[.!?]/)[0].slice(0, 80);
props.project.description = `Objective\n${text}\n\nExpected outcome\nA clear, measurable delivery proposal with scope, timing, deliverables and commercial assumptions.`;
const lower = text.toLowerCase();
if (lower.includes("design") || lower.includes("brand")) {
props.project.category = "Design";
emit("update:skillsText", "Figma, Design Systems, UX Research, Prototyping");
} else if (lower.includes("marketing") || lower.includes("growth")) {
props.project.category = "Marketing";
emit("update:skillsText", "Campaign Strategy, Analytics, Content, SEO");
} else {
props.project.category = "Development";
emit("update:skillsText", "Vue 3, REST APIs, Architecture, Testing");
}
store.notice("Project brief populated from assistant");
emit("generated");
};
return { store, aiPrompt, quickSkills, appendSkill, applyTemplate, generateFromPrompt };
},
};
</script>