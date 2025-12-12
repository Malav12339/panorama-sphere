import * as THREE from "three";

let imagesData = [
  {
    imageName: "pano_1.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
        transitionImageName: "pano_4.jpg",
        transitionImageIndex: 1,
      },
    ],
  },
  {
    imageName: "pano_2.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_5.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
  {
    imageName: "pano_3.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_2.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
  {
    imageName: "pano_4.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_3.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
  {
    imageName: "pano_5.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_5.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
  {
    imageName: "pano_6.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_7.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
  {
    imageName: "pano_7.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_8.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
  {
    imageName: "pano_8.jpg",
    cameraRotation: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_1.jpg",
        transitionImageIndex: 0, // won't work (same image)
      },
    ],
  },
];

export { imagesData };
