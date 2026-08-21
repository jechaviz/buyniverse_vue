(function (global) {
  "use strict";

  var entries = new Map();
  var previousOverflow = "";
  var focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  function rootFor(entry) {
    return typeof entry.getRoot === "function" ? entry.getRoot() : null;
  }

  function focusInitial(entry) {
    var root = rootFor(entry);
    if (!root) return;
    var preferred = typeof entry.getInitialFocus === "function" ? entry.getInitialFocus() : null;
    var target = preferred || root.querySelector(focusableSelector) || root;
    if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
  }

  function activate(id, getRoot, getInitialFocus) {
    if (!id || !global.document) return;
    var document = global.document;
    if (!entries.size && document.body) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    entries.set(id, {
      getRoot: getRoot,
      getInitialFocus: getInitialFocus,
      returnFocus: document.activeElement,
    });
    global.requestAnimationFrame(function () {
      var entry = entries.get(id);
      if (entry) focusInitial(entry);
    });
  }

  function release(id) {
    var entry = entries.get(id);
    if (!entry) return;
    entries.delete(id);
    if (!entries.size && global.document?.body) {
      global.document.body.style.overflow = previousOverflow;
      previousOverflow = "";
    }
    var target = entry.returnFocus;
    if (target && global.document?.contains(target) && typeof target.focus === "function") {
      global.requestAnimationFrame(function () { target.focus({ preventScroll: true }); });
    }
  }

  function trap(event, id) {
    if (!event || event.key !== "Tab") return;
    var entry = entries.get(id);
    var root = entry && rootFor(entry);
    if (!root) return;
    var items = Array.prototype.filter.call(root.querySelectorAll(focusableSelector), function (node) {
      return !node.hasAttribute("hidden") && node.getAttribute("aria-hidden") !== "true";
    });
    if (!items.length) {
      event.preventDefault();
      root.focus?.({ preventScroll: true });
      return;
    }
    var first = items[0], last = items[items.length - 1], active = global.document.activeElement;
    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !root.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  global.BuyniverseOverlay = { activate: activate, release: release, trap: trap };
})(typeof window !== "undefined" ? window : this);
