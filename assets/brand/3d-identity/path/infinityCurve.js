import * as THREE from 'three/webgpu';

// Custom curve that traces a "B-Infinito" monogram: a double interconnected loop
// (figure-eight / infinity shape) with an ascending diagonal bias to evoke growth.
export class BInfinityCurve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const angle = t * Math.PI * 2;

    // Classic lemniscate (figure-eight) parametrization
    const a = 1.35;
    const denom = 1 + Math.sin(angle) * Math.sin(angle);
    let x = (a * Math.cos(angle)) / denom;
    let y = (a * Math.sin(angle) * Math.cos(angle)) / denom;

    // Add ergonomic asymmetry: taller upper loop, ascending diagonal growth bias
    const lift = Math.sin(angle) * 0.18;
    let z = Math.cos(angle * 2) * 0.32;

    x *= 1.05;
    y = y * 1.35 + lift;

    // Ascending diagonal dynamism
    const growth = (t - 0.5) * 0.5;

    const v = optionalTarget.set(x + growth * 0.3, y + growth * 0.6, z);
    return v.multiplyScalar(this.scale);
  }
}