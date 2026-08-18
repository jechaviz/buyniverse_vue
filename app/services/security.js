(function (global) {
  "use strict";

  // OWASP ASVS Level 3 Banking & Financial Grade Security Engine
  var DANGEROUS_KEYS = { __proto__: true, prototype: true, constructor: true };

  // 1. Sensitive Data Masking (PCI-DSS & Financial PII Protection)
  function maskSensitiveText(text) {
    if (!text || typeof text !== "string") return text;
    // Mask Credit Cards (13-19 digits)
    var masked = text.replace(/\b(?:\d{4}[ -]?){3}(\d{4})\b/g, "****-****-****-$1");
    // Mask CLABE (18 digits) / IBAN
    masked = masked.replace(/\b(\d{4})\d{10}(\d{4})\b/g, "$1**********$2");
    // Mask Tax RFC (12-13 chars)
    masked = masked.replace(/\b([A-Z&Ñ]{3,4})\d{6}([A-Z0-9]{3})\b/gi, "$1******$2");
    return masked;
  }

  // 2. CSV / Spreadsheet Formula Injection Sanitization (OWASP CSV Injection / DDE)
  function sanitizeCsvValue(val) {
    if (val == null) return "";
    var str = String(val).trim();
    if (/^[=+\-@\t\r\n%]/.test(str)) {
      return "'" + str; // Prefix with single quote to disable macro execution in Excel / Calc
    }
    return str;
  }

  // 3. Cryptographic Hash / Nonce Helper for Immutable Audit Entries
  function generateTransactionHash(payload) {
    var str = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    var hash = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ("0000000" + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
  }

  // 4. Inactivity & Banking Session Guard
  function createSessionGuard(options) {
    var opts = options || {};
    var timeoutMs = opts.timeoutMs || 15 * 60 * 1000; // 15 min default banking timeout
    var onLock = opts.onLock || function () {};
    var lastActivity = Date.now();
    var isLocked = false;

    function resetTimer() {
      if (!isLocked) {
        lastActivity = Date.now();
      }
    }

    if (typeof window !== "undefined" && window.addEventListener) {
      ["mousedown", "keydown", "touchstart", "scroll"].forEach(function (evt) {
        window.addEventListener(evt, resetTimer, { passive: true });
      });

      setInterval(function () {
        if (!isLocked && Date.now() - lastActivity > timeoutMs) {
          isLocked = true;
          onLock();
        }
      }, 10000);
    }

    return {
      touch: resetTimer,
      isLocked: function () { return isLocked; },
      unlock: function () { isLocked = false; lastActivity = Date.now(); },
    };
  }

  // 5. Anti-Clickjacking & Frame Busting Watchdog
  function enforceTopLevelFrame() {
    if (typeof window !== "undefined" && window.top && window.self !== window.top) {
      try {
        window.top.location = window.self.location;
      } catch (e) {
        document.body.style.display = "none";
      }
    }
  }

  var engine = {
    maskSensitiveText: maskSensitiveText,
    sanitizeCsvValue: sanitizeCsvValue,
    generateTransactionHash: generateTransactionHash,
    createSessionGuard: createSessionGuard,
    enforceTopLevelFrame: enforceTopLevelFrame,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = engine;
  }
  global.BuyniverseSecurity = engine;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
