(function (global) {
  "use strict";

  var uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  function safeId(value) {
    return typeof value === "string" && uuid.test(value) ? value : null;
  }
  function scopeForContext(context) {
    var tenantId = safeId(context && context.tenant && context.tenant.id);
    var companyId = safeId(context && context.company && context.company.id);
    var locationId = context && context.location ? safeId(context.location.id) : null;
    if (!tenantId || !companyId || (context && context.location && !locationId)) return null;
    return { tenantId: tenantId, companyId: companyId, locationId: locationId };
  }
  function normalize(scope, context) {
    var active = scopeForContext(context);
    if (!active) return null;
    if (!scope || typeof scope !== "object" || Array.isArray(scope)) return active;
    var tenantId = safeId(scope.tenantId);
    var companyId = safeId(scope.companyId);
    var locationId = scope.locationId == null || scope.locationId === "" ? null : safeId(scope.locationId);
    if (!tenantId || !companyId || (scope.locationId != null && scope.locationId !== "" && !locationId)) return active;
    return { tenantId: tenantId, companyId: companyId, locationId: locationId };
  }
  function matches(scope, context) {
    var expected = scopeForContext(context);
    if (!expected || !scope || typeof scope !== "object" || Array.isArray(scope)) return false;
    return scope.tenantId === expected.tenantId && scope.companyId === expected.companyId &&
      (scope.locationId || null) === expected.locationId;
  }
  function apply(record, context) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return record;
    var scope = scopeForContext(context);
    if (scope) record.operationalScope = scope;
    return record;
  }

  global.BuyniverseTenantScope = { scopeForContext: scopeForContext, normalize: normalize, matches: matches, apply: apply };
})(typeof window !== "undefined" ? window : globalThis);
