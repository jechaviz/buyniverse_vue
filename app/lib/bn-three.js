/**
 * Buyniverse 3D brand system.
 *
 * Two pieces share one module:
 *   - The brand mark: a price tag, the universal sign of buying, whose glass
 *     face is a window into space (a galaxy born in the eyelet), with a
 *     luminous "b", brass eyelet and a strand of light for the cord.
 *     tools/brand/render-mark.html renders it to the PNG logo assets.
 *   - The hero "purchasing universe": a photographic spiral galaxy seen from a
 *     slow cinematic dolly whose core is the brand tag, revealed on hover. Tens of thousands
 *     of stars turn with differential rotation (the core faster than the arms,
 *     as real galaxies do) over a volumetric nebula; every listed supplier is a
 *     bright node sending quotes, drawn as small tags of light, along curved
 *     routes into the heart. The universe is made of purchases.
 *
 * Production rules: Three.js is imported lazily from the vendored module,
 * reduced motion renders one still frame, the loop pauses off-screen or on a
 * hidden tab, device pixel ratio is capped, particle counts scale down on
 * small screens, everything is disposed on teardown, and any failure resolves
 * to null so callers keep their CSS fallback.
 */
(function (global) {
  "use strict";

  var THREE_URL = "assets/vendor/three.module.js";
  var threePromise = null;

  var PALETTE = { violet: 0x6d4aff, mint: 0x16d9a0, amber: 0xffb23f, coral: 0xff5c7a, ink: 0x05040f };
  var SECTOR_COLORS = { technology: 0xa996ff, services: 0xff7a93, operations: 0xffc46b, logistics: 0x42f0c0 };

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function webglAvailable() {
    try {
      var probe = document.createElement("canvas");
      return !!(global.WebGLRenderingContext && (probe.getContext("webgl2") || probe.getContext("webgl")));
    } catch (error) {
      return false;
    }
  }

  function loadThree() {
    if (!threePromise) {
      var base = document.querySelector("base");
      var prefix = base && base.getAttribute("href") ? base.getAttribute("href") : "/";
      threePromise = import(prefix + THREE_URL);
    }
    return threePromise;
  }

  // Deterministic PRNG so the galaxy is identical on every visit.
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s += 0x6d2b79f5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Studio lighting from emissive panels, pre-filtered through PMREM. */
  function studioEnvironment(THREE, renderer) {
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0a0818, side: THREE.BackSide })));
    function panel(color, intensity, w, h, x, y, z, rx, ry) {
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx || 0, ry || 0, 0);
      env.add(mesh);
    }
    panel(0xffffff, 7, 6, 1.6, 0, 5.5, 1, Math.PI / 2, 0);
    panel(0xffffff, 4, 1.2, 6, -5.5, 0.5, 1, 0, Math.PI / 2);
    panel(0x9b85ff, 2.4, 3, 4, 5.5, 0, -1, 0, -Math.PI / 2);
    panel(0xffd9a8, 2.2, 5, 1, 0, -2.5, -5.5, 0, 0);
    var pmrem = new THREE.PMREMGenerator(renderer);
    var target = pmrem.fromScene(env, 0.02);
    env.traverse(function (node) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) node.material.dispose();
    });
    pmrem.dispose();
    return target;
  }

  // ---------------------------------------------------------------- mark ----
  // The mark itself lives in app/lib/bn-three-mark.js (loaded first).
  function buildMark(THREE) { return global.BuyniverseMark.build(THREE); }

  // Framed on the combined tag + ring silhouette, which sits right of the tag.
  var MARK_DISTANCE = 6.6;

  function markStage(THREE, size) {
    var canvas = document.createElement("canvas");
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var scene = new THREE.Scene();
    var env = studioEnvironment(THREE, renderer);
    scene.environment = env.texture;
    var key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2, 3, 4);
    scene.add(key);
    var mark = buildMark(THREE);
    mark.group.rotation.set(0.12, -0.42, 0.14);
    mark.group.position.set(-0.21, -0.03, 0);
    // Stars keep the same apparent size at every logo resolution.
    mark.setPointScale(3.2 * MARK_DISTANCE * size / 1024);
    scene.add(mark.group);
    var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0.1, MARK_DISTANCE);
    camera.lookAt(0, 0, 0);
    return {
      canvas: canvas,
      shot: function (phase) { mark.setRingPhase(phase || 0); renderer.render(scene, camera); return canvas; },
      dispose: function () { mark.dispose(); env.dispose(); renderer.dispose(); },
    };
  }

  /** The logo as a PNG data URL, ring at the given phase (0 = rest pose). */
  function renderMarkPng(size, phase) {
    return loadThree().then(function (THREE) {
      var stage = markStage(THREE, size);
      var url = stage.shot(phase || 0).toDataURL("image/png");
      stage.dispose();
      return url;
    });
  }

  /**
   * A horizontal strip of `frames` renders covering one lap of the ring. The
   * last frame equals the first, so a CSS steps(frames - 1) loop is seamless.
   */
  function renderMarkSprite(frameSize, frames) {
    return loadThree().then(function (THREE) {
      var stage = markStage(THREE, frameSize);
      var strip = document.createElement("canvas");
      strip.width = frameSize * frames;
      strip.height = frameSize;
      var ctx = strip.getContext("2d");
      for (var i = 0; i < frames; i++) ctx.drawImage(stage.shot(i / (frames - 1)), i * frameSize, 0);
      stage.dispose();
      return strip.toDataURL("image/png");
    });
  }

  // -------------------------------------------------------------- galaxy ----

  var STAR_VS = [
    "attribute float aRadius; attribute float aAngle; attribute float aSize; attribute vec3 aOffset; attribute vec3 aColor; attribute float aSeed;",
    "uniform float uTime; uniform float uScale; varying vec3 vColor; varying float vTwinkle;",
    "void main() {",
    // Differential rotation: inner stars complete their orbit faster.
    "  float angle = aAngle + uTime * 0.42 / (0.6 + aRadius * 0.55);",
    "  vec3 p = vec3(cos(angle) * aRadius, 0.0, sin(angle) * aRadius) + aOffset;",
    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  vTwinkle = 0.75 + 0.25 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);",
    "  vColor = aColor;",
    "  gl_PointSize = max(1.0, aSize * uScale * (52.0 / -mv.z));",
    "  gl_Position = projectionMatrix * mv;",
    "}",
  ].join("\n");

  var STAR_FS = [
    "varying vec3 vColor; varying float vTwinkle; uniform float uExposure;",
    "void main() {",
    "  float d = length(gl_PointCoord - 0.5);",
    "  float core = smoothstep(0.5, 0.0, d);",
    "  float a = pow(core, 2.6) * vTwinkle * uExposure;",
    "  if (a < 0.003) discard;",
    "  gl_FragColor = vec4(vColor * a, a);",
    "}",
  ].join("\n");

  var NEBULA_VS = "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
  var NEBULA_FS = [
    "varying vec3 vDir; uniform float uTime; uniform float uExposure; uniform int uOctaves;",
    "float h(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }",
    "float n(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);",
    "  return mix(mix(mix(h(i+vec3(0,0,0)),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),",
    "             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }",
    "float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 6; i++){ if (i >= uOctaves) break; v += a * n(p); p *= 2.03; a *= 0.5; } return v; }",
    "void main(){",
    "  vec3 d = vDir * 2.6 + vec3(uTime * 0.004, 0.0, uTime * 0.002);",
    "  float cloud = fbm(d + fbm(d * 1.7) * 1.4);",
    "  float wisps = smoothstep(0.42, 0.98, cloud) * 0.8;",
    "  float band = exp(-pow(vDir.y * 2.2, 2.0));",
    "  vec3 violet = vec3(0.30, 0.16, 0.62); vec3 teal = vec3(0.03, 0.28, 0.34); vec3 rose = vec3(0.42, 0.10, 0.26);",
    "  vec3 col = mix(violet, teal, smoothstep(0.3, 0.8, fbm(d * 0.7 + 7.0)));",
    "  col = mix(col, rose, smoothstep(0.62, 0.9, fbm(d * 1.3 - 3.0)) * 0.6);",
    "  vec3 base = vec3(0.006, 0.005, 0.02);",
    "  gl_FragColor = vec4((base + col * wisps * (0.5 + band * 0.8)) * uExposure, 1.0);",
    "}",
  ].join("\n");

  var ROUTE_VS = "attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
  var ROUTE_FS = [
    "varying float vT; uniform float uTime; uniform float uPhase; uniform float uSpeed; uniform vec3 uColor; uniform float uExposure;",
    "void main(){",
    "  float head = fract(uTime * uSpeed + uPhase);",
    "  float behind = head - vT; behind += step(behind, 0.0);",
    "  float pulse = exp(-behind * 7.0);",
    "  float a = (0.12 + pulse * 1.1) * smoothstep(0.0, 0.06, vT) * smoothstep(1.0, 0.94, vT) * uExposure;",
    "  gl_FragColor = vec4(uColor * a, a);",
    "}",
  ].join("\n");

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{nodes: Array<{id:string, sector:string, score:number}>}} options
   */
  function createUniverse(canvas, options) {
    var config = options || {};
    if (!canvas || !webglAvailable()) return Promise.resolve(null);

    return loadThree().then(function (THREE) {
      var reduced = reducedMotion();
      var small = (global.innerWidth || 1280) < 768;
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: config.preserve === true });
      renderer.setClearColor(PALETTE.ink, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      var scene = new THREE.Scene();
      var trash = [];
      function keep(item) { trash.push(item); return item; }
      // Always full exposure: the fade-in is the canvas CSS opacity, so the very
      // first frame is complete even if the browser throttles animation frames.
      var exposure = { value: 1 };

      // Nebula backdrop on the inside of a large sphere.
      var nebula = new THREE.Mesh(keep(new THREE.SphereGeometry(80, 48, 32)), keep(new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uExposure: exposure, uOctaves: { value: small ? 3 : 5 } },
        vertexShader: NEBULA_VS, fragmentShader: NEBULA_FS,
      })));
      scene.add(nebula);

      var galaxy = new THREE.Group();
      galaxy.rotation.x = 0.08;
      scene.add(galaxy);

      // Spiral galaxy: four arms, a dense warm bulge, blue outskirts.
      var random = rng(20260928);
      var count = small ? 26000 : 90000;
      var radius = new Float32Array(count), angle = new Float32Array(count), size = new Float32Array(count), seed = new Float32Array(count);
      var offset = new Float32Array(count * 3), color = new Float32Array(count * 3);
      var inner = new THREE.Color(0xffe2b8), mid = new THREE.Color(0xc9c4ff), outer = new THREE.Color(0x9fc4ff), dust = new THREE.Color(0xff9ec0);
      var R = 10, arms = 4, c = new THREE.Color();
      for (var i = 0; i < count; i++) {
        var bulge = i < count * 0.1;
        var diskField = !bulge && i < count * 0.3;
        var r = bulge ? Math.pow(random(), 1.8) * 2.1 : 0.5 + Math.pow(random(), diskField ? 1.1 : 1.25) * R;
        var arm = (i % arms) / arms * Math.PI * 2;
        var scatter = Math.pow(random(), diskField ? 1.2 : 2.3) * (diskField ? 1.2 : 0.32 + r * 0.19);
        radius[i] = r;
        angle[i] = bulge || diskField ? random() * Math.PI * 2 : arm + r * 0.52 + (random() - 0.5) * 0.42;
        offset[i * 3] = (random() - 0.5) * 2 * scatter;
        offset[i * 3 + 1] = (random() - 0.5) * (bulge ? 0.9 : 0.22) * Math.exp(-r * 0.12) * 1.6;
        offset[i * 3 + 2] = (random() - 0.5) * 2 * scatter;
        var t = Math.min(1, r / R);
        c.copy(inner).lerp(mid, Math.min(1, t * 2.2));
        if (t > 0.45) c.lerp(outer, (t - 0.45) / 0.55);
        if (!bulge && !diskField && random() < 0.035) c.copy(dust);
        // Luminosity follows a steep power law: most stars are faint.
        var brightness = (bulge ? 0.6 : diskField ? 0.28 : 0.55) * (0.35 + Math.pow(random(), 4) * 2.2);
        color[i * 3] = c.r * brightness; color[i * 3 + 1] = c.g * brightness; color[i * 3 + 2] = c.b * brightness;
        size[i] = 0.55 + Math.pow(random(), 9) * 3.4;
        seed[i] = random();
      }
      var starGeometry = keep(new THREE.BufferGeometry());
      starGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      starGeometry.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
      starGeometry.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
      starGeometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      starGeometry.setAttribute("aOffset", new THREE.BufferAttribute(offset, 3));
      starGeometry.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
      starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      starGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.4);
      var starUniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uExposure: exposure };
      var starMaterial = keep(new THREE.ShaderMaterial({ uniforms: starUniforms, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      galaxy.add(new THREE.Points(starGeometry, starMaterial));

      // Galactic core: a soft volumetric glow that always faces the camera.
      var core = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 9)), keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uExposure: exposure, uLight: { value: 1 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "varying vec2 vUv; uniform float uExposure; uniform float uLight; void main(){ float d = length(vUv - 0.5) * 2.0; float g = (exp(-d * 6.5) * 0.55 + exp(-d * 2.2) * 0.12) * uLight; gl_FragColor = vec4(vec3(1.0, 0.86, 0.68) * g * uExposure, g); }",
      })));
      scene.add(core);

      // Distant field stars.
      var fieldCount = small ? 1500 : 4000;
      var field = new Float32Array(fieldCount * 3);
      for (var f = 0; f < fieldCount; f++) {
        var fr = 40 + random() * 30, th = random() * Math.PI * 2, ph = Math.acos(2 * random() - 1);
        field[f * 3] = fr * Math.sin(ph) * Math.cos(th); field[f * 3 + 1] = fr * Math.cos(ph); field[f * 3 + 2] = fr * Math.sin(ph) * Math.sin(th);
      }
      var fieldGeometry = keep(new THREE.BufferGeometry());
      fieldGeometry.setAttribute("position", new THREE.BufferAttribute(field, 3));
      var fieldMaterial = keep(new THREE.PointsMaterial({ color: 0xd8d2ff, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }));
      scene.add(new THREE.Points(fieldGeometry, fieldMaterial));

      // Suppliers as bright nodes inside the disk, joined by trade routes of light.
      var commerce = new THREE.Group();
      galaxy.add(commerce);
      var nodes = Array.isArray(config.nodes) ? config.nodes.slice(0, 48) : [];
      var positions = nodes.map(function (node, index) {
        var rr = 2.4 + ((index * 0.37) % 1) * 6.8;
        var aa = (index % arms) / arms * Math.PI * 2 + rr * 0.58 + (((index * 0.61) % 1) - 0.5) * 0.3;
        return new THREE.Vector3(Math.cos(aa) * rr, 0.05, Math.sin(aa) * rr);
      });
      var nodePos = new Float32Array(positions.length * 3), nodeCol = new Float32Array(positions.length * 3);
      positions.forEach(function (p, k) {
        var col = new THREE.Color(SECTOR_COLORS[nodes[k].sector] || 0xffffff);
        nodePos.set([p.x, p.y, p.z], k * 3);
        nodeCol.set([col.r, col.g, col.b], k * 3);
      });
      var nodeGeometry = keep(new THREE.BufferGeometry());
      nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
      nodeGeometry.setAttribute("color", new THREE.BufferAttribute(nodeCol, 3));
      var nodeMaterial = keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { uExposure: exposure, uScale: starUniforms.uScale },
        vertexShader: "varying vec3 vC; uniform float uScale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = 90.0 * uScale / -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "varying vec3 vC; uniform float uExposure; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float g = exp(-d * 6.0) + exp(-d * 2.2) * 0.35; gl_FragColor = vec4(vC * g * 1.6 * uExposure, g); }",
      }));
      commerce.add(new THREE.Points(nodeGeometry, nodeMaterial));

      positions.forEach(function (from, index) {
        [5, 11].forEach(function (step, k) {
          if (positions.length < 3) return;
          var to = positions[(index + step) % positions.length];
          if (to === from) return;
          var lift = from.distanceTo(to) * 0.28;
          var control = from.clone().add(to).multiplyScalar(0.5).add(new THREE.Vector3(0, lift, 0));
          var points = new THREE.QuadraticBezierCurve3(from, control, to).getPoints(80);
          var geometry = keep(new THREE.BufferGeometry().setFromPoints(points));
          var along = new Float32Array(points.length);
          for (var j = 0; j < points.length; j++) along[j] = j / (points.length - 1);
          geometry.setAttribute("aT", new THREE.BufferAttribute(along, 1));
          var material = keep(new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { uTime: starUniforms.uTime, uExposure: exposure, uPhase: { value: (index * 0.137 + k * 0.5) % 1 }, uSpeed: { value: 0.12 + ((index + k) % 4) * 0.03 }, uColor: { value: new THREE.Color(k ? 0xffc46b : 0x42f0c0) } },
            vertexShader: ROUTE_VS, fragmentShader: ROUTE_FS,
          }));
          commerce.add(new THREE.Line(geometry, material));
        });
      });

      // ---- Purchases: the brand tag at the galaxy's heart, and quotes from
      // every supplier travelling to it as small tags of light. The universe
      // is made of purchases; each purchase holds a universe. -----------------
      var env = studioEnvironment(THREE, renderer);
      scene.environment = env.texture;
      var key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(-4, 6, 8);
      scene.add(key);
      // The tag IS the galactic core: at rest only the core glows; hovering the
      // core reveals it as the tag, exactly where every route converges.
      var heart = buildMark(THREE);
      var heartBase = small ? 1.15 : 0.95;
      heart.setOpacity(0);
      heart.group.visible = false;
      scene.add(heart.group);
      var reveal = 0, revealTarget = 0, hover = { x: 9, y: 9 };
      var coreNdc = new THREE.Vector3();
      var coreLight = { value: 1 };

      var flowTarget = new THREE.Vector3(0, 0.2, 0);
      var flows = positions.map(function (from, index) {
        var control = from.clone().multiplyScalar(0.45).add(new THREE.Vector3(0, 1.6 + (index % 3) * 0.5, 0));
        var curve = new THREE.QuadraticBezierCurve3(from, control, flowTarget);
        var pts = curve.getPoints(64);
        var geometry = keep(new THREE.BufferGeometry().setFromPoints(pts));
        var along = new Float32Array(pts.length);
        for (var j = 0; j < pts.length; j++) along[j] = j / (pts.length - 1);
        geometry.setAttribute("aT", new THREE.BufferAttribute(along, 1));
        var flow = { curve: curve, phase: (index * 0.173) % 1, speed: 0.07 + (index % 5) * 0.012, color: new THREE.Color(SECTOR_COLORS[nodes[index].sector] || 0xffffff) };
        // The trail's light pulse runs at the tag's own speed, so it reads as its wake.
        commerce.add(new THREE.Line(geometry, keep(new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { uTime: starUniforms.uTime, uExposure: exposure, uPhase: { value: flow.phase }, uSpeed: { value: flow.speed }, uColor: { value: flow.color } },
          vertexShader: ROUTE_VS, fragmentShader: ROUTE_FS,
        }))));
        return flow;
      });

      // A white tag silhouette, tinted per sector in the shader.
      var tagSprite = (function () {
        var c = document.createElement("canvas");
        c.width = c.height = 128;
        var g = c.getContext("2d");
        g.translate(64, 64);
        g.scale(46, -46);
        g.beginPath();
        g.moveTo(-0.55, 0.72); g.lineTo(0.92, 0.72); g.quadraticCurveTo(1.12, 0.72, 1.12, 0.52); g.lineTo(1.12, -0.52);
        g.quadraticCurveTo(1.12, -0.72, 0.92, -0.72); g.lineTo(-0.55, -0.72); g.lineTo(-1.1, -0.14); g.quadraticCurveTo(-1.19, 0, -1.1, 0.14); g.closePath();
        // Drawn as light, not as a sticker: a faint body with a glowing rim.
        g.fillStyle = "rgba(255,255,255,0.28)";
        g.fill();
        g.shadowColor = "rgba(255,255,255,1)";
        g.shadowBlur = 14;
        g.lineWidth = 0.1;
        g.lineJoin = "round";
        g.strokeStyle = "#ffffff";
        g.stroke();
        g.shadowBlur = 0;
        g.beginPath(); g.arc(-0.72, 0, 0.13, 0, Math.PI * 2);
        g.stroke();
        return keep(new THREE.CanvasTexture(c));
      })();
      var tagCount = flows.length * 2;
      var tagPos = new Float32Array(tagCount * 3), tagAlpha = new Float32Array(tagCount), tagColor = new Float32Array(tagCount * 3);
      flows.forEach(function (flow, index) {
        tagColor.set([flow.color.r, flow.color.g, flow.color.b], index * 6);
        tagColor.set([flow.color.r, flow.color.g, flow.color.b], index * 6 + 3);
      });
      var tagGeometry = keep(new THREE.BufferGeometry());
      tagGeometry.setAttribute("position", new THREE.BufferAttribute(tagPos, 3));
      tagGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(tagAlpha, 1));
      tagGeometry.setAttribute("aColor", new THREE.BufferAttribute(tagColor, 3));
      tagGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.5);
      commerce.add(new THREE.Points(tagGeometry, keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uMap: { value: tagSprite }, uScale: starUniforms.uScale, uExposure: exposure },
        vertexShader: "attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC; uniform float uScale; void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = 360.0 * uScale / -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform sampler2D uMap; uniform float uExposure; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)); float a = t.a * vA * uExposure; if (a < 0.01) discard; gl_FragColor = vec4(mix(vC, vec3(1.0), 0.25) * a * 1.4, a); }",
      }))));

      function flowTags(time) {
        var p = new THREE.Vector3();
        flows.forEach(function (flow, index) {
          for (var k = 0; k < 2; k++) {
            var t = (time * flow.speed + flow.phase + k * 0.5) % 1;
            flow.curve.getPoint(t, p);
            var slot = index * 2 + k;
            tagPos[slot * 3] = p.x; tagPos[slot * 3 + 1] = p.y; tagPos[slot * 3 + 2] = p.z;
            // Born at the supplier, absorbed as it reaches the heart of the market.
            tagAlpha[slot] = Math.min(1, t / 0.08) * (1 - Math.max(0, (t - 0.82) / 0.18));
          }
        });
        tagGeometry.attributes.position.needsUpdate = true;
        tagGeometry.attributes.aAlpha.needsUpdate = true;
      }

      var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
      var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      var running = false, disposed = false, frame = 0, last = 0, elapsed = 0;

      function pose(time) {
        starUniforms.uTime.value = time;
        nebula.material.uniforms.uTime.value = time;
        commerce.rotation.y = time * 0.025;
        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;
        // Slow cinematic dolly: a descending, tightening orbit.
        var orbit = 0.9 + time * 0.018 + pointer.x * 0.12;
        var dist = Math.max(15, 21 - time * 0.12);
        var elevation = 0.5 - Math.min(0.14, time * 0.004) + pointer.y * 0.05;
        camera.position.set(Math.cos(orbit) * dist * Math.cos(elevation), Math.sin(elevation) * dist, Math.sin(orbit) * dist * Math.cos(elevation));
        camera.lookAt(0.6, -0.4, 0);
        core.quaternion.copy(camera.quaternion);
        // Hover test against the projected core, aspect-corrected.
        coreNdc.set(0, 0.2, 0).project(camera);
        var dx = (hover.x - coreNdc.x) * camera.aspect, dy = hover.y - coreNdc.y;
        revealTarget = Math.sqrt(dx * dx + dy * dy) < 0.32 ? 1 : 0;
        var eased = reveal * reveal * (3 - 2 * reveal);
        heart.group.visible = reveal > 0.01;
        heart.group.position.set(0, 0.2, 0);
        heart.group.scale.setScalar(heartBase * (0.55 + 0.45 * eased));
        heart.group.lookAt(camera.position);
        heart.group.rotateY(-0.35 + Math.sin(time * 0.22) * 0.18 + (1 - eased) * 0.9);
        heart.group.rotateZ(0.08);
        heart.setOpacity(eased);
        // Once revealed, the ring of stars keeps orbiting the tag.
        if (heart.group.visible) heart.setRingPhase((time * 0.07) % 1);
        // The core light recedes as the tag takes its place.
        coreLight.value = 1 - eased * 0.55;
        flowTags(time);
        core.material.uniforms.uLight.value = coreLight.value;
      }

      function render() { renderer.render(scene, camera); }

      function loop(now) {
        if (disposed || !running) return;
        frame = global.requestAnimationFrame(loop);
        var delta = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        elapsed += delta;
        reveal += (revealTarget - reveal) * Math.min(1, delta * 3.2);
        pose(elapsed);
        render();
      }

      function resize() {
        if (disposed) return;
        var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, small ? 1.25 : 1.6));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w / h < 1 ? 58 : 38;
        // On wide screens the copy owns the left: shift the projection so the
        // galaxy sits right of it without moving the camera itself.
        if (w / h > 1.2) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
        starUniforms.uScale.value = Math.max(0.7, Math.min(1.8, h / 560)) * renderer.getPixelRatio();
        heart.setPointScale(36 * (h / 900) * renderer.getPixelRatio());
        if (!running) { pose(reduced ? 30 : elapsed); render(); }
      }

      var controller = {
        reduced: reduced,
        nodeCount: nodes.length,
        /** Render one frame at an exact time, for stills and visual review. */
        renderAt: function (time) { resize(); elapsed = time; pose(time); render(); return canvas; },
        start: function () {
          if (disposed || running || reduced) return;
          running = true;
          last = 0;
          frame = global.requestAnimationFrame(loop);
        },
        stop: function () { running = false; global.cancelAnimationFrame(frame); },
        /** Pointer in stage coordinates, -1..1 with y pointing down. */
        setHover: function (x, y) {
          hover.x = Number(x);
          hover.y = -Number(y);
          if (!running) { pose(elapsed); reveal = revealTarget; pose(elapsed); render(); }
        },
        clearHover: function () {
          hover.x = 9;
          hover.y = 9;
          if (!running) { pose(elapsed); reveal = 0; pose(elapsed); render(); }
        },
        setPointer: function (x, y) {
          pointer.tx = Math.max(-1, Math.min(1, Number(x) || 0));
          pointer.ty = Math.max(-1, Math.min(1, Number(y) || 0));
        },
        // The universe is a dark cinematic band in both themes.
        setTheme: function () {},
        resize: resize,
        dispose: function () {
          if (disposed) return;
          controller.stop();
          disposed = true;
          trash.forEach(function (item) { item.dispose(); });
          heart.dispose();
          env.dispose();
          renderer.dispose();
        },
      };

      elapsed = reduced ? 30 : 6;
      resize();
      pose(elapsed);
      render();
      return controller;
    }).catch(function () {
      return null;
    });
  }

  global.BuyniverseThree = {
    PALETTE: PALETTE,
    SECTOR_COLORS: SECTOR_COLORS,
    webglAvailable: webglAvailable,
    reducedMotion: reducedMotion,
    renderMarkPng: renderMarkPng,
    renderMarkSprite: renderMarkSprite,
    createUniverse: createUniverse,
  };
})(window);
