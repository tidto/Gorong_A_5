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
import { CATTOWER_ROOM_3D_CANVAS_H } from "./catTowerLayout";

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

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-orange-100/90 bg-gradient-to-b from-[#fffaf5] to-orange-50/50 shadow-[0_8px_32px_rgba(255,140,80,0.08)] ring-1 ring-orange-50">
      <div className={`relative z-20 border-b px-3 py-2.5 text-center ${bg.headerBgClass}`}>
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

      <div className="relative bg-gradient-to-b from-orange-50/30 to-transparent p-2 sm:p-3">
        <div className="overflow-hidden rounded-xl ring-1 ring-orange-100/90 shadow-inner">
        <CatTowerRoom3DCanvas
          className={`${CATTOWER_ROOM_3D_CANVAS_H} w-full rounded-xl`}
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
