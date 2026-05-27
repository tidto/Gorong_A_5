import { motion } from "framer-motion";
import type { DecorItem, SlotType } from "../DecorationModal";
import { getItemDisplayEmoji } from "../../../utils/minihome/items";
import { getRarityStyle, rarityForDecorItem } from "../../../utils/minihome/itemRarity";

export default function DecorationItemGrid(props: {
  slot: SlotType;
  items: DecorItem[];
  draftSlotItem: DecorItem | null;
  saving: boolean;
  onSelect: (item: DecorItem | null) => void;
}) {
  const { slot, items, draftSlotItem, saving, onSelect } = props;

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {items.map((it, index) => {
        const active = draftSlotItem?.itemId === it.itemId;
        const emoji = getItemDisplayEmoji(it);
        const style = getRarityStyle(rarityForDecorItem(it));

        return (
          <motion.button
            key={it.userItemId}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(active ? null : it)}
            disabled={saving}
            className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 transition-shadow duration-200 ${
              active
                ? "border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50 shadow-[0_4px_16px_rgba(251,191,36,0.35)]"
                : `${style.border} bg-white/95 hover:shadow-md ${style.glow}`
            }`}
          >
            {active ? (
              <motion.span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white"
                layoutId={`equip-badge-${slot}`}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                ✓
              </motion.span>
            ) : null}
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-50/80 to-white">
              {it.imageUrl ? (
                <img src={it.imageUrl} alt="" className="h-full w-full object-contain p-0.5" />
              ) : (
                <span className="text-xl">{emoji}</span>
              )}
            </div>
            <span className={`max-w-full truncate text-[10px] font-bold ${active ? "text-amber-900" : style.text}`}>
              {it.itemName ?? "아이템"}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
