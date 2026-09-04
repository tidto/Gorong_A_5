import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EquipPreview, EquipPreviewItem } from "../../../../utils/minihome/gocat/items";
import { normalizeEquipPreview } from "../../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../../utils/minihome/growth/growth";
import { normalizeGrowthStage } from "../../../../utils/minihome/growth/growth";

type Props = {
  growthStage: GrowthStage;
  equipped?: EquipPreview | null;
  interactive?: boolean;
};

function stageScale(stage: GrowthStage): number {
  switch (normalizeGrowthStage(stage)) {
    case "BASIC":
      return 0.72;
    case "TEEN":
      return 0.86;
    case "ADULT":
      return 1;
    case "MASTER":
      return 1.12;
    default:
      return 0.86;
  }
}

function HeadAccessory({ item }: { item: EquipPreviewItem }) {
  const code = (item.itemCode ?? "").toLowerCase();

  if (code.includes("crown")) {
    return (
      <group position={[0, 0.52, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.12, 5]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.2} />
        </mesh>
      </group>
    );
  }

  if (code.includes("cap") || code.includes("hat") || code.includes("pilgrim")) {
    return (
      <group position={[0, 0.48, 0]}>
        <mesh>
          <cylinderGeometry args={[0.28, 0.3, 0.1, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.14, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.02, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.12, 0.04, 0.06]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.4} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[0, 0.5, 0]}>
      <sphereGeometry args={[0.2, 12, 12]} />
      <meshStandardMaterial color="#f97316" roughness={0.5} />
    </mesh>
  );
}

function FaceAccessory({ item }: { item: EquipPreviewItem }) {
  const code = (item.itemCode ?? "").toLowerCase();
  if (!code.includes("glass")) {
    return (
      <mesh position={[0, 0.22, 0.28]}>
        <boxGeometry args={[0.35, 0.08, 0.04]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} />
      </mesh>
    );
  }

  return (
    <group position={[0, 0.22, 0.3]}>
      <mesh position={[-0.1, 0, 0]}>
        <torusGeometry args={[0.07, 0.015, 8, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.1, 0, 0]}>
        <torusGeometry args={[0.07, 0.015, 8, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

function NeckAccessory({ item }: { item: EquipPreviewItem }) {
  const code = (item.itemCode ?? "").toLowerCase();
  const color = code.includes("pink") ? "#f472b6" : "#fb7185";

  return (
    <group position={[0, 0.05, 0.22]}>
      <mesh rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.22, 0.12, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.06, 0.02]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.18, 0.1, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 3D Go냥이 — 로우폴리 + 장착 아이템 */
export default function GoCat3DMesh({ growthStage, equipped, interactive = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const safe = useMemo(() => normalizeEquipPreview(equipped), [equipped]);
  const scale = stageScale(growthStage);
  const isMaster = normalizeGrowthStage(growthStage) === "MASTER";

  useFrame(({ clock }) => {
    if (!groupRef.current || !interactive) return;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0.75]} scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshStandardMaterial color="#fb923c" roughness={0.65} />
      </mesh>

      <mesh position={[0, 0.22, 0.18]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.62, 0.05]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#fb923c" roughness={0.6} />
      </mesh>

      <mesh position={[-0.18, 0.82, 0.02]} rotation={[0, 0, 0.35]} castShadow>
        <coneGeometry args={[0.1, 0.18, 8]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>
      <mesh position={[0.18, 0.82, 0.02]} rotation={[0, 0, -0.35]} castShadow>
        <coneGeometry args={[0.1, 0.18, 8]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>

      <mesh position={[-0.1, 0.64, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.1, 0.64, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      <mesh position={[0, 0.56, 0.32]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#fda4af" />
      </mesh>

      <mesh position={[0, 0.35, -0.38]} rotation={[0.6, 0, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.35, 6, 10]} />
        <meshStandardMaterial color="#fb923c" roughness={0.65} />
      </mesh>

      {([-0.18, 0.18] as const).map((x) => (
        <mesh key={x} position={[x, 0.06, 0.12]} castShadow>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#fed7aa" />
        </mesh>
      ))}

      {safe.HEAD ? <HeadAccessory item={safe.HEAD} /> : null}
      {safe.FACE ? <FaceAccessory item={safe.FACE} /> : null}
      {safe.NECK ? <NeckAccessory item={safe.NECK} /> : null}

      {isMaster && !safe.HEAD ? (
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.2, 0.26, 0.1, 5]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.55}
            roughness={0.25}
            emissive="#f59e0b"
            emissiveIntensity={0.15}
          />
        </mesh>
      ) : null}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.45, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
