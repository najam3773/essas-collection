'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { BrandColors } from './brandColors';
import { mixHex } from './brandColors';
import { RoyalColumn } from './RoyalColumn';

function makeTileTexture(opts: {
  base: string;
  alt: string;
  grout: string;
  accent?: string;
  tilePx?: number;
  tiles?: number;
}) {
  const tilePx = opts.tilePx ?? 64;
  const tiles = opts.tiles ?? 4;
  const size = tilePx * tiles;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gap = Math.max(2, Math.round(tilePx * 0.06));

  ctx.fillStyle = opts.grout;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const odd = (x + y) % 2 === 1;
      ctx.fillStyle = odd ? opts.alt : opts.base;
      const px = x * tilePx + gap;
      const py = y * tilePx + gap;
      const s = tilePx - gap * 2;
      ctx.fillRect(px, py, s, s);

      // Soft inner bevel
      const grad = ctx.createLinearGradient(px, py, px + s, py + s);
      grad.addColorStop(0, 'rgba(255,255,255,0.16)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, s, s);

      if (opts.accent && (x + y) % 4 === 0) {
        ctx.strokeStyle = opts.accent;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + s * 0.18, py + s * 0.18, s * 0.64, s * 0.64);
        ctx.globalAlpha = 1;
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Bright gallery room tinted by admin primary / secondary / background.
 */
export function BoutiqueRoom({ colors, mobile = false }: { colors: BrandColors; mobile?: boolean }) {
  const wall = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mixHex(colors.background, '#ffffff', 0.35),
        roughness: 0.82,
        metalness: 0.02,
      }),
    [colors.background],
  );
  const wallAccent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mixHex(colors.secondary, '#ffffff', 0.55),
        roughness: 0.62,
        metalness: 0.04,
      }),
    [colors.secondary],
  );
  const silkWall = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#ffffff', 0.22),
        roughness: 0.72,
        metalness: 0.03,
      }),
    [colors.paper],
  );
  const wainscot = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#000000', 0.03),
        roughness: 0.48,
        metalness: 0.06,
      }),
    [colors.paper],
  );

  const floorMat = useMemo(() => {
    if (typeof document === 'undefined') {
      return new THREE.MeshStandardMaterial({
        color: mixHex(colors.background, '#000000', 0.06),
        roughness: 0.4,
        metalness: 0.1,
      });
    }
    const map = makeTileTexture({
      base: mixHex(colors.background, '#ffffff', 0.2),
      alt: mixHex(colors.paper, '#000000', 0.04),
      grout: mixHex(colors.background, '#000000', 0.14),
      accent: mixHex(colors.primary, '#ffffff', 0.25),
    });
    map.repeat.set(mobile ? 5 : 12, mobile ? 12 : 18);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.42,
      metalness: 0.14,
    });
  }, [colors.background, colors.paper, colors.primary, mobile]);

  const aisleMat = useMemo(() => {
    if (typeof document === 'undefined') {
      return new THREE.MeshStandardMaterial({
        color: mixHex(colors.paper, '#ffffff', 0.2),
        roughness: 0.3,
        metalness: 0.16,
      });
    }
    const map = makeTileTexture({
      base: mixHex(colors.paper, '#ffffff', 0.28),
      alt: mixHex(colors.secondary, '#ffffff', 0.45),
      grout: mixHex(colors.primary, '#000000', 0.2),
      accent: colors.primary,
      tilePx: mobile ? 64 : 72,
    });
    map.repeat.set(mobile ? 2 : 4, mobile ? 14 : 20);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.34,
      metalness: 0.18,
    });
  }, [colors.paper, colors.secondary, colors.primary, mobile]);

  const trim = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.primary,
        roughness: 0.32,
        metalness: 0.55,
        emissive: colors.primary,
        emissiveIntensity: 0.15,
      }),
    [colors.primary],
  );
  const panel = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.paper,
        roughness: 0.55,
        metalness: 0.05,
      }),
    [colors.paper],
  );

  const columnZs = mobile ? [-7.5, -3.5, 0.5, 4.5] : [-8, -5, -2, 1, 4, 7];
  const panelZs = mobile ? [-8, -4, 0, 4] : [-9, -6, -3, 0, 3, 6, 9];
  // Match mobile product aisle (~±0.88) — tighter room + walkway
  const roomW = mobile ? 5.4 : 14;
  const sideX = mobile ? 2.55 : 5.2;
  const colX = mobile ? 1.85 : 3.55;
  const columnH = mobile ? 4.4 : 4.75;
  const face = sideX - 0.18;
  const panelW = mobile ? 1.15 : 1.7;
  const panelH = mobile ? 1.45 : 1.85;
  const aisleW = mobile ? 1.05 : 2.8;
  const floorLen = mobile ? 26 : 28;
  const aisleLen = mobile ? 24 : 26;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, mobile ? -0.5 : 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[roomW, floorLen]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, mobile ? -0.5 : 0]} receiveShadow material={aisleMat}>
        <planeGeometry args={[aisleW, aisleLen]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, mobile ? -0.5 : 0]} material={trim}>
        <planeGeometry args={[mobile ? 0.07 : 0.1, aisleLen]} />
      </mesh>

      {/* Structural side walls */}
      <mesh position={[-sideX, 2.6, 0]} material={wall} receiveShadow>
        <boxGeometry args={[0.3, 5.2, 28]} />
      </mesh>
      <mesh position={[sideX, 2.6, 0]} material={wall} receiveShadow>
        <boxGeometry args={[0.3, 5.2, 28]} />
      </mesh>

      {/* Royal side finish — simple silk upper + wainscot + gold rails */}
      {([-1, 1] as const).map((side) => {
        const x = side * face;
        const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        return (
          <group key={`royal-wall-${side}`} position={[x, 0, 0]} rotation={[0, rotY, 0]}>
            {/* Upper silk field */}
            <mesh position={[0, 3.15, 0.02]} material={silkWall} receiveShadow>
              <boxGeometry args={[mobile ? 24 : 26, 3.5, 0.04]} />
            </mesh>
            {/* Soft blush band behind panels */}
            <mesh position={[0, 2.85, 0.04]} material={wallAccent}>
              <boxGeometry args={[mobile ? 24 : 26, 2.2, 0.02]} />
            </mesh>
            {/* Lower wainscot */}
            <mesh position={[0, 0.7, 0.03]} material={wainscot} receiveShadow>
              <boxGeometry args={[mobile ? 24 : 26, 1.4, 0.06]} />
            </mesh>
            {/* Baseboard */}
            <mesh position={[0, 0.1, 0.06]} material={trim}>
              <boxGeometry args={[mobile ? 24 : 26, 0.2, 0.08]} />
            </mesh>
            {/* Chair rail */}
            <mesh position={[0, 1.42, 0.07]} material={trim}>
              <boxGeometry args={[mobile ? 24 : 26, 0.08, 0.07]} />
            </mesh>
            <mesh position={[0, 1.52, 0.06]} material={panel}>
              <boxGeometry args={[mobile ? 24 : 26, 0.05, 0.04]} />
            </mesh>
            {/* Picture rail */}
            <mesh position={[0, 4.35, 0.07]} material={trim}>
              <boxGeometry args={[mobile ? 24 : 26, 0.06, 0.06]} />
            </mesh>
            {/* Crown molding */}
            <mesh position={[0, 4.85, 0.08]} material={trim}>
              <boxGeometry args={[mobile ? 24 : 26, 0.14, 0.1]} />
            </mesh>
            <mesh position={[0, 5.0, 0.05]} material={panel}>
              <boxGeometry args={[mobile ? 24 : 26, 0.08, 0.05]} />
            </mesh>

            {/* Recessed royal panels */}
            {panelZs.map((z) => (
              <group key={`panel-${side}-${z}`} position={[z, 2.85, 0.08]}>
                <mesh material={trim}>
                  <boxGeometry args={[panelW + 0.12, panelH + 0.12, 0.04]} />
                </mesh>
                <mesh position={[0, 0, 0.03]} material={silkWall}>
                  <boxGeometry args={[panelW, panelH, 0.03]} />
                </mesh>
                <mesh position={[0, 0, 0.05]} material={trim}>
                  <boxGeometry args={[panelW * 0.72, panelH * 0.72, 0.02]} />
                </mesh>
                <mesh position={[0, 0, 0.065]} material={panel}>
                  <boxGeometry args={[panelW * 0.62, panelH * 0.62, 0.015]} />
                </mesh>
                {/* Center jewel */}
                <mesh position={[0, 0, 0.08]} material={trim}>
                  <sphereGeometry args={[0.05, 12, 12]} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      <mesh position={[0, 2.6, mobile ? 11.4 : 12.2]} material={wall}>
        <boxGeometry args={[roomW - 0.6, 5.2, 0.35]} />
      </mesh>

      <mesh position={[0, 5.1, mobile ? -0.5 : 0]} material={panel}>
        <boxGeometry args={[roomW - 0.6, 0.25, floorLen]} />
      </mesh>
      <mesh position={[0, 5.02, mobile ? -0.5 : 0]}>
        <boxGeometry args={[mobile ? 1.4 : 3.2, 0.08, aisleLen]} />
        <meshStandardMaterial
          color={colors.paper}
          emissive={mixHex(colors.secondary, '#ffffff', 0.5)}
          emissiveIntensity={1.2}
          roughness={0.25}
        />
      </mesh>

      {columnZs.map((z) => (
        <group key={z}>
          <RoyalColumn position={[-colX, 0, z]} colors={colors} height={columnH} />
          <RoyalColumn position={[colX, 0, z]} colors={colors} height={columnH} />
        </group>
      ))}
    </group>
  );
}
