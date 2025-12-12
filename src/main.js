import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { imagesData } from "./imageData";
import GUI from "lil-gui";

const ROTATION_STEP = Math.PI / 4;

let defaultPreviewHotspotRotation = null;

let currentHotspots = [];
let previewHotspot = null;
let currentImageIndex = 0; // Track currently shown pano

let mode = "view"; // view or edit
let selectedHotspot = null;
let isSelectedPreviewHotspot = false;

let isDragging = false;

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
controls.rotateSpeed = -0.3;
controls.enableDamping = true;
controls.enableZoom = false;

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

  previewHotspot.visible = false;
  const current = imagesData[imageIndex];

  textureLoader.load(
    current.imageName,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      fadeToTexture(texture);
      addHotspots(imageIndex);
    },
    undefined,
    (err) => {
      console.log("error loading texture: ", err);
    }
  );
}

function addHotspots(imageIndex) {
  const imageData = imagesData[imageIndex];

  imageData.hotspots.forEach((h) => {
    const group = new THREE.Group();

    group.position.copy(h.position);
    group.rotation.copy(h.rotation);

    const hotspot = getHotspot(h);

    group.add(hotspot.ring);
    group.add(hotspot.clickArea);
    scene.add(group);

    // ref for raycasting
    hotspot.clickArea.userData.group = group;

    currentHotspots.push({
      group,
      ring: hotspot.ring,
      clickArea: hotspot.clickArea,
      transitionImageIndex: hotspot.transitionImageIndex,
      transitionImageName: h.transitionImageName,
    });
  });
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
  // ring.position.copy(hotspotConfig.position);
  // ring.rotation.copy(hotspotConfig.rotation);

  // invisible clickable area
  const clickGeometry = new THREE.CircleGeometry(RING_OUTER_RADIUS, 30);
  const clickMaterial = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });

  const clickArea = new THREE.Mesh(clickGeometry, clickMaterial);
  // clickArea.position.copy(hotspotConfig.position);
  // clickArea.rotation.copy(hotspotConfig.rotation);

  return {
    ring,
    clickArea,
    transitionImageIndex: hotspotConfig.transitionImageIndex,
  };
}

function clearHotspots() {
  currentHotspots.forEach((h) => {
    scene.remove(h.group);

    h.ring.geometry.dispose();
    h.ring.material.dispose();
    h.clickArea.geometry.dispose();
    h.clickArea.material.dispose();
  });
  currentHotspots = [];
}

// ----------*--------------------*----------*------------------------------------------------
previewHotspot = createPreviewHotspot();

function createPreviewHotspot() {
  const group = new THREE.Group();
  const RING_OUTER_RADIUS = 0.6;

  const ringGeometry = new THREE.RingGeometry(0.5, RING_OUTER_RADIUS, 30);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    side: THREE.DoubleSide,
    opacity: 0.8,
    transparent: true,
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(ring);

  // invisible click Area
  const clickGeometry = new THREE.CircleGeometry(RING_OUTER_RADIUS, 30);
  const clickMaterial = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });
  const clickArea = new THREE.Mesh(clickGeometry, clickMaterial);
  group.add(clickArea);

  group.visible = false;
  scene.add(group);

  group.userData.mesh = clickArea;

  return group;
}

// ----------*--------------------*----------*------------------------------------------------
function handleRotation(key) {
  if (key === "x" || key === "X") {
    const target = isSelectedPreviewHotspot ? previewHotspot : selectedHotspot;

    if (target) {
      target.rotation.x += ROTATION_STEP;
    }
  }
  if (key === "y" || key === "Y") {
    if (isSelectedPreviewHotspot) previewHotspot.rotation.y += ROTATION_STEP;
    if (selectedHotspot) selectedHotspot.rotation.y += ROTATION_STEP;
  }
  if (key === "z" || key === "Z") {
    if (isSelectedPreviewHotspot) previewHotspot.rotation.z += ROTATION_STEP;
    if (selectedHotspot) selectedHotspot.rotation.z += ROTATION_STEP;
  }
}

// CLICK EVENT
window.addEventListener("keyup", (event) => {
  const key = event.key;

  handleRotation(key);
  setToDefault(key);

  if (key === "h") {
    previewHotspot.visible = !previewHotspot.visible;
  }

  if (key === "e" || key === "E") {
    if (mode === "view") mode = "edit";
    else mode = "view";
    console.log("mode: ", mode);
  }

  if (key === "Enter" && previewHotspot.visible) {
    if (previewHotspot) {
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

      previewHotspot.visible = false;

      return;
    }
    updateRootHotspotsData()
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
canvas.addEventListener("wheel", (ev) => {
  // camera.fov += ev.deltaY * 0.05;
  camera.fov = THREE.MathUtils.clamp(camera.fov + ev.deltaY * 0.05, 35, 75);

  camera.updateProjectionMatrix();
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // 1️⃣ CHECK REAL HOTSPOTS FIRST
  let clickedAHotspot = false;

  for (let i = 0; i < currentHotspots.length; i++) {
    const h = currentHotspots[i];
    const intersects = raycaster.intersectObject(h.clickArea);

    if (intersects.length > 0) {
      clickedAHotspot = true;

      if (mode === "edit") {
        selectedHotspot = h.group;
      } else {
        changeImage(h.transitionImageIndex);
      }

      break; // 🔥 IMPORTANT
    }
  }

  // If a real hotspot was clicked, stop NOW
  if (clickedAHotspot) return;

  // 2️⃣ OTHERWISE CHECK PREVIEW HOTSPOT
  const previewIntersects = raycaster.intersectObject(
    previewHotspot.userData.mesh
  );

  if (previewIntersects.length > 0) {
    console.log("preview intersects:", previewIntersects);
    isSelectedPreviewHotspot = true;
    selectedHotspot = previewHotspot;
    return;
  }

  // 3️⃣ NOTHING HIT
  selectedHotspot = null;
});

canvas.addEventListener("mousedown", (mouseEvent) => {
  if (mode === "view") {
    console.log("Please enter edit mode to edit");
    return;
  }

  const rect = canvas.getBoundingClientRect();
  mouse.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const previewIntersects = raycaster.intersectObject(
    previewHotspot.userData.mesh
  );

  let hitObjectGroup;
  if (previewIntersects.length > 0) {
    isSelectedPreviewHotspot = true;
    selectedHotspot = previewHotspot;
    controls.enabled = false;
    isDragging = true;

    return;
  }

  const clickMeshes = currentHotspots.map((h) => h.clickArea);
  const intersects = raycaster.intersectObjects(clickMeshes);
  if (intersects.length > 0) {
    hitObjectGroup = intersects[0].object.userData.group;
    selectedHotspot = hitObjectGroup;
    isDragging = true;
    controls.enabled = false;
  } else {
    selectedHotspot = null;
    controls.enabled = true;
  }
});

canvas.addEventListener("mousemove", (mouseEvent) => {
  if (!selectedHotspot || mode === "view" || !isDragging) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);

  if (intersects.length > 0) {
    const point = intersects[0].point;

    // Position the hotspot much closer to camera (scale down the distance)
    const direction = point.clone().normalize();
    const distance = 11; // Place hotspot 10 units from camera instead of 50
    selectedHotspot.position.copy(direction.multiplyScalar(distance));
  }
});

canvas.addEventListener("mouseup", (mouseEvent) => {
  if (mode === "view" || !selectedHotspot) {
    return;
  }

  updateRootHotspotsData();
  isSelectedPreviewHotspot = false;
  controls.enabled = true;
  // selectedHotspot = null;
  isDragging = false;
});

function updateRootHotspotsData() {
  // update imagesData according to currentHotspots
  if (true) {
    const updatedHotspots = currentHotspots.map((ch) => ({
      position: ch.group.position.clone(),
      rotation: ch.group.rotation.clone(),
      transitionImageName: ch.transitionImageName,
      transitionImageIndex: ch.transitionImageIndex,
    }));

    imagesData[currentImageIndex].hotspots = updatedHotspots;
  }
}

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
    if (mode === "view") {
      event.preventDefault();
      return;
    }

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
    const distance = 11; // Place hotspot 10 units from camera instead of 50
    previewHotspot.position.copy(direction.multiplyScalar(distance));

    // Make the ring face outward from the sphere surface
    const outwardDirection = previewHotspot.position.clone().normalize();
    // previewHotspot.lookAt(
    //   previewHotspot.position.clone().add(outwardDirection)
    // );
  }
}

canvas.addEventListener("dragover", (ev) => {
  if (mode === "view") return; // block drag indicator
  ev.preventDefault();
});

canvas.addEventListener("drop", (ev) => {
  if (mode === "view") return;
  ev.preventDefault();

  controls.enabled = true;
  isSelectedPreviewHotspot = true;
  selectedHotspot = previewHotspot;

  calculateMousePos(ev);

  defaultPreviewHotspotRotation = previewHotspot.rotation.clone();

  previewHotspot.imageName = ev.dataTransfer.getData("imageName");
  previewHotspot.imageIndex = parseInt(ev.dataTransfer.getData("imageIndex"));

  previewHotspot.visible = true;
});

// Animation loop
function animate() {
  controls.update();

  currentHotspots.forEach((h) => {
    h.ring.material.color.set(
      selectedHotspot === h.group ? 0xfc03be : 0xff0000
    );
    h.ring.material.needsUpdate = true;
  });

  if (previewHotspot.visible) {
    const previewRing = previewHotspot.children[0];
    previewRing.material.color.set(
      selectedHotspot === previewHotspot ? 0xfc03be : 0x0000ff
    );
    previewRing.material.needsUpdate = true;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function init() {
  changeImage(0);
  animate();
}

init();
