<template>
  <main class="bn bn-ob bn-setup" aria-labelledby="setup-title">
    <div class="bn-ob__wrap">
      <header class="bn-ob__top">
        <RouterLink to="/dashboard" class="bn-logo" :aria-label="t('Buyniverse home')"><img src="assets/brand/buyniverse-ring.svg?v=1" alt="" width="42" height="42" /><span class="bn-logo__word">buy<b>niverse</b></span></RouterLink>
        <span class="bn-ob__secure"><i class="fa-solid fa-shield-halved"></i>{{ t("Validated on the server") }}</span>
      </header>

      <section v-if="phase === 'loading'" class="bn-ob__card bn-ob__body" role="status"><p class="bn-ob__lead"><i class="fa-solid fa-circle-notch fa-spin"></i> {{ t("Loading your company…") }}</p></section>

      <section v-else-if="phase === 'unavailable'" class="bn-ob__card">
        <div class="bn-ob__head"><h1 id="setup-title" class="bn-ob__title">{{ t(unavailableTitle) }}</h1><p class="bn-ob__lead">{{ t(unavailableLead) }}</p></div>
        <div class="bn-ob__foot"><span></span><RouterLink :to="store.currentUser.value ? '/dashboard' : '/?auth=login'" class="bn-btn bn-btn--primary">{{ t(store.currentUser.value ? "Go to my workspace" : "Sign in") }}</RouterLink></div>
      </section>

      <div v-else class="bn-ob__layout bn-ob__layout--split">
        <section class="bn-ob__card">
          <div class="bn-ob__head">
            <p class="bn-ob__eyebrow">{{ t("Company setup") }}</p>
            <h1 id="setup-title" class="bn-ob__title">{{ t("Get your company ready to operate") }}</h1>
            <p class="bn-ob__lead">{{ st.company.legalName }} · <span class="bn-ob__mono">{{ st.company.rfc || st.company.taxIdentifier || "—" }}</span></p>
          </div>

          <nav class="bn-ob__steps" :aria-label="t('Steps')">
            <button v-for="(item, index) in visibleSteps" :key="item.id" type="button" :aria-current="cur === item.id ? 'step' : null" :class="{ 'is-done': isDone(item.id) }" @click="open(item.id)"><span>{{ isDone(item.id) ? "✓" : index + 1 }}</span>{{ t(item.label) }}</button>
          </nav>

          <div class="bn-ob__body">
            <div v-if="!st.canManage" class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-lock"></i><div><b>{{ t("Read only") }}</b>{{ t("Only company administrators can change these settings. You can review the progress.") }}</div></div>
            <div v-if="error" class="bn-ob__alert bn-ob__alert--error" role="alert"><i class="fa-solid fa-circle-exclamation"></i><div><b>{{ t("Review your details") }}</b>{{ error }}</div></div>
            <div v-if="notice" class="bn-ob__alert bn-ob__alert--ok" role="status"><i class="fa-solid fa-circle-check"></i><div>{{ notice }}</div></div>

            <!-- 1. company + constancia -->
            <form v-if="cur === 'company'" class="bn-ob__fields" @submit.prevent="saveCompany">
              <h2 class="bn-setup__h">{{ t("Company and fiscal data") }}</h2>
              <label v-if="st.canManage && st.company.countryCode === 'MX'" class="bn-setup__drop">
                <input type="file" accept="application/pdf" hidden :disabled="reading" @change="readConstancia" />
                <i class="fa-solid" :class="reading ? 'fa-circle-notch fa-spin' : (fromConstancia ? 'fa-circle-check' : 'fa-file-pdf')"></i>
                <span><b>{{ reading ? t("Reading your constancia…") : (fromConstancia ? t("Data taken from your constancia: review and save.") : t("Upload your Constancia de Situación Fiscal (PDF)")) }}</b>
                  <small>{{ t("We read it in your browser; the file is not uploaded. We fill in RFC, name, postal code, regime and address. You can type everything by hand instead.") }}</small></span>
              </label>
              <div v-if="regimeChoices.length > 1" class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-circle-info"></i><div>{{ t("Your constancia lists several regimes; choose the one you invoice with.") }}</div></div>
              <div class="bn-ob__grid">
                <label class="bn-field bn-ob__wide"><span>{{ t(isPerson ? "Full name" : "Legal name") }}</span><input v-model.trim="co.legalName" class="bn-input" maxlength="220" :disabled="!st.canManage" required />
                  <small v-if="st.company.countryCode === 'MX'" class="bn-ob__help">{{ t("Exactly as in your constancia, without the corporate suffix (S.A. de C.V.): that is how the SAT validates your invoices.") }}</small></label>
                <label v-if="st.company.countryCode === 'MX'" class="bn-field"><span>RFC</span><input v-model.trim="co.rfc" class="bn-input bn-ob__mono" maxlength="13" :disabled="!st.canManage || !!st.company.rfc" @input="co.rfc = co.rfc.toUpperCase()" required />
                  <small class="bn-ob__help">{{ st.company.rfc ? t("The RFC is your company's identity and cannot be changed here.") : t(personType ? (personType === 'moral' ? "Legal entity (persona moral)" : "Individual (persona física)") : "12 characters for a legal entity, 13 for an individual") }}</small></label>
                <label v-if="st.company.countryCode === 'MX'" class="bn-field"><span>{{ t("Tax regime") }} <b>*</b></span>
                  <select v-model="co.taxRegime" class="bn-select" :disabled="!st.canManage || !personType" required><option value="">{{ t(personType ? "Choose…" : "Enter your RFC first") }}</option><option v-for="item in regimes" :key="item.code" :value="item.code">{{ item.code }} · {{ item.name }}</option></select></label>
                <label class="bn-field"><span>{{ t("Postal code") }}</span><input v-model.trim="co.postalCode" class="bn-input bn-ob__mono" maxlength="24" inputmode="numeric" :disabled="!st.canManage" required />
                  <small v-if="isMx && postal.state === 'unknown'" class="bn-ob__check bn-ob__check--error"><i class="fa-solid fa-circle-xmark"></i>{{ t("This postal code is not in the SAT catalogue.") }}</small>
                  <small v-else-if="isMx && postal.info" class="bn-ob__check bn-ob__check--ok"><i class="fa-solid fa-circle-check"></i>{{ postal.info.municipality || postal.info.city }}, {{ postal.info.stateName }}</small></label>
                <label v-if="isMx && postal.info && postal.info.neighborhoods.length" class="bn-field"><span>{{ t("Colonia") }}</span>
                  <select v-model="co.neighborhood" class="bn-select" :disabled="!st.canManage"><option value="">{{ t("Choose…") }}</option><option v-for="item in postal.info.neighborhoods" :key="item" :value="item">{{ item }}</option></select></label>
                <label v-else-if="!isMx" class="bn-field"><span>{{ t("City") }}</span><input v-model.trim="co.city" class="bn-input" maxlength="120" :disabled="!st.canManage" required /></label>
                <label class="bn-field bn-ob__wide"><span>{{ t("Street and number") }}</span><input v-model.trim="co.street" class="bn-input" maxlength="240" :disabled="!st.canManage" required /></label>
                <label class="bn-field"><span>{{ t("Trade name") }}</span><input v-model.trim="co.tradeName" class="bn-input" maxlength="160" :placeholder="t('How your customers know you')" :disabled="!st.canManage" /></label>
                <label class="bn-field"><span>{{ t("Phone") }}</span><input v-model.trim="co.phone" class="bn-input" type="tel" maxlength="40" :disabled="!st.canManage" required /></label>
                <label class="bn-field"><span>{{ t("Email to receive invoices") }}</span><input v-model.trim="co.billingEmail" class="bn-input" type="email" maxlength="190" :disabled="!st.canManage" required /></label>
                <label class="bn-field"><span>{{ t("Website") }}</span><input v-model.trim="co.website" class="bn-input" maxlength="200" placeholder="https://" :disabled="!st.canManage" /></label>
              </div>
              <div v-if="st.canManage" class="bn-ob__foot" style="padding: 0; border: 0"><span></span><button class="bn-btn bn-btn--primary" :disabled="busy"><i class="fa-solid" :class="busy ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'"></i>{{ t("Save and continue") }}</button></div>
            </form>

            <!-- 2. places -->
            <div v-else-if="cur === 'locations'" class="bn-ob__fields">
              <h2 class="bn-setup__h">{{ t("Branches and warehouses") }}</h2>
              <p class="bn-ob__lead">{{ t("Every place where you operate. The postal code of a place is the expedition place of the invoices issued from it.") }}</p>
              <ul v-if="st.locations.length" class="bn-setup__list">
                <li v-for="place in st.locations" :key="place.id" :class="{ 'is-off': !place.active }">
                  <div><b>{{ place.name }}</b> <small class="bn-ob__mono">{{ place.code }}</small><br /><small>{{ t(place.kind === "warehouse" ? "Warehouse" : "Branch") }} · {{ place.street }}<template v-if="place.neighborhood">, {{ place.neighborhood }}</template> · <span class="bn-ob__mono" :class="{ 'is-bad': !/^\d{5}$/.test(place.postalCode) }">{{ place.postalCode || "—" }}</span><template v-if="!place.active"> · {{ t("Inactive") }}</template></small></div>
                  <button v-if="st.canManage" type="button" class="bn-btn bn-btn--ghost bn-btn--sm" @click="editPlace(place)">{{ t("Edit") }}</button>
                </li>
              </ul>
              <p v-else class="bn-ob__hint"><i class="fa-solid fa-circle-info"></i>{{ t("You have not added any place yet.") }}</p>
              <form v-if="st.canManage" class="bn-ob__box" @submit.prevent="savePlace">
                <legend>{{ t(lf.id ? "Edit place" : "Add a place") }}</legend>
                <div class="bn-ob__grid">
                  <label class="bn-field"><span>{{ t("Type") }} <b>*</b></span><select v-model="lf.kind" class="bn-select" :disabled="!!lf.id"><option value="warehouse">{{ t("Warehouse") }}</option><option value="branch">{{ t("Branch") }}</option></select></label>
                  <label class="bn-field"><span>{{ t("Code") }}</span><input v-model.trim="lf.code" class="bn-input bn-ob__mono" maxlength="40" :disabled="!!lf.id" placeholder="BOD-01" required @input="lf.code = lf.code.toUpperCase()" /></label>
                  <label class="bn-field bn-ob__wide"><span>{{ t("Name") }}</span><input v-model.trim="lf.name" class="bn-input" maxlength="160" :placeholder="t('E.g. North warehouse')" required /></label>
                  <label class="bn-field bn-ob__wide"><span>{{ t("Street and number") }}</span><input v-model.trim="lf.street" class="bn-input" maxlength="240" required /></label>
                  <label class="bn-field"><span>{{ t("Postal code") }}</span><input v-model.trim="lf.postalCode" class="bn-input bn-ob__mono" maxlength="24" inputmode="numeric" required />
                    <small v-if="isMx && lpostal.state === 'unknown'" class="bn-ob__check bn-ob__check--error"><i class="fa-solid fa-circle-xmark"></i>{{ t("This postal code is not in the SAT catalogue.") }}</small>
                    <small v-else-if="isMx && lpostal.info" class="bn-ob__check bn-ob__check--ok"><i class="fa-solid fa-circle-check"></i>{{ lpostal.info.municipality || lpostal.info.city }}, {{ lpostal.info.stateName }}</small></label>
                  <label v-if="isMx && lpostal.info && lpostal.info.neighborhoods.length" class="bn-field"><span>{{ t("Colonia") }}</span><select v-model="lf.neighborhood" class="bn-select"><option value="">{{ t("Choose…") }}</option><option v-for="item in lpostal.info.neighborhoods" :key="item" :value="item">{{ item }}</option></select></label>
                  <label v-else-if="!isMx" class="bn-field"><span>{{ t("City") }}</span><input v-model.trim="lf.city" class="bn-input" maxlength="120" required /></label>
                  <label class="bn-field"><span>{{ t("Phone") }}</span><input v-model.trim="lf.phone" class="bn-input" type="tel" maxlength="40" /></label>
                  <label v-if="lf.id" class="bn-ob__confirm"><input v-model="lf.active" type="checkbox" /><span><b>{{ t("Active") }}</b>{{ t("An inactive place stops being offered for new documents; its history stays.") }}</span></label>
                </div>
                <div class="bn-ob__foot" style="padding: 0; border: 0"><button v-if="lf.id" type="button" class="bn-btn bn-btn--ghost" @click="resetPlace">{{ t("Cancel") }}</button><span v-else></span><button class="bn-btn bn-btn--primary" :disabled="busy"><i class="fa-solid fa-floppy-disk"></i>{{ t(lf.id ? "Save place" : "Add place") }}</button></div>
              </form>
            </div>

            <!-- 3. series -->
            <div v-else-if="cur === 'series'" class="bn-ob__fields">
              <h2 class="bn-setup__h">{{ t("Series and folios") }}</h2>
              <p class="bn-ob__lead">{{ t("Each kind of fiscal document has a series and a consecutive folio. Choose the starting number before you issue the first document.") }}</p>
              <ul class="bn-setup__list">
                <li v-for="row in seriesRows" :key="row.kind">
                  <div><b>{{ t(KIND_LABEL[row.kind]) }}</b><br /><small>{{ row.rule ? t("Next folio") + ": " + (row.next || "—") : t("Not created yet") }}</small></div>
                  <div class="bn-setup__inline">
                    <input v-model.trim="row.series" class="bn-input bn-ob__mono" maxlength="25" :aria-label="t('Series')" :disabled="!st.canManage" @input="row.series = row.series.toUpperCase()" />
                    <input v-model.number="row.start" class="bn-input bn-ob__mono" type="number" min="1" :aria-label="t('Starting folio')" :disabled="!st.canManage || row.used" />
                    <button v-if="st.canManage" type="button" class="bn-btn bn-btn--ghost bn-btn--sm" :disabled="busy" @click="saveSeries(row)">{{ t("Save") }}</button>
                  </div>
                </li>
              </ul>
              <p class="bn-ob__hint"><i class="fa-solid fa-circle-info"></i>{{ t("Credit notes and payment complements are issued with their own series.") }}</p>
            </div>

            <!-- 4. CSD -->
            <div v-else-if="cur === 'csd'" class="bn-ob__fields">
              <h2 class="bn-setup__h">{{ t("Digital seal certificate (CSD)") }}</h2>
              <div class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-lock"></i><div><b>{{ t("Your CSD, not your e.firma") }}</b>{{ t("We check that the key opens with the password, matches the certificate, belongs to your RFC and is current, before anything is stored. The password is never kept.") }}</div></div>
              <div v-if="st.steps.csd.done" class="bn-ob__alert bn-ob__alert--ok"><i class="fa-solid fa-circle-check"></i><div><b>{{ t("CSD loaded") }}</b>{{ t("Certificate") }} <span class="bn-ob__mono">{{ st.company.issuance.certificateNumber }}</span> · {{ t("valid until") }} {{ day(st.company.issuance.certificateValidTo) }}</div></div>
              <div v-else-if="st.steps.csd.code === 'pending_pac'" class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-hourglass-half"></i><div><b>{{ t("CSD protected") }}</b>{{ t("Stamping activates as soon as the PAC confirms your certificate.") }}</div></div>
              <template v-if="st.canManage">
                <div class="bn-ob__grid">
                  <label class="bn-field"><span>{{ t("Certificate (.cer)") }} <b>*</b></span><input ref="cerInput" class="bn-input" type="file" accept=".cer" @change="csd.cer = $event.target.files[0] || null; csd.report = null" /></label>
                  <label class="bn-field"><span>{{ t("Private key (.key)") }} <b>*</b></span><input ref="keyInput" class="bn-input" type="file" accept=".key" @change="csd.key = $event.target.files[0] || null; csd.report = null" /></label>
                  <label class="bn-field bn-ob__wide"><span>{{ t("Private key password") }} <b>*</b></span><input v-model="csd.password" class="bn-input" type="password" maxlength="512" autocomplete="new-password" @input="csd.report = null" /></label>
                </div>
                <div class="bn-ob__foot" style="padding: 0; border: 0">
                  <button type="button" class="bn-btn bn-btn--ghost" :disabled="busy || !csdReady" @click="verifyCsd"><i class="fa-solid fa-magnifying-glass"></i>{{ t("Verify") }}</button>
                  <button type="button" class="bn-btn bn-btn--primary" :disabled="busy || !csd.report || !csd.report.ok" @click="saveCsd"><i class="fa-solid fa-shield-halved"></i>{{ t("Protect and send to the PAC") }}</button>
                </div>
                <div v-if="csd.report" class="bn-ob__alert" :class="csd.report.ok ? 'bn-ob__alert--ok' : 'bn-ob__alert--error'"><i class="fa-solid" :class="csd.report.ok ? 'fa-circle-check' : 'fa-circle-xmark'"></i>
                  <div v-if="csd.report.ok"><b>{{ t("The CSD is valid") }}</b>RFC <span class="bn-ob__mono">{{ csd.report.rfc }}</span> · {{ t("Certificate") }} <span class="bn-ob__mono">{{ csd.report.number }}</span> · {{ t("valid until") }} {{ day(csd.report.validTo) }} ({{ csd.report.daysLeft }} {{ t("days") }})</div>
                  <div v-else><b>{{ t("The CSD has problems") }}</b>{{ csd.report.error }}</div></div>
              </template>
            </div>

            <!-- 5. stamps -->
            <div v-else-if="cur === 'stamps'" class="bn-ob__fields">
              <h2 class="bn-setup__h">{{ t("Stamps to invoice") }}</h2>
              <div class="bn-ob__alert" :class="st.company.issuance.stampsBalance > 0 ? 'bn-ob__alert--ok' : 'bn-ob__alert--info'"><i class="fa-solid fa-stamp"></i><div><b>{{ st.company.issuance.stampsBalance }}</b> {{ t("stamps available") }}</div></div>
              <div v-if="!st.pac.connected" class="bn-ob__alert bn-ob__alert--error"><i class="fa-solid fa-plug-circle-xmark"></i><div><b>{{ t("Stamping service not connected") }}</b>{{ t("Buyniverse has not connected the stamping service yet. Your setup is saved; invoicing starts when it is connected.") }}</div></div>
              <div v-else-if="!st.pac.live" class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-flask"></i><div><b>{{ t("Test environment") }}</b>{{ t("Stamping is connected to the PAC's test environment: invoices issued now are not valid before the SAT until production is enabled.") }}</div></div>
              <p class="bn-ob__lead">{{ t("Stamps are credited to your company by Buyniverse once your invoicing plan is confirmed. Contact support to add stamps.") }}</p>
              <RouterLink to="/soporte?topic=billing" class="bn-btn bn-btn--ghost"><i class="fa-solid fa-life-ring"></i>{{ t("Contact support") }}</RouterLink>
            </div>

            <!-- 6. team -->
            <div v-else-if="cur === 'team'" class="bn-ob__fields">
              <h2 class="bn-setup__h">{{ t("Team and access") }}</h2>
              <h3 class="bn-setup__h3">{{ t("People with access") }}</h3>
              <ul class="bn-setup__list"><li v-for="(member, index) in st.team.members" :key="index"><div><b>{{ member.name || "—" }}</b><br /><small>{{ t(ROLE_LABEL[member.role] || member.role) }} · {{ t(member.scope === "tenant" ? "All companies" : (member.scope === "location" ? "One place" : "This company")) }}</small></div></li></ul>
              <template v-if="st.team.invitations.length"><h3 class="bn-setup__h3">{{ t("Pending invitations") }}</h3>
                <ul class="bn-setup__list"><li v-for="item in st.team.invitations" :key="item.id"><div><b class="bn-ob__mono">{{ item.email }}</b><br /><small>{{ t(ROLE_LABEL[item.role] || item.role) }} · {{ t("expires") }} {{ day(item.expiresAt) }}</small></div>
                  <button v-if="st.canManage" type="button" class="bn-btn bn-btn--ghost bn-btn--sm" :disabled="busy" @click="revoke(item)">{{ t("Revoke") }}</button></li></ul></template>
              <form v-if="st.canManage" class="bn-ob__box" @submit.prevent="invite">
                <legend>{{ t("Invite a person") }}</legend>
                <div class="bn-ob__grid">
                  <label class="bn-field bn-ob__wide"><span>{{ t("Email") }}</span><input v-model.trim="iv.email" class="bn-input" type="email" maxlength="190" required />
                    <small class="bn-ob__help">{{ t("They join by signing in with a provider that verifies this email.") }}</small></label>
                  <label class="bn-field"><span>{{ t("What do they do?") }} <b>*</b></span><select v-model="iv.role" class="bn-select"><option v-for="item in ROLES" :key="item" :value="item">{{ t(ROLE_LABEL[item]) }}</option></select></label>
                  <label class="bn-field"><span>{{ t("Where?") }}</span><select v-model="iv.locationId" class="bn-select"><option value="">{{ t("This whole company") }}</option><option v-for="place in activePlaces" :key="place.id" :value="place.id">{{ place.name }}</option></select></label>
                </div>
                <div class="bn-ob__foot" style="padding: 0; border: 0"><span></span><button class="bn-btn bn-btn--primary" :disabled="busy"><i class="fa-solid fa-paper-plane"></i>{{ t("Send invitation") }}</button></div>
              </form>
            </div>

            <!-- 7. payments -->
            <form v-else-if="cur === 'payments'" class="bn-ob__fields" @submit.prevent="savePayout">
              <h2 class="bn-setup__h">{{ t("Where you get paid") }}</h2>
              <p class="bn-ob__lead">{{ t("The bank account that receives your payouts. We store it encrypted and show only its last four digits.") }}</p>
              <div v-if="st.payout" class="bn-ob__alert bn-ob__alert--ok"><i class="fa-solid fa-circle-check"></i><div><b>{{ st.payout.bank }}</b>CLABE ···· {{ st.payout.last4 }} · {{ st.payout.holder }}</div></div>
              <div class="bn-ob__grid">
                <label class="bn-field bn-ob__wide"><span>{{ t("Account holder") }}</span><input v-model.trim="pf.holder" class="bn-input" maxlength="220" :disabled="!st.canManage" required />
                  <small v-if="holderDiffers" class="bn-ob__check bn-ob__check--warn"><i class="fa-solid fa-triangle-exclamation"></i>{{ t("The holder differs from your legal name; payouts to third parties may be held for review.") }}</small></label>
                <label class="bn-field bn-ob__wide"><span>CLABE</span><input v-model="pf.clabe" class="bn-input bn-ob__mono" inputmode="numeric" maxlength="22" autocomplete="off" :disabled="!st.canManage" required @input="pf.clabe = pf.clabe.replace(/\D/g, '').slice(0, 18)" />
                  <small v-if="pf.clabe.length === 18 && !clabeOk" class="bn-ob__check bn-ob__check--error"><i class="fa-solid fa-circle-xmark"></i>{{ t("The CLABE is not valid. Check the digits.") }}</small>
                  <small v-else-if="pf.clabe.length === 18" class="bn-ob__check bn-ob__check--ok"><i class="fa-solid fa-circle-check"></i>{{ bankName }}</small>
                  <small v-else class="bn-ob__help">{{ t("18 digits") }}</small></label>
              </div>
              <div v-if="st.canManage" class="bn-ob__foot" style="padding: 0; border: 0"><span></span><button class="bn-btn bn-btn--primary" :disabled="busy || !clabeOk"><i class="fa-solid fa-floppy-disk"></i>{{ t("Save account") }}</button></div>
            </form>

            <!-- 8. review -->
            <div v-else-if="cur === 'review'" class="bn-ob__fields">
              <h2 class="bn-setup__h">{{ t("Final review") }}</h2>
              <div class="bn-ob__alert" :class="st.ready ? 'bn-ob__alert--ok' : 'bn-ob__alert--info'"><i class="fa-solid" :class="st.ready ? 'fa-circle-check' : 'fa-list-check'"></i><div><b>{{ t(st.ready ? "Your company is ready to operate" : "Some required items are still open") }}</b>{{ t("Items marked for the platform are handled by Buyniverse.") }}</div></div>
              <section v-for="area in st.audit" :key="area.area" class="bn-setup__area">
                <h3 class="bn-setup__h3">{{ t(AREA_LABEL[area.area] || area.area) }}</h3>
                <ul class="bn-setup__checks"><li v-for="item in area.items" :key="item.id" :class="'is-' + item.state">
                  <i class="fa-solid" :class="STATE_ICON[item.state]"></i><span>{{ itemLabel(item) }}<small v-if="item.level === 'platform'"> · {{ t("Buyniverse") }}</small></span>
                  <button v-if="item.step && item.state !== 'ok' && item.state !== 'na'" type="button" class="bn-ob__link" @click="open(item.step)">{{ t("Fix") }}</button></li></ul>
              </section>
            </div>
          </div>

          <footer class="bn-ob__foot">
            <button v-if="stepIndex > 0" type="button" class="bn-btn bn-btn--ghost" @click="open(visibleSteps[stepIndex - 1].id)"><i class="fa-solid fa-arrow-left"></i>{{ t("Back") }}</button><span v-else></span>
            <button v-if="stepIndex < visibleSteps.length - 1" type="button" class="bn-btn bn-btn--primary" @click="open(visibleSteps[stepIndex + 1].id)">{{ t("Continue") }}<i class="fa-solid fa-arrow-right"></i></button>
            <RouterLink v-else to="/dashboard" class="bn-btn bn-btn--primary">{{ t(st.ready ? "Go to my workspace" : "Finish later") }}<i class="fa-solid fa-arrow-right"></i></RouterLink>
          </footer>
        </section>

        <aside class="bn-ob__side">
          <section class="bn-ob__card" aria-live="polite">
            <h3>{{ t("Progress") }}</h3>
            <p>{{ t("What each step needs, checked on the server.") }}</p>
            <div class="bn-ob__summary"><span :class="{ 'is-ready': st.ready }">{{ st.ready ? t("Ready") : doneCount + " / " + requiredCount + " " + t("required") }}</span></div>
            <ul class="bn-setup__checks">
              <li v-for="item in visibleSteps.filter((s) => s.id !== 'review')" :key="item.id" :class="isDone(item.id) ? 'is-ok' : (st.steps[item.id].required ? 'is-todo' : 'is-optional')">
                <i class="fa-solid" :class="isDone(item.id) ? 'fa-circle-check' : (st.steps[item.id].required ? 'fa-circle-exclamation' : 'fa-circle')"></i>
                <span><button type="button" class="bn-ob__link" @click="open(item.id)">{{ t(item.label) }}</button><small>{{ stepDetail(item.id) }}</small></span></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  </main>
</template>

<script>
const { inject, reactive, ref, computed, watch, onMounted } = Vue;
const { useRouter, useRoute } = VueRouter;

const STEPS = [
  { id: "company", label: "Company and tax data" }, { id: "locations", label: "Branches and warehouses" }, { id: "series", label: "Series and folios", invoicing: true },
  { id: "csd", label: "Digital seal (CSD)", invoicing: true }, { id: "stamps", label: "Stamps", invoicing: true }, { id: "team", label: "Team" }, { id: "payments", label: "Payments" }, { id: "review", label: "Review" },
];
const KIND_LABEL = { I: "Invoices", E: "Credit notes", P: "Payment complements", G: "Global invoice" };
const DEFAULT_SERIES = { I: "F", E: "NC", P: "CP", G: "FG" };
const ROLES = ["admin", "buyer", "approver", "warehouse", "auditor", "viewer", "supplier"];
const ROLE_LABEL = { owner: "Owner", admin: "Administrator", buyer: "Buyer", approver: "Approver", warehouse: "Warehouse", auditor: "Auditor", viewer: "View only", supplier: "Supplier" };
const AREA_LABEL = { fiscal: "Fiscal data", invoicing: "Invoicing (CFDI)", team: "Team and access", payments: "Payments", compliance: "Supplier compliance" };
const STATE_ICON = { ok: "fa-circle-check", todo: "fa-circle-exclamation", optional: "fa-circle", na: "fa-minus" };
const ITEM_LABEL = {
  company: "Fiscal data is complete", places: "Every place has its expedition postal code", series_I: "Series and folio for invoices", series_E: "Series and folio for credit notes",
  series_P: "Series and folio for payment complements", series_G: "Series and folio for the global invoice", csd: "Digital seal certificate (CSD) loaded and current", stamps: "Stamps available",
  pac: "Stamping in production", external: "Invoices are issued with your own system", admins: "At least one administrator", colleagues: "Colleagues invited", payout: "Payout account", supplier: "Formal supplier documents",
};

export default {
  setup() {
    const store = inject("store"), router = useRouter(), route = useRoute();
    const t = (text) => store.t(text);
    const phase = ref("loading"), cur = ref("company"), busy = ref(false), error = ref(""), notice = ref("");
    const unavailableTitle = ref("Company setup is unavailable"), unavailableLead = ref("");
    const st = ref(null), catalogs = ref({ regimen_fiscal: {} });
    const co = reactive({ legalName: "", rfc: "", taxRegime: "", postalCode: "", neighborhood: "", street: "", city: "", tradeName: "", phone: "", billingEmail: "", website: "" });
    const postal = reactive({ state: "idle", info: null }), lpostal = reactive({ state: "idle", info: null });
    const reading = ref(false), fromConstancia = ref(false), regimeChoices = ref([]);
    const lf = reactive({ id: "", kind: "warehouse", code: "", name: "", street: "", postalCode: "", neighborhood: "", city: "", phone: "", active: true });
    const seriesRows = ref([]);
    const csd = reactive({ cer: null, key: null, password: "", report: null });
    const iv = reactive({ email: "", role: "buyer", locationId: "" });
    const pf = reactive({ holder: "", clabe: "" });

    const isMx = computed(() => st.value?.company.countryCode === "MX");
    const personType = computed(() => {
      const rfc = co.rfc.toUpperCase();
      return /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(rfc) ? "fisica" : /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/.test(rfc) ? "moral" : null;
    });
    const isPerson = computed(() => personType.value === "fisica");
    const regimes = computed(() => Object.entries(catalogs.value.regimen_fiscal || {}).filter(([, item]) => !personType.value || item[personType.value]).map(([code, item]) => ({ code, name: item.name })));
    const issuing = computed(() => Boolean(st.value) && st.value.company.issuance.mode === "buyniverse" && isMx.value);
    const visibleSteps = computed(() => STEPS.filter((item) => !item.invoicing || issuing.value));
    const stepIndex = computed(() => Math.max(0, visibleSteps.value.findIndex((item) => item.id === cur.value)));
    const isDone = (id) => id === "review" ? Boolean(st.value?.ready) : Boolean(st.value?.steps[id]?.done);
    const requiredCount = computed(() => visibleSteps.value.filter((item) => item.id !== "review" && st.value.steps[item.id].required).length);
    const doneCount = computed(() => visibleSteps.value.filter((item) => item.id !== "review" && st.value.steps[item.id].required && st.value.steps[item.id].done).length);
    const activePlaces = computed(() => (st.value?.locations || []).filter((place) => place.active));
    const csdReady = computed(() => Boolean(csd.cer && csd.key && csd.password));
    const clabeOk = computed(() => {
      if (!/^\d{18}$/.test(pf.clabe)) return false;
      const weights = [3, 7, 1]; let sum = 0;
      for (let i = 0; i < 17; i++) sum += (Number(pf.clabe[i]) * weights[i % 3]) % 10;
      return (10 - (sum % 10)) % 10 === Number(pf.clabe[17]);
    });
    const bankName = computed(() => st.value?.banks?.[pf.clabe.slice(0, 3)] || ("Banco " + pf.clabe.slice(0, 3)));
    const holderDiffers = computed(() => pf.holder && st.value && pf.holder.toUpperCase().replace(/[^A-Z0-9]/g, "") !== st.value.company.legalName.toUpperCase().replace(/[^A-Z0-9]/g, "") && !st.value.company.legalName.toUpperCase().includes(pf.holder.toUpperCase().replace(/ (S\.?A\.?.*)$/, "")));
    const day = (iso) => iso ? new Date(iso).toLocaleDateString(store.locale.value === "es" ? "es-MX" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
    const fill = (text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");

    const stepDetail = (id) => {
      const step = st.value.steps[id], p = step.params || {};
      const map = {
        company: { ok: "Complete", missing: "{n} fields missing" }, locations: { ok: "{n} place(s)", none: "No place yet", no_postal: "{n} without postal code" },
        series: { ok: "All created", missing: "{n} to create" }, csd: { ok: "Loaded and current", none: "Not loaded", expired: "Expired", pending_pac: "Waiting for the PAC" },
        stamps: { ok: "{n} stamps", none: "No stamps yet" }, team: { ok: "{n} people", alone: "Only you so far" }, payments: { ok: "Account registered", none: "No account yet" },
      };
      const template = map[id]?.[step.code] || "";
      if (step.na) return t("Not needed");
      return fill(t(template), { n: p.missing?.length ?? p.count ?? p.withoutPostal ?? p.balance ?? p.members ?? "" });
    };
    const itemLabel = (item) => {
      const label = t(ITEM_LABEL[item.id] || item.id), p = item.params || {};
      if (item.id === "places" && item.state !== "ok") return label + " (" + fill(t("{n} without postal code"), { n: p.withoutPostal ?? 0 }) + ")";
      if (item.id === "pac") return label + (p.connected ? (p.environment ? " · " + p.environment : "") : " · " + t("not connected"));
      if (item.id === "stamps") return label + " · " + (p.balance ?? 0);
      return label;
    };

    const fail = (e) => { notice.value = ""; error.value = t(e?.body?.error || e?.message || "Setup is unavailable."); };
    const apply = (payload) => {
      st.value = payload; error.value = "";
      if (!co.legalName && payload.company) Object.assign(co, { legalName: payload.company.legalName, rfc: payload.company.rfc, taxRegime: payload.company.taxRegime, postalCode: payload.company.postalCode, neighborhood: payload.company.neighborhood,
        street: payload.company.street, city: payload.company.city, tradeName: payload.company.tradeName, phone: payload.company.phone, billingEmail: payload.company.billingEmail, website: payload.company.website });
      if (!pf.holder) pf.holder = payload.payout?.holder || payload.company.legalName;
    };
    const run = async (action, message) => {
      busy.value = true; error.value = ""; notice.value = "";
      try { const payload = await action(); if (payload && payload.steps) apply(payload); if (message) notice.value = t(message); return payload; }
      catch (e) { fail(e); return null; }
      finally { busy.value = false; }
    };
    const refresh = async () => apply(await window.BuyniverseSetup.status());

    const lookup = async (zip, target) => {
      target.info = null; target.state = "idle";
      if (!isMx.value || !/^\d{5}$/.test(zip)) return;
      target.state = "loading";
      const info = await window.BuyniverseOnboarding.postalInfo(zip);
      if (zip !== (target === postal ? co.postalCode : lf.postalCode)) return;
      target.info = info; target.state = info ? "ok" : "unknown";
    };
    watch(() => co.postalCode, (zip) => lookup(zip, postal));
    watch(() => lf.postalCode, (zip) => lookup(zip, lpostal));

    const saveCompany = () => run(() => window.BuyniverseSetup.saveCompany({ ...co }), "Company data saved.").then((payload) => { if (payload) { Object.assign(co, { legalName: payload.company.legalName, neighborhood: payload.company.neighborhood }); open(visibleSteps.value[Math.min(stepIndex.value + 1, visibleSteps.value.length - 1)].id); } });
    const readConstancia = async (event) => {
      const file = event.target.files[0]; event.target.value = "";
      if (!file) return;
      reading.value = true; error.value = ""; notice.value = ""; regimeChoices.value = [];
      try {
        const data = await window.BuyniverseConstancia.read(file, catalogs.value.regimen_fiscal);
        if (!data.rfc && !data.legalName) throw new Error("This does not look like a Constancia de Situación Fiscal.");
        if (st.value.company.rfc && data.rfc && data.rfc !== st.value.company.rfc) throw new Error("This constancia belongs to another RFC.");
        if (data.rfc && !st.value.company.rfc) co.rfc = data.rfc;
        if (data.legalName) co.legalName = data.legalName;
        if (data.postalCode) co.postalCode = data.postalCode;
        if (data.street) co.street = data.street;
        if (data.tradeName && !co.tradeName) co.tradeName = data.tradeName;
        if (data.regimes.length) { regimeChoices.value = data.regimes; co.taxRegime = data.regimes[0]; }
        if (data.neighborhood) setTimeout(() => { if (postal.info?.neighborhoods.includes(data.neighborhood)) co.neighborhood = data.neighborhood; }, 400);
        fromConstancia.value = true;
      } catch (e) { fail(e); } finally { reading.value = false; }
    };

    const resetPlace = () => Object.assign(lf, { id: "", kind: "warehouse", code: "", name: "", street: "", postalCode: "", neighborhood: "", city: "", phone: "", active: true });
    const editPlace = (place) => { Object.assign(lf, { id: place.id, kind: place.kind, code: place.code, name: place.name, street: place.street, postalCode: place.postalCode, neighborhood: place.neighborhood, city: place.city, phone: place.phone, active: place.active }); notice.value = ""; };
    const savePlace = () => run(() => window.BuyniverseSetup.saveLocation({ ...lf }), "Place saved.").then((payload) => { if (payload) resetPlace(); });

    const loadSeries = async () => {
      try {
        const data = await window.BuyniverseSetup.series();
        seriesRows.value = ["I", "E", "P", "G"].map((kind) => {
          const rule = (data.series.rules || []).find((item) => item.doc_kind === kind && !item.location_id && Number(item.active) === 1);
          const preview = data.series.preview?.[kind];
          return { kind, rule, id: rule?.id || "", series: rule?.series || data.series.defaults?.[kind] || DEFAULT_SERIES[kind], start: Number(rule?.start_folio) || 1, used: Boolean(rule && preview && Number(preview.folio) > Number(rule.start_folio)), next: preview?.folio || "" };
        });
      } catch (e) { fail(e); }
    };
    const saveSeries = (row) => run(async () => {
      await window.BuyniverseSetup.saveSeries({ id: row.id || undefined, docKind: row.kind, series: row.series, startFolio: row.start, ownFolio: row.start > 1 || Number(row.rule?.own_folio) === 1 });
      await loadSeries(); return window.BuyniverseSetup.status();
    }, "Series saved.");

    const verifyCsd = () => run(async () => { csd.report = await window.BuyniverseSetup.verifyCsd(st.value.company.id, csd.cer, csd.key, csd.password); return null; });
    const saveCsd = () => run(async () => {
      await window.BuyniverseSetup.uploadCsd(st.value.company.id, csd.cer, csd.key, csd.password);
      Object.assign(csd, { cer: null, key: null, password: "", report: null }); return window.BuyniverseSetup.status();
    }, "CSD protected.");

    const invite = () => run(async () => {
      await window.BuyniverseSetup.invite(st.value.company.id, { email: iv.email, role: iv.role, scope: iv.locationId ? "location" : "legal_entity", locationId: iv.locationId || null });
      Object.assign(iv, { email: "", locationId: "" }); return window.BuyniverseSetup.status();
    }, "Invitation sent.");
    const revoke = (item) => run(() => window.BuyniverseSetup.revokeInvitation(item.id), "Invitation revoked.");
    const savePayout = () => run(() => window.BuyniverseSetup.savePayout({ holder: pf.holder, clabe: pf.clabe }), "Account saved.").then((payload) => { if (payload) pf.clabe = ""; });

    const open = (id) => {
      cur.value = id; error.value = ""; notice.value = "";
      if (id === "series") void loadSeries();
      if (route.query.step !== id) router.replace({ path: route.path, query: { ...route.query, step: id } });
    };

    onMounted(async () => {
      if (store.isDemo.value) {
        unavailableLead.value = "The demo has no company to set up. Create your workspace to use the setup wizard.";
        phase.value = "unavailable"; return;
      }
      try {
        const [payload, cat] = await Promise.all([window.BuyniverseSetup.status(), window.BuyniverseSetup.catalogs().catch(() => ({ catalogs: { regimen_fiscal: {} } }))]);
        catalogs.value = cat.catalogs || { regimen_fiscal: {} };
        apply(payload); phase.value = "ready";
        const wanted = String(route.query.step || "");
        const first = visibleSteps.value.find((item) => item.id !== "review" && payload.steps[item.id].required && !payload.steps[item.id].done);
        cur.value = visibleSteps.value.some((item) => item.id === wanted) ? wanted : (first ? first.id : "review");
        if (cur.value === "series") void loadSeries();
        if (co.postalCode) void lookup(co.postalCode, postal);
      } catch (e) {
        unavailableTitle.value = e?.status === 401 ? "Sign in to continue" : "Company setup is unavailable";
        unavailableLead.value = e?.status === 403 ? "Create your workspace first, then come back to finish the setup." : (e?.status === 401 ? "Sign in with your account to set up your company." : "Try again in a moment.");
        phase.value = "unavailable";
      }
    });

    return { store, t, phase, cur, busy, error, notice, st, co, postal, lpostal, lf, seriesRows, csd, iv, pf, reading, fromConstancia, regimeChoices, unavailableTitle, unavailableLead,
      isMx, personType, isPerson, regimes, visibleSteps, stepIndex, isDone, requiredCount, doneCount, activePlaces, csdReady, clabeOk, bankName, holderDiffers, day, stepDetail, itemLabel,
      saveCompany, readConstancia, editPlace, savePlace, resetPlace, saveSeries, verifyCsd, saveCsd, invite, revoke, savePayout, open,
      KIND_LABEL, ROLES, ROLE_LABEL, AREA_LABEL, STATE_ICON };
  },
};
</script>
