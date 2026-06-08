import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RoomBackgroundId } from "../../../../utils/minihome/cat-tower/catTowerRoomBackground";
import { ROOM_BACKGROUND_BY_ID } from "../../../../utils/minihome/cat-tower/catTowerRoomBackground";
import { ROOM_3D } from "../../../../config/catTower3d";
import { getRoom3DTheme } from "./room3dTheme";

type Props = {
  roomBackground: RoomBackgroundId;
  lightweight?: boolean;
};

function SakuraPetals({ count, staticOnly = false }: { count: number; staticOnly?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * ROOM_3D.width * 0.8,
      y: 1.2 + Math.random() * 1.8,
      z: (Math.random() - 0.5) * ROOM_3D.depth * 0.6,
      speed: 0.15 + Math.random() * 0.2,
      phase: i * 0.7,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (staticOnly || !ref.current) return;
    ref.current.children.forEach((child, i) => {
      const p = petals[i];
      child.position.y = p.y + Math.sin(clock.elapsedTime * p.speed + p.phase) * 0.15;
      child.rotation.z = clock.elapsedTime * 0.4 + p.phase;
    });
  });

  return (
    <group ref={ref}>
      {petals.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[0, 0, p.phase]}>
          <circleGeometry args={[0.06, 8]} />
          <meshStandardMaterial color="#fda4af" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function NightStars({ lightweight = false }: { lightweight?: boolean }) {
  const stars = useMemo(() => {
    return Array.from({ length: lightweight ? 14 : 28 }, () => ({
      x: (Math.random() - 0.5) * ROOM_3D.width * 0.85,
      y: ROOM_3D.wallHeight - 0.15 - Math.random() * 0.5,
      z: -ROOM_3D.depth / 2 + 0.2 + Math.random() * 0.3,
      s: 0.02 + Math.random() * 0.03,
    }));
  }, [lightweight]);

  return (
    <group>
      {stars.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.s, 6, 6]} />
          <meshStandardMaterial color="#e0e7ff" emissive="#c7d2fe" emissiveIntensity={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.8, -ROOM_3D.depth / 2 + 0.08]}>
        <circleGeometry args={[0.35, 24]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={[0, 1.8, -ROOM_3D.depth / 2 + 0.5]} intensity={0.4} color="#fde68a" distance={4} />
    </group>
  );
}

function ForestVines() {
  return (
    <group>
      <mesh position={[-ROOM_3D.width / 2 + 0.2, 1.2, -0.5]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.04, 0.06, 2.2, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      <mesh position={[-ROOM_3D.width / 2 + 0.35, 1.6, 0.2]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[-ROOM_3D.width / 2 + 0.15, 2.1, -0.1]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
    </group>
  );
}

/** 배경 테마별 3D 장식 */
export default function Room3DAmbience({ roomBackground, lightweight = false }: Props) {
  const theme = ROOM_BACKGROUND_BY_ID[roomBackground]?.theme ?? "sakura";

  if (theme === "night") return <NightStars lightweight={lightweight} />;
  if (theme === "forest") return <ForestVines />;
  if (lightweight) return <SakuraPetals count={5} staticOnly />;
  return <SakuraPetals count={10} />;
}
