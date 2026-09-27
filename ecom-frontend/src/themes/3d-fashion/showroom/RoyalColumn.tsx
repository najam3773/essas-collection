'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { BrandColors } from './brandColors';
import { mixHex } from './brandColors';

/** Classical royal column — plinth, fluted shaft, gold rings, ornate capital. */
export function RoyalColumn({
  position,
  colors,
  height = 4.7,
}: {
  position: [number, number, number];
  colors: BrandColors;
  height?: number;
}) {
  const mats = useMemo(() => {
    const marble = new THREE.MeshStandardMaterial({
      color: mixHex(colors.paper, '#ffffff', 0.35),
      roughness: 0.38,
      metalness: 0.12,
    });
    const marbleDeep = new THREE.MeshStandardMaterial({
      color: mixHex(colors.paper, '#000000', 0.06),
      roughness: 0.42,
      metalness: 0.1,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: mixHex(colors.primary, '#ffffff', 0.08),
      roughness: 0.28,
      metalness: 0.78,
      emissive: colors.primary,
      emissiveIntensity: 0.28,
    });
    const goldSoft = new THREE.MeshStandardMaterial({
      color: mixHex(colors.secondary, '#ffffff', 0.15),
      roughness: 0.35,
      metalness: 0.55,
      emissive: colors.secondary,
      emissiveIntensity: 0.18,
    });
    return { marble, marbleDeep, gold, goldSoft };
  }, [colors]);

  const shaftH = height - 1.15;
  const shaftY = 0.55 + shaftH / 2;
  const fluteCount = 8;

  return (
    <group position={position}>
      {/* Stepped plinth */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow material={mats.marbleDeep}>
        <boxGeometry args={[0.72, 0.12, 0.72]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow material={mats.gold}>
        <boxGeometry args={[0.62, 0.06, 0.62]} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow material={mats.marble}>
        <cylinderGeometry args={[0.34, 0.38, 0.14, 24]} />
      </mesh>
      <mesh position={[0, 0.36, 0]} material={mats.gold}>
        <torusGeometry args={[0.3, 0.035, 10, 32]} />
      </mesh>
      <mesh position={[0, 0.44, 0]} castShadow material={mats.marble}>
        <cylinderGeometry args={[0.26, 0.3, 0.16, 24]} />
      </mesh>

      {/* Main shaft */}
      <mesh position={[0, shaftY, 0]} castShadow material={mats.marble}>
        <cylinderGeometry args={[0.2, 0.24, shaftH, 24]} />
      </mesh>

      {/* Fluting suggestion — thin ribs around shaft */}
      {Array.from({ length: fluteCount }).map((_, i) => {
        const a = (i / fluteCount) * Math.PI * 2;
        const r = 0.215;
        return (
          <mesh
            key={`flute-${i}`}
            position={[Math.cos(a) * r, shaftY, Math.sin(a) * r]}
            castShadow
            material={mats.marbleDeep}
          >
            <cylinderGeometry args={[0.018, 0.02, shaftH * 0.92, 8]} />
          </mesh>
        );
      })}

      {/* Royal gold bands */}
      <mesh position={[0, 1.15, 0]} material={mats.gold}>
        <torusGeometry args={[0.235, 0.028, 10, 36]} />
      </mesh>
      <mesh position={[0, shaftY, 0]} material={mats.goldSoft}>
        <torusGeometry args={[0.225, 0.02, 8, 36]} />
      </mesh>
      <mesh position={[0, height - 1.05, 0]} material={mats.gold}>
        <torusGeometry args={[0.22, 0.03, 10, 36]} />
      </mesh>

      {/* Capital — ornate crown */}
      <mesh position={[0, height - 0.85, 0]} castShadow material={mats.marble}>
        <cylinderGeometry args={[0.28, 0.22, 0.22, 20]} />
      </mesh>
      <mesh position={[0, height - 0.72, 0]} material={mats.gold}>
        <torusGeometry args={[0.26, 0.04, 12, 40]} />
      </mesh>
      {/* Leaf-like crown nubs */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={`leaf-${i}`}
            position={[Math.cos(a) * 0.28, height - 0.68, Math.sin(a) * 0.28]}
            rotation={[0.4, -a, 0]}
            material={mats.gold}
          >
            <sphereGeometry args={[0.055, 12, 12]} />
          </mesh>
        );
      })}
      {/* Abacus top plate */}
      <mesh position={[0, height - 0.52, 0]} castShadow material={mats.marble}>
        <boxGeometry args={[0.58, 0.1, 0.58]} />
      </mesh>
      <mesh position={[0, height - 0.44, 0]} material={mats.gold}>
        <boxGeometry args={[0.64, 0.05, 0.64]} />
      </mesh>
      <mesh position={[0, height - 0.38, 0]} material={mats.goldSoft}>
        <boxGeometry args={[0.5, 0.04, 0.5]} />
      </mesh>
    </group>
  );
}
