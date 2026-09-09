import * as THREE from 'three/webgpu';
import { color, positionLocal, mix } from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BInfinityCurve } from './infinityCurve.js';

const CORAL = 0xE5484D;
const CORAL2 = 0xFF4D6D;
const INDIGO = 0x0F172A;
const MINT = 0x10B981;
const AMBER = 0xF59E0B;
const SLATE = 0x64748B;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(INDIGO, 0.045);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.4, 9);

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(INDIGO, 1);
const root = document.getElementById('root');
root.appendChild(renderer.domElement);
await renderer.init();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.minPolarAngle = Math.PI / 2 - 0.6;
controls.maxPolarAngle = Math.PI / 2 + 0.6;

// ---------- Lighting ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
ambient.name = 'ambientLight';
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(4, 5, 6);
key.name = 'keyLight';
scene.add(key);

const rim = new THREE.DirectionalLight(CORAL2, 1.1);
rim.position.set(-5, -2, -4);
rim.name = 'rimLight';
scene.add(rim);

const fillMint = new THREE.PointLight(MINT, 6, 12);
fillMint.position.set(-3, -1.5, 2);
fillMint.name = 'fillMint';
scene.add(fillMint);

// ---------- Monogram: B-Infinito ----------
const monogramGroup = new THREE.Group();
monogramGroup.name = 'monogramGroup';
scene.add(monogramGroup);

const curve = new BInfinityCurve(2.15);
const tubeGeo = new THREE.TubeGeometry(curve, 260, 0.16, 32, true);

const monoMaterial = new THREE.MeshPhysicalNodeMaterial({
  metalness: 0.65,
  roughness: 0.28,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
});

// Gradient colorNode along the tube using local position (coral -> coral2)
const gradFactor = positionLocal.y.mul(0.5).add(0.5).clamp(0, 1);
monoMaterial.colorNode = mix(color(CORAL), color(CORAL2), gradFactor);
monoMaterial.emissiveNode = mix(color(CORAL), color(CORAL2), gradFactor).mul(0.12);

const monogramMesh = new THREE.Mesh(tubeGeo, monoMaterial);
monogramMesh.name = 'monogramMesh';
monogramMesh.castShadow = false;
monogramGroup.add(monogramMesh);

// Inner thin duplicate for a "double lazo" precision-line accent
const innerTubeGeo = new THREE.TubeGeometry(curve, 260, 0.055, 16, true);
const innerMaterial = new THREE.MeshStandardNodeMaterial({
  color: new THREE.Color(0xF8FAFC),
  metalness: 0.2,
  roughness: 0.5,
  transparent: true,
  opacity: 0.5,
});
const innerMesh = new THREE.Mesh(innerTubeGeo, innerMaterial);
innerMesh.name = 'innerMonogramMesh';
innerMesh.scale.setScalar(1.045);
monogramGroup.add(innerMesh);

// ---------- Orbiting nodes: Buyer <-> Seller relationship ----------
const nodesGroup = new THREE.Group();
nodesGroup.name = 'nodesGroup';
scene.add(nodesGroup);

const nodeCount = 14;
const nodeData = [];
const nodeGeo = new THREE.SphereGeometry(0.055, 20, 20);
const buyerMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(CORAL2), emissive: new THREE.Color(CORAL), emissiveIntensity: 0.6, roughness: 0.4 });
const sellerMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(MINT), emissive: new THREE.Color(MINT), emissiveIntensity: 0.6, roughness: 0.4 });

for (let i = 0; i < nodeCount; i++) {
  const isBuyer = i % 2 === 0;
  const mesh = new THREE.Mesh(nodeGeo, isBuyer ? buyerMat : sellerMat);
  mesh.name = `orbitNode_${i}`;
  const t = i / nodeCount;
  nodeData.push({ mesh, t, speed: 0.02 + Math.random() * 0.01, offset: Math.random() * Math.PI * 2 });
  nodesGroup.add(mesh);
}

// ---------- Starfield / particle backdrop ----------
const starCount = 1800;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 18 + Math.random() * 22;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i * 3 + 2] = r * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xF8FAFC, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true });
const stars = new THREE.Points(starGeo, starMat);
stars.name = 'starfield';
scene.add(stars);

// Slow-drifting ambient dust near the monogram
const dustCount = 220;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 9;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({ color: 0x64748B, size: 0.02, transparent: true, opacity: 0.4 });
const dust = new THREE.Points(dustGeo, dustMat);
dust.name = 'dustField';
scene.add(dust);

// ---------- Ground plane (subtle) ----------
const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(0x0B1120), roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.6 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.2;
floor.name = 'floorPlane';
scene.add(floor);

// ---------- Scroll-driven camera behavior ----------
let scrollProgress = 0;
function updateScroll() {
  const max = document.body.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? window.scrollY / max : 0;
}
window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

// Mouse parallax
const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  monogramGroup.rotation.y = t * 0.15;
  monogramGroup.rotation.x = Math.sin(t * 0.2) * 0.08;
  monogramGroup.position.y = Math.sin(t * 0.5) * 0.1;

  const targetZ = 9 - scrollProgress * 4.5;
  const targetY = 0.4 - scrollProgress * 1.2;
  camera.position.z += (targetZ - camera.position.z) * 0.05;
  camera.position.y += (targetY - camera.position.y) * 0.05;

  camera.position.x += (mouse.x * 0.6 - camera.position.x * 0.15) * 0.03;
  camera.lookAt(0, -scrollProgress * 0.5, 0);

  nodeData.forEach((n) => {
    n.t += n.speed * dt;
    if (n.t > 1) n.t -= 1;
    const angle = n.t * Math.PI * 2;
    const a = 1.35;
    const denom = 1 + Math.sin(angle) * Math.sin(angle);
    let x = (a * Math.cos(angle)) / denom;
    let y = (a * Math.sin(angle) * Math.cos(angle)) / denom;
    const lift = Math.sin(angle) * 0.18;
    let z = Math.cos(angle * 2) * 0.32;
    x *= 1.05;
    y = y * 1.35 + lift;
    const growth = (n.t - 0.5) * 0.5;
    const scale = 2.15 * 1.12;
    n.mesh.position.set((x + growth * 0.3) * scale, (y + growth * 0.6) * scale, z * scale);
  });
  nodesGroup.rotation.copy(monogramGroup.rotation);
  nodesGroup.position.copy(monogramGroup.position);

  stars.rotation.y = t * 0.01;
  dust.rotation.y = t * 0.02;
  dust.position.y = Math.sin(t * 0.3) * 0.2;

  fillMint.intensity = 5 + Math.sin(t * 1.5) * 1.5;

  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});