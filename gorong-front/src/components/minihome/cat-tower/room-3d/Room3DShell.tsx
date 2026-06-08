import { useMemo } from "react";
import { ROOM_3D } from "../../../../config/catTower3d";
import type { RoomBackgroundId } from "../../../../utils/minihome/cat-tower/catTowerRoomBackground";
import { getRoom3DTheme } from "./room3dTheme";

type Room3DShellProps = {
  roomBackground?: RoomBackgroundId;
};

/** 3D 방 — 바닥·벽·천장 (배경 테마 반영) */
export default function Room3DShell({ roomBackground = "BASIC_ROOM" }: Room3DShellProps) {
  const theme = getRoom3DTheme(roomBackground);

  const { w, d, h } = useMemo(
    () => ({ w: ROOM_3D.width, d: ROOM_3D.depth, h: ROOM_3D.wallHeight }),
    []
  );

  return (
    <group>
      {/* 천장 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={theme.ceiling} roughness={0.95} />
      </mesh>

      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROOM_3D.floorY, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={theme.floor} roughness={0.88} metalness={0.03} />
      </mesh>

      {/* 바닥 중앙 러그 영역 힌트 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.3]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial color={theme.accent} transparent opacity={0.12} roughness={1} />
      </mesh>

      {/* 뒷벽 — accent */}
      <mesh position={[0, h / 2, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.12]} />
        <meshStandardMaterial color={theme.wallBack} roughness={0.82} />
      </mesh>

      {/* 좌·우 벽 */}
      <mesh position={[-w / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, h, d]} />
        <meshStandardMaterial color={theme.wall} roughness={0.85} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, h, d]} />
        <meshStandardMaterial color={theme.wall} roughness={0.85} />
      </mesh>

      {/* 몰딩 */}
      <mesh position={[0, 0.06, -d / 2 + 0.06]}>
        <boxGeometry args={[w, 0.12, 0.12]} />
        <meshStandardMaterial color={theme.trim} roughness={0.65} />
      </mesh>
      <mesh position={[-w / 2 + 0.06, 0.06, 0]}>
        <boxGeometry args={[0.12, 0.12, d]} />
        <meshStandardMaterial color={theme.trim} roughness={0.65} />
      </mesh>
      <mesh position={[w / 2 - 0.06, 0.06, 0]}>
        <boxGeometry args={[0.12, 0.12, d]} />
        <meshStandardMaterial color={theme.trim} roughness={0.65} />
      </mesh>
    </group>
  );
}
