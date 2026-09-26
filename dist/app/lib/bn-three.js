/**
 * Buyniverse 3D brand system.
 *
 * One scene graph serves two jobs:
 *   - the brand mark: a violet planet (the market), a mint orbital ring (the
 *     sourcing cycle) and an amber cube riding that ring (the acquisition).
 *     tools/brand/render-mark.html renders it to the PNG logo assets, so the
 *     logo is an actual rendered 3D object rather than a flat vector;
 *   - the live hero universe: the same mark at scale, with every listed
 *     supplier orbiting it as a node coloured by sector.
 *
 * Production rules: Three.js is imported lazily from the vendored module,
 * reduced motion renders one still frame, the loop pauses off-screen or on a
 * hidden tab, device pixel ratio is capped, everything is disposed on
 * teardown, and any failure resolves to null so callers keep their fallback.
 */
(function (global) {
  "use strict";

  var THREE_URL = "assets/vendor/three.module.js";
  var threePromise = null;

  var PALETTE = {
    violet: 0x6d4aff,
    violetDeep: 0x2a1a8f,
    mint: 0x16d9a0,
    amber: 0xffb23f,
    coral: 0xff5c7a,
    sky: 0x5ab8ff,
    ink: 0x08071a,
  };
  var SECTOR_COLORS = { technology: 0x9b85ff, services: 0xff5c7a, operations: 0xffb23f, logistics: 0x16d9a0 };

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

  /**
   * A studio environment built from emissive panels, pre-filtered through
   * PMREM. It gives the clearcoat and iridescent materials something real to
   * reflect without shipping an HDR file or pulling examples/jsm modules.
   */
  function studioEnvironment(THREE, renderer) {
    var env = new THREE.Scene();
    var room = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0c0a24, side: THREE.BackSide }));
    env.add(room);
    function panel(color, intensity, w, h, x, y, z, rx, ry) {
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx || 0, ry || 0, 0);
      env.add(mesh);
    }
    panel(0xffffff, 6, 5, 2.2, 0, 5.5, 0, Math.PI / 2, 0);
    panel(0x9b85ff, 3.2, 3, 5, -5.5, 0.5, 0, 0, Math.PI / 2);
    panel(0x16d9a0, 2.2, 2.4, 4, 5.5, -0.5, 1, 0, -Math.PI / 2);
    panel(0xffd9a0, 2.6, 4, 1.2, 0, -1, -5.5, 0, 0);
    var pmrem = new THREE.PMREMGenerator(renderer);
    var target = pmrem.fromScene(env, 0.035);
    env.traverse(function (node) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) node.material.dispose();
    });
    pmrem.dispose();
    return target;
  }

  /** The mark: planet, atmosphere, ring and the acquisition cube. */
  function buildMark(THREE) {
    var group = new THREE.Group();
    var disposables = [];
    function keep(item) { disposables.push(item); return item; }

    var planet = new THREE.Mesh(
      keep(new THREE.SphereGeometry(1, 96, 64)),
      keep(new THREE.MeshPhysicalMaterial({
        color: PALETTE.violet,
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        iridescence: 0.55,
        iridescenceIOR: 1.35,
        sheen: 0.6,
        sheenColor: new THREE.Color(0xb9a8ff),
        emissive: new THREE.Color(PALETTE.violetDeep),
        emissiveIntensity: 0.22,
      }))
    );
    group.add(planet);

    // Fresnel rim that reads as atmosphere against dark and light grounds.
    var atmosphere = new THREE.Mesh(
      keep(new THREE.SphereGeometry(1.1, 64, 48)),
      keep(new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(0x8f74ff) }, uPower: { value: 3.4 } },
        vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 uColor; uniform float uPower; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), uPower); gl_FragColor = vec4(uColor, f * 0.55); }",
      }))
    );
    group.add(atmosphere);

    var ringPivot = new THREE.Group();
    ringPivot.rotation.set(1.18, 0.12, -0.42);
    group.add(ringPivot);

    var ring = new THREE.Mesh(
      keep(new THREE.TorusGeometry(1.62, 0.075, 32, 220)),
      keep(new THREE.MeshPhysicalMaterial({ color: PALETTE.mint, metalness: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(0x0d8f6b), emissiveIntensity: 0.5 }))
    );
    ringPivot.add(ring);

    var cube = new THREE.Mesh(
      keep(new THREE.BoxGeometry(0.44, 0.44, 0.44, 1, 1, 1)),
      keep(new THREE.MeshPhysicalMaterial({ color: PALETTE.amber, metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, emissive: new THREE.Color(0xff8a00), emissiveIntensity: 0.42 }))
    );
    ringPivot.add(cube);

    function placeCube(angle) {
      cube.position.set(Math.cos(angle) * 1.62, Math.sin(angle) * 1.62, 0);
      cube.rotation.set(0.62 + angle * 0.35, 0.78 + angle * 0.5, 0.1);
    }
    placeCube(0.72);

    return {
      group: group,
      planet: planet,
      ringPivot: ringPivot,
      placeCube: placeCube,
      dispose: function () { disposables.forEach(function (item) { item.dispose(); }); },
    };
  }

  function addLights(THREE, scene) {
    var key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 4, 5);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x16d9a0, 1.4);
    rim.position.set(4, -1, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x8f74ff, 0.35));
  }

  /**
   * Render the mark to a PNG data URL with a transparent background.
   * Used by tools/brand/render-mark.html to produce the logo assets.
   */
  function renderMarkPng(size) {
    return loadThree().then(function (THREE) {
      var canvas = document.createElement("canvas");
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(size, size, false);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      var scene = new THREE.Scene();
      var envTarget = studioEnvironment(THREE, renderer);
      scene.environment = envTarget.texture;
      addLights(THREE, scene);
      var mark = buildMark(THREE);
      mark.group.rotation.set(0.08, -0.35, 0.05);
      scene.add(mark.group);

      var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0.05, 8.3);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      var url = canvas.toDataURL("image/png");

      mark.dispose();
      envTarget.dispose();
      renderer.dispose();
      return url;
    });
  }

  /**
   * Live hero universe.
   * @param {HTMLCanvasElement} canvas
   * @param {{nodes: Array<{id:string, sector:string, score:number}>, dark: boolean}} options
   */
  function createUniverse(canvas, options) {
    var config = options || {};
    if (!canvas || !webglAvailable()) return Promise.resolve(null);

    return loadThree().then(function (THREE) {
      var reduced = reducedMotion();
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      var scene = new THREE.Scene();
      var envTarget = studioEnvironment(THREE, renderer);
      scene.environment = envTarget.texture;
      addLights(THREE, scene);

      var world = new THREE.Group();
      scene.add(world);
      var mark = buildMark(THREE);
      world.add(mark.group);

      // One node per real listed supplier, on three tilted orbital shells.
      var nodes = Array.isArray(config.nodes) ? config.nodes.slice(0, 64) : [];
      var nodeGeometry = new THREE.IcosahedronGeometry(0.075, 2);
      var nodeMaterials = {};
      var orbiters = nodes.map(function (node, index) {
        var color = SECTOR_COLORS[node.sector] || PALETTE.sky;
        if (!nodeMaterials[color]) {
          nodeMaterials[color] = new THREE.MeshPhysicalMaterial({ color: color, emissive: new THREE.Color(color), emissiveIntensity: 0.55, roughness: 0.3, clearcoat: 1 });
        }
        var mesh = new THREE.Mesh(nodeGeometry, nodeMaterials[color]);
        var shell = index % 3;
        var pivot = new THREE.Group();
        pivot.rotation.set([1.05, 0.6, 1.45][shell], [0.3, -0.5, 0.9][shell], [0.2, 0.8, -0.4][shell]);
        pivot.add(mesh);
        world.add(pivot);
        var scale = 0.7 + (Math.max(60, Math.min(100, Number(node.score) || 80)) - 60) / 40 * 0.8;
        mesh.scale.setScalar(scale);
        return { mesh: mesh, radius: [2.25, 2.7, 3.15][shell], speed: 0.08 + (index % 5) * 0.018, phase: (index / Math.max(1, nodes.length)) * Math.PI * 2 };
      });

      // Star field.
      var starCount = 900;
      var starPositions = new Float32Array(starCount * 3);
      for (var i = 0; i < starCount; i++) {
        var r = 7 + Math.random() * 9, theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      var starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      var starMaterial = new THREE.PointsMaterial({ color: config.dark ? 0xcfc6ff : 0x6d4aff, size: 0.035, transparent: true, opacity: config.dark ? 0.8 : 0.35, depthWrite: false });
      var stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0.35, 8.2);
      camera.lookAt(0, 0, 0);

      var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      var running = false, disposed = false, frame = 0, last = 0, elapsed = 0;

      function pose(time) {
        mark.group.rotation.y = -0.35 + time * 0.12;
        mark.placeCube(0.72 + time * 0.45);
        orbiters.forEach(function (o) {
          var a = o.phase + time * o.speed;
          o.mesh.position.set(Math.cos(a) * o.radius, Math.sin(a) * o.radius, 0);
        });
        stars.rotation.y = time * 0.01;
        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
        world.rotation.y = pointer.x * 0.35;
        world.rotation.x = pointer.y * 0.2;
      }

      function render() { renderer.render(scene, camera); }

      function loop(now) {
        if (disposed || !running) return;
        frame = global.requestAnimationFrame(loop);
        var delta = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        elapsed += delta;
        pose(elapsed);
        render();
      }

      function resize() {
        if (disposed) return;
        var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Keep the whole system in frame on narrow screens.
        camera.position.z = w / h < 0.9 ? 11.5 : 8.2;
        camera.updateProjectionMatrix();
        if (!running) { pose(elapsed); render(); }
      }

      var controller = {
        reduced: reduced,
        nodeCount: orbiters.length,
        start: function () {
          if (disposed || running || reduced) return;
          running = true;
          last = 0;
          frame = global.requestAnimationFrame(loop);
        },
        stop: function () {
          running = false;
          global.cancelAnimationFrame(frame);
        },
        setPointer: function (x, y) {
          pointer.tx = Math.max(-1, Math.min(1, Number(x) || 0));
          pointer.ty = Math.max(-1, Math.min(1, Number(y) || 0));
        },
        setTheme: function (dark) {
          starMaterial.color.set(dark ? 0xcfc6ff : 0x6d4aff);
          starMaterial.opacity = dark ? 0.8 : 0.35;
          if (!running) render();
        },
        resize: resize,
        dispose: function () {
          if (disposed) return;
          controller.stop();
          disposed = true;
          mark.dispose();
          nodeGeometry.dispose();
          Object.keys(nodeMaterials).forEach(function (key) { nodeMaterials[key].dispose(); });
          starGeometry.dispose();
          starMaterial.dispose();
          envTarget.dispose();
          renderer.dispose();
        },
      };

      resize();
      pose(0);
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
    createUniverse: createUniverse,
  };
})(window);
