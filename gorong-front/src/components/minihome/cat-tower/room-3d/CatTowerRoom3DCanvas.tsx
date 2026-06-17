import { memo, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { normalizeEquipPreview, type EquipPreview } from "../../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../../utils/minihome/growth/growth";
import type { RoomBackgroundId } from "../../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomDecorItem } from "../../../../utils/minihome/cat-tower/catTowerRoomDecor";
import { getCatTowerRoomDisplayPrefs } from "../../../../utils/minihome/cat-tower/cattowerDisplayPrefs";
import { useElementVisible } from "../../../../hooks/useElementVisible";
import { usePlaybackActive } from "../../../../hooks/usePlaybackActive";
import { prefersLightweight3D } from "../../../../utils/minihome/cat-tower/room3dPerf";
import { getRoom3DTheme } from "./room3dTheme";
import CatTowerRoom3DScene from "./CatTowerRoom3DScene";
import GoCatRoomOverlay from "./GoCatRoomOverlay";

type Props = {
  className?: string;
  style?: React.CSSProperties;
  roomBackground: RoomBackgroundId;
  roomDecorItems: RoomDecorItem[];
  growthStage: GrowthStage;
  activityCount: number;
  equipped?: EquipPreview | null;
  editable?: boolean;
  /** false면 WebGL 루프 중지 (모달 열림·탭 이탈 등) */
  active?: boolean;
  hint?: string;
  onMoveItem?: (id: string, x: number, y: number) => void;
  onRemoveItem?: (id: string) => void;
};

function CatTowerRoom3DCanvas({
  className = "",
  style,
  roomBackground,
  roomDecorItems,
  growthStage,
  activityCount,
  equipped,
  editable = false,
  active = true,
  hint,
  onMoveItem,
  onRemoveItem,
}: Props) {
  const theme = getRoom3DTheme(roomBackground);
  const safeEquipped = useMemo(() => normalizeEquipPreview(equipped), [equipped]);
  const equipKey = useMemo(
    () =>
      [safeEquipped.HEAD?.itemCode, safeEquipped.FACE?.itemCode, safeEquipped.NECK?.itemCode].join(
        "|"
      ),
    [safeEquipped.HEAD?.itemCode, safeEquipped.FACE?.itemCode, safeEquipped.NECK?.itemCode]
  );

  const { ref, visible } = useElementVisible();
  const lightweight = useMemo(() => prefersLightweight3D(), []);
  const running = usePlaybackActive(active && visible);
  const display = useMemo(() => getCatTowerRoomDisplayPrefs(), []);

  return (
    <div
      ref={ref}
      className={`relative isolate overflow-visible rounded-2xl ${className}`}
      style={{ background: theme.sky, ...style }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {running ? (
          <Canvas
            shadows={!lightweight}
            className="absolute inset-0 !h-full !w-full"
            camera={{
              position: [0, display.cameraY, display.cameraZ],
              fov: display.cameraFov,
              near: 0.1,
              far: 40,
            }}
            gl={{ antialias: !lightweight, alpha: true, powerPreference: "high-performance" }}
            dpr={lightweight ? [1, 1.25] : [1, 1.5]}
            frameloop="demand"
            style={{ background: "transparent", display: "block" }}
          >
            <Suspense fallback={null}>
              <CatTowerRoom3DScene
                roomBackground={roomBackground}
                roomDecorItems={roomDecorItems}
                editable={editable}
                lightweight={lightweight}
                sceneScale={display.sceneScale}
                orbitMinDistance={display.orbitMinDistance}
                orbitMaxDistance={display.orbitMaxDistance}
                onMoveItem={onMoveItem}
                onRemoveItem={onRemoveItem}
              />
            </Suspense>
          </Canvas>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: theme.sky }}
            aria-hidden
          >
            <span className="text-3xl opacity-40">🏡</span>
          </div>
        )}
      </div>

      {running ? (
        <div
          className="pointer-events-none absolute z-[2]"
          style={{
            left: `${display.catAnchorX * 100}%`,
            bottom: `${display.catAnchorY * 100}%`,
            transform: "translate(-50%, 0)",
          }}
        >
          <GoCatRoomOverlay
            key={equipKey}
            growthStage={growthStage}
            activityCount={activityCount}
            equipped={safeEquipped}
            interactive={!editable}
            playbackActive={running}
            catBoxPx={display.catBoxPx}
            catDisplayScale={display.catDisplayScale}
          />
        </div>
      ) : null}

      {hint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] rounded-b-2xl bg-gradient-to-t from-black/30 to-transparent px-3 py-2 text-center">
          <p className="text-xs font-semibold text-white/95">{hint}</p>
        </div>
      ) : editable ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] rounded-b-2xl bg-gradient-to-t from-black/30 to-transparent px-3 py-2 text-center">
          <p className="text-xs font-semibold text-white/95">
            🖱️ 드래그 이동 · 더블클릭 제거 · 마우스로 시점 회전
          </p>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] rounded-b-2xl bg-gradient-to-t from-black/20 to-transparent px-3 py-2 text-center">
          <p className="text-xs font-medium text-white/90">3D 미니홈 · 마우스로 방 구경</p>
        </div>
      )}
    </div>
  );
}

export default memo(CatTowerRoom3DCanvas);
