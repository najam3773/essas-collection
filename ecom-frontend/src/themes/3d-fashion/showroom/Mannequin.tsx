'use client';

import { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';
import type { ProductCardData } from '@/components/ProductCard';

function FallbackPlate({ active, seed }: { active: boolean; seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const color = new THREE.Color().setHSL((h % 360) / 360, 0.35, 0.55);
  return (
    <mesh position={[0, 1.52, 0.04]}>
      <planeGeometry args={[0.95, 1.32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        emissive={active ? '#ffb4a8' : '#000000'}
        emissiveIntensity={active ? 0.2 : 0}
      />
    </mesh>
  );
}

/**
 * Framed product on a pedestal. Square floor block stays fixed and centered under the display.
 */
export function Mannequin({
  product,
  position,
  rotationY,
  selected,
  onSelect,
  scale = 1,
  brandPrimary = '#c9894a',
  mobile = false,
}: {
  product: ProductCardData;
  position: [number, number, number];
  rotationY: number;
  selected: boolean;
  onSelect: (p: ProductCardData) => void;
  scale?: number;
  brandPrimary?: string;
  mobile?: boolean;
}) {
  const display = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const url = product.media?.[0]?.url || '';
  const active = selected || hovered;
  const blockW = mobile ? 0.78 : 1.35;
  const blockD = mobile ? 0.72 : 1.05;

  useFrame((state) => {
    if (!display.current) return;
    const t = state.clock.elapsedTime;
    display.current.position.y = Math.sin(t * 1.15 + position[2]) * 0.02;
    const targetY = rotationY + (active ? Math.sin(t * 0.7) * 0.05 : 0);
    display.current.rotation.y = THREE.MathUtils.lerp(display.current.rotation.y, targetY, 0.08);
  });

  return (
    <group
      position={position}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(product);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Floor block — centered under product */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[blockW, 0.16, blockD]} />
        <meshStandardMaterial color="#fffaf6" roughness={0.45} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(blockW, blockD) * 0.42, Math.min(blockW, blockD) * 0.48, 40]} />
        <meshBasicMaterial
          color={active ? brandPrimary : '#ffffff'}
          transparent
          opacity={active ? 0.85 : 0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={display} rotation={[0, rotationY, 0]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.48, 0.16, 32]} />
          <meshStandardMaterial color="#fff6f0" roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.04, 32]} />
          <meshStandardMaterial color={brandPrimary} roughness={0.3} metalness={0.55} />
        </mesh>

        <mesh position={[0, 1.52, -0.02]} castShadow>
          <boxGeometry args={[1.08, 1.48, 0.07]} />
          <meshStandardMaterial color="#fffaf6" roughness={0.45} metalness={0.08} />
        </mesh>
        <mesh position={[0, 1.52, 0.01]}>
          <boxGeometry args={[1.02, 1.4, 0.04]} />
          <meshStandardMaterial color={brandPrimary} roughness={0.35} metalness={0.5} />
        </mesh>

        <Suspense fallback={<FallbackPlate active={active} seed={product.id} />}>
          {url ? (
            <Image
              url={url}
              scale={[0.95, 1.32]}
              position={[0, 1.52, 0.04]}
              toneMapped={false}
              radius={0.02}
            />
          ) : (
            <FallbackPlate active={active} seed={product.id} />
          )}
        </Suspense>

        {active && (
          <mesh position={[0, 1.52, -0.06]}>
            <planeGeometry args={[1.15, 1.55]} />
            <meshBasicMaterial color={brandPrimary} transparent opacity={0.28} />
          </mesh>
        )}

        <mesh position={[0, 0.72, 0.02]}>
          <boxGeometry args={[0.95, 0.035, 0.04]} />
          <meshStandardMaterial
            color={brandPrimary}
            emissive={brandPrimary}
            emissiveIntensity={active ? 1.2 : 0.45}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}
