<template>
  <div class="grid min-h-[60vh] gap-4 xl:grid-cols-[minmax(16rem,.72fr)_minmax(0,1.28fr)]">
    <aside class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
      <header class="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-head text-sm font-800 tracking-tight">{{ store.t("Messages") }}</h2>
            <p class="mt-0.5 text-[11px] text-slate-400">{{ store.t("Project conversations") }}</p>
          </div>
          <span class="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand dark:bg-brand/20">{{ conversations.length }}</span>
        </div>
      </header>
      <div class="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        <button
          v-for="conv in conversations"
          :key="conv.id"
          class="w-full border-l-2 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
          :class="selected === conv.id ? 'border-brand bg-brand-50/70 dark:bg-brand/10' : 'border-transparent'"
          @click="$emit('select-conversation', conv)"
        >
          <div class="flex items-center justify-between gap-2">
            <b class="truncate text-xs text-slate-800 dark:text-slate-100">{{ conversationTitle(conv) }}</b>
            <span class="flex-none rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800">{{ store.t(contextLabel(conv)) }}</span>
          </div>
          <p class="mt-1 truncate text-[11px] text-slate-400">{{ conv.messages.at(-1)?.text ? store.t(conv.messages.at(-1).text) : store.t("No messages yet — start the conversation.") }}</p>
          <p class="mt-1 text-[10px] text-slate-400">{{ conv.messages.at(-1)?.at ? formatDate(conv.messages.at(-1).at) : "—" }}</p>
        </button>
        <p v-if="!conversations.length" class="p-6 text-center text-xs text-slate-400">{{ store.t("No conversations are available for this identity.") }}</p>
      </div>
    </aside>

    <CommunicationThread
      v-if="activeConversation"
      :context-type="activeConversation.contextType"
      :context-id="activeConversation.contextId"
      :title="conversationTitle(activeConversation)"
      :can-announce="canAnnounce(activeConversation)"
    />
    <section v-else class="panel grid min-h-[60vh] place-items-center rounded-2xl p-8 text-center text-slate-400">
      <div><i class="fa-regular fa-comments text-3xl"></i><p class="mt-3 text-xs">{{ store.t("Select a conversation to start chatting.") }}</p></div>
    </section>
  </div>
</template>
<script>
const { inject } = Vue;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const CommunicationThread = load("./app/components/CommunicationThread.vue?v=1");

export default {
  components: { CommunicationThread },
  props: {
    conversations: { type: Array, default: () => [] },
    activeConversation: Object,
    selected: String,
    conversationTitle: Function,
    contextLabel: Function,
    formatDate: Function,
  },
  emits: ["select-conversation"],
  setup() {
    const store = inject("store");
    const canAnnounce = (conversation) => {
      const context = store.communicationContext(
        conversation?.contextType,
        conversation?.contextId,
      );
      return Boolean(store.isAdmin.value || context?.ownerId === store.currentUser.value.id);
    };
    return { store, canAnnounce };
  },
};
</script>
