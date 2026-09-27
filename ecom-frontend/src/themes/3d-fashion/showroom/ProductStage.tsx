'use client';

import { Suspense, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { ProductCardData } from '@/components/ProductCard';
import { Mannequin } from './Mannequin';

function OrbitLite({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.25;
  });
  return <group ref={ref}>{children}</group>;
}

function PedestalRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f0e4d8" roughness={0.4} metalness={0.12} />
      </mesh>
      <mesh position={[0, 2.5, -3]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#f7d6cf" roughness={0.7} emissive="#ffcfc4" emissiveIntensity={0.2} />
      </mesh>
      <ambientLight intensity={0.9} color="#fff5ef" />
      <spotLight position={[2, 4, 2]} angle={0.55} penumbra={0.6} intensity={1.6} color="#ffe4d6" castShadow />
      <pointLight position={[-2, 2.2, 1]} intensity={0.7} color="#ffc4b8" />
    </group>
  );
}

/** Single-look 3D stage for PDP. */
export default function ProductStage({
  product,
  onSelect,
}: {
  product: ProductCardData;
  onSelect?: (p: ProductCardData) => void;
}) {
  const card = useMemo(
    () => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      media: product.media,
      category: product.category,
      fromPriceCents: product.fromPriceCents,
      variants: product.variants,
    }),
    [product],
  );

  return (
    <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, toneMappingExposure: 1.15 }}>
      <color attach="background" args={['#f6ebe3']} />
      <fog attach="fog" args={['#f6ebe3', 6, 14]} />
      <PerspectiveCamera makeDefault position={[0, 1.55, 3.6]} fov={42} />
      <PedestalRoom />
      <Suspense fallback={null}>
        <OrbitLite>
          <Mannequin
            product={card}
            position={[0, 0, 0]}
            rotationY={0}
            selected
            onSelect={onSelect || (() => undefined)}
          />
        </OrbitLite>
      </Suspense>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.28} scale={8} blur={2.2} far={4} color="#8a6a58" />
    </Canvas>
  );
}
