<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="open"
        class="fixed inset-0 z-90 grid place-items-center overflow-y-auto p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${dialogId}-title`"
        :aria-describedby="description ? `${dialogId}-description` : null"
        @keydown.esc="close"
      >
        <button
          class="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
          type="button"
          aria-label="Close dialog"
          @click="close"
        ></button>
        <form
          class="glass relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
          @submit.prevent="submit"
        >
          <header
            class="flex items-start gap-3 border-b border-slate-200/70 p-5 dark:border-slate-700"
          >
            <span
              class="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/15"
            >
              <i class="fa-solid" :class="icon"></i>
            </span>
            <div class="min-w-0 flex-1">
              <h2 :id="`${dialogId}-title`" class="text-lg font-800">
                {{ title }}
              </h2>
              <p
                v-if="description"
                :id="`${dialogId}-description`"
                class="mt-1 text-xs leading-5 text-slate-500"
              >
                {{ description }}
              </p>
            </div>
            <button
              type="button"
              class="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label="Close dialog"
              @click="close"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div class="p-5">
            <label
              :for="`${dialogId}-input`"
              class="mb-2 flex items-center gap-2"
            >
              <span class="text-xs font-bold">{{ label }}</span>
              <span
                v-if="required"
                class="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-600 dark:bg-rose-500/10"
                >Required</span
              >
            </label>
            <input
              :id="`${dialogId}-input`"
              ref="input"
              v-model="draft"
              class="field"
              :class="
                validationError ? 'border-rose-400 ring-2 ring-rose-400/15' : ''
              "
              type="text"
              :placeholder="placeholder"
              :maxlength="maxLength"
              :required="required"
              autocomplete="off"
              :aria-invalid="Boolean(validationError)"
              :aria-describedby="`${dialogId}-help`"
              @blur="touched = true"
              @input="$emit('input', draft)"
            />
            <div
              :id="`${dialogId}-help`"
              class="mt-2 flex min-h-5 items-start justify-between gap-4 text-[10px]"
            >
              <p
                v-if="validationError"
                class="font-semibold text-rose-500"
                role="alert"
              >
                <i class="fa-solid fa-circle-exclamation mr-1"></i
                >{{ validationError }}
              </p>
              <p v-else class="text-slate-400">{{ hint }}</p>
              <span class="ml-auto whitespace-nowrap text-slate-400"
                >{{ draft.length }}/{{ maxLength }}</span
              >
            </div>
          </div>

          <footer
            class="flex justify-end gap-2 border-t border-slate-200/70 bg-slate-50/45 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/30"
          >
            <button type="button" class="btn-muted" @click="close">
              Cancel
            </button>
            <button type="submit" class="btn-brand" :disabled="!canSubmit">
              <i class="fa-solid fa-check"></i>{{ confirmLabel }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
const { nextTick } = Vue;

export default {
  props: {
    open: Boolean,
    title: { type: String, default: "Enter a value" },
    description: { type: String, default: "" },
    label: { type: String, default: "Name" },
    placeholder: { type: String, default: "" },
    hint: { type: String, default: "" },
    initialValue: { type: String, default: "" },
    confirmLabel: { type: String, default: "Save" },
    icon: { type: String, default: "fa-pen" },
    error: { type: String, default: "" },
    required: { type: Boolean, default: true },
    maxLength: { type: Number, default: 80 },
  },
  emits: ["close", "submit", "input"],
  data() {
    return {
      draft: "",
      touched: false,
      dialogId: `text-dialog-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
  computed: {
    canSubmit() {
      return !this.required || Boolean(this.draft.trim());
    },
    validationError() {
      if (this.error) return this.error;
      if (this.touched && this.required && !this.draft.trim())
        return `${this.label} is required.`;
      return "";
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        if (!open) return;
        this.draft = this.initialValue;
        this.touched = false;
        nextTick(() => {
          this.$refs.input?.focus();
          this.$refs.input?.select();
        });
      },
    },
  },
  methods: {
    close() {
      this.$emit("close");
    },
    submit() {
      this.touched = true;
      if (!this.canSubmit) return;
      this.$emit("submit", this.draft.trim());
    },
  },
};
</script>
