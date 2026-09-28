/**
 * Buyniverse brand mark: a price tag that is also a window into space.
 *
 * Its glass face holds a nebula of light born in the eyelet; the cord leaves the
 * eyelet as a filament and becomes a gradient ring with stars riding on it.
 * The same object renders the PNG logo (tools/brand/render-mark.html) and
 * floats at the heart of the hero galaxy (app/lib/bn-three.js), so the logo
 * holds a universe and the universe is organised around a purchase.
 */
(function (global) {
  "use strict";

  // Deterministic PRNG so the mark renders identically every time.
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

  // The tag's face in shape space spans x -1.25..1.2 and y -0.8..0.8. The
  // galaxy is painted in that frame so its core sits exactly on the eyelet.
  var FACE = { xmin: -1.25, w: 2.45, ymax: 0.8, h: 1.6, eyeX: -0.72, eyeY: 0 };

  /**
   * The tag's face: smooth nebula gradients, no star speckle. Light is born in
   * the eyelet (warm gold into magenta and violet), deepening to indigo, with a
   * mint glow low on the right and a diagonal glass sheen. A one-level dither
   * keeps the long dark gradients from banding without reading as noise.
   */
  function faceCanvas() {
    var W = 2048, H = Math.round(W * FACE.h / FACE.w);
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var unit = W / FACE.w;
    var cx = (FACE.eyeX - FACE.xmin) * unit, cy = (FACE.ymax - FACE.eyeY) * unit;
    function radial(x, y, r, stops) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      stops.forEach(function (stop) { g.addColorStop(stop[0], stop[1]); });
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    var base = ctx.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, "#2a1470");
    base.addColorStop(0.55, "#140c45");
    base.addColorStop(1, "#0a0826");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    radial(W * 0.78, H * 0.08, W * 0.55, [[0, "rgba(143,116,255,0.42)"], [1, "rgba(143,116,255,0)"]]);
    radial(W * 0.9, H * 0.95, W * 0.5, [[0, "rgba(22,217,160,0.26)"], [1, "rgba(22,217,160,0)"]]);
    radial(cx, cy, W * 0.75, [
      [0, "rgba(255,226,178,0.95)"],
      [0.08, "rgba(255,170,150,0.75)"],
      [0.2, "rgba(214,92,200,0.45)"],
      [0.42, "rgba(109,74,255,0.28)"],
      [1, "rgba(109,74,255,0)"],
    ]);

    var sheen = ctx.createLinearGradient(W * 0.35, 0, W * 0.75, H);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.48, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.52, "rgba(255,255,255,0.07)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);

    var image = ctx.getImageData(0, 0, W, H), data = image.data, random = rng(99);
    for (var i = 0; i < data.length; i += 4) {
      var d = random() - 0.5;
      data[i] += d; data[i + 1] += d; data[i + 2] += d;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  /**
   * The mark: a price tag that is also a window into space. Its glass face
   * holds a spiral galaxy whose core is born in the eyelet; a luminous "b",
   * a glowing brass eyelet and a strand of light for the cord.
   */
  function buildMark(THREE) {
    var group = new THREE.Group();
    var trash = [];
    function keep(item) { trash.push(item); return item; }

    var tag = new THREE.Shape();
    tag.moveTo(-0.55, 0.72);
    tag.lineTo(0.92, 0.72);
    tag.quadraticCurveTo(1.12, 0.72, 1.12, 0.52);
    tag.lineTo(1.12, -0.52);
    tag.quadraticCurveTo(1.12, -0.72, 0.92, -0.72);
    tag.lineTo(-0.55, -0.72);
    tag.lineTo(-1.1, -0.14);
    tag.quadraticCurveTo(-1.19, 0, -1.1, 0.14);
    tag.closePath();
    var hole = new THREE.Path();
    hole.absarc(-0.72, 0, 0.12, 0, Math.PI * 2, true);
    tag.holes.push(hole);

    var depth = 0.12, bevel = 0.045;
    // Cap faces carry the galaxy under a glass clearcoat; the extruded edge
    // stays brand-violet metal, which is what still reads as a tag at 16 px.
    // ExtrudeGeometry cap UVs are shape coordinates, remapped here to 0..1.
    var galaxy = keep(new THREE.CanvasTexture(faceCanvas()));
    galaxy.colorSpace = THREE.SRGBColorSpace;
    galaxy.anisotropy = 8;
    galaxy.repeat.set(1 / FACE.w, 1 / FACE.h);
    galaxy.offset.set(-FACE.xmin / FACE.w, (FACE.h - FACE.ymax) / FACE.h);
    var face = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: galaxy, emissive: new THREE.Color(0xffffff), emissiveMap: galaxy, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02 }));
    var edge = keep(new THREE.MeshPhysicalMaterial({ color: 0x7c5cff, metalness: 0.35, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.35, iridescenceIOR: 1.3, emissive: new THREE.Color(0x2a148f), emissiveIntensity: 0.45 }));
    var body = new THREE.Mesh(
      keep(new THREE.ExtrudeGeometry(tag, { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 48 })),
      [face, edge]
    );
    body.position.z = -depth / 2;
    group.add(body);

    // Geometric "b": a stem and a bowl, embossed on the face.
    var stem = new THREE.Shape();
    stem.moveTo(0.02, -0.47); stem.lineTo(0.2, -0.47); stem.lineTo(0.2, 0.5); stem.lineTo(0.02, 0.5); stem.closePath();
    var bowl = new THREE.Shape();
    bowl.absarc(0.44, -0.14, 0.33, 0, Math.PI * 2, false);
    var counter = new THREE.Path();
    counter.absarc(0.44, -0.14, 0.15, 0, Math.PI * 2, true);
    bowl.holes.push(counter);
    var emboss = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.6 }));
    [stem, bowl].forEach(function (shape) {
      var mesh = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3, curveSegments: 48 })), emboss);
      mesh.position.set(-0.02, 0, depth / 2 + bevel - 0.005);
      group.add(mesh);
    });

    var brass = keep(new THREE.MeshPhysicalMaterial({ color: 0xffb95a, metalness: 1, roughness: 0.2, clearcoat: 0.6, emissive: new THREE.Color(0xff9a3c), emissiveIntensity: 0.45 }));
    var eyelet = new THREE.Mesh(keep(new THREE.TorusGeometry(0.135, 0.032, 24, 64)), brass);
    eyelet.position.set(-0.72, 0, depth / 2 + bevel * 0.4);
    group.add(eyelet);

    // ---- The cord becomes a ring of stars -----------------------------------
    // A filament of light leaves the eyelet, meets a tilted orbit around the
    // tag, and there dissolves into a band of stars that widens as it circles
    // (in front below, behind above) and fades before closing the loop: the
    // universe coming out of the tag. The band's shape is fixed; its stars
    // stream along it, so setRingPhase() turns the ring without ever tearing
    // it away from the eyelet.
    var RING = { cx: 0.08, rx: 1.58, ky: 0.55, kz: 0.9, tilt: 0.2, start: Math.PI };
    var cosT = Math.cos(RING.tilt), sinT = Math.sin(RING.tilt);
    function ringPoint(theta, out) {
      var x = RING.cx + RING.rx * Math.cos(theta), y = -RING.ky * Math.sin(theta), z = RING.kz * Math.sin(theta);
      return out.set(x * cosT - y * sinT, x * sinT + y * cosT, z);
    }

    var junction = ringPoint(RING.start, new THREE.Vector3());
    var thread = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 0.02, depth / 2 + 0.02),
      new THREE.Vector3(-0.98, 0.05, 0.16),
      ringPoint(RING.start + 0.2, new THREE.Vector3()),
      junction.clone(),
    ]);
    var threadMaterial = keep(new THREE.MeshPhysicalMaterial({ color: 0x16d9a0, roughness: 0.35, emissive: new THREE.Color(0x3cf5c4), emissiveIntensity: 1.1 }));
    group.add(new THREE.Mesh(keep(new THREE.TubeGeometry(thread, 64, 0.018, 12, false)), threadMaterial));

    var stars = 5200;
    var base = new Float32Array(stars), seedA = new Float32Array(stars), seedB = new Float32Array(stars), seedC = new Float32Array(stars);
    var ringPos = new Float32Array(stars * 3), ringSize = new Float32Array(stars), ringColor = new Float32Array(stars * 3), ringBright = new Float32Array(stars);
    var random = rng(4242);
    var gold = new Uint8Array(stars), keepSparse = new Float32Array(stars);
    for (var i = 0; i < stars; i++) {
      base[i] = i / stars + random() / stars;
      seedA[i] = random() * 2 - 1;
      seedB[i] = random() * 2 - 1;
      seedC[i] = random() * 2 - 1;
      ringSize[i] = 0.9 + Math.pow(random(), 6) * 3.6;
      // Only the rare large stars flash gold; the rest take the band's colour.
      gold[i] = ringSize[i] > 2.2 && i % 3 === 0 ? 1 : 0;
      // At small sizes only ~1 in 60 stars survives, drawn larger and softer:
      // thousands of 1 px points would merge into a pixelated smudge.
      keepSparse[i] = i % 60 === 0 ? 2 : i % 9 === 0 ? 1 : 0;
    }
    var ringGeometry = keep(new THREE.BufferGeometry());
    ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
    ringGeometry.setAttribute("aSize", new THREE.BufferAttribute(ringSize, 1));
    ringGeometry.setAttribute("aColor", new THREE.BufferAttribute(ringColor, 3));
    ringGeometry.setAttribute("aBright", new THREE.BufferAttribute(ringBright, 1));
    ringGeometry.setAttribute("aKeep", new THREE.BufferAttribute(keepSparse, 1));
    ringGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(RING.cx, 0, 0), RING.rx + 0.5);
    var ringUniforms = { uScale: { value: 20 }, uOpacity: { value: 1 }, uCompact: { value: 0 }, uKeepMin: { value: 1 }, uSizeBoost: { value: 1.5 } };
    var ringMaterial = keep(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending, uniforms: ringUniforms,
      vertexShader: "attribute float aSize; attribute vec3 aColor; attribute float aBright; attribute float aKeep; varying vec3 vC; varying float vB; uniform float uScale; uniform float uKeepMin; uniform float uSizeBoost; void main(){ vC = aColor; vB = aBright; if (aKeep < uKeepMin - 0.5) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, aSize * uScale * uSizeBoost / -mv.z); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uOpacity; varying vec3 vC; varying float vB; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float g = exp(-d * d * 3.2); float a = min(1.0, g * vB * 1.25) * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(vC * 1.15, a); }",
    }));
    group.add(new THREE.Points(ringGeometry, ringMaterial));

    // A smooth, camera-facing ribbon of light under the stars. At small sizes it
    // carries the ring on its own; a pulse travelling along it shows the turn.
    var SEGMENTS = 260;
    var ribbonPos = new Float32Array((SEGMENTS + 1) * 2 * 3), ribbonAcross = new Float32Array((SEGMENTS + 1) * 2), ribbonF = new Float32Array((SEGMENTS + 1) * 2);
    var ribbonIndex = [];
    var c0 = new THREE.Vector3(), c1 = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3(), facing = new THREE.Vector3(0, 0, 1);
    for (var q = 0; q <= SEGMENTS; q++) {
      var fq = q / SEGMENTS;
      ringPoint(RING.start - fq * Math.PI * 2 * 0.93, c0);
      ringPoint(RING.start - (fq + 0.002) * Math.PI * 2 * 0.93, c1);
      tangent.subVectors(c1, c0).normalize();
      side.crossVectors(tangent, facing).normalize();
      var grow = Math.min(1, fq / 0.4);
      var half = 0.012 + 0.07 * grow * grow * (3 - 2 * grow) * (1 - Math.max(0, (fq - 0.75) / 0.25) * 0.5);
      for (var e = 0; e < 2; e++) {
        var sign = e ? 1 : -1, v = q * 2 + e;
        ribbonPos[v * 3] = c0.x + side.x * half * sign;
        ribbonPos[v * 3 + 1] = c0.y + side.y * half * sign;
        ribbonPos[v * 3 + 2] = c0.z + side.z * half * sign;
        ribbonAcross[v] = sign;
        ribbonF[v] = fq;
      }
      if (q < SEGMENTS) ribbonIndex.push(q * 2, q * 2 + 1, q * 2 + 2, q * 2 + 1, q * 2 + 3, q * 2 + 2);
    }
    var ribbonGeometry = keep(new THREE.BufferGeometry());
    ribbonGeometry.setAttribute("position", new THREE.BufferAttribute(ribbonPos, 3));
    ribbonGeometry.setAttribute("aAcross", new THREE.BufferAttribute(ribbonAcross, 1));
    ribbonGeometry.setAttribute("aF", new THREE.BufferAttribute(ribbonF, 1));
    ribbonGeometry.setIndex(ribbonIndex);
    var ribbonUniforms = { uPhase: { value: 0 }, uOpacity: { value: 1 }, uStrength: { value: 1 } };
    var ribbonMaterial = keep(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, uniforms: ribbonUniforms,
      vertexShader: "attribute float aAcross; attribute float aF; varying float vAcross; varying float vF; void main(){ vAcross = aAcross; vF = aF; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: [
        "uniform float uPhase; uniform float uOpacity; uniform float uStrength; varying float vAcross; varying float vF;",
        "void main(){",
        "  float across = exp(-vAcross * vAcross * 2.4);",
        "  float along = smoothstep(0.0, 0.05, vF) * (1.0 - smoothstep(0.78, 1.0, vF));",
        "  float pulse = 0.7 + 0.3 * sin((vF - uPhase) * 6.2831853 * 3.0);",
        "  vec3 mint = vec3(0.24, 0.96, 0.77); vec3 star = vec3(0.95, 0.93, 1.0); vec3 violet = vec3(0.62, 0.52, 1.0);",
        "  vec3 col = mix(mint, star, smoothstep(0.0, 0.16, vF));",
        "  col = mix(col, violet, smoothstep(0.3, 0.75, vF));",
        "  col = mix(col, vec3(1.0), exp(-vAcross * vAcross * 14.0) * 0.45);",
        "  float a = across * along * pulse * uStrength * uOpacity;",
        "  if (a < 0.004) discard;",
        "  gl_FragColor = vec4(col, a);",
        "}",
      ].join("\n"),
    }));
    var ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    ribbon.renderOrder = 1;
    group.add(ribbon);

    var tmp = new THREE.Vector3();
    function setRingPhase(phase) {
      ribbonUniforms.uPhase.value = phase;
      for (var k = 0; k < stars; k++) {
        var f = (base[k] + phase) % 1;
        // The band: a filament at the junction, widening to its fullest past the
        // front, then thinning and fading before it would close the loop.
        var widen = Math.min(1, f / 0.4);
        var spread = 0.006 + 0.085 * widen * widen * (3 - 2 * widen) * (1 - Math.max(0, (f - 0.75) / 0.25) * 0.5);
        ringPoint(RING.start - f * Math.PI * 2 * 0.93, tmp);
        ringPos[k * 3] = tmp.x + seedA[k] * spread * 0.6;
        ringPos[k * 3 + 1] = tmp.y + seedB[k] * spread * 0.35;
        ringPos[k * 3 + 2] = tmp.z + seedC[k] * spread * 0.6;
        // Colour follows the band, not the star: mint as it leaves the thread,
        // starlight white, then lavender and violet as the orbit widens.
        var toWhite = Math.min(1, f / 0.16), toViolet = Math.max(0, Math.min(1, (f - 0.3) / 0.45));
        var r = 0.24 + (0.95 - 0.24) * toWhite, g = 0.96 + (0.93 - 0.96) * toWhite, b = 0.77 + (1.0 - 0.77) * toWhite;
        r += (0.62 - r) * toViolet; g += (0.52 - g) * toViolet; b += (1.0 - b) * toViolet;
        if (gold[k]) { r = 1.0; g = 0.82; b = 0.52; }
        ringColor[k * 3] = r; ringColor[k * 3 + 1] = g; ringColor[k * 3 + 2] = b;
        ringBright[k] = Math.min(1, f / 0.04) * (1 - Math.max(0, (f - 0.8) / 0.2)) * (0.7 + 0.3 * (1 - widen * 0.5));
      }
      ringGeometry.attributes.position.needsUpdate = true;
      ringGeometry.attributes.aBright.needsUpdate = true;
      ringGeometry.attributes.aColor.needsUpdate = true;
    }
    setRingPhase(0);

    var solids = [];
    group.traverse(function (node) {
      if (node.material && node.material !== ringMaterial && node.material !== ribbonMaterial) [].concat(node.material).forEach(function (m) { solids.push(m); });
    });

    return {
      group: group,
      setRingPhase: setRingPhase,
      /** Star size factor: pixels per unit at unit depth (scale with canvas height). */
      setPointScale: function (value) { ringUniforms.uScale.value = value; },
      /** Fade the whole mark, ring included (used by the hero's hover reveal). */
      setOpacity: function (value) {
        var o = Math.max(0, Math.min(1, value));
        solids.forEach(function (m) { m.transparent = o < 0.999; m.depthWrite = o >= 0.999; m.opacity = o; });
        ringUniforms.uOpacity.value = o;
        ribbonUniforms.uOpacity.value = o;
      },
      /**
       * The gradient ribbon is the ring at every size; stars ride on it.
       * "compact" (navbar, favicon, orbit strip) keeps a handful of soft
       * sparkles; "full" (large logo, hero) a curated few hundred.
       */
      setDetail: function (mode) {
        var compact = mode === "compact";
        ringUniforms.uKeepMin.value = compact ? 2 : 1;
        ringUniforms.uSizeBoost.value = compact ? 2.4 : 1.5;
      },
      dispose: function () { trash.forEach(function (item) { item.dispose(); }); },
    };
  }


  global.BuyniverseMark = { build: buildMark, FACE: FACE };
})(window);
