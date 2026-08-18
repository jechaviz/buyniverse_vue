<template><div class="mx-auto max-w-2xl"><div><p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">Project assistant</p><h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">Describe the outcome</h2><p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Start with a plain-language request. The demo can turn it into an editable brief.</p></div><label class="mt-6 block text-sm font-semibold">
      What are you trying to achieve?
      <textarea
        :value="prompt"
        class="field mt-2 min-h-36"
        placeholder="Example: We need a responsive customer portal with billing, roles and analytics."
        @input="$emit('update:prompt', $event.target.value)"
      ></textarea></label><div class="mt-4 flex flex-wrap justify-end gap-3"><button class="btn-muted" @click="$emit('skip')">Skip assistant</button><button class="btn-brand" :disabled="!prompt" @click="$emit('generate')"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Generate draft
      </button></div></div></template>
<script>
export default {
props: {
prompt: String,
},
emits: ["update:prompt", "skip", "generate"],
};
</script>