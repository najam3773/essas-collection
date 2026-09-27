import * as THREE from 'three';
import type { ProductCardData } from '@/components/ProductCard';

/** Waypoints for scroll-driven walkthrough (eye-level through the boutique). */
export const CAMERA_PATH = [
  new THREE.Vector3(0, 1.78, 11.2),
  new THREE.Vector3(0, 1.78, 7.8),
  new THREE.Vector3(-0.15, 1.8, 4.8),
  new THREE.Vector3(0.08, 1.82, 1.8),
  new THREE.Vector3(0, 1.84, -1.2),
  new THREE.Vector3(0.08, 1.86, -4.0),
  new THREE.Vector3(0, 1.9, -6.6),
  new THREE.Vector3(0, 2.05, -8.2),
];

/**
 * Mobile entrance = first products framed in aisle (matches desired load view).
 * Camera stays inside room (entrance wall ≈ z 11.4 on mobile).
 */
export const CAMERA_PATH_MOBILE = [
  new THREE.Vector3(0, 1.62, 8.6),
  new THREE.Vector3(0, 1.64, 6.2),
  new THREE.Vector3(0, 1.66, 3.6),
  new THREE.Vector3(0, 1.68, 1.0),
  new THREE.Vector3(0, 1.72, -1.6),
  new THREE.Vector3(0, 1.78, -4.2),
  new THREE.Vector3(0, 1.88, -6.6),
  new THREE.Vector3(0, 1.98, -8.2),
];

export const LOOK_PATH = [
  new THREE.Vector3(0, 1.55, 8.0),
  new THREE.Vector3(0, 1.52, 5.0),
  new THREE.Vector3(0, 1.5, 2.0),
  new THREE.Vector3(0, 1.52, -0.6),
  new THREE.Vector3(0, 1.55, -3.2),
  new THREE.Vector3(0, 1.65, -5.8),
  new THREE.Vector3(0, 2.05, -9.2),
  new THREE.Vector3(0, 2.35, -11.4),
];

export const LOOK_PATH_MOBILE = [
  new THREE.Vector3(0, 1.42, 5.0),
  new THREE.Vector3(0, 1.42, 3.0),
  new THREE.Vector3(0, 1.44, 0.6),
  new THREE.Vector3(0, 1.46, -1.8),
  new THREE.Vector3(0, 1.5, -4.0),
  new THREE.Vector3(0, 1.58, -6.2),
  new THREE.Vector3(0, 1.82, -8.4),
  new THREE.Vector3(0, 2.1, -10.8),
];

/**
 * Product placement — mobile aisle + depth spaced for portrait.
 * First L/R pair is what you see on page load.
 */
export function mannequinLayout(count: number, mobile = false) {
  const x = mobile ? 0.88 : 2.35;
  const slots: Array<{ position: [number, number, number]; rotationY: number; side: 'L' | 'R' }> = mobile
    ? [
        { position: [-x, 0, 5.0], rotationY: 0.2, side: 'L' },
        { position: [x, 0, 3.2], rotationY: -0.22, side: 'R' },
        { position: [-x, 0, 1.2], rotationY: 0.2, side: 'L' },
        { position: [x, 0, -0.8], rotationY: -0.2, side: 'R' },
        { position: [-x, 0, -2.8], rotationY: 0.16, side: 'L' },
        { position: [x, 0, -4.8], rotationY: -0.16, side: 'R' },
        { position: [-x, 0, -6.8], rotationY: 0.14, side: 'L' },
        { position: [x, 0, -8.6], rotationY: -0.14, side: 'R' },
      ]
    : [
        { position: [-x, 0, 6.2], rotationY: 0.32, side: 'L' },
        { position: [x, 0, 4.4], rotationY: -0.32, side: 'R' },
        { position: [-x, 0, 2.4], rotationY: 0.26, side: 'L' },
        { position: [x, 0, 0.6], rotationY: -0.26, side: 'R' },
        { position: [-x, 0, -1.2], rotationY: 0.22, side: 'L' },
        { position: [x, 0, -3.0], rotationY: -0.22, side: 'R' },
        { position: [-x, 0, -4.8], rotationY: 0.18, side: 'L' },
        { position: [x, 0, -6.6], rotationY: -0.18, side: 'R' },
      ];
  return slots.slice(0, Math.max(0, Math.min(count, slots.length)));
}

export type SceneProduct = ProductCardData & { slotIndex: number };
