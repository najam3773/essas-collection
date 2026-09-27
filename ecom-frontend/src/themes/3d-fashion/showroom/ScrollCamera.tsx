'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA_PATH, CAMERA_PATH_MOBILE, LOOK_PATH, LOOK_PATH_MOBILE } from './path';

export function ScrollCamera({
  progress,
  look = { x: 0, y: 0 },
  mobile = false,
}: {
  progress: number;
  look?: { x: number; y: number };
  mobile?: boolean;
}) {
  const { camera } = useThree();
  const camCurve = useMemo(
    () => new THREE.CatmullRomCurve3(mobile ? CAMERA_PATH_MOBILE : CAMERA_PATH),
    [mobile],
  );
  const lookCurve = useMemo(
    () => new THREE.CatmullRomCurve3(mobile ? LOOK_PATH_MOBILE : LOOK_PATH),
    [mobile],
  );
  const pos = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const smoothed = useRef(0);
  const lookSm = useRef({ x: 0, y: 0 });
  const booted = useRef(false);

  useFrame((_, dt) => {
    // Snap to entrance framing on first frame so load matches the aisle view immediately
    if (!booted.current) {
      smoothed.current = progress;
      lookSm.current.x = look.x;
      lookSm.current.y = look.y;
      camCurve.getPoint(THREE.MathUtils.clamp(progress, 0, 1), pos.current);
      lookCurve.getPoint(THREE.MathUtils.clamp(progress, 0, 1), target.current);
      camera.position.copy(pos.current);
      camera.lookAt(target.current);
      booted.current = true;
      return;
    }

    smoothed.current = THREE.MathUtils.damp(smoothed.current, progress, 4.8, dt);
    lookSm.current.x = THREE.MathUtils.damp(lookSm.current.x, look.x, 5, dt);
    lookSm.current.y = THREE.MathUtils.damp(lookSm.current.y, look.y, 5, dt);

    const t = THREE.MathUtils.clamp(smoothed.current, 0, 1);
    camCurve.getPoint(t, pos.current);
    lookCurve.getPoint(t, target.current);

    const parallax = mobile ? 0.18 : 0.45;
    pos.current.x += lookSm.current.x * parallax;
    pos.current.y += -lookSm.current.y * (mobile ? 0.08 : 0.18);
    target.current.x += lookSm.current.x * (mobile ? 0.45 : 1.1);
    target.current.y += -lookSm.current.y * (mobile ? 0.2 : 0.45);

    camera.position.lerp(pos.current, 0.22);
    camera.lookAt(target.current);
  });

  return null;
}
