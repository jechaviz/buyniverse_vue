<template>
  <div class="vt">
    <section class="vt-bar">
      <div class="vt-intro">
        <p class="vt-eyebrow"><i class="fa-solid fa-people-arrows"></i> {{ t('Teams and tasks') }}</p>
        <p>{{ t("Each company's own team works this order: they talk, hand each other tasks and email. Everyone here is simulated, only for this demo.") }}</p>
      </div>
      <div class="vt-controls">
        <div class="vt-speed" role="group" :aria-label="t('Speed')">
          <button v-for="option in speeds" :key="option" type="button" :class="{ 'is-on': settings.speed === option }" @click="store.castSetSpeed(option)">{{ option === 0.5 ? '½' : option }}×</button>
        </div>
        <button type="button" class="ct-ghost" @click="store.castTogglePause()"><i class="fa-solid" :class="settings.paused ? 'fa-play' : 'fa-pause'"></i> {{ settings.paused ? t('Resume the simulation') : t('Pause the simulation') }}</button>
      </div>
    </section>

    <section class="vt-sides">
      <article v-for="side in sides" :key="side.side" class="vt-side">
        <header><b>{{ side.name }}</b><span class="vt-chip">{{ side.side === 'buyer' ? t('Client') : t('Supplier') }}</span></header>
        <ul class="vt-team">
          <li v-for="member in side.members" :key="member.id"><span class="vt-dot" :class="`r-${member.team ? member.team.role : 'owner'}`"></span><b>{{ member.name }}</b><small>{{ title(member) }}</small><em>{{ member.email }}</em></li>
        </ul>
      </article>
    </section>

    <section class="vt-tasks">
      <header class="vt-tasks-head"><p class="vt-eyebrow"><i class="fa-solid fa-list-check"></i> {{ t('Order tasks') }}</p><span class="vt-count">{{ done }}/{{ tasks.length }} {{ t('done') }}</span></header>
      <div class="vt-cols">
        <div v-for="col in columns" :key="col.side" class="vt-col">
          <h4>{{ col.label }}</h4>
          <p v-if="!col.items.length" class="vt-empty">{{ t('Nothing yet.') }}</p>
          <label v-for="task in col.items" :key="task.id" class="vt-task" :class="`s-${task.status}`">
            <input type="checkbox" :checked="task.status === 'done'" :disabled="!canEdit(task)" :aria-label="task.title" @change="toggle(task, $event.target.checked)" />
            <span class="vt-task-main"><b>{{ task.title }}</b><small><span class="vt-chip" :class="task.status">{{ statusLabel(task.status) }}</span> {{ ownerName(task) }} · {{ t('due') }} {{ dueText(task) }}</small></span>
          </label>
        </div>
      </div>
      <form class="vt-add" @submit.prevent="add">
        <input v-model.trim="draft.title" class="field" maxlength="160" :placeholder="t('Add a task: what, and for whom')" required />
        <select v-model="draft.ownerId" class="field" :aria-label="t('Assign to')" required>
          <option value="" disabled>{{ t('Assign to') }}</option>
          <optgroup v-for="side in sides" :key="side.side" :label="side.name"><option v-for="member in side.members" :key="member.id" :value="member.id">{{ member.name }} · {{ title(member) }}</option></optgroup>
        </select>
        <button class="ct-go"><i class="fa-solid fa-plus"></i> {{ t('Add task') }}</button>
      </form>
    </section>

    <CommunicationThread context-type="order" :context-id="order.id" :title="order.title" :can-announce="false" />
    <SimulatedMailbox context-type="order" :context-id="order.id" />
  </div>
</template>

<script>
const { inject, computed, reactive, onMounted } = Vue;
const load = (p) => Vue.defineAsyncComponent(() => window['vue3-sfc-loader'].loadModule(p, window.sfcOptions));

export default {
  components: { SimulatedMailbox: load('./app/components/SimulatedMailbox.vue?v=1'), CommunicationThread: load('./app/components/CommunicationThread.vue?v=1') },
  props: { order: { type: Object, required: true } },
  setup(props) {
    const store = inject('store');
    const t = (key) => store.t(key);
    const speeds = [0.5, 1, 2, 4];
    const settings = computed(() => store.castSettings());
    const sides = computed(() => store.castPeople('order', props.order.id));
    const tasks = computed(() => store.orderTasks(props.order.id));
    const done = computed(() => tasks.value.filter((task) => task.status === 'done').length);
    const columns = computed(() => ['buyer', 'supplier'].map((side) => ({ side, label: side === 'buyer' ? t('Client team') : t('Supplier team'), items: tasks.value.filter((task) => task.side === side) })));
    const draft = reactive({ title: '', ownerId: '' });
    const locale = () => (store.locale?.value === 'en' ? 'en' : 'es');
    const title = (member) => member?.team?.title?.[locale()] || member?.team?.title?.es || member?.companyName || '';
    const ownerName = (task) => store.user(task.ownerId)?.name || t('Unassigned');
    const dueText = (task) => (task.due ? store.date(task.due) : '');
    const statusLabel = (status) => t({ todo: 'To do', doing: 'In progress', done: 'Done' }[status] || status);
    const canEdit = (task) => task.ownerId === store.currentUser.value?.id || store.isAdmin.value || (task.side === 'buyer' && store.isDemo.value);
    const toggle = (task, checked) => { store.setOrderTaskStatus(task.id, checked ? 'done' : 'todo'); };
    const add = () => { if (store.addOrderTask(props.order.id, { title: draft.title, ownerId: draft.ownerId, days: 3 })) { draft.title = ''; draft.ownerId = ''; } };

    // Opening the tab puts the order's teams to work (they are driven from App.vue).
    onMounted(() => { store.castOpenOrder(props.order.id); });

    return { store, t, speeds, settings, sides, tasks, done, columns, draft, title, ownerName, dueText, statusLabel, canEdit, toggle, add };
  },
};
</script>
