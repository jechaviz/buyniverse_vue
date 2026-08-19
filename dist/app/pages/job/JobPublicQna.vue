<template>
  <article class="panel p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-sky-50 text-sky-600 text-xs dark:bg-sky-500/20">
          <i class="fa-solid fa-circle-question"></i>
        </span>
        <h2 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Questions & answers") }}</h2>
      </div>
      <span class="text-xs text-slate-400 font-semibold">{{ questions.length }} {{ store.t("entries") }}</span>
    </div>

    <div v-if="questions.length" class="space-y-3.5">
      <div v-for="question in questions" :key="question.id" class="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ question.text }}</p>
        <p class="mt-1 text-[10px] text-slate-400">{{ store.user(question.userId)?.name }} · {{ store.date(question.at) }}</p>
        <div v-if="question.answer" class="mt-3 rounded-xl bg-brand-50/80 p-3 text-xs text-slate-700 dark:bg-brand/15 dark:text-slate-200">
          <b class="text-brand">{{ store.t("Client response:") }}</b> {{ question.answer }}
        </div>
        <form v-else-if="isOwner" class="mt-3 flex gap-2" @submit.prevent="answer(question)">
          <input v-model="answerDrafts[question.id]" class="field text-xs py-1.5" required :placeholder="store.t('Write an answer')" />
          <button class="btn-brand text-xs py-1.5 px-3">{{ store.t("Answer") }}</button>
        </form>
      </div>
    </div>
    <p v-else class="py-4 text-center text-xs text-slate-400">{{ store.t("No public questions yet.") }}</p>

    <form v-if="isFreelancer && job.status === 'OPEN'" class="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800" @submit.prevent="ask">
      <input v-model="questionText" class="field text-xs py-2" required :placeholder="store.t('Ask the client a public question')" />
      <button class="btn-muted text-xs py-2 px-4 whitespace-nowrap">{{ store.t("Ask") }}</button>
    </form>
  </article>
</template>
<script>
const { inject, ref, reactive } = Vue;

export default {
  props: {
    job: Object,
    questions: Array,
    isOwner: Boolean,
    isFreelancer: Boolean,
  },
  setup(props) {
    const store = inject("store");
    const questionText = ref("");
    const answerDrafts = reactive({});

    const ask = () => {
      const text = window.WebCommon.sanitizeText(questionText.value, 1000).trim();
      if (!props.job || !props.isFreelancer || props.job.status !== "OPEN" || !text) return;
      props.job.questions.push({
        id: window.ProcurementCommon.uid("q"),
        userId: store.currentUser.value.id,
        text,
        at: new Date().toISOString(),
        answer: "",
      });
      store.addNotification({
        userId: props.job.clientId,
        title: "New job question",
        text,
        link: `/client/job/${props.job.id}`,
        icon: "fa-circle-question",
      });
      questionText.value = "";
      store.notice("Question published");
    };

    const answer = (question) => {
      const text = window.WebCommon.sanitizeText(answerDrafts[question.id], 2000).trim();
      if (!props.isOwner || question.answer || !text) return;
      question.answer = text;
      question.answeredAt = new Date().toISOString();
      store.addNotification({
        userId: question.userId,
        title: "Your question was answered",
        text,
        link: `/job/${props.job.id}`,
        icon: "fa-comment-dots",
      });
      answerDrafts[question.id] = "";
      store.notice("Answer published");
    };

    return { store, questionText, answerDrafts, ask, answer };
  },
};
</script>
