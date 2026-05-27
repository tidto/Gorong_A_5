import { motion } from "framer-motion";
import type { SlotType } from "../mini-home/DecorationModal";
import { lockedItemsForSlot } from "../../../utils/minihome/gocat/lockedItemCatalog";
import { getRarityStyle } from "../../../utils/minihome/gocat/itemRarity";

export default function LockedItemsShowcase({ slot, compact }: { slot: SlotType; compact?: boolean }) {
  const items = lockedItemsForSlot(slot).slice(compact ? 2 : 4);

  return (
    <div className={`space-y-2 ${compact ? "py-1" : "py-2"}`}>
      <div className="text-center">
        {!compact ? (
          <motion.span
            className="text-4xl"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            🐾
          </motion.span>
        ) : null}
        <p className={`font-extrabold text-amber-950 ${compact ? "text-xs" : "mt-2 text-sm"}`}>
          아직 보유한 아이템이 없어요
        </p>
        {!compact ? (
          <p className="mt-0.5 text-xs text-amber-700/70">행사·활동 보상으로 모아 보세요!</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => {
          const style = getRarityStyle(item.rarity);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${style.border} bg-white/60`}
            >
              <span className="text-lg opacity-60">{item.emoji}</span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-amber-900/70">🔒 {item.itemName}</p>
                <p className="truncate text-[9px] text-amber-700/50">{item.unlockHint}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
