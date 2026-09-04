import { memo } from "react";
import {
  ROOM_DECOR_BY_TYPE,
  type RoomDecorItem,
} from "../../../utils/minihome/cat-tower/catTowerRoomDecor";

type Props = {
  items: RoomDecorItem[];
  isDark?: boolean;
};

/** 방 안 가구·장식 오버레이 */
function CatTowerRoomDecorLayer({ items, isDark = false }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {items.map((item) => {
        const meta = ROOM_DECOR_BY_TYPE[item.type];
        return (
          <span
            key={item.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 select-none drop-shadow-sm transition-transform duration-300 ${
              isDark ? "brightness-110" : ""
            }`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              zIndex: meta.zIndex,
              fontSize: item.type === "rug" ? "2rem" : "1.65rem",
            }}
            title={meta.label}
          >
            {meta.emoji}
          </span>
        );
      })}
    </div>
  );
}

export default memo(CatTowerRoomDecorLayer);
