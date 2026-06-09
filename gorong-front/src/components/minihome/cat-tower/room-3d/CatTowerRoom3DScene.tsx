import { useEffect } from "react";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { RoomBackgroundId } from "../../../../utils/minihome/cat-tower/catTowerRoomBackground";
import { ROOM_BACKGROUND_BY_ID } from "../../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomDecorItem } from "../../../../utils/minihome/cat-tower/catTowerRoomDecor";
import Room3DShell from "./Room3DShell";
import Room3DAmbience from "./Room3DAmbience";
import DraggableFurniture3D from "./DraggableFurniture3D";
import { getRoom3DTheme } from "./room3dTheme";
import { SceneDemandDriver } from "./SceneDemandDriver";

type Props = {
  roomBackground: RoomBackgroundId;
  roomDecorItems: RoomDecorItem[];
  editable?: boolean;
  lightweight?: boolean;
  sceneScale?: number;
  orbitMinDistance?: number;
  orbitMaxDistance?: number;
  onMoveItem?: (id: string, x: number, y: number) => void;
  onRemoveItem?: (id: string) => void;
};

/** 3D 방 씬 — Go냥이는 캔버스 밖 CSS 오버레이(GoCatRoomOverlay) */
export default function CatTowerRoom3DScene({
  roomBackground,
  roomDecorItems,
  editable = false,
  lightweight = false,
  sceneScale = 1,
  orbitMinDistance = 4.5,
  orbitMaxDistance = 10,
  onMoveItem,
  onRemoveItem,
}: Props) {
  const theme = getRoom3DTheme(roomBackground);
  const bgMeta = ROOM_BACKGROUND_BY_ID[roomBackground] ?? ROOM_BACKGROUND_BY_ID.BASIC_ROOM;
  const ambienceTheme = bgMeta.theme ?? "sakura";
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    invalidate();
  }, [roomBackground, roomDecorItems.length, editable, invalidate]);

  return (
    <>
      <SceneDemandDriver animateAmbient={ambienceTheme === "sakura" && !lightweight} fps={lightweight ? 8 : 12} />
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.sky, theme.fogNear, theme.fogFar]} />

      <ambientLight intensity={theme.ambient} />
      <directionalLight
        castShadow={!lightweight}
        intensity={theme.directional}
        position={[4, 8, 5]}
        shadow-mapSize={lightweight ? [512, 512] : [1024, 1024]}
      />
      <pointLight
        intensity={theme.pointIntensity}
        position={[-3, 4, 2]}
        color={theme.pointColor}
      />

      <group scale={sceneScale}>
        <Room3DShell roomBackground={roomBackground} />
        <Room3DAmbience roomBackground={roomBackground} lightweight={lightweight} />

        {roomDecorItems.map((item) => (
          <DraggableFurniture3D
            key={item.id}
            item={item}
            editable={editable}
            onMove={onMoveItem}
            onRemove={onRemoveItem}
          />
        ))}
      </group>

      {!lightweight ? (
        <ContactShadows
          position={[0, 0.01, 0.82]}
          opacity={bgMeta.isDark ? 0.45 : 0.32}
          scale={5}
          blur={2.5}
          far={3.5}
        />
      ) : null}

      <OrbitControls
        enablePan={false}
        enableDamping={false}
        minPolarAngle={0.35}
        maxPolarAngle={1.35}
        minDistance={orbitMinDistance}
        maxDistance={orbitMaxDistance}
        target={[0, 1.15, 0.75]}
        onChange={() => invalidate()}
      />
    </>
  );
}
