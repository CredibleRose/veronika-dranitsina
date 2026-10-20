// Стеклянные 3D-объекты на первом экране: преломление, иридесценция, параллакс от курсора.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function startHero3D(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Холст прозрачный, поэтому стекло делаем через прозрачность + отражения:
  // сквозь него видно CSS-фон страницы, а края светятся радужной плёнкой
  const glass = (tint = 0xffffff, iridescence = 1) =>
    new THREE.MeshPhysicalMaterial({
      color: tint,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
      iridescence,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [180, 620],
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      specularIntensity: 1,
      envMapIntensity: 2.2,
    });

  const matte = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05, emissive: color, emissiveIntensity: 0.18 });

  const objects = [];
  const add = (mesh, base, spin, float) => {
    mesh.position.copy(base);
    mesh.userData = { base: base.clone(), spin, float, phase: Math.random() * Math.PI * 2 };
    scene.add(mesh);
    objects.push(mesh);
    return mesh;
  };

  // Цветные «капли» за стеклом: их и преломляет стекло
  add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 48), matte(0xff9b71)), new THREE.Vector3(3.6, 1.6, -3), [0, 0, 0], 0.4);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 48, 48), matte(0xa98bff)), new THREE.Vector3(5.6, -1.2, -2.5), [0, 0, 0], 0.5);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 48, 48), matte(0x7cc4ff)), new THREE.Vector3(-4.6, -2.4, -2), [0, 0, 0], 0.6);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 48, 48), matte(0xff7aa2)), new THREE.Vector3(-1.6, 2.9, -2.2), [0, 0, 0], 0.5);

  // Стекло
  add(new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.42, 64, 160), glass(0xffffff)), new THREE.Vector3(4.2, 1.2, 0), [0.25, 0.4, 0.1], 0.35);
  add(new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.7, 1.7, 8, 0.42), glass(0xf3ecff)), new THREE.Vector3(-4.3, -1.7, 0.6), [0.3, 0.22, 0], 0.3);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.5, 16, 48), glass(0xfff1ea)), new THREE.Vector3(5.2, -2.3, 1), [0.1, 0.1, 0.5], 0.45);
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 6), glass(0xe9f6ff)), new THREE.Vector3(-2.1, 2.5, 1.4), [0.2, 0.3, 0], 0.4);
  add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.19, 220, 32, 2, 3), glass(0xffffff)), new THREE.Vector3(1.4, -2.9, 1.2), [0.3, 0.5, 0.2], 0.3);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 8);
  scene.add(key, new THREE.AmbientLight(0xfff4ec, 0.5));

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollShift = 0;
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener("scroll", () => { scrollShift = Math.min(window.scrollY / window.innerHeight, 1.5); }, { passive: true });

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // На узком экране отодвигаем камеру, чтобы объекты не налезали на текст
    camera.position.z = w < 760 ? 22 : 14;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // Объекты «выплывают» при старте
  let intro = 0;
  let visible = true;
  let raf = 0;
  const clock = new THREE.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const t = clock.elapsedTime;
    intro = Math.min(1, intro + dt * 0.6);
    const ease = 1 - Math.pow(1 - intro, 4);
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    for (const m of objects) {
      const { base, spin, float, phase } = m.userData;
      if (!reduced) {
        m.rotation.x += spin[0] * dt;
        m.rotation.y += spin[1] * dt;
        m.rotation.z += spin[2] * dt;
      }
      const depth = 1 + base.z * 0.25;
      m.position.x = base.x + pointer.x * 0.5 * depth;
      m.position.y = base.y + (reduced ? 0 : Math.sin(t * float + phase) * 0.25) - pointer.y * 0.35 * depth + scrollShift * (2 + base.z) - (1 - ease) * 6;
      m.scale.setScalar(0.4 + 0.6 * ease);
    }
    camera.position.x = pointer.x * 0.4;
    camera.position.y = -pointer.y * 0.25;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  }).observe(canvas);

  raf = requestAnimationFrame(frame);
}
