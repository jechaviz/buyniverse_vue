/**
 * Buyniverse brand geometry — the "B-Infinity" monogram.
 *
 * A lemniscate (figure-eight) with an ascending diagonal bias to evoke growth.
 * This is the canonical corporate-identity curve, shared verbatim with
 * assets/brand/3d-identity/path/infinityCurve.js so the marketing site and the
 * product render the same mark. Framework-free on purpose: it returns plain
 * {x, y, z} samples, so it can feed Three.js, SVG or Canvas 2D alike.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;

  /**
   * Sample the monogram at t in [0, 1].
   * @param {number} t normalized position along the closed curve
   * @param {number} scale uniform scale applied to the sample
   * @param {{x:number,y:number,z:number}} [out] optional target to avoid allocation
   */
  function samplePoint(t, scale, out) {
    var target = out || { x: 0, y: 0, z: 0 };
    var angle = t * TAU;
    var a = 1.35;
    var denom = 1 + Math.sin(angle) * Math.sin(angle);

    var x = (a * Math.cos(angle)) / denom;
    var y = (a * Math.sin(angle) * Math.cos(angle)) / denom;
    var z = Math.cos(angle * 2) * 0.32;

    // Ergonomic asymmetry: taller upper loop, ascending diagonal growth bias.
    var lift = Math.sin(angle) * 0.18;
    var growth = (t - 0.5) * 0.5;

    x = x * 1.05 + growth * 0.3;
    y = y * 1.35 + lift + growth * 0.6;

    var s = typeof scale === "number" ? scale : 1;
    target.x = x * s;
    target.y = y * s;
    target.z = z * s;
    return target;
  }

  /**
   * Sample the curve into a flat Float32Array of xyz triples.
   * @param {number} count number of samples
   * @param {number} scale uniform scale
   */
  function sampleFlat(count, scale) {
    var total = Math.max(2, count | 0);
    var out = new Float32Array(total * 3);
    var p = { x: 0, y: 0, z: 0 };
    for (var i = 0; i < total; i++) {
      samplePoint(i / total, scale, p);
      out[i * 3] = p.x;
      out[i * 3 + 1] = p.y;
      out[i * 3 + 2] = p.z;
    }
    return out;
  }

  /**
   * The award node: where every competing offer converges. Sits at the
   * crossing point of the monogram, which is the visual centre of the mark.
   */
  function convergencePoint(scale) {
    return samplePoint(0, scale);
  }

  global.BuyniverseBrandCurve = {
    samplePoint: samplePoint,
    sampleFlat: sampleFlat,
    convergencePoint: convergencePoint,
  };
})(window);
