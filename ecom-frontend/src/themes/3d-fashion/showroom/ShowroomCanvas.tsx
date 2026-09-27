'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html, PerspectiveCamera } from '@react-three/drei';
import { money } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { BoutiqueRoom } from './BoutiqueRoom';
import { FinaleWall } from './FinaleWall';
import { Mannequin } from './Mannequin';
import { ScrollCamera } from './ScrollCamera';
import { mannequinLayout } from './path';
import type { BrandColors } from './brandColors';
import { mixHex } from './brandColors';

function priceOf(p?: ProductCardData | null) {
  if (!p) return null;
  return p.fromPriceCents ?? p.variants?.[0]?.salePriceCents ?? p.variants?.[0]?.priceCents ?? null;
}

function Scene({
  products,
  selectedId,
  onSelect,
  progress,
  look,
  mobile,
  colors,
  brand,
}: {
  products: ProductCardData[];
  selectedId?: string;
  onSelect: (p: ProductCardData) => void;
  progress: number;
  look: { x: number; y: number };
  mobile: boolean;
  colors: BrandColors;
  brand?: string;
}) {
  const slots = useMemo(() => {
    const layout = mannequinLayout(products.length, mobile);
    return products.slice(0, layout.length).map((product, i) => ({
      product,
      ...layout[i]!,
    }));
  }, [products, mobile]);

  const selectedSlot = slots.find((s) => s.product.id === selectedId);
  const fogColor = colors.background;

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, mobile ? 12 : 14, mobile ? 26 : 28]} />
      <PerspectiveCamera
        makeDefault
        position={mobile ? [0, 1.62, 8.6] : [0, 1.78, 11.2]}
        fov={mobile ? 58 : 42}
        near={0.1}
        far={60}
      />

      <ambientLight intensity={0.9} color={mixHex(colors.paper, '#ffffff', 0.3)} />
      <hemisphereLight args={[mixHex(colors.paper, '#ffffff', 0.4), colors.background, 0.7]} />
      <directionalLight
        castShadow
        position={[3, 9, 3]}
        intensity={1.35}
        color="#fff8f0"
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight
        position={[0, 5, 2]}
        angle={0.8}
        penumbra={0.55}
        intensity={1.7}
        color={mixHex(colors.secondary, '#ffffff', 0.45)}
        castShadow
      />
      <pointLight position={[0, 3.2, -8.5]} intensity={0.85} color={mixHex(colors.primary, '#ffffff', 0.35)} />

      <BoutiqueRoom colors={colors} mobile={mobile} />
      <FinaleWall colors={colors} brand={brand} mobile={mobile} />

      <Suspense fallback={null}>
        {slots.map((slot) => (
          <Mannequin
            key={slot.product.id}
            product={slot.product}
            position={slot.position}
            rotationY={slot.rotationY}
            selected={selectedId === slot.product.id}
            onSelect={onSelect}
            scale={mobile ? 0.7 : 1}
            brandPrimary={colors.primary}
            mobile={mobile}
          />
        ))}
      </Suspense>

      {selectedSlot && (
        <Html
          position={[
            selectedSlot.position[0],
            mobile ? 1.72 : 2.32,
            selectedSlot.position[2] + (mobile ? 0.12 : 0.08),
          ]}
          center
          distanceFactor={mobile ? 4.6 : 7}
          zIndexRange={[2, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              display: 'grid',
              gap: mobile ? 1 : 2,
              justifyItems: 'center',
              padding: mobile ? '5px 8px' : '8px 12px',
              borderRadius: mobile ? 10 : 14,
              background: 'rgba(255,250,246,0.94)',
              border: `1px solid ${colors.primary}88`,
              color: colors.ink,
              boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
              maxWidth: mobile ? 130 : 200,
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            <strong
              style={{
                fontSize: mobile ? 10 : 12,
                fontWeight: 700,
                letterSpacing: '0.02em',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedSlot.product.name}
            </strong>
            {priceOf(selectedSlot.product) != null && (
              <span
                style={{
                  fontSize: mobile ? 9 : 11,
                  fontWeight: 600,
                  color: colors.primary,
                  letterSpacing: '0.04em',
                }}
              >
                {money(priceOf(selectedSlot.product)!)}
              </span>
            )}
          </div>
        </Html>
      )}

      <ContactShadows
        position={[0, 0.03, 0]}
        opacity={0.25}
        scale={mobile ? 14 : 24}
        blur={2.8}
        far={8}
        color="#8a6a58"
      />
      <ScrollCamera progress={progress} look={look} mobile={mobile} />
    </>
  );
}

export default function ShowroomCanvas({
  products,
  selectedId,
  onSelect,
  progress,
  look = { x: 0, y: 0 },
  mobile = false,
  colors,
  brand,
}: {
  products: ProductCardData[];
  selectedId?: string;
  onSelect: (p: ProductCardData) => void;
  progress: number;
  look?: { x: number; y: number };
  mobile?: boolean;
  colors: BrandColors;
  brand?: string;
}) {
  return (
    <Canvas
      key={mobile ? 'm' : 'd'}
      shadows={!mobile}
      dpr={mobile ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMappingExposure: 1.2 }}
    >
      <Scene
        products={products}
        selectedId={selectedId}
        onSelect={onSelect}
        progress={progress}
        look={look}
        mobile={mobile}
        colors={colors}
        brand={brand}
      />
    </Canvas>
  );
}
