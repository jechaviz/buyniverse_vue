/**
 * The Buyniverse logo, in motion, as the product itself.
 *
 * The logo is a ring and a dot. Read it as the product reads: the dot is a
 * need, the ring is the market around it. A need goes out (the dot calls),
 * offers leave the market (small bodies lift off the ring), and as they bid
 * lower they fall toward the need and settle on tighter orbits: the closer to
 * the dot, the better the price. The best offer is taken in (the dot adopts its
 * colour). Nothing here is decoration: distance is price.
 *
 * Canvas 2D, no dependencies, a few hundred draw calls per frame. Pauses when
 * hidden or off screen; with reduced motion it paints the settled state once.
 *
 *   var scene = BnOrbit.mount(canvas, { color: "#36e3c0", reduced: false });
 *   scene.call();                                  // the need goes out
 *   scene.addOrb({ id, label: "-8%", level: .55 }); // level 0 = far, 1 = closest
 *   scene.update(id, { level: 1, win: true });      // it fell closer and was taken
 *   scene.setColor("#ff6b8b"); scene.clear(); scene.dispose();
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  // The logo in its own 32-unit space (assets/brand/buyniverse-ring.svg).
  var RING = { x: 17, y: 19, r: 7, w: 4 };
  var DOT = { x: 12, y: 7.5, r: 3 };
  var R_FAR = 6.9, R_NEAR = 4.5;      // orbit radii around the dot, in logo units
  var FALL_MS = 1150, PAD = 3;  // breathing room so glows are never cut by the canvas

  function rgb(hex) {
    var h = String(hex || "#36e3c0").replace("#", "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function css(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function radiusFor(level) { return R_FAR - Math.max(0, Math.min(1, level)) * (R_FAR - R_NEAR); }
  function omega(r) { return 2.1 * Math.pow(R_NEAR / r, 1.5) + 0.35; }

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var reduced = !!opts.reduced;
    var accent = rgb(opts.color), dotColor = [255, 255, 255], dotTarget = [255, 255, 255];
    var orbs = [], pulse = 0, flash = 0, t = 0, last = performance.now(), raf = 0, dead = false, visible = true;
    var size = 0, scale = 1, dpr = 1;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      size = Math.min(w, h);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      scale = size / (32 + 2 * PAD);
      if (reduced) frame(performance.now(), true);
    }
    var ro = new ResizeObserver(resize); ro.observe(canvas);
    var io = "IntersectionObserver" in global ? new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }) : null;
    if (io) io.observe(canvas);

    function place(o, now) {
      // Where an orb is: lifting off the ring, falling toward the dot, or circling it.
      var age = now - o.born;
      if (o.phase === "fall") {
        var k = ease(Math.min(1, age / FALL_MS));
        var x0 = o.from.x, y0 = o.from.y;
        var x2 = DOT.x + o.r * Math.cos(o.a0), y2 = DOT.y + o.r * Math.sin(o.a0);
        var cx = (x0 + x2) / 2 + o.bend.x, cy = (y0 + y2) / 2 + o.bend.y;
        o.x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * cx + k * k * x2;
        o.y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cy + k * k * y2;
        if (k >= 1) { o.phase = "orbit"; o.a = o.a0; o.arrived = now; }
      } else {
        o.x = DOT.x + o.r * Math.cos(o.a);
        o.y = DOT.y + o.r * Math.sin(o.a);
      }
    }

    function frame(now, still) {
      if (dead) return;
      if (!still) raf = requestAnimationFrame(frame);
      if (!still && (document.hidden || !visible)) { last = now; return; }
      var dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
      pulse = Math.max(0, pulse - dt * 1.4); flash = Math.max(0, flash - dt * 1.1);
      dotColor = mix(dotColor, dotTarget, Math.min(1, dt * 3.2));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      var ox = (canvas.clientWidth - size) / 2, oy = (canvas.clientHeight - size) / 2;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + PAD * scale), dpr * (oy + PAD * scale));

      // Orbit guides: faint, they only say "closer is better".
      ctx.lineWidth = 0.07;
      for (var g = 0; g < 3; g++) {
        ctx.strokeStyle = css(accent, 0.10 + 0.05 * pulse);
        ctx.beginPath(); ctx.arc(DOT.x, DOT.y, R_FAR - g * ((R_FAR - R_NEAR) / 2), 0, TAU); ctx.stroke();
      }

      // The market: the ring.
      var grad = ctx.createLinearGradient(RING.x - 9, RING.y - 9, RING.x + 9, RING.y + 9);
      grad.addColorStop(0, "#36e3c0"); grad.addColorStop(1, "#4d7cff");
      ctx.lineCap = "round";
      ctx.strokeStyle = grad; ctx.globalAlpha = 0.16 + 0.2 * pulse + 0.25 * flash;
      ctx.lineWidth = RING.w + 2.2; ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = RING.w + pulse * 0.5;
      ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, 0, TAU); ctx.stroke();

      // Trails and bodies.
      for (var i = orbs.length - 1; i >= 0; i--) {
        var o = orbs[i];
        if (o.leaving) { o.alpha -= dt * 2; if (o.alpha <= 0) { orbs.splice(i, 1); continue; } }
        o.r += (o.rT - o.r) * Math.min(1, dt * 3.4);
        if (o.phase === "orbit") o.a += omega(o.r) * dt * (still ? 0 : 1);
        place(o, now);
        if (!still) { o.trail.push(o.x, o.y); if (o.trail.length > 46) o.trail.splice(0, 2); }
        var c = o.color, a = o.alpha;
        for (var s = 2; s < o.trail.length; s += 2) {
          var f = s / o.trail.length;
          ctx.strokeStyle = css(c, a * f * 0.55); ctx.lineWidth = 0.55 * f * (o.win ? 1.4 : 1);
          ctx.beginPath(); ctx.moveTo(o.trail[s - 2], o.trail[s - 1]); ctx.lineTo(o.trail[s], o.trail[s + 1]); ctx.stroke();
        }
        var head = o.win ? 1.15 : 0.82;
        var glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, head * 3.2);
        glow.addColorStop(0, css(c, a * (o.win ? 0.7 : 0.45))); glow.addColorStop(1, css(c, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(o.x, o.y, head * 3.2, 0, TAU); ctx.fill();
        ctx.fillStyle = css(mix(c, [255, 255, 255], 0.35), a); ctx.beginPath(); ctx.arc(o.x, o.y, head, 0, TAU); ctx.fill();
        if (o.label && (still || (o.phase === "orbit" && (o.win || now - o.arrived < 1700)))) {
          ctx.font = "600 " + (o.win ? 1.9 : 1.6) + "px 'JetBrains Mono', ui-monospace, monospace";
          var tw = ctx.measureText(o.label).width, lx = o.x + head + 0.9, ly = o.y - head - 0.4;
          ctx.fillStyle = "rgba(5,7,13," + (0.72 * a) + ")"; ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(lx - 0.7, ly - 1.55, tw + 1.4, 2.3, 1.1); else ctx.rect(lx - 0.7, ly - 1.55, tw + 1.4, 2.3);
          ctx.fill(); ctx.fillStyle = css(o.win ? [255, 255, 255] : mix(c, [255, 255, 255], 0.5), a); ctx.fillText(o.label, lx, ly);
        }
      }

      // The need: the dot.
      var dr = DOT.r * (1 + 0.06 * Math.sin(t * 2.2) + 0.12 * pulse);
      var halo = ctx.createRadialGradient(DOT.x, DOT.y, 0, DOT.x, DOT.y, dr * 3.4);
      halo.addColorStop(0, css(dotColor, 0.3 + 0.3 * flash)); halo.addColorStop(1, css(dotColor, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(DOT.x, DOT.y, dr * 3.4, 0, TAU); ctx.fill();
      var body = ctx.createRadialGradient(DOT.x - dr * 0.3, DOT.y - dr * 0.35, dr * 0.1, DOT.x, DOT.y, dr);
      body.addColorStop(0, "#ffffff"); body.addColorStop(1, css(mix(dotColor, [255, 255, 255], 0.55)));
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(DOT.x, DOT.y, dr, 0, TAU); ctx.fill();
    }

    if (reduced) setTimeout(function () { resize(); frame(performance.now(), true); }, 0); else raf = requestAnimationFrame(frame);

    var api = {
      setColor: function (hex) { accent = rgb(hex); },
      /** The need goes out: the dot calls and the market lights up. */
      call: function () { pulse = 1; },
      /** A softer touch, for small interactions. */
      ping: function () { pulse = Math.max(pulse, 0.45); },
      addOrb: function (spec) {
        var level = spec.level == null ? 0.3 : spec.level, n = orbs.length;
        // lift off the ring on the side that faces the need
        var towards = Math.atan2(DOT.y - RING.y, DOT.x - RING.x), s = towards + (n % 2 ? 1 : -1) * (0.35 + 0.28 * Math.floor(n / 2)) ;
        var from = { x: RING.x + RING.r * Math.cos(s), y: RING.y + RING.r * Math.sin(s) };
        var a0 = Math.atan2(from.y - DOT.y, from.x - DOT.x), rT = radiusFor(level);
        var side = n % 2 ? 1 : -1;
        var o = { id: spec.id, label: spec.label || "", color: rgb(spec.color || "#ffffff"), level: level, r: rT + 2.5, rT: rT, a0: a0, a: a0, born: performance.now(), arrived: 0, phase: reduced ? "orbit" : "fall", from: from,
          bend: { x: -Math.sin(towards) * 4.5 * side, y: Math.cos(towards) * 4.5 * side }, trail: [], alpha: 1, win: !!spec.win, leaving: false, x: from.x, y: from.y };
        if (spec.color == null) o.color = mix(accent, [255, 255, 255], 0.2);
        orbs.push(o);
        if (o.win) api.win(o.id);
        return o;
      },
      update: function (id, patch) {
        for (var i = 0; i < orbs.length; i++) if (orbs[i].id === id) {
          if (patch.level != null) { orbs[i].level = patch.level; orbs[i].rT = radiusFor(patch.level); }
          if (patch.label != null) orbs[i].label = patch.label;
          if (patch.win) api.win(id);
        }
      },
      /** The best offer is taken in: the dot adopts its colour. */
      win: function (id) {
        for (var i = 0; i < orbs.length; i++) { orbs[i].win = orbs[i].id === id; if (orbs[i].win) dotTarget = mix(orbs[i].color, [255, 255, 255], 0.15); }
        flash = 1;
      },
      clear: function () { orbs.forEach(function (o) { o.leaving = true; }); dotTarget = [255, 255, 255]; },
      dispose: function () { dead = true; cancelAnimationFrame(raf); ro.disconnect(); if (io) io.disconnect(); },
    };
    return api;
  }

  global.BnOrbit = { mount: mount };
})(typeof window !== "undefined" ? window : this);
