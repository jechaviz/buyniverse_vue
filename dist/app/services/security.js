(function (global) {
"use strict";
var DANGEROUS_KEYS = { __proto__: true, prototype: true, constructor: true };
function maskSensitiveText(text) {
if (!text || typeof text !== "string") return text;
var masked = text.replace(/\b(?:\d{4}[ -]?){3}(\d{4})\b/g, "****-****-****-$1");
masked = masked.replace(/\b(\d{4})\d{10}(\d{4})\b/g, "$1**********$2");
masked = masked.replace(/\b([A-Z&Ñ]{3,4})\d{6}([A-Z0-9]{3})\b/gi, "$1******$2");
return masked;
}
function sanitizeCsvValue(val) {
if (val == null) return "";
var str = String(val).trim();
if (/^[=+\-@\t\r\n%]/.test(str)) {
return "'" + str;
}
return str;
}
function generateTransactionHash(payload) {
var str = typeof payload === "string" ? payload : JSON.stringify(payload || {});
var hash = 0x811c9dc5;
for (var i = 0; i < str.length; i++) {
hash ^= str.charCodeAt(i);
hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
}
return ("0000000" + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
}
function createSessionGuard(options) {
var opts = options || {};
var timeoutMs = opts.timeoutMs || 15 * 60 * 1000;
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