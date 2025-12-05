import * as THREE from "three"

let imagesData = [
  {
    imageName: "pano_1.jpg",
    cameraRotaion: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
        transitionImageName: "pano_2.jpg",
        transitionImageIndex: 1
      },
    ],
  },
  {
    imageName: "pano_2.jpg",
    cameraRotaion: null,
    hotspots: [
      {
        position: new THREE.Vector3(-5, -3.8, -10),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
        transitionImageName: "pano_5.jpg",
        transitionImageIndex: 0                         // won't work (same image)
      },
    ],
  },
];

export { imagesData };
