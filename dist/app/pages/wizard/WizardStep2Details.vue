<template><div class="space-y-6"><div><p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">Core brief</p><h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">Project details</h2><p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Define the information providers need to qualify and price the work.</p></div><div class="grid gap-4 md:grid-cols-2"><label class="block text-sm font-semibold md:col-span-2">
        Title
        <input v-model.trim="project.title" class="field mt-2" required placeholder="Customer portal redesign" /></label><label class="block text-sm font-semibold md:col-span-2">
        Description
        <textarea v-model.trim="project.description" class="field mt-2 min-h-36" required placeholder="Scope, goals, constraints and expected outcomes"></textarea></label><template v-if="project.sourcingType === 'RFP'"><label class="block text-sm font-semibold">
          Category
          <select v-model="project.category" class="field mt-2" required><option>Development</option><option>Design</option><option>Marketing</option><option>Operations</option></select></label><label class="block text-sm font-semibold">
          Budget
          <input v-model.number="project.budget" class="field mt-2" type="number" min="1" required /></label><label class="block text-sm font-semibold">
          Project level
          <select v-model="project.projectLevel" class="field mt-2" required><option>Basic</option><option>Intermediate</option><option>Expert</option></select></label><label class="block text-sm font-semibold">
          Duration
          <select v-model="project.duration" class="field mt-2" required><option>Less than 1 month</option><option>1 to 3 months</option><option>3 to 6 months</option><option>More than 6 months</option></select></label><label class="block text-sm font-semibold">
          Hiring limit
          <input v-model="project.hiringLimitDate" class="field mt-2" type="date" /></label><label class="block text-sm font-semibold">
          Delivery date
          <input v-model="project.dueDate" class="field mt-2" type="date" /></label><label class="block text-sm font-semibold">
          Visibility
          <select v-model="project.visibility" class="field mt-2"><option value="private">Private</option><option value="public">Public</option></select></label><label class="block text-sm font-semibold">
          Currency
          <select v-model="project.currency" class="field mt-2" required><option>USD</option><option>MXN</option></select></label><label class="block text-sm font-semibold md:col-span-2">
          Skills <span class="font-normal text-slate-400">comma separated</span><input :value="skillsText" class="field mt-2" placeholder="Vue, UX research, Accessibility" @input="$emit('update:skillsText', $event.target.value)" /></label></template>
<script>
export default {
props: {
project: Object,
skillsText: String,
},
emits: ["update:skillsText"],
};
</script>