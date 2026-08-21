<template>
  <div ref="root" class="relative min-w-28" @keydown.stop>
    <input v-if="['text','number','email','date'].includes(type)" ref="input" v-model="draft" class="field py-1.5 text-sm" :class="error ? 'border-rose-400 ring-2 ring-rose-400/15' : ''" :type="type==='text'?'text':type" :maxlength="type === 'text' || type === 'email' ? 240 : null" :aria-invalid="Boolean(error)" @keydown.enter.prevent="save" @keydown.esc.prevent="cancel" @blur="save"/>
    <select v-else-if="type==='select'||type==='user'" ref="input" v-model="draft" class="field py-1.5 text-sm" @change="save" @keydown.esc.prevent="cancel" @blur="save"><option v-if="type==='user'" value="">Unassigned</option><option v-for="option in resolvedOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select>
    <div v-else-if="type==='slider'" class="flex min-w-36 items-center gap-2"><input v-model.number="draft" class="w-full accent-current" type="range" min="0" max="100" @change="save" @keydown.esc.prevent="cancel"/><span class="w-8 text-right text-xs font-bold">{{ draft }}%</span></div>
    <div v-else-if="type==='rating'" class="flex gap-0.5"><button v-for="star in 5" :key="star" class="text-lg" :class="star<=Number(draft)?'text-amber-400':'text-slate-300'" :aria-label="`Rate ${star} stars`" @click="draft=star;save()"><i class="fa-solid fa-star"></i></button></div>
    <div v-else-if="type==='tags'" class="relative"><input ref="input" v-model="draft" class="field py-1.5 text-sm" placeholder="tag, tag" maxlength="240" @keydown.enter.prevent="saveTags" @keydown.esc.prevent="cancel" @blur="saveTags"/><p class="mt-1 text-[10px] text-slate-400">Separate with commas</p></div>
    <div v-else-if="type==='multi-user'" class="glass absolute left-0 top-0 z-30 w-56 rounded-xl p-2 shadow-xl"><p class="px-2 py-1 text-xs font-bold text-slate-400">Assign people</p><label v-for="person in users" :key="person.id" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"><input v-model="draftUsers" type="checkbox" :value="person.id"/><span class="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand">{{ person.avatar||person.name?.slice(0,2) }}</span><span class="truncate">{{ person.name }}</span></label><div class="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-700"><button class="text-xs text-slate-500" @click="cancel">Cancel</button><button class="text-xs font-semibold text-brand" @click="saveUsers">Save</button></div></div>
    <p v-if="error" class="mt-1 text-[10px] font-semibold text-rose-500" role="alert">{{ error }}</p>
  </div>
</template>
<script>
export default {
  props: { value: { default: null }, type: { type: String, default: 'text' }, options: { type: Array, default: () => [] }, users: { type: Array, default: () => [] } },
  emits: ['save', 'cancel'],
  data() { return { draft: this.initialValue(), draftUsers: Array.isArray(this.value) ? [...this.value] : [], error: '' }; },
  computed: {
    resolvedOptions() {
      const source = this.type === 'user' ? this.users.map(user => ({ value: user.id, label: user.name })) : this.options;
      return source.map(option => option && typeof option === 'object' ? { value: option.value, label: option.label ?? String(option.value) } : { value: option, label: String(option) });
    },
  },
  mounted() { this.$nextTick(() => { this.$refs.input?.focus?.(); this.$refs.input?.select?.(); }); document.addEventListener('mousedown', this.onOutside); },
  beforeUnmount() { document.removeEventListener('mousedown', this.onOutside); },
  methods: {
    clean(value, limit = 240) { return String(window.WebCommon?.sanitizeText?.(value, limit) ?? '').trim(); },
    initialValue() { if (this.type === 'tags') return Array.isArray(this.value) ? this.value.join(', ') : ''; if (this.type === 'date' && this.value) return String(this.value).slice(0, 10); return this.value ?? ''; },
    onOutside(event) { if (this.type === 'multi-user' && this.$refs.root && !this.$refs.root.contains(event.target)) this.saveUsers(); },
    invalid(message) { this.error = message; this.$nextTick(() => this.$refs.input?.focus?.()); },
    save() {
      this.error = '';
      let value = this.draft;
      if (this.type === 'number' || this.type === 'slider' || this.type === 'rating') {
        value = Number(value);
        if (!Number.isFinite(value)) return this.invalid('Enter a valid number.');
        if (this.type === 'slider') value = Math.max(0, Math.min(100, value));
        if (this.type === 'rating') value = Math.max(0, Math.min(5, value));
      } else if (this.type === 'email') {
        value = this.clean(value, 240);
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return this.invalid('Enter a valid email address.');
      } else if (this.type === 'date') {
        value = String(value || '').slice(0, 10);
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return this.invalid('Enter a valid date.');
      } else if (this.type === 'select' || this.type === 'user') {
        if (!this.resolvedOptions.some(option => String(option.value) === String(value)) && value !== '') return this.invalid('Choose an available option.');
      } else value = this.clean(value, 240);
      this.$emit('save', value);
    },
    saveTags() { this.error = ''; this.$emit('save', String(this.draft).split(',').map(tag => this.clean(tag, 80)).filter(Boolean).slice(0, 30)); },
    saveUsers() { this.error = ''; const allowed = new Set(this.users.map(user => user.id)); this.$emit('save', [...new Set(this.draftUsers.filter(id => allowed.has(id)))].slice(0, 30)); },
    cancel() { this.error = ''; this.$emit('cancel'); },
  },
};
</script>
