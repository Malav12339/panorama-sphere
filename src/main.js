import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { imagesData } from "./imageData";
import GUI from "lil-gui";

const ROTATION_STEP = Math.PI / 4;

let defaultPreviewHotspotRotation = null;

let currentHotspots = [];
let previewHotspot = null;
let currentImageIndex = 0; // Track currently shown pano

const canvas = document.querySelector("#draw");

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  100
);
camera.position.set(0, 0, 0.1);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.rotateSpeed = -0.3
controls.enableDamping = true;
controls.enableZoom = true;

// Raycaster for hotspot clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Sphere panorama
const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);
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
  currentImageIndex = imageIndex;
  clearHotspots();

  const current = imagesData[imageIndex];

  const texture = textureLoader.load(
    current.imageName,
    (texture) => {
      fadeToTexture(texture);
      addHotspots(imageIndex);
    },
    undefined,
    (err) => {
      console.log("error loading texture: ", err);
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace
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
    transitionImageIndex: hotspotConfig.transitionImageIndex,
  };
}

// ----------*--------------------*----------*------------------------------------------------
previewHotspot = createPreviewHotspot();

function createPreviewHotspot() {
  const group = new THREE.Group()
  const RING_OUTER_RADIUS = 0.6;

  const ringGeometry = new THREE.RingGeometry(0.5, RING_OUTER_RADIUS, 30);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    side: THREE.DoubleSide,
    opacity: 0.8,
    transparent: true,
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(ring)

  // invisible click Area
  const clickGeometry = new THREE.CircleGeometry(RING_OUTER_RADIUS, 30)
  const clickMaterial = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  })
  const clickArea = new THREE.Mesh(clickGeometry, clickMaterial)
  group.add(clickArea)

  group.visible = false
  scene.add(group)

  return group;
}

// ----------*--------------------*----------*------------------------------------------------
function handleRotation(key) {
  if (key === "x" || key === "X") {
    previewHotspot.rotation.x += ROTATION_STEP;
  }
  if (key === "y" || key === "Y") {
    previewHotspot.rotation.y += ROTATION_STEP;
  }
  if (key === "z" || key === "Z") {
    previewHotspot.rotation.z += ROTATION_STEP;
  }
}

// CLICK EVENT

function handleSwipe(key) {
  const cameraX = camera.position.x
  const cameraY = camera.position.y
  const cameraZ = camera.position.z

  console.log("camera x ", cameraX)
  if(key === "ArrowLeft") {
    camera.position.lerp(new THREE.Vector3(cameraX + 10, cameraY, cameraZ), 0.1)
  }
}

window.addEventListener("keyup", (event) => {
  const key = event.key;

  handleSwipe(key)
  handleRotation(key);
  setToDefault(key);

  if (key == "Enter" && previewHotspot.visible) {
    const position = previewHotspot.position.clone();
    const rotation = previewHotspot.rotation.clone();

    imagesData[currentImageIndex].hotspots.push({
      position,
      rotation,
      transitionImageIndex: previewHotspot.imageIndex,
      transitionImageName: previewHotspot.imageName,
    });

    clearHotspots();
    addHotspots(currentImageIndex);

      console.log("AFTER ENTER \n", currentHotspots)
    previewHotspot.visible = false;

    return;
  }
});

function setToDefault(key) {
  if (key === "d" || key === "D") {
    previewHotspot.rotation.copy(defaultPreviewHotspotRotation);
  }
}


// Resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight * 0.8;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Zoom via FOV
window.addEventListener("wheel", (ev) => {
  camera.fov += ev.deltaY * 0.05;
  camera.updateProjectionMatrix();
});

window.addEventListener("click", (event) => {
  
  // FOR CLICKING EXISTING HOTSPOTS
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  console.log(currentHotspots)
  currentHotspots.forEach((h) => {
    const intersects = raycaster.intersectObject(h.clickArea);

    if (intersects.length > 0) {
      changeImage(h.transitionImageIndex);
    }
  });
});
// ====================== FADE TRANSITION ======================
function fadeToTexture(newTexture) {
  if (sphere.material.map) {
    sphere.material.map.dispose();
  }
  // Direct transition - no fade animation
  sphere.material.map = newTexture;
  sphere.material.opacity = 1;
  sphere.material.needsUpdate = true;
}
// =============================================================

// ====================== THUMBNAILS (20% AREA) ======================
const thumbsContainer = document.getElementById("thumbs");

imagesData.forEach((img, index) => {
  const thumb = document.createElement("img");
  thumb.src = img.imageName;
  thumb.className = "thumb";

  thumb.addEventListener("click", () => {
    changeImage(index);
  });

  thumb.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("imageIndex", index);
    event.dataTransfer.setData("imageName", img.imageName);

    previewHotspot.visible = false;
  });

  thumbsContainer.appendChild(thumb);
});

function calculateMousePos(mouseEvent) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);

  if (intersects.length > 0) {
    const point = intersects[0].point;

    // Position the hotspot much closer to camera (scale down the distance)
    const direction = point.clone().normalize();
    const distance = 15; // Place hotspot 10 units from camera instead of 50
    previewHotspot.position.copy(direction.multiplyScalar(distance));

    // Make the ring face outward from the sphere surface
    const outwardDirection = previewHotspot.position.clone().normalize();
    // previewHotspot.lookAt(
    //   previewHotspot.position.clone().add(outwardDirection)
    // );
  }
}

canvas.addEventListener("dragover", (ev) => {
  ev.preventDefault();
  // ev.dataTransfer.dropEffect = "copy";
});

canvas.addEventListener("drop", (ev) => {
  ev.preventDefault();

  calculateMousePos(ev);

  defaultPreviewHotspotRotation = previewHotspot.rotation.clone();

  previewHotspot.imageName = ev.dataTransfer.getData("imageName");
  previewHotspot.imageIndex = parseInt(ev.dataTransfer.getData("imageIndex"));

  previewHotspot.visible = true;
});

// Animation loop
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function init() {
  changeImage(0);
  animate();
}

init();
