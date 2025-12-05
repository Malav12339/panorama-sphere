import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { imagesData } from "./imageData";
import GUI from "lil-gui";

let currentHotspots = [];
let enableHotspotMapping = false;
let previewHotspot = null;
let currentImageIndex = 0; // Track currently shown pano

// OFFSET
const OFFSET_X = 0;
const OFFSET_Y = 8;
const OFFSET_Z = 10;

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
  currentImageIndex = imageIndex;
  console.log(currentImageIndex);
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
    transitionImageIndex: hotspotConfig.transitionImageIndex,
  };
}

// ----------*--------------------*----------*------------------------------------------------
previewHotspot = createPreviewHotspot();

function createPreviewHotspot() {
  const RING_OUTER_RADIUS = 0.6;

  const ringGeometry = new THREE.RingGeometry(0.5, RING_OUTER_RADIUS, 30);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    side: THREE.DoubleSide,
    opacity: 0.8,
    transparent: true,
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.visible = false;

  scene.add(ring);

  return ring;
}

// ----------*--------------------*----------*------------------------------------------------

window.addEventListener("mousemove", (event) => {
  if (!enableHotspotMapping) return;

  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);

  if (intersects.length > 0) {
    const point = intersects[0].point;

    console.log("x: ", point.x, " y: ", point.y, " z: ", point.z);

    // Position the hotspot much closer to camera (scale down the distance)
    const direction = point.clone().normalize();
    const distance = 15; // Place hotspot 10 units from camera instead of 50
    previewHotspot.position.copy(direction.multiplyScalar(distance));

    // Make the ring face outward from the sphere surface
    const outwardDirection = previewHotspot.position.clone().normalize();
    previewHotspot.lookAt(
      previewHotspot.position.clone().add(outwardDirection)
    );
  }
});

// CLICK EVENT
window.addEventListener("click", (event) => {
  if(enableHotspotMapping && previewHotspot.visible) {
    const position = previewHotspot.position.clone()
    const rotation = previewHotspot.rotation.clone()

    imagesData[currentImageIndex].hotspots.push({
      position,
      rotation,
      transitionImageIndex: currentImageIndex
    })

    clearHotspots()
    addHotspots(currentImageIndex)

    console.log("new hotspot added. position - ", position, " rotation - ", rotation)
    return;
  }

  // FOR CLICKING EXISTING HOTSPOTS
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  currentHotspots.forEach((h) => {
    const intersects = raycaster.intersectObject(h.clickArea);

    if (intersects.length > 0) {
      changeImage(h.transitionImageIndex);
    }
  });
});

window.addEventListener("keyup", (ev) => {
  const key = ev.key;

  if (key == "h" || key == "H") {
    enableHotspotMapping = !enableHotspotMapping;

    previewHotspot.visible = enableHotspotMapping;

    console.log("enable hotspot mapping - ", enableHotspotMapping);
  }
});

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

// ====================== THUMBNAILS (20% AREA) ======================
const thumbsContainer = document.getElementById("thumbs");

imagesData.forEach((img, index) => {
  const thumb = document.createElement("img");
  thumb.src = img.imageName;
  thumb.className = "thumb";

  thumb.addEventListener("click", () => {
    changeImage(index);
  });

  thumbsContainer.appendChild(thumb);
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
  addGui();
}

init();

function addGui() {
  const gui = new GUI({ title: "Hotspot Position Editor" });

  // Wait for hotspots to load before creating GUI
  const checkHotspotsInterval = setInterval(() => {
    if (currentHotspots.length > 0) {
      clearInterval(checkHotspotsInterval);
      setupHotspotControls();
    }
  }, 100);

  function setupHotspotControls() {
    const hotspot = currentHotspots[0];

    // Position controls
    const positionFolder = gui.addFolder("Position");
    positionFolder
      .add(hotspot.ring.position, "x", -30, 30, 0.1)
      .name("X")
      .onChange((value) => {
        hotspot.clickArea.position.x = value;
      });

    positionFolder
      .add(hotspot.ring.position, "y", -30, 30, 0.1)
      .name("Y")
      .onChange((value) => {
        hotspot.clickArea.position.y = value;
      });

    positionFolder
      .add(hotspot.ring.position, "z", -30, 30, 0.1)
      .name("Z")
      .onChange((value) => {
        hotspot.clickArea.position.z = value;
      });

    positionFolder.open();

    // Rotation controls
    const rotationFolder = gui.addFolder("Rotation");
    rotationFolder
      .add(hotspot.ring.rotation, "x", -Math.PI, Math.PI, 0.01)
      .name("X")
      .onChange((value) => {
        hotspot.clickArea.rotation.x = value;
      });

    rotationFolder
      .add(hotspot.ring.rotation, "y", -Math.PI, Math.PI, 0.01)
      .name("Y")
      .onChange((value) => {
        hotspot.clickArea.rotation.y = value;
      });

    rotationFolder
      .add(hotspot.ring.rotation, "z", -Math.PI, Math.PI, 0.01)
      .name("Z")
      .onChange((value) => {
        hotspot.clickArea.rotation.z = value;
      });

    rotationFolder.open();

    // Log current values button
    gui
      .add(
        {
          logValues: () => {
            console.log("Position:", {
              x: hotspot.ring.position.x,
              y: hotspot.ring.position.y,
              z: hotspot.ring.position.z,
            });
            console.log("Rotation:", {
              x: hotspot.ring.rotation.x,
              y: hotspot.ring.rotation.y,
              z: hotspot.ring.rotation.z,
            });
            console.log("Copy this:");
            console.log(
              `position: new THREE.Vector3(${hotspot.ring.position.x.toFixed(
                2
              )}, ${hotspot.ring.position.y.toFixed(
                2
              )}, ${hotspot.ring.position.z.toFixed(2)})`
            );
            console.log(
              `rotation: new THREE.Euler(${hotspot.ring.rotation.x.toFixed(
                2
              )}, ${hotspot.ring.rotation.y.toFixed(
                2
              )}, ${hotspot.ring.rotation.z.toFixed(2)})`
            );
          },
        },
        "logValues"
      )
      .name("Log Values to Console");
  }
}
