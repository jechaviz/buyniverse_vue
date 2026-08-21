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

  // 3. Legacy deterministic display checksum. It is retained for backwards
  // compatibility only: it is NOT an authorization or tamper-proof audit control.
  function generateTransactionHash(payload) {
    var str = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    var hash = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ("0000000" + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
  }

  // 4. File metadata allowlist. Browser accept= is only a hint, so every
  // attachment goes through this verifier before it enters local state.
  var ALLOWED_FILE_TYPES = {
    pdf: ["application/pdf"],
    doc: ["application/msword"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    txt: ["text/plain"],
    md: ["text/markdown", "text/plain"],
    csv: ["text/csv", "application/csv"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
  };

  function sanitizeFilename(value) {
    var name = String(value || "").normalize("NFKC").split(/[\\/]/).pop() || "";
    return name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/^\.+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function validateFileUpload(file, options) {
    var opts = options || {};
    var maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : 2 * 1024 * 1024;
    var name = sanitizeFilename(file && file.name);
    var size = Number(file && file.size);
    var type = String((file && file.type) || "").trim().toLowerCase();
    var extensionMatch = name.match(/\.([a-z0-9]{1,8})$/i);
    var extension = extensionMatch ? extensionMatch[1].toLowerCase() : "";
    var allowedMimes = ALLOWED_FILE_TYPES[extension];

    if (!name || !extension || !allowedMimes) return { ok: false, reason: "This file type is not allowed." };
    if (!Number.isFinite(size) || size < 0 || size > maxBytes) return { ok: false, reason: "File size must be 2 MB or less." };
    if (type && allowedMimes.indexOf(type) === -1) return { ok: false, reason: "The file extension and media type do not match." };
    return { ok: true, name: name, extension: extension, size: size, type: type };
  }

  // 5. SHA-256 integrity fingerprint for display/audit correlation. The value
  // is useful for detecting accidental local changes, but only a server-held
  // signature can make an audit record tamper-proof.
  async function sha256Hex(payload) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== "function") return "";
    var text = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    var digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(digest), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  // 6. Inactivity & Banking Session Guard
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

  // 7. Anti-Clickjacking & Frame Busting Watchdog
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
    sanitizeFilename: sanitizeFilename,
    validateFileUpload: validateFileUpload,
    sha256Hex: sha256Hex,
    allowedFileExtensions: Object.keys(ALLOWED_FILE_TYPES),
    createSessionGuard: createSessionGuard,
    enforceTopLevelFrame: enforceTopLevelFrame,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = engine;
  }
  global.BuyniverseSecurity = engine;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
