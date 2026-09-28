// Fiscal rules engine: tax-identifier validators, country detection and the
// evaluation of supplier requirements against the jurisdiction registry
// (app/data/fiscal/jurisdictions.json). fiscal_rules.php is the server-side
// port; scripts/qa/fiscal-vectors.json keeps both implementations in step.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BuyniverseFiscal = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var digits = function (value) { return String(value).split("").map(Number); };
  var ok = function (normalized, extra) { return Object.assign({ valid: true, normalized: normalized, warnings: [] }, extra || {}); };
  var fail = function (code, normalized) { return { valid: false, code: code, normalized: normalized || "", warnings: [] }; };
  var clean = function (value) { return String(value == null ? "" : value).toUpperCase().replace(/[\s.\-\/]/g, ""); };

  function luhn(number) {
    var sum = 0;
    digits(number).reverse().forEach(function (d, i) {
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    });
    return sum % 10 === 0;
  }

  function weighted(values, weights) {
    return weights.reduce(function (sum, w, i) { return sum + w * values[i]; }, 0);
  }

  function validDate(yy, mm, dd) {
    var ok1 = [1900, 2000].some(function (century) {
      var date = new Date(Date.UTC(century + yy, mm - 1, dd));
      return date.getUTCFullYear() === century + yy && date.getUTCMonth() === mm - 1 && date.getUTCDate() === dd;
    });
    return ok1;
  }

  var RFC_ALPHABET = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";
  var EIN_PREFIXES = "01 02 03 04 05 06 10 11 12 13 14 15 16 20 21 22 23 24 25 26 27 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 71 72 73 74 75 76 77 80 81 82 83 84 85 86 87 88 90 91 92 93 94 95 98 99".split(" ");

  var VALIDATORS = {
    mx_rfc: function (raw) {
      var value = String(raw == null ? "" : raw).toUpperCase().replace(/[\s\-]/g, "");
      var match = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z\d]{2})([A\d])$/.exec(value);
      if (!match) return fail("format", value);
      if (value === "XAXX010101000" || value === "XEXX010101000") return fail("generic", value);
      if (!validDate(+match[2], +match[3], +match[4])) return fail("date", value);
      var base = ("   " + value.slice(0, -1)).slice(-12);
      var sum = 0;
      for (var i = 0; i < 12; i++) sum += RFC_ALPHABET.indexOf(base[i]) * (13 - i);
      var expected = RFC_ALPHABET[(11 - (sum % 11)) % 11];
      var result = ok(value, { person: match[1].length === 3 ? "moral" : "fisica" });
      // The SAT has issued RFCs whose check digit does not follow the
      // published algorithm, so a mismatch warns instead of rejecting.
      if (expected !== value.slice(-1)) result.warnings.push("checksum");
      return result;
    },
    us_ein: function (raw) {
      var value = clean(raw);
      if (!/^\d{9}$/.test(value)) return fail("format", value);
      if (EIN_PREFIXES.indexOf(value.slice(0, 2)) < 0) return fail("prefix", value);
      return ok(value.slice(0, 2) + "-" + value.slice(2));
    },
    ca_bn: function (raw) {
      var value = clean(raw).replace(/RT\d{4}$/, "");
      if (!/^\d{9}$/.test(value)) return fail("format", value);
      return luhn(value) ? ok(value) : fail("checksum", value);
    },
    es_nif: function (raw) {
      var value = clean(raw).replace(/^ES/, "");
      var letters = "TRWAGMYFPDXBNJZSQVHLCKE";
      if (/^\d{8}[A-Z]$/.test(value)) return letters[+value.slice(0, 8) % 23] === value[8] ? ok(value) : fail("checksum", value);
      if (/^[XYZ]\d{7}[A-Z]$/.test(value)) {
        var number = "XYZ".indexOf(value[0]) + value.slice(1, 8);
        return letters[+number % 23] === value[8] ? ok(value) : fail("checksum", value);
      }
      if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(value)) {
        var d = digits(value.slice(1, 8)), total = 0;
        d.forEach(function (n, i) {
          if (i % 2 === 1) total += n;
          else { var twice = n * 2; total += Math.floor(twice / 10) + (twice % 10); }
        });
        var c = (10 - (total % 10)) % 10, control = value[8];
        var letterType = "PQRSNW".indexOf(value[0]) >= 0, digitType = "ABEH".indexOf(value[0]) >= 0;
        var asLetter = "JABCDEFGHI"[c] === control, asDigit = String(c) === control;
        if ((letterType && asLetter) || (digitType && asDigit) || (!letterType && !digitType && (asLetter || asDigit))) return ok(value);
        return fail("checksum", value);
      }
      return fail("format", value);
    },
    pt_nif: function (raw) {
      var value = clean(raw).replace(/^PT/, "");
      if (!/^[1-35-9]\d{8}$/.test(value)) return fail("format", value);
      var r = weighted(digits(value), [9, 8, 7, 6, 5, 4, 3, 2]) % 11;
      return (r < 2 ? 0 : 11 - r) === +value[8] ? ok(value) : fail("checksum", value);
    },
    fr_siren: function (raw) {
      var value = clean(raw);
      if (/^FR[0-9A-Z]{2}\d{9}$/.test(value)) value = value.slice(4);
      if (/^\d{14}$/.test(value)) value = value.slice(0, 9);
      if (!/^\d{9}$/.test(value)) return fail("format", value);
      return luhn(value) ? ok(value) : fail("checksum", value);
    },
    de_vat: function (raw) {
      var value = clean(raw);
      if (!/^DE\d{9}$/.test(value)) return fail("format", value);
      var product = 10, d = digits(value.slice(2));
      for (var i = 0; i < 8; i++) {
        var sum = (d[i] + product) % 10;
        if (sum === 0) sum = 10;
        product = (2 * sum) % 11;
      }
      return (11 - product) % 10 === d[8] ? ok(value) : fail("checksum", value);
    },
    it_piva: function (raw) {
      var value = clean(raw).replace(/^IT/, "");
      if (!/^\d{11}$/.test(value)) return fail("format", value);
      var d = digits(value), sum = 0;
      for (var i = 0; i < 10; i++) {
        var n = d[i];
        if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
        sum += n;
      }
      return (10 - (sum % 10)) % 10 === d[10] ? ok(value) : fail("checksum", value);
    },
    be_enterprise: function (raw) {
      var value = clean(raw).replace(/^BE/, "");
      if (/^\d{9}$/.test(value)) value = "0" + value;
      if (!/^[01]\d{9}$/.test(value)) return fail("format", value);
      return 97 - (+value.slice(0, 8) % 97) === +value.slice(8) ? ok(value) : fail("checksum", value);
    },
    pl_nip: function (raw) {
      var value = clean(raw).replace(/^PL/, "");
      if (!/^\d{10}$/.test(value)) return fail("format", value);
      var r = weighted(digits(value), [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
      return r !== 10 && r === +value[9] ? ok(value) : fail("checksum", value);
    },
    gb_vat: function (raw) {
      var value = clean(raw).replace(/^GB/, "");
      if (/^\d{12}$/.test(value)) value = value.slice(0, 9);
      if (!/^\d{9}$/.test(value)) return fail("format", value);
      var total = weighted(digits(value), [8, 7, 6, 5, 4, 3, 2]) + +value.slice(7);
      return total % 97 === 0 || (total + 55) % 97 === 0 ? ok("GB" + value) : fail("checksum", value);
    },
    co_nit: function (raw) {
      var value = clean(raw);
      if (!/^\d{6,15}$/.test(value)) return fail("format", value);
      var body = value.slice(0, -1), weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
      var sum = digits(body).reverse().reduce(function (s, d, i) { return s + d * weights[i]; }, 0);
      var r = sum % 11, dv = r > 1 ? 11 - r : r;
      return dv === +value.slice(-1) ? ok(body + "-" + dv) : fail("checksum", value);
    },
    cl_rut: function (raw) {
      var value = clean(raw);
      if (!/^\d{6,8}[0-9K]$/.test(value)) return fail("format", value);
      var body = value.slice(0, -1), sum = 0;
      digits(body).reverse().forEach(function (d, i) { sum += d * (2 + (i % 6)); });
      var r = 11 - (sum % 11), dv = r === 11 ? "0" : r === 10 ? "K" : String(r);
      return dv === value.slice(-1) ? ok(body + "-" + dv) : fail("checksum", value);
    },
    pe_ruc: function (raw) {
      var value = clean(raw);
      if (!/^(10|15|16|17|20)\d{9}$/.test(value)) return fail("format", value);
      var r = 11 - (weighted(digits(value), [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11);
      var dv = r === 10 ? 0 : r === 11 ? 1 : r;
      return dv === +value[10] ? ok(value) : fail("checksum", value);
    },
    ar_cuit: function (raw) {
      var value = clean(raw);
      if (!/^(20|23|24|25|26|27|30|33|34)\d{9}$/.test(value)) return fail("format", value);
      var check = "012345678990"[11 - (weighted(digits(value), [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11)];
      return check === value[10] ? ok(value.slice(0, 2) + "-" + value.slice(2, 10) + "-" + value[10]) : fail("checksum", value);
    },
    br_cnpj: function (raw) {
      var value = clean(raw);
      if (!/^[0-9A-Z]{12}\d{2}$/.test(value) || /^(.)\1{13}$/.test(value)) return fail("format", value);
      var values = value.split("").map(function (c) { return c.charCodeAt(0) - 48; });
      var dv = function (length) {
        var weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        var r = weighted(values, weights) % 11;
        return r < 2 ? 0 : 11 - r;
      };
      return dv(12) === values[12] && dv(13) === values[13] ? ok(value) : fail("checksum", value);
    },
    ec_ruc: function (raw) {
      var value = clean(raw);
      if (!/^\d{13}$/.test(value)) return fail("format", value);
      var province = +value.slice(0, 2);
      if (!((province >= 1 && province <= 24) || province === 30)) return fail("prefix", value);
      var d = digits(value), third = d[2], valid;
      if (third < 6) {
        var sum = 0;
        for (var i = 0; i < 9; i++) { var n = d[i] * (i % 2 === 0 ? 2 : 1); sum += n > 9 ? n - 9 : n; }
        valid = (10 - (sum % 10)) % 10 === d[9];
      } else if (third === 6) {
        var r6 = weighted(d, [3, 2, 7, 6, 5, 4, 3, 2]) % 11;
        valid = (r6 === 0 ? 0 : 11 - r6) === d[8];
      } else if (third === 9) {
        var r9 = weighted(d, [4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11;
        valid = (r9 === 0 ? 0 : 11 - r9) === d[9];
      } else return fail("format", value);
      var result = ok(value);
      // The SRI no longer guarantees the legacy check digit on new company RUCs.
      if (!valid) result.warnings.push("checksum");
      return result;
    },
    gt_nit: function (raw) {
      var value = clean(raw);
      if (!/^\d{2,12}[0-9K]$/.test(value)) return fail("format", value);
      var body = value.slice(0, -1), sum = 0;
      digits(body).reverse().forEach(function (d, i) { sum += d * (i + 2); });
      var r = (11 - (sum % 11)) % 11, dv = r === 10 ? "K" : String(r);
      return dv === value.slice(-1) ? ok(body + "-" + dv) : fail("checksum", value);
    },
    cr_id: function (raw) {
      var value = clean(raw);
      return /^[1-9]\d{8}$/.test(value) || /^3\d{9}$/.test(value) || /^1\d{10,11}$/.test(value) ? ok(value) : fail("format", value);
    },
    pa_ruc: function (raw) {
      var value = String(raw == null ? "" : raw).toUpperCase().replace(/\s+/g, "");
      return /^[0-9A-Z]{1,10}-[0-9A-Z]{1,8}-[0-9]{1,8}(-?DV-?[0-9]{1,2})?$/.test(value) ? ok(value) : fail("format", value);
    },
    do_rnc: function (raw) {
      var value = clean(raw);
      if (/^\d{9}$/.test(value)) {
        var r = weighted(digits(value), [7, 9, 8, 6, 5, 4, 3, 2]) % 11;
        var check = r === 0 ? 2 : r === 1 ? 1 : 11 - r;
        return check === +value[8] ? ok(value) : fail("checksum", value);
      }
      if (/^\d{11}$/.test(value)) return luhn(value) ? ok(value) : fail("checksum", value);
      return fail("format", value);
    },
    uy_rut: function (raw) {
      var value = clean(raw);
      if (!/^\d{12}$/.test(value)) return fail("format", value);
      var r = 11 - (weighted(digits(value), [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11);
      var check = r === 11 ? 0 : r;
      return r !== 10 && check === +value[11] ? ok(value) : fail("checksum", value);
    },
    in_gstin: function (raw) {
      var value = clean(raw);
      var match = /^(\d{2})[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.exec(value);
      if (!match) return fail("format", value);
      var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", sum = 0;
      for (var i = 0; i < 14; i++) {
        var product = chars.indexOf(value[i]) * (i % 2 === 0 ? 1 : 2);
        sum += Math.floor(product / 36) + (product % 36);
      }
      return chars[(36 - (sum % 36)) % 36] === value[14] ? ok(value, { stateCode: match[1] }) : fail("checksum", value);
    },
    generic: function (raw) {
      var value = String(raw == null ? "" : raw).toUpperCase().trim().replace(/\s+/g, " ");
      return /^[A-Z0-9][A-Z0-9 .\/-]{2,39}$/.test(value) ? ok(value) : fail("format", value);
    },
  };

  function validateTaxId(validator, value) {
    var fn = VALIDATORS[validator] || VALIDATORS.generic;
    return fn(value);
  }

  function findCountry(registry, code) {
    var list = registry && registry.countries || [];
    for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    return null;
  }

  /**
   * Suggest a country from browser signals. Time zone is the strongest hint;
   * the language region is the fallback. The user always confirms: tax
   * residence is declared, never inferred from where someone is browsing.
   */
  function detectCountry(registry, signals) {
    var timeZone = signals && signals.timeZone || "";
    var languages = signals && signals.languages || [];
    var countries = registry && registry.countries || [];
    for (var i = 0; i < countries.length; i++) {
      if ((countries[i].timezones || []).indexOf(timeZone) >= 0) return { code: countries[i].code, source: "timezone" };
    }
    for (var j = 0; j < languages.length; j++) {
      var region = String(languages[j] || "").split("-")[1];
      if (region && findCountry(registry, region.toUpperCase())) return { code: region.toUpperCase(), source: "language" };
    }
    return { code: "", source: "none" };
  }

  var MX_CORPORATE_SUFFIX = /(,|\s)\s*(S\.?\s?A\.?\s?P\.?\s?I\.?|S\.?\s?A\.?\s?B\.?|S\.?\s?A\.?|S\.?\s?DE\s?R\.?\s?L\.?|S\.?\s?C\.?|A\.?\s?C\.?|S\.?\s?EN\s?C\.?)(\s?DE\s?C\.?\s?V\.?)?\s*$/i;

  function mxLegalNameWithoutSuffix(name) {
    return String(name || "").replace(MX_CORPORATE_SUFFIX, "").trim();
  }

  function subdivisionOf(country, code) {
    var items = country && country.subdivisions && country.subdivisions.items || [];
    for (var i = 0; i < items.length; i++) if (items[i].code === code) return items[i];
    return null;
  }

  function applies(requirement, profile, flags) {
    if ((requirement.accountKinds || []).indexOf(profile.accountKind || "business") < 0) return false;
    var when = requirement.when;
    if (!when) return true;
    var answers = profile.answers || {};
    if (when.flag && flags.indexOf(when.flag) < 0) return false;
    if (when.anyFlag && !when.anyFlag.some(function (flag) { return flags.indexOf(flag) >= 0; })) return false;
    if (when.answer && answers[when.answer] !== true) return false;
    if (when.answerNot && answers[when.answerNot] === true) return false;
    return true;
  }

  function daysBetween(from, to) {
    var start = Date.parse(from);
    return Number.isFinite(start) ? Math.floor((to - start) / 86400000) : Infinity;
  }

  function fieldStatus(requirement, country, profile, taxResult, subdivision) {
    var field = requirement.field, value;
    if (field.indexOf("answers.") === 0) value = (profile.answers || {})[field.slice(8)];
    else value = profile[field];
    if (value == null || String(value).trim() === "") return { status: "missing" };
    if (field === "subdivision" && !subdivision) return { status: "invalid", code: "subdivision" };
    if (field === "residenceCountry" && !/^[A-Z]{2}$/.test(String(value).toUpperCase())) return { status: "invalid", code: "format" };
    if (country.code === "MX" && field === "legalName" && mxLegalNameWithoutSuffix(value) !== String(value).trim()) {
      return { status: "met", warnings: ["mx_corporate_suffix"], suggestion: mxLegalNameWithoutSuffix(value) };
    }
    if (country.code === "MX" && field === "taxRegime") {
      var regime = (country.regimes || []).filter(function (item) { return item.code === value; })[0];
      if (!regime) return { status: "invalid", code: "regime_unknown" };
      if (!regime.supplier) return { status: "invalid", code: "regime_not_supplier" };
      if (taxResult && taxResult.person && regime.person !== "both" && regime.person !== taxResult.person) return { status: "invalid", code: "regime_person_mismatch" };
    }
    if (country.code === "MX" && field === "postalCode") {
      if (!/^\d{5}$/.test(String(value))) return { status: "invalid", code: "postal_format" };
      if (subdivision && subdivision.postalPrefixes && subdivision.postalPrefixes.indexOf(String(value).slice(0, 2)) < 0) {
        return { status: "met", warnings: ["postal_state_mismatch"] };
      }
    }
    return { status: "met" };
  }

  /**
   * Evaluate a supplier profile against its jurisdiction.
   * profile: { accountKind, taxId, legalName, taxRegime, subdivision, county,
   *            postalCode, residenceCountry, answers, declarations, documents }
   * documents: { [requirementId]: { issuedOn: "YYYY-MM-DD" } }
   */
  function evaluate(registry, countryCode, profile, options) {
    var country = findCountry(registry, countryCode);
    if (!country) return { country: null, requirements: [], summary: { enrollmentReady: false, formal: false, blocking: 1 } };
    profile = profile || {};
    var now = options && options.now ? +new Date(options.now) : Date.now();
    var subdivision = subdivisionOf(country, profile.subdivision);
    var flags = subdivision && subdivision.flags || [];
    var taxResult = validateTaxId(country.taxId.validator, profile.taxId || "");
    var declarations = profile.declarations || {}, documents = profile.documents || {};
    var results = [];
    (country.requirements || []).forEach(function (requirement) {
      if (!applies(requirement, profile, flags)) return;
      var outcome;
      if (requirement.kind === "info") outcome = { status: "info" };
      else if (requirement.kind === "taxId") {
        if (!profile.taxId) outcome = { status: "missing" };
        else if (!taxResult.valid) outcome = { status: "invalid", code: taxResult.code };
        else if (country.code === "IN" && taxResult.stateCode && profile.subdivision && taxResult.stateCode !== profile.subdivision) outcome = { status: "invalid", code: "gstin_state_mismatch" };
        else outcome = { status: "met", warnings: taxResult.warnings, normalized: taxResult.normalized };
      } else if (requirement.kind === "field") outcome = fieldStatus(requirement, country, profile, taxResult.valid ? taxResult : null, subdivision);
      else if (requirement.kind === "declaration") {
        var value = declarations[requirement.id];
        var input = requirement.input || { type: "boolean" };
        if (input.type === "boolean") outcome = { status: value === true ? "met" : "missing" };
        else if (value == null || String(value).trim() === "") outcome = { status: "missing" };
        else outcome = new RegExp(input.pattern).test(String(value).trim()) ? { status: "met" } : { status: "invalid", code: "pattern" };
      } else if (requirement.kind === "document") {
        var document = documents[requirement.id];
        if (!document) outcome = { status: "pending" };
        else if (requirement.maxAgeDays && daysBetween(document.issuedOn, now) > requirement.maxAgeDays) outcome = { status: "expired" };
        else outcome = { status: "met" };
      }
      results.push(Object.assign({ id: requirement.id, kind: requirement.kind, phase: requirement.phase, blocking: requirement.blocking }, outcome));
    });
    var unmet = function (item) { return item.blocking && item.status !== "met"; };
    var enrollmentBlocking = results.filter(function (item) { return item.phase === "enrollment" && unmet(item); });
    var blocking = results.filter(unmet);
    return {
      country: country.code,
      flags: flags,
      requirements: results,
      summary: { enrollmentReady: enrollmentBlocking.length === 0, formal: blocking.length === 0, blocking: blocking.length, enrollmentBlocking: enrollmentBlocking.length },
    };
  }

  return {
    validators: Object.keys(VALIDATORS),
    validateTaxId: validateTaxId,
    detectCountry: detectCountry,
    evaluate: evaluate,
    findCountry: findCountry,
    subdivisionOf: subdivisionOf,
    mxLegalNameWithoutSuffix: mxLegalNameWithoutSuffix,
  };
});
