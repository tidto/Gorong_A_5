import {
  ROOM_DECOR_CATALOG,
  type RoomDecorType,
} from "../../../utils/minihome/cat-tower/catTowerRoomDecor";

type CatTowerRoomDecorPanelProps = {
  placedTypes: Set<RoomDecorType>;
  onToggleItem: (type: RoomDecorType) => void;
  onResetRoom?: () => void;
  onCatDecorate?: () => void;
};

/** 방 가구·장식 선택 패널 */
export default function CatTowerRoomDecorPanel({
  placedTypes,
  onToggleItem,
  onResetRoom,
  onCatDecorate,
}: CatTowerRoomDecorPanelProps) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200/90 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-emerald-600/90 px-3 py-2 text-center text-[11px] font-extrabold text-white">
        🏡 방 꾸미기
      </div>

      <div className="space-y-3 p-3">
        <p className="text-center text-[10px] leading-relaxed text-slate-500">
          아이템을 눌러 방에 배치하세요. 방 안 아이템을 선택하면 삭제할 수 있습니다.
        </p>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ROOM_DECOR_CATALOG.map((entry) => {
            const active = placedTypes.has(entry.type);
            return (
              <button
                key={entry.type}
                type="button"
                onClick={() => onToggleItem(entry.type)}
                className={`flex flex-col items-center rounded-xl border-2 px-2 py-2.5 transition ${
                  active
                    ? "border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-200"
                    : "border-emerald-100 bg-emerald-50/40 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
                title={entry.label}
              >
                <span className="text-2xl">{entry.emoji}</span>
                <span className="mt-1 text-[9px] font-bold text-slate-700">{entry.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-2 border-t border-emerald-50 pt-2">
          {onCatDecorate ? (
            <button
              type="button"
              onClick={onCatDecorate}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-bold text-orange-800 hover:bg-orange-100"
            >
              👕 고냥이 옷/악세
            </button>
          ) : null}
          {onResetRoom && placedTypes.size > 0 ? (
            <button
              type="button"
              onClick={onResetRoom}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100"
            >
              🧹 방 초기화
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
