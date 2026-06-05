import { X } from "lucide-react";
import CatTowerRoomDecoratePanel from "./CatTowerRoomDecoratePanel";
import type { RoomBackgroundId } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomPlacement } from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";

type CatTowerRoomDecorateModalProps = {
  open: boolean;
  selectedBg: RoomBackgroundId;
  savedBg: RoomBackgroundId;
  items: RoomPlacement[];
  ownedIds: Set<string>;
  isDirty: boolean;
  saving?: boolean;
  error?: string | null;
  onSelectBg: (id: RoomBackgroundId) => void;
  onToggleItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (itemId: string, x: number, y: number) => void;
  onSave: () => void;
  onCatDecorate: () => void;
  onClose: () => void;
};

/** 내 방 꾸미기 — 배경·가구·장식 탭 모달 */
export default function CatTowerRoomDecorateModal({
  open,
  selectedBg,
  savedBg,
  items,
  ownedIds,
  isDirty,
  saving,
  error,
  onSelectBg,
  onToggleItem,
  onRemoveItem,
  onMoveItem,
  onSave,
  onCatDecorate,
  onClose,
}: CatTowerRoomDecorateModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-emerald-100/90 bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cattower-decorate-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/80 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700/70">
              🏡 꾸미기
            </p>
            <h2 id="cattower-decorate-title" className="text-sm font-extrabold text-slate-900">
              내 방 꾸미기
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <CatTowerRoomDecoratePanel
            selectedBg={selectedBg}
            savedBg={savedBg}
            items={items}
            ownedIds={ownedIds}
            isDirty={isDirty}
            saving={saving}
            error={error}
            onSelectBg={onSelectBg}
            onToggleItem={onToggleItem}
            onRemoveItem={onRemoveItem}
            onMoveItem={onMoveItem}
            onSave={onSave}
            onCatDecorate={() => {
              onClose();
              onCatDecorate();
            }}
          />
        </div>
      </div>
    </div>
  );
}
