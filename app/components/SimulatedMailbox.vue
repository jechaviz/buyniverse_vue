<template>
  <section class="mbx">
    <header class="mbx-head">
      <div>
        <p class="mbx-eyebrow"><i class="fa-regular fa-envelope"></i> {{ t('Simulated mailbox') }}</p>
        <p class="mbx-note">{{ t('These emails are shown only here and are never sent. Every address is on yopmail.com, a public disposable inbox.') }}</p>
      </div>
      <span class="mbx-count">{{ mails.length }}</span>
    </header>

    <p v-if="!mails.length" class="mbx-empty">{{ t('No emails yet. They appear as the people in this demo write to each other.') }}</p>

    <div v-else class="mbx-body">
      <ul class="mbx-list" role="list">
        <li v-for="item in mails" :key="item.id">
          <button type="button" class="mbx-row" :class="{ 'is-on': open && open.id === item.id, 'is-new': !item.read }" @click="select(item)">
            <span class="mbx-kind" :class="`k-${item.kind}`"><i class="fa-solid" :class="icon(item.kind)"></i></span>
            <span class="mbx-main"><b>{{ item.subject }}</b><small>{{ item.from.name }} → {{ recipients(item) }}</small></span>
            <time>{{ time(item.at) }}</time>
          </button>
        </li>
      </ul>

      <article v-if="open" class="mbx-read">
        <h3>{{ open.subject }}</h3>
        <dl>
          <div><dt>{{ t('Sender') }}</dt><dd>{{ open.from.name }} <small>&lt;{{ open.from.email }}&gt;</small></dd></div>
          <div><dt>{{ t('To') }}</dt><dd><span v-for="to in open.to" :key="to.email" class="mbx-to">{{ to.name }} <small>&lt;{{ to.email }}&gt;</small><a v-if="yopmail(to.email)" :href="`https://yopmail.com/?login=${yopmail(to.email)}`" target="_blank" rel="noopener noreferrer" :title="t('Open this mailbox in Yopmail (it stays empty: nothing was sent)')"><i class="fa-solid fa-arrow-up-right-from-square"></i></a></span></dd></div>
          <div><dt>{{ t('When') }}</dt><dd>{{ time(open.at, true) }}</dd></div>
        </dl>
        <pre>{{ open.body }}</pre>
      </article>
    </div>
  </section>
</template>

<script>
const { inject, computed, ref } = Vue;

const ICONS = { invitation: 'fa-envelope-open-text', outbid: 'fa-arrow-trend-down', question: 'fa-circle-question', answer: 'fa-reply', clarification: 'fa-bullhorn', closing: 'fa-flag-checkered', order: 'fa-box-open' };

export default {
  props: { contextType: { type: String, default: '' }, contextId: { type: String, default: '' } },
  setup(props) {
    const store = inject('store');
    const t = (key) => store.t(key);
    const open = ref(null);
    const mails = computed(() => store.castMail(props.contextType, props.contextId));
    const select = (item) => { open.value = item; store.castMarkMailRead(item.id); };
    const recipients = (item) => item.to.map((to) => to.name).join(', ');
    const yopmail = (email) => { const m = /^([^@]+)@yopmail\.com$/i.exec(String(email || '')); return m ? encodeURIComponent(m[1]) : ''; };
    const time = (iso, long) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], long ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : { hour: '2-digit', minute: '2-digit' }); };
    return { t, mails, open, select, recipients, yopmail, time, icon: (kind) => ICONS[kind] || 'fa-envelope' };
  },
};
</script>
