/**
 * Buyniverse B2B Procurement Telemetry & Reverse-Auction Radar
 *
 * Visualizes the reverse-auction procurement cycle as a high-precision market matrix:
 * - Demand Hub (Dot): Corporate requirement with a precision telemetry targeting reticle.
 * - Market Rail (Ring): Shaded supplier market boundary with technical segmented arcs.
 * - Price Orbit Tiers: Concentric radar range bands (Tier 3 -> Tier 2 -> BAFO).
 * - Live Bids: Discrete cryptographic telemetry nodes moving along technical vector
 *   conduits and locking onto competitive price orbits. No organic tails or swimming.
 *
 * Canvas 2D, zero dependencies, responsive DPI, respects prefers-reduced-motion.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  // Brand geometry in 32-unit logo space
  var RING = { x: 17, y: 19, r: 7.2, w: 3.6 };
  var DOT = { x: 12, y: 7.5, r: 2.8 };
  var R_FAR = 7.4, R_MID = 5.6, R_NEAR = 3.9;
  var APPROACH_MS = 850, PAD = 3.5;

  function rgb(hex) {
    var h = String(hex || "#36e3c0").replace("#", "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) {
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  function css(c, a) {
    return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")";
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function radiusFor(level) {
    var lv = Math.max(0, Math.min(1, level == null ? 0.5 : level));
    return R_FAR - lv * (R_FAR - R_NEAR);
  }
  function omega(r) { return 1.4 * Math.pow(R_NEAR / r, 1.2) + 0.35; }

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var reduced = !!opts.reduced;
    var accent = rgb(opts.color), dotColor = [255, 255, 255], dotTarget = [255, 255, 255];
    var orbs = [], shockwaves = [], pulse = 0, flash = 0, t = 0;
    var last = performance.now(), raf = 0, dead = false, visible = true;
    var size = 0, scale = 1, dpr = 1;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      size = Math.min(w, h);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scale = size / (32 + 2 * PAD);
      if (reduced) frame(performance.now(), true);
    }
    var ro = new ResizeObserver(resize); ro.observe(canvas);
    var io = "IntersectionObserver" in global
      ? new IntersectionObserver(function (e) { visible = e[0].isIntersecting; })
      : null;
    if (io) io.observe(canvas);

    function place(o, now) {
      var age = now - o.born;
      if (o.phase === "approach") {
        var k = ease(Math.min(1, age / APPROACH_MS));
        o.x = (1 - k) * o.from.x + k * o.to.x;
        o.y = (1 - k) * o.from.y + k * o.to.y;
        if (k >= 1) {
          o.phase = "orbit";
          o.a = o.a0;
          o.arrived = now;
        }
      } else {
        o.x = DOT.x + o.r * Math.cos(o.a);
        o.y = DOT.y + o.r * Math.sin(o.a);
      }
    }

    function frame(now, still) {
      if (dead) return;
      if (!still) raf = requestAnimationFrame(frame);
      if (!still && (document.hidden || !visible)) { last = now; return; }
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      pulse = Math.max(0, pulse - dt * 1.5);
      flash = Math.max(0, flash - dt * 1.2);
      dotColor = mix(dotColor, dotTarget, Math.min(1, dt * 3.5));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      var ox = (canvas.clientWidth - size) / 2, oy = (canvas.clientHeight - size) / 2;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + PAD * scale), dpr * (oy + PAD * scale));

      // 1. Technical Polar Grid (Concentric Pricing Tiers)
      var tiers = [
        { r: R_FAR, label: "T3", alpha: 0.14 },
        { r: R_MID, label: "T2", alpha: 0.20 },
        { r: R_NEAR, label: "BAFO", alpha: 0.32 }
      ];
      ctx.lineWidth = 0.08;
      tiers.forEach(function (tr) {
        ctx.strokeStyle = css(accent, tr.alpha + 0.15 * pulse);
        ctx.setLineDash([0.6, 1.0]);
        ctx.beginPath();
        ctx.arc(DOT.x, DOT.y, tr.r, 0, TAU);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Cardinal Reticle Ticks around DOT
      ctx.strokeStyle = css(accent, 0.18 + 0.1 * pulse);
      ctx.lineWidth = 0.07;
      for (var a = 0; a < 4; a++) {
        var ang = (a * Math.PI) / 2;
        var cosA = Math.cos(ang), sinA = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(DOT.x + cosA * (R_NEAR - 0.7), DOT.y + sinA * (R_NEAR - 0.7));
        ctx.lineTo(DOT.x + cosA * (R_FAR + 0.8), DOT.y + sinA * (R_FAR + 0.8));
        ctx.stroke();
      }

      // 2. Telemetry Radar Sweep Sector (Subtle live scanning effect)
      if (!still) {
        var sweepAng = t * 1.1;
        var sweepR = R_FAR + 0.6;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(DOT.x, DOT.y);
        ctx.arc(DOT.x, DOT.y, sweepR, sweepAng - 0.45, sweepAng);
        ctx.closePath();
        var sweepGrad = ctx.createRadialGradient(DOT.x, DOT.y, 1, DOT.x, DOT.y, sweepR);
        sweepGrad.addColorStop(0, css(accent, 0.12));
        sweepGrad.addColorStop(1, css(accent, 0.0));
        ctx.fillStyle = sweepGrad;
        ctx.fill();
        ctx.restore();
      }

      // 3. Market Rail (Buyniverse Outer Ring)
      var grad = ctx.createLinearGradient(RING.x - 8, RING.y - 8, RING.x + 8, RING.y + 8);
      grad.addColorStop(0, "#36e3c0");
      grad.addColorStop(1, "#4d7cff");

      // Outer dashed track
      ctx.strokeStyle = css(accent, 0.22);
      ctx.lineWidth = 0.09;
      ctx.setLineDash([0.8, 1.2]);
      ctx.beginPath();
      ctx.arc(RING.x, RING.y, RING.r + 1.2, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      // Main structural ring
      ctx.strokeStyle = grad;
      ctx.lineWidth = RING.w;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(RING.x, RING.y, RING.r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Precision tick marks along the ring perimeter
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 0.08;
      for (var k = 0; k < 12; k++) {
        var tk = (k * TAU) / 12;
        var cosK = Math.cos(tk), sinK = Math.sin(tk);
        ctx.beginPath();
        ctx.moveTo(RING.x + cosK * (RING.r - 0.8), RING.y + sinK * (RING.r - 0.8));
        ctx.lineTo(RING.x + cosK * (RING.r + 0.8), RING.y + sinK * (RING.r + 0.8));
        ctx.stroke();
      }

      // 4. Shockwaves (Clean telemetry expanding rings)
      for (var sIdx = shockwaves.length - 1; sIdx >= 0; sIdx--) {
        var sw = shockwaves[sIdx];
        sw.r += dt * sw.speed;
        sw.alpha -= dt * sw.decay;
        if (sw.alpha <= 0) {
          shockwaves.splice(sIdx, 1);
          continue;
        }
        ctx.strokeStyle = css(sw.color, sw.alpha);
        ctx.lineWidth = 0.12;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, TAU);
        ctx.stroke();
      }

      // 5. Active Bids (Telemetry Nodes & Badges)
      for (var i = orbs.length - 1; i >= 0; i--) {
        var o = orbs[i];
        if (o.leaving) {
          o.alpha -= dt * 2.5;
          if (o.alpha <= 0) { orbs.splice(i, 1); continue; }
        }
        o.r += (o.rT - o.r) * Math.min(1, dt * 3.5);
        if (o.phase === "orbit") {
          o.a += omega(o.r) * dt * (still ? 0 : 1);
        }
        place(o, now);

        var c = o.color, a = o.alpha;

        // If approaching, draw crisp vector conduit from market rail to destination
        if (o.phase === "approach") {
          ctx.strokeStyle = css(c, a * 0.4);
          ctx.lineWidth = 0.08;
          ctx.setLineDash([0.8, 1.2]);
          ctx.beginPath();
          ctx.moveTo(o.from.x, o.from.y);
          ctx.lineTo(o.to.x, o.to.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Crisp pulse dot at lead position
          ctx.fillStyle = css([255, 255, 255], a * 0.8);
          ctx.beginPath();
          ctx.arc(o.x, o.y, 0.45, 0, TAU);
          ctx.fill();
        }

        // Direct connection laser for the winning offer to Buyer Hub
        if (o.win && o.phase === "orbit") {
          ctx.strokeStyle = css([54, 227, 192], 0.35 + 0.15 * Math.sin(t * 5));
          ctx.lineWidth = 0.12;
          ctx.setLineDash([0.6, 0.8]);
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(DOT.x, DOT.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Telemetry Node Target Blip (Precision Geometric Reticle)
        var blipR = o.win ? 1.05 : 0.75;
        // Outer targeting ring
        ctx.strokeStyle = css(o.win ? [54, 227, 192] : c, a * 0.85);
        ctx.lineWidth = 0.12;
        ctx.beginPath();
        ctx.arc(o.x, o.y, blipR, 0, TAU);
        ctx.stroke();

        // Target Reticle Corner Brackets if winning
        if (o.win) {
          ctx.strokeStyle = css([54, 227, 192], 0.9);
          ctx.lineWidth = 0.14;
          var bk = blipR + 0.45;
          ctx.beginPath();
          ctx.moveTo(o.x - bk, o.y - bk * 0.4); ctx.lineTo(o.x - bk, o.y - bk); ctx.lineTo(o.x - bk * 0.4, o.y - bk);
          ctx.moveTo(o.x + bk, o.y - bk * 0.4); ctx.lineTo(o.x + bk, o.y - bk); ctx.lineTo(o.x + bk * 0.4, o.y - bk);
          ctx.moveTo(o.x - bk, o.y + bk * 0.4); ctx.lineTo(o.x - bk, o.y + bk); ctx.lineTo(o.x - bk * 0.4, o.y + bk);
          ctx.moveTo(o.x + bk, o.y + bk * 0.4); ctx.lineTo(o.x + bk, o.y + bk); ctx.lineTo(o.x + bk * 0.4, o.y + bk);
          ctx.stroke();
        }

        // Solid luminous center pip
        ctx.fillStyle = css([255, 255, 255], a);
        ctx.beginPath();
        ctx.arc(o.x, o.y, 0.35, 0, TAU);
        ctx.fill();

        // 6. Monospace Telemetry Badge (Price Discount Label)
        if (o.label && (still || o.phase === "orbit")) {
          ctx.font = "700 " + (o.win ? 1.7 : 1.45) + "px 'JetBrains Mono', ui-monospace, monospace";
          var txt = o.win ? "★ " + o.label : o.label;
          var tw = ctx.measureText(txt).width;
          var badgeX = o.x + blipR + 0.8;
          var badgeY = o.y - 0.2;
          var padX = 0.7, padY = 0.55;
          var bW = tw + padX * 2, bH = 2.1;

          // Glass pill backdrop
          ctx.fillStyle = "rgba(8, 12, 24, " + (0.92 * a) + ")";
          ctx.strokeStyle = css(o.win ? [54, 227, 192] : mix(c, [255, 255, 255], 0.3), 0.75 * a);
          ctx.lineWidth = 0.1;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(badgeX - padX, badgeY - bH / 2, bW, bH, 0.9);
          } else {
            ctx.rect(badgeX - padX, badgeY - bH / 2, bW, bH);
          }
          ctx.fill();
          ctx.stroke();

          // Monospace text
          ctx.fillStyle = css(o.win ? [54, 227, 192] : [238, 242, 251], a);
          ctx.textBaseline = "middle";
          ctx.fillText(txt, badgeX, badgeY);
          ctx.textBaseline = "alphabetic";
        }
      }

      // 7. Demand Hub (Buyniverse Central Requirement Core)
      var hubR = DOT.r;

      // Outer concentric targeting brackets
      var retR = hubR + 1.1 + pulse * 0.4;
      ctx.strokeStyle = css(accent, 0.4 + 0.4 * pulse);
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.arc(DOT.x, DOT.y, retR, 0, TAU);
      ctx.stroke();

      // Cardinal Target Notch Lines
      ctx.strokeStyle = css(dotColor, 0.75);
      ctx.lineWidth = 0.14;
      var notchIn = hubR + 0.6, notchOut = hubR + 1.6;
      ctx.beginPath();
      ctx.moveTo(DOT.x - notchOut, DOT.y); ctx.lineTo(DOT.x - notchIn, DOT.y);
      ctx.moveTo(DOT.x + notchIn, DOT.y); ctx.lineTo(DOT.x + notchOut, DOT.y);
      ctx.moveTo(DOT.x, DOT.y - notchOut); ctx.lineTo(DOT.x, DOT.y - notchIn);
      ctx.moveTo(DOT.x, DOT.y + notchIn); ctx.lineTo(DOT.x, DOT.y + notchOut);
      ctx.stroke();

      // Precision Core Disc
      var coreGrad = ctx.createRadialGradient(DOT.x - 0.5, DOT.y - 0.5, 0.2, DOT.x, DOT.y, hubR);
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.7, css(mix(dotColor, [255, 255, 255], 0.3), 0.95));
      coreGrad.addColorStop(1, css(accent, 0.85));
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(DOT.x, DOT.y, hubR, 0, TAU);
      ctx.fill();

      // Central Micro-Crosshair
      ctx.strokeStyle = "#05070d";
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(DOT.x - 0.7, DOT.y); ctx.lineTo(DOT.x + 0.7, DOT.y);
      ctx.moveTo(DOT.x, DOT.y - 0.7); ctx.lineTo(DOT.x, DOT.y + 0.7);
      ctx.stroke();
    }

    if (reduced) {
      setTimeout(function () { resize(); frame(performance.now(), true); }, 0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    var api = {
      setColor: function (hex) { accent = rgb(hex); },
      /** The need goes out: trigger high-precision radar scan pulse. */
      call: function () {
        pulse = 1;
        shockwaves.push({
          x: DOT.x, y: DOT.y, r: DOT.r, speed: 18, decay: 1.4, alpha: 0.9, color: accent
        });
      },
      /** A softer telemetry ping for small interactions. */
      ping: function () {
        pulse = Math.max(pulse, 0.45);
        shockwaves.push({
          x: DOT.x, y: DOT.y, r: DOT.r, speed: 14, decay: 2.2, alpha: 0.6, color: accent
        });
      },
      /** Add a live supplier bidding vector to the radar. */
      addOrb: function (spec) {
        var level = spec.level == null ? 0.3 : spec.level;
        var n = orbs.length;
        var towards = Math.atan2(DOT.y - RING.y, DOT.x - RING.x);
        var s = towards + (n % 2 ? 1 : -1) * (0.35 + 0.28 * Math.floor(n / 2));
        var from = { x: RING.x + RING.r * Math.cos(s), y: RING.y + RING.r * Math.sin(s) };

        var a0 = Math.atan2(from.y - DOT.y, from.x - DOT.x);
        var rT = radiusFor(level);
        var to = { x: DOT.x + rT * Math.cos(a0), y: DOT.y + rT * Math.sin(a0) };

        var o = {
          id: spec.id,
          label: spec.label || "",
          color: rgb(spec.color || "#ffffff"),
          level: level,
          r: rT,
          rT: rT,
          a0: a0,
          a: a0,
          born: performance.now(),
          arrived: 0,
          phase: reduced ? "orbit" : "approach",
          from: from,
          to: to,
          alpha: 1,
          win: !!spec.win,
          leaving: false,
          x: from.x,
          y: from.y
        };
        if (spec.color == null) {
          o.color = o.win ? [54, 227, 192] : mix(accent, [255, 255, 255], 0.2);
        }
        orbs.push(o);
        if (o.win) api.win(o.id);
        return o;
      },
      update: function (id, patch) {
        for (var i = 0; i < orbs.length; i++) {
          if (orbs[i].id === id) {
            if (patch.level != null) {
              orbs[i].level = patch.level;
              orbs[i].rT = radiusFor(patch.level);
            }
            if (patch.label != null) orbs[i].label = patch.label;
            if (patch.win) api.win(id);
          }
        }
      },
      /** Winning offer accepted: lock onto BAFO status with victory radar pulse. */
      win: function (id) {
        for (var i = 0; i < orbs.length; i++) {
          orbs[i].win = orbs[i].id === id;
          if (orbs[i].win) {
            dotTarget = mix(orbs[i].color, [255, 255, 255], 0.15);
            shockwaves.push({
              x: orbs[i].x, y: orbs[i].y, r: 0.8, speed: 12, decay: 1.6, alpha: 0.95, color: [54, 227, 192]
            });
          }
        }
        flash = 1;
      },
      clear: function () {
        orbs.forEach(function (o) { o.leaving = true; });
        dotTarget = [255, 255, 255];
      },
      dispose: function () {
        dead = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (io) io.disconnect();
      }
    };
    return api;
  }

  global.BnOrbit = { mount: mount };
})(typeof window !== "undefined" ? window : this);
