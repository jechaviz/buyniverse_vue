(function (global) {
  "use strict";

  // A live-auction signal is deliberately not a bid ledger. The server owns
  // audience checks and emits only non-financial activity messages to rival
  // suppliers. The browser channel only makes the same safe signal immediate
  // across tabs while the API poll reaches other authenticated sessions.
  var locationPath = typeof global.location?.pathname === "string" ? global.location.pathname : "";
  var basePath = locationPath.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
  var endpoint = basePath + "/api/v1/auction-realtime";
  var listeners = Object.create(null);
  var cursors = Object.create(null);
  var pollers = Object.create(null);
  var localChannel = null;
  var validTypes = {
    bid_activity: true,
    bid_received: true,
    offer_recorded: true,
    competitive_offer: true,
    auction_extended: true,
    auction_paused: true,
    auction_resumed: true,
    auction_closed: true,
  };

  function text(value, limit) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
  }
  function roomRef(value) {
    var room = text(value, 120);
    return /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(room) ? room : "";
  }
  function now() { return new Date().toISOString(); }
  function localMode() {
    return global.BuyniverseRuntime && global.BuyniverseRuntime.mode === "demo";
  }
  function csrf() {
    return global.BuyniverseWorkspaceState && typeof global.BuyniverseWorkspaceState.csrfToken === "function"
      ? global.BuyniverseWorkspaceState.csrfToken()
      : "";
  }
  function rememberCsrf(payload) {
    if (typeof payload?.csrf === "string" && global.BuyniverseWorkspaceState?.setCsrfToken)
      global.BuyniverseWorkspaceState.setCsrfToken(payload.csrf);
    return payload;
  }
  function normalize(input) {
    if (!input || !roomRef(input.roomId) || !validTypes[input.type]) return null;
    return {
      id: text(input.id, 96) || ("rt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)),
      roomId: roomRef(input.roomId),
      type: input.type,
      at: Number.isFinite(Date.parse(input.at)) ? new Date(input.at).toISOString() : now(),
      actor: text(input.actor, 180),
      source: input.source === "server" ? "server" : "local",
    };
  }
  function dispatch(input, broadcast) {
    var event = normalize(input);
    if (!event) return null;
    (listeners[event.roomId] || []).slice().forEach(function (listener) {
      try { listener(event); } catch (_) { /* A listener must never interrupt a bid. */ }
    });
    try { global.dispatchEvent(new global.CustomEvent("buyniverse:auction-signal", { detail: event })); } catch (_) {}
    if (broadcast && localChannel) {
      try { localChannel.postMessage(event); } catch (_) {}
    }
    return event;
  }
  function parse(response) {
    return response.text().then(function (body) {
      if (!body || body.length > 262144) return {};
      try { return JSON.parse(body); } catch (_) { return {}; }
    });
  }
  function request(path, options) {
    return global.fetch(endpoint + path, options).then(function (response) {
      return parse(response).then(function (body) {
        if (!response.ok) {
          var error = new Error(body.error || "Live auction channel unavailable.");
          error.status = response.status;
          throw error;
        }
        return body;
      });
    });
  }
  function ensureCsrf() {
    if (csrf()) return Promise.resolve();
    return request("/session", {
      method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" },
    }).then(rememberCsrf).then(function () {
      if (!csrf()) throw new Error("Live auction session could not be verified.");
    });
  }
  function poll(room, delay) {
    if (!pollers[room]) return;
    var wait = Math.max(1200, Math.min(Number(delay) || 2500, 15000));
    pollers[room].timer = global.setTimeout(function () {
      if (!pollers[room]) return;
      if (global.document && global.document.visibilityState === "hidden") return poll(room, 5000);
      request("/rooms/" + encodeURIComponent(room) + "/events?after=" + encodeURIComponent(String(cursors[room] || 0)), {
        method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" },
      }).then(function (payload) {
        rememberCsrf(payload);
        var events = Array.isArray(payload.events) ? payload.events : [];
        events.slice(0, 50).forEach(function (event) {
          if (Number.isSafeInteger(Number(event.id))) cursors[room] = Math.max(Number(cursors[room] || 0), Number(event.id));
          dispatch({ ...event, roomId: room, source: "server" }, false);
        });
        poll(room, 2200);
      }).catch(function () {
        // Do not surface transport errors as bid errors. Retry with bounded
        // backoff and retain the last cursor so no activity is silently lost.
        poll(room, Math.min(wait * 1.8, 15000));
      });
    }, wait);
  }
  function ensureChannel() {
    if (localChannel || typeof global.BroadcastChannel !== "function") return;
    try {
      localChannel = new global.BroadcastChannel("buyniverse-auction-signals-v1");
      localChannel.onmessage = function (message) { dispatch(message && message.data, false); };
    } catch (_) { localChannel = null; }
  }
  function emitStorage(event) {
    // BroadcastChannel is preferred. This fallback supports legacy browsers
    // without persisting an audit or financial value in localStorage.
    try {
      global.localStorage.setItem("buyniverse:auction-signal", JSON.stringify(event));
      global.localStorage.removeItem("buyniverse:auction-signal");
    } catch (_) {}
  }

  ensureChannel();
  if (typeof global.addEventListener === "function") global.addEventListener("storage", function (event) {
    if (event.key !== "buyniverse:auction-signal" || !event.newValue) return;
    try { dispatch(JSON.parse(event.newValue), false); } catch (_) {}
  });

  function subscribe(roomInput, listener) {
    var room = roomRef(roomInput);
    if (!room || typeof listener !== "function") return function () {};
    listeners[room] ||= [];
    listeners[room].push(listener);
    if (!localMode() && !pollers[room]) {
      pollers[room] = { timer: null, count: 0 };
      poll(room, 80);
    }
    return function () {
      listeners[room] = (listeners[room] || []).filter(function (item) { return item !== listener; });
      if (listeners[room].length) return;
      delete listeners[room];
      if (pollers[room]) {
        global.clearTimeout(pollers[room].timer);
        delete pollers[room];
      }
    };
  }

  function publish(roomInput, type, options) {
    var room = roomRef(roomInput);
    if (!room || !validTypes[type]) return null;
    var event = dispatch({ roomId: room, type: type, at: now(), source: "local" }, true);
    if (!localChannel) emitStorage(event);
    if (!localMode()) ensureCsrf().then(function () {
      var headers = { Accept: "application/json", "Content-Type": "application/json", "X-Buyniverse-Request": "auction-realtime-v1", "X-Buyniverse-CSRF": csrf() };
      return request("/rooms/" + encodeURIComponent(room) + "/events", {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", headers: headers,
        body: JSON.stringify({ type: type, eventKey: event.id, extended: options && options.extended === true }),
      });
    }).then(rememberCsrf).catch(function () { /* Local UI remains responsive; poll reconciles later. */ });
    return event;
  }

  function createRoom(input) {
    var auctionRef = roomRef(input && input.auctionRef);
    if (!auctionRef) return Promise.resolve(null);
    if (localMode()) return Promise.resolve({ roomId: auctionRef, transport: "local" });
    var ids = Array.isArray(input.participantPrincipalIds) ? input.participantPrincipalIds
      .filter(function (value) { return /^[a-f0-9-]{36}$/i.test(String(value || "")); }).slice(0, 50) : [];
    return ensureCsrf().then(function () {
      var headers = { Accept: "application/json", "Content-Type": "application/json", "X-Buyniverse-Request": "auction-realtime-v1", "X-Buyniverse-CSRF": csrf() };
      return request("/rooms", {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", headers: headers,
        body: JSON.stringify({ auctionRef: auctionRef, participantPrincipalIds: ids, closesAt: text(input && input.closesAt, 40) }),
      });
    }).then(rememberCsrf);
  }

  global.BuyniverseAuctionRealtime = {
    subscribe: subscribe,
    publish: publish,
    createRoom: createRoom,
    endpoint: endpoint,
  };
})(typeof window !== "undefined" ? window : globalThis);
