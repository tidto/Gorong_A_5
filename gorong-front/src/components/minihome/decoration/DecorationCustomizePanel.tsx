import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import type { DecorItem, SlotType } from "../DecorationModal";
import { GOCAT_ENABLED_CATEGORIES, GOCAT_ITEMS } from "../../../data/gocatItems";
import { goCatItemToDecorItem } from "../../../utils/minihome/decorItemCatalog";
import { getItemDisplayEmoji } from "../../../utils/minihome/items";
import LockedItemsShowcase from "./LockedItemsShowcase";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import type { GrowthStage } from "../../../utils/minihome/growth";

const SLOT_SECTIONS: { id: SlotType; label: string; emoji: string }[] = [
  { id: "HEAD", label: "머리", emoji: "🎩" },
  { id: "ACCESSORY", label: "액세", emoji: "✨" },
];

type DecorationCustomizePanelProps = {
  selectedHeadItem: DecorItem | null;
  selectedBodyItem: DecorItem | null;
  selectedAccessoryItem: DecorItem | null;
  setEquipDraft: Dispatch<SetStateAction<Record<SlotType, DecorItem | null>>>;
  itemsLoading?: boolean;
  itemsLoadError?: string | null;
  disabled?: boolean;
  growthStage?: GrowthStage;
  activityCount?: number;
};

function SlotItemRow(props: {
  slot: SlotType;
  items: DecorItem[];
  selected: DecorItem | null;
  itemsLoading?: boolean;
  disabled?: boolean;
  onToggle: (item: DecorItem) => void;
  onClear: () => void;
}) {
  const { items, selected, itemsLoading, disabled, onToggle, onClear, slot } = props;

  if (itemsLoading) {
    return (
      <div className="flex h-14 items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return <LockedItemsShowcase slot={slot} compact />;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
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
  );
}

export default function DecorationCustomizePanel({
  selectedHeadItem,
  selectedBodyItem,
  selectedAccessoryItem,
  setEquipDraft,
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

  function toggleItem(slot: SlotType, item: DecorItem) {
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
        모자 3종 · 악세 2종 중 골라 Go냥이를 꾸며 보세요. 저장하기를 누르면 유지됩니다.
      </p>

      {itemsLoadError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{itemsLoadError}</p>
      ) : null}

      {SLOT_SECTIONS.map((section) => {
        const slotItems = GOCAT_ITEMS.filter(
          (item) => item.category === section.id && GOCAT_ENABLED_CATEGORIES.includes(item.category)
        ).map(goCatItemToDecorItem);

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
