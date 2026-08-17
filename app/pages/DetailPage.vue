<template>
  <div>
    <section v-if="gig" class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <main class="panel p-7">
          <p class="premium-kicker text-xs font-bold uppercase text-brand">
            {{ gig.category }}
          </p>
          <h1 class="premium-title mt-2 text-3xl font-800">{{ gig.title }}</h1>
          <p
            class="mt-4 max-w-3xl leading-7 text-slate-600 dark:text-slate-300"
          >
            {{ gig.description }}
          </p>
          <h2 class="mt-7 font-800">What is included</h2>
          <ul class="mt-3 space-y-3">
            <li
              v-for="line in gig.scope"
              :key="line"
              class="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
            >
              <i class="fa-solid fa-circle-check mt-1 text-emerald-500"></i
              >{{ line }}
            </li>
          </ul>
          <h2 class="mt-7 font-800">Delivery process</h2>
          <ol class="mt-3 grid gap-3 sm:grid-cols-3">
            <li
              v-for="(step, index) in [
                'Kickoff & inputs',
                'Focused delivery',
                'Review & handoff',
              ]"
              :key="step"
              class="rounded-xl border border-slate-100 p-4 dark:border-slate-700"
            >
              <b class="text-brand">0{{ index + 1 }}</b>
              <p class="mt-2 text-sm font-semibold">{{ step }}</p>
            </li>
          </ol>
        </main>
        <aside class="space-y-4">
          <article class="panel p-5">
            <p class="text-sm text-slate-500">Fixed price</p>
            <p class="mt-1 text-3xl font-800">{{ store.money(gig.price) }}</p>
            <dl class="mt-5 space-y-3 text-sm">
              <div class="flex justify-between">
                <dt class="text-slate-500">Delivery</dt>
                <dd class="font-bold">{{ gig.deliveryDays }} days</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-slate-500">Revisions</dt>
                <dd class="font-bold">{{ gig.revisions }}</dd>
              </div>
            </dl>
            <button
              class="btn-brand mt-6 w-full"
              :disabled="requested"
              @click="request"
            >
              <i
                class="fa-solid mr-2"
                :class="requested ? 'fa-check' : 'fa-paper-plane'"
              ></i
              >{{ requested ? "Request sent" : "Request service" }}
            </button>
          </article>
          <article class="panel p-5">
            <p class="text-xs font-bold uppercase text-slate-400">
              Provided by
            </p>
            <RouterLink
              :to="creatorLink"
              class="mt-3 block font-800 text-brand"
              >{{ creatorName }}</RouterLink
            >
            <p class="mt-1 text-sm text-slate-500">
              Verified marketplace provider · 4.9
            </p>
          </article>
        </aside>
      </div>
    </section>
    <section v-else class="panel p-10 text-center">
      <h1 class="text-2xl font-800">Service not found</h1>
      <RouterLink class="btn-brand mt-4" to="/browse-services"
        >Browse services</RouterLink
      >
    </section>
  </div>
</template>
<script>
const { inject, computed } = Vue;
const { useRoute } = VueRouter;
export default {
  setup() {
    const store = inject("store"),
      route = useRoute(),
      gig = computed(() =>
        store.state.gigs.find((x) => x.id === route.params.gigId),
      ),
      requested = computed(() =>
        store.state.serviceRequests?.some(
          (x) =>
            x.gigId === gig.value?.id &&
            x.buyerId === store.currentUser.value.id,
        ),
      ),
      creatorName = computed(() =>
        gig.value?.creatorType === "agency"
          ? store.state.agencies.find((x) => x.id === gig.value.creatorId)?.name
          : store.user(gig.value?.creatorId)?.name,
      ),
      creatorLink = computed(() =>
        gig.value?.creatorType === "agency"
          ? `/agency/${gig.value.creatorId}`
          : `/profile/${gig.value?.creatorId}`,
      );
    function request() {
      if (!requested.value) store.requestGig(gig.value);
    }
    return { store, gig, requested, creatorName, creatorLink, request };
  },
};
</script>
