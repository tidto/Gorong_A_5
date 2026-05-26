import { Shirt } from "lucide-react";
import type { Equipment } from "../../types/minihome/item";
import type { GrowthState } from "../../utils/minihome/growth";
import GoCatVisual from "./GoCatVisual";
import GrowthProgress from "./GrowthProgress";
import { equipPreviewFromEquipBySlot } from "../../utils/minihome/items";

type SlotType = "HEAD" | "BODY" | "ACCESSORY";

export default function GoCatCard(props: {
  catName: string;
  growth: GrowthState;
  isPublic: boolean;
  equipBySlot: Record<SlotType, Equipment | null>;
  onOpenDecoration: () => void;
}) {
  const { catName, growth, isPublic, equipBySlot, onOpenDecoration } = props;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <div className="truncate text-xl font-extrabold text-slate-900">{catName}</div>
          <div className="mt-1 text-sm text-slate-600">
            성장 단계: {growth.stage} ({growth.stageLabel})
          </div>
          <div className="mt-1 text-xs text-slate-500">
            미니홈피 {isPublic ? "공개" : "비공개"}
          </div>
        </div>

        <GrowthProgress growth={growth} tone="card" compact />

        <div className="grid grid-cols-1 gap-1 text-xs text-slate-600">
          <div>머리: {equipBySlot.HEAD?.itemName ?? "-"}</div>
          <div>몸: {equipBySlot.BODY?.itemName ?? "-"}</div>
          <div>액세서리: {equipBySlot.ACCESSORY?.itemName ?? "-"}</div>
        </div>

        <button
          type="button"
          onClick={onOpenDecoration}
          className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-extrabold text-orange-800 hover:bg-orange-100"
        >
          <Shirt className="h-4 w-4" />
          꾸미기
        </button>
      </div>

      <div className="flex shrink-0 justify-center sm:justify-end">
        <GoCatVisual
          stage={growth.stage}
          equipped={equipPreviewFromEquipBySlot(equipBySlot)}
        />
      </div>
    </div>
  );
}
