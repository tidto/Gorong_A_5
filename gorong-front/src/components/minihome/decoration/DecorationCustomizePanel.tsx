import { useState, type Dispatch, type SetStateAction } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { DecorItem, SlotType } from "../mini-home/DecorationModal";
import type { DecorItemWithOwnership } from "../../../utils/minihome/gocat/decorItemCatalog";
import { getItemDisplayEmoji } from "../../../utils/minihome/gocat/items";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import { isSlotUnlockedByStage, slotUnlockHint } from "../../../utils/minihome/growth/growth";
import { GOCAT_SLOTS, SLOT_UI } from "../../../utils/minihome/gocat/gocatSlots";
import GoCatItemCodexPanel from "./GoCatItemCodexPanel";
import type { UserItem } from "../../../types/minihome/item";

type DecorateTab = "equip" | "codex";

type DecorationCustomizePanelProps = {
  selectedHeadItem: DecorItem | null;
  selectedFaceItem: DecorItem | null;
  selectedNeckItem: DecorItem | null;
  setEquipDraft: Dispatch<SetStateAction<Record<SlotType, DecorItem | null>>>;
  itemsBySlot?: {
    HEAD: DecorItemWithOwnership[];
    FACE: DecorItemWithOwnership[];
    NECK: DecorItemWithOwnership[];
  };
  itemsLoading?: boolean;
  itemsLoadError?: string | null;
  disabled?: boolean;
  growthStage?: GrowthStage;
  activityCount?: number;
  ownedItems?: UserItem[];
  onLogLockState?: () => void;
  onResetLockTest?: () => void | Promise<void>;
  onToggleSlotItem?: (slot: SlotType, item: DecorItemWithOwnership) => void;
};

function SlotItemRow(props: {
  slot: SlotType;
  items: DecorItemWithOwnership[];
  selected: DecorItem | null;
  itemsLoading?: boolean;
  disabled?: boolean;
  growthStage?: GrowthStage;
  onToggle: (item: DecorItemWithOwnership) => void;
  onClear: () => void;
}) {
  const { slot, items, selected, itemsLoading, disabled, growthStage, onToggle, onClear } = props;
  const slotLocked = growthStage ? !isSlotUnlockedByStage(slot, growthStage) : false;

  if (slotLocked && growthStage) {
    return (
      <p className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/50 px-3 py-2 text-[10px] font-semibold text-amber-800/70">
        🔒 {slotUnlockHint(slot, growthStage)}
      </p>
    );
  }

  if (itemsLoading) {
    return (
      <div className="flex h-14 items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      </div>
    );
  }

  const equippableItems = items.filter(
    (it) => it.owned && it.isUnlocked && !it.locked && !it.slotLocked
  );
  const lockedItems = items.filter(
    (it) => !it.owned || !it.isUnlocked || it.locked || it.slotLocked
  );

  if (items.length === 0) {
    return (
      <p className="text-[10px] font-semibold text-amber-800/50">
        이 슬롯에 표시할 아이템이 없어요
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {equippableItems.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {equippableItems.map((it) => {
            const active =
              selected?.itemCode === it.itemCode ||
              (selected?.itemId != null && selected.itemId === it.itemId);
            const emoji = getItemDisplayEmoji(it);
            return (
              <motion.button
                key={it.itemCode ?? it.userItemId}
                type="button"
                disabled={disabled}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onToggle(it)}
                title={it.itemName ?? "아이템"}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-xl transition-shadow duration-200 ${
                  active
                    ? "border-amber-400 bg-amber-50 shadow-md shadow-amber-200/50"
                    : "border-amber-100/90 bg-white hover:border-amber-200 hover:shadow-sm"
                }`}
              >
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt="" className="h-8 w-8 object-contain" draggable={false} />
                ) : (
                  emoji
                )}
              </motion.button>
            );
          })}
          {selected ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="shrink-0 rounded-2xl border-2 border-dashed border-amber-200/80 px-2 text-[10px] font-bold text-amber-700/60 transition hover:border-amber-300 hover:bg-amber-50"
            >
              벗기기
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-[10px] font-semibold text-amber-800/50">보유한 아이템이 없어요</p>
      )}

      {lockedItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {lockedItems.map((it) => (
            <button
              key={`locked-${it.itemCode}`}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(it)}
              title={it.unlockHint ?? "획득 조건 미달성"}
              className="relative flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 opacity-60"
            >
              {it.imageUrl ? (
                <img src={it.imageUrl} alt="" className="h-6 w-6 object-contain grayscale" draggable={false} />
              ) : (
                <span className="text-sm grayscale">{getItemDisplayEmoji(it)}</span>
              )}
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-white">
                <Lock className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DecorationCustomizePanel({
  selectedHeadItem,
  selectedFaceItem,
  selectedNeckItem,
  setEquipDraft,
  itemsBySlot,
  itemsLoading,
  itemsLoadError,
  disabled,
  growthStage,
  activityCount,
  ownedItems,
  onLogLockState,
  onResetLockTest,
  onToggleSlotItem,
}: DecorationCustomizePanelProps) {
  const showDevTools = import.meta.env.DEV;
  const [tab, setTab] = useState<DecorateTab>("equip");

  const equipBySlot: Record<SlotType, DecorItem | null> = {
    HEAD: selectedHeadItem,
    FACE: selectedFaceItem,
    NECK: selectedNeckItem,
  };

  function toggleItem(slot: SlotType, item: DecorItemWithOwnership) {
    if (onToggleSlotItem) {
      onToggleSlotItem(slot, item);
      return;
    }
    if (item.slotLocked || item.locked || !item.owned || !item.isUnlocked) return;
    setEquipDraft((d) => ({
      ...d,
      [slot]:
        d[slot]?.itemCode === item.itemCode || d[slot]?.itemId === item.itemId ? null : item,
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      {growthStage ? (
        <div className="flex justify-center pb-1">
          <GrowthStageBadge stage={growthStage} activityCount={activityCount} compact />
        </div>
      ) : null}

      <div className="flex gap-1 rounded-xl bg-amber-50/60 p-1">
        {(
          [
            { id: "equip" as const, label: "장착" },
            { id: "codex" as const, label: "도감" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-extrabold transition ${
              tab === t.id
                ? "bg-white text-amber-900 shadow-sm"
                : "text-amber-800/50 hover:text-amber-900/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "codex" && growthStage ? (
        <GoCatItemCodexPanel growthStage={growthStage} ownedItems={ownedItems} />
      ) : (
        <>
          <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-[10px] leading-relaxed text-amber-800/70">
            기본 <strong>마녀 모자</strong>·<strong>목 리본</strong>은 처음부터 보유해요.{" "}
            <strong>벗기기</strong>로 슬롯을 비울 수 있고, 저장 후에도 유지됩니다. 왕관(행사 3회),
            파란 모자(행사 1회), 안경(리뷰 3개)은 조건 달성 시 해금됩니다.
          </p>

          {showDevTools && (onLogLockState || onResetLockTest) ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-2">
              <span className="w-full text-[9px] font-bold text-violet-800/70">DEV 잠금 디버그</span>
              {onLogLockState ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onLogLockState}
                  className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-violet-800 shadow-sm hover:bg-violet-100"
                >
                  콘솔에 상태 출력
                </button>
              ) : null}
              {onResetLockTest ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onResetLockTest()}
                  className="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-violet-700"
                >
                  꾸미기 초기화 (전부 벗기기)
                </button>
              ) : null}
            </div>
          ) : null}

          {itemsLoadError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{itemsLoadError}</p>
          ) : null}

          {GOCAT_SLOTS.map((slot) => {
            const meta = SLOT_UI[slot];
            const slotItems = itemsBySlot?.[slot] ?? [];

            return (
              <section key={slot}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-amber-900/45">
                  <span>{meta.emoji}</span>
                  {meta.label}
                  <span className="text-[9px] font-medium text-amber-700/40">({meta.hint})</span>
                  {equipBySlot[slot] ? (
                    <span className="rounded-full bg-teal-100 px-1.5 py-px text-[9px] font-bold text-teal-700">
                      ON
                    </span>
                  ) : null}
                </p>
                <SlotItemRow
                  slot={slot}
                  items={slotItems}
                  selected={equipBySlot[slot]}
                  itemsLoading={itemsLoading}
                  disabled={disabled}
                  growthStage={growthStage}
                  onToggle={(it) => toggleItem(slot, it)}
                  onClear={() => setEquipDraft((d) => ({ ...d, [slot]: null }))}
                />
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
