import type { ReactNode } from "react";
import { X } from "lucide-react";
import Button from "../../Button";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import type { SlotType } from "../../../utils/minihome/gocat/gocatSlots";
import DecorationCatStage from "../decoration/DecorationCatStage";

export type { SlotType };

export type DecorItem = import("../../../types/minihome/item").UserItem & {
  slotType?: SlotType;
};

export default function DecorationModal(props: {
  open: boolean;
  saving: boolean;
  error?: string | null;
  canEdit?: boolean;
  growthStage: GrowthStage;
  customizePanel: ReactNode;
  onClose: () => void;
  onSave: () => void;
  Preview: ReactNode;
}) {
  const { open, saving, error, customizePanel, onClose, onSave, Preview } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-amber-950/20 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-amber-100/90 bg-gradient-to-b from-[#fffaf5] to-[#fef3e8] shadow-2xl sm:rounded-[28px]">
        <header className="flex shrink-0 items-center justify-between px-4 py-2 sm:px-5">
          <h2 className="text-lg font-extrabold text-amber-950">Go냥이 꾸미기</h2>
          <button
            type="button"
            className="rounded-full bg-white/90 p-2 shadow-sm transition hover:scale-105 active:scale-95"
            onClick={onClose}
            disabled={saving}
            aria-label="닫기"
          >
            <X className="h-5 w-5 text-amber-900" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 sm:grid-cols-[1fr_minmax(280px,360px)]">
          <DecorationCatStage>{Preview}</DecorationCatStage>
          <aside className="flex min-h-0 flex-col border-t border-amber-100/80 sm:border-l sm:border-t-0">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{customizePanel}</div>
            <footer className="shrink-0 border-t border-amber-100/80 bg-white/60 p-4">
              {error ? (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              ) : null}
              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={saving}
                onClick={onSave}
              >
                {saving ? "저장 중…" : "저장하고 적용하기"}
              </Button>
              <p className="mt-2 text-center text-[10px] text-amber-800/50">
                저장 전에는 미리보기만, 저장 후 방문자에게도 보여요
              </p>
            </footer>
          </aside>
        </div>
      </div>
    </div>
  );
}
