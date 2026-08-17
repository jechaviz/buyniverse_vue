<template><div>
  <section v-if="job" class="space-y-6">
    <div v-if="job.status==='PENDING_APPROVAL'" class="panel border-amber-300/80 bg-amber-50/80 p-4 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/80 rounded-2xl flex items-center gap-2.5 shadow-xs"><i class="fa-solid fa-clock text-amber-600 dark:text-amber-400"></i>This job is waiting for approval.</div>
    <div v-if="job.status==='REJECTED'" class="panel border-rose-300/80 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/80 rounded-2xl shadow-xs"><b>Rejected.</b> {{ job.rejectionReason || 'Review the brief and submit it again.' }}</div>
    <header class="flex flex-wrap items-start justify-between gap-5">
      <div class="max-w-3xl">
        <span class="rounded-lg bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-brand/20">
          {{ clientView ? 'Manage job' : job.category }}
        </span>
        <h1 class="font-head mt-2 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ job.title }}</h1>
        <p class="mt-2 text-xs text-slate-400 flex items-center gap-2">
          <span><i class="fa-regular fa-calendar mr-1"></i>Posted {{ store.date(job.postedAt) }}</span>
          <span>·</span>
          <span><i class="fa-solid fa-location-dot mr-1"></i>{{ job.location || 'Remote' }}</span>
        </p>
      </div>
      <div class="flex gap-2.5">
        <button v-if="isFreelancer" class="btn-muted text-xs py-2 px-3.5" @click="store.toggleSavedJob(job.id)">
          <i class="mr-1.5" :class="saved ? 'fa-solid fa-bookmark text-brand' : 'fa-regular fa-bookmark'"></i>{{ saved ? 'Saved' : 'Save job' }}
        </button>
        <RouterLink v-if="isOwner" class="btn-brand text-xs py-2 px-3.5" :to="`/post-job/${job.id}`">
          <i class="fa-solid fa-pen mr-1.5"></i>Edit job
        </RouterLink>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <main class="space-y-6">
        <article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/80 shadow-card">
          <h2 class="font-head font-800 text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">Project brief</h2>
          <p class="mt-4 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">{{ job.description }}</p>
          <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            <span v-for="skill in job.skills" :key="skill" class="badge rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ skill }}</span>
          </div>
        </article>

        <article v-if="clientView || isOwner" class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/80 shadow-card">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Proposals</h2>
              <p class="mt-0.5 text-xs text-slate-400">Review qualifications and commercial terms.</p>
            </div>
            <span class="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand dark:bg-brand/20">{{ job.proposals.length }}</span>
          </div>
          <div v-if="job.proposals.length" class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="proposal in job.proposals" :key="proposal.id" class="flex flex-wrap items-center justify-between gap-4 py-4">
              <div class="flex items-center gap-3.5">
                <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-bold text-xs text-brand dark:bg-brand/20">{{ store.user(proposal.freelancerId)?.avatar }}</span>
                <div>
                  <RouterLink class="font-head font-bold text-xs text-slate-900 hover:text-brand dark:text-white transition" :to="`/profile/${proposal.freelancerId}`">
                    {{ store.user(proposal.freelancerId)?.name }}
                  </RouterLink>
                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ proposal.coverLetter || 'Proposal submitted for review.' }}</p>
                </div>
              </div>
              <div class="text-right">
                <b class="font-mono text-xs font-bold text-slate-900 dark:text-white">{{ store.money(proposal.bid,job.currency) }}</b>
                <span class="mt-0.5 block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{{ proposal.status }}</span>
              </div>
            </div>
          </div>
          <p v-else class="mt-4 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400 dark:bg-slate-800/50">No proposals yet.</p>
        </article>

        <article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/80 shadow-card">
          <h2 class="font-head font-800 text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">Questions & answers</h2>
          <div v-if="job.questions.length" class="mt-4 space-y-3.5">
            <div v-for="question in job.questions" :key="question.id" class="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ question.text }}</p>
              <p class="mt-1 text-[10px] text-slate-400">{{ store.user(question.userId)?.name }} · {{ store.date(question.at) }}</p>
              <div v-if="question.answer" class="mt-3 rounded-xl bg-brand-50/80 p-3 text-xs text-slate-700 dark:bg-brand/15 dark:text-slate-200">
                <b class="text-brand">Client response:</b> {{ question.answer }}
              </div>
              <form v-else-if="isOwner" class="mt-3 flex gap-2" @submit.prevent="answer(question)">
                <input v-model="answerDrafts[question.id]" class="field text-xs py-1.5" required placeholder="Write an answer">
                <button class="btn-brand text-xs py-1.5 px-3">Answer</button>
              </form>
            </div>
          </div>
          <p v-else class="mt-4 text-xs text-slate-400">No public questions yet.</p>
          <form v-if="isFreelancer" class="mt-5 flex gap-2 border-t border-slate-100 pt-5 dark:border-slate-800" @submit.prevent="ask">
            <input v-model="questionText" class="field text-xs py-2" required placeholder="Ask the client a public question">
            <button class="btn-muted text-xs py-2 px-4 whitespace-nowrap">Ask</button>
          </form>
        </article>

        <article v-if="isFreelancer && job.status==='OPEN'" class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/80 shadow-card">
          <h2 class="font-head font-800 text-base tracking-tight text-slate-900 dark:text-white">Submit a proposal</h2>
          <div v-if="myProposal" class="mt-4 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80">
            <i class="fa-solid fa-circle-check mr-2 text-emerald-600"></i>Your proposal is {{ myProposal.status.toLowerCase() }}.
          </div>
          <form v-else class="mt-5 space-y-4" @submit.prevent="beginProposal">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Your bid
                <input v-model.number="proposal.bid" type="number" min="1" class="field mt-1.5 text-xs font-mono font-bold" required>
              </label>
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Delivery time
                <input v-model="proposal.completionTime" class="field mt-1.5 text-xs" required placeholder="e.g. 4 weeks">
              </label>
            </div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cover letter
              <textarea v-model="proposal.coverLetter" class="field mt-1.5 min-h-32 text-xs leading-relaxed" required placeholder="Explain your approach and relevant experience."></textarea>
            </label>
            <button class="btn-brand text-xs py-2.5 px-4"><i class="fa-solid fa-paper-plane mr-2"></i>Submit proposal</button>
          </form>
        </article>
      </main>

      <aside class="space-y-4">
        <article class="panel p-5 rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/80 shadow-card">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget</p>
          <p class="font-head font-mono mt-1 text-2xl font-800 text-slate-900 dark:text-white">{{ store.money(job.budget,job.currency) }}</p>
          <dl class="mt-5 space-y-3 text-xs border-t border-slate-100 pt-4 dark:border-slate-800">
            <div class="flex justify-between items-center"><dt class="text-slate-400">Project type</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ job.budgetType }}</dd></div>
            <div class="flex justify-between items-center"><dt class="text-slate-400">Experience</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ job.experienceLevel }}</dd></div>
            <div class="flex justify-between items-center"><dt class="text-slate-400">NDA</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ job.requiresNDA ? 'Required' : 'Not required' }}</dd></div>
            <div class="flex justify-between items-center"><dt class="text-slate-400">Target date</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ store.date(job.dueDate) }}</dd></div>
          </dl>
        </article>
        <article class="panel p-5 rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/80 shadow-card">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">About the client</p>
          <div class="mt-3.5 flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-bold text-xs text-brand dark:bg-brand/20">{{ client?.avatar }}</span>
            <div>
              <b class="font-head text-xs font-bold text-slate-900 dark:text-white">{{ client?.companyName || client?.name }}</b>
              <p class="text-[11px] text-slate-400">{{ client?.location || 'Remote' }}</p>
            </div>
          </div>
          <p class="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-500"></i>Identity verified · 4.9 rating</p>
        </article>
      </aside>
    </div>

    <div v-if="showNda" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" @click.self="showNda=false">
      <div class="glass max-w-lg p-6 rounded-3xl shadow-elevated border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95">
        <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">Confidentiality</p>
        <h2 class="font-head mt-1 text-xl font-800 tracking-tight text-slate-900 dark:text-white">Non-disclosure agreement</h2>
        <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">By continuing, you agree to use the project information only to prepare and deliver this proposal, and not to disclose it to third parties.</p>
        <label class="mt-4 flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
          <input v-model="ndaAccepted" type="checkbox" class="rounded text-brand focus:ring-brand">
          I have read and accept the NDA.
        </label>
        <div class="mt-6 flex justify-end gap-2.5">
          <button class="btn-muted text-xs py-2 px-3.5" @click="showNda=false">Cancel</button>
          <button class="btn-brand text-xs py-2 px-4" :disabled="!ndaAccepted" @click="submitProposal">Accept & submit</button>
        </div>
      </div>
    </div>
  </section>
  <section v-else class="panel p-12 text-center rounded-2xl border border-slate-200/80 bg-white/90 shadow-card">
    <h1 class="font-head text-xl font-800">Job not found</h1>
    <RouterLink class="btn-brand mt-4 text-xs py-2 px-4" to="/">Browse jobs</RouterLink>
  </section>
</div></template>
<script>
const {inject,computed,ref,reactive}=Vue; const {useRoute}=VueRouter;
export default {setup(){
  const store=inject('store'),route=useRoute(),job=computed(()=>store.job(route.params.jobId));
  if(job.value){job.value.description ||= 'A focused project with clear milestones, collaborative reviews and production-ready delivery.';job.value.questions ||= [];job.value.budgetType ||= 'Fixed price';job.value.experienceLevel ||= 'Intermediate';job.value.postedAt ||= '2026-07-01T12:00:00Z'}
  const client=computed(()=>store.user(job.value?.clientId)),clientView=computed(()=>Boolean(route.meta.clientView));
  const isOwner=computed(()=>job.value?.clientId===store.currentUser.value.id),isFreelancer=computed(()=>store.currentUser.value.type==='Freelancer');
  const saved=computed(()=>store.state.savedJobIds?.includes(job.value?.id)),myProposal=computed(()=>job.value?.proposals.find(item=>item.freelancerId===store.currentUser.value.id));
  const proposal=reactive({bid:job.value?.budget||0,completionTime:'',coverLetter:''}),questionText=ref(''),answerDrafts=reactive({}),showNda=ref(false),ndaAccepted=ref(false);
  function ask(){
    const text=window.WebCommon.sanitizeText(questionText.value,1000).trim();
    if(!job.value||!isFreelancer.value||job.value.status!=='OPEN'||!text)return store.notice('Question could not be published','fa-shield-halved');
    job.value.questions.push({id:window.ProcurementCommon.uid('q'),userId:store.currentUser.value.id,text,at:new Date().toISOString(),answer:''});
    store.addNotification({userId:job.value.clientId,title:'New job question',text,link:`/client/job/${job.value.id}`,icon:'fa-circle-question'});questionText.value='';store.notice('Question published');
  }
  function answer(question){
    const text=window.WebCommon.sanitizeText(answerDrafts[question.id],2000).trim();
    if(!isOwner.value||!job.value?.questions.includes(question)||question.answer||!text)return store.notice('Answer could not be published','fa-shield-halved');
    question.answer=text;question.answeredAt=new Date().toISOString();store.addNotification({userId:question.userId,title:'Your question was answered',text,link:`/job/${job.value.id}`,icon:'fa-comment-dots'});answerDrafts[question.id]='';store.notice('Answer published');
  }
  function validProposal(){
    const bid=Number(proposal.bid),completionTime=window.WebCommon.sanitizeText(proposal.completionTime,80).trim(),coverLetter=window.WebCommon.sanitizeText(proposal.coverLetter,4000).trim();
    if(!job.value||!isFreelancer.value||job.value.status!=='OPEN'||myProposal.value||!Number.isFinite(bid)||bid<=0||!completionTime||!coverLetter)return null;
    return{bid,completionTime,coverLetter};
  }
  function beginProposal(){if(!validProposal())return store.notice('Complete every required proposal field','fa-triangle-exclamation');if(job.value.requiresNDA){ndaAccepted.value=false;showNda.value=true}else submitProposal()}
  function submitProposal(){
    const data=validProposal();
    if(!data||(job.value.requiresNDA&&!ndaAccepted.value))return store.notice('Proposal submission denied or incomplete','fa-shield-halved');
    store.addProposal(job.value,data.bid);const created=job.value.proposals.find(item=>item.freelancerId===store.currentUser.value.id);
    if(!created)return;
    Object.assign(created,{completionTime:data.completionTime,coverLetter:data.coverLetter,ndaAccepted:Boolean(job.value.requiresNDA)});
    let conversation=store.state.conversations.find(item=>item.jobId===job.value.id&&item.participants.includes(store.currentUser.value.id));
    if(!conversation)store.state.conversations.push({id:window.ProcurementCommon.uid('convo'),jobId:job.value.id,participants:[job.value.clientId,store.currentUser.value.id],messages:[]});
    showNda.value=false;store.notice('Proposal submitted');
  }
  return{store,job,client,clientView,isOwner,isFreelancer,saved,myProposal,proposal,questionText,answerDrafts,showNda,ndaAccepted,ask,answer,beginProposal,submitProposal};
}};
</script>
