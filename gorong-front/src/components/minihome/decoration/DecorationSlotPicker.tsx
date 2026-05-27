import { motion } from "framer-motion";
import type { DecorItem, SlotType } from "../DecorationModal";

import { GOCAT_ENABLED_CATEGORIES } from "../../../data/gocatItems";

const SLOTS = GOCAT_ENABLED_CATEGORIES as SlotType[];

const SLOT_CARDS: Record<SlotType, { label: string; emoji: string }> = {
  HEAD: { label: "머리", emoji: "🎩" },
  BODY: { label: "몸", emoji: "👕" },
  ACCESSORY: { label: "액세", emoji: "✨" },
};

export default function DecorationSlotPicker(props: {
  slot: SlotType;
  setSlot: (s: SlotType) => void;
  draft: Record<SlotType, DecorItem | null>;
  clearingSlot?: SlotType | null;
}) {
  const { slot, setSlot, draft, clearingSlot } = props;

  return (
    <div className="flex gap-2">
      {SLOTS.map((s) => {
        const meta = SLOT_CARDS[s];
        const active = slot === s;
        const equipped = draft[s];
        const clearing = clearingSlot === s;

        return (
          <motion.button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={
              active
                ? { boxShadow: "0 0 0 3px rgba(251,191,36,0.5)" }
                : { boxShadow: "0 0 0 0px rgba(251,191,36,0)" }
            }
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl border-2 px-2 py-2 transition-colors ${
              active
                ? "border-amber-400 bg-gradient-to-b from-amber-100 to-orange-50"
                : "border-white/80 bg-white/70 hover:bg-white"
            }`}
          >
            <motion.span
              className="text-xl leading-none"
              animate={equipped && !clearing ? { y: [0, -2, 0] } : clearing ? { scale: [1, 0.8, 1], opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: clearing ? 0.35 : 2, repeat: clearing ? 0 : Infinity }}
            >
              {meta.emoji}
            </motion.span>
            <span className="text-[10px] font-extrabold text-amber-950">{meta.label}</span>
            {equipped ? (
              <span className="max-w-full truncate rounded-full bg-teal-500/90 px-1.5 py-px text-[8px] font-bold text-white">
                ON
              </span>
            ) : (
              <span className="text-[8px] text-amber-600/40">—</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
