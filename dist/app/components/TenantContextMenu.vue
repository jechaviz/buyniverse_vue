<template>
  <div v-if="context?.company" class="ws-ctx">
    <button type="button" class="ws-ctx__btn" :aria-expanded="open" :aria-label="store.t('Switch company or location')" @click="open = !open">
      <i class="fa-solid" :class="context.company.kind === 'individual' ? 'fa-user' : 'fa-building'"></i>
      <span><b>{{ context.company.legalName }}</b><small>{{ context.location?.name || store.t('All locations') }}</small></span>
      <i class="fa-solid fa-chevron-down ws-ctx__chev" :class="{ 'is-open': open }"></i>
    </button>

    <div v-if="open" class="ws-pop ws-ctx__pop">
      <div class="ws-pop__head">
        <h2>{{ store.t('Company context') }}</h2>
        <p v-if="switching"><i class="fa-solid fa-arrows-rotate fa-spin"></i> {{ store.t('Switching') }}</p>
        <p v-else>{{ store.t('Data and permissions follow the selected legal entity and location.') }}</p>
      </div>
      <section v-for="company in context.companies || []" :key="company.id" class="ws-ctx__company">
        <button type="button" class="ws-pop__item" :disabled="switching" @click="choose(company.id, null)">
          <i class="fa-solid" :class="company.kind === 'individual' ? 'fa-user' : 'fa-landmark'"></i>
          <span class="ws-ctx__name"><b>{{ company.legalName }}</b><small>{{ company.rfc ? `RFC ${company.rfc}` : store.t('Personal workspace') }}</small></span>
          <i v-if="company.id === context.company.id && !context.location" class="fa-solid fa-check ws-ctx__ok"></i>
        </button>
        <button v-for="location in company.locations || []" :key="location.id" type="button" class="ws-pop__item ws-ctx__loc" :disabled="switching" @click="choose(company.id, location.id)">
          <i class="fa-solid" :class="location.kind === 'warehouse' ? 'fa-warehouse' : 'fa-code-branch'"></i>
          <span class="ws-ctx__name"><b>{{ location.name }}</b></span>
          <i v-if="context.location?.id === location.id" class="fa-solid fa-check ws-ctx__ok"></i>
        </button>
      </section>
    </div>
  </div>
</template>
<script>
const { inject, ref } = Vue;
export default {
  props: { context: Object, switching: Boolean },
  emits: ["switch"],
  setup(props, { emit }) {
    const open = ref(false);
    const choose = (companyId, locationId) => {
      if (props.switching) return;
      open.value = false;
      emit("switch", { companyId, locationId });
    };
    return { store: inject("store"), open, choose };
  },
};
</script>
