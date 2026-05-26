import React from "react";
import { Shirt, X } from "lucide-react";
import Button from "../Button";
import type { UserItem } from "../../types/minihome/item";
import type { GrowthStage } from "../../utils/minihome/growth";

export type SlotType = "HEAD" | "BODY" | "ACCESSORY";

export type DecorItem = UserItem & { slotType?: SlotType };

const SLOTS: SlotType[] = ["HEAD", "BODY", "ACCESSORY"];

function slotLabel(slot: SlotType) {
  if (slot === "HEAD") return "머리";
  if (slot === "BODY") return "몸";
  return "액세서리";
}

export default function DecorationModal(props: {
  open: boolean;
  saving: boolean;
  saveInfo: string | null;
  slot: SlotType;
  setSlot: (s: SlotType) => void;
  draft: Record<SlotType, DecorItem | null>;
  setDraft: React.Dispatch<React.SetStateAction<Record<SlotType, DecorItem | null>>>;
  items: DecorItem[];
  itemsLoading?: boolean;
  itemsEmpty?: boolean;
  itemsLoadError?: string | null;
  decorationErr?: string | null;
  canEdit?: boolean;
  growthStage: GrowthStage;
  onClose: () => void;
  onSave: () => void;
  Preview: React.ReactNode;
}) {
  const {
    open, saving, saveInfo, slot, setSlot, draft, setDraft, items,
    itemsLoading, itemsEmpty, itemsLoadError, decorationErr,
    canEdit = true, onClose, onSave, Preview,
  } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 px-4 py-10 overflow-auto">
      <div className="max-w-5xl mx-auto rounded-2xl bg-white shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold">
            <Shirt className="w-5 h-5" /> Go냥이 꾸미기
          </div>
          <button className="rounded-full p-2 hover:bg-gray-100" onClick={onClose} aria-label="닫기" disabled={saving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-bold text-gray-900">미리보기</div>
              <div className="mt-3 flex items-center justify-center">{Preview}</div>
              <div className="mt-3 text-xs text-gray-600">
                머리: {draft.HEAD?.itemName ?? "-"}
                <br />
                몸: {draft.BODY?.itemName ?? "-"}
                <br />
                액세서리: {draft.ACCESSORY?.itemName ?? "-"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-bold text-gray-900">착용 슬롯</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                      slot === s ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setSlot(s)}
                    type="button"
                  >
                    {slotLabel(s)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, [slot]: null }))} disabled={saving}>
                  현재 슬롯 해제
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {decorationErr ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {decorationErr}
              </div>
            ) : null}

            {saveInfo ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saveInfo}</div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-gray-900">보유 아이템</div>
              <div className="text-xs text-gray-500">아이템을 클릭하면 선택한 슬롯({slotLabel(slot)})에 적용됩니다.</div>
            </div>

            {itemsLoadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {itemsLoadError}
              </div>
            ) : null}

            {itemsLoading ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                보유 아이템을 불러오는 중...
              </div>
            ) : null}

            {!itemsLoading && itemsEmpty ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                보유 아이템이 없습니다.
              </div>
            ) : null}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((it) => {
                const active = draft[slot]?.itemId === it.itemId;
                return (
                  <button
                    key={it.userItemId}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, [slot]: it }))}
                    className={`rounded-xl border p-3 text-left transition ${
                      active ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    disabled={saving}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                        {it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.itemName ?? "아이템"} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg">🎁</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{it.itemName ?? `itemId=${it.itemId}`}</div>
                        <div className="text-xs text-gray-500 truncate">{it.itemType ?? "-"}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={saving}>
                취소
              </Button>
              <Button variant="primary" onClick={onSave} disabled={saving || !canEdit}>
                {saving ? "저장 중..." : canEdit ? "저장" : "조회 전용"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

