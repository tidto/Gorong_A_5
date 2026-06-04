import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { DecorItem, SlotType } from "../mini-home/DecorationModal";
import type { DecorItemWithOwnership } from "../../../utils/minihome/gocat/decorItemCatalog";
import { getItemDisplayEmoji } from "../../../utils/minihome/gocat/items";
import LockedItemsShowcase from "./LockedItemsShowcase";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";

const SLOT_SECTIONS: { id: SlotType; label: string; emoji: string }[] = [
  { id: "HEAD", label: "머리", emoji: "🎩" },
  { id: "ACCESSORY", label: "액세", emoji: "✨" },
];

type DecorationCustomizePanelProps = {
  selectedHeadItem: DecorItem | null;
  selectedBodyItem: DecorItem | null;
  selectedAccessoryItem: DecorItem | null;
  setEquipDraft: Dispatch<SetStateAction<Record<SlotType, DecorItem | null>>>;
  itemsBySlot?: {
    HEAD: DecorItemWithOwnership[];
    BODY: DecorItemWithOwnership[];
    ACCESSORY: DecorItemWithOwnership[];
  };
  itemsLoading?: boolean;
  itemsLoadError?: string | null;
  disabled?: boolean;
  growthStage?: GrowthStage;
  activityCount?: number;
};

function SlotItemRow(props: {
  slot: SlotType;
  items: DecorItemWithOwnership[];
  selected: DecorItem | null;
  itemsLoading?: boolean;
  disabled?: boolean;
  onToggle: (item: DecorItemWithOwnership) => void;
  onClear: () => void;
}) {
  const { items, selected, itemsLoading, disabled, onToggle, onClear } = props;

  if (itemsLoading) {
    return (
      <div className="flex h-14 items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      </div>
    );
  }

  const ownedItems = items.filter((it) => it.owned && !it.locked);
  const lockedItems = items.filter((it) => it.locked);

  if (items.length === 0) {
    return (
      <p className="text-[10px] font-semibold text-amber-800/50">
        이 슬롯에 표시할 아이템이 없어요
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {ownedItems.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ownedItems.map((it) => {
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
              disabled
              title={it.unlockHint ?? "행사 참여 보상"}
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
  selectedBodyItem,
  selectedAccessoryItem,
  setEquipDraft,
  itemsBySlot,
  itemsLoading,
  itemsLoadError,
  disabled,
  growthStage,
  activityCount,
}: DecorationCustomizePanelProps) {
  const equipBySlot: Record<SlotType, DecorItem | null> = {
    HEAD: selectedHeadItem,
    BODY: selectedBodyItem,
    ACCESSORY: selectedAccessoryItem,
  };

  function toggleItem(slot: SlotType, item: DecorItemWithOwnership) {
    if (item.locked) return;
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

      <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-[10px] leading-relaxed text-amber-800/70">
        기본 모자·악세는 언제든 사용할 수 있어요. 행사 보상 아이템은 참여 후 획득하면 장착할 수 있습니다.
      </p>

      {itemsLoadError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{itemsLoadError}</p>
      ) : null}

      {SLOT_SECTIONS.map((section) => {
        const slotItems = itemsBySlot?.[section.id] ?? [];

        return (
          <section key={section.id}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-amber-900/45">
              <span>{section.emoji}</span>
              {section.label}
              {equipBySlot[section.id] ? (
                <span className="rounded-full bg-teal-100 px-1.5 py-px text-[9px] font-bold text-teal-700">
                  ON
                </span>
              ) : null}
            </p>
            <SlotItemRow
              slot={section.id}
              items={slotItems}
              selected={equipBySlot[section.id]}
              itemsLoading={itemsLoading}
              disabled={disabled}
              onToggle={(it) => toggleItem(section.id, it)}
              onClear={() => setEquipDraft((d) => ({ ...d, [section.id]: null }))}
            />
          </section>
        );
      })}
    </div>
  );
}
