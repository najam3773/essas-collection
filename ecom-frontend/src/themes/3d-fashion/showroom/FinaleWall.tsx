'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BrandColors } from './brandColors';
import { mixHex } from './brandColors';

function CounterMan({
  colors,
  position,
}: {
  colors: BrandColors;
  position: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({
        color: '#e8c4a8',
        roughness: 0.65,
        metalness: 0.02,
      }),
      hair: new THREE.MeshStandardMaterial({
        color: '#3a2a22',
        roughness: 0.8,
        metalness: 0.05,
      }),
      shirt: new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#ffffff', 0.35),
        roughness: 0.55,
        metalness: 0.05,
      }),
      vest: new THREE.MeshStandardMaterial({
        color: colors.primary,
        roughness: 0.4,
        metalness: 0.35,
        emissive: colors.primary,
        emissiveIntensity: 0.12,
      }),
      pants: new THREE.MeshStandardMaterial({
        color: mixHex(colors.background, '#000000', 0.45),
        roughness: 0.6,
        metalness: 0.05,
      }),
      shoes: new THREE.MeshStandardMaterial({
        color: '#2a1c16',
        roughness: 0.45,
        metalness: 0.2,
      }),
    }),
    [colors],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(t * 1.4) * 0.012;
    }
    if (armR.current) {
      armR.current.rotation.x = -0.35 + Math.sin(t * 1.1) * 0.08;
    }
    if (armL.current) {
      armL.current.rotation.x = -0.15 + Math.sin(t * 0.9 + 1) * 0.05;
    }
  });

  return (
    <group ref={group} position={position}>
      {/* Legs */}
      <mesh position={[-0.1, 0.45, 0]} castShadow material={mats.pants}>
        <cylinderGeometry args={[0.07, 0.08, 0.85, 12]} />
      </mesh>
      <mesh position={[0.1, 0.45, 0]} castShadow material={mats.pants}>
        <cylinderGeometry args={[0.07, 0.08, 0.85, 12]} />
      </mesh>
      <mesh position={[-0.1, 0.05, 0.04]} castShadow material={mats.shoes}>
        <boxGeometry args={[0.14, 0.08, 0.24]} />
      </mesh>
      <mesh position={[0.1, 0.05, 0.04]} castShadow material={mats.shoes}>
        <boxGeometry args={[0.14, 0.08, 0.24]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.15, 0]} castShadow material={mats.shirt}>
        <boxGeometry args={[0.42, 0.55, 0.22]} />
      </mesh>
      <mesh position={[0, 1.18, 0.02]} castShadow material={mats.vest}>
        <boxGeometry args={[0.44, 0.5, 0.18]} />
      </mesh>
      {/* Tie accent */}
      <mesh position={[0, 1.2, 0.12]} material={mats.vest}>
        <boxGeometry args={[0.06, 0.28, 0.02]} />
      </mesh>

      {/* Arms */}
      <group ref={armL} position={[-0.28, 1.35, 0]} rotation={[0.1, 0, 0.15]}>
        <mesh position={[0, -0.22, 0]} castShadow material={mats.shirt}>
          <cylinderGeometry args={[0.055, 0.06, 0.45, 10]} />
        </mesh>
        <mesh position={[0, -0.48, 0.02]} castShadow material={mats.skin}>
          <sphereGeometry args={[0.055, 12, 12]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.28, 1.35, 0]} rotation={[-0.35, 0, -0.12]}>
        <mesh position={[0, -0.22, 0]} castShadow material={mats.shirt}>
          <cylinderGeometry args={[0.055, 0.06, 0.45, 10]} />
        </mesh>
        <mesh position={[0, -0.48, 0.04]} castShadow material={mats.skin}>
          <sphereGeometry args={[0.055, 12, 12]} />
        </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 1.62, 0]} castShadow material={mats.skin}>
        <sphereGeometry args={[0.16, 20, 20]} />
      </mesh>
      <mesh position={[0, 1.72, -0.02]} material={mats.hair}>
        <sphereGeometry args={[0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      {/* Simple face */}
      <mesh position={[-0.05, 1.64, 0.14]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#2a1c16" />
      </mesh>
      <mesh position={[0.05, 1.64, 0.14]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#2a1c16" />
      </mesh>
      <mesh position={[0, 1.57, 0.15]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[0.035, 0.008, 6, 12, Math.PI]} />
        <meshBasicMaterial color="#c4786a" />
      </mesh>
    </group>
  );
}

/**
 * Destination wall — royal backdrop, service counter, and attendant.
 */
export function FinaleWall({
  colors,
  brand,
  mobile = false,
}: {
  colors: BrandColors;
  brand?: string;
  mobile?: boolean;
}) {
  const glow = useRef<THREE.Mesh>(null);

  const mats = useMemo(() => {
    return {
      back: new THREE.MeshStandardMaterial({
        color: mixHex(colors.background, '#ffffff', 0.2),
        roughness: 0.78,
        metalness: 0.04,
      }),
      stage: new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#ffffff', 0.12),
        roughness: 0.4,
        metalness: 0.12,
      }),
      frame: new THREE.MeshStandardMaterial({
        color: colors.primary,
        roughness: 0.28,
        metalness: 0.62,
        emissive: colors.primary,
        emissiveIntensity: 0.22,
      }),
      silk: new THREE.MeshStandardMaterial({
        color: mixHex(colors.secondary, '#ffffff', 0.35),
        roughness: 0.55,
        metalness: 0.08,
        emissive: colors.secondary,
        emissiveIntensity: 0.28,
      }),
      glowPlane: new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#ffffff', 0.45),
        roughness: 0.35,
        metalness: 0.05,
        emissive: mixHex(colors.secondary, '#ffffff', 0.25),
        emissiveIntensity: 0.7,
      }),
      counter: new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#000000', 0.04),
        roughness: 0.35,
        metalness: 0.15,
      }),
      counterTop: new THREE.MeshStandardMaterial({
        color: mixHex(colors.primary, '#ffffff', 0.12),
        roughness: 0.25,
        metalness: 0.55,
        emissive: colors.primary,
        emissiveIntensity: 0.1,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: '#eef6ff',
        roughness: 0.08,
        metalness: 0.4,
        transparent: true,
        opacity: 0.35,
      }),
    };
  }, [colors]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (glow.current) {
      const m = glow.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.6 + Math.sin(t * 0.9) * 0.15;
    }
  });

  const w = mobile ? 3.6 : 7.2;
  const h = mobile ? 2.6 : 3.4;
  const counterW = mobile ? 1.9 : 3.2;

  return (
    <group position={[0, 0, -11.85]}>
      {/* Back wall */}
      <mesh position={[0, 2.6, -0.35]} material={mats.back} receiveShadow>
        <boxGeometry args={[mobile ? 5.2 : 13, 5.2, 0.4]} />
      </mesh>

      {/* Brand backdrop panel */}
      <mesh position={[0, 3.15, 0.02]} material={mats.frame} castShadow>
        <boxGeometry args={[w + 0.28, h + 0.28, 0.08]} />
      </mesh>
      <mesh position={[0, 3.15, 0.08]} material={mats.silk} receiveShadow>
        <boxGeometry args={[w, h, 0.06]} />
      </mesh>
      <mesh ref={glow} position={[0, 3.2, 0.13]} material={mats.glowPlane}>
        <planeGeometry args={[w * 0.78, h * 0.62]} />
      </mesh>

      {/* Stage */}
      <mesh position={[0, 0.1, 0.85]} receiveShadow castShadow material={mats.stage}>
        <boxGeometry args={[mobile ? 2.6 : 4.8, 0.2, 2.0]} />
      </mesh>
      <mesh position={[0, 0.22, 0.85]} material={mats.frame}>
        <boxGeometry args={[mobile ? 2.4 : 4.55, 0.04, 1.85]} />
      </mesh>

      {/* ——— Service counter ——— */}
      <group position={[0, 0.22, 1.15]}>
        {/* Main body */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={mats.counter}>
          <boxGeometry args={[counterW, 0.9, 0.7]} />
        </mesh>
        {/* Front gold fascia */}
        <mesh position={[0, 0.45, 0.36]} material={mats.frame}>
          <boxGeometry args={[counterW * 0.96, 0.7, 0.04]} />
        </mesh>
        {/* Decorative front panel */}
        <mesh position={[0, 0.5, 0.39]} material={mats.silk}>
          <boxGeometry args={[counterW * 0.7, 0.45, 0.02]} />
        </mesh>
        {/* Countertop */}
        <mesh position={[0, 0.95, 0]} castShadow material={mats.counterTop}>
          <boxGeometry args={[counterW + 0.12, 0.08, 0.82]} />
        </mesh>
        {/* Glass riser */}
        <mesh position={[0, 1.2, -0.22]} material={mats.glass}>
          <boxGeometry args={[counterW * 0.85, 0.45, 0.04]} />
        </mesh>
        {/* Side posts */}
        <mesh position={[-(counterW * 0.5 - 0.08), 0.95, 0.3]} material={mats.frame}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        </mesh>
        <mesh position={[counterW * 0.5 - 0.08, 0.95, 0.3]} material={mats.frame}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        </mesh>

        {/* Register / POS */}
        <mesh position={[mobile ? 0.7 : 1.0, 1.12, 0.05]} castShadow material={mats.frame}>
          <boxGeometry args={[0.35, 0.22, 0.28]} />
        </mesh>
        <mesh position={[mobile ? 0.7 : 1.0, 1.28, 0.02]} material={mats.glowPlane}>
          <boxGeometry args={[0.28, 0.02, 0.2]} />
        </mesh>

        {/* Desk lamp */}
        <mesh position={[mobile ? -0.75 : -1.05, 1.05, -0.05]} material={mats.frame}>
          <cylinderGeometry args={[0.04, 0.06, 0.08, 12]} />
        </mesh>
        <mesh position={[mobile ? -0.75 : -1.05, 1.25, -0.05]} material={mats.frame}>
          <cylinderGeometry args={[0.015, 0.015, 0.35, 8]} />
        </mesh>
        <mesh position={[mobile ? -0.75 : -1.05, 1.42, 0.05]} rotation={[0.6, 0, 0]} material={mats.silk}>
          <coneGeometry args={[0.1, 0.14, 16]} />
        </mesh>
        <pointLight
          position={[mobile ? -0.75 : -1.05, 1.35, 0.15]}
          intensity={0.55}
          distance={3}
          color={mixHex(colors.secondary, '#ffffff', 0.4)}
        />
      </group>

      {/* Counter man standing behind the counter */}
      <CounterMan colors={colors} position={[0, 0.22, 0.55]} />

      {/* Welcome plaque on counter front */}
      <Html position={[0, 0.72, 1.55]} center distanceFactor={mobile ? 6 : 8} zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            background: 'rgba(255,250,246,0.92)',
            border: `1px solid ${colors.primary}66`,
            color: colors.ink,
            fontSize: mobile ? 9 : 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 22px rgba(0,0,0,0.12)',
          }}
        >
          Concierge desk
        </div>
      </Html>

      {brand && !mobile ? (
        <Html position={[0, 3.85, 0.25]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              textAlign: 'center',
              color: colors.ink,
              textShadow: '0 2px 18px rgba(255,250,246,0.9)',
              maxWidth: 260,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                opacity: 0.7,
                marginBottom: 4,
              }}
            >
              Welcome
            </div>
            <div
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {brand}
            </div>
          </div>
        </Html>
      ) : null}

      <spotLight
        position={[0, 4.4, 2.4]}
        angle={0.5}
        penumbra={0.7}
        intensity={2.2}
        color={mixHex(colors.secondary, '#ffffff', 0.4)}
        castShadow={!mobile}
      />
      <pointLight position={[0, 2.8, 1.4]} intensity={0.9} color={mixHex(colors.primary, '#ffffff', 0.35)} distance={7} />
    </group>
  );
}
