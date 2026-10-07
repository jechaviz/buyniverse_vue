/**
 * The Buyniverse mark in 3D: a ring and a dot, with volume.
 *
 * The dot is the need; the ring is the market around it. Pick a kind of
 * purchase and the dot orbits to its place on the ring, takes its colour and
 * leaves a comet trail; hover or pin the mark and the ring lights up as a
 * spectrum. The scene is a flat orthographic view with a hair of parallax, so
 * the mark always reads as the logo and never as a tilted object.
 *
 * mount(canvas, ctl) returns a Promise of { dispose() }. `ctl` is shared with
 * the page and read every frame:
 *   focus()    -> index of the category to orbit to, or -1 for the resting pose
 *   colors     -> hex colours, one per category
 *   hover/pinned (booleans), kick (0..1 pulse set by the page), reduced
 */
(function (global) {
  "use strict";

  var THREE_URL = "assets/vendor/three.module.js";
  var promise;
  function loadThree() {
    if (!promise) {
      var base = document.querySelector("base");
      var prefix = base && base.getAttribute("href") ? base.getAttribute("href") : "/";
      promise = import(prefix + THREE_URL);
    }
    return promise;
  }

  function mount(canvas, ctl) {
    return loadThree().then(function (T) {
      var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      var scene = new T.Scene(), H = 10.2, cam = new T.OrthographicCamera(-H, H, H, -H, 0.1, 200), root = new T.Group(), rg = new T.Group();
      cam.position.set(0, 0, 60); cam.lookAt(0, 0, 0); root.add(rg); scene.add(root);
      var ADD = T.AdditiveBlending;

      var glowTex = (function () {
        var g = document.createElement("canvas"); g.width = g.height = 128;
        var x = g.getContext("2d"), r = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        r.addColorStop(0, "#fff"); r.addColorStop(0.25, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = r; x.fillRect(0, 0, 128, 128);
        return new T.CanvasTexture(g);
      })();
      function sprite(color, size, opacity) {
        var m = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: color, transparent: true, opacity: opacity, blending: ADD, depthWrite: false, fog: false }));
        m.scale.set(size, size, 1); return m;
      }

      scene.add(new T.AmbientLight(0xaabbee, 1.15));
      var l1 = new T.PointLight(0x36e3c0, 2600, 90); l1.position.set(-14, 12, 18);
      var l2 = new T.PointLight(0x4d7cff, 2600, 90); l2.position.set(14, -10, 16);
      var l3 = new T.PointLight(0xffffff, 900, 90); l3.position.set(0, 0, 30);
      scene.add(l1, l2, l3);

      var C1 = new T.Color(0x36e3c0), C2 = new T.Color(0x4d7cff);
      function gradient(geometry) {
        var p = geometry.attributes.position, a = new Float32Array(p.count * 3), c = new T.Color();
        for (var i = 0; i < p.count; i++) {
          c.lerpColors(C1, C2, Math.min(1, Math.max(0, (p.getX(i) - p.getY(i) + 9) / 20)));
          a.set([c.r, c.g, c.b], i * 3);
        }
        geometry.setAttribute("color", new T.BufferAttribute(a, 3));
        return geometry;
      }

      var R = 3.9, TR = 1.12;
      var ringMat = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.32, emissive: 0x0b3a4a, emissiveIntensity: 0.9, transparent: true });
      var ring = new T.Mesh(gradient(new T.TorusGeometry(R, TR, 48, 200)), ringMat);
      var REST = new T.Vector3(-2.8, 6.4, 0), PHI0 = Math.atan2(REST.y, REST.x), RREST = REST.length(), DR = 1.5;
      var dotMat = new T.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.28, emissive: 0xffffff, emissiveIntensity: 0.32 });
      var dot = new T.Mesh(new T.SphereGeometry(DR, 64, 48), dotMat); dot.position.copy(REST);
      var halo = sprite(0x36e3c0, 19, 0.14); halo.material.depthTest = false;
      var dotGlow = sprite(0xffffff, 6.2, 0.4); dotGlow.position.copy(REST);

      // The same ring seen as light: a flowing spectrum with a hot spot under the dot.
      var lightMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: ADD,
        uniforms: { uT: { value: 0 }, uMix: { value: 0 }, uDot: { value: new T.Color(1, 1, 1) }, uAng: { value: 0 } },
        vertexShader: "varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: "uniform float uT;uniform float uMix;uniform vec3 uDot;uniform float uAng;varying vec2 vUv;varying vec3 vN;void main(){vec3 N=normalize(vN);float nd=abs(N.z);float a=vUv.x*6.28318;float flow=.5+.5*sin(a*5.-uT*2.4+sin(vUv.y*12.566+uT)*1.3);vec3 c1=vec3(.21,.89,.75),c2=vec3(.30,.49,1.),c3=vec3(.64,.48,1.);vec3 base=mix(mix(c1,c2,.5+.5*sin(a+uT*.7)),c3,.5+.5*sin(a*2.-uT*.9));float d=abs(mod(a-uAng+3.14159,6.28318)-3.14159);float spot=exp(-d*d*3.);float core=pow(nd,2.2);vec3 col=base*(.25+.55*flow+core*1.3)+uDot*spot*(.9+core*1.6)+vec3(1.)*pow(nd,9.)*.7;gl_FragColor=vec4(col*uMix,1.);}",
      });
      var lightRing = new T.Mesh(new T.TorusGeometry(R, TR, 48, 240), lightMat); lightRing.visible = false;

      // Comet trail
      var TM = 40, tpos = new Float32Array(TM * 3), thist = new Float32Array(TM * 3), tout = new Float32Array(TM * 3);
      for (var i = 0; i < TM; i++) tpos.set([REST.x, REST.y, 0], i * 3);
      var tg = new T.BufferGeometry();
      tg.setAttribute("position", new T.BufferAttribute(tpos, 3)); tg.setAttribute("color", new T.BufferAttribute(tout, 3));
      var trail = new T.Points(tg, new T.PointsMaterial({ size: 14, map: glowTex, vertexColors: true, transparent: true, opacity: 0, blending: ADD, depthWrite: false, sizeAttenuation: false }));
      trail.frustumCulled = false;
      rg.add(halo, ring, lightRing, trail, dot, dotGlow);

      var px = 0, py = 0, spx = 0, spy = 0;
      function onMove(e) { px = e.clientX / global.innerWidth - 0.5; py = e.clientY / global.innerHeight - 0.5; }
      global.addEventListener("pointermove", onMove);
      function resize() { var w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) renderer.setSize(w, h, false); }
      var ro = new ResizeObserver(resize); ro.observe(canvas); resize();

      var white = new T.Color(1, 1, 1), palette = (ctl.colors || []).map(function (c) { return new T.Color(c); });
      var dcol = new T.Color(1, 1, 1), tcol = new T.Color(), emi = new T.Color();
      var catAng = palette.map(function (_, k) { return PHI0 - (k + 1) * (Math.PI * 2 / (palette.length + 1)); });
      var last = performance.now(), t = 0, hAll = 0, lAll = 0, ang = PHI0, tgtAng = PHI0, raf = 0, dead = false, reduced = !!ctl.reduced;

      function frame(now) {
        if (dead) return;
        raf = requestAnimationFrame(frame);
        var dt = Math.min((now - last) / 1000, 0.05); last = now;
        if (document.hidden) return;
        t += dt;
        var ease = 1 - Math.exp(-dt * 5);
        ctl.kick = Math.max(0, (ctl.kick || 0) - dt * 1.6);
        var kick = ctl.kick;
        var intro = reduced ? 1 : Math.min(t / 1.4, 1), ie = 1 - Math.pow(1 - intro, 3);
        root.scale.setScalar(0.6 + 0.4 * ie); canvas.style.opacity = ie;
        spx += (px - spx) * ease; spy += (py - spy) * ease;
        var all = (ctl.hover || ctl.pinned) ? 1 : 0; hAll += (all - hAll) * ease;
        var f = ctl.focus ? ctl.focus() : -1;
        lAll += ((all || f >= 0 ? 1 : 0) - lAll) * ease;
        var L = lAll, Ls = L * L * (3 - 2 * L);
        // a hair of parallax: the ring stays a circle
        rg.rotation.y = reduced ? 0 : spx * 0.12; rg.rotation.x = reduced ? 0 : spy * 0.1; rg.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.12;
        ringMat.emissiveIntensity = 0.9 + kick * 1.2 + hAll * 0.6;
        halo.material.opacity = 0.12 + Ls * 0.14 + kick * 0.15;
        var rs = 1 + kick * 0.03 + hAll * 0.03; ring.scale.setScalar(rs); lightRing.scale.setScalar(rs * 1.015);
        ringMat.opacity = 1 - 0.94 * Ls; ringMat.depthWrite = Ls < 0.5; lightRing.visible = Ls > 0.01;
        lightMat.uniforms.uMix.value = Ls; lightMat.uniforms.uT.value = t;
        if (f >= 0) tgtAng = catAng[f]; else if (!all) tgtAng = PHI0;
        var dA = ((tgtAng - ang + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        ang += dA * (reduced ? 1 : 1 - Math.exp(-dt * 4.2));
        dot.position.set(Math.cos(ang) * RREST, Math.sin(ang) * RREST, 0); dotGlow.position.copy(dot.position);
        if (f >= 0) tcol.copy(palette[f]); else if (!all) tcol.copy(white); else tcol.copy(dcol);
        dcol.lerp(tcol, Math.min(1, dt * 4));
        dotMat.color.copy(dcol); emi.copy(dcol).multiplyScalar(0.45); dotMat.emissive.copy(emi); dotMat.emissiveIntensity = 0.55 + kick * 0.6;
        dot.scale.setScalar(1 + kick * 0.08);
        dotGlow.material.color.copy(dcol); dotGlow.scale.setScalar(6.2 + Ls * 2); dotGlow.material.opacity = 0.4 + Ls * 0.25 + kick * 0.4;
        lightMat.uniforms.uDot.value.copy(dcol); lightMat.uniforms.uAng.value = ang;
        tpos.copyWithin(3, 0, (TM - 1) * 3); thist.copyWithin(3, 0, (TM - 1) * 3);
        tpos[0] = dot.position.x; tpos[1] = dot.position.y; tpos[2] = 0; thist[0] = dcol.r; thist[1] = dcol.g; thist[2] = dcol.b;
        for (var j = 0; j < TM; j++) { var fd = Math.pow(1 - j / TM, 1.7); tout[j * 3] = thist[j * 3] * fd; tout[j * 3 + 1] = thist[j * 3 + 1] * fd; tout[j * 3 + 2] = thist[j * 3 + 2] * fd; }
        tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true;
        trail.material.opacity = Math.min(1, Math.abs(dA) * 1.6) * 0.95;
        renderer.render(scene, cam);
      }
      raf = requestAnimationFrame(frame);

      return {
        dispose: function () {
          dead = true; cancelAnimationFrame(raf); ro.disconnect(); global.removeEventListener("pointermove", onMove);
          scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); } });
          renderer.dispose();
        },
      };
    });
  }

  global.BnRing = { mount: mount };
})(typeof window !== "undefined" ? window : this);
