const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.resolve(__dirname, "../../app/lib/auction-realtime.js"), "utf8");
const listeners = {};
const windowScope = {
  location: { pathname: "/", hostname: "127.0.0.1" },
  BuyniverseRuntime: { mode: "demo" },
  localStorage: { setItem() {}, removeItem() {} },
  setTimeout,
  clearTimeout,
  addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
  dispatchEvent(event) { (listeners[event.type] || []).forEach((listener) => listener(event)); },
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; },
};

new Function("window", source)(windowScope);
const received = [];
const unsubscribe = windowScope.BuyniverseAuctionRealtime.subscribe("AUC-2026-014", (event) => received.push(event));
const event = windowScope.BuyniverseAuctionRealtime.publish("AUC-2026-014", "bid_activity");
unsubscribe();

if (!event || received.length !== 1 || received[0].type !== "bid_activity" || received[0].roomId !== "AUC-2026-014") {
  throw new Error("Auction realtime channel did not deliver a safe local activity signal");
}
if (Object.prototype.hasOwnProperty.call(event, "amount") || Object.prototype.hasOwnProperty.call(event, "supplierId")) {
  throw new Error("Auction realtime channel must not broadcast bid identity or financial data");
}
console.log("[PASS] Auction realtime channel delivers a privacy-safe local signal");
