<template>
  <section class="space-y-6">
    <header>
      <p class="premium-kicker text-xs font-bold uppercase text-brand">Marketplace</p>
      <h1 class="premium-title mt-2 text-3xl font-800">{{ talentMode ? "Find talent" : "Service marketplace" }}</h1>
      <p class="mt-2 text-slate-500">{{ talentMode ? "Search verified specialists by skill and availability." : "Browse fixed-scope services by category, price and delivery." }}</p>
    </header>

    <div class="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="relative lg:col-span-2">
        <i class="fa-solid fa-search absolute left-3 top-3 text-slate-400"></i>
        <input v-model.trim="query" class="field pl-9" :placeholder="talentMode ? 'Search name, headline or skill' : 'Search services'" />
      </div>
      <select v-model="category" class="field">
        <option value="">All categories</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-if="talentMode" v-model="availability" class="field">
        <option value="">Any availability</option>
        <option>Available</option>
        <option>Away</option>
      </select>
      <input v-else v-model.number="maxPrice" class="field" type="number" min="0" placeholder="Maximum price" />
    </div>

    <div v-if="talentMode" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="person in talent" :key="person.id" class="premium-card rounded-xl p-5">
        <div class="flex gap-3">
          <span class="grid h-12 w-12 place-items-center rounded-full bg-brand-50 font-800 text-brand">{{ person.avatar }}</span>
          <div>
            <RouterLink :to="`/profile/${person.id}`" class="font-800 hover:text-brand">{{ person.name }}</RouterLink>
            <p class="text-sm text-slate-500">{{ person.headline || person.companyName || "Verified supplier" }}</p>
            <p class="mt-1 text-xs font-bold" :class="person.availability === 'Available' ? 'text-emerald-600' : 'text-amber-600'">{{ person.availability || "Available" }}</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-1">
          <span v-for="skill in person.skills || []" :key="skill" class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ skill }}</span>
        </div>
        <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span class="text-sm text-slate-500">4.9 · Verified</span>
          <button v-if="canInvite" class="btn-brand" @click="invite(person)">Invite</button>
        </div>
      </article>
    </div>

    <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="gig in gigs" :key="gig.id" class="premium-card flex flex-col rounded-xl p-5">
        <p class="text-xs font-bold uppercase text-brand">{{ gig.category }}</p>
        <RouterLink :to="`/gig/${gig.id}`" class="mt-2 text-xl font-800 hover:text-brand">{{ gig.title }}</RouterLink>
        <p class="mt-3 flex-1 text-sm leading-6 text-slate-500">{{ gig.description }}</p>
        <div class="mt-4 flex justify-between text-sm text-slate-500"><span>{{ gig.deliveryDays }} days</span><span>{{ gig.revisions }} revisions</span></div>
        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <b class="text-xl">{{ store.money(gig.price) }}</b>
          <button v-if="canRequest" class="btn-brand" @click="store.requestGig(gig)">Request</button>
        </div>
      </article>
    </div>

    <div v-if="!(talentMode ? talent.length : gigs.length)" class="panel p-10 text-center text-slate-500">No matches. Clear or broaden the filters.</div>
  </section>
</template>

<script>
const { inject, computed, ref } = Vue;
const { useRoute } = VueRouter;

export default {
  setup() {
    const store = inject("store");
    const route = useRoute();
    const query = ref("");
    const category = ref("");
    const availability = ref("");
    const maxPrice = ref(null);
    const talentMode = computed(() => route.meta.directory === "talent");
    const canInvite = computed(() => store.isBuyer.value || store.isAdmin.value);
    const canRequest = computed(() => store.isBuyer.value || store.isAdmin.value);
    const supplierUsers = computed(() =>
      store.state.users.filter((user) =>
        user.type !== "Admin" && (user.marketplaceModes || []).includes("supplier"),
      ),
    );
    const categories = computed(() =>
      talentMode.value
        ? [...new Set(supplierUsers.value.flatMap((user) => user.skills || []))]
        : [...new Set(store.state.gigs.map((gig) => gig.category))],
    );
    const talent = computed(() => {
      const q = query.value.toLowerCase();
      return supplierUsers.value.filter((person) =>
        (!q || `${person.name} ${person.companyName || ""} ${person.headline || ""} ${(person.skills || []).join(" ")}`.toLowerCase().includes(q)) &&
        (!category.value || (person.skills || []).includes(category.value)) &&
        (!availability.value || person.availability === availability.value),
      );
    });
    const gigs = computed(() => {
      const q = query.value.toLowerCase();
      return store.state.gigs.filter((gig) =>
        (!q || `${gig.title} ${gig.description}`.toLowerCase().includes(q)) &&
        (!category.value || gig.category === category.value) &&
        (!maxPrice.value || gig.price <= maxPrice.value),
      );
    });
    function invite(person) {
      if (!canInvite.value || !supplierUsers.value.includes(person)) return store.notice("Invitation denied", "fa-shield-halved");
      const open = store.state.jobs.find((job) => job.clientId === store.currentUser.value.id && job.status === "OPEN");
      store.addNotification({
        userId: person.id,
        title: "New project invitation",
        text: open ? `You were invited to ${open.title}.` : `${store.currentUser.value.name} invited you to discuss a project.`,
        link: open ? `/job/${open.id}` : "/messages",
        icon: "fa-user-plus",
      });
      store.notice(`${person.name} invited`);
    }
    return { store, talentMode, canInvite, canRequest, query, category, availability, maxPrice, categories, talent, gigs, invite };
  },
};
</script>
