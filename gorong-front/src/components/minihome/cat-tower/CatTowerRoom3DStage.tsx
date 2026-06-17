import { memo, useMemo } from "react";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { normalizeEquipPreview, resolveEquipImageUrl } from "../../../utils/minihome/gocat/items";
import LazyImage from "../../common/LazyImage";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import {
  ROOM_BACKGROUND_BY_ID,
  type RoomBackgroundId,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomDecorItem } from "../../../utils/minihome/cat-tower/catTowerRoomDecor";
import CatTowerSpeechBubble from "./CatTowerSpeechBubble";
import CatTowerRoom3DCanvas from "./room-3d/CatTowerRoom3DCanvas";
import { getCatTowerRoomDisplayPrefs } from "../../../utils/minihome/cat-tower/cattowerDisplayPrefs";
import { CATTOWER_CARD } from "../../../utils/minihome/cat-tower/catTowerTheme";

type Props = {
  growthStage: GrowthStage;
  activityCount: number;
  equipped?: EquipPreview | null;
  roomBackground?: RoomBackgroundId;
  roomDecorItems?: RoomDecorItem[];
  catName?: string;
  readOnly?: boolean;
  editableDecor?: boolean;
  onMoveDecorItem?: (id: string, x: number, y: number) => void;
  onRemoveDecorItem?: (id: string) => void;
};

/** CatTower 중앙 — React Three Fiber 3D 방 */
function CatTowerRoom3DStage({
  growthStage,
  activityCount,
  equipped,
  roomBackground = "BASIC_ROOM",
  roomDecorItems = [],
  catName = "Go냥이",
  readOnly = false,
  editableDecor = false,
  onMoveDecorItem,
  onRemoveDecorItem,
}: Props) {
  const safeEquipped = useMemo(() => normalizeEquipPreview(equipped), [equipped]);
  const worn = useMemo(
    () =>
      (["HEAD", "FACE", "NECK"] as const)
        .map((slot) => safeEquipped[slot])
        .filter(Boolean),
    [safeEquipped]
  );
  const bg = ROOM_BACKGROUND_BY_ID[roomBackground] ?? ROOM_BACKGROUND_BY_ID.BASIC_ROOM;
  const display = useMemo(() => getCatTowerRoomDisplayPrefs(), []);
  const canvasHeightStyle = useMemo(
    () => ({
      height: `clamp(${display.canvasHeightMobile}px, 52vw, ${display.canvasHeightDesktop}px)`,
    }),
    [display.canvasHeightDesktop, display.canvasHeightMobile]
  );

  return (
    <div className={`${CATTOWER_CARD} relative flex flex-col`}>
      <div className={`sidebar-card-header relative z-20 justify-center ${bg.headerBgClass}`}>
        <p className="text-xs font-extrabold tracking-wide text-slate-800 sm:text-sm">
          {catName}의 3D 방 · {bg.label}
        </p>
      </div>

      <div className="pointer-events-none absolute left-3 top-[3.25rem] z-20 max-w-[130px] sm:left-4">
        <CatTowerSpeechBubble
          catName={catName}
          isDark={Boolean(bg.isDark)}
          animate={!readOnly}
        />
      </div>

      <div className="relative bg-slate-50/50 p-1 sm:p-1.5">
        <div className="overflow-visible rounded-xl ring-1 ring-slate-200 shadow-inner">
        <CatTowerRoom3DCanvas
          className="w-full rounded-xl"
          style={canvasHeightStyle}
          roomBackground={roomBackground}
          roomDecorItems={roomDecorItems}
          growthStage={growthStage}
          activityCount={activityCount}
          equipped={safeEquipped}
          editable={editableDecor && !readOnly}
          hint={
            readOnly ? "👀 방문 모드 · 마우스로 방을 구경해 보세요" : undefined
          }
          onMoveItem={onMoveDecorItem}
          onRemoveItem={onRemoveDecorItem}
        />
        </div>
      </div>

      {worn.length > 0 ? (
        <div className="relative z-20 border-t border-white/50 bg-white/60 px-3 py-1.5 backdrop-blur-sm">
          <div className="flex flex-wrap justify-center gap-1">
            {worn.map((item) => {
              const imageUrl = resolveEquipImageUrl(item!);
              return (
                <span
                  key={item!.itemCode ?? item!.itemName}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/70 bg-white/90 px-2.5 py-1 text-xs font-bold text-orange-900/85"
                >
                  {imageUrl ? (
                    <LazyImage src={imageUrl} alt="" className="h-3.5 w-3.5 object-contain" draggable={false} />
                  ) : (
                    "🎀"
                  )}
                  {item!.itemName ?? item!.itemCode}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(CatTowerRoom3DStage);
