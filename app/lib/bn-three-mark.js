/**
 * Buyniverse brand mark: a price tag that is also a window into space.
 *
 * Its glass face holds a spiral galaxy whose core is born in the eyelet, with
 * a luminous "b", a glowing brass eyelet and a strand of light for the cord.
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
   * A spiral galaxy painted to the tag's face: the core is born in the eyelet
   * and three arms sweep across the face toward the "b". Deterministic, so the
   * logo renders identically every time.
   */
  function galaxyFaceCanvas() {
    var W = 2048, H = Math.round(W * FACE.h / FACE.w);
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var unit = W / FACE.w;
    var cx = (FACE.eyeX - FACE.xmin) * unit, cy = (FACE.ymax - FACE.eyeY) * unit;
    var random = rng(7331);

    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.95);
    bg.addColorStop(0, "#2d1878");
    bg.addColorStop(0.3, "#150b40");
    bg.addColorStop(1, "#05040f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    [["rgba(109,74,255,0.22)", 0.55], ["rgba(22,217,160,0.10)", 0.45], ["rgba(255,92,122,0.09)", 0.4], ["rgba(109,74,255,0.16)", 0.5]].forEach(function (blob) {
      var x = cx + (random() * 1.6 - 0.2) * W * 0.5, y = random() * H, r = blob[1] * W * (0.6 + random() * 0.5);
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, blob[0]);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    var R = 2.1 * unit, arms = 3;
    for (var i = 0; i < 34000; i++) {
      var t = Math.pow(random(), 0.95);
      var r = t * R;
      var spread = (0.16 + 0.42 * t) * (random() + random() - 1);
      var a = (i % arms) / arms * Math.PI * 2 + t * 5.6 + spread;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.82;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      var warm = Math.max(0, 1 - t * 4);
      var cool = Math.min(1, t * 1.6);
      var red = Math.round(255 * (0.62 + 0.38 * warm) - 60 * cool * 0.4);
      var green = Math.round(200 * (0.62 + 0.3 * warm) + 20 * cool);
      var blue = Math.round(255 * (0.75 + 0.25 * cool) - 80 * warm);
      var size = 0.8 + Math.pow(random(), 9) * 4.5;
      ctx.fillStyle = "rgba(" + red + "," + green + "," + blue + "," + (0.3 + random() * 0.65).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (var s = 0; s < 1400; s++) {
      ctx.fillStyle = "rgba(230,225,255," + (0.2 + random() * 0.6).toFixed(2) + ")";
      ctx.fillRect(random() * W, random() * H, 1.4, 1.4);
    }
    var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.2);
    core.addColorStop(0, "rgba(255,236,200,0.95)");
    core.addColorStop(0.25, "rgba(255,196,128,0.55)");
    core.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
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
    var galaxy = keep(new THREE.CanvasTexture(galaxyFaceCanvas()));
    galaxy.colorSpace = THREE.SRGBColorSpace;
    galaxy.anisotropy = 8;
    galaxy.repeat.set(1 / FACE.w, 1 / FACE.h);
    galaxy.offset.set(-FACE.xmin / FACE.w, (FACE.h - FACE.ymax) / FACE.h);
    var face = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: galaxy, emissive: new THREE.Color(0xffffff), emissiveMap: galaxy, emissiveIntensity: 0.95, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02 }));
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
    var gold = new Uint8Array(stars);
    for (var i = 0; i < stars; i++) {
      base[i] = i / stars + random() / stars;
      seedA[i] = random() * 2 - 1;
      seedB[i] = random() * 2 - 1;
      seedC[i] = random() * 2 - 1;
      ringSize[i] = 0.9 + Math.pow(random(), 6) * 3.6;
      // Only the rare large stars flash gold; the rest take the band's colour.
      gold[i] = ringSize[i] > 2.2 && i % 3 === 0 ? 1 : 0;
    }
    var ringGeometry = keep(new THREE.BufferGeometry());
    ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
    ringGeometry.setAttribute("aSize", new THREE.BufferAttribute(ringSize, 1));
    ringGeometry.setAttribute("aColor", new THREE.BufferAttribute(ringColor, 3));
    ringGeometry.setAttribute("aBright", new THREE.BufferAttribute(ringBright, 1));
    ringGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(RING.cx, 0, 0), RING.rx + 0.5);
    var ringUniforms = { uScale: { value: 20 }, uOpacity: { value: 1 } };
    var ringMaterial = keep(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending, uniforms: ringUniforms,
      vertexShader: "attribute float aSize; attribute vec3 aColor; attribute float aBright; varying vec3 vC; varying float vB; uniform float uScale; void main(){ vC = aColor; vB = aBright; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, aSize * uScale / -mv.z); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uOpacity; varying vec3 vC; varying float vB; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float g = exp(-d * d * 3.2); float a = min(1.0, g * vB * 1.25) * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(vC * 1.15, a); }",
    }));
    group.add(new THREE.Points(ringGeometry, ringMaterial));

    var tmp = new THREE.Vector3();
    function setRingPhase(phase) {
      for (var k = 0; k < stars; k++) {
        var f = (base[k] + phase) % 1;
        // The band: a filament at the junction, widening to its fullest past the
        // front, then thinning and fading before it would close the loop.
        var widen = Math.min(1, f / 0.4);
        var spread = 0.006 + 0.085 * widen * widen * (3 - 2 * widen) * (1 - Math.max(0, (f - 0.75) / 0.25) * 0.5);
        ringPoint(RING.start - f * Math.PI * 2 * 0.93, tmp);
        ringPos[k * 3] = tmp.x + seedA[k] * spread;
        ringPos[k * 3 + 1] = tmp.y + seedB[k] * spread * 0.55;
        ringPos[k * 3 + 2] = tmp.z + seedC[k] * spread;
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
      if (node.material && node.material !== ringMaterial) [].concat(node.material).forEach(function (m) { solids.push(m); });
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
      },
      dispose: function () { trash.forEach(function (item) { item.dispose(); }); },
    };
  }


  global.BuyniverseMark = { build: buildMark, FACE: FACE };
})(window);
