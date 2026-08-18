<template><SideDrawer
    :open="open"
    title="Filters"
    :subtitle="subtitle"
    icon="fa-filter"
    @close="$emit('close')"
  ><div
      v-if="dirty && viewName"
      class="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
    ><i class="fa-solid fa-circle-info mt-0.5"></i><p class="text-xs leading-5">
        These filters differ from <b>{{ viewName }}</b
        >. Update it or save a new view from the view menu.
      </p></div><div class="space-y-3"><CollapsibleSection
        v-model="rulesOpen"
        title="Filter rules"
        subtitle="Combine conditions across any available column."
        icon="fa-code-branch"
        :count="activeRuleCount"
      ><div class="flex justify-end"><button
            type="button"
            class="btn-muted h-8 px-2.5 text-xs"
            @click="addRule"
          ><i class="fa-solid fa-plus"></i>Add
          </button></div><div
          class="mt-3 flex items-center justify-between rounded-xl bg-slate-100/80 p-1.5 dark:bg-slate-800/70"
        ><span
            class="pl-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"
            >Match</span
          ><div class="flex gap-1"><button
              v-for="option in matchOptions"
              :key="option.value"
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold"
              :class="
                mode === option.value
                  ? 'bg-white text-brand shadow-sm dark:bg-slate-700'
                  : 'text-slate-500'
              "
              @click="$emit('update:mode', option.value)"
            >
              {{ option.label }}
            </button></div></div><div class="mt-3 space-y-2"><article
            v-for="(rule, index) in rules"
            :key="rule.id"
            class="rounded-xl border border-slate-200/80 bg-white/45 p-3 dark:border-slate-700 dark:bg-slate-800/35"
          ><div class="grid grid-cols-[minmax(0,1fr)_9rem_2rem] gap-2"><select
                class="field min-w-0 py-1.5 text-xs"
                :value="rule.key"
                aria-label="Filter column"
                @change="updateRule(index, 'key', $event.target.value)"
              ><option
                  v-for="column in columns"
                  :key="column.key"
                  :value="column.key"
                >
                  {{ column.label }}
                </option></select><select
                class="field min-w-0 py-1.5 text-xs"
                :value="rule.operator"
                aria-label="Filter operator"
                @change="updateRule(index, 'operator', $event.target.value)"
              ><option
                  v-for="operator in operators"
                  :key="operator.value"
                  :value="operator.value"
                >
                  {{ operator.label }}
                </option></select><button
                type="button"
                class="grid h-9 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                title="Remove rule"
                aria-label="Remove rule"
                @click="removeRule(index)"
              ><i class="fa-solid fa-trash-can text-xs"></i></button></div><input
              class="field mt-2 py-1.5 text-xs"
              :value="rule.value"
              :placeholder="`Value for ${columnLabel(rule.key)}`"
              aria-label="Filter value"
              @input="updateRule(index, 'value', $event.target.value)"
            /></article><button
            v-if="!rules.length"
            type="button"
            class="w-full rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-xs text-slate-500 hover:border-brand hover:text-brand dark:border-slate-600"
            @click="addRule"
          ><i class="fa-solid fa-plus mb-2 block text-base"></i>
            Add the first compound rule
          </button></div></CollapsibleSection><CollapsibleSection
        v-model="columnsOpen"
        title="Column filters"
        subtitle="Narrow a specific column without adding another rule."
        icon="fa-table-columns"
        :count="activeColumnFilterCount"
      ><div class="grid gap-3 sm:grid-cols-2"><label
            v-for="column in columns"
            :key="column.key"
            class="block min-w-0"
          ><span
              class="mb-1.5 block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500"
              >{{ column.label }}</span
            ><div class="relative"><input
                :id="inputId(column.key)"
                class="field py-1.5 pr-8 text-xs"
                :value="filters[column.key] || ''"
                :placeholder="`Filter ${column.label}`"
                @input="updateColumn(column.key, $event.target.value)"
              /><button
                v-if="filters[column.key]"
                type="button"
                class="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-700"
                :aria-label="`Clear ${column.label} filter`"
                @click="updateColumn(column.key, '')"
              ><i class="fa-solid fa-xmark text-[10px]"></i></button></div></label></div></CollapsibleSection></div><template #footer><button
        type="button"
        class="btn-muted"
        :disabled="!activeCount"
        @click="$emit('clear')"
      ><i class="fa-solid fa-eraser"></i>Clear all
      </button><div class="flex items-center gap-3"><span class="text-[10px] text-slate-400">Changes apply live</span><button type="button" class="btn-brand" @click="$emit('close')">
          Done
        </button></div></template>
<script>
const load = (path) =>
Vue.defineAsyncComponent(() =>
window["vue3-sfc-loader"].loadModule(path, window.sfcOptions),
);
export default {
components: {
SideDrawer: load("./app/components/SideDrawer.vue?v=1"),
CollapsibleSection: load("./app/components/CollapsibleSection.vue?v=1"),
},
props: {
open: Boolean,
columns: { type: Array, default: () => [] },
filters: { type: Object, default: () => ({}) },
rules: { type: Array, default: () => [] },
mode: { type: String, default: "all" },
activeCount: { type: Number, default: 0 },
focusKey: { type: String, default: "" },
dirty: Boolean,
viewName: { type: String, default: "" },
operators: {
type: Array,
default: () => [
{ value: "contains", label: "contains" },
{ value: "equals", label: "equals" },
{ value: "not_equals", label: "not equal" },
{ value: "gt", label: "greater than" },
{ value: "lt", label: "less than" },
],
},
},
emits: ["close", "clear", "update:filters", "update:rules", "update:mode"],
data() {
return {
instanceId: Math.random().toString(36).slice(2, 9),
rulesOpen: false,
columnsOpen: false,
matchOptions: [
{ value: "all", label: "All rules" },
{ value: "any", label: "Any rule" },
],
};
},
computed: {
subtitle() {
if (!this.activeCount) return "No filters applied";
return `${this.activeCount} active ${this.activeCount === 1 ? "filter" : "filters"}`;
},
activeRuleCount() {
return this.rules.filter((rule) => String(rule.value ?? "").trim())
.length;
},
activeColumnFilterCount() {
return Object.values(this.filters).filter((value) =>
String(value ?? "").trim(),
).length;
},
},
watch: {
open(open) {
if (!open) return;
this.rulesOpen = false;
this.columnsOpen = Boolean(this.focusKey);
this.focusRequestedColumn();
},
focusKey() {
if (!this.open || !this.focusKey) return;
this.columnsOpen = true;
this.focusRequestedColumn();
},
},
methods: {
inputId(key) {
const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, "-");
return `column-filter-${this.instanceId}-${safeKey}`;
},
focusRequestedColumn() {
if (!this.focusKey) return;
this.$nextTick(() =>
document.getElementById(this.inputId(this.focusKey))?.focus(),
);
},
columnLabel(key) {
return (
this.columns.find((column) => column.key === key)?.label || "column"
);
},
updateColumn(key, value) {
this.$emit("update:filters", { ...this.filters, [key]: value });
},
updateRule(index, field, value) {
const next = this.rules.map((rule, ruleIndex) =>
ruleIndex === index ? { ...rule, [field]: value } : { ...rule },
);
this.$emit("update:rules", next);
},
addRule() {
if (!this.columns.length || this.rules.length >= 12) return;
this.$emit("update:rules", [
...this.rules.map((rule) => ({ ...rule })),
{
id: `rule-${Date.now()}-${this.rules.length}`,
key: this.columns[0].key,
operator: "contains",
value: "",
},
]);
},
removeRule(index) {
this.$emit(
"update:rules",
this.rules.filter((_, ruleIndex) => ruleIndex !== index),
);
},
},
};
</script>