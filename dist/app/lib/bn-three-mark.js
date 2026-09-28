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

    var cordPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 0.1, 0.02),
      new THREE.Vector3(-0.86, 0.34, 0.14),
      new THREE.Vector3(-1.06, 0.66, 0.1),
      new THREE.Vector3(-1.02, 0.98, -0.08),
      new THREE.Vector3(-0.78, 1.18, -0.18),
    ]);
    var cord = new THREE.Mesh(keep(new THREE.TubeGeometry(cordPath, 96, 0.024, 16, false)), keep(new THREE.MeshPhysicalMaterial({ color: 0x16d9a0, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0xc8fff0), emissive: new THREE.Color(0x16d9a0), emissiveIntensity: 0.85 })));
    group.add(cord);

    return { group: group, dispose: function () { trash.forEach(function (item) { item.dispose(); }); } };
  }


  global.BuyniverseMark = { build: buildMark, FACE: FACE };
})(window);
