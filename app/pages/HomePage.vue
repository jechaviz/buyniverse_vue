<template>
  <section
    v-if="supplierMode"
    class="grid grid-cols-1 items-start gap-8 lg:grid-cols-4"
  >
    <aside
      class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md lg:sticky lg:top-6"
    >
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Filter opportunities</h2>
        <button
          v-if="query || category || projectType || experience || minimum || maximum"
          class="text-[11px] font-bold text-brand hover:underline"
          @click="clear"
        >
          Reset
        </button>
      </div>
      <label class="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Search keywords</label>
      <div class="relative mt-1.5">
        <i class="fa-solid fa-search absolute left-3.5 top-3.5 text-xs text-slate-400"></i
        ><input v-model="query" class="field pl-9 text-xs" placeholder="Skills, roles, terms…" />
      </div>
      <label class="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Category</label
      ><select v-model="category" class="field mt-1.5 text-xs">
        <option value="">All categories</option>
        <option v-for="value in categories" :key="value">
          {{ value }}
        </option></select
      ><label class="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Project type</label
      ><select v-model="projectType" class="field mt-1.5 text-xs">
        <option value="">All types</option>
        <option>Fixed price</option>
        <option>Hourly</option></select
      ><label class="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Experience</label
      ><select v-model="experience" class="field mt-1.5 text-xs">
        <option value="">All levels</option>
        <option>Entry</option>
        <option>Intermediate</option>
        <option>Expert</option></select
      ><label class="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Budget range</label>
      <div class="mt-1.5 grid grid-cols-2 gap-2">
        <input
          v-model.number="minimum"
          class="field text-xs"
          type="number"
          min="0"
          placeholder="Min $"
        /><input
          v-model.number="maximum"
          class="field text-xs"
          type="number"
          min="0"
          placeholder="Max $"
        />
      </div>
      <button
        class="mt-5 w-full btn-muted text-xs py-2"
        @click="clear"
      >
        Clear all filters
      </button>
    </aside>
    <div class="lg:col-span-3 space-y-5">
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md"
      >
        <div class="flex gap-1.5">
          <button
            class="rounded-xl px-4 py-2 text-xs font-bold transition-all"
            :class="
              tab === 'search'
                ? 'bg-brand text-white shadow-soft'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            "
            @click="openTab('search')"
          >
            <i class="fa-solid fa-briefcase mr-1.5 text-xs"></i>Find Work</button
          ><button
            class="rounded-xl px-4 py-2 text-xs font-bold transition-all"
            :class="
              tab === 'saved'
                ? 'bg-brand text-white shadow-soft'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            "
            @click="openTab('saved')"
          >
            <i class="fa-solid fa-bookmark mr-1.5 text-xs"></i>Saved Jobs ({{ saved.length }})
          </button>
        </div>
        <p class="pr-3 text-xs font-semibold text-slate-400">{{ filtered.length }} jobs found</p>
      </div>
      <div v-if="filtered.length" class="grid gap-5 md:grid-cols-2">
        <article
          v-for="job in filtered"
          :key="job.id"
          class="premium-card flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-card transition hover:shadow-elevated dark:border-slate-800/80 dark:bg-slate-900/90"
        >
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {{ job.category }}
              </span>
              <button
                class="grid h-8 w-8 place-items-center rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
                :class="
                  saved.includes(job.id)
                    ? 'text-brand'
                    : 'text-slate-400 hover:text-brand'
                "
                :aria-label="saved.includes(job.id) ? 'Unsave job' : 'Save job'"
                @click="toggle(job.id)"
              >
                <i
                  class="text-sm"
                  :class="saved.includes(job.id) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"
                ></i>
              </button>
            </div>
            <RouterLink :to="`/job/${job.id}`"
              ><h2 class="font-head mt-3 text-base font-800 tracking-tight text-slate-900 hover:text-brand dark:text-white transition">
                {{ job.title }}
              </h2></RouterLink
            >
            <p
              class="mt-2.5 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {{ job.category }} project requiring {{ job.skills.join(", ") }}.
            </p>
            <div class="mt-4 flex flex-wrap gap-1.5">
              <span
                v-for="skill in job.skills.slice(0, 4)"
                :key="skill"
                class="rounded-lg bg-slate-100/90 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800/90 dark:text-slate-300"
                >{{ skill }}</span
              >
            </div>
          </div>
          <div
            class="mt-6 flex items-center justify-between border-t border-slate-100/80 pt-4 dark:border-slate-800/80"
          >
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ job.budgetType || 'Budget' }}</p>
              <b class="font-head font-mono text-sm font-800 text-slate-900 dark:text-white">{{ store.money(job.budget, job.currency) }}</b>
            </div>
            <RouterLink :to="`/job/${job.id}`" class="btn-brand text-xs py-1.5 px-3">
              View details
            </RouterLink>
          </div>
        </article>
      </div>
      <div
        v-else
        class="panel rounded-2xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-card dark:border-slate-800/80 dark:bg-slate-900/80"
      >
        <i class="fa-solid fa-briefcase text-3xl text-slate-300 dark:text-slate-600"></i>
        <h2 class="font-head mt-3 text-base font-800 text-slate-800 dark:text-slate-200">No matching jobs found</h2>
        <p class="mt-1 text-xs text-slate-400">Try adjusting your keywords or category filters.</p>
        <button class="btn-muted mt-4 text-xs py-2 px-4" @click="clear">Reset filters</button>
      </div>
    </div>
  </section>
  <section v-else class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-head text-3xl font-800 tracking-tight text-slate-900 dark:text-white">Welcome to Buyniverse</h1>
        <p class="mt-1 text-sm text-slate-500">Your workspace is ready.</p>
      </div>
      <RouterLink class="btn-brand" to="/dashboard">Go to Dashboard</RouterLink>
    </div>
    <div
      class="panel rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-slate-600 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-300 text-sm shadow-card"
    >
      Switch the company workspace to Supplier to explore open opportunities.
    </div>
  </section>
</template>
<script>
const { inject, ref, computed, onMounted } = Vue;
const { useRoute, useRouter } = VueRouter;
export default {
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter(),
      user = store.currentUser,
      query = ref(""),
      category = ref(""),
      minimum = ref(null),
      maximum = ref(null),
      projectType = ref(""),
      experience = ref("");
    onMounted(() => {
      if (!store.isSupplier.value) router.replace("/dashboard");
    });
    if (!Array.isArray(store.state.savedJobIds)) store.state.savedJobIds = [];
    const saved = computed(() => store.state.savedJobIds);
    const supplierMode = store.isSupplier;
    const tab = computed(() =>
      route.query.view === "saved" ? "saved" : "search",
    );
    const openTab = (key) =>
      router.push({
        path: "/",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          view: key === "saved" ? "saved" : null,
        }),
      });
    const categories = computed(() => [
      ...new Set(store.state.jobs.map((j) => j.category)),
    ]);
    const filtered = computed(() => {
      const q = query.value.toLowerCase();
      return store.state.jobs.filter(
        (j) =>
          (tab.value === "search"
            ? j.status === "OPEN"
            : saved.value.includes(j.id)) &&
          (!q ||
            `${j.title} ${j.skills.join(" ")}`.toLowerCase().includes(q)) &&
          (!category.value || j.category === category.value) &&
          (!projectType.value ||
            (j.budgetType || "Fixed price") === projectType.value) &&
          (!experience.value ||
            (j.experienceLevel || "Intermediate") === experience.value) &&
          (!minimum.value || j.budget >= minimum.value) &&
          (!maximum.value || j.budget <= maximum.value),
      );
    });
    const toggle = (id) => store.toggleSavedJob(id);
    const clear = () => {
      query.value = "";
      category.value = "";
      minimum.value = null;
      maximum.value = null;
      projectType.value = "";
      experience.value = "";
    };
    return {
      store,
      user,
      supplierMode,
      query,
      category,
      minimum,
      maximum,
      projectType,
      experience,
      tab,
      openTab,
      saved,
      categories,
      filtered,
      toggle,
      clear,
    };
  },
};
</script>
