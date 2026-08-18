<template><header class="z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 sm:px-6 lg:px-8"><div class="flex items-center gap-3"><button class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 md:hidden" aria-label="Toggle navigation" @click="$emit('toggle-nav')"><i class="fa-solid fa-bars text-xl"></i></button><button class="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 md:hidden dark:border-slate-800 dark:bg-slate-800" aria-label="Quick access" @click="$emit('open-command')"><i class="fa-solid fa-magnifying-glass text-xs"></i></button><button class="hidden items-center gap-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand md:flex shadow-xs transition" @click="$emit('open-command')"><i class="fa-solid fa-magnifying-glass text-xs"></i><span>Quick access</span><kbd class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ctrl K</kbd></button><span class="hidden items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-100/70 px-3 py-1.5 text-[11px] font-700 text-slate-600 lg:flex dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-300" title="Active company workspace"><i class="fa-solid text-brand text-xs" :class="marketplaceMode === 'buyer' ? 'fa-cart-shopping' : marketplaceMode === 'supplier' ? 'fa-store' : 'fa-shield-halved'"></i>
        {{ activeModeLabel }}
      </span></div><span class="hidden items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 lg:flex" title="Sincronizado en tiempo real con MySQL InnoDB"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        {{ store.t("Base de Datos Conectada") }}
      </span><RouterLink v-if="marketplaceMode === 'buyer'" to="/post-job/new" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex"><i class="fa-solid fa-plus text-xs mr-1.5"></i>Post a Job
      </RouterLink><RouterLink v-else-if="marketplaceMode === 'supplier'" to="/" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex"><i class="fa-solid fa-briefcase text-xs mr-1.5"></i>Find Work
      </RouterLink><div class="relative"><button
          class="relative hidden h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400 sm:grid shadow-xs transition"
          title="Notifications"
          aria-label="Notifications"
          :aria-expanded="notificationsOpen"
          @click="$emit('toggle-overlay', 'notifications')"
        ><i class="fa-regular fa-bell text-sm"></i><span v-if="unreadNotifications.length" class="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white shadow-soft">
            {{ unreadNotifications.length }}
          </span></button><div v-if="notificationsOpen" class="absolute right-0 top-11 z-50 w-90 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900"><div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800"><div><h2 class="font-head font-bold text-sm">Notifications</h2><p class="mt-0.5 text-xs text-slate-500">{{ unreadNotifications.length ? `${unreadNotifications.length} unread` : "You are all caught up" }}</p></div><button v-if="unreadNotifications.length" class="text-xs font-semibold text-brand hover:underline" @click="$emit('mark-all-read')">
              Mark all read
            </button></div><div class="max-h-96 overflow-y-auto"><RouterLink
              v-for="notification in visibleNotifications"
              :key="notification.id"
              :to="notification.link"
              class="flex gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              :class="!notification.isRead ? 'bg-brand-50/40 dark:bg-brand/10' : ''"
              @click="$emit('open-notification', notification)"
            ><span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/20"><i class="fa-solid text-sm" :class="notification.icon"></i></span><span class="min-w-0"><b class="block text-xs font-bold text-slate-900 dark:text-slate-100">{{ notification.title }}</b><span class="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{{ notification.text }}</span><time class="mt-1 block text-[10px] text-slate-400">{{ formatDate(notification.at) }}</time></span></RouterLink><div v-if="!visibleNotifications.length" class="p-8 text-center text-sm text-slate-500"><i class="fa-regular fa-bell-slash text-2xl text-slate-300 dark:text-slate-600"></i><p class="mt-2 text-xs">No notifications yet.</p></div></div></div></div><div class="relative"><button
          class="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-xs font-bold text-brand ring-2 ring-transparent hover:ring-brand/30 dark:bg-brand/20 dark:text-brand-200 transition"
          aria-label="Account menu"
          :aria-expanded="accountOpen"
          @click="$emit('toggle-overlay', 'account')"
        >
          {{ user.avatar }}
        </button><div v-if="accountOpen" class="absolute right-0 top-11 z-50 max-h-[calc(100vh-5rem)] w-76 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900"><div class="border-b border-slate-100 p-4 dark:border-slate-800"><p class="font-head font-bold text-sm">{{ user.name }}</p><p class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p></div><div class="py-1"><RouterLink :to="`/profile/${user.id}`" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="$emit('close-account')"><i class="fa-regular fa-user mr-2.5 w-4 text-slate-400"></i>View profile
            </RouterLink><RouterLink to="/profile/billing" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="$emit('close-account')"><i class="fa-regular fa-credit-card mr-2.5 w-4 text-slate-400"></i>Billing & folios
            </RouterLink><button class="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="$emit('lock-now')"><i class="fa-solid fa-lock mr-2.5 w-4 text-slate-400"></i>Lock workspace
            </button></div><section v-if="marketplaceModeOptions.length > 1" class="border-t border-slate-100 p-3.5 dark:border-slate-800" aria-labelledby="company-workspace-title"><h2 id="company-workspace-title" class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Company workspace</h2><div class="grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60" :class="marketplaceModeOptions.length > 2 ? 'grid-cols-3' : 'grid-cols-2'" role="group" aria-label="Company operating workspace"><button
                v-for="option in marketplaceModeOptions"
                :key="option.key"
                class="flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-800 transition"
                :class="marketplaceMode === option.key ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                :aria-pressed="marketplaceMode === option.key"
                @click="$emit('switch-mode', option.key)"
              ><i class="fa-solid text-xs" :class="option.icon"></i>{{ option.label }}
              </button></div><p class="mt-2 text-[10px] leading-4 text-slate-400">One company identity; navigation and permissions follow the active workspace.</p></section><section class="border-t border-slate-100 p-3.5 dark:border-slate-800" aria-labelledby="user-preferences-title"><h2 id="user-preferences-title" class="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Preferences</h2><div class="flex items-center justify-between gap-3"><span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Language</span><div class="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-800 dark:bg-slate-800/60" role="group" aria-label="Language"><button
                  v-for="code in ['en', 'es']"
                  :key="code"
                  class="h-6 rounded-md px-2.5 transition font-bold"
                  :class="locale === code ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                  :aria-pressed="locale === code"
                  :title="code === 'en' ? 'Switch to English' : 'Switch to Spanish'"
                  @click="$emit('set-locale', code)"
                >
                  {{ code.toUpperCase() }}
                </button></div></div><div class="mt-3 flex items-center justify-between gap-3"><span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Theme</span><button class="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-brand dark:bg-slate-800/60 dark:text-slate-300 transition" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'" @click="$emit('toggle-theme')"><i class="fa-solid" :class="dark ? 'fa-moon' : 'fa-sun'"></i>
                {{ dark ? "Dark mode" : "Light mode" }}
              </button></div><div class="mt-3"><span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Accent</span><div class="mt-2 flex items-center justify-between gap-1"><button
                  v-for="option in accents"
                  :key="option.key"
                  class="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  :aria-label="`Use ${option.label} accent`"
                  :aria-pressed="accent === option.key"
                  :title="option.label"
                  @click="$emit('set-accent', option)"
                ><span class="h-4 w-4 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-900" :class="accent === option.key ? 'ring-slate-500' : 'ring-transparent'" :style="{ backgroundColor: option.accent }"></span></button></div></div></section><div class="border-t border-slate-100 p-3.5 dark:border-slate-800"><label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Demo account</label><select class="field py-2 text-xs" :value="currentUserId" @change="$emit('switch-user', $event.target.value)"><option v-for="person in users" :key="person.id" :value="person.id">
                {{ person.name }} · {{ person.type }}
              </option></select></div></div></div></div></header></template>
<script>
export default {
props: {
ui: Object,
user: Object,
users: Array,
currentUserId: String,
marketplaceMode: String,
marketplaceModeOptions: Array,
activeModeLabel: String,
notificationsOpen: Boolean,
visibleNotifications: Array,
unreadNotifications: Array,
accountOpen: Boolean,
locale: String,
dark: Boolean,
accents: Array,
accent: String,
formatDate: Function,
},
emits: [
"toggle-nav", "open-command", "toggle-overlay", "mark-all-read",
"open-notification", "close-account", "lock-now", "switch-mode",
"set-locale", "toggle-theme", "set-accent", "switch-user",
],
};
</script>