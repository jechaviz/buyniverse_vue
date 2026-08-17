<template>
  <div>
    <section v-if="mode === 'profile' && person" class="space-y-6">
      <article class="panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
        <div class="flex flex-wrap items-start justify-between gap-5">
          <div class="flex gap-5">
            <span
              class="grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-3xl bg-brand-50 text-3xl font-800 text-brand shadow-soft dark:bg-brand/20"
              >{{ person.avatar }}</span
            >
            <div>
              <span class="rounded-lg bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-brand/20">{{ person.type }}</span>
              <h1 class="font-head mt-2 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ person.name }}</h1>
              <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {{ person.headline || person.companyName }}
              </p>
              <p class="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <i class="fa-solid fa-location-dot text-brand"></i
                >{{ person.location || "Remote" }}
              </p>
            </div>
          </div>
          <button v-if="own" class="btn-muted text-xs py-2 px-3.5" @click="editing = !editing">
            <i class="fa-solid fa-pen mr-1.5 text-xs"></i>Edit profile
          </button>
        </div>
        <form
          v-if="editing"
          class="mt-6 grid gap-4 border-t border-slate-100 pt-6 dark:border-slate-800 sm:grid-cols-2"
          @submit.prevent="saveProfile"
        >
          <label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Headline<input
              v-model="person.headline"
              class="field mt-1.5 text-xs" /></label
          ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >Location<input
              v-model="person.location"
              class="field mt-1.5 text-xs" /></label
          ><label class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:col-span-2"
            >Bio<textarea
              v-model="person.bio"
              class="field mt-1.5 min-h-28 text-xs leading-relaxed"
            ></textarea></label
          ><button class="btn-brand text-xs py-2 px-4 sm:col-span-2">Save profile</button>
        </form>
      </article>
      <div class="grid gap-6 lg:grid-cols-3">
        <article class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80 lg:col-span-2">
          <h2 class="font-head font-800 text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">About</h2>
          <p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {{
              person.bio ||
              "Experienced professional focused on clear communication and reliable delivery."
            }}
          </p>
          <h2 class="font-head mt-6 font-800 text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">Skills</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="x in person.skills || []"
              :key="x"
              class="badge rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >{{ x }}</span
            >
          </div>
          <h2 class="font-head mt-6 font-800 text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">Reviews</h2>
          <div class="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div class="flex items-center gap-2">
              <span class="text-amber-500 text-xs"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></span>
              <b class="text-xs font-bold text-slate-900 dark:text-white">5.0 · Excellent collaboration</b>
            </div>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Clear milestones, thoughtful feedback and delivery on schedule.
            </p>
          </div>
        </article>
        <aside class="panel p-6 rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
          <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Profile summary</h2>
          <dl class="mt-4 space-y-3.5 text-xs border-t border-slate-100 pt-4 dark:border-slate-800">
            <div class="flex justify-between items-center">
              <dt class="text-slate-400">Verified</dt>
              <dd class="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-circle-check text-xs"></i>Yes</dd>
            </div>
            <div class="flex justify-between items-center">
              <dt class="text-slate-400">Availability</dt>
              <dd class="font-semibold text-slate-800 dark:text-slate-200">{{ person.availability || "Available" }}</dd>
            </div>
            <div class="flex justify-between items-center">
              <dt class="text-slate-400">Total earned</dt>
              <dd class="font-semibold text-slate-800 dark:text-slate-200">
                {{ store.money(person.totalEarned || 0) }}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
    <section v-else-if="mode === 'agency' && agency" class="space-y-6">
      <article class="panel p-6">
        <p class="premium-kicker text-xs font-bold uppercase text-brand">
          Agency
        </p>
        <div class="mt-2 flex flex-wrap justify-between gap-4">
          <div>
            <h1 class="premium-title text-3xl font-800">{{ agency.name }}</h1>
            <p class="mt-2 text-slate-500">{{ agency.tagline }}</p>
          </div>
          <button
            v-if="owner"
            class="btn-muted"
            @click="
              agency.bio = agency.bio + ' ';
              store.notice('Agency profile ready to edit');
            "
          >
            <i class="fa-solid fa-pen mr-2"></i>Edit agency
          </button>
        </div>
        <p class="mt-5 max-w-3xl leading-7">{{ agency.bio }}</p>
      </article>
      <div class="grid gap-6 lg:grid-cols-2">
        <article class="panel p-6">
          <h2 class="font-800">Members</h2>
          <div
            v-for="m in agency.members"
            :key="m.userId"
            class="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
          >
            <RouterLink
              :to="`/profile/${m.userId}`"
              class="font-bold text-brand"
              >{{ store.user(m.userId)?.name }}</RouterLink
            ><span class="badge bg-slate-200 text-slate-600">{{ m.role }}</span>
          </div>
        </article>
        <article class="panel p-6">
          <h2 class="font-800">Portfolio & specialties</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="x in agency.specialties"
              :key="x"
              class="badge bg-brand-50 text-brand"
              >{{ x }}</span
            >
          </div>
          <div class="mt-5 rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
            <b>Selected product-design work</b>
            <p class="mt-2 text-sm text-slate-500">
              Research, design systems, prototypes and implementation handoffs.
            </p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
<script>
const { inject, computed, ref } = Vue;
const { useRoute } = VueRouter;
export default {
  setup() {
    const store = inject("store"),
      route = useRoute(),
      mode = computed(() => route.meta.identity),
      person = computed(() => store.user(route.params.userId)),
      agency = computed(() =>
        store.state.agencies.find((x) => x.id === route.params.agencyId),
      ),
      own = computed(() => person.value?.id === store.currentUser.value.id),
      owner = computed(
        () => agency.value?.ownerId === store.currentUser.value.id,
      ),
      editing = ref(false);
    function saveProfile() {
      if (!own.value || !person.value)
        return store.notice("Profile update denied", "fa-shield-halved");
      const headline = window.WebCommon.sanitizeText(
          person.value.headline,
          180,
        ).trim(),
        location = window.WebCommon.sanitizeText(
          person.value.location,
          180,
        ).trim(),
        bio = window.WebCommon.sanitizeText(person.value.bio, 4000).trim();
      if (!headline || !location || !bio)
        return store.notice(
          "Complete the required profile fields",
          "fa-triangle-exclamation",
        );
      Object.assign(person.value, { headline, location, bio });
      editing.value = false;
      store.notice("Profile updated");
    }
    return { store, mode, person, agency, own, owner, editing, saveProfile };
  },
};
</script>
