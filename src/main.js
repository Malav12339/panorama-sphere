import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { imagesData } from "./imageData";
import GUI from "lil-gui";

let currentHotspots = [];

const canvas = document.querySelector("#draw");

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 0.1);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = true;

// Raycaster for hotspot clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Sphere panorama
const sphereGeometry = new THREE.SphereGeometry(50, 64, 64);
sphereGeometry.scale(-1, 1, 1);

const sphereMaterial = new THREE.MeshBasicMaterial({
  // map: panoTexture,
  transparent: true, // IMPORTANT for fading
  opacity: 1,
});

const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// HOT SPOT LOGIC  ----------*--------------------*----------*------------------------------------------------

function changeImage(imageIndex) {
  clearHotspots();

  const current = imagesData[imageIndex];

  textureLoader.load(current.imageName, (texture) => {
    fadeToTexture(texture);
    addHotspots(imageIndex);
  });
}

function addHotspots(imageIndex) {
  const imageData = imagesData[imageIndex];

  imageData.hotspots.forEach((h) => {
    const hotspot = getHotspot(h);
    scene.add(hotspot.ring);
    scene.add(hotspot.clickArea);

    currentHotspots.push(hotspot);
  });
}

function clearHotspots() {
  currentHotspots.forEach((h) => {
    scene.remove(h.ring);
    scene.remove(h.clickArea);

    h.ring.geometry.dispose();
    h.ring.material.dispose();
    h.clickArea.geometry.dispose();
    h.clickArea.material.dispose();
  });
  currentHotspots = [];
}

function getHotspot(hotspotConfig) {
  const RING_OUTER_RADIUS = 0.6;

  // ring
  const ringGeometry = new THREE.RingGeometry(0.5, RING_OUTER_RADIUS, 30);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(hotspotConfig.position);
  ring.rotation.copy(hotspotConfig.rotation);

  // invisible clickable area
  const clickGeometry = new THREE.CircleGeometry(RING_OUTER_RADIUS, 30);
  const clickMaterial = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });

  const clickArea = new THREE.Mesh(clickGeometry, clickMaterial);
  clickArea.position.copy(hotspotConfig.position);
  clickArea.rotation.copy(hotspotConfig.rotation);

  return { 
    ring, 
    clickArea,
    transitionImageIndex: hotspotConfig.transitionImageIndex
  };
}

// ----------*--------------------*----------*------------------------------------------------

// CLICK EVENT
window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  currentHotspots.forEach((h) => {
    const intersects = raycaster.intersectObject(h.clickArea);

    if (intersects.length > 0) {
      changeImage(h.transitionImageIndex);
    }
  });
});

// Animation loop
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Zoom via FOV
window.addEventListener("wheel", (ev) => {
  camera.fov += ev.deltaY * 0.05;
  camera.updateProjectionMatrix();
});

window.addEventListener("keyup", (ev) => {
  const key = ev.key;
  console.log(key);
  if (key >= "1" && key <= "5") {
    const imageIndex = key - 1;
    if (imageIndex < imagesData.length) {
      changeImage(key - 1);
    }
  }
});

// ====================== FADE TRANSITION ======================
function fadeToTexture(newTexture) {
  let t = 1;

  function fadeOut() {
    t -= 0.2;
    sphere.material.opacity = t;

    if (t > 0) {
      requestAnimationFrame(fadeOut);
    } else {
      sphere.material.map = newTexture;
      sphere.material.needsUpdate = true;
      fadeIn();
    }
  }

  function fadeIn() {
    t += 0.05;
    sphere.material.opacity = t;

    if (t < 1) {
      requestAnimationFrame(fadeIn);
    }
  }

  fadeOut();
}
// =============================================================

function init() {
  changeImage(0);
  animate();
}

init();
