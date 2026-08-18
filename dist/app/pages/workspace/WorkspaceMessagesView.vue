<template><div class="grid min-h-[60vh] gap-4 lg:grid-cols-[.8fr_1.2fr]"><div class="panel overflow-hidden divide-y divide-slate-100 dark:divide-slate-700"><div class="border-b border-slate-100 px-4 py-4 dark:border-slate-700"><h2 class="font-bold">Messages</h2><p class="mt-1 text-xs text-slate-500">Project conversations</p></div><button
        v-for="conv in conversations"
        :key="conv.id"
        class="w-full border-l-2 p-4 text-left transition hover:bg-brand-50"
        :class="selected === conv.id ? 'border-brand bg-brand-50 dark:bg-slate-700/40' : 'border-transparent'"
        @click="$emit('select-conversation', conv)"
      ><p class="font-bold">{{ otherParticipant(conv)?.name || "Project team" }}</p><p class="mt-1 truncate text-sm text-brand">{{ jobName(conv.jobId) }}</p><p class="mt-1 truncate text-xs text-slate-500">
          {{ conv.messages.at(-1)?.text || "No messages yet — start the conversation." }}
        </p></button></div><div class="panel flex min-h-[60vh] flex-col overflow-hidden"><template v-if="activeConversation"><div class="border-b border-slate-100 p-5 dark:border-slate-700"><div class="flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand dark:bg-brand/20">
              {{ otherParticipant(activeConversation)?.avatar || "PT" }}
            </span><div><h2 class="font-bold">{{ otherParticipant(activeConversation)?.name || "Project team" }}</h2><RouterLink :to="`/job/${activeConversation.jobId}`" class="mt-0.5 block text-xs font-semibold text-brand hover:underline">
                {{ jobName(activeConversation.jobId) }}
              </RouterLink></div></div></div><div class="flex-1 space-y-3 overflow-auto bg-slate-50 p-5 dark:bg-slate-800/40"><div
            v-for="msg in activeConversation.messages"
            :key="msg.id"
            class="max-w-[80%] rounded-xl p-3 shadow-sm"
            :class="msg.senderId === currentUserId ? 'ml-auto bg-brand text-white' : 'bg-white dark:bg-slate-700'"
          ><p>{{ msg.text }}</p><small class="mt-1 block opacity-70">{{ formatDate(msg.at) }}</small></div></div><form class="flex gap-3 border-t border-slate-100 p-4 dark:border-slate-700" @submit.prevent="$emit('send-message')"><input
            :value="message"
            class="field"
            placeholder="Type a message…"
            @input="$emit('update:message', $event.target.value)"
          /><button class="btn-brand">Send</button></form></template>
<script>
export default {
props: {
conversations: Array,
activeConversation: Object,
selected: String,
currentUserId: String,
message: String,
otherParticipant: Function,
jobName: Function,
formatDate: Function,
},
emits: ["select-conversation", "update:message", "send-message"],
};
</script>