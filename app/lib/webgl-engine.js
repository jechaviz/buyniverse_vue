/**
 * Buyniverse WebGL engine - "Convergence".
 *
 * Renders the brand B-Infinity monogram as a living stream of competing
 * suppliers. Offers flow along the curve and, as an auction converges on its
 * best-and-final price, they collapse toward the award node while the palette
 * shifts from brand red to the emerald used everywhere else for realised
 * savings. The visual is therefore bound to real auction state, not decorative.
 *
 * Production rules honoured here:
 *   - Three.js is imported lazily and only when the canvas is on screen.
 *   - prefers-reduced-motion renders a single static frame, no animation loop.
 *   - The loop pauses when the tab is hidden or the canvas scrolls away.
 *   - Device pixel ratio is capped so retina laptops do not render 4x pixels.
 *   - Everything is disposed on teardown; callers may mount/unmount freely.
 *   - Any failure resolves to null so the caller keeps its CSS fallback.
 */
(function (global) {
  "use strict";

  var THREE_URL = "assets/vendor/three.module.js";
  var MAX_PIXEL_RATIO = 1.75;
  var CURVE_SCALE = 2.15;
  var threeModule = null;

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function supportsWebGl() {
    try {
      var probe = document.createElement("canvas");
      return !!(global.WebGLRenderingContext && (probe.getContext("webgl") || probe.getContext("experimental-webgl")));
    } catch (error) {
      return false;
    }
  }

  function loadThree() {
    if (threeModule) return Promise.resolve(threeModule);
    var base = document.querySelector("base");
    var prefix = base && base.getAttribute("href") ? base.getAttribute("href") : "/";
    return import(prefix + THREE_URL).then(function (mod) {
      threeModule = mod;
      return mod;
    });
  }

  var VERTEX_SHADER = [
    "attribute float aSize;",
    "attribute float aGlow;",
    "varying float vGlow;",
    "uniform float uScale;",
    "void main() {",
    "  vGlow = aGlow;",
    "  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);",
    "  gl_PointSize = aSize * uScale / max(0.35, -viewPosition.z);",
    "  gl_Position = projectionMatrix * viewPosition;",
    "}",
  ].join("\n");

  var FRAGMENT_SHADER = [
    "precision mediump float;",
    "varying float vGlow;",
    "uniform vec3 uColorBase;",
    "uniform vec3 uColorAward;",
    "uniform float uConvergence;",
    "uniform float uOpacity;",
    "void main() {",
    "  vec2 offset = gl_PointCoord - vec2(0.5);",
    "  float dist = length(offset);",
    "  if (dist > 0.5) discard;",
    "  float falloff = pow(1.0 - dist * 2.0, 2.4);",
    "  vec3 tint = mix(uColorBase, uColorAward, clamp(uConvergence * vGlow, 0.0, 1.0));",
    "  gl_FragColor = vec4(tint, falloff * uOpacity * (0.35 + vGlow * 0.65));",
    "}",
  ].join("\n");

  /**
   * @param {HTMLCanvasElement} canvas target canvas element
   * @param {object} options particles, dark, onReady
   * @returns {Promise<object|null>} controller, or null when unsupported
   */
  function createUniverse(canvas, options) {
    var config = options || {};
    if (!canvas || !supportsWebGl()) return Promise.resolve(null);

    return loadThree()
      .then(function (THREE) {
        var curve = global.BuyniverseBrandCurve;
        if (!curve) return null;

        var reduced = prefersReducedMotion();
        var count = Math.max(120, Math.min(2400, config.particles || 900));
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0.05, 5.2);

        var renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);

        // ---- the monogram itself, drawn as a faint guide ribbon -------------
        var guidePoints = curve.sampleFlat(320, CURVE_SCALE);
        var closed = new Float32Array(guidePoints.length + 3);
        closed.set(guidePoints, 0);
        closed[guidePoints.length] = guidePoints[0];
        closed[guidePoints.length + 1] = guidePoints[1];
        closed[guidePoints.length + 2] = guidePoints[2];
        var guideGeometry = new THREE.BufferGeometry();
        guideGeometry.setAttribute("position", new THREE.BufferAttribute(closed, 3));
        var guideMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(config.dark ? 0x94a3b8 : 0x0f172a),
          transparent: true,
          opacity: config.dark ? 0.16 : 0.08,
        });
        var guide = new THREE.Line(guideGeometry, guideMaterial);
        scene.add(guide);

        // ---- competing offers ----------------------------------------------
        var positions = new Float32Array(count * 3);
        var sizes = new Float32Array(count);
        var glow = new Float32Array(count);
        var seedT = new Float32Array(count);
        var seedSpeed = new Float32Array(count);
        var seedRadius = new Float32Array(count);
        var seedPhase = new Float32Array(count);

        // Two populations. The core hugs the curve tightly so the monogram
        // stays legible as a line of light; the field is the diffuse crowd of
        // offers still circling it. Without the core the mark reads as noise.
        for (var i = 0; i < count; i++) {
          var isCore = i % 5 < 2;
          seedT[i] = Math.random();
          seedSpeed[i] = isCore ? 0.018 + Math.random() * 0.03 : 0.012 + Math.random() * 0.05;
          seedRadius[i] = isCore ? Math.random() * 0.05 : 0.08 + Math.pow(Math.random(), 1.6) * 0.62;
          seedPhase[i] = Math.random() * Math.PI * 2;
          sizes[i] = isCore ? 26 + Math.random() * 30 : 16 + Math.random() * 34;
          glow[i] = isCore ? 0.55 + Math.random() * 0.45 : Math.pow(Math.random(), 2.0) * 0.7;
        }

        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));

        var uniforms = {
          uScale: { value: 1 },
          uConvergence: { value: 0 },
          uOpacity: { value: config.dark ? 1.0 : 0.55 },
          uColorBase: { value: new THREE.Color(config.dark ? 0xff7a7d : 0xe5484d) },
          uColorAward: { value: new THREE.Color(config.dark ? 0x4ade9f : 0x10b981) },
        };

        // Additive light blooms beautifully on the dark shell but washes out to
        // white over the light one, so each theme gets the blending it needs.
        var material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
          transparent: true,
          depthWrite: false,
          blending: config.dark ? THREE.AdditiveBlending : THREE.NormalBlending,
        });

        var cloud = new THREE.Points(geometry, material);
        scene.add(cloud);

        var award = curve.convergencePoint(CURVE_SCALE);
        var sample = { x: 0, y: 0, z: 0 };
        var convergence = 0;
        var targetConvergence = 0;
        var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        var running = false;
        var frame = 0;
        var elapsed = 0;
        var lastTime = 0;
        var disposed = false;

        function writePositions(time) {
          var pull = convergence * convergence;
          for (var n = 0; n < count; n++) {
            var t = (seedT[n] + time * seedSpeed[n]) % 1;
            curve.samplePoint(t, CURVE_SCALE, sample);

            var wobble = seedPhase[n] + time * 1.6;
            var radius = seedRadius[n] * (1 - pull * 0.92);
            var x = sample.x + Math.cos(wobble) * radius;
            var y = sample.y + Math.sin(wobble * 1.3) * radius * 0.7;
            var z = sample.z + Math.sin(wobble * 0.8) * radius;

            positions[n * 3] = x + (award.x - x) * pull * 0.55;
            positions[n * 3 + 1] = y + (award.y - y) * pull * 0.55;
            positions[n * 3 + 2] = z + (award.z - z) * pull * 0.55;
          }
          geometry.attributes.position.needsUpdate = true;
        }

        function render() {
          renderer.render(scene, camera);
        }

        function step(now) {
          if (disposed) return;
          frame = global.requestAnimationFrame(step);
          var delta = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
          lastTime = now;
          elapsed += delta;

          convergence += (targetConvergence - convergence) * Math.min(1, delta * 2.2);
          uniforms.uConvergence.value = convergence;

          pointer.x += (pointer.tx - pointer.x) * Math.min(1, delta * 3);
          pointer.y += (pointer.ty - pointer.y) * Math.min(1, delta * 3);

          cloud.rotation.y = Math.sin(elapsed * 0.12) * 0.35 + pointer.x * 0.5;
          cloud.rotation.x = Math.cos(elapsed * 0.09) * 0.16 + pointer.y * 0.3;
          guide.rotation.x = cloud.rotation.x;
          guide.rotation.y = cloud.rotation.y;

          writePositions(elapsed);
          render();
        }

        function resize() {
          if (disposed) return;
          var width = canvas.clientWidth || 1;
          var height = canvas.clientHeight || 1;
          var ratio = Math.min(global.devicePixelRatio || 1, MAX_PIXEL_RATIO);
          renderer.setPixelRatio(ratio);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          uniforms.uScale.value = Math.max(0.55, Math.min(1.5, height / 520));
          if (!running) {
            writePositions(elapsed);
            render();
          }
        }

        var controller = {
          reduced: reduced,
          setConvergence: function (value) {
            targetConvergence = Math.max(0, Math.min(1, Number(value) || 0));
            // Only the animation loop eases convergence. When it is not running
            // -- reduced motion, hidden tab, canvas scrolled away -- snap to the
            // target and repaint, otherwise the scene silently keeps the state
            // it had when the loop stopped and never catches up.
            if (!running) {
              convergence = targetConvergence;
              uniforms.uConvergence.value = convergence;
              writePositions(elapsed);
              render();
            }
          },
          setPointer: function (x, y) {
            pointer.tx = Math.max(-1, Math.min(1, Number(x) || 0));
            pointer.ty = Math.max(-1, Math.min(1, Number(y) || 0));
          },
          setTheme: function (dark) {
            uniforms.uColorBase.value.set(dark ? 0xff7a7d : 0xe5484d);
            uniforms.uColorAward.value.set(dark ? 0x4ade9f : 0x10b981);
            uniforms.uOpacity.value = dark ? 1.0 : 0.55;
            material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
            material.needsUpdate = true;
            guideMaterial.color.set(dark ? 0x94a3b8 : 0x0f172a);
            guideMaterial.opacity = dark ? 0.16 : 0.08;
            if (!running) render();
          },
          start: function () {
            if (disposed || running || reduced) return;
            running = true;
            lastTime = 0;
            frame = global.requestAnimationFrame(step);
          },
          stop: function () {
            if (!running) return;
            running = false;
            global.cancelAnimationFrame(frame);
          },
          resize: resize,
          /**
           * Introspection for QA: the CPU-side position buffer is the ground
           * truth of what the GPU draws, so its spread is a reliable assertion
           * target without needing preserveDrawingBuffer on the real renderer.
           */
          readState: function () {
            var spread = 0;
            for (var n = 0; n < count; n++) {
              var dx = positions[n * 3] - award.x;
              var dy = positions[n * 3 + 1] - award.y;
              var dz = positions[n * 3 + 2] - award.z;
              spread += Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
            return { convergence: convergence, running: running, spread: spread / count };
          },
          dispose: function () {
            if (disposed) return;
            disposed = true;
            controller.stop();
            geometry.dispose();
            material.dispose();
            guideGeometry.dispose();
            guideMaterial.dispose();
            renderer.dispose();
          },
        };

        resize();
        writePositions(0);
        render();
        if (typeof config.onReady === "function") config.onReady(controller);
        return controller;
      })
      .catch(function () {
        return null;
      });
  }

  global.BuyniverseWebGL = {
    createUniverse: createUniverse,
    supportsWebGl: supportsWebGl,
    prefersReducedMotion: prefersReducedMotion,
  };
})(window);
