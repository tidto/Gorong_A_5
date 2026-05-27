import type { ReactNode } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../Button";
import type { GrowthStage } from "../../utils/minihome/growth";
import DecorationCatStage from "./decoration/DecorationCatStage";

export type SlotType = "HEAD" | "BODY" | "ACCESSORY";

export type DecorItem = import("../../types/minihome/item").UserItem & {
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
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-amber-100/90 bg-gradient-to-b from-[#fffaf5] to-[#fef3e8] shadow-2xl sm:rounded-[28px]"
      >
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

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* 왼쪽: 큰 고양이 */}
          <div className="relative min-h-[min(52vh,380px)] flex-1 lg:min-h-[420px]">
            <DecorationCatStage>{Preview}</DecorationCatStage>
          </div>

          {/* 오른쪽: 색상 + 장착 */}
          <aside className="flex max-h-[48vh] w-full shrink-0 flex-col border-t border-amber-100/80 bg-white/70 lg:max-h-none lg:w-[300px] lg:border-l lg:border-t-0 xl:w-[320px]">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{customizePanel}</div>

            {error ? (
              <p className="mx-4 mb-2 shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <div className="shrink-0 border-t border-amber-100/60 p-4">
              <Button
                variant="primary"
                onClick={onSave}
                disabled={saving || !props.canEdit}
                className="w-full rounded-2xl py-3 text-sm font-extrabold shadow-lg shadow-amber-300/40 transition hover:scale-[1.01] active:scale-[0.99]"
              >
                {saving ? "저장 중…" : "저장하기"}
              </Button>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
