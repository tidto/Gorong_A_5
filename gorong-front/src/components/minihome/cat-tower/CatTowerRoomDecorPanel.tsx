import { Lock } from "lucide-react";
import {
  ROOM_DECOR_CATALOG,
  isRoomDecorUnlocked,
  roomDecorUnlockLabel,
  type RoomDecorType,
  type RoomDecorUnlockContext,
} from "../../../utils/minihome/cat-tower/catTowerRoomDecor";
import { useNotification } from "../../../contexts/NotificationContext";

type CatTowerRoomDecorPanelProps = {
  placedTypes: Set<RoomDecorType>;
  unlockContext: RoomDecorUnlockContext;
  onToggleItem: (type: RoomDecorType) => void;
  onResetRoom?: () => void;
  onCatDecorate?: () => void;
};

/** 방 가구·장식 선택 패널 */
export default function CatTowerRoomDecorPanel({
  placedTypes,
  unlockContext,
  onToggleItem,
  onResetRoom,
  onCatDecorate,
}: CatTowerRoomDecorPanelProps) {
  const { toast } = useNotification();

  return (
    <div className="space-y-3">
      <p className="text-center text-[10px] leading-relaxed text-slate-500">
        행사 참여·성장 단계에 따라 가구가 열려요. 눌러 방에 배치하세요.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ROOM_DECOR_CATALOG.map((entry) => {
          const active = placedTypes.has(entry.type);
          const unlocked = isRoomDecorUnlocked(entry.type, unlockContext);

          return (
            <button
              key={entry.type}
              type="button"
              onClick={() => {
                if (!unlocked) {
                  toast(roomDecorUnlockLabel(entry.type), "info");
                  return;
                }
                onToggleItem(entry.type);
              }}
              className={`relative flex flex-col items-center rounded-xl border-2 px-2 py-2.5 transition ${
                !unlocked
                  ? "cursor-not-allowed border-dashed border-slate-200 bg-slate-50/80 opacity-60"
                  : active
                    ? "border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-200"
                    : "border-emerald-100 bg-emerald-50/40 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
              title={unlocked ? entry.label : roomDecorUnlockLabel(entry.type)}
            >
              {!unlocked ? (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-white">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              ) : null}
              <span className={`text-2xl ${!unlocked ? "grayscale" : ""}`}>{entry.emoji}</span>
              <span className="mt-1 text-[9px] font-bold text-slate-700">{entry.label}</span>
              {!unlocked ? (
                <span className="mt-1 line-clamp-2 text-center text-[7px] font-medium leading-tight text-slate-400">
                  {roomDecorUnlockLabel(entry.type)}
                </span>
              ) : active ? (
                <span className="mt-1 text-[7px] font-bold text-orange-600">배치됨</span>
              ) : null}
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
            👕 Go냥이 옷/악세
          </button>
        ) : null}
        {onResetRoom && placedTypes.size > 0 ? (
          <button
            type="button"
            onClick={onResetRoom}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100"
          >
            🧹 가구 초기화
          </button>
        ) : null}
      </div>
    </div>
  );
}
