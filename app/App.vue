<template>
  <div class="premium-shell relative min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <a href="#main-content" class="skip-link">{{ store.t("Skip to workspace content") }}</a>
    <!-- Global Command Palette & System Modals -->
    <CommandPalette :open="commandOpen" @close="commandOpen = false" />
    <AppModals :ui="ui" :locale="store.locale" @resume-session="resumeSession" @resolve-confirm="store.resolveConfirm" />
    <AuthModal :open="authOpen" :initial-mode="authMode" @close="authOpen = false" />

    <!-- ========================================================================= -->
    <!-- 1. FULL-BLEED PUBLIC LANDING PAGE LAYOUT (When visiting '/')             -->
    <!-- ========================================================================= -->
    <div v-if="isLanding" class="flex-1 flex flex-col min-h-screen">
      <!-- Public Navigation Bar -->
      <nav class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 sm:px-8">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <!-- Logo & Brand -->
          <RouterLink to="/" class="flex items-center gap-3 group">
            <span class="grid h-10 w-10 place-items-center rounded-2xl bg-brand font-head text-lg font-bold text-white shadow-md shadow-brand/30 group-hover:scale-105 transition-transform">
              B
            </span>
            <div>
              <span class="font-head text-lg font-800 tracking-tight text-slate-900 dark:text-white block">Buyniverse</span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-brand -mt-1 block">{{ store.t("B2B Sourcing & Talent") }}</span>
            </div>
          </RouterLink>

          <!-- Public Nav Links -->
          <div class="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <RouterLink to="/procurement/auction" class="hover:text-brand transition flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {{ store.t("Subastas en Vivo") }}
            </RouterLink>
            <RouterLink to="/procurement/sourcing" class="hover:text-brand transition">
              {{ store.t("Rondas RFX") }}
            </RouterLink>
            <RouterLink to="/find-talent" class="hover:text-brand transition">
              {{ store.t("Buscar Talento") }}
            </RouterLink>
            <RouterLink to="/browse-services" class="hover:text-brand transition">
              {{ store.t("Servicios") }}
            </RouterLink>
          </div>

          <!-- Actions & Auth Buttons -->
          <div class="flex items-center gap-2.5 sm:gap-3">
            <!-- Language Selector -->
            <div class="flex rounded-xl bg-slate-100 p-0.5 text-[10px] font-bold dark:bg-slate-800/80" role="group" aria-label="Select language">
              <button
                v-for="code in ['es', 'en']"
                :key="code"
                class="h-6 rounded-lg px-2 transition font-bold"
                :class="locale === code ? 'bg-white text-brand shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-400'"
                :aria-label="code === 'es' ? 'Spanish' : 'English'"
                @click="setLocale(code)"
              >
                {{ code.toUpperCase() }}
              </button>
            </div>

            <!-- Theme Toggle -->
            <button
              class="grid h-8 w-8 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 hover:text-brand dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 transition"
              :aria-label="dark ? 'Light mode' : 'Dark mode'"
              @click="toggleTheme"
            >
              <i class="fa-solid text-xs" :class="dark ? 'fa-sun' : 'fa-moon'"></i>
            </button>

            <!-- Auth Buttons -->
            <button
              type="button"
              class="btn-muted text-xs py-2 px-3.5"
              @click="openAuth('login')"
            >
              <i class="fa-solid fa-right-to-bracket mr-1.5"></i>{{ store.t("Iniciar Sesión") }}
            </button>

            <button
              type="button"
              class="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2 text-xs font-bold text-brand hover:bg-brand-100/70 dark:border-brand-900/40 dark:bg-brand-950/40 transition"
              @click="launchDemo"
            >
              <i class="fa-solid fa-flask text-xs"></i>{{ store.t("Explore demo") }}
            </button>

            <button
              type="button"
              class="btn-brand text-xs py-2 px-4 shadow-sm"
              @click="openAuth('register')"
            >
              <i class="fa-solid fa-user-plus mr-1.5"></i>{{ store.t("Registrarse") }}
            </button>

            <RouterLink
              to="/dashboard"
              class="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2 text-xs font-bold text-brand hover:bg-brand-100/70 dark:border-brand-900/40 dark:bg-brand-950/40 transition"
            >
              <i class="fa-solid fa-gauge text-xs"></i>{{ store.t("Ir al Panel") }}
            </RouterLink>
          </div>
        </div>
      </nav>

      <!-- Public Content Area -->
      <main id="main-content" class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" tabindex="-1">
        <RouterView :key="route.path" />
      </main>

      <!-- Public Enterprise Footer -->
      <footer class="border-t border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/90 py-12 px-4 sm:px-8">
        <div class="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-5 text-xs">
          <div class="lg:col-span-2 space-y-3">
            <div class="flex items-center gap-2.5">
              <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand font-head font-bold text-white text-sm">B</span>
              <span class="font-head text-base font-800 text-slate-900 dark:text-white">Buyniverse</span>
            </div>
            <p class="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              {{ store.t("Plataforma SaaS empresarial para compras B2B, subastas inversas en vivo (BAFO), rondas RFX, contratos en fideicomiso (Escrow) y facturación SAT CFDI 4.0.") }}
            </p>
          </div>

          <div class="space-y-2.5">
            <b class="font-head text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">{{ store.t("Soluciones") }}</b>
            <ul class="space-y-1.5 text-slate-500 dark:text-slate-400">
              <li><RouterLink to="/procurement/auction" class="hover:text-brand">{{ store.t("Subastas Inversas") }}</RouterLink></li>
              <li><RouterLink to="/procurement/sourcing" class="hover:text-brand">{{ store.t("Rondas de Cotización RFX") }}</RouterLink></li>
              <li><RouterLink to="/post-job/new" class="hover:text-brand">{{ store.t("Publicar Proyecto") }}</RouterLink></li>
              <li><RouterLink to="/find-talent" class="hover:text-brand">{{ store.t("Directorio de Proveedores") }}</RouterLink></li>
            </ul>
          </div>

          <div class="space-y-2.5">
            <b class="font-head text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">{{ store.t("Cumplimiento") }}</b>
            <ul class="space-y-1.5 text-slate-500 dark:text-slate-400">
              <li><RouterLink to="/invoices" class="hover:text-brand">{{ store.t("Facturación CFDI 4.0") }}</RouterLink></li>
              <li><RouterLink to="/projects" class="hover:text-brand">{{ store.t("Fideicomiso por Hitos") }}</RouterLink></li>
              <li><RouterLink to="/dashboard" class="hover:text-brand">{{ store.t("Auditoría Inmutable") }}</RouterLink></li>
            </ul>
          </div>

          <div class="space-y-2.5">
            <b class="font-head text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">{{ store.t("Empresa") }}</b>
            <ul class="space-y-1.5 text-slate-500 dark:text-slate-400">
              <li><a href="#" class="hover:text-brand">{{ store.t("Términos de Servicio") }}</a></li>
              <li><a href="#" class="hover:text-brand">{{ store.t("Aviso de Privacidad") }}</a></li>
              <li><a href="#" class="hover:text-brand">{{ store.t("Soporte Empresarial") }}</a></li>
            </ul>
          </div>
        </div>

        <div class="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© 2026 Buyniverse Technologies. {{ store.t("Todos los derechos reservados.") }}</p>
        </div>
      </footer>
    </div>

    <!-- Social onboarding has a dedicated, uncluttered secure flow. -->
    <div v-else-if="isOnboarding" class="min-h-screen">
      <RouterView />
    </div>

    <!-- ========================================================================= -->
    <!-- 2. AUTHENTICATED WORKSPACE SHELL (For all app routes)                    -->
    <!-- ========================================================================= -->
    <div v-else class="relative flex h-screen overflow-hidden">
      <button v-if="mobileOpen" class="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs md:hidden" aria-label="Close navigation" @click="mobileOpen = false"></button>

      <AppSidebar
        :menu="menu"
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @close-mobile="mobileOpen = false"
        @toggle-collapse="collapsed = !collapsed"
      />

      <div class="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header class="z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 sm:px-6 lg:px-8">
          <div class="flex items-center gap-3">
            <button class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 md:hidden" aria-label="Toggle navigation" @click="toggleNav">
              <i class="fa-solid fa-bars text-xl"></i>
            </button>
            <button class="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 md:hidden dark:border-slate-800 dark:bg-slate-800" :aria-label="store.t('Quick access')" @click="commandOpen = true">
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
            </button>
            <button class="hidden items-center gap-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand md:flex shadow-xs transition" @click="commandOpen = true">
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
              <span>{{ store.t("Quick access") }}</span>
              <kbd class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ctrl K</kbd>
            </button>
            <TenantContextMenu :context="tenantContext" :switching="ui.tenantSwitching" @switch="switchTenantContext" />
            <button
              type="button"
              class="hidden items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-100/70 px-3 py-1.5 text-[11px] font-700 text-slate-600 transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:flex dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-300"
              :title="workspaceShortcutLabel"
              :aria-label="workspaceShortcutLabel"
              @click="openWorkspaceShortcut"
            >
              <i class="fa-solid text-brand text-xs" :class="marketplaceMode === 'buyer' ? 'fa-cart-shopping' : marketplaceMode === 'supplier' ? 'fa-store' : 'fa-shield-halved'"></i>
              {{ activeModeLabel }}
            </button>
          </div>

          <div class="flex items-center gap-3 sm:gap-4">
            <span class="hidden items-center gap-1.5 text-[11px] font-semibold lg:flex" :class="saveStatus.tone" :title="saveStatusTitle" role="status" aria-live="polite">
              <i class="fa-solid text-[10px]" :class="saveStatus.icon"></i>
              {{ saveStatus.label }}
            </span>

            <RouterLink v-if="marketplaceMode === 'buyer'" to="/post-job/new" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex">
              <i class="fa-solid fa-plus text-xs mr-1.5"></i>{{ store.t("Post a Job") }}
            </RouterLink>
            <RouterLink v-else-if="marketplaceMode === 'supplier'" to="/find-work" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex">
              <i class="fa-solid fa-briefcase text-xs mr-1.5"></i>{{ store.t("Find Work") }}
            </RouterLink>
            <RouterLink v-else-if="marketplaceMode === 'admin'" to="/settings/organizations" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex">
              <i class="fa-solid fa-building-shield text-xs mr-1.5"></i>{{ store.t("Manage access") }}
            </RouterLink>

            <!-- Notifications -->
            <div class="relative">
              <button
                class="relative hidden h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400 sm:grid shadow-xs transition"
                :title="store.t('Notifications')"
                :aria-label="store.t('Notifications')"
                :aria-expanded="notificationsOpen"
                @click="closeOverlays('notifications')"
              >
                <i class="fa-regular fa-bell text-sm"></i>
                <span v-if="unreadNotifications.length" class="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white shadow-soft">
                  {{ unreadNotifications.length }}
                </span>
              </button>
              <div v-if="notificationsOpen" class="absolute right-0 top-11 z-50 w-90 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900">
                <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
                  <div>
                    <h2 class="font-head font-bold text-sm">{{ store.t("Notifications") }}</h2>
                    <p class="mt-0.5 text-xs text-slate-500">{{ unreadNotifications.length ? `${unreadNotifications.length} ${store.t("unread")}` : store.t("You are all caught up") }}</p>
                  </div>
                  <button v-if="unreadNotifications.length" class="text-xs font-semibold text-brand hover:underline" @click="store.markAllNotificationsRead(user.id)">
                    {{ store.t("Mark all read") }}
                  </button>
                </div>
                <div class="max-h-96 overflow-y-auto">
                  <RouterLink
                    v-for="notification in visibleNotifications"
                    :key="notification.id"
                    :to="notification.link"
                    class="flex gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    :class="!notification.isRead ? 'bg-brand-50/40 dark:bg-brand/10' : ''"
                    @click="openNotification(notification)"
                  >
                    <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/20">
                      <i class="fa-solid text-sm" :class="notification.icon"></i>
                    </span>
                    <span class="min-w-0">
                      <b class="block text-xs font-bold text-slate-900 dark:text-slate-100">{{ notification.title }}</b>
                      <span class="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{{ notification.text }}</span>
                      <time class="mt-1 block text-[10px] text-slate-400">{{ store.date(notification.at) }}</time>
                    </span>
                  </RouterLink>
                  <div v-if="!visibleNotifications.length" class="p-8 text-center text-sm text-slate-500">
                    <i class="fa-regular fa-bell-slash text-2xl text-slate-300 dark:text-slate-600"></i>
                    <p class="mt-2 text-xs">{{ store.t("No notifications yet.") }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Account Menu -->
            <div class="relative">
              <button
                class="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-xs font-bold text-brand ring-2 ring-transparent hover:ring-brand/30 dark:bg-brand/20 dark:text-brand-200 transition"
                :aria-label="store.t('Account menu')"
                :aria-expanded="accountOpen"
                @click="closeOverlays('account')"
              >
                {{ user.avatar }}
              </button>
              <div v-if="accountOpen" class="absolute right-0 top-11 z-50 max-h-[calc(100vh-5rem)] w-76 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900">
                <div class="border-b border-slate-100 p-4 dark:border-slate-800">
                  <p class="font-head font-bold text-sm">{{ user.name }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
                </div>
                <div class="py-1">
                  <RouterLink :to="`/profile/${user.id}`" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="accountOpen = false">
                    <i class="fa-regular fa-user mr-2.5 w-4 text-slate-400"></i>{{ store.t("View profile") }}
                  </RouterLink>
                  <RouterLink to="/profile/billing" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="accountOpen = false">
                    <i class="fa-regular fa-credit-card mr-2.5 w-4 text-slate-400"></i>{{ store.t("Billing & folios") }}
                  </RouterLink>
                  <RouterLink to="/settings/organizations" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="accountOpen = false">
                    <i class="fa-solid fa-building-shield mr-2.5 w-4 text-slate-400"></i>{{ store.t('Companies & access') }}
                  </RouterLink>
                  <button class="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="lockNow">
                    <i class="fa-solid fa-lock mr-2.5 w-4 text-slate-400"></i>{{ store.t("Lock workspace") }}
                  </button>
                </div>

                <!-- Company Workspace Mode -->
                <section v-if="marketplaceModeOptions.length > 1" class="border-t border-slate-100 p-3.5 dark:border-slate-800">
                  <h2 class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("Company workspace") }}</h2>
                  <div class="grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60" :class="marketplaceModeOptions.length > 2 ? 'grid-cols-3' : 'grid-cols-2'" role="group">
                    <button
                      v-for="option in marketplaceModeOptions"
                      :key="option.key"
                      class="flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-800 transition"
                      :class="marketplaceMode === option.key ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                      @click="switchMarketplaceMode(option.key)"
                    >
                      <i class="fa-solid text-xs" :class="option.icon"></i>{{ store.t(option.label) }}
                    </button>
                  </div>
                </section>

                <!-- Preferences -->
                <section class="border-t border-slate-100 p-3.5 dark:border-slate-800" aria-labelledby="user-preferences-title">
                  <h2 id="user-preferences-title" class="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("Preferences") }}</h2>
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ store.t("Language") }}</span>
                    <div class="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-800 dark:bg-slate-800/60" role="group" aria-label="Language">
                      <button
                        v-for="code in ['en', 'es']"
                        :key="code"
                        class="h-6 rounded-md px-2.5 transition font-bold"
                        :class="locale === code ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700'"
                        @click="setLocale(code)"
                      >
                        {{ code.toUpperCase() }}
                      </button>
                    </div>
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-3">
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ store.t("Theme") }}</span>
                    <button class="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-brand dark:bg-slate-800/60 dark:text-slate-300 transition" @click="toggleTheme">
                      <i class="fa-solid" :class="dark ? 'fa-moon' : 'fa-sun'"></i>
                      {{ store.t(dark ? "Dark mode" : "Light mode") }}
                    </button>
                  </div>
                  <div class="mt-3 rounded-xl border border-brand/15 bg-gradient-to-br from-brand-50/70 via-white to-slate-50 p-2.5 dark:from-brand/10 dark:via-slate-900 dark:to-slate-800/70">
                    <div class="flex items-center gap-2.5">
                      <span class="grid h-8 w-8 place-items-center rounded-lg text-white shadow-sm" :style="{ backgroundColor: currentAccent.accent }">
                        <i class="fa-solid fa-wand-magic-sparkles text-[11px]"></i>
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ store.t("Accent color") }}</span>
                        <span class="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{{ store.t(currentAccent.label) }}</span>
                      </span>
                      <span class="rounded-md bg-white/80 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-brand shadow-xs dark:bg-slate-800/90">{{ store.t("Appearance") }}</span>
                    </div>
                    <div class="mt-2.5 grid grid-cols-6 gap-1.5" role="radiogroup" :aria-label="store.t('Accent color')">
                      <button
                        v-for="option in accents"
                        :key="option.key"
                        type="button"
                        role="radio"
                        class="grid h-7 w-full place-items-center rounded-lg border-2 border-transparent transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                        :class="accent === option.key ? 'border-slate-900/80 shadow-sm dark:border-white' : 'hover:border-slate-400/60 dark:hover:border-slate-500'"
                        :style="{ backgroundColor: option.accent }"
                        :aria-checked="accent === option.key"
                        :aria-label="`${store.t('Change accent color')}: ${store.t(option.label)}`"
                        :title="store.t(option.label)"
                        @click="setAccent(option)"
                      >
                        <i v-if="accent === option.key" class="fa-solid fa-check text-[10px] text-white"></i>
                      </button>
                    </div>
                    <p class="mt-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{{ store.t("Accent applies throughout this workspace.") }}</p>
                  </div>
                </section>

                <!-- Demo Account Selector -->
                <div v-if="showDemoControls" class="border-t border-slate-100 p-3.5 dark:border-slate-800">
                  <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t("Demo account") }}</label>
                  <select class="field py-2 text-xs" :value="store.state.currentUserId" @change="switchUser($event.target.value)">
                    <option v-for="person in store.state.users" :key="person.id" :value="person.id">
                      {{ person.name }} · {{ person.type }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" class="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" tabindex="-1">
          <div class="mx-auto" :class="fullWidth ? 'max-w-none' : 'max-w-7xl'">
            <Breadcrumbs />
            <RouterView :key="route.path" />
          </div>
        </main>
      </div>
    </div>

    <!-- Toast stack -->
    <div v-if="ui.toast" class="pointer-events-none fixed bottom-4 right-4 z-80 flex flex-col gap-2">
      <Transition name="toast">
        <div
          class="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-elevated"
        >
          <i class="fa-solid text-brand" :class="ui.toast.icon || 'fa-circle-check'"></i>
          <span>{{ ui.toast.message || ui.toast.text }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script>
const { inject, computed, ref, watch, nextTick, onMounted, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const CommandPalette = load("./app/components/CommandPalette.vue?v=5");
const Breadcrumbs = load("./app/components/Breadcrumbs.vue?v=4");
const AppModals = load("./app/components/layout/AppModals.vue?v=4");
const AppSidebar = load("./app/components/layout/AppSidebar.vue?v=2");
const AuthModal = load("./app/components/AuthModal.vue?v=5");
const TenantContextMenu = load("./app/components/TenantContextMenu.vue?v=2");

export default {
  components: { Breadcrumbs, CommandPalette, AppModals, AppSidebar, AuthModal, TenantContextMenu },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const collapsed = ref(false), mobileOpen = ref(false);
    const preference = {
      read(key, fallback = "") {
        try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
      },
      write(key, value) {
        try { localStorage.setItem(key, value); } catch (_) { /* Storage can be disabled by privacy controls. */ }
      },
    };
    const dark = ref(preference.read("buyniverse-vue-theme") !== "light");
    const notificationsOpen = ref(false), accountOpen = ref(false), commandOpen = ref(false);
    const authMode = ref(route.query.auth === "register" ? "register" : "login");
    const authOpen = ref(["login", "register"].includes(route.query.auth));
    const locale = store.locale;
    let stopTranslator = () => {};

    watch(() => store.ui.locked, (locked) => {
      if (!locked) return;
      notificationsOpen.value = false;
      accountOpen.value = false;
      commandOpen.value = false;
      authOpen.value = false;
    });

    const isLanding = computed(() => route.path === "/");
    const isOnboarding = computed(() => route.meta.onboarding === true);

    const openAuth = (mode = "login") => {
      authMode.value = mode;
      authOpen.value = true;
    };
    const launchDemo = () => {
      const root = window.location.pathname.startsWith("/buyniverse_vue") ? "/buyniverse_vue/" : "/";
      window.location.assign(`${root}?demo=1#/dashboard`);
    };
    watch(() => route.query.auth, (requested) => {
      if (!["login", "register"].includes(requested)) return;
      authMode.value = requested;
      authOpen.value = true;
    });

    const setLocale = (code) => {
      store.setLocale(code);
      document.title = locale.value === "es" ? "Buyniverse · Plataforma de Compras B2B, Sourcing y Talento Freelance" : "Buyniverse · B2B Procurement & Freelance Platform";
    };

    const accents = [
      { key: "red", label: "Red", accent: "#e5484d", deep: "#c9363c", soft: "#fff1f1", pale: "#ffe3e3" },
      { key: "violet", label: "Violet", accent: "#7c3aed", deep: "#6d28d9", soft: "#f5f3ff", pale: "#ede9fe" },
      { key: "blue", label: "Blue", accent: "#2563eb", deep: "#1d4ed8", soft: "#eff6ff", pale: "#dbeafe" },
      { key: "teal", label: "Teal", accent: "#0f766e", deep: "#115e59", soft: "#f0fdfa", pale: "#ccfbf1" },
      { key: "orange", label: "Orange", accent: "#ea580c", deep: "#c2410c", soft: "#fff7ed", pale: "#ffedd5" },
      { key: "pink", label: "Pink", accent: "#db2777", deep: "#be185d", soft: "#fdf2f8", pale: "#fce7f3" },
    ];

    const applyAccent = (opt) => {
      document.documentElement.style.setProperty("--accent", opt.accent);
      document.documentElement.style.setProperty("--accent-deep", opt.deep);
      document.documentElement.style.setProperty("--accent-soft", opt.soft);
      document.documentElement.style.setProperty("--accent-pale", opt.pale);
    };

    const savedAccent = preference.read("buyniverse-vue-accent", "red");
    const accent = ref(accents.some((x) => x.key === savedAccent) ? savedAccent : "red");
    applyAccent(accents.find((x) => x.key === accent.value));
    const currentAccent = computed(() => accents.find((x) => x.key === accent.value) || accents[0]);

    const user = store.currentUser, marketplaceMode = store.marketplaceMode, tenantContext = store.tenantContext;
    const marketplaceModeOptions = computed(() => {
      const meta = { buyer: { key: "buyer", label: "Buy", icon: "fa-cart-shopping" }, supplier: { key: "supplier", label: "Sell", icon: "fa-store" }, admin: { key: "admin", label: "Admin", icon: "fa-shield-halved" } };
      return store.marketplaceModes.value.map((m) => meta[m]);
    });
    const activeModeLabel = computed(() => marketplaceModeOptions.value.find((o) => o.key === marketplaceMode.value)?.label || "Workspace");

    const visibleNotifications = computed(() => store.userNotifications(user.value?.id || ""));
    const unreadNotifications = computed(() => store.unreadNotifications(user.value?.id || ""));
    const saveStatus = computed(() => {
      if (store.ui.saveState === "connecting") return { label: store.t("Connecting secure workspace…"), icon: "fa-arrows-rotate fa-spin", tone: "text-sky-600 dark:text-sky-300" };
      if (store.ui.saveState === "saving") return { label: store.t("Saving securely…"), icon: "fa-arrows-rotate fa-spin", tone: "text-amber-600 dark:text-amber-400" };
      if (store.ui.saveState === "error") return { label: store.t("Secure save unavailable"), icon: "fa-triangle-exclamation", tone: "text-rose-600 dark:text-rose-400" };
      if (store.ui.saveState === "demo") return { label: store.t("Local demo · not synced"), icon: "fa-flask", tone: "text-amber-600 dark:text-amber-400" };
      return { label: store.t("Saved to workspace"), icon: "fa-shield-halved", tone: "text-emerald-600 dark:text-emerald-400" };
    });
    const saveStatusTitle = computed(() => store.isDemo.value
      ? store.t("The public demo uses fictional data and never connects to a production workspace.")
      : store.t("Workspace changes are encrypted and saved on the server."));

    const setAccent = (opt) => {
      if (!opt || !accents.some((item) => item.key === opt.key)) return;
      accent.value = opt.key;
      applyAccent(opt);
      preference.write("buyniverse-vue-accent", opt.key);
    };
    const closeOverlays = (kind) => {
      notificationsOpen.value = kind === "notifications" ? !notificationsOpen.value : false;
      accountOpen.value = kind === "account" ? !accountOpen.value : false;
    };
    const openNotification = (n) => { store.markNotificationRead(n); notificationsOpen.value = false; };
    const showDemoControls = computed(() => store.isDemo.value);
    const switchUser = (id) => {
      if (!showDemoControls.value) return;
      store.selectUser(id);
      accountOpen.value = false;
      router.replace("/dashboard");
      store.notice("Demo account switched");
    };
    const switchMarketplaceMode = (mode) => {
      if (!store.setMarketplaceMode(mode)) return;
      accountOpen.value = false;
      router.replace(mode === "supplier" ? "/find-work" : "/dashboard");
      store.notice(mode === "buyer" ? "Buyer workspace active" : mode === "supplier" ? "Supplier workspace active" : "Administration workspace active");
    };
    const switchTenantContext = async ({ companyId, locationId }) => {
      const switched = await store.switchTenantContext(companyId, locationId);
      if (!switched) return;
      accountOpen.value = false;
      router.replace("/dashboard");
      store.notice(store.t("Company context switched"), "fa-building-shield");
    };
    const openPurchasingWorkspace = () => {
      const switched = marketplaceMode.value !== "buyer";
      if (!store.setMarketplaceMode("buyer")) {
        store.notice("Buyer workspace is unavailable for this account", "fa-shield-halved");
        return;
      }
      accountOpen.value = false;
      router.push("/procurement");
      if (switched) store.notice("Buyer workspace active");
    };
    const workspaceShortcutLabel = computed(() => marketplaceMode.value === "admin"
      ? store.t("Open administration control center")
      : store.t("Open purchasing workspace"));
    const openWorkspaceShortcut = () => {
      if (marketplaceMode.value === "admin") {
        router.push("/settings/organizations");
        return;
      }
      openPurchasingWorkspace();
    };

    const toggleNav = () => { if (window.innerWidth < 768) mobileOpen.value = !mobileOpen.value; else collapsed.value = !collapsed.value; };
    const toggleTheme = () => {
      dark.value = !dark.value;
      document.documentElement.classList.toggle("dark", dark.value);
      preference.write("buyniverse-vue-theme", dark.value ? "dark" : "light");
    };

    let lastActivity = Date.now(), sessionTimer = 0;
    const touchSession = () => { if (!store.ui.locked) lastActivity = Date.now(); };
    const keyHandler = (e) => {
      touchSession();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && store.currentUser.value) { e.preventDefault(); commandOpen.value = !commandOpen.value; }
      else if (e.key === "Escape") commandOpen.value = false;
    };
    const lockNow = () => { accountOpen.value = false; commandOpen.value = false; store.lockSession("Manual privacy lock"); };
    const resumeSession = () => { store.unlockSession(); touchSession(); };

    onMounted(() => {
      stopTranslator = window.BuyniverseI18n.install(document.body);
      setLocale(locale.value);
      window.addEventListener("pointerdown", touchSession, { passive: true });
      window.addEventListener("keydown", keyHandler);
      sessionTimer = window.setInterval(() => {
        if (!store.ui.locked && Date.now() - lastActivity >= 15 * 60 * 1000) store.lockSession("15 minutes of inactivity");
      }, 30000);
      nextTick(() => window.requestAnimationFrame(() => window.dispatchEvent(new Event("buyniverse:app-shell-ready"))));
    });

    onBeforeUnmount(() => {
      window.removeEventListener("pointerdown", touchSession);
      window.removeEventListener("keydown", keyHandler);
      window.clearInterval(sessionTimer);
      stopTranslator();
    });

    document.documentElement.classList.toggle("dark", dark.value);

    const menu = computed(() => {
      const localize = (sections) => sections.map((section) => ({
        ...section,
        title: store.t(section.title),
        items: section.items.map((item) => ({ ...item, label: store.t(item.label) })),
      }));
      const core = { title: "", items: [{ to: "/dashboard", icon: "fa-solid fa-tachometer-alt", label: "Dashboard" }] };
      const purchases = { to: "/procurement", icon: "fa-solid fa-cart-shopping", label: "Purchases" };
      if (marketplaceMode.value === "buyer") return localize([
        core,
        { title: "", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, purchases, { to: "/suppliers", icon: "fa-solid fa-building-circle-check", label: "Suppliers" }, { to: "/products", icon: "fa-solid fa-boxes-stacked", label: "Products" }, { to: "/expenses", icon: "fa-solid fa-money-bill-wave", label: "Expenses" }] },
        { title: "Payables", items: [{ to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }, { to: "/payments", icon: "fa-solid fa-credit-card", label: "Payments" }] },
        { title: "Discover", items: [{ to: "/find-talent", icon: "fa-solid fa-users", label: "Find Talent" }, { to: "/browse-services", icon: "fa-solid fa-store", label: "Browse Services" }, { to: "/messages", icon: "fa-solid fa-comments", label: "Messages" }] },
      ]);
      if (marketplaceMode.value === "admin") return localize([
        core,
        { title: "Identity & control", items: [{ to: "/settings/organizations", icon: "fa-solid fa-building-shield", label: "Companies & access" }, { to: "/admin/issuers", icon: "fa-solid fa-file-invoice-dollar", label: "Fiscal issuers" }, { to: "/procurement/governance", icon: "fa-solid fa-scale-balanced", label: "Policies & audit" }] },
        { title: "Operational oversight", items: [{ to: "/procurement/cockpit", icon: "fa-solid fa-binoculars", label: "Procurement oversight" }, { to: "/projects", icon: "fa-solid fa-folder-tree", label: "Project oversight" }, { to: "/invoices", icon: "fa-solid fa-receipt", label: "Invoice oversight" }] },
      ]);
      return localize([
        core,
        { title: "Delivery", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, { to: "/procurement/auction", icon: "fa-solid fa-gavel", label: "Live Offers" }] },
        { title: "Find work", items: [{ to: "/find-work", icon: "fa-solid fa-briefcase", label: "Find Work" }, { to: "/saved-jobs", icon: "fa-solid fa-bookmark", label: "Saved Jobs" }] },
        { title: "Sales", items: [{ to: "/leads", icon: "fa-solid fa-bullseye", label: "Leads" }, { to: "/clients", icon: "fa-solid fa-user-tie", label: "Clients" }, { to: "/estimates", icon: "fa-solid fa-file-invoice", label: "Estimates" }, { to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }, { to: "/payments", icon: "fa-solid fa-credit-card", label: "Payments" }, { to: "/messages", icon: "fa-solid fa-comments", label: "Messages" }] },
      ]);
    });

    return {
      store, ui: store.ui, user, marketplaceMode, marketplaceModeOptions, activeModeLabel, tenantContext, switchMarketplaceMode, switchTenantContext, openPurchasingWorkspace, openWorkspaceShortcut, workspaceShortcutLabel,
      route, isLanding, isOnboarding, locale, setLocale, collapsed, mobileOpen, toggleNav, dark, toggleTheme, menu, notificationsOpen,
      accountOpen, commandOpen, authOpen, authMode, openAuth, launchDemo, accents, accent, currentAccent, setAccent, closeOverlays, visibleNotifications, saveStatus, saveStatusTitle,
      unreadNotifications, openNotification, switchUser, showDemoControls, lockNow, resumeSession,
      fullWidth: computed(() => isLanding.value || route.path === "/find-work" || route.path.includes("/contest") || route.path.startsWith("/post-job/") || route.path.startsWith("/procurement")),
    };
  },
};
</script>
