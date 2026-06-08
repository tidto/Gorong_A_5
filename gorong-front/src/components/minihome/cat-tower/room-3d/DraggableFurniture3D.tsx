import { useMemo, useRef, useState, useEffect } from "react";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { RoomDecorItem } from "../../../../utils/minihome/cat-tower/catTowerRoomDecor";
import { ROOM_3D } from "../../../../config/catTower3d";
import {
  clampFloorXZ,
  floorXZToPercent,
  percentToFloorXZ,
} from "../../../../utils/minihome/cat-tower/room3dCoords";
import { FURNITURE_3D_VISUAL } from "./furniture3dVisual";

type Props = {
  item: RoomDecorItem;
  editable?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  onRemove?: (id: string) => void;
};

function FurnitureGeometry({ type }: { type: RoomDecorItem["type"] }) {
  const visual = FURNITURE_3D_VISUAL[type];

  if (type === "plant") {
    return (
      <group scale={visual.scale}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <sphereGeometry args={[0.45, 12, 12]} />
          <meshStandardMaterial color={visual.color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 0.35, 10]} />
          <meshStandardMaterial color={visual.accent ?? "#78350f"} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (type === "lamp") {
    return (
      <group scale={visual.scale}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <sphereGeometry args={[0.55, 12, 12]} />
          <meshStandardMaterial color={visual.color} emissive="#fde68a" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.5, 8]} />
          <meshStandardMaterial color={visual.accent ?? "#475569"} />
        </mesh>
      </group>
    );
  }

  if (type === "frame") {
    return (
      <group scale={visual.scale}>
        <mesh castShadow>
          <boxGeometry args={[1, 1, 0.08]} />
          <meshStandardMaterial color={visual.color} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.72, 0.72, 0.02]} />
          <meshStandardMaterial color={visual.accent ?? "#7dd3fc"} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (type === "sofa") {
    return (
      <group scale={visual.scale}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[1, 0.5, 0.55]} />
          <meshStandardMaterial color={visual.color} roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.55, -0.12]} castShadow>
          <boxGeometry args={[1, 0.45, 0.2]} />
          <meshStandardMaterial color={visual.accent ?? visual.color} roughness={0.75} />
        </mesh>
      </group>
    );
  }

  if (type === "rug") {
    return (
      <mesh scale={visual.scale} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={visual.color} roughness={0.95} />
      </mesh>
    );
  }

  return (
    <mesh scale={visual.scale} castShadow>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color={visual.color} roughness={0.55} />
    </mesh>
  );
}

/** 바닥 평면에서 드래그 가능한 3D 가구 */
export default function DraggableFurniture3D({
  item,
  editable = false,
  onMove,
  onRemove,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  const { camera, gl } = useThree();
  const visual = FURNITURE_3D_VISUAL[item.type];

  const initial = useMemo(() => {
    const [x, z] = percentToFloorXZ(item.x, item.y);
    if (visual.wallMounted) {
      return [x, visual.yOffset, -ROOM_3D.depth / 2 + 0.18] as [number, number, number];
    }
    return [x, visual.yOffset, z] as [number, number, number];
  }, [item.x, item.y, visual.wallMounted, visual.yOffset]);

  useEffect(() => {
    if (dragging || !groupRef.current) return;
    const [x, z] = percentToFloorXZ(item.x, item.y);
    if (visual.wallMounted) {
      groupRef.current.position.set(x, visual.yOffset, -ROOM_3D.depth / 2 + 0.18);
    } else {
      groupRef.current.position.set(x, visual.yOffset, z);
    }
  }, [item.x, item.y, dragging, visual.wallMounted, visual.yOffset]);

  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -visual.yOffset),
    [visual.yOffset]
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  const projectPointer = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!editable) return;
    e.stopPropagation();
    setDragging(true);
    gl.domElement.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!editable || !groupRef.current) return;
    e.stopPropagation();
    if (dragging) {
      setDragging(false);
      const { x, z } = groupRef.current.position;
      const pct = floorXZToPercent(x, z);
      onMove?.(item.id, pct.x, pct.y);
    }
    gl.domElement.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!editable || !dragging || !groupRef.current) return;
    e.stopPropagation();
    const hit = projectPointer(e.clientX, e.clientY);
    if (!hit) return;
    const [cx, cz] = clampFloorXZ(
      hit.x,
      visual.wallMounted ? -ROOM_3D.depth / 2 + 0.18 : hit.z
    );
    groupRef.current.position.x = cx;
    if (!visual.wallMounted) {
      groupRef.current.position.z = cz;
    }
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!editable) return;
    e.stopPropagation();
    onRemove?.(item.id);
  };

  return (
    <group
      ref={groupRef}
      position={initial}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDoubleClick}
    >
      <FurnitureGeometry type={item.type} />
      {editable && dragging ? (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.42, 24]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.7} />
        </mesh>
      ) : null}
    </group>
  );
}
