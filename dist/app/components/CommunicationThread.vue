<template>
  <article class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
      <div class="flex min-w-0 items-center gap-3">
        <span class="grid h-8 w-8 flex-none place-items-center rounded-xl bg-brand-50 text-xs text-brand dark:bg-brand/20">
          <i class="fa-solid" :class="contextIcon"></i>
        </span>
        <div class="min-w-0">
          <p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ store.t(contextLabel) }}</p>
          <h2 class="truncate font-head text-sm font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t(title || context?.title || "Messages") }}</h2>
        </div>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <i class="fa-solid fa-users text-[9px]"></i>{{ audienceCount }} {{ store.t("participants") }}
      </span>
    </header>

    <div v-if="!context" class="p-6 text-center text-xs text-slate-400">
      {{ store.t("This communication context is unavailable.") }}
    </div>
    <template v-else>
      <div class="max-h-88 space-y-3 overflow-y-auto bg-slate-50/60 p-4 dark:bg-slate-950/25" aria-live="polite">
        <article
          v-for="item in messages"
          :key="item.id"
          class="max-w-[92%] rounded-xl border p-3 text-xs shadow-xs"
          :class="item.senderId === currentUserId ? 'ml-auto border-brand bg-brand text-white' : item.kind === 'announcement' ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'"
        >
          <div class="mb-1.5 flex items-center gap-2 text-[10px] font-bold" :class="item.senderId === currentUserId ? 'text-white/75' : 'text-slate-400'">
            <i v-if="item.kind === 'announcement'" class="fa-solid fa-bullhorn"></i>
            <span>{{ store.user(item.senderId)?.name || store.t("Team member") }}</span>
            <span class="ml-auto font-normal">{{ formatDate(item.at) }}</span>
          </div>
          <p v-if="item.subject" class="mb-1 font-bold">{{ store.t(item.subject) }}</p>
          <p class="whitespace-pre-wrap leading-relaxed">{{ store.t(item.text) }}</p>
        </article>
        <p v-if="!messages.length" class="py-5 text-center text-xs text-slate-400">
          {{ store.t("No messages yet — start the conversation.") }}
        </p>
      </div>

      <form class="space-y-2.5 border-t border-slate-100 p-4 dark:border-slate-800" @submit.prevent="sendInternal">
        <div v-if="canAnnounce" class="flex flex-wrap items-center gap-2">
          <div class="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold dark:bg-slate-800" role="group" :aria-label="store.t('Communication type')">
            <button type="button" class="rounded-md px-2.5 py-1.5 transition" :class="kind === 'message' ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500'" @click="kind = 'message'">{{ store.t("Message") }}</button>
            <button type="button" class="rounded-md px-2.5 py-1.5 transition" :class="kind === 'announcement' ? 'bg-white text-brand shadow-xs dark:bg-slate-700 dark:text-brand-200' : 'text-slate-500'" @click="kind = 'announcement'">{{ store.t("Announcement") }}</button>
          </div>
          <select v-model="selectedTemplateId" class="field ml-auto min-w-44 py-1.5 text-[11px]" :aria-label="store.t('Communication template')" @change="applyTemplate">
            <option value="">{{ store.t("Choose a template") }}</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">{{ store.t(template.name) }}</option>
          </select>
        </div>

        <input v-if="kind === 'announcement'" v-model.trim="subject" class="field py-2 text-xs" maxlength="180" :placeholder="store.t('Announcement subject')" required />
        <textarea v-model="draft" class="field min-h-22 resize-y py-2 text-xs leading-relaxed" maxlength="3000" required :placeholder="kind === 'announcement' ? store.t('Write an announcement for the authorized audience…') : store.t('Type a message…')"></textarea>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-[10px] text-slate-400">{{ draft.length }}/3000 · {{ store.t("Stored locally in this demo") }}</p>
          <div class="flex items-center gap-2">
            <button v-if="canAnnounce" type="button" class="btn-muted px-3 py-2 text-xs" :disabled="!subject || !draft.trim()" :title="store.t('Creates an email draft locally; it does not send email.')" @click="saveMailDraft">
              <i class="fa-regular fa-envelope mr-1.5"></i>{{ store.t("Save email draft") }}
            </button>
            <button class="btn-brand px-3 py-2 text-xs" :disabled="!draft.trim()">
              <i class="fa-solid mr-1.5" :class="kind === 'announcement' ? 'fa-bullhorn' : 'fa-paper-plane'"></i>{{ store.t(kind === 'announcement' ? 'Post announcement' : 'Send message') }}
            </button>
          </div>
        </div>
      </form>

      <footer v-if="latestMailing" class="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/30">
        <span class="truncate"><i class="fa-regular fa-envelope mr-1.5 text-brand"></i>{{ store.t("Latest email draft") }}: {{ store.t(latestMailing.subject) }}</span>
        <span class="flex-none font-bold text-slate-400">{{ latestMailing.recipientSupplierIds.length }} {{ store.t("suppliers") }}</span>
      </footer>
    </template>
  </article>
</template>
<script>
const { inject, computed, ref, watch } = Vue;

export default {
  props: {
    contextType: { type: String, required: true },
    contextId: { type: String, required: true },
    title: { type: String, default: "" },
    canAnnounce: { type: Boolean, default: false },
  },
  setup(props) {
    const store = inject("store");
    const draft = ref("");
    const subject = ref("");
    const kind = ref("message");
    const selectedTemplateId = ref("");
    const context = computed(() =>
      store.communicationContext(props.contextType, props.contextId),
    );
    const thread = computed(() =>
      store.conversationFor({
        contextType: props.contextType,
        contextId: props.contextId,
      }),
    );
    const messages = computed(() => thread.value?.messages || []);
    const templates = computed(() =>
      (store.state.messageTemplates || []).filter(
        (template) =>
          template.scope === "all" || template.scope === props.contextType,
      ),
    );
    const latestMailing = computed(() =>
      (store.state.mailings || []).find(
        (mailing) =>
          mailing.contextType === props.contextType &&
          mailing.contextId === props.contextId,
      ),
    );
    const audienceCount = computed(
      () => context.value?.participants?.length || 0,
    );
    const contextLabel = computed(
      () =>
        ({
          project: "Project channel",
          sourcing: "Supplier communication",
          auction: "Live round communication",
        })[props.contextType] || "Messages",
    );
    const contextIcon = computed(
      () =>
        ({ project: "fa-folder", sourcing: "fa-file-signature", auction: "fa-gavel" })[
          props.contextType
        ] || "fa-comments",
    );
    const currentUserId = computed(() => store.currentUser.value?.id);
    const formatDate = (value) => store.date(value);

    const applyTemplate = () => {
      if (!selectedTemplateId.value) return;
      const template = store.renderMessageTemplate(
        selectedTemplateId.value,
        props.contextType,
        props.contextId,
      );
      if (!template) return;
      kind.value = "announcement";
      subject.value = template.subject;
      draft.value = template.body;
    };
    const sendInternal = () => {
      const message = store.sendMessage({
        conversationId: thread.value?.id,
        contextType: props.contextType,
        contextId: props.contextId,
        kind: kind.value,
        subject: subject.value,
        text: draft.value,
      });
      if (!message) return;
      draft.value = "";
      if (kind.value === "message") subject.value = "";
    };
    const saveMailDraft = () => {
      const mailing = store.createMailDraft({
        contextType: props.contextType,
        contextId: props.contextId,
        templateId: selectedTemplateId.value,
        subject: subject.value,
        body: draft.value,
      });
      if (mailing) selectedTemplateId.value = "";
    };

    watch(
      () => `${props.contextType}:${props.contextId}`,
      () => {
        draft.value = "";
        subject.value = "";
        kind.value = "message";
        selectedTemplateId.value = "";
      },
    );

    return {
      store,
      context,
      messages,
      templates,
      latestMailing,
      audienceCount,
      contextLabel,
      contextIcon,
      currentUserId,
      formatDate,
      draft,
      subject,
      kind,
      selectedTemplateId,
      applyTemplate,
      sendInternal,
      saveMailDraft,
    };
  },
};
</script>
