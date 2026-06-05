import { memo, type PointerEvent as ReactPointerEvent } from "react";
import type { RoomPlacement } from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";
import { ROOM_CATALOG_BY_ID } from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";

type CatTowerRoomPlacedItemsProps = {
  items: RoomPlacement[];
  isDark?: boolean;
  editable?: boolean;
  onMove?: (itemId: string, x: number, y: number) => void;
  onRemove?: (itemId: string) => void;
};

/** 방 안 가구·장식 — appearance_state.roomItems */
function CatTowerRoomPlacedItems({
  items,
  isDark = false,
  editable = false,
  onMove,
  onRemove,
}: CatTowerRoomPlacedItemsProps) {
  if (items.length === 0) return null;

  return (
    <>
      {items.map((placement) => {
        const meta = ROOM_CATALOG_BY_ID[placement.itemId];
        if (!meta) return null;

        const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
          if (!editable || !onMove) return;
          e.preventDefault();
          e.stopPropagation();
          const target = e.currentTarget;
          const stage = target.offsetParent as HTMLElement | null;
          if (!stage) return;

          const move = (ev: globalThis.PointerEvent) => {
            const rect = stage.getBoundingClientRect();
            const x = ((ev.clientX - rect.left) / rect.width) * 100;
            const y = ((ev.clientY - rect.top) / rect.height) * 100;
            onMove(placement.itemId, x, y);
          };

          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            target.releasePointerCapture(e.pointerId);
          };

          target.setPointerCapture(e.pointerId);
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        };

        return (
          <div
            key={placement.itemId}
            className={`absolute z-[15] -translate-x-1/2 -translate-y-1/2 ${
              editable ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
            }`}
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              zIndex: meta.zIndex,
            }}
            onPointerDown={handlePointerDown}
          >
            <div
              className={`group relative flex flex-col items-center rounded-xl border px-1.5 py-1 shadow-sm backdrop-blur-sm animate-float ${
                isDark
                  ? "border-indigo-400/20 bg-indigo-950/50"
                  : "border-white/70 bg-white/75"
              }`}
            >
              <span className="text-base leading-none">{meta.emoji}</span>
              <span
                className={`mt-0.5 text-[7px] font-bold ${isDark ? "text-indigo-200/60" : "text-slate-500/70"}`}
              >
                {meta.label}
              </span>
              {editable && onRemove ? (
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onRemove(placement.itemId);
                  }}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow group-hover:flex"
                  aria-label={`${meta.label} 제거`}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default memo(CatTowerRoomPlacedItems);
